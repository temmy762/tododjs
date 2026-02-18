# Production Deployment Guide for TodoDJs

This guide will help you deploy your TodoDJs application to production with your domain `tododjs.com` and Resend email service.

## Prerequisites

- Domain: `tododjs.com` configured
- Resend DNS configured
- MongoDB Atlas account (for production database)
- Stripe account (production keys)
- Wasabi S3 bucket configured
- Hosting provider (e.g., Vercel, Netlify, DigitalOcean, AWS)

## 1. Backend Configuration

### Environment Variables

Copy `server/.env.production` to `server/.env` on your production server and update with your actual values:

```bash
# Production Server Configuration
PORT=5000
NODE_ENV=production

# Database - MongoDB Atlas
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/tododjs?retryWrites=true&w=majority

# JWT Secret - Generate a strong random secret
JWT_SECRET=<generate-a-strong-random-secret-here>
JWT_EXPIRE=7d

# Stripe Production Keys
STRIPE_SECRET_KEY=sk_live_your_actual_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_actual_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_actual_webhook_secret

# Resend Email Configuration
RESEND_API_KEY=re_your_actual_resend_api_key
RESEND_FROM_EMAIL=TodoDJs <noreply@tododjs.com>

# Frontend URL - Production Domain
FRONTEND_URL=https://tododjs.com

# Wasabi S3 Configuration (already configured)
WASABI_ACCESS_KEY_ID=your_wasabi_access_key
WASABI_SECRET_ACCESS_KEY=your_wasabi_secret_key
WASABI_BUCKET=tododj
WASABI_REGION=eu-west-1
WASABI_ENDPOINT=s3.eu-west-1.wasabisys.com

# File Upload
MAX_FILE_SIZE=50000000
UPLOAD_PATH=./uploads

# OpenAI (if using AI features)
OPENAI_API_KEY=your_openai_api_key
```

### Deploy Backend

**Option 1: VPS/DigitalOcean/AWS EC2**

1. SSH into your server
2. Clone the repository
3. Install dependencies:
   ```bash
   cd server
   npm install --production
   ```
4. Set up environment variables (copy .env.production to .env and update values)
5. Use PM2 to run the server:
   ```bash
   npm install -g pm2
   pm2 start server.js --name tododjs-api
   pm2 save
   pm2 startup
   ```
6. Configure Nginx as reverse proxy:
   ```nginx
   server {
       listen 80;
       server_name api.tododjs.com;
       
       location / {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
7. Set up SSL with Let's Encrypt:
   ```bash
   sudo certbot --nginx -d api.tododjs.com
   ```

**Option 2: Heroku**

1. Create a new Heroku app
2. Add environment variables in Heroku dashboard
3. Deploy:
   ```bash
   git subtree push --prefix server heroku main
   ```

## 2. Frontend Configuration

### Environment Variables

Update `.env.production` with your production API URL:

```bash
# Production Frontend Environment Variables
VITE_API_URL=https://api.tododjs.com/api
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_your_actual_stripe_publishable_key
```

### Deploy Frontend

**Option 1: Vercel (Recommended)**

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```
2. Deploy:
   ```bash
   vercel --prod
   ```
3. Configure domain in Vercel dashboard to point to `tododjs.com`
4. Vercel will automatically use `.env.production` for production builds

**Option 2: Netlify**

1. Install Netlify CLI:
   ```bash
   npm install -g netlify-cli
   ```
2. Build the project:
   ```bash
   npm run build
   ```
3. Deploy:
   ```bash
   netlify deploy --prod --dir=dist
   ```
4. Configure domain in Netlify dashboard

**Option 3: Static Hosting (S3, CloudFlare Pages, etc.)**

1. Build the project:
   ```bash
   npm run build
   ```
2. Upload the `dist` folder to your hosting provider
3. Configure domain to point to your hosting

## 3. DNS Configuration

### For tododjs.com

**Main Domain (Frontend)**
- Type: A or CNAME
- Name: @ or tododjs.com
- Value: Your frontend hosting IP/domain

**API Subdomain (Backend)**
- Type: A
- Name: api
- Value: Your backend server IP

**WWW Subdomain (Optional)**
- Type: CNAME
- Name: www
- Value: tododjs.com

### Resend Email DNS

Ensure you've added the required DNS records from Resend:
- SPF record
- DKIM record
- DMARC record (optional but recommended)

You can verify these in your Resend dashboard.

## 4. Post-Deployment Checklist

### Backend
- [ ] MongoDB Atlas connection working
- [ ] Wasabi S3 uploads working
- [ ] Resend emails sending successfully
- [ ] Stripe webhooks configured
- [ ] CORS allowing tododjs.com domain
- [ ] SSL certificate installed
- [ ] PM2 or process manager running

### Frontend
- [ ] API calls connecting to production backend
- [ ] Authentication working
- [ ] File uploads working
- [ ] Stripe checkout working
- [ ] All pages loading correctly
- [ ] SSL certificate installed

### Testing
- [ ] Create a test user account
- [ ] Test login/logout
- [ ] Test password reset email
- [ ] Test file upload
- [ ] Test download functionality
- [ ] Test Stripe payment flow
- [ ] Test admin dashboard (if applicable)

## 5. Monitoring & Maintenance

### Backend Monitoring
```bash
# View logs
pm2 logs tododjs-api

# Monitor process
pm2 monit

# Restart server
pm2 restart tododjs-api
```

### Database Backups
Set up automated backups in MongoDB Atlas dashboard.

### Email Monitoring
Monitor email delivery in Resend dashboard.

### SSL Renewal
If using Let's Encrypt, set up auto-renewal:
```bash
sudo certbot renew --dry-run
```

## 6. Environment-Specific API Calls

The application is now configured to automatically use the correct API URL based on the environment:

- **Development**: `http://localhost:5000/api`
- **Production**: `https://api.tododjs.com/api`

This is handled by the `src/config/api.js` file which reads from environment variables.

## 7. Troubleshooting

### CORS Errors
- Verify `FRONTEND_URL` in backend `.env` matches your frontend domain
- Check that `tododjs.com` is in the allowed origins list in `server/server.js`

### Email Not Sending
- Verify Resend API key is correct
- Check DNS records are properly configured
- Review Resend dashboard for delivery logs

### Database Connection Issues
- Verify MongoDB Atlas IP whitelist includes your server IP
- Check connection string format
- Ensure database user has proper permissions

### File Upload Issues
- Verify Wasabi credentials
- Check bucket permissions
- Ensure CORS is configured on Wasabi bucket

## 8. Security Best Practices

- [ ] Use strong JWT secret (minimum 32 characters)
- [ ] Enable rate limiting (already configured)
- [ ] Keep dependencies updated
- [ ] Use HTTPS everywhere
- [ ] Set secure cookie flags
- [ ] Implement proper error handling (don't expose sensitive info)
- [ ] Regular security audits
- [ ] Monitor for suspicious activity

## Support

For issues or questions, refer to:
- MongoDB Atlas: https://docs.atlas.mongodb.com/
- Resend: https://resend.com/docs
- Stripe: https://stripe.com/docs
- Wasabi: https://wasabi.com/help/
