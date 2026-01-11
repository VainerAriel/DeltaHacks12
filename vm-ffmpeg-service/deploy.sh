#!/bin/bash
# Deployment script for FFmpeg service on Vultr VM

set -e

echo "=== FFmpeg Service Deployment Script ==="
echo ""

# Configuration
VM_IP="45.77.218.210"
VM_USER="root"
SERVICE_DIR="/opt/ffmpeg-service"
LOCAL_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "This script will:"
echo "1. Install FFmpeg on the VM (if not already installed)"
echo "2. Install Node.js on the VM (if not already installed)"
echo "3. Copy service files to the VM"
echo "4. Install dependencies"
echo "5. Set up PM2 for process management"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

echo ""
echo "=== Step 1: Installing FFmpeg ==="
ssh ${VM_USER}@${VM_IP} "which ffmpeg || (apt update && apt install -y ffmpeg)"

echo ""
echo "=== Step 2: Installing Node.js ==="
ssh ${VM_USER}@${VM_IP} "which node || (curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && apt install -y nodejs)"

echo ""
echo "=== Step 3: Creating service directory ==="
ssh ${VM_USER}@${VM_IP} "mkdir -p ${SERVICE_DIR}"

echo ""
echo "=== Step 4: Copying files to VM ==="
scp -r ${LOCAL_DIR}/* ${VM_USER}@${VM_IP}:${SERVICE_DIR}/

echo ""
echo "=== Step 5: Installing dependencies ==="
ssh ${VM_USER}@${VM_IP} "cd ${SERVICE_DIR} && npm install"

echo ""
echo "=== Step 6: Setting up PM2 ==="
ssh ${VM_USER}@${VM_IP} "npm list -g pm2 || npm install -g pm2"
ssh ${VM_USER}@${VM_IP} "cd ${SERVICE_DIR} && pm2 delete ffmpeg-service 2>/dev/null || true"
ssh ${VM_USER}@${VM_IP} "cd ${SERVICE_DIR} && pm2 start server.js --name ffmpeg-service"
ssh ${VM_USER}@${VM_IP} "pm2 save"

echo ""
echo "=== Step 7: Configuring firewall ==="
ssh ${VM_USER}@${VM_IP} "ufw allow 3001/tcp || echo 'Firewall rule may already exist'"

echo ""
echo "=== Deployment Complete! ==="
echo ""
echo "Service should be running at: http://${VM_IP}:3001"
echo ""
echo "Next steps:"
echo "1. SSH into the VM: ssh ${VM_USER}@${VM_IP}"
echo "2. Edit ${SERVICE_DIR}/.env and set FFMPEG_API_KEY"
echo "3. Restart the service: pm2 restart ffmpeg-service"
echo "4. Check logs: pm2 logs ffmpeg-service"
echo ""
echo "To test the service:"
echo "curl -X POST http://${VM_IP}:3001/health"
