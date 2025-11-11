# SwitchCV - Privacy-First Living Resume Platform

A modern resume platform where users create structured, AI-polished resumes with granular privacy controls and shareable unique URLs.

## Features

- **Living Resume**: Structured, versioned resume data
- **Privacy Controls**: Per-field PII masking with recruiter request/approval flow
- **AI Polish**: LLM-powered resume text generation
- **Shareable URLs**: Unique slugs for easy sharing
- **Recruiter Portal**: Request access to masked contact information

## Tech Stack

- **Frontend**: Next.js 16, TypeScript, Tailwind CSS
- **Backend**: Firebase (Auth, Firestore, Cloud Functions, Storage)
- **AI**: Hugging Face/Replicate API (Mistral 7B)
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Firebase account

### 1. Clone and Install

```bash
git clone https://github.com/AnilAlapati/switchCV.git
cd switchCV
npm install
```

### 2. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project called "switchcv"
3. Enable Authentication with Email/Password provider
4. Create a Firestore database
5. Enable Cloud Functions
6. Enable Storage

### 3. Environment Configuration

Copy the Firebase config from your project settings and update `.env.local`:

```bash
# Get these values from Firebase Console > Project Settings > General > Your apps
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Project Structure

```
src/
├── app/                 # Next.js App Router pages
│   ├── auth/           # Authentication pages
│   ├── dashboard/      # User dashboard
│   ├── onboarding/     # Resume creation flow
│   └── profile/        # Profile editor
├── components/         # Reusable UI components
├── hooks/             # Custom React hooks
├── lib/               # Utility libraries (Firebase config)
└── types/             # TypeScript type definitions
```

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Key Components

- **Authentication**: Firebase Auth with custom hooks
- **Data Layer**: Firestore with TypeScript types
- **UI**: Tailwind CSS with responsive design
- **State Management**: React Context for auth state

## Deployment

### Vercel (Frontend)

1. Connect your GitHub repo to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push to main

### Firebase (Backend)

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login and initialize
firebase login
firebase init

# Deploy functions
firebase deploy --only functions
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

MIT License - see LICENSE file for details
