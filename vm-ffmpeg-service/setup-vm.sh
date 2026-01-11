#!/bin/bash
# Manual setup script to run on the VM
# Run this script on the VM after copying files

set -e

echo "=== FFmpeg Service VM Setup ==="
echo ""

# Install FFmpeg
echo "Installing FFmpeg..."
apt update
apt install -y ffmpeg
ffmpeg -version

# Install Node.js
echo ""
echo "Installing Node.js..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt install -y nodejs
fi
node --version
npm --version

# Install PM2
echo ""
echo "Installing PM2..."
npm install -g pm2

# Install dependencies
echo ""
echo "Installing service dependencies..."
cd /opt/ffmpeg-service
npm install

# Configure firewall
echo ""
echo "Configuring firewall..."
ufw allow 3001/tcp

echo ""
echo "=== Setup Complete! ==="
echo ""
echo "Next steps:"
echo "1. Edit .env file and set FFMPEG_API_KEY"
echo "2. Start the service: pm2 start server.js --name ffmpeg-service"
echo "3. Save PM2 config: pm2 save"
echo "4. Enable PM2 startup: pm2 startup"
