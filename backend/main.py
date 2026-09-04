"""
FastAPI Backend for Audio AI Detection System
Provides REST API and WebSocket endpoints for audio processing
"""

import os
import sys
import asyncio
from typing import List, Optional
from datetime import datetime, timezone
import json

# Add parent directory to path for audio_processing import
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI, File, UploadFile, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
import numpy as np

# Import audio processing module
try:
    from audio_processing import process_audio_file, predict_chunk, AudioProcessor, MockAIModel
except ImportError:
    # Fallback if module not available
    print("Warning: audio_processing module not found, using mock implementations")
    def process_audio_file(audio_bytes):
        return {"mock": True}
    def predict_chunk(features):
        return {"mock": True}


# Initialize FastAPI app
app = FastAPI(
    title="Audio AI Detection API",
    description="API for detecting AI-generated audio",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize processor and model
processor = AudioProcessor()
model = MockAIModel()

# Store active WebSocket connections
active_connections: List[WebSocket] = []


@app.get("/health")
async def health_check():
    """
    Health check endpoint.
    Returns service status and timestamp.
    """
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "service": "audio-ai-detection"
    }


@app.post("/upload")
async def upload_audio(file: UploadFile = File(...)):
    """
    Upload and process an audio file.
    
    Args:
        file: Audio file upload
        
    Returns:
        Processing results with AI detection predictions
    """
    try:
        # Validate file type
        allowed_types = ['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/ogg', 'audio/flac', 'audio/x-wav']
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type: {file.content_type}. Allowed: {allowed_types}"
            )
        
        # Read file content
        contents = await file.read()
        
        if len(contents) == 0:
            raise HTTPException(status_code=400, detail="Empty file uploaded")
        
        # Process audio
        result = process_audio_file(contents)
        
        # Add metadata
        result['filename'] = file.filename
        result['upload_time'] = datetime.now(timezone.utc).isoformat()
        
        return JSONResponse(content=result)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing error: {str(e)}")


@app.post("/predict")
async def predict_audio(data: dict):
    """
    Run prediction on pre-processed audio features.
    
    Args:
        data: Dictionary containing audio features
        
    Returns:
        Prediction results with confidence scores
    """
    try:
        features = data.get('features')
        if not features:
            raise HTTPException(status_code=400, detail="No features provided")
        
        # Convert lists back to numpy arrays if needed
        for key in features:
            if isinstance(features[key], list):
                features[key] = np.array(features[key])
        
        # Run prediction
        prediction = predict_chunk(features)
        
        return JSONResponse(content={
            'prediction': prediction,
            'timestamp': datetime.now(timezone.utc).isoformat()
        })
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")


@app.websocket("/ws/live")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time audio streaming.
    Receives audio chunks from client and returns live predictions.
    """
    await websocket.accept()
    active_connections.append(websocket)
    
    try:
        await websocket.send_json({
            'type': 'connected',
            'message': 'WebSocket connection established'
        })
        
        chunk_buffer = []
        
        while True:
            # Receive message from client
            message = await websocket.receive()
            
            # Handle text messages (commands)
            if 'text' in message:
                data = json.loads(message['text'])
                
                if data.get('action') == 'start':
                    await websocket.send_json({
                        'type': 'status',
                        'message': 'Recording started'
                    })
                    
                elif data.get('action') == 'stop':
                    await websocket.send_json({
                        'type': 'status',
                        'message': 'Recording stopped'
                    })
                    chunk_buffer = []
                    
                elif data.get('action') == 'ping':
                    await websocket.send_json({
                        'type': 'pong',
                        'timestamp': datetime.now(timezone.utc).isoformat()
                    })
            
            # Handle binary messages (audio data)
            elif 'bytes' in message:
                audio_bytes = message['bytes']
                
                try:
                    # Convert bytes to numpy array (assume float32 PCM)
                    audio_chunk = np.frombuffer(audio_bytes, dtype=np.float32)
                    
                    # Ensure correct length (pad or trim to chunk_samples)
                    target_length = processor.chunk_samples
                    if len(audio_chunk) < target_length:
                        audio_chunk = np.pad(audio_chunk, (0, target_length - len(audio_chunk)))
                    else:
                        audio_chunk = audio_chunk[:target_length]
                    
                    # Process chunk
                    features = processor.extract_features(audio_chunk)
                    prediction = model.predict(features)
                    
                    # Send prediction back to client
                    await websocket.send_json({
                        'type': 'prediction',
                        'prediction': prediction,
                        'timestamp': datetime.now(timezone.utc).isoformat(),
                        'waveform': audio_chunk.tolist()
                    })
                    
                except Exception as e:
                    await websocket.send_json({
                        'type': 'error',
                        'message': str(e)
                    })
                    
    except WebSocketDisconnect:
        active_connections.remove(websocket)
        print(f"Client disconnected. Active connections: {len(active_connections)}")
        
    except Exception as e:
        if websocket in active_connections:
            active_connections.remove(websocket)
        print(f"WebSocket error: {str(e)}")


# ---------------------------------------------------------------------------
# Frontend static files integration (for unified deployment)
# ---------------------------------------------------------------------------
FRONTEND_BUILD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "build")

@app.get("/api")
async def api_info():
    """API info endpoint."""
    return {
        "service": "Audio AI Detection API",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "upload": "/upload (POST)",
            "predict": "/predict (POST)",
            "websocket": "/ws/live"
        }
    }

if os.path.isdir(FRONTEND_BUILD_DIR):
    static_dir = os.path.join(FRONTEND_BUILD_DIR, "static")
    if os.path.isdir(static_dir):
        app.mount("/static", StaticFiles(directory=static_dir), name="static")

    @app.get("/")
    async def serve_index():
        return FileResponse(os.path.join(FRONTEND_BUILD_DIR, "index.html"))

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Allow API endpoints and docs through without interception
        if full_path in ["health", "upload", "predict", "docs", "openapi.json", "api"]:
            raise HTTPException(status_code=404, detail="Not found")
        file_path = os.path.join(FRONTEND_BUILD_DIR, full_path)
        if full_path and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(FRONTEND_BUILD_DIR, "index.html"))
else:
    @app.get("/")
    async def root():
        """Root endpoint with API information."""
        return await api_info()


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)