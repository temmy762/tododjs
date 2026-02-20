#!/bin/bash
# ============================================
# TodoDJs — Hostinger VPS KVM 4 Ubuntu Setup
# Domain: tododjs.com
# ============================================
# Run as root or with sudo on a fresh Ubuntu VPS
# Usage: chmod +x setup-vps.sh && sudo ./setup-vps.sh
# ============================================

set -e

DOMAIN="tododjs.com"
API_DOMAIN="api.tododjs.com"
APP_DIR="/var/www/tododjs"
REPO_URL="https://github.com/temmy762/tododjs.git"  # UPDATE with your actual repo URL
NODE_VERSION="20"

echo "============================================"
echo " TodoDJs VPS Setup — $DOMAIN"
echo " Hostinger KVM 4 Ubuntu"
echo "============================================"

# ─── 1. System Update ───
echo ""
echo ">>> [1/10] Updating system packages..."
apt update && apt upgrade -y

# ─── 2. Install Essential Packages ───
echo ""
echo ">>> [2/10] Installing essential packages..."
apt install -y curl wget git build-essential software-properties-common ufw fail2ban

# ─── 3. Configure Firewall ───
echo ""
echo ">>> [3/10] Configuring firewall (UFW)..."
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
echo "Firewall configured: SSH, HTTP, HTTPS allowed"

# ─── 4. Install Node.js 20 LTS ───
echo ""
echo ">>> [4/10] Installing Node.js ${NODE_VERSION}.x..."
curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
apt install -y nodejs
echo "Node.js $(node -v) installed"
echo "npm $(npm -v) installed"

# ─── 5. Install PM2 ───
echo ""
echo ">>> [5/10] Installing PM2..."
npm install -g pm2
pm2 startup systemd -u root --hp /root
mkdir -p /var/log/pm2

# ─── 6. Install Nginx ───
echo ""
echo ">>> [6/10] Installing Nginx..."
apt install -y nginx
systemctl enable nginx
systemctl start nginx

# ─── 7. Clone & Setup Application ───
echo ""
echo ">>> [7/10] Setting up application..."
mkdir -p $APP_DIR

if [ -d "$APP_DIR/.git" ]; then
    echo "Repository exists, pulling latest..."
    cd $APP_DIR
    git pull origin main
else
    echo "Cloning repository..."
    git clone $REPO_URL $APP_DIR
    cd $APP_DIR
fi

# Install frontend dependencies & build
echo "Installing frontend dependencies..."
npm install --production=false
echo "Building frontend..."
npm run build

# Install backend dependencies
echo "Installing backend dependencies..."
cd $APP_DIR/server
npm install --production

# ─── 8. Configure Nginx ───
echo ""
echo ">>> [8/10] Configuring Nginx..."

# Remove default site
rm -f /etc/nginx/sites-enabled/default

# Copy our config
cp $APP_DIR/deploy/nginx/tododjs.conf /etc/nginx/sites-available/tododjs.conf

# For initial setup (before SSL), create a temporary HTTP-only config
cat > /etc/nginx/sites-available/tododjs-temp.conf << 'NGINX_TEMP'
# Temporary HTTP config — used before SSL is set up
server {
    listen 80;
    listen [::]:80;
    server_name tododjs.com www.tododjs.com;

    root /var/www/tododjs/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}

server {
    listen 80;
    listen [::]:80;
    server_name api.tododjs.com;

    client_max_body_size 500M;
    proxy_connect_timeout 600;
    proxy_send_timeout 600;
    proxy_read_timeout 600;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_buffering off;
        proxy_request_buffering off;
    }
}
NGINX_TEMP

# Use temp config first (before SSL)
ln -sf /etc/nginx/sites-available/tododjs-temp.conf /etc/nginx/sites-enabled/tododjs.conf
nginx -t && systemctl reload nginx

# ─── 9. SSL with Let's Encrypt ───
echo ""
echo ">>> [9/10] Setting up SSL with Let's Encrypt..."
apt install -y certbot python3-certbot-nginx

echo ""
echo "============================================"
echo " IMPORTANT: Before running certbot, make sure"
echo " your DNS records are pointing to this server:"
echo ""
echo "   A record: tododjs.com     → $(curl -s ifconfig.me)"
echo "   A record: www.tododjs.com → $(curl -s ifconfig.me)"
echo "   A record: api.tododjs.com → $(curl -s ifconfig.me)"
echo ""
echo "============================================"
read -p "Are DNS records configured? (y/n): " dns_ready

if [ "$dns_ready" = "y" ] || [ "$dns_ready" = "Y" ]; then
    certbot --nginx -d $DOMAIN -d www.$DOMAIN -d $API_DOMAIN --non-interactive --agree-tos --email info@tododjs.com

    # Now switch to the full SSL config
    ln -sf /etc/nginx/sites-available/tododjs.conf /etc/nginx/sites-enabled/tododjs.conf
    nginx -t && systemctl reload nginx

    # Auto-renewal cron
    echo "0 3 * * * certbot renew --quiet --post-hook 'systemctl reload nginx'" | crontab -
    echo "SSL configured with auto-renewal"
else
    echo "Skipping SSL — run this later:"
    echo "  sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN -d $API_DOMAIN"
    echo "  Then switch nginx config:"
    echo "  sudo ln -sf /etc/nginx/sites-available/tododjs.conf /etc/nginx/sites-enabled/tododjs.conf"
    echo "  sudo nginx -t && sudo systemctl reload nginx"
fi

# ─── 10. Start Application ───
echo ""
echo ">>> [10/10] Starting application with PM2..."

cd $APP_DIR

# Check if server/.env exists
if [ ! -f "$APP_DIR/server/.env" ]; then
    echo ""
    echo "============================================"
    echo " WARNING: server/.env not found!"
    echo " Copy the template and fill in your values:"
    echo "   cp $APP_DIR/deploy/env.server.template $APP_DIR/server/.env"
    echo "   nano $APP_DIR/server/.env"
    echo "============================================"
    echo ""
    read -p "Press Enter after configuring server/.env..."
fi

# Start with PM2
pm2 start ecosystem.config.cjs
pm2 save

echo ""
echo "============================================"
echo " TodoDJs Deployment Complete!"
echo "============================================"
echo ""
echo " Frontend: https://$DOMAIN"
echo " API:      https://$API_DOMAIN"
echo ""
echo " Useful commands:"
echo "   pm2 status              — Check app status"
echo "   pm2 logs tododjs-api    — View logs"
echo "   pm2 restart tododjs-api — Restart API"
echo "   pm2 monit               — Monitor resources"
echo ""
echo " To redeploy after code changes:"
echo "   cd $APP_DIR"
echo "   git pull origin main"
echo "   npm install && npm run build"
echo "   cd server && npm install"
echo "   pm2 restart tododjs-api"
echo ""
echo "============================================"
