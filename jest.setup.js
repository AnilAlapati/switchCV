import '@testing-library/jest-dom'
import { TextEncoder, TextDecoder } from 'util'

// Set up environment variables for testing
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'test-project-id';
process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'test-api-key';
process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = 'test-auth-domain';
process.env.GEMINI_API_KEY = 'test-gemini-key';
process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.GROQ_API_KEY = 'test-groq-key';

// Handle "use client" directive in tests
// The babel plugin handles this, but we add a fallback
global.__dirname = __dirname;

// Polyfill TextEncoder for Node environment
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

// Polyfill fetch and Response for Node environment
if (!globalThis.fetch) {
  globalThis.fetch = jest.fn();
}

// Polyfill Request if not available
if (typeof globalThis.Request === 'undefined') {
  globalThis.Request = class Request {
    constructor(input, init = {}) {
      this._url = typeof input === 'string' ? input : (input && input.url) || '';
      this.method = init.method || 'GET';
      this.headers = new Headers(init.headers || {});
      this._body = init.body || null;
    }

    get url() {
      return this._url;
    }

    async json() {
      try {
        if (typeof this._body === 'string') {
          return JSON.parse(this._body);
        }
        return this._body || {};
      } catch {
        return {};
      }
    }

    async text() {
      return this._body || '';
    }

    async blob() {
      return new Blob([this._body || '']);
    }
  };
}

// Polyfill NextRequest
if (typeof globalThis.NextRequest === 'undefined') {
  globalThis.NextRequest = class NextRequest extends Request {
    constructor(input, init = {}) {
      super(input, init);
      this.nextUrl = new URL(typeof input === 'string' ? input : input.url);
    }
  };
}

// Polyfill Response if not available
if (typeof globalThis.Response === 'undefined') {
  globalThis.Response = class Response {
    constructor(body = '', init = {}) {
      this.body = body;
      this.status = init.status || 200;
      this.statusText = init.statusText || 'OK';
      this.headers = new Headers(init.headers || {});
      this.ok = this.status >= 200 && this.status < 300;
    }

    async json() {
      try {
        return JSON.parse(this.body);
      } catch {
        return {};
      }
    }

    async text() {
      return this.body || '';
    }

    async blob() {
      return new Blob([this.body]);
    }

    clone() {
      return new Response(this.body, {
        status: this.status,
        statusText: this.statusText,
        headers: Object.fromEntries(this.headers.entries()),
      });
    }

    static json(data, init = {}) {
      return new Response(JSON.stringify(data), {
        status: init.status || 200,
        headers: { 'Content-Type': 'application/json', ...init.headers },
      });
    }
  };
}

// Mock firebase-admin before any imports
jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(() => ({})),
  credential: {
    cert: jest.fn(),
  },
  firestore: {
    FieldValue: {
      serverTimestamp: jest.fn(() => ({ _type: 'serverTimestamp' })),
    },
    Timestamp: {
      now: jest.fn(() => new Date()),
    },
  },
}));

jest.mock('firebase-admin/app', () => ({
  initializeApp: jest.fn(() => ({})),
  getApp: jest.fn(() => ({})),
}));

