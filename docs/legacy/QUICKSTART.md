# SwitchCV - Quick Start Guide

**Use this guide every time you start development** - No troubleshooting needed! ⚡

## Prerequisites Checklist

Before starting, verify you have:

- [ ] Node.js v20 installed (`node --version`)
- [ ] Firebase CLI installed (`firebase --version`)
- [ ] `.env.local` file exists in root directory

## Starting the App - Every Time

### Option 1: Frontend Only (UI Testing)

**Use this when:** Testing UI, layouts, navigation, styling

```bash
# In project root
npm run dev
```

✅ **Frontend runs at:** http://localhost:3000  
⏱️ **Wait:** 10-30 seconds for initial compilation  
🎯 **Check:** Browser shows landing page with gradient background

---

### Option 2: Full Stack (Frontend + AI Features)

**Use this when:** Testing AI resume generation, full functionality

**Terminal 1:** Start Frontend

```bash
npm run dev
```

**Terminal 2:** Start Functions

```bash
firebase emulators:start --only functions
```

✅ **Frontend:** http://localhost:3000  
✅ **Functions:** http://127.0.0.1:5001  
✅ **Emulator UI:** http://127.0.0.1:4000

---

## Troubleshooting Quick Fixes

### Page Not Loading?

```bash
# Wait 30 seconds - it's still compiling
# Or check compilation status:
curl -s http://localhost:3000 | head -20
```

### Port Already in Use?

```bash
# Kill processes on port 3000
lsof -ti:3000 | xargs kill -9

# Kill processes on port 5001
lsof -ti:5001 | xargs kill -9

# Then restart
npm run dev
```

### Functions Not Working?

```bash
# Rebuild functions
cd functions
npm run build
cd ..

# Then restart emulator
firebase emulators:start --only functions
```

### Cache Issues?

```bash
# Clear Next.js cache
rm -rf .next

# Restart
npm run dev
```

### Complete Reset?

```bash
# Nuclear option - fixes 90% of issues
rm -rf .next functions/lib node_modules functions/node_modules
npm install
cd functions && npm install && npm run build && cd ..
npm run dev
```

---

## Verification Checklist

After starting, verify:

- [ ] http://localhost:3000 shows the landing page
- [ ] No red errors in browser console (warnings are OK)
- [ ] Can see "SwitchCV" title with gradient text
- [ ] "Get Started" and "Sign In" buttons visible
- [ ] Terminal shows "✓ Ready in XXXms"

---

## Common Terminal Messages (Normal)

✅ **Expected - Ignore these:**

```
SyntaxError: Unexpected end of JSON input
  at JSON.parse (<anonymous>)
```

This is caught and handled - not an error!

```
⚠ functions: package.json indicates an outdated version of firebase-functions
```

Functions still work - can upgrade later

```
⚠ functions: The following emulators are not running, calls to these services will affect production
```

Expected when running only functions emulator

---

## Development Workflow

### Daily Startup

```bash
# Terminal 1
npm run dev

# Terminal 2 (if testing AI features)
firebase emulators:start --only functions
```

### Before Committing

```bash
npm test
npm run build
cd functions && npm run build
```

### Shutting Down

```bash
# Press Ctrl+C in each terminal
# Or kill all processes:
ps aux | grep -E "next dev|firebase" | grep -v grep | awk '{print $2}' | xargs kill -9
```

---

## Environment Variables

Your `.env.local` should have:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
HUGGINGFACE_TOKEN=...
```

**Missing .env.local?** Copy from `.env.example` or see [SETUP.md](./documents/SETUP.md)

---

## Performance Tips

- **First load:** Takes 30-60 seconds - be patient!
- **Hot reload:** Saves automatically reload in ~2 seconds
- **Functions changes:** Auto-reload via emulator
- **Environment changes:** Restart both servers

---

## Need More Help?

- **Detailed Setup:** [documents/SETUP.md](./documents/SETUP.md)
- **Troubleshooting:** [documents/TROUBLESHOOTING.md](./documents/TROUBLESHOOTING.md)
- **Recent Fixes:** [documents/FIX_SUMMARY.md](./documents/FIX_SUMMARY.md)

---

## TL;DR - Just Run This

```bash
# Start everything (in separate terminals)
npm run dev
firebase emulators:start --only functions
```

Wait 30 seconds, then open http://localhost:3000 🚀

---

**Last Updated:** November 11, 2025  
**Next time:** Just follow the commands above - should work every time!
