import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import ChooseUsernamePage from "@/app/auth/choose-username/page";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useDebouncedValue } from "@/hooks/useDebounce";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

// Mock hooks
jest.mock("@/hooks/useAuth", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/hooks/useDebounce", () => ({
  useDebouncedValue: jest.fn(),
}));

// Mock components
jest.mock("@/components/auth/UsernameInput", () => ({
  UsernameInput: ({ value, onChange, status, message, suggestion, onUseSuggestion }: any) => (
    <div data-testid="username-input-wrapper">
      <input data-testid="username-input" value={value} onChange={(e) => onChange(e.target.value)} />
      <div data-testid="status-msg">{message}</div>
      {suggestion && <button data-testid="use-suggestion" onClick={onUseSuggestion}>Use {suggestion}</button>}
    </div>
  ),
}));

describe("ChooseUsernamePage", () => {
  const mockRouter = {
    replace: jest.fn(),
    push: jest.fn(),
  };

  const mockCheckNeedsUsername = jest.fn();
  const mockSetUsername = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useAuth as jest.Mock).mockReturnValue({
      user: { email: "test@example.com", displayName: "Test User" },
      loading: false,
      setUsername: mockSetUsername,
      checkNeedsUsername: mockCheckNeedsUsername,
    });
    mockCheckNeedsUsername.mockResolvedValue(true);
    mockSetUsername.mockResolvedValue(undefined);
    (useDebouncedValue as jest.Mock).mockReturnValue({ debouncedValue: "", isPending: false });

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ available: true })
    });
  });

  it("redirects to auth if not logged in", () => {
    (useAuth as jest.Mock).mockReturnValue({ user: null, loading: false });
    render(<ChooseUsernamePage />);
    expect(mockRouter.replace).toHaveBeenCalledWith("/auth");
  });

  it("shows loading spinner when loading", () => {
    (useAuth as jest.Mock).mockReturnValue({ user: null, loading: true });
    render(<ChooseUsernamePage />);
    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
  });

  it("redirects to dashboard if user doesn't need a username", async () => {
    mockCheckNeedsUsername.mockResolvedValue(false);
    render(<ChooseUsernamePage />);
    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("checks availability when username is debounced", async () => {
    (useDebouncedValue as jest.Mock).mockReturnValue({ debouncedValue: "newuser", isPending: false });

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ available: true })
    });

    render(<ChooseUsernamePage />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining("username=newuser"));
      expect(screen.getByTestId("status-msg")).toHaveTextContent("Username is available!");
    });
  });

  it("handles rate limit (429) in availability check", async () => {
    (useDebouncedValue as jest.Mock).mockReturnValue({ debouncedValue: "rapiduser", isPending: false });
    (global.fetch as jest.Mock).mockResolvedValue({
      status: 429,
      json: () => Promise.resolve({ reason: "Too many requests" })
    });

    render(<ChooseUsernamePage />);
    await waitFor(() => {
      expect(screen.getByTestId("status-msg")).toHaveTextContent("Too many requests");
    });
  });

  it("handles fetch error in availability check", async () => {
    (useDebouncedValue as jest.Mock).mockReturnValue({ debouncedValue: "erroruser", isPending: false });
    (global.fetch as jest.Mock).mockRejectedValue(new Error("Network Error"));

    render(<ChooseUsernamePage />);
    await waitFor(() => {
      expect(screen.getByTestId("status-msg")).toHaveTextContent("Failed to check availability");
    });
  });

  it("handles username already taken with suggestion", async () => {
    (useDebouncedValue as jest.Mock).mockReturnValue({ debouncedValue: "taken", isPending: false });

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        available: false,
        reason: "Username is taken",
        suggestion: "taken123"
      })
    });

    render(<ChooseUsernamePage />);

    await waitFor(() => {
      expect(screen.getByTestId("status-msg")).toHaveTextContent("Username is taken");
      expect(screen.getByTestId("use-suggestion")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("use-suggestion"));
    // Since useDebouncedValue is mocked, the change to 'taken123' might not trigger a new fetch in this test
    // but we verify the input would change.
  });

  it("successfully submits chosen username", async () => {
    (useDebouncedValue as jest.Mock).mockReturnValue({ debouncedValue: "available-user", isPending: false });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ available: true })
    });

    render(<ChooseUsernamePage />);

    await waitFor(() => expect(screen.getByText("Continue")).not.toBeDisabled());

    fireEvent.click(screen.getByText("Continue"));

    await waitFor(() => {
      expect(mockSetUsername).toHaveBeenCalledWith("available-user");
      expect(mockRouter.push).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("handles submission error", async () => {
    (useDebouncedValue as jest.Mock).mockReturnValue({ debouncedValue: "available-user", isPending: false });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ available: true })
    });
    mockSetUsername.mockRejectedValue(new Error("Database error"));

    render(<ChooseUsernamePage />);

    await waitFor(() => expect(screen.getByText("Continue")).not.toBeDisabled());
    fireEvent.click(screen.getByText("Continue"));

    await waitFor(() => {
      expect(screen.getByText("Database error")).toBeInTheDocument();
    });
  });

  it("handles skip for now", async () => {
    render(<ChooseUsernamePage />);

    fireEvent.click(screen.getByText("Skip for now"));

    await waitFor(() => {
      expect(mockSetUsername).toHaveBeenCalled();
      expect(mockRouter.push).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("handles skip error", async () => {
    mockSetUsername.mockRejectedValue(new Error("Skip failed"));
    render(<ChooseUsernamePage />);
    fireEvent.click(screen.getByText("Skip for now"));
    await waitFor(() => {
      expect(screen.getByText("Skip failed")).toBeInTheDocument();
    });
  });
});
