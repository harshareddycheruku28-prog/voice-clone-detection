import os
import sys
import time
import sounddevice as sd
import soundfile as sf
import torch

# Import AASIST
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(BASE_DIR)

from models.AASIST import Model


# -----------------------------
# Configuration
# -----------------------------
SAMPLE_RATE = 16000
CHUNK_SECONDS = 3
CHUNK_SAMPLES = SAMPLE_RATE * CHUNK_SECONDS

MODEL_PATH = os.path.join(
    BASE_DIR,
    "models",
    "weights",
    "AASIST.pth"
)


# -----------------------------
# AASIST model configuration
# -----------------------------
model_config = {
    "architecture": "AASIST",
    "nb_samp": 64600,
    "first_conv": 128,
    "filts": [70, [1, 32], [32, 32], [32, 64], [64, 64]],
    "gat_dims": [64, 32],
    "pool_ratios": [0.5, 0.7, 0.5, 0.5],
    "temperatures": [2.0, 2.0, 100.0, 100.0]
}


# -----------------------------
# Load model
# -----------------------------
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
print()


# -----------------------------
# Detection function
# -----------------------------
def detect_voice(audio):

    # Convert to torch tensor
    audio_tensor = torch.tensor(
        audio,
        dtype=torch.float32
    )

    # Add batch dimension
    audio_tensor = audio_tensor.unsqueeze(0)

    # Adjust length to AASIST expected input
    if audio_tensor.shape[1] < 64600:

        repeat_count = (
            64600 // audio_tensor.shape[1]
        ) + 1

        audio_tensor = audio_tensor.repeat(
            1,
            repeat_count
        )

    audio_tensor = audio_tensor[:, :64600]

    # Run AASIST
    with torch.no_grad():

        _, output = model(audio_tensor)

        probabilities = torch.softmax(
            output,
            dim=1
        )

        fake_probability = probabilities[0, 0].item()
        real_probability = probabilities[0, 1].item()

    return fake_probability, real_probability


# -----------------------------
# Start microphone
# -----------------------------
print("====================================")
print("     REAL-TIME AI VOICE DETECTOR")
print("====================================")
print()

print("Microphone recording started.")
print("Speak for 3 seconds...")
print()

audio = sd.rec(
    CHUNK_SAMPLES,
    samplerate=SAMPLE_RATE,
    channels=1,
    dtype="float32",
    device=1
)

sd.wait()

# Convert shape (samples, 1) -> (samples,)
audio = audio.flatten()


# -----------------------------
# Save recording
# -----------------------------
output_file = os.path.join(
    BASE_DIR,
    "..",
    "audio",
    "realtime_test.wav"
)

sf.write(
    output_file,
    audio,
    SAMPLE_RATE
)


# -----------------------------
# Detect
# -----------------------------
print("Analyzing voice...")

fake_probability, real_probability = detect_voice(audio)

risk_score = int(fake_probability * 100)

if risk_score <= 30:
    risk_level = "LOW"
elif risk_score <= 70:
    risk_level = "MEDIUM"
else:
    risk_level = "HIGH"


# -----------------------------
# Security action
# -----------------------------
if risk_level == "LOW":
    security_action = "ALLOW CALL"
elif risk_level == "MEDIUM":
    security_action = "REQUIRE VERIFICATION"
else:
    security_action = "BLOCK CALL / ALERT"


# -----------------------------
# Display result
# -----------------------------
print()
print("====================================")
print("          DETECTION RESULT")
print("====================================")

print(
    f"Fake/Spoof probability : "
    f"{fake_probability:.4f}"
)

print(
    f"Real/Bona fide probability : "
    f"{real_probability:.4f}"
)

print(
    f"Risk score             : "
    f"{risk_score}/100"
)

print(
    f"Risk level             : "
    f"{risk_level}"
)

print(
    f"Security action        : "
    f"{security_action}"
)

if fake_probability > real_probability:
    print("Prediction: FAKE / SPOOF")
else:
    print("Prediction: REAL / BONA FIDE")

print("====================================")