import React from "react";
import { render, screen } from "@testing-library/react";
import { useRouter } from "next/navigation";
import ChooseUsernamePage from "@/app/auth/choose-username/page";
import { useAuth } from "@/hooks/useAuth";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

jest.mock("@/hooks/useAuth", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/hooks/useDebounce", () => ({
  useDebouncedValue: jest.fn((value) => ({
    debouncedValue: value,
    isPending: false,
  })),
}));

jest.mock("@/config/constants", () => ({
  USERNAME_CONFIG: {
    CHECK_DEBOUNCE_MS: 500,
    MIN_LENGTH: 3,
    MAX_LENGTH: 20,
    PATTERN: /^[a-z0-9_-]+$/,
  },
}));

jest.mock("@/components/auth/UsernameInput", () => ({
  UsernameInput: function MockUsernameInput({
    value,
    onChange,
    status,
    message,
    suggestion,
  }: {
    value: string;
    onChange: (value: string) => void;
    status: string;
    message: string;
    suggestion: string;
    onSubmit?: (username: string) => void;
    isPending?: boolean;
    disabled?: boolean;
    onUseSuggestion?: () => void;
  }) {
    return (
      <div>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Username"
          data-testid="username-input"
        />
        <div data-testid="status">{status}</div>
        <div data-testid="message">{message}</div>
        {suggestion && <div data-testid="suggestion">{suggestion}</div>}
      </div>
    );
  },
}));

describe("ChooseUsernamePage", () => {
  const mockPush = jest.fn();
  const mockReplace = jest.fn();
  const mockSetUsername = jest.fn();
  const mockCheckNeedsUsername = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      replace: mockReplace,
    });
    (useAuth as jest.Mock).mockReturnValue({
      user: { uid: "123", email: "test@example.com" },
      loading: false,
      setUsername: mockSetUsername,
      checkNeedsUsername: mockCheckNeedsUsername,
    });
  });

  it("renders correctly", () => {
    mockCheckNeedsUsername.mockResolvedValue(true);
    render(<ChooseUsernamePage />);
    expect(screen.getByText("Choose your username")).toBeInTheDocument();
    expect(screen.getByTestId("username-input")).toBeInTheDocument();
  });

  it("redirects if not authenticated", () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      loading: false,
    });
    render(<ChooseUsernamePage />);
    expect(mockReplace).toHaveBeenCalledWith("/auth");
  });
});
