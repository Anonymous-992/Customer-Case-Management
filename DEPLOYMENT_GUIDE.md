# 🚀 Complete Deployment Guide for Hostinger VPS

## 📋 Prerequisites
- Hostinger VPS hosting account
- Domain name pointed to your VPS
- Basic terminal/command line knowledge
- Your Case Management System code ready

---

## 🔧 Step 1: Initial VPS Setup

### 1.1 Connect to Your VPS
```bash
# Connect via SSH (replace with your VPS IP)
ssh root@your-vps-ip-address
```

### 1.2 Update System
```bash
# Update package lists
apt update && apt upgrade -y

# Install essential packages
apt install -y curl wget git nano ufw
```

### 1.3 Create Non-Root User (Security Best Practice)
```bash
# Create new user (replace 'deploy' with your preferred username)
adduser deploy

# Add user to sudo group
usermod -aG sudo deploy

# Switch to new user
su - deploy
```

---

## 🐧 Step 2: Install Required Software

### 2.1 Install Node.js (Latest LTS)
```bash
# Install Node.js using NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### 2.2 Install MongoDB
```bash
# Import MongoDB public GPG key
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -

# Create MongoDB list file
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Update package database
sudo apt-get update

# Install MongoDB
sudo apt-get install -y mongodb-org

# Start and enable MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Verify MongoDB is running
sudo systemctl status mongod
```

### 2.3 Install PM2 (Process Manager)
```bash
# Install PM2 globally
sudo npm install -g pm2

# Setup PM2 to start on boot
pm2 startup
# Follow the command it gives you (usually starts with sudo env PATH=...)
```

### 2.4 Install Nginx (Web Server)
```bash
# Install Nginx
sudo apt install -y nginx

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Check status
sudo systemctl status nginx
```

---

## 📁 Step 3: Deploy Your Application

### 3.1 Upload Your Code
```bash
# Create application directory
mkdir -p /home/deploy/apps
cd /home/deploy/apps

# Option A: Upload via Git (Recommended)
git clone https://github.com/yourusername/your-repo.git case-management
cd case-management

# Option B: Upload via SCP/SFTP
# Use FileZilla, WinSCP, or command line to upload your project folder
```

### 3.2 Install Dependencies
```bash
# Navigate to your project
cd /home/deploy/apps/case-management

# Install server dependencies
npm install

# Install client dependencies
cd client
npm install
cd ..
```

### 3.3 Build the Client
```bash
# Build the React client for production
cd client
npm run build
cd ..
```

---

## ⚙️ Step 4: Environment Configuration

### 4.1 Create Environment File
```bash
# Create .env file in project root
nano .env
```

### 4.2 Add Environment Variables
```env
# Server Configuration
PORT=5000
NODE_ENV=production

# Database
MONGODB_URI=mongodb://localhost:27017/case-management

# JWT Secret (generate a strong secret)
JWT_SECRET=your-super-secret-jwt-key-here-make-it-long-and-random

# Email Configuration (Optional - for notifications)
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# SMTP Configuration (Alternative to Gmail)
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587

# Twilio (Optional - for SMS)
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=+1234567890

# Company Info
COMPANY_NAME=Your Company Name
```

### 4.3 Set File Permissions
```bash
# Make sure the deploy user owns the files
sudo chown -R deploy:deploy /home/deploy/apps/case-management

# Set proper permissions
chmod -R 755 /home/deploy/apps/case-management
```

---

## 🔒 Step 5: Database Setup

### 5.1 Secure MongoDB (Optional but Recommended)
```bash
# Connect to MongoDB
mongosh

# Create admin user
use admin
db.createUser({
  user: "admin",
  pwd: "your-strong-password",
  roles: ["userAdminAnyDatabase", "dbAdminAnyDatabase", "readWriteAnyDatabase"]
})

# Create database user for your app
use case-management
db.createUser({
  user: "caseapp",
  pwd: "your-app-password",
  roles: ["readWrite"]
})

# Exit MongoDB
exit
```

### 5.2 Update MongoDB Configuration (if using authentication)
```bash
# Edit MongoDB config
sudo nano /etc/mongod.conf

# Add these lines:
security:
  authorization: enabled

# Restart MongoDB
sudo systemctl restart mongod
```

### 5.3 Update Environment File (if using MongoDB auth)
```bash
nano .env

# Update MongoDB URI
MONGODB_URI=mongodb://caseapp:your-app-password@localhost:27017/case-management
```

---

## 🚀 Step 6: Start the Application

### 6.1 Test the Application
```bash
# Navigate to project directory
cd /home/deploy/apps/case-management

# Start the application manually to test
npm start

# If it starts successfully, stop it with Ctrl+C
```

### 6.2 Start with PM2
```bash
# Create PM2 ecosystem file
nano ecosystem.config.js
```

### 6.3 PM2 Configuration
```javascript
module.exports = {
  apps: [{
    name: 'case-management',
    script: './server/index.js',
    cwd: '/home/deploy/apps/case-management',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    }
  }]
};
```

### 6.4 Start Application with PM2
```bash
# Start the application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Check status
pm2 status
pm2 logs case-management
```

---

## 🌐 Step 7: Configure Nginx (Reverse Proxy)

### 7.1 Create Nginx Configuration
```bash
# Create site configuration
sudo nano /etc/nginx/sites-available/case-management
```

### 7.2 Nginx Configuration File
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Serve static files from React build
    location / {
        root /home/deploy/apps/case-management/client/dist;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Proxy API requests to Node.js server
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript;
}
```

