# 🚀 Simple Hostinger VPS Deployment Guide

## ✅ **Yes, you can use VPS database - No need for MongoDB cluster!**

Your VPS can run MongoDB locally, saving money on external database services.

---

## 📋 **What You Need:**
- Hostinger VPS (any plan works)
- Domain name 
- 30 minutes of time

---

## 🔧 **Step 1: Connect to VPS**

```bash
# SSH into your VPS (get IP from Hostinger panel)
ssh root@YOUR_VPS_IP
```

---

## 📦 **Step 2: Install Everything (Copy-Paste)**

```bash
# Update system
apt update && apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
apt-get install -y nodejs

# Install MongoDB (local database)
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list
apt-get update
apt-get install -y mongodb-org

# Start MongoDB
systemctl start mongod
systemctl enable mongod

# Install PM2 (keeps app running)
npm install -g pm2

# Install Nginx (web server)
apt install -y nginx
systemctl start nginx
systemctl enable nginx
```

---

## 📁 **Step 3: Upload Your Code**

### Option A: Upload via FileZilla/WinSCP
1. Download FileZilla
2. Connect to your VPS IP
3. Upload your entire project folder to `/root/case-management`

### Option B: Git (if you have GitHub)
```bash
cd /root
git clone YOUR_GITHUB_REPO_URL case-management
```

---

## ⚙️ **Step 4: Setup Your App**

```bash
# Go to your project
cd /root/case-management

# Install dependencies
npm install
cd client && npm install && cd ..

# Build the frontend
cd client && npm run build && cd ..

# Create environment file
nano .env
```

**Add this to .env file:**
```env
PORT=5000
NODE_ENV=production
MONGODB_URI=mongodb://localhost:27017/case-management
JWT_SECRET=your-super-secret-key-make-it-long-and-random
```

---

## 🚀 **Step 5: Start Your App**

```bash
# Create PM2 config
nano ecosystem.config.js
```

**Add this content:**
```javascript
module.exports = {
  apps: [{
    name: 'case-management',
    script: './server/index.js',
    cwd: '/root/case-management',
    instances: 1,
    autorestart: true,
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    }
  }]
};
```

**Start the app:**
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

## 🌐 **Step 6: Connect Your Domain**

### 6.1 Point Domain to VPS
1. Go to your domain registrar (Hostinger, GoDaddy, etc.)
2. Change DNS A record to point to your VPS IP
3. Wait 10-30 minutes for DNS to update

### 6.2 Configure Nginx
```bash
# Create site config
nano /etc/nginx/sites-available/case-management
```

**Add this content (replace YOUR_DOMAIN.com):**
```nginx
server {
    listen 80;
    server_name YOUR_DOMAIN.com www.YOUR_DOMAIN.com;

    # Serve React app
    location / {
        root /root/case-management/client/dist;
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests
    location /api {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Enable the site:**
```bash
# Link the config
ln -s /etc/nginx/sites-available/case-management /etc/nginx/sites-enabled/

# Remove default site
rm /etc/nginx/sites-enabled/default

# Test and restart
nginx -t
systemctl restart nginx
```

---

## 🔒 **Step 7: Add SSL (HTTPS)**

```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Get SSL certificate (replace YOUR_DOMAIN.com)
certbot --nginx -d YOUR_DOMAIN.com -d www.YOUR_DOMAIN.com
```

**Follow the prompts:**
- Enter your email
- Agree to terms
- Choose redirect option (recommended)

---

## 🎉 **Done! Your Site is Live**

Visit `https://YOUR_DOMAIN.com` - your app should be running!

---

## 🔥 **Firewall Setup (Security)**

```bash
# Enable firewall
ufw enable

# Allow necessary ports
ufw allow ssh
ufw allow 'Nginx Full'

# Check status
ufw status
```

---

## 📊 **Database Info**

✅ **MongoDB runs locally on your VPS**
✅ **No external database costs**
✅ **Data stored on your VPS disk**
✅ **Automatic backups recommended**

**Database location:** `/var/lib/mongodb/`
**Connection:** `mongodb://localhost:27017/case-management`

---

## 🔄 **Update Your App Later**

```bash
# Go to project folder
cd /root/case-management

# Pull new code (if using Git)
git pull

# Or upload new files via FileZilla

# Rebuild and restart
cd client && npm run build && cd ..
pm2 restart case-management
```

---

## 🆘 **Troubleshooting**

### App not working?
```bash
# Check app status
pm2 status
pm2 logs case-management

# Restart app
pm2 restart case-management
```

### Domain not working?
```bash
# Check Nginx
nginx -t
systemctl status nginx

# Check DNS (wait 30 minutes after DNS change)
nslookup YOUR_DOMAIN.com
```

### Database issues?
```bash
# Check MongoDB
systemctl status mongod

# Restart MongoDB
systemctl restart mongod
```

---

## 💰 **Cost Breakdown**

- **VPS Hosting:** $3-10/month (Hostinger)
- **Domain:** $10-15/year
- **SSL Certificate:** FREE (Let's Encrypt)
- **Database:** FREE (local MongoDB)
- **Total:** ~$5-12/month

**No additional MongoDB cluster fees!**

---

## 🎯 **What You Get**

✅ Professional website with your domain
✅ HTTPS security (green lock)
✅ Local database (no external costs)
✅ Auto-restart if server reboots
✅ 13 language support
✅ Company logo branding
✅ Full case management system

---

## 📞 **Need Help?**

1. **Check logs first:** `pm2 logs case-management`
2. **Restart services:** `pm2 restart case-management`
3. **Check domain DNS:** Wait 30 minutes after DNS changes
4. **Verify SSL:** Certificate auto-renews every 90 days

Your Case Management System is now live and professional! 🚀
