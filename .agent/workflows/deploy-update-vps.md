---
description: Update and deploy the latest changes to Hostinger VPS
---

# Deploy Updates to Hostinger VPS

Follow these steps to update your live application with the latest changes (Phone validation, Dashboard fixes, etc.).

## 1. Connect to your VPS
Open your terminal (PowerShell or Command Prompt) and SSH into your Hostinger VPS:
```bash
ssh root@your_vps_ip_address
# Enter your password when prompted
```

## 2. Navigate to Project Directory
Go to the folder where your project is cloned. It is likely in `var/www` or `home`:
```bash
# Example path - adjust if yours is different
cd /var/www/Customer-Case-Management
```

## 3. Pull Latest Changes
Fetch the code you just pushed to GitHub:
```bash
git pull origin main
# If you are on a different branch, use: git pull origin <branch_name>
```

## 4. Install Dependencies
Since we updated libraries (like Zod) and might have added new ones, it's good practice to install:
```bash
npm install
```

## 5. Rebuild the Application
Build the new frontend and backend code:
```bash
npm run build
```
*Note: This creates the `dist` folder with the new React code and compiles the server.*

## 6. Restart the Application via PM2
Restart the running process to apply the changes:

**Option A: If you know the PM2 ID or Name**
```bash
pm2 restart all
# OR specific app name/id
pm2 restart 0
```

**Option B: If you're not sure, check the list first**
```bash
pm2 list
pm2 restart <id_from_list>
```

## 7. Verify Deployment
1. Open your website in a browser.
2. Hard refresh the page (Ctrl+F5 or Cmd+Shift+R) to ensure you aren't seeing cached version.
3. Try the "Create Customer" button on the dashboard to confirm the new fields (Second Phone) appear.

## Troubleshooting
If something goes wrong (e.g., page not loading):
- Check logs: `pm2 logs`
- If you see database connection errors, check your `.env` file matches the new requirements (though no new env vars were added this time).
