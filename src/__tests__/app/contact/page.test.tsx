import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import ContactPage from "@/app/contact/page";

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock next/link
jest.mock("next/link", () => {
  const MockLink = ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>;
  MockLink.displayName = "MockLink";
  return MockLink;
});

// Mock useAuth
const mockGetIdToken = jest.fn().mockResolvedValue("mock-token");
const mockUser = {
  getIdToken: mockGetIdToken,
  uid: "test-uid",
  email: "user@test.com",
};
jest.mock("@/hooks/useAuth", () => ({
  useAuth: jest.fn(() => ({ user: null, loading: false })),
}));

// Import after mock setup
import { useAuth } from "@/hooks/useAuth";
const mockUseAuth = useAuth as jest.Mock;

describe("ContactPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    mockUseAuth.mockReturnValue({ user: null, loading: false });
  });

  describe("rendering", () => {
    it("should render the contact form", () => {
      render(<ContactPage />);

      expect(screen.getByText(/tell us what's working/i)).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText(/you@company.com/i)
      ).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText(/share as much context/i)
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /send feedback/i })
      ).toBeInTheDocument();
    });

    it("should render support email", () => {
      render(<ContactPage />);

      expect(
        screen.getAllByText(/support@switchcv.com/i).length
      ).toBeGreaterThan(0);
    });

    it("should render category select with options", () => {
      render(<ContactPage />);

      expect(screen.getByText("Product Bug")).toBeInTheDocument();
    });

    it("should render urgency buttons", () => {
      render(<ContactPage />);

      expect(screen.getByRole("button", { name: /low/i })).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /normal/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /urgent/i })
      ).toBeInTheDocument();
    });

    it("should render contact permission checkbox", () => {
      render(<ContactPage />);

      expect(
        screen.getByText(/okay to reach out with clarifying questions/i)
      ).toBeInTheDocument();
    });
  });

  describe("form interaction", () => {
    it("should update name field", () => {
      render(<ContactPage />);

      const nameInput = screen.getByPlaceholderText(/casey/i);
      fireEvent.change(nameInput, { target: { value: "John Doe" } });

      expect(nameInput).toHaveValue("John Doe");
    });

    it("should update email field", () => {
      render(<ContactPage />);

      const emailInput = screen.getByPlaceholderText(/you@company.com/i);
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });

      expect(emailInput).toHaveValue("test@example.com");
    });

    it("should update message field", () => {
      render(<ContactPage />);

      const messageInput = screen.getByPlaceholderText(
        /share as much context/i
      );
      fireEvent.change(messageInput, {
        target: { value: "This is my feedback message" },
      });

      expect(messageInput).toHaveValue("This is my feedback message");
    });

    it("should change urgency when button is clicked", () => {
      render(<ContactPage />);

      const urgentButton = screen.getByRole("button", { name: /urgent/i });
      fireEvent.click(urgentButton);

      expect(urgentButton).toHaveClass("bg-cyan-500/90");
    });

    it("should toggle contact permission checkbox", () => {
      render(<ContactPage />);

      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).toBeChecked();

      fireEvent.click(checkbox);
      expect(checkbox).not.toBeChecked();
    });
  });

  describe("form submission", () => {
    it("should submit form and show success message", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          referenceId: "test-ref-123",
          deliveredTo: "support@switchcv.com",
        }),
      });

      render(<ContactPage />);

      const emailInput = screen.getByPlaceholderText(/you@company.com/i);
      const messageInput = screen.getByPlaceholderText(
        /share as much context/i
      );
      const submitButton = screen.getByRole("button", {
        name: /send feedback/i,
      });

      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.change(messageInput, {
        target: {
          value: "This is a test feedback message that is long enough.",
        },
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/thanks for the signal/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/test-ref-123/)).toBeInTheDocument();
    });

    it("should show error message on failure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Email is required" }),
      });

      render(<ContactPage />);

      const emailInput = screen.getByPlaceholderText(/you@company.com/i);
      const messageInput = screen.getByPlaceholderText(
        /share as much context/i
      );
      const submitButton = screen.getByRole("button", {
        name: /send feedback/i,
      });

      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.change(messageInput, {
        target: {
          value: "This is a long enough feedback message for testing.",
        },
      });
      fireEvent.click(submitButton);

      await waitFor(
        () => {
          expect(screen.getByText(/couldn't send that/i)).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    });

    it("should show loading state during submission", async () => {
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({
                    success: true,
                    referenceId: "test-ref",
                    deliveredTo: "support@switchcv.com",
                  }),
                }),
              100
            )
          )
      );

      render(<ContactPage />);

      const emailInput = screen.getByPlaceholderText(/you@company.com/i);
      const messageInput = screen.getByPlaceholderText(
        /share as much context/i
      );
      const submitButton = screen.getByRole("button", {
        name: /send feedback/i,
      });

      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.change(messageInput, {
        target: {
          value: "This is a test feedback message that is long enough.",
        },
      });
      fireEvent.click(submitButton);

      expect(screen.getByText(/sending.../i)).toBeInTheDocument();
    });

    it("should disable inputs during submission", async () => {
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({
                    success: true,
                    referenceId: "test-ref",
                    deliveredTo: "support@switchcv.com",
                  }),
                }),
              100
            )
          )
      );

      render(<ContactPage />);

      const emailInput = screen.getByPlaceholderText(/you@company.com/i);
      const messageInput = screen.getByPlaceholderText(
        /share as much context/i
      );
      const submitButton = screen.getByRole("button", {
        name: /send feedback/i,
      });

      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.change(messageInput, {
        target: {
          value: "This is a test feedback message that is long enough.",
        },
      });
      fireEvent.click(submitButton);

      expect(emailInput).toBeDisabled();
      expect(messageInput).toBeDisabled();
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      render(<ContactPage />);

      const emailInput = screen.getByPlaceholderText(/you@company.com/i);
      const messageInput = screen.getByPlaceholderText(
        /share as much context/i
      );
      const submitButton = screen.getByRole("button", {
        name: /send feedback/i,
      });

      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.change(messageInput, {
        target: {
          value: "This is a test feedback message that is long enough.",
        },
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/couldn't send that/i)).toBeInTheDocument();
      });
    });
  });

  describe("category help text", () => {
    it("should show bug help text by default", () => {
      render(<ContactPage />);

      expect(
        screen.getByText(/report issues that block resume creation/i)
      ).toBeInTheDocument();
    });
  });

  describe("authentication integration", () => {
    it("should not include auth header when user is not logged in", async () => {
      mockUseAuth.mockReturnValue({ user: null, loading: false });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          referenceId: "ref-123",
          deliveredTo: "support@switchcv.com",
        }),
      });

      render(<ContactPage />);

      fireEvent.change(screen.getByPlaceholderText(/you@company.com/i), {
        target: { value: "test@example.com" },
      });
      fireEvent.change(screen.getByPlaceholderText(/share as much context/i), {
        target: {
          value: "This is a test feedback message that is long enough.",
        },
      });
      fireEvent.click(screen.getByRole("button", { name: /send feedback/i }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/contact/feedback",
          expect.objectContaining({
            method: "POST",
            headers: { "Content-Type": "application/json" },
          })
        );
      });
    });

    it("should include auth header when user is logged in", async () => {
      mockUseAuth.mockReturnValue({ user: mockUser, loading: false });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          referenceId: "ref-456",
          deliveredTo: "support@switchcv.com",
        }),
      });

      render(<ContactPage />);

      fireEvent.change(screen.getByPlaceholderText(/you@company.com/i), {
        target: { value: "test@example.com" },
      });
      fireEvent.change(screen.getByPlaceholderText(/share as much context/i), {
        target: {
          value: "This is a test feedback message that is long enough.",
        },
      });
      fireEvent.click(screen.getByRole("button", { name: /send feedback/i }));

      await waitFor(() => {
        expect(mockGetIdToken).toHaveBeenCalled();
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/contact/feedback",
          expect.objectContaining({
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer mock-token",
            },
          })
        );
      });
    });
  });
});
