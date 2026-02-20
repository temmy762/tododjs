# TodoDJs — Production Deployment Guide
## Hostinger VPS KVM 4 · Ubuntu · tododjs.com

---

## Architecture

```
tododjs.com (frontend)  ──►  Nginx  ──►  /var/www/tododjs/dist (static)
api.tododjs.com (API)   ──►  Nginx  ──►  PM2 → Node.js :5000
```

- **Frontend**: Vite React SPA served as static files by Nginx
- **Backend**: Express.js API running on port 5000, managed by PM2
- **Reverse proxy**: Nginx handles SSL, compression, and routing
- **SSL**: Let's Encrypt via Certbot (auto-renewing)

---

## Prerequisites

Before starting, ensure you have:

- [ ] Hostinger VPS KVM 4 with Ubuntu (fresh install)
- [ ] Domain `tododjs.com` purchased and accessible
- [ ] SSH access to the VPS (root or sudo user)
- [ ] MongoDB Atlas cluster ready
- [ ] Stripe account with **live** keys
- [ ] Resend account with API key and DNS verified for `tododjs.com`
- [ ] Wasabi S3 bucket configured
- [ ] Git repository pushed to GitHub

---

## Step 1 — DNS Configuration (Hostinger Panel)

In your Hostinger DNS Zone Editor, add these **A records** pointing to your VPS IP:

| Type  | Name  | Value (VPS IP)   | TTL  |
|-------|-------|------------------|------|
| A     | @     | `YOUR_VPS_IP`    | 3600 |
| A     | www   | `YOUR_VPS_IP`    | 3600 |
| A     | api   | `YOUR_VPS_IP`    | 3600 |

Also add Resend email DNS records (from Resend dashboard):
- **SPF** — TXT record
- **DKIM** — TXT record
- **DMARC** — TXT record (recommended)

> Wait 5–15 minutes for DNS propagation before proceeding.

---

## Step 2 — Automated Setup (Recommended)

SSH into your VPS and run the setup script:

```bash
ssh root@YOUR_VPS_IP

# Download and run setup script
git clone https://github.com/temmy762/tododjs.git /var/www/tododjs
cd /var/www/tododjs
chmod +x deploy/setup-vps.sh
sudo ./deploy/setup-vps.sh
```

The script handles: system updates, Node.js 20, PM2, Nginx, SSL, firewall, and app build.

**OR** follow the manual steps below.

---

## Step 3 — Manual Setup (Alternative)

### 3.1 System Packages

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git build-essential ufw fail2ban nginx
```

### 3.2 Firewall

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
```

### 3.3 Node.js 20 + PM2

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
pm2 startup systemd
```

### 3.4 Clone & Build

```bash
cd /var/www/tododjs
npm install && npm run build
cd server && npm install --production
```

### 3.5 Configure Server Environment

```bash
cp /var/www/tododjs/deploy/env.server.template /var/www/tododjs/server/.env
nano /var/www/tododjs/server/.env
```

Fill in **all** values — see `deploy/env.server.template` for the full list.

### 3.6 Nginx

```bash
sudo cp /var/www/tododjs/deploy/nginx/tododjs.conf /etc/nginx/sites-available/
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/tododjs.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 3.7 SSL (Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d tododjs.com -d www.tododjs.com -d api.tododjs.com \
  --non-interactive --agree-tos --email info@tododjs.com

# Auto-renewal cron
echo "0 3 * * * certbot renew --quiet --post-hook 'systemctl reload nginx'" | sudo crontab -
```

### 3.8 Start Application

```bash
cd /var/www/tododjs
pm2 start ecosystem.config.cjs
pm2 save
```

---

## Step 4 — Stripe Webhook (Production)

1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Add endpoint: `https://api.tododjs.com/api/stripe/webhook`
3. Select events:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `customer.subscription.deleted`
4. Copy the webhook signing secret → update `STRIPE_WEBHOOK_SECRET` in `server/.env`
5. Restart: `pm2 restart tododjs-api`

---

## Step 5 — Verify Deployment

```bash
# Check API health
curl https://api.tododjs.com/api/health

# Check PM2 status
pm2 status

# Check Nginx
sudo nginx -t

# Check SSL
curl -I https://tododjs.com
curl -I https://api.tododjs.com
```

---

## Post-Deployment Checklist

### Backend
- [ ] `curl https://api.tododjs.com/api/health` returns success
- [ ] MongoDB Atlas connection working (whitelist VPS IP)
- [ ] Wasabi S3 uploads working
- [ ] Resend emails sending (check Resend dashboard)
- [ ] Stripe webhooks receiving events (check Stripe dashboard)
- [ ] Admin notifications arriving at info@tododjs.com

### Frontend
- [ ] https://tododjs.com loads correctly
- [ ] Login / Register working
- [ ] Stripe checkout redirects and returns properly
- [ ] File uploads working
- [ ] Downloads working

### Security
- [ ] HTTPS enforced (HTTP redirects to HTTPS)
- [ ] Firewall active (`sudo ufw status`)
- [ ] fail2ban running (`sudo systemctl status fail2ban`)
- [ ] No sensitive data in git (check `.gitignore`)

---

## Redeployment (After Code Changes)

```bash
cd /var/www/tododjs
git pull origin main
npm install && npm run build
cd server && npm install --production
pm2 restart tododjs-api
```

Or use the script:
```bash
chmod +x deploy/redeploy.sh
./deploy/redeploy.sh
```

---

## Monitoring & Logs

```bash
pm2 status                # App status
pm2 logs tododjs-api      # Live logs
pm2 logs tododjs-api --lines 100  # Last 100 lines
pm2 monit                 # CPU/Memory monitor
pm2 restart tododjs-api   # Restart
pm2 reload tododjs-api    # Zero-downtime reload

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| CORS errors | Check `FRONTEND_URL` in `server/.env` matches `https://tododjs.com` |
| 502 Bad Gateway | `pm2 status` — API may be down. `pm2 restart tododjs-api` |
| SSL errors | `sudo certbot renew --force-renewal` then `sudo systemctl reload nginx` |
| MongoDB connection | Whitelist VPS IP in Atlas → Network Access |
| Uploads failing | Check `client_max_body_size` in Nginx config (set to 500M) |
| Emails not sending | Verify Resend API key + DNS records in Resend dashboard |
| Stripe webhooks failing | Check webhook URL and signing secret match |

---

## File Structure on VPS

```
/var/www/tododjs/
├── dist/                  ← Frontend build (served by Nginx)
├── server/
│   ├── .env               ← Production environment variables
│   ├── server.js           ← Express API entry point
│   └── ...
├── deploy/
│   ├── nginx/tododjs.conf  ← Nginx configuration
│   ├── env.server.template ← Environment template
│   ├── setup-vps.sh        ← Initial VPS setup script
│   └── redeploy.sh         ← Quick redeploy script
├── ecosystem.config.cjs    ← PM2 configuration
└── ...
```
