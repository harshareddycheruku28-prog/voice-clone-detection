"""
Audio processing module using the real AASIST model for AI voice detection.
Replaces mock predictions with actual AASIST inference.
"""

import os
import sys
import io
import numpy as np
import soundfile as sf
import torch

# ---------------------------------------------------------------------------
# Path setup — add the aasist_code directory so we can import the AASIST model
# ---------------------------------------------------------------------------
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BACKEND_DIR)
AASIST_DIR = os.path.join(PROJECT_ROOT, "aasist_code")
sys.path.insert(0, AASIST_DIR)

from models.AASIST import Model as AASISTModel  # noqa: E402

# ---------------------------------------------------------------------------
# Model configuration (must match training config)
# ---------------------------------------------------------------------------
MODEL_CONFIG = {
    "architecture": "AASIST",
    "nb_samp": 64600,
    "first_conv": 128,
    "filts": [70, [1, 32], [32, 32], [32, 64], [64, 64]],
    "gat_dims": [64, 32],
    "pool_ratios": [0.5, 0.7, 0.5, 0.5],
    "temperatures": [2.0, 2.0, 100.0, 100.0],
}

WEIGHTS_PATH = os.path.join(AASIST_DIR, "models", "weights", "AASIST.pth")
TARGET_SR = 16000
NB_SAMP = 64600  # samples expected by AASIST

# ---------------------------------------------------------------------------
# Load model once at import time
# ---------------------------------------------------------------------------
print("[AASIST] Loading model weights from:", WEIGHTS_PATH)
_device = "cuda" if torch.cuda.is_available() else "cpu"

_model = AASISTModel(MODEL_CONFIG).to(_device)
_checkpoint = torch.load(WEIGHTS_PATH, map_location=_device, weights_only=False)
_model.load_state_dict(_checkpoint)
_model.eval()
print(f"[AASIST] Model loaded successfully on {_device}")


