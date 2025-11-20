# SwitchCV - Privacy-First Living Resume Platform

A modern resume platform where users create structured, AI-polished resumes with granular privacy controls and shareable unique URLs.

## ✨ Features

- **Living Resume**: Structured, versioned resume data
- **Privacy Controls**: Per-field PII masking with recruiter request/approval flow
- **AI Polish**: LLM-powered resume text generation using multiple AI models
- **Shareable URLs**: Unique slugs for easy sharing
- **Recruiter Portal**: Request access to masked contact information
- **Modern UI**: Futuristic design with glassmorphism effects

## 🛠️ Tech Stack

- **Frontend**: Next.js 16, TypeScript, Tailwind CSS
- **Backend**: Firebase (Auth, Firestore, Cloud Functions, Storage)
- **AI**: Hugging Face Inference API (Mistral 7B, GPT-2, FLAN-T5)
- **Deployment**: Vercel + Firebase

## 🚀 Quick Start

See detailed setup instructions in **[documents/SETUP.md](./documents/SETUP.md)**

```bash
# Clone and install
git clone https://github.com/AnilAlapati/switchCV.git
cd switchCV && npm install
cd functions && npm install && npm run build && cd ..

# Start development (in separate terminals)
npm run dev
firebase emulators:start --only functions
```

## 📚 Documentation

- **[SETUP.md](./documents/SETUP.md)** - Complete setup guide
- **[TROUBLESHOOTING.md](./documents/TROUBLESHOOTING.md)** - Solutions to common issues  
- **[FIX_SUMMARY.md](./documents/FIX_SUMMARY.md)** - Recent fixes (Nov 11, 2025)
- **[DEVELOPMENT.md](./documents/DEVELOPMENT.md)** - Technical details
- **[CONTRIBUTING.md](./documents/CONTRIBUTING.md)** - Contribution guidelines
- **[status.md](./documents/status.md)** - Project status

## 📊 Current Status

**MVP Progress: ~75% Complete**

✅ Authentication, UI, Firebase integration, AI, Testing (81.62% coverage)  
🚧 Public pages, Recruiter workflow  
📋 Production deployment, Advanced features

## 🤝 Contributing

See [CONTRIBUTING.md](./documents/CONTRIBUTING.md) for guidelines.

## 📝 License

MIT License

---

_Built with ❤️ for the future of resume sharing_
