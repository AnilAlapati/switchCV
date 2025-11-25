// src/__tests__/app/onboarding/complete-form.test.tsx
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Onboarding from "@/app/onboarding/page";

// Mock the hooks
jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { uid: "test-user-id", email: "test@example.com" },
  }),
}));

// Mock Next.js router
const mockRouter = { push: jest.fn() };
jest.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
}));

describe("Onboarding - Complete Form", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Basic Information Step", () => {
    it("should render basic info step on initial load", () => {
      render(<Onboarding />);

      expect(screen.getByText("Create Your Resume")).toBeInTheDocument();
      expect(screen.getByText(/Step 1 of 7/)).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("e.g., Software Engineer Resume")
      ).toBeInTheDocument();
    });

    it("should update title input", async () => {
      render(<Onboarding />);

      const titleInput = screen.getByPlaceholderText(
        "e.g., Software Engineer Resume"
      ) as HTMLInputElement;
      await userEvent.type(titleInput, "My Resume");

      expect(titleInput.value).toBe("My Resume");
    });

    it("should update summary textarea", async () => {
      render(<Onboarding />);

      const summaryInput = screen.getByPlaceholderText(
        "Brief summary of your professional background..."
      ) as HTMLTextAreaElement;
      await userEvent.type(
        summaryInput,
        "Experienced software engineer with 5 years of expertise"
      );

      expect(summaryInput.value).toContain("Experienced software engineer");
    });
  });

  describe("Navigation", () => {
    it("should navigate between steps", async () => {
      render(<Onboarding />);

      const nextButton = screen.getByText("Next →");
      expect(screen.getByText(/Step 1 of 7/)).toBeInTheDocument();

      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText(/Step 2 of 7/)).toBeInTheDocument();
      });
    });

    it("should disable previous button on first step", () => {
      render(<Onboarding />);

      const prevButton = screen.getByText("← Previous") as HTMLButtonElement;
      expect(prevButton.disabled).toBe(true);
    });

    it("should enable previous button after first step", async () => {
      render(<Onboarding />);

      const nextButton = screen.getByText("Next →");
      fireEvent.click(nextButton);

      await waitFor(() => {
        const prevButton = screen.getByText("← Previous") as HTMLButtonElement;
        expect(prevButton.disabled).toBe(false);
      });
    });

    it("should navigate backward", async () => {
      render(<Onboarding />);

      // Go to step 2
      fireEvent.click(screen.getByText("Next →"));

      await waitFor(() => {
        expect(screen.getByText(/Step 2 of 7/)).toBeInTheDocument();
      });

      // Go back to step 1
      fireEvent.click(screen.getByText("← Previous"));

      await waitFor(() => {
        expect(screen.getByText(/Step 1 of 7/)).toBeInTheDocument();
      });
    });
  });

  describe("Experience Step", () => {
    beforeEach(async () => {
      render(<Onboarding />);
      const nextButton = screen.getByText("Next →");
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText(/Step 2 of 7/)).toBeInTheDocument();
      });
    });

    it("should show experience step", () => {
      expect(screen.getByText("Work Experience")).toBeInTheDocument();
    });

    it("should add experience entry", async () => {
      const addButton = screen.getByText("+ Add Experience");
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText("e.g., Acme Corp")
        ).toBeInTheDocument();
      });
    });

    it("should fill in experience fields", async () => {
      const addButton = screen.getByText("+ Add Experience");
      fireEvent.click(addButton);

      await waitFor(() => {
        const companyInput = screen.getByPlaceholderText(
          "e.g., Acme Corp"
        ) as HTMLInputElement;
        const roleInput = screen.getByPlaceholderText(
          "e.g., Senior Software Engineer"
        ) as HTMLInputElement;

        fireEvent.change(companyInput, { target: { value: "Acme Corp" } });
        fireEvent.change(roleInput, { target: { value: "Senior Engineer" } });

        expect(companyInput.value).toBe("Acme Corp");
        expect(roleInput.value).toBe("Senior Engineer");
      });
    });

    it("should remove experience entry", async () => {
      const addButton = screen.getByText("+ Add Experience");
      fireEvent.click(addButton);

      await waitFor(() => {
        const removeButton = screen.getByText("Remove");
        fireEvent.click(removeButton);

        expect(
          screen.queryByPlaceholderText("e.g., Acme Corp")
        ).not.toBeInTheDocument();
      });
    });
  });

  describe("Education Step", () => {
    beforeEach(async () => {
      render(<Onboarding />);
      // Navigate to education step (step 3)
      fireEvent.click(screen.getByText("Next →"));
      fireEvent.click(screen.getByText("Next →"));

      await waitFor(() => {
        expect(screen.getByText(/Step 3 of 7/)).toBeInTheDocument();
      });
    });

    it("should show education step", () => {
      expect(
        screen.getByRole("heading", { name: "Education" })
      ).toBeInTheDocument();
    });

    it("should add education entry", async () => {
      const addButton = screen.getByText("+ Add Education");
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText("e.g., MIT")).toBeInTheDocument();
      });
    });
  });

  describe("Skills Step", () => {
    beforeEach(async () => {
      render(<Onboarding />);
      // Navigate to skills step (step 4)
      for (let i = 0; i < 3; i++) {
        fireEvent.click(screen.getByText("Next →"));
      }

      await waitFor(() => {
        expect(screen.getByText(/Step 4 of 7/)).toBeInTheDocument();
      });
    });

    it("should show skills step", () => {
      expect(
        screen.getByRole("heading", { name: /Skills/i })
      ).toBeInTheDocument();
    });

    it("should add skill entry", async () => {
      const addButton = screen.getByText("+ Add Skill");
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText("e.g., React, Python, Leadership")
        ).toBeInTheDocument();
      });
    });

    it("should set proficiency level", async () => {
      const addButton = screen.getByText("+ Add Skill");
      fireEvent.click(addButton);

      await waitFor(() => {
        const levelSelects = screen.getAllByRole("combobox");
        expect(levelSelects.length).toBeGreaterThan(0);
        const levelSelect = levelSelects[0] as HTMLSelectElement;
        fireEvent.change(levelSelect, { target: { value: "advanced" } });
        expect(levelSelect.value).toBe("advanced");
      });
    });
  });

  describe("Projects Step", () => {
    beforeEach(async () => {
      render(<Onboarding />);
      // Navigate to projects step (step 5)
      for (let i = 0; i < 4; i++) {
        fireEvent.click(screen.getByText("Next →"));
      }

      await waitFor(() => {
        expect(screen.getByText(/Step 5 of 7/)).toBeInTheDocument();
      });
    });

    it("should show projects step", () => {
      expect(
        screen.getByRole("heading", { name: /Projects/i })
      ).toBeInTheDocument();
    });

    it("should add project entry", async () => {
      const addButton = screen.getByText("+ Add Project");
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText("e.g., E-commerce Platform")
        ).toBeInTheDocument();
      });
    });
  });

  describe("Contact Step", () => {
    beforeEach(async () => {
      render(<Onboarding />);
      // Navigate to contact step (step 6)
      for (let i = 0; i < 5; i++) {
        fireEvent.click(screen.getByText("Next →"));
      }

      await waitFor(() => {
        expect(screen.getByText(/Step 6 of 7/)).toBeInTheDocument();
      });
    });

    it("should show contact step", () => {
      expect(screen.getByText("Contact Information")).toBeInTheDocument();
    });

    it("should allow email input", async () => {
      const emailInputs = screen.getAllByPlaceholderText(
        "your.email@example.com"
      );
      const emailInput = emailInputs[0] as HTMLInputElement;

      await userEvent.type(emailInput, "test@example.com");
      expect(emailInput.value).toBe("test@example.com");
    });

    it("should allow phone input", async () => {
      const phoneInputs = screen.getAllByPlaceholderText("+1 (555) 123-4567");
      const phoneInput = phoneInputs[0] as HTMLInputElement;

      await userEvent.type(phoneInput, "+1-555-123-4567");
      expect(phoneInput.value).toBe("+1-555-123-4567");
    });
  });

  describe("Review Step", () => {
    beforeEach(async () => {
      render(<Onboarding />);
      // Navigate to review step (step 7)
      for (let i = 0; i < 6; i++) {
        fireEvent.click(screen.getByText("Next →"));
      }

      await waitFor(() => {
        expect(screen.getByText(/Step 7 of 7/)).toBeInTheDocument();
      });
    });

    it("should show review step", () => {
      expect(screen.getByText("Review Your Information")).toBeInTheDocument();
    });

    it("should show complete setup button on final step", () => {
      expect(screen.getByText("✓ Complete Setup")).toBeInTheDocument();
    });

    it("should not show next button on final step", () => {
      expect(screen.queryByText("Next →")).not.toBeInTheDocument();
    });
  });

  describe("Progress Bar", () => {
    it("should update progress bar", async () => {
      render(<Onboarding />);

      const progressBar = screen.getByTestId("progress-bar");
      const initialWidth = progressBar.style.width;

      fireEvent.click(screen.getByText("Next →"));

      await waitFor(() => {
        // Progress should increase
        const newWidth = progressBar.style.width;
        expect(newWidth).not.toBe(initialWidth);
      });
    });
  });

  describe("Step Indicators", () => {
    it("should show all step indicators", () => {
      render(<Onboarding />);

      expect(screen.getByText("1. Basic Info")).toBeInTheDocument();
      expect(screen.getByText("2. Experience")).toBeInTheDocument();
      expect(screen.getByText("3. Education")).toBeInTheDocument();
      expect(screen.getByText("4. Skills")).toBeInTheDocument();
      expect(screen.getByText("5. Projects")).toBeInTheDocument();
      expect(screen.getByText("6. Contact")).toBeInTheDocument();
      expect(screen.getByText("7. Review")).toBeInTheDocument();
    });

    it("should allow direct navigation via step indicators", async () => {
      render(<Onboarding />);

      const step3Button = screen.getByText("3. Education");
      fireEvent.click(step3Button);

      await waitFor(() => {
        expect(screen.getByText(/Step 3 of 7/)).toBeInTheDocument();
      });
    });
  });
});
