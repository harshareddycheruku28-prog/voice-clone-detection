import os
import sys
import torch
import soundfile as sf

# Make sure Python can find the AASIST model code
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

MODEL_PATH = os.path.join(
    BASE_DIR,
    "models",
    "weights",
    "AASIST.pth"
)

# Check that an audio file was provided
if len(sys.argv) < 2:
    print("Usage:")
    print("python aasist_code\\detect_audio.py <audio_file>")
    sys.exit(1)

AUDIO_PATH = os.path.abspath(sys.argv[1])

print("====================================")
print("     AI VOICE SPOOF DETECTOR")
print("====================================")
print("Audio:", AUDIO_PATH)

# Load audio
audio, sample_rate = sf.read(AUDIO_PATH)

print("Sample rate:", sample_rate)
print("Audio samples:", len(audio))

# Convert stereo to mono if necessary
if len(audio.shape) > 1:
    audio = audio.mean(axis=1)

# Load AASIST model
print("\nLoading AASIST model...")

from models.AASIST import Model

model_config = {
    "architecture": "AASIST",
    "nb_samp": 64600,
    "first_conv": 128,
    "filts": [70, [1, 32], [32, 32], [32, 64], [64, 64]],
    "gat_dims": [64, 32],
    "pool_ratios": [0.5, 0.7, 0.5, 0.5],
    "temperatures": [2.0, 2.0, 100.0, 100.0]
}

model = Model(model_config)

checkpoint = torch.load(
    MODEL_PATH,
    map_location="cpu",
    weights_only=False
)

model.load_state_dict(checkpoint)
model.eval()

print("Model loaded successfully!")

# Convert audio to tensor
audio_tensor = torch.tensor(audio, dtype=torch.float32)

# Add batch dimension
audio_tensor = audio_tensor.unsqueeze(0)

# Repeat/pad audio to model input length
nb_samp = 64600

if audio_tensor.shape[1] < nb_samp:
    repeat_count = (nb_samp // audio_tensor.shape[1]) + 1
    audio_tensor = audio_tensor.repeat(1, repeat_count)

audio_tensor = audio_tensor[:, :nb_samp]

# Run detection
print("Running detection...")

with torch.no_grad():
    _, output = model(audio_tensor)

    probabilities = torch.softmax(output, dim=1)

    fake_probability = probabilities[0, 0].item()
    real_probability = probabilities[0, 1].item()
    # Convert spoof probability into a simple project risk score.
# This is a demo risk score, not a calibrated real-world probability.
risk_score = int(fake_probability * 100)

if risk_score <= 30:
    risk_level = "LOW"
elif risk_score <= 70:
    risk_level = "MEDIUM"
else:
    risk_level = "HIGH"

# Display result
print("\n====================================")
print("          DETECTION RESULT")
print("====================================")
print(f"Fake/Spoof probability : {fake_probability:.4f}")
print(f"Real/Bona fide probability : {real_probability:.4f}")
print(f"Risk score             : {risk_score}/100")
print(f"Risk level             : {risk_level}")
# Convert risk level into a security action.
if risk_level == "LOW":
    security_action = "ALLOW CALL"
elif risk_level == "MEDIUM":
    security_action = "REQUIRE VERIFICATION"
else:
    security_action = "BLOCK CALL / ALERT"

print(f"Security action        : {security_action}")

if fake_probability > real_probability:
    print("Prediction: FAKE / SPOOF")
else:
    print("Prediction: REAL / BONA FIDE")

print("====================================")