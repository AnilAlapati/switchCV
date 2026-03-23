export type UsernameStatus =
  | "idle"
  | "checking"
  | "available"
  | "taken"
  | "invalid"
  | "error";

export interface AuthPageState {
  isSignUp: boolean;
  email: string;
  password: string;
  username: string;
  error: string;
  loading: boolean;
  mounted: boolean;
  usernameError: string;
  resending: boolean;
  refreshing: boolean;
  usernameStatus: UsernameStatus;
  usernameSuggestion: string;
  verificationSuccess: boolean;
  verificationProcessing: boolean;
}

export interface AuthPageActions {
  setIsSignUp: (value: boolean) => void;
  setEmail: (value: string) => void;
  setPassword: (value: string) => void;
  setUsername: (value: string) => void;
  setError: (value: string) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  handleGoogleSignIn: () => Promise<void>;
  handleResend: () => Promise<void>;
  handleRefreshVerification: () => Promise<void>;
  handleUseSuggestion: () => void;
  logout: () => Promise<void>;
}

export interface UseAuthPageReturn {
  state: AuthPageState;
  actions: AuthPageActions;
  authContext: {
    needsEmailVerification: boolean;
    needsUsername: boolean;
    verificationEmail: string | null;
  };
  isCheckingUsername: boolean;
}
