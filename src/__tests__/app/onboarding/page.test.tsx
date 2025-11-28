import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@/__tests__/__support__/testUtils";
import Onboarding from "@/app/onboarding/page";

// Mock the hooks
jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { uid: "test-user-id", email: "test@example.com" },
  }),
}));

// Mock Next.js router
const mockRouter = { push: jest.fn(), replace: jest.fn() };
jest.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
}));

// Mock firebase/firestore
jest.mock("firebase/firestore", () => ({
  getFirestore: jest.fn(),
  doc: jest.fn(),
  setDoc: jest.fn().mockResolvedValue(undefined),
  serverTimestamp: jest.fn(),
}));

describe("Onboarding", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render the onboarding page", () => {
    render(<Onboarding />);

    expect(screen.getByText("Create Your Resume")).toBeInTheDocument();
    expect(screen.getByText(/Step 1 of 7/)).toBeInTheDocument();
    expect(screen.getByText("Basic Information")).toBeInTheDocument();
  });

  it("should display resume title input", () => {
    render(<Onboarding />);

    const titleInput = screen.getByPlaceholderText(
      "e.g., Software Engineer Resume"
    );
    expect(titleInput).toHaveAttribute("type", "text");
    expect(titleInput).toHaveValue("");
  });

  it("should display professional summary textarea", () => {
    render(<Onboarding />);

    const summaryTextarea = screen.getByPlaceholderText(
      "Brief summary of your professional background..."
    );
    expect(summaryTextarea).toHaveAttribute("rows", "4");
    expect(summaryTextarea).toHaveValue("");
  });

  it("should update profile when title is changed", () => {
    render(<Onboarding />);

    const titleInput = screen.getByPlaceholderText(
      "e.g., Software Engineer Resume"
    );
    fireEvent.change(titleInput, { target: { value: "My Awesome Resume" } });

    expect(titleInput).toHaveValue("My Awesome Resume");
  });

  it("should update profile when summary is changed", () => {
    render(<Onboarding />);

    const summaryTextarea = screen.getByPlaceholderText(
      "Brief summary of your professional background..."
    );
    fireEvent.change(summaryTextarea, {
      target: { value: "I am a skilled developer..." },
    });

    expect(summaryTextarea).toHaveValue("I am a skilled developer...");
  });

  it("should navigate to next step", () => {
    render(<Onboarding />);

    // Start on Basic Info step
    expect(screen.getByText("Basic Information")).toBeInTheDocument();

    const nextButton = screen.getByText(/Next/);
    fireEvent.click(nextButton);

    // Should move to Experience step
    expect(screen.getByText("Work Experience")).toBeInTheDocument();
    expect(screen.getByText(/Step 2 of 7/)).toBeInTheDocument();
  });

  it("should navigate to previous step", () => {
    render(<Onboarding />);

    // Go to second step
    const nextButton = screen.getByText(/Next/);
    fireEvent.click(nextButton);

    // Now go back
    const prevButton = screen.getByText(/Previous/);
    fireEvent.click(prevButton);

    // Should be back to Basic Info
    expect(screen.getByText("Basic Information")).toBeInTheDocument();
    expect(screen.getByText(/Step 1 of 7/)).toBeInTheDocument();
  });

  it("should disable previous button on first step", () => {
    render(<Onboarding />);

    const prevButton = screen.getByText(/Previous/);
    expect(prevButton).toBeDisabled();
  });

  it("should show experience placeholder content", () => {
    render(<Onboarding />);

    // Navigate to experience step
    const nextButton = screen.getByText(/Next/);
    fireEvent.click(nextButton);

    // Wait for the next step to render
    waitFor(() => {
      expect(screen.getByText("Work Experience")).toBeInTheDocument();
    });
    expect(screen.getByText(/Step 2 of 7/)).toBeInTheDocument();
  });

  it("should show education placeholder content", () => {
    render(<Onboarding />);

    // Navigate to education step (step 3)
    const nextButton = screen.getByText(/Next/);
    fireEvent.click(nextButton); // Experience
    fireEvent.click(nextButton); // Education

    waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /Education/ })
      ).toBeInTheDocument();
    });
    expect(screen.getByText(/Step 3 of 7/)).toBeInTheDocument();
  });

  it("should show skills placeholder content", () => {
    render(<Onboarding />);

    // Navigate to skills step (step 4)
    const nextButton = screen.getByText(/Next/);
    for (let i = 0; i < 3; i++) {
      fireEvent.click(nextButton);
    }

    waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /Skills/ })
      ).toBeInTheDocument();
    });
    expect(screen.getByText(/Step 4 of 7/)).toBeInTheDocument();
  });

  it("should show projects placeholder content", () => {
    render(<Onboarding />);

    // Navigate to projects step (step 5)
    const nextButton = screen.getByText(/Next/);
    for (let i = 0; i < 4; i++) {
      fireEvent.click(nextButton);
    }

    waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /Projects/ })
      ).toBeInTheDocument();
    });
    expect(screen.getByText(/Step 5 of 7/)).toBeInTheDocument();
  });

  it("should display contact information inputs", () => {
    render(<Onboarding />);

    // Navigate to contact step (step 6)
    const nextButton = screen.getByText(/Next/);
    for (let i = 0; i < 5; i++) {
      fireEvent.click(nextButton);
    }

    expect(screen.getByText("Contact Information")).toBeInTheDocument();

    // Find inputs by their labels
    const emailLabel = screen.getByText("Email");
    const phoneLabel = screen.getByText("Phone");

    expect(emailLabel).toBeInTheDocument();
    expect(phoneLabel).toBeInTheDocument();
  });

  it("should update contact email", () => {
    render(<Onboarding />);

    // Navigate to contact step
    const nextButton = screen.getByText(/Next/);
    for (let i = 0; i < 5; i++) {
      fireEvent.click(nextButton);
    }

    // Find email input by its type
    const inputs = screen.getAllByDisplayValue("");
    const emailInput = inputs.find(
      (input) => input.getAttribute("type") === "email"
    ) as HTMLInputElement;
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });

    expect(emailInput).toHaveValue("test@example.com");
  });

  it("should update contact phone", () => {
    render(<Onboarding />);

    // Navigate to contact step
    const nextButton = screen.getByText(/Next/);
    for (let i = 0; i < 5; i++) {
      fireEvent.click(nextButton);
    }

    const phoneInput = screen.getAllByDisplayValue("")[1];
    fireEvent.change(phoneInput, { target: { value: "+1234567890" } });

    expect(phoneInput).toHaveValue("+1234567890");
  });

  it("should display review step with profile data", () => {
    render(<Onboarding />);

    // Navigate to review step (step 7)
    const nextButton = screen.getByText(/Next/);
    for (let i = 0; i < 6; i++) {
      fireEvent.click(nextButton);
    }

    waitFor(() => {
      expect(screen.getByText("Review Your Information")).toBeInTheDocument();
    });
    expect(screen.getByText(/Step 7 of 7/)).toBeInTheDocument();
  });

  it("should submit and navigate to dashboard", async () => {
    render(<Onboarding />);

    // Navigate to final step
    const nextButton = screen.getByText(/Next/);
    for (let i = 0; i < 6; i++) {
      fireEvent.click(nextButton);
    }

    // The complete setup button should be visible (with icon + text)
    const buttons = screen.getAllByRole("button");
    const submitButton = buttons.find((btn) =>
      btn.textContent?.includes("Complete Setup")
    ) as HTMLElement;

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith("/dashboard");
    });
  });
});
