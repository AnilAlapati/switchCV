# SwitchCV Development Setup Guide

**Last Updated:** November 11, 2025

Complete guide to setting up the SwitchCV development environment from scratch.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Running the Application](#running-the-application)
4. [Testing](#testing)
5. [Deployment](#deployment)

---

## Prerequisites

### Required Software

1. **Node.js v20.x**

   ```bash
   # Check version
   node --version  # Should be v20.x.x

   # Install via nvm (recommended)
   nvm install 20
   nvm use 20
   ```

2. **npm** (comes with Node.js)

   ```bash
   npm --version  # Should be 10.x or higher
   ```

3. **Firebase CLI**

   ```bash
   npm install -g firebase-tools
   firebase --version
   ```

4. **Git**
   ```bash
   git --version
   ```

### Required Accounts

1. **Firebase Account**

   - Sign up at: https://console.firebase.google.com
   - Create a new project or use existing project

2. **Hugging Face Account** (for AI features)
   - Sign up at: https://huggingface.co
   - Generate API token at: https://huggingface.co/settings/tokens

---

## Initial Setup

### 1. Clone Repository

```bash
git clone https://github.com/AnilAlapati/switchCV.git
cd switchCV
```

### 2. Install Dependencies

```bash
# Install root dependencies (Next.js app)
npm install

# Install Functions dependencies
cd functions
npm install
cd ..
```

### 3. Configure Environment Variables

Create `.env.local` in the root directory:

```bash
# Copy the template
cp .env.example .env.local
```

Edit `.env.local` with your credentials:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# AI Configuration
HUGGINGFACE_TOKEN=your_huggingface_token_here
```

**How to get Firebase credentials:**

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to Project Settings (gear icon)
4. Scroll to "Your apps" section
5. Click on the Web app or create new one
6. Copy the config values

### 4. Initialize Firebase

```bash
# Login to Firebase
firebase login

# Select your project
firebase use your-project-id

# Or initialize new project
firebase init
# Select: Functions, Hosting, Firestore
# Choose existing project or create new one
```

### 5. Configure Firestore Security Rules

```bash
# Deploy security rules
firebase deploy --only firestore:rules
```

### 6. Build Firebase Functions

```bash
cd functions
npm run build
cd ..
```

---

## Running the Application

### Development Mode

You need **TWO terminal windows** running simultaneously:

#### Terminal 1: Next.js Frontend + Backend

```bash
# In project root
npm run dev
```

This starts:

- Next.js dev server at **http://localhost:3000**
- Hot module replacement
- Server-side rendering

**Expected output:**

```
▲ Next.js 16.0.1 (Turbopack)
- Local:        http://localhost:3000
- Network:      http://192.168.1.x:3000

✓ Starting...
✓ Ready in 698ms
```

#### Terminal 2: Firebase Functions Emulator

```bash
# In project root
firebase emulators:start --only functions
```

This starts:

- Functions emulator at **http://127.0.0.1:5001**
- Emulator UI at **http://127.0.0.1:4000**

**Expected output:**

```
✔ functions: Loaded functions definitions from source:
   - generateResumeContent
   - generateJobMatchSuggestions

┌───────────┬────────────────┐
│ Emulator  │ Host:Port      │
├───────────┼────────────────┤
│ Functions │ 127.0.0.1:5001 │
└───────────┴────────────────┘
```

### Accessing the Application

1. **Frontend:** http://localhost:3000
2. **Firebase Emulator UI:** http://127.0.0.1:4000
3. **Functions:** http://127.0.0.1:5001/your-project-id/us-central1/functionName

### Verify Setup

Open http://localhost:3000 in your browser. You should see:

- ✅ SwitchCV landing page with gradient background
- ✅ "Get Started" and "Sign In" buttons
- ✅ Three feature cards
- ✅ No console errors (some warnings are okay)

---

## Testing

### Run All Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm test -- --watch
```

### Run Tests with Coverage

```bash
npm test -- --coverage
```

### View Coverage Report

```bash
open coverage/lcov-report/index.html
```

### Test Individual Components

```bash
# Test specific file
npm test -- src/__tests__/app/page.test.tsx
```

---

## Project Structure

```
switchCV/
├── src/
│   ├── app/              # Next.js app router pages
│   │   ├── auth/         # Authentication pages
│   │   ├── dashboard/    # User dashboard
│   │   ├── create-resume/# Resume creation flow
│   │   ├── resume/       # Public resume views
│   │   └── layout.tsx    # Root layout
│   ├── hooks/            # React hooks
│   │   ├── useAuth.tsx   # Authentication hook
│   │   ├── useResume.tsx # Resume management hook
│   │   └── useAIResume.tsx # AI integration hook
│   ├── lib/              # Utilities and configs
│   │   ├── firebase.ts   # Firebase initialization
│   │   └── sessionStorage.ts # Session management
│   ├── types/            # TypeScript types
│   └── config/           # Configuration files
│
├── functions/            # Firebase Cloud Functions
│   ├── src/
│   │   └── index.ts      # Function definitions
│   ├── lib/              # Compiled JavaScript (generated)
│   └── package.json      # Functions dependencies
│
├── public/               # Static assets
├── documents/            # Documentation
│   ├── SETUP.md          # This file
│   ├── TROUBLESHOOTING.md # Troubleshooting guide
│   ├── DEVELOPMENT.md    # Development guidelines
│   └── AGENT.md          # AI agent documentation
│
├── .env.local            # Environment variables (create this)
├── firebase.json         # Firebase configuration
├── firestore.rules       # Firestore security rules
└── package.json          # Root dependencies
```

---

## Development Workflow

### 1. Starting Development

```bash
# Terminal 1: Start frontend
npm run dev

# Terminal 2: Start functions
firebase emulators:start --only functions
```

### 2. Making Changes

- **Frontend changes:** Auto-reload via hot module replacement
- **Function changes:** Auto-reload via Firebase emulator
- **Environment variable changes:** Restart both servers

### 3. Before Committing

```bash
# Run tests
npm test

# Check for TypeScript errors
npm run build

# Build functions
cd functions && npm run build
```

### 4. Git Workflow

```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes and commit
git add .
git commit -m "feat: your feature description"

# Push to remote
git push origin feature/your-feature-name

# Create Pull Request on GitHub
```

---

## Deployment

### Deploy to Firebase

#### 1. Build Production Assets

```bash
# Build Next.js app
npm run build
```

#### 2. Deploy Functions

```bash
# Deploy functions only
firebase deploy --only functions
```

#### 3. Deploy Hosting

```bash
# Deploy hosting only
firebase deploy --only hosting
```

#### 4. Deploy Everything

```bash
# Build first
npm run build

# Deploy all
firebase deploy
```

### Verify Deployment

After deployment, Firebase will show:

```
✔  Deploy complete!

Project Console: https://console.firebase.google.com/project/your-project-id/overview
Hosting URL: https://your-project-id.web.app
```

Visit the Hosting URL to verify your deployment.

---

## Common Commands

### Development

```bash
npm run dev              # Start Next.js dev server
npm run build            # Build for production
npm start                # Start production server
npm test                 # Run tests
npm test -- --watch      # Run tests in watch mode
```

### Firebase

```bash
firebase login                              # Login to Firebase
firebase use PROJECT_ID                     # Select project
firebase emulators:start --only functions   # Start functions emulator
firebase deploy --only functions            # Deploy functions
firebase deploy --only hosting              # Deploy hosting
firebase functions:log                      # View function logs
```

### Functions

```bash
cd functions
npm run build            # Build TypeScript
npm run serve            # Build and start emulator
npm run deploy           # Deploy functions
npm run logs             # View logs
```

---

## Troubleshooting

If you encounter issues, see [TROUBLESHOOTING.md](./TROUBLESHOOTING.md).

Common quick fixes:

```bash
# Clear and reinstall
rm -rf node_modules functions/node_modules .next functions/lib
npm install
cd functions && npm install && npm run build
cd ..

# Restart servers
# Kill all processes
ps aux | grep -E "next dev|firebase" | grep -v grep | awk '{print $2}' | xargs kill -9

# Restart
npm run dev
firebase emulators:start --only functions
```

---

## Next Steps

After setup is complete:

1. Read [DEVELOPMENT.md](./DEVELOPMENT.md) for coding guidelines
2. Review [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution process
3. Check [AGENT.md](./AGENT.md) for AI agent capabilities
4. Start building features!

---

## Getting Help

- **Documentation:** Check `documents/` folder
- **Issues:** https://github.com/AnilAlapati/switchCV/issues
- **Discussions:** https://github.com/AnilAlapati/switchCV/discussions

---

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Hugging Face Inference API](https://huggingface.co/docs/api-inference)
- [React Documentation](https://react.dev)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