jest.mock('@/lib/firebase-admin', () => ({
  __esModule: true,
  default: {
    firestore: {
      FieldValue: {
        serverTimestamp: jest.fn(() => ({ _type: 'serverTimestamp' })),
      },
    },
  },
  adminDb: {
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn().mockResolvedValue({ 
          exists: true, 
          data: jest.fn(() => ({
            maintenance: { isActive: false, message: '', blocking: false },
            auth: { registrationClosed: false, loginDisabled: false },
            features: { enableAnalytics: false, enableMockData: true },
            rateLimits: {
              api: { windowMs: 60000, maxRequests: 100 },
              search: { perMinute: 50 },
              aiEnhancement: {
                basic: { perHour: 10, perDay: 100 },
                premium: { perHour: 50, perDay: 500 },
                enterprise: { perHour: 200, perDay: 2000 }
              },
              usernameCheck: { maxRequests: 50, windowMs: 60000 },
              supportFeedback: { maxPerHour: 20, windowMs: 3600000 }
            },
            tiers: {
              basic: {
                resumeLimit: 5,
                canEdit: true,
                retentionDays: null,
                deletionGracePeriodDays: null,
                expiryWarningHours: null,
                recruiterContacts: { total: 100 },
                recruiterSearches: 9999
              },
              premium: {
                resumeLimit: 50,
                canEdit: true,
                retentionDays: null,
                deletionGracePeriodDays: null,
                expiryWarningHours: null,
                recruiterContacts: { perMonth: 50 },
                recruiterSearches: 9999
              },
              enterprise: {
                resumeLimit: 9999,
                canEdit: true,
                retentionDays: null,
                deletionGracePeriodDays: null,
                expiryWarningHours: null,
                recruiterContacts: { perMonth: 9999 },
                recruiterSearches: 9999
              }
            },
            search: {
              basicQuota: 9999,
              premiumQuota: 999999,
              similarityThreshold: 0.3,
              maxResults: 50,
              costPerSearch: 0.5
            },
            ai: {
              defaultModel: 'gemini-2.0-flash-lite',
              embeddingModel: 'text-embedding-004',
              embeddingDimension: 768,
              maxRetries: 3,
              timeoutMs: 30000,
              maxTokens: 4096,
              preferredModels: ['gemini-2.0-flash-lite', 'gemini-2.5-flash', 'gpt-4o-mini', 'groq/llama-3.1-8b'],
              enableCostWarnings: true
            },
            validation: {
              username: { minLength: 3, maxLength: 30 },
              fields: { maxLength: 200, maxDescriptionLength: 2000 },
              resume: { maxSkills: 50, maxExperiences: 20, maxEducations: 10, maxProjects: 20 }
            },
            cache: {
              systemConfigTtlMs: 3600000,
              templateCacheTtlMs: 1800000,
              tierCacheTtlMs: 86400000,
              aiCacheTtlMs: 86400000
            }
          }))
        }),
        set: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
        delete: jest.fn().mockResolvedValue({}),
      })),
      where: jest.fn(() => ({
        get: jest.fn().mockResolvedValue({ docs: [] }),
      })),
      add: jest.fn().mockResolvedValue({ id: 'test-id' }),
      get: jest.fn().mockResolvedValue({ docs: [] }),
    })),
    batch: jest.fn(() => ({
      set: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      commit: jest.fn().mockResolvedValue(undefined),
    })),
  },
  adminAuth: {
    verifyIdToken: jest.fn(async () => ({
      uid: 'test-user-id',
      email: 'test@example.com',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    })),
    createUser: jest.fn(),
    updateUser: jest.fn(),
    deleteUser: jest.fn(),
  },
}));

jest.mock('firebase/auth', () => {
  const GoogleAuthProvider = class {
    constructor() {
      this.providerId = 'google.com';
    }
    setCustomParameters() {}
  };
  
  return {
    getAuth: jest.fn(() => ({ currentUser: null })),
    onAuthStateChanged: jest.fn(),
    signInWithEmailAndPassword: jest.fn(),
    signOut: jest.fn(),
    createUserWithEmailAndPassword: jest.fn(),
    GoogleAuthProvider,
    signInWithPopup: jest.fn(),
    sendEmailVerification: jest.fn(),
  };
});

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
  doc: jest.fn(),
  updateDoc: jest.fn(),
  setDoc: jest.fn(),
  onSnapshot: jest.fn(),
  serverTimestamp: jest.fn(() => new Date()),
}));

jest.mock('firebase/storage', () => ({
  getStorage: jest.fn(() => ({})),
  ref: jest.fn(),
  uploadBytes: jest.fn(),
}));

jest.mock('firebase/functions', () => ({
  getFunctions: jest.fn(() => ({})),
  httpsCallable: jest.fn(),
}));

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const React = require('react');
    return React.createElement('img', props);
  },
}));

// Mock next/navigation to handle useRouter and usePathname
jest.mock('next/navigation', () => {
  const actual = jest.requireActual('next/navigation');
  return {
    ...actual,
    useRouter: jest.fn(() => ({
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      pathname: '/',
      query: {},
    })),
    usePathname: jest.fn(() => '/'),
    useSearchParams: jest.fn(() => new URLSearchParams()),
  };
});

// Mock next/link
jest.mock('next/link', () => {
  return ({ children }) => {
    return children;
  };
});

// Mock next/dynamic to handle dynamic imports
jest.mock('next/dynamic', () => ({
  __esModule: true,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  default: jest.fn((fn, _options) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const React = require('react');
    return React.lazy(fn);
  }),
}));