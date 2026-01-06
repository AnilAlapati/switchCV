// src/__tests__/app/profile/page.test.tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ProfileEditor from "@/app/profile/page";
import { logger } from "@/lib/logger";

// Mock logger
jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock firebase/firestore
jest.mock("firebase/firestore", () => ({
  getFirestore: jest.fn(),
  doc: jest.fn(),
  setDoc: jest.fn().mockResolvedValue(undefined),
  serverTimestamp: jest.fn(),
}));

// Mock useJobSeekerProfile
jest.mock("@/hooks/useJobSeekerProfile", () => ({
  useJobSeekerProfile: jest.fn(),
}));

// Mock useAuth
jest.mock("@/hooks/useAuth", () => ({
  useAuth: jest.fn(() => ({
    user: { uid: "test-user", email: "test@example.com" },
    loading: false,
  })),
}));

import { useJobSeekerProfile } from "@/hooks/useJobSeekerProfile";

describe("ProfileEditor", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useJobSeekerProfile as jest.Mock).mockReturnValue({
      profile: {
        title: "Software Engineer",
        summary: "Full-stack developer",
        contact: {
          email: { value: "test@example.com", visibility: "public" },
          phone: { value: "1234567890", visibility: "public" },
        },
      },
      loading: false,
      mutate: jest.fn(),
    });
  });

  it("should render the profile editor page", () => {
    render(<ProfileEditor />);

    expect(screen.getByText("Edit Your Resume")).toBeInTheDocument();
    expect(screen.getByText("Resume Title")).toBeInTheDocument();
    expect(screen.getByText("Professional Summary")).toBeInTheDocument();
    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByText("Phone")).toBeInTheDocument();
    expect(screen.getByText("Save Changes")).toBeInTheDocument();
  });

  it("should update resume title when input changes", () => {
    render(<ProfileEditor />);

    // Find the input that comes after "Resume Title" label
    const titleLabel = screen.getByText("Resume Title");
    const titleInput = titleLabel.parentElement?.querySelector(
      'input[type="text"]'
    ) as HTMLInputElement;
    fireEvent.change(titleInput, {
      target: { value: "Software Engineer Resume" },
    });

    expect(titleInput.value).toBe("Software Engineer Resume");
  });

  it("should update professional summary when textarea changes", () => {
    render(<ProfileEditor />);

    // Find the textarea that comes after "Professional Summary" label
    const summaryLabel = screen.getByText("Professional Summary");
    const summaryTextarea = summaryLabel.parentElement?.querySelector(
      "textarea"
    ) as HTMLTextAreaElement;
    fireEvent.change(summaryTextarea, {
      target: { value: "Experienced software engineer" },
    });

    expect(summaryTextarea.value).toBe("Experienced software engineer");
  });

  it("should update email when input changes", () => {
    render(<ProfileEditor />);

    // Find the email input that comes after "Email" label
    const emailLabel = screen.getByText("Email");
    const emailInput = emailLabel.parentElement?.querySelector(
      'input[type="email"]'
    ) as HTMLInputElement;
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });

    expect(emailInput.value).toBe("test@example.com");
  });

  it("should update phone when input changes", () => {
    render(<ProfileEditor />);

    // Find the phone input that comes after "Phone" label
    const phoneLabel = screen.getByText("Phone");
    const phoneInput = phoneLabel.parentElement?.querySelector(
      'input[type="tel"]'
    ) as HTMLInputElement;
    fireEvent.change(phoneInput, { target: { value: "+1234567890" } });

    expect(phoneInput.value).toBe("+1234567890");
  });

  it("should call logger.info when save button is clicked", async () => {
    // Mock fetch for the save call
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<ProfileEditor />);

    const saveButton = screen.getByText("Save Changes");
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(logger.info).toHaveBeenCalledWith(
        { userId: "test-user" },
        "Profile saved successfully"
      );
    });
  });

  it("should update profile state when multiple fields are changed", () => {
    render(<ProfileEditor />);

    const titleLabel = screen.getByText("Resume Title");
    const titleInput = titleLabel.parentElement?.querySelector(
      'input[type="text"]'
    ) as HTMLInputElement;
    const emailLabel = screen.getByText("Email");
    const emailInput = emailLabel.parentElement?.querySelector(
      'input[type="email"]'
    ) as HTMLInputElement;

    fireEvent.change(titleInput, { target: { value: "My Resume" } });
    fireEvent.change(emailInput, { target: { value: "user@test.com" } });

    expect(titleInput.value).toBe("My Resume");
    expect(emailInput.value).toBe("user@test.com");
  });
});
