// src/__tests__/components/RequestAccessDialog.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RequestAccessDialog } from "@/components/RequestAccessDialog";

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
    const { container } = render(
      <RequestAccessDialog {...defaultProps} isOpen={false} />
    );

    // Check that the dialog content is not visible
    expect(screen.queryByText("Request Full Access")).not.toBeInTheDocument();
  });

  test("renders dialog with profile name when isOpen is true", () => {
    render(<RequestAccessDialog {...defaultProps} />);

    expect(screen.getByText("Request Full Access")).toBeInTheDocument();
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
  });

  test("displays duration selector with all options", () => {
    render(<RequestAccessDialog {...defaultProps} />);

    const select = screen.getByDisplayValue("1 Week") as HTMLSelectElement;

    expect(select).toBeInTheDocument();
    expect(screen.getByText("1 Hour")).toBeInTheDocument();
    expect(screen.getByText("1 Day")).toBeInTheDocument();
    expect(screen.getByText("1 Week")).toBeInTheDocument();
    expect(screen.getByText("Forever")).toBeInTheDocument();
  });

  test("updates duration on select change", async () => {
    render(<RequestAccessDialog {...defaultProps} />);

    const select = screen.getByDisplayValue("1 Week") as HTMLSelectElement;

    await userEvent.selectOptions(select, "1hour");

    expect(select.value).toBe("1hour");
  });

  test("allows user to type message in textarea", async () => {
    render(<RequestAccessDialog {...defaultProps} />);

    const textarea = screen.getByPlaceholderText(
      "Tell them why you'd like to view their full resume..."
    ) as HTMLTextAreaElement;

    await userEvent.type(textarea, "I'd like to collaborate on a project");

    expect(textarea.value).toBe("I'd like to collaborate on a project");
  });

  test("displays character count for message", async () => {
    render(<RequestAccessDialog {...defaultProps} />);

    const textarea = screen.getByPlaceholderText(
      "Tell them why you'd like to view their full resume..."
    ) as HTMLTextAreaElement;

    await userEvent.type(textarea, "Test message");

    expect(screen.getByText("12/500 characters")).toBeInTheDocument();
  });

  test("enforces maximum message length of 500 characters", async () => {
    render(<RequestAccessDialog {...defaultProps} />);

    const textarea = screen.getByPlaceholderText(
      "Tell them why you'd like to view their full resume..."
    ) as HTMLTextAreaElement;

    const longMessage = "a".repeat(600);
    await userEvent.type(textarea, longMessage);

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
      "Tell them why you'd like to view their full resume..."
    ) as HTMLTextAreaElement;

    await userEvent.type(textarea, "Interested in collaboration");

    const submitButton = screen.getByText("Send Request");
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/profiles/request-access",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"toUserId":"profile123"'),
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

    const submitButton = screen.getByText("Send Request") as HTMLButtonElement;
    await userEvent.click(submitButton);

    expect(screen.getByText("Sending...")).toBeDisabled();
  });

  test("shows error message on API failure", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "User already requested" }),
    } as Response);

    render(<RequestAccessDialog {...defaultProps} />);

    const submitButton = screen.getByText("Send Request");
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("User already requested")).toBeInTheDocument();
    });
  });

  test("calls onSuccess callback on successful submission", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);

    const onSuccess = jest.fn();
    render(<RequestAccessDialog {...defaultProps} onSuccess={onSuccess} />);

    const submitButton = screen.getByText("Send Request");
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

    const submitButton = screen.getByText("Send Request");
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

    const { rerender } = render(<RequestAccessDialog {...defaultProps} />);

    const textarea = screen.getByPlaceholderText(
      "Tell them why you'd like to view their full resume..."
    ) as HTMLTextAreaElement;

    await userEvent.type(textarea, "Test message");

    const submitButton = screen.getByText("Send Request");
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(textarea.value).toBe("");
    });
  });

  test("includes message in request when provided", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);

    render(<RequestAccessDialog {...defaultProps} />);

    const textarea = screen.getByPlaceholderText(
      "Tell them why you'd like to view their full resume..."
    ) as HTMLTextAreaElement;

    await userEvent.type(textarea, "Custom message");

    const submitButton = screen.getByText("Send Request");
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

    const submitButton = screen.getByText("Send Request");
    await userEvent.click(submitButton);

    await waitFor(() => {
      const callBody = JSON.parse(
        (mockFetch.mock.calls[0]?.[1] as any)?.body || "{}"
      );
      expect(callBody.message).toBeUndefined();
    });
  });
});
