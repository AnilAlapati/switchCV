// src/__tests__/components/RequestAccessDialog.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RequestAccessDialog } from "@/components/RequestAccessDialog";

// Mock useAuth hook
jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: {
      uid: "test-user-id",
      email: "test@example.com",
      getIdToken: jest.fn().mockResolvedValue("mock-token"),
    },
  }),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch as any;

describe("RequestAccessDialog", () => {
  const defaultProps = {
    profileName: "Jane Doe",
    profileId: "profile123",
    isOpen: true,
    onClose: jest.fn(),
    onSuccess: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("does not render when isOpen is false", () => {
    render(<RequestAccessDialog {...defaultProps} isOpen={false} />);

    // Check that the dialog content is not visible
    expect(screen.queryByText("Request View Access")).not.toBeInTheDocument();
  });

  test("renders dialog with profile name when isOpen is true", () => {
    render(<RequestAccessDialog {...defaultProps} />);

    expect(screen.getAllByText(/Request View Access/i)[0]).toBeInTheDocument();
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
  });

  test("allows user to type message in textarea", async () => {
    render(<RequestAccessDialog {...defaultProps} />);

    const textarea = screen.getByPlaceholderText(
      "Hi! I'd love to learn more about your experience with..."
    ) as HTMLTextAreaElement;

    await userEvent.type(textarea, "I'd like to collaborate on a project");

    expect(textarea.value).toBe("I'd like to collaborate on a project");
  });

  test("displays character count for message", async () => {
    render(<RequestAccessDialog {...defaultProps} />);

    const textarea = screen.getByPlaceholderText(
      "Hi! I'd love to learn more about your experience with..."
    ) as HTMLTextAreaElement;

    await userEvent.type(textarea, "Test message");

    await waitFor(() => {
      expect(screen.getByText("12/500 characters")).toBeInTheDocument();
    });
  });

  test("enforces maximum message length of 500 characters", async () => {
    render(<RequestAccessDialog {...defaultProps} />);

    const textarea = screen.getByPlaceholderText(
      "Hi! I'd love to learn more about your experience with..."
    ) as HTMLTextAreaElement;

    const longMessage = "a".repeat(600);
    await userEvent.click(textarea);
    await userEvent.paste(longMessage);

    expect(textarea.value.length).toBeLessThanOrEqual(500);
  });

  test("closes dialog on Cancel button click", async () => {
    const onClose = jest.fn();
    render(<RequestAccessDialog {...defaultProps} onClose={onClose} />);

    const cancelButton = screen.getByText("Cancel");
    await userEvent.click(cancelButton);

    expect(onClose).toHaveBeenCalled();
  });

  test("closes dialog on close button click", async () => {
    const onClose = jest.fn();
    render(<RequestAccessDialog {...defaultProps} onClose={onClose} />);

    const closeButton = screen.getByLabelText("Close");
    await userEvent.click(closeButton);

    expect(onClose).toHaveBeenCalled();
  });

  test("submits form with correct data", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);

    const onSuccess = jest.fn();
    render(<RequestAccessDialog {...defaultProps} onSuccess={onSuccess} />);

    const textarea = screen.getByPlaceholderText(
      "Hi! I'd love to learn more about your experience with..."
    ) as HTMLTextAreaElement;

    await userEvent.type(textarea, "Interested in collaboration");

    const submitButton = screen.getByRole("button", {
      name: "Request View Access",
    });
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/profiles/request-access",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"resumeId":"profile123"'),
        })
      );
    });
  });

  test("disables form during submission", async () => {
    mockFetch.mockImplementationOnce(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: async () => ({ success: true }),
              } as Response),
            500
          )
        )
    );

    render(<RequestAccessDialog {...defaultProps} />);

    const submitButton = screen.getByRole("button", {
      name: "Request View Access",
    }) as HTMLButtonElement;
    await userEvent.click(submitButton);

    const sendingButton = await screen.findByText("Sending...");
    expect(sendingButton.closest("button")).toBeDisabled();
  });

  test("shows error message on API failure", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "User already requested" }),
    } as Response);

    render(<RequestAccessDialog {...defaultProps} />);

    const submitButton = screen.getByRole("button", {
      name: "Request View Access",
    });
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("User already requested")).toBeInTheDocument();
    });
  });

  test("shows error message from API response message field", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: "Custom error message" }),
    } as Response);

    render(<RequestAccessDialog {...defaultProps} />);

    const submitButton = screen.getByRole("button", {
      name: "Request View Access",
    });
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Custom error message")).toBeInTheDocument();
    });
  });

  test("shows default error message when API response has no message", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    } as Response);

    render(<RequestAccessDialog {...defaultProps} />);

    const submitButton = screen.getByRole("button", {
      name: "Request View Access",
    });
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Failed to send request")).toBeInTheDocument();
    });
  });

  test("calls onSuccess callback on successful submission", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);

    const onSuccess = jest.fn();
    render(<RequestAccessDialog {...defaultProps} onSuccess={onSuccess} />);

    const submitButton = screen.getByRole("button", {
      name: "Request View Access",
    });
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  test("closes dialog on successful submission", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);

    const onClose = jest.fn();
    render(<RequestAccessDialog {...defaultProps} onClose={onClose} />);

    const submitButton = screen.getByRole("button", {
      name: "Request View Access",
    });
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  test("clears form after successful submission", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);

    render(<RequestAccessDialog {...defaultProps} />);

    const textarea = screen.getByPlaceholderText(
      "Hi! I'd love to learn more about your experience with..."
    ) as HTMLTextAreaElement;

    await userEvent.type(textarea, "Test message");

    const submitButton = screen.getByRole("button", {
      name: "Request View Access",
    });
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(textarea.value).toBe("");
    }, { timeout: 10000 });
  }, 15000);

  test("includes message in request when provided", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);

    render(<RequestAccessDialog {...defaultProps} />);

    const textarea = screen.getByPlaceholderText(
      "Hi! I'd love to learn more about your experience with..."
    ) as HTMLTextAreaElement;

    await userEvent.type(textarea, "Custom message");

    const submitButton = screen.getByRole("button", {
      name: "Request View Access",
    });
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/profiles/request-access",
        expect.objectContaining({
          body: expect.stringContaining("Custom message"),
        })
      );
    });
  });

  test("omits message from request when empty", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);

    render(<RequestAccessDialog {...defaultProps} />);

    const submitButton = screen.getByRole("button", {
      name: "Request View Access",
    });
    await userEvent.click(submitButton);

    await waitFor(() => {
      const callBody = JSON.parse(
        (mockFetch.mock.calls[0]?.[1] as any)?.body || "{}"
      );
      expect(callBody.message).toBeUndefined();
    });
  });

  test("sends duration metadata with request", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);

    render(<RequestAccessDialog {...defaultProps} />);

    const submitButton = screen.getByRole("button", {
      name: "Request View Access",
    });
    await userEvent.click(submitButton);

    await waitFor(() => {
      const callBody = JSON.parse(
        (mockFetch.mock.calls[0]?.[1] as any)?.body || "{}"
      );
      expect(callBody.duration).toMatchObject({ preset: "1_week" });
      expect(callBody.timezone).toBeTruthy();
    });
  });

  test("validates custom duration input", async () => {
    render(<RequestAccessDialog {...defaultProps} />);

    const customButton = screen.getByText("Custom Days");
    await userEvent.click(customButton);

    const input = screen.getByLabelText(/Enter number of days/);
    await userEvent.clear(input);
    await userEvent.type(input, "0");

    const submitButton = screen.getByRole("button", {
      name: "Request View Access",
    });
    await userEvent.click(submitButton);

    expect(
      await screen.findByText(/Custom duration must be at least 1 day/)
    ).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  test("shows error when profileId is empty", async () => {
    render(<RequestAccessDialog {...defaultProps} profileId="" />);

    const submitButton = screen.getByRole("button", {
      name: "Request View Access",
    });
    await userEvent.click(submitButton);

    expect(screen.getByText("Invalid profile ID")).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  test("handles success when onSuccess is not provided", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);

    const propsWithoutOnSuccess = { ...defaultProps, onSuccess: undefined };
    render(<RequestAccessDialog {...propsWithoutOnSuccess} />);

    const submitButton = screen.getByRole("button", {
      name: "Request View Access",
    });
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  test("handles non-Error objects thrown during submission", async () => {
    mockFetch.mockRejectedValueOnce("Network failure string");

    render(<RequestAccessDialog {...defaultProps} />);

    const submitButton = screen.getByRole("button", {
      name: "Request View Access",
    });
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Network failure string/i)).toBeInTheDocument();
    });
  });
});
