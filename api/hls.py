from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
import subprocess
import os
import tempfile
import zipfile
import shutil
from pathlib import Path

app = FastAPI()

# Path to FFmpeg binary
FFMPEG_PATH = "/var/task/api/bin/ffmpeg"
TEMP_DIR = "/tmp"

@app.post("/api/hls")
async def convert_to_hls(file: UploadFile = File(...)):
    """
    Convert uploaded MP3 to HLS format and return as ZIP.
    
    Args:
        file: MP3 audio file (max 10 MB)
    
    Returns:
        ZIP file containing .m3u8 playlist and .ts segments
    """
    
    # Validate file type
    if file.content_type not in ["audio/mpeg", "audio/mp3", "application/octet-stream"]:
        raise HTTPException(status_code=400, detail="File must be MP3 format")
    
    # Create unique working directory
    work_dir = tempfile.mkdtemp(dir=TEMP_DIR)
    
    try:
        # Save uploaded file
        input_file = os.path.join(work_dir, "input.mp3")
        content = await file.read()
        
        # Check file size (max 10 MB)
        if len(content) > 10 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="File too large (max 10 MB)")
        
        with open(input_file, "wb") as f:
            f.write(content)
        
        # Check if FFmpeg exists
        if not os.path.exists(FFMPEG_PATH):
            raise HTTPException(
                status_code=500, 
                detail="FFmpeg not available. Ensure build script ran successfully."
            )
        
        # FFmpeg command for HLS conversion
        output_playlist = os.path.join(work_dir, "playlist.m3u8")
        cmd = [
            FFMPEG_PATH,
            "-i", input_file,
            "-c:a", "aac",
            "-b:a", "128k",
            "-f", "hls",
            "-hls_time", "2",
            "-hls_list_size", "0",
            output_playlist
        ]
        
        # Run FFmpeg
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=60
        )
        
        if result.returncode != 0:
            raise HTTPException(
                status_code=500,
                detail=f"FFmpeg conversion failed: {result.stderr}"
            )
        
        # Create ZIP archive
        zip_path = os.path.join(TEMP_DIR, f"{file.filename.split('.')[0]}_hls.zip")
        
        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
            # Add all HLS files
            for hls_file in os.listdir(work_dir):
                if hls_file.endswith((".m3u8", ".ts")):
                    file_path = os.path.join(work_dir, hls_file)
                    zf.write(file_path, arcname=hls_file)
        
        # Return ZIP file
        return FileResponse(
            zip_path,
            media_type="application/zip",
            filename=f"{file.filename.split('.')[0]}_hls.zip"
        )
    
    finally:
        # Cleanup working directory
        if os.path.exists(work_dir):
            shutil.rmtree(work_dir)

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    ffmpeg_exists = os.path.exists(FFMPEG_PATH)
    return {
        "status": "ok",
        "ffmpeg_available": ffmpeg_exists,
        "ffmpeg_path": FFMPEG_PATH
    }
