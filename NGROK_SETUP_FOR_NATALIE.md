# ngrok Setup for Remote Testing

## Quick Start (5 minutes)

### Step 1: Start the Servers

Open two PowerShell terminals:

**Terminal 1 - Backend:**
```powershell
cd C:\dev\gpnet3
npm run dev
```
Wait for: `Server running on port 5000`

**Terminal 2 - Frontend (if separate):**
```powershell
cd C:\dev\gpnet3\client
npm run dev
```
Wait for: `Local: http://localhost:5173`

### Step 2: Start ngrok Tunnel

**Terminal 3 - ngrok:**
```powershell
ngrok http 5000
```

You'll see output like:
```
Session Status                online
Forwarding                    https://abc123.ngrok-free.app -> http://localhost:5000
```

### Step 3: Copy the URL

Copy the **https** URL from ngrok (e.g., `https://abc123.ngrok-free.app`)

---

## Send to Natalie

**Email/Message Template:**

```
Hi Natalie,

Preventli is ready for testing!

ACCESS DETAILS:
- URL: https://[YOUR-NGROK-URL].ngrok-free.app
- Email: employer@test.com
- Password: password123

TESTING INSTRUCTIONS:
1. Click the URL above
2. If you see "Visit Site" button on ngrok warning page, click it
3. Log in with the credentials above
4. You'll see the Employer Dashboard with 49 Symmetry cases

The UAT test plan is attached (NATALIE_EMPLOYER_UAT.md)

I'll be available during testing for support.
Call/text me if you have any issues: [YOUR PHONE]

Thanks!
Paul
```

---

## During Testing

### Keep These Running

1. **Backend server** (Terminal 1) - Don't close!
2. **ngrok tunnel** (Terminal 3) - Don't close!
3. If ngrok disconnects, restart it and send new URL to Natalie

### Monitor for Issues

Watch the backend terminal for:
- Red error messages
- 500 status codes
- Database connection issues

### Common Issues

**"ngrok warning page"**
- First-time visitors see an ngrok interstitial
- Click "Visit Site" to continue
- This is normal for free ngrok

**"Session expired"**
- Natalie needs to log in again
- Credentials: employer@test.com / password123

**"Page not loading"**
- Check backend terminal for errors
- Verify ngrok is still running
- Try restarting ngrok

**"Cannot connect to database"**
- Restart the backend server
- Check PostgreSQL is running

---

## After Testing

1. Press `Ctrl+C` in ngrok terminal to stop tunnel
2. Stop backend server with `Ctrl+C`
3. Collect Natalie's completed test plan
4. Review bugs found

---

## Checklist

Before sharing URL:

- [ ] Backend server running (port 5000)
- [ ] ngrok tunnel active
- [ ] Tested login locally first
- [ ] Employer account works (employer@test.com)
- [ ] UAT document ready (NATALIE_EMPLOYER_UAT.md)
- [ ] Phone ready for support calls