### 7.3 Enable the Site
```bash
# Create symbolic link to enable site
sudo ln -s /etc/nginx/sites-available/case-management /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

---

## 🔐 Step 8: SSL Certificate (HTTPS)

### 8.1 Install Certbot
```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx
```

### 8.2 Obtain SSL Certificate
```bash
# Get SSL certificate (replace with your domain)
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Follow the prompts:
# - Enter your email
# - Agree to terms
# - Choose whether to share email with EFF
# - Certbot will automatically configure Nginx
```

### 8.3 Test Auto-Renewal
```bash
# Test certificate renewal
sudo certbot renew --dry-run
```

---

## 🔥 Step 9: Configure Firewall

### 9.1 Setup UFW Firewall
```bash
# Enable UFW
sudo ufw enable

# Allow SSH (important - don't lock yourself out!)
sudo ufw allow ssh

# Allow HTTP and HTTPS
sudo ufw allow 'Nginx Full'

# Check status
sudo ufw status
```

---

## 📊 Step 10: Monitoring and Maintenance

### 10.1 Setup Log Rotation
```bash
# Create logrotate configuration
sudo nano /etc/logrotate.d/case-management
```

```
/home/deploy/.pm2/logs/*.log {
    daily
    missingok
    rotate 7
    compress
    notifempty
    create 0644 deploy deploy
    postrotate
        pm2 reloadLogs
    endscript
}
```

### 10.2 Useful Commands for Maintenance
```bash
# PM2 Commands
pm2 status                 # Check app status
pm2 logs case-management   # View logs
pm2 restart case-management # Restart app
pm2 reload case-management  # Reload app (zero downtime)
pm2 stop case-management    # Stop app
pm2 delete case-management  # Delete app from PM2

# System Monitoring
htop                       # System resources
df -h                      # Disk usage
free -h                    # Memory usage
sudo systemctl status nginx # Nginx status
sudo systemctl status mongod # MongoDB status

# Nginx Commands
sudo nginx -t              # Test configuration
sudo systemctl reload nginx # Reload configuration
sudo systemctl restart nginx # Restart Nginx

# View logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
pm2 logs --lines 100
```

---

## 🔄 Step 11: Deployment Updates

### 11.1 Create Update Script
```bash
# Create update script
nano /home/deploy/update-app.sh
```

```bash
#!/bin/bash
cd /home/deploy/apps/case-management

echo "🔄 Pulling latest changes..."
git pull origin main

echo "📦 Installing dependencies..."
npm install

echo "🏗️ Building client..."
cd client
npm install
npm run build
cd ..

echo "🔄 Restarting application..."
pm2 reload case-management

echo "✅ Deployment complete!"
```

### 11.2 Make Script Executable
```bash
chmod +x /home/deploy/update-app.sh
```

### 11.3 Run Updates
```bash
# Run the update script
./update-app.sh
```

---

## 🎯 Step 12: Final Verification

### 12.1 Test Your Application
1. **Open your browser** and go to `https://your-domain.com`
2. **Test login** with your admin credentials
3. **Check all features** work correctly
4. **Test on mobile** devices
5. **Verify SSL certificate** (green lock icon)

### 12.2 Performance Testing
```bash
# Test server response
curl -I https://your-domain.com

# Check if API is working
curl https://your-domain.com/api/health
```

---

## 🆘 Troubleshooting

### Common Issues and Solutions

#### Application Won't Start
```bash
# Check PM2 logs
pm2 logs case-management

# Check if port is in use
sudo netstat -tulpn | grep :5000

# Restart application
pm2 restart case-management
```

#### Database Connection Issues
```bash
# Check MongoDB status
sudo systemctl status mongod

# Check MongoDB logs
sudo tail -f /var/log/mongodb/mongod.log

# Test MongoDB connection
mongosh
```

#### Nginx Issues
```bash
# Check Nginx configuration
sudo nginx -t

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log

# Restart Nginx
sudo systemctl restart nginx
```

#### SSL Certificate Issues
```bash
# Check certificate status
sudo certbot certificates

# Renew certificate manually
sudo certbot renew

# Check certificate expiry
openssl x509 -in /etc/letsencrypt/live/your-domain.com/cert.pem -text -noout | grep "Not After"
```

---

## 📋 Maintenance Checklist

### Daily
- [ ] Check application status: `pm2 status`
- [ ] Monitor system resources: `htop`

### Weekly
- [ ] Check logs for errors: `pm2 logs`
- [ ] Review Nginx access logs
- [ ] Check disk space: `df -h`

### Monthly
- [ ] Update system packages: `sudo apt update && sudo apt upgrade`
- [ ] Review SSL certificate expiry
- [ ] Backup database
- [ ] Review security logs

---

## 🔐 Security Best Practices

1. **Keep system updated**: Regular security updates
2. **Use strong passwords**: For all accounts and databases
3. **Enable firewall**: UFW with minimal open ports
4. **Regular backups**: Database and application files
5. **Monitor logs**: Check for suspicious activity
6. **Use HTTPS**: Always encrypt traffic
7. **Limit SSH access**: Use key-based authentication
8. **Regular security audits**: Check for vulnerabilities

---

## 📞 Support

If you encounter any issues during deployment:

1. **Check the logs** first (PM2, Nginx, MongoDB)
2. **Verify configurations** are correct
3. **Test each component** individually
4. **Check firewall settings**
5. **Ensure domain DNS** is pointing to your VPS

---

## 🎉 Congratulations!

Your Case Management System is now live and accessible at `https://your-domain.com`!

The system includes:
- ✅ 13 language support
- ✅ Company logo branding
- ✅ SSL encryption
- ✅ Production-ready setup
- ✅ Automatic process management
- ✅ Reverse proxy configuration
- ✅ Security hardening

Your application is now ready for production use! 🚀
