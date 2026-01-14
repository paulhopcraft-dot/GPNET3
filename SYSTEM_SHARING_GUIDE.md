# Preventli System Sharing Guide - For Natalie's Testing

## 🎯 Deployment Options for Testing

### **Option 1: Local Network Sharing (Recommended for Same Office)**

If Natalie is on the same network/office:

1. **Start the development server:**
```bash
# In your gpnet3 directory
npm run dev -- --host
```

2. **Find your local IP address:**
```bash
# Windows
ipconfig | findstr IPv4

# Your IP will look like: 192.168.1.XXX
```

3. **Share access URL with Natalie:**
```
http://[YOUR-IP]:5173
# Example: http://192.168.1.100:5173
```

**Pros:** Simple, no additional setup needed
**Cons:** Only works on same network, requires your machine to stay running

---

### **Option 2: Cloud Tunnel (Recommended for Remote Testing)**

Using ngrok to create secure tunnel:

1. **Install ngrok:**
```bash
# Download from https://ngrok.com/download
# Or using chocolatey: choco install ngrok
```

2. **Start your local server:**
```bash
npm run dev
```

3. **Create tunnel (in new terminal):**
```bash
ngrok http 5173
```

4. **Share the public URL:**
```
Ngrok will provide a URL like: https://abc123.ngrok.io
Send this URL to Natalie
```

**Pros:** Works anywhere, secure HTTPS, easy setup
**Cons:** Free tier has session limits, requires sign-up

---

### **Option 3: Cloud Deployment (Best for Extended Testing)**

Deploy to Vercel for persistent testing environment:

1. **Prepare for deployment:**
```bash
# Ensure build works
npm run build

# Create vercel.json config
```

2. **Deploy to Vercel:**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

3. **Configure environment variables:**
- Database connection
- API keys
- Authentication settings

**Pros:** Always available, production-like environment
**Cons:** Requires deployment setup, environment configuration

---

## 🚀 Quick Setup Instructions for Local Testing

### **For You (Before Natalie Arrives):**

1. **Start all services:**
```bash
# Terminal 1: Start backend
cd C:\dev\gpnet3
npm run dev:server

# Terminal 2: Start frontend
cd C:\dev\gpnet3
npm run dev:client

# Or use the combined command:
npm run dev
```

2. **Verify system health:**
```bash
# Check backend
curl http://localhost:5000/api/health

# Check frontend
# Open http://localhost:5173 in browser
```

3. **Prepare test data:**
- Ensure demo cases are available
- Verify Freshdesk sync is working
- Check that Treatment tabs are displaying properly

### **For Natalie (System Access):**

1. **Access the application:**
   - URL: `http://[PROVIDED-URL]:5173`
   - Use provided login credentials

2. **Browser requirements:**
   - Chrome, Firefox, Safari, or Edge (modern versions)
   - JavaScript enabled
   - No special plugins required

3. **Test account setup:**
   - Login: `natalie.test@preventli.com` (or as provided)
   - Password: [To be shared securely]
   - Role: Case Manager with full access

---

## 🔧 Pre-Testing System Checklist

### **Database & Backend:**
- [ ] PostgreSQL database is running
- [ ] All migrations applied
- [ ] Test data seeded
- [ ] API endpoints responding
- [ ] Freshdesk sync functioning

### **Frontend:**
- [ ] React app builds without errors
- [ ] All components load properly
- [ ] Treatment tabs display correctly
- [ ] Navigation works smoothly
- [ ] No console errors

### **Integration:**
- [ ] Backend-frontend connection working
- [ ] API calls returning data
- [ ] Authentication flow functional
- [ ] Error handling working

### **Test Data Verification:**
- [ ] At least 10-15 test cases available
- [ ] Cases have different statuses (At work, Off work, etc.)
- [ ] Medical certificates present
- [ ] Treatment plans available
- [ ] Recent activity/updates

---

## 📱 Mobile Testing Setup (Optional)

If testing mobile responsiveness:

1. **Expose to mobile device:**
```bash
# Start with host binding
npm run dev -- --host 0.0.0.0

# Access from mobile on same network
http://[YOUR-IP]:5173
```

2. **Test on different screen sizes:**
   - Phone (375px width)
   - Tablet (768px width)
   - Desktop (1200px+ width)

---

## 🆘 Troubleshooting Guide

### **Common Issues & Solutions:**

#### "Cannot connect to server"
- Check if backend is running on port 5000
- Verify firewall isn't blocking ports
- Restart both frontend and backend

#### "Database connection error"
- Ensure PostgreSQL is running
- Check environment variables
- Verify database exists and is accessible

#### "Login not working"
- Check user exists in database
- Verify password is correct
- Check JWT token generation

#### "Treatment tab not loading"
- Check browser console for errors
- Verify API endpoints are responding
- Check case has required data

### **Support Commands:**
```bash
# Check what's running on ports
netstat -ano | findstr :5000
netstat -ano | findstr :5173

# Restart development server
npm run dev

# Reset database (if needed)
npm run db:reset
npm run db:seed

# Check logs
npm run logs
```

---

## 📞 Support During Testing

**While Natalie is testing:**

1. **Monitor logs in real-time:**
```bash
# Backend logs
tail -f server/logs/app.log

# Frontend console (in browser dev tools)
```

2. **Quick fixes for common issues:**
   - Refresh browser for frontend issues
   - Restart server for backend issues
   - Clear browser cache if needed

3. **Communication channel:**
   - Phone/Slack for immediate issues
   - Email for non-urgent feedback
   - Screen share if needed for complex problems

---

## ⚠️ Security Considerations

- [ ] Use test data only (no real patient information)
- [ ] Temporary credentials for Natalie's account
- [ ] Disable or limit external API calls if needed
- [ ] Monitor access logs during testing
- [ ] Revoke access after testing completion

---

**Ready to share! 🎯**

Choose the deployment option that works best for your setup and Natalie's location. The local network option is quickest if you're in the same office, while ngrok provides the most flexibility for remote testing.