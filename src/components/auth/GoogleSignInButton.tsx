/**
 * Google Sign-In Button Component
 * Extracted to keep auth/page.tsx under line limit
 */

interface GoogleSignInButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export function GoogleSignInButton({
  onClick,
  disabled,
}: GoogleSignInButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center justify-center gap-3 py-3 px-6 border border-white/20 rounded-xl text-white/90 hover:bg-white/10 transition disabled:opacity-50"
    >
      <svg
        className="w-5 h-5"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M21.6 12.2273C21.6 11.5182 21.5364 10.8364 21.4182 10.1818H12V14.05H17.4182C17.1864 15.3 16.5 16.3545 15.4455 17.0409V19.5455H18.3818C20.3273 17.7636 21.6 15.2727 21.6 12.2273Z"
          fill="#4285F4"
        />
        <path
          d="M12 22C14.7 22 16.9636 21.1045 18.3818 19.5455L15.4455 17.0409C14.6818 17.5509 13.7182 17.8636 12 17.8636C9.38182 17.8636 7.17273 16.0727 6.38182 13.7273H3.32727V16.3091C4.73636 19.5909 8.09091 22 12 22Z"
          fill="#34A853"
        />
        <path
          d="M6.38182 13.7273C6.18182 13.2182 6.07273 12.6682 6.07273 12.0909C6.07273 11.5136 6.18182 10.9636 6.38182 10.4545V7.87273H3.32727C2.74545 9.09091 2.4 10.5 2.4 12.0909C2.4 13.6818 2.74545 15.0909 3.32727 16.3091L6.38182 13.7273Z"
          fill="#FBBC05"
        />
        <path
          d="M12 6.31818C13.8545 6.31818 15.2727 7.15455 16.0636 7.87273L18.4455 5.49091C16.9545 4.10909 14.7 3 12 3C8.09091 3 4.73636 5.40909 3.32727 8.69091L6.38182 11.2727C7.17273 8.92727 9.38182 6.31818 12 6.31818Z"
          fill="#EA4335"
        />
      </svg>
      Continue with Google
    </button>
  );
}
