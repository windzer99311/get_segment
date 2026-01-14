#!/bin/bash

# Install FFmpeg during Vercel build
# Downloads static Linux x86_64 FFmpeg binary from johnvansickle.com

set -e

echo "Installing FFmpeg for HLS conversion..."

# Create bin directory if it doesn't exist
mkdir -p api/bin

# Download FFmpeg binary (static build for Linux x86_64)
# Version: latest static build
FFMPEG_URL="https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz"
TEMP_FILE="/tmp/ffmpeg-static.tar.xz"

echo "Downloading FFmpeg from $FFMPEG_URL..."
curl -L -o "$TEMP_FILE" "$FFMPEG_URL"

# Extract and copy FFmpeg binary
echo "Extracting FFmpeg..."
tar -xJf "$TEMP_FILE" -C /tmp

# Find and copy the ffmpeg binary
FFMPEG_BIN=$(find /tmp -name "ffmpeg" -type f -executable 2>/dev/null | head -1)

if [ -z "$FFMPEG_BIN" ]; then
    echo "Error: FFmpeg binary not found in archive"
    exit 1
fi

echo "Copying FFmpeg to api/bin/..."
cp "$FFMPEG_BIN" api/bin/ffmpeg
chmod +x api/bin/ffmpeg

# Verify installation
if [ -f "api/bin/ffmpeg" ]; then
    echo "✓ FFmpeg installed successfully"
    api/bin/ffmpeg -version | head -n 1
else
    echo "✗ FFmpeg installation failed"
    exit 1
fi

# Cleanup
rm -f "$TEMP_FILE"
rm -rf /tmp/ffmpeg-*

echo "FFmpeg installation complete!"