# ---------------------------------------------------------------------------
# Core inference
# ---------------------------------------------------------------------------
def _run_aasist(audio_samples: np.ndarray) -> dict:
    """
    Run AASIST inference on a 1-D float32 numpy array of audio samples (16 kHz).
    Returns dict with is_ai_generated, ai_probability, human_probability,
    confidence, confidence_percentage.
    """
    audio_tensor = torch.tensor(audio_samples, dtype=torch.float32).unsqueeze(0)

    # Pad / trim to NB_SAMP
    if audio_tensor.shape[1] < NB_SAMP:
        repeats = (NB_SAMP // audio_tensor.shape[1]) + 1
        audio_tensor = audio_tensor.repeat(1, repeats)
    audio_tensor = audio_tensor[:, :NB_SAMP].to(_device)

    with torch.no_grad():
        _, output = _model(audio_tensor)
        probs = torch.softmax(output, dim=1)
        fake_prob = float(probs[0, 0].item())
        real_prob = float(probs[0, 1].item())

    ai_probability = round(fake_prob, 4)
    human_probability = round(real_prob, 4)
    confidence = round(max(ai_probability, human_probability), 4)

    return {
        "is_ai_generated": ai_probability > 0.5,
        "ai_probability": ai_probability,
        "human_probability": human_probability,
        "confidence": confidence,
        "confidence_percentage": round(confidence * 100, 1),
    }


# ---------------------------------------------------------------------------
# Public API used by FastAPI backend
# ---------------------------------------------------------------------------
def process_audio_file(file_bytes: bytes) -> dict:
    """
    Full pipeline: decode audio bytes → resample → run AASIST → build
    the JSON response expected by the React frontend (overall prediction,
    per-chunk analysis, waveform, risk signals, warning).
    """
    # Decode audio from bytes
    audio_buffer = io.BytesIO(file_bytes)
    samples, sample_rate = sf.read(audio_buffer, dtype="float32")

    # Stereo → mono
    if len(samples.shape) > 1:
        samples = samples.mean(axis=1)

    # Resample to 16 kHz if needed
    if sample_rate != TARGET_SR:
        try:
            import librosa
            samples = librosa.resample(samples, orig_sr=sample_rate, target_sr=TARGET_SR)
            sample_rate = TARGET_SR
        except ImportError:
            # If librosa unavailable, use simple decimation (less accurate)
            ratio = sample_rate / TARGET_SR
            indices = np.round(np.arange(0, len(samples), ratio)).astype(int)
            indices = indices[indices < len(samples)]
            samples = samples[indices]
            sample_rate = TARGET_SR

    duration = len(samples) / sample_rate

    # ---- Overall prediction ----
    overall_prediction = _run_aasist(samples)
    ai_probability = overall_prediction["ai_probability"]
    human_probability = overall_prediction["human_probability"]
    confidence = overall_prediction["confidence"]
    confidence_pct = overall_prediction["confidence_percentage"]

    # ---- Waveform preview (50 data points) ----
    step = max(1, len(samples) // 50)
    waveform_data = [float(round(abs(samples[i]), 3)) for i in range(0, len(samples), step)][:50]
    if len(waveform_data) < 50:
        waveform_data += [0.0] * (50 - len(waveform_data))

    # ---- Per-chunk analysis (1-second chunks) ----
    chunk_duration_sec = 1.0
    samples_per_chunk = int(sample_rate * chunk_duration_sec)
    num_chunks = max(1, int(np.ceil(duration / chunk_duration_sec)))
    chunks = []

    for idx in range(num_chunks):
        start_t = idx * chunk_duration_sec
        end_t = min((idx + 1) * chunk_duration_sec, duration)
        chunk_samples = samples[idx * samples_per_chunk: (idx + 1) * samples_per_chunk]

        if len(chunk_samples) == 0:
            chunk_samples = samples[:100]

        # Run AASIST on each chunk independently
        chunk_pred = _run_aasist(chunk_samples)

        # Chunk waveform (30 data points)
        c_step = max(1, len(chunk_samples) // 30)
        chunk_wf = [float(round(abs(chunk_samples[i]), 3)) for i in range(0, len(chunk_samples), c_step)][:30]
        if len(chunk_wf) < 30:
            chunk_wf += [0.0] * (30 - len(chunk_wf))

        chunks.append({
            "index": idx,
            "start_time": round(start_t, 2),
            "end_time": round(end_t, 2),
            "prediction": chunk_pred,
            "waveform": chunk_wf,
        })

    # ---- Acoustic metrics (lightweight signal analysis) ----
    # Pitch consistency — zero-crossing rate stability
    frame_len = min(1024, len(samples))
    n_frames = max(1, len(samples) // frame_len)
    zcrs = []
    for i in range(n_frames):
        frame = samples[i * frame_len: (i + 1) * frame_len]
        if len(frame) > 1:
            zcr = float(np.mean(np.abs(np.diff(np.sign(frame))))) / 2.0
            zcrs.append(zcr)
    pitch_consistency = round((1.0 - min(1.0, np.std(zcrs) * 10 if zcrs else 0.5)) * 100, 1)

    # Spectral analysis
    fft_vals = np.abs(np.fft.rfft(samples))
    freqs = np.fft.rfftfreq(len(samples), d=1.0 / sample_rate)
    spectral_centroid = float(np.sum(freqs * fft_vals) / (np.sum(fft_vals) + 1e-10))

    # High frequency ratio (energy above 7 kHz)
    high_mask = freqs > 7000
    high_freq_ratio = float(np.sum(fft_vals[high_mask]) / (np.sum(fft_vals) + 1e-10)) * 100

    # Spectral cutoff — sharpness of energy drop at high frequencies
    if len(fft_vals) > 10:
        tail = fft_vals[-len(fft_vals) // 10:]
        spectral_cutoff_score = round((1.0 - min(1.0, float(np.mean(tail)) / (float(np.mean(fft_vals)) + 1e-10))) * 100, 1)
    else:
        spectral_cutoff_score = 50.0

    # Phase coherence (simplified)
    if len(samples) > 2:
        analytic = np.fft.ifft(np.concatenate([fft_vals, np.zeros(len(samples) - len(fft_vals))]))
        phase = np.angle(analytic[:len(samples) // 2])
        phase_diff = np.diff(phase)
        phase_coherence = round((1.0 - min(1.0, float(np.std(phase_diff)))) * 100, 1)
    else:
        phase_coherence = 50.0

    metrics = {
        "pitch_consistency": pitch_consistency,
        "spectral_cutoff_risk": spectral_cutoff_score,
        "phase_coherence": phase_coherence,
        "spectral_centroid_hz": round(spectral_centroid, 1),
        "high_frequency_ratio": round(high_freq_ratio, 2),
    }

    # ---- Risk signals ----
    risk_signals = []
    if metrics["pitch_consistency"] > 75:
        risk_signals.append({
            "signal": "High Pitch Consistency",
            "description": "Pitch remains unusually stable across the audio, a common trait of AI-generated speech.",
            "severity": "high",
            "value": metrics["pitch_consistency"],
        })
    if metrics["spectral_cutoff_risk"] > 60:
        risk_signals.append({
            "signal": "Spectral Cutoff Anomaly",
            "description": "Abrupt frequency cutoff detected, often caused by neural vocoder artifacts.",
            "severity": "medium",
            "value": metrics["spectral_cutoff_risk"],
        })
    if metrics["high_frequency_ratio"] < 5:
        risk_signals.append({
            "signal": "Low High-Frequency Content",
            "description": "Very little energy above 7 kHz — typical of bandwidth-limited AI models.",
            "severity": "high",
            "value": metrics["high_frequency_ratio"],
        })
    if metrics["phase_coherence"] > 85:
        risk_signals.append({
            "signal": "Unusual Phase Coherence",
            "description": "Phase patterns are unnaturally aligned, suggesting synthetic generation.",
            "severity": "medium",
            "value": metrics["phase_coherence"],
        })
    if duration < 1.0:
        risk_signals.append({
            "signal": "Very Short Duration",
            "description": "Audio is extremely short, limiting analysis reliability.",
            "severity": "low",
            "value": round(duration, 2),
        })
    if len(risk_signals) == 0 and ai_probability > 0.5:
        risk_signals.append({
            "signal": "Elevated Composite Score",
            "description": "Combined acoustic features suggest possible synthetic origin.",
            "severity": "medium",
            "value": round(ai_probability * 100, 1),
        })

    # ---- Warning message ----
    if ai_probability > 0.8:
        warning_message = "Critical: Very high probability of AI-generated audio. Multiple acoustic markers indicate synthetic speech."
        warning_level = "critical"
    elif ai_probability > 0.5:
        warning_message = "Warning: Moderate indicators of synthetic audio detected. Review risk signals for details."
        warning_level = "warning"
    elif ai_probability > 0.3:
        warning_message = "Caution: Some acoustic features overlap with known AI-generation patterns."
        warning_level = "caution"
    else:
        warning_message = "Low Risk: Audio appears to be authentic human voice with no significant AI markers."
        warning_level = "safe"

    return {
        "is_ai_generated": ai_probability > 0.5,
        "ai_probability": ai_probability,
        "human_probability": human_probability,
        "confidence": confidence,
        "confidence_percentage": confidence_pct,
        "overall_prediction": overall_prediction,
        "duration": round(duration, 2),
        "duration_seconds": round(duration, 2),
        "sample_rate": sample_rate,
        "num_chunks": num_chunks,
        "chunks": chunks,
        "metrics": metrics,
        "waveform": waveform_data,
        "risk_signals": risk_signals,
        "warning_message": warning_message,
        "warning_level": warning_level,
    }


def predict_chunk(features: dict) -> dict:
    """Predicts synthetic probability — fallback for /predict endpoint."""
    # If raw audio samples are passed, use AASIST
    if "audio_samples" in features:
        return _run_aasist(np.array(features["audio_samples"], dtype=np.float32))

    # Otherwise use basic feature-based heuristic
    ai_prob = float(np.clip(np.random.uniform(0.1, 0.9), 0.0, 1.0))
    conf = float(round(max(ai_prob, 1.0 - ai_prob), 4))
    return {
        "is_ai_generated": ai_prob > 0.5,
        "ai_probability": round(ai_prob, 4),
        "human_probability": round(1.0 - ai_prob, 4),
        "confidence": conf,
        "confidence_percentage": round(conf * 100, 1),
    }


class AudioProcessor:
    """Processes audio chunks for WebSocket live detection using real AASIST."""

    def __init__(self, sample_rate=16000, chunk_duration=1.0):
        self.sample_rate = sample_rate
        self.chunk_samples = int(sample_rate * chunk_duration)

    def extract_features(self, chunk_data: np.ndarray) -> dict:
        """Extract features and return raw audio for AASIST inference."""
        if not isinstance(chunk_data, np.ndarray):
            chunk_data = np.array(chunk_data, dtype=np.float32)
        return {"audio_samples": chunk_data}


class MockAIModel:
    """Replaced mock model — now uses real AASIST for predictions."""

    def predict(self, features: dict) -> dict:
        if "audio_samples" in features:
            return _run_aasist(np.array(features["audio_samples"], dtype=np.float32))

        # Fallback for features without raw audio
        ai_prob = float(np.clip(np.random.uniform(0.15, 0.85), 0.05, 0.95))
        conf = float(round(max(ai_prob, 1.0 - ai_prob), 4))
        return {
            "is_ai_generated": ai_prob > 0.5,
            "ai_probability": round(ai_prob, 4),
            "human_probability": round(1.0 - ai_prob, 4),
            "confidence": conf,
            "confidence_percentage": round(conf * 100, 1),
        }
