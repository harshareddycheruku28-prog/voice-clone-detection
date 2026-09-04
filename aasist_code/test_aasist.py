import os
import sys
import torch
import soundfile as sf

# Find the folder containing this Python file
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# AASIST Python code
sys.path.insert(0, BASE_DIR)

from models.AASIST import Model

# Correct paths
MODEL_PATH = os.path.join(
    BASE_DIR,
    "models",
    "weights",
    "AASIST.pth"
)

AUDIO_PATH = os.path.join(
    BASE_DIR,
    "..",
    "audio",
    "spoof_test.flac"
)

print("Starting AASIST test...")
print("Model path:", MODEL_PATH)
print("Audio path:", AUDIO_PATH)

# Check model
if not os.path.exists(MODEL_PATH):
    print("ERROR: AASIST.pth not found!")
    sys.exit(1)

# Check audio
if not os.path.exists(AUDIO_PATH):
    print("ERROR: test.wav not found!")
    sys.exit(1)

# Read audio
audio, sample_rate = sf.read(AUDIO_PATH)

print("Sample rate:", sample_rate)
print("Audio shape:", audio.shape)

# AASIST expects 16 kHz
if sample_rate != 16000:
    print("ERROR: Audio must be 16000 Hz.")
    sys.exit(1)

# Convert stereo to mono
if audio.ndim > 1:
    audio = audio.mean(axis=1)

audio = audio.astype("float32")

# AASIST configuration
model_config = {
    "architecture": "AASIST",
    "nb_samp": 64600,
    "first_conv": 128,
    "filts": [
        70,
        [1, 32],
        [32, 32],
        [32, 64],
        [64, 64]
    ],
    "gat_dims": [64, 32],
    "pool_ratios": [0.5, 0.7, 0.5, 0.5],
    "temperatures": [2.0, 2.0, 100.0, 100.0]
}

# Prepare audio
nb_samp = 64600

if len(audio) < nb_samp:
    audio = torch.nn.functional.pad(
        torch.tensor(audio),
        (0, nb_samp - len(audio))
    ).numpy()
else:
    audio = audio[:nb_samp]

audio_tensor = torch.tensor(audio).unsqueeze(0)

# Load model
print("Loading AASIST model...")

model = Model(model_config)

checkpoint = torch.load(
    MODEL_PATH,
    map_location="cpu",
    weights_only=False
)

model.load_state_dict(checkpoint)
model.eval()

print("Model loaded successfully!")

# Run detection
print("Running AASIST detection...")

with torch.no_grad():
    _, output = model(audio_tensor)

    probabilities = torch.softmax(output, dim=1)

    fake_probability = probabilities[0, 0].item()
    real_probability = probabilities[0, 1].item()

print()
print("==============================")
print("       AASIST RESULT")
print("==============================")
print(f"Fake/Spoof probability : {fake_probability:.4f}")
print(f"Real/Bona fide probability : {real_probability:.4f}")

if real_probability > fake_probability:
    print("Prediction: REAL / BONA FIDE")
else:
    print("Prediction: FAKE / SPOOF")

print("==============================")