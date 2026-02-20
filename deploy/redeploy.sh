#!/bin/bash
# ============================================
# TodoDJs — Quick Redeploy Script
# Run on VPS after pushing code changes
# Usage: chmod +x redeploy.sh && ./redeploy.sh
# ============================================

set -e

APP_DIR="/var/www/tododjs"

echo ">>> Pulling latest code..."
cd $APP_DIR
git pull origin main

echo ">>> Installing frontend dependencies..."
npm install

echo ">>> Building frontend..."
npm run build

echo ">>> Installing backend dependencies..."
cd $APP_DIR/server
npm install --production

echo ">>> Restarting API server..."
pm2 restart tododjs-api

echo ">>> Reloading Nginx..."
sudo nginx -t && sudo systemctl reload nginx

echo ""
echo "✅ Redeploy complete!"
pm2 status
