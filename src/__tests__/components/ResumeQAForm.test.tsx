import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ResumeQAForm } from "@/components/ResumeQAForm";

// Mock the questions config
jest.mock("@/config/resumeQuestions", () => ({
  resumeQuestions: [
    {
      id: "name",
      question: "What is your full name?",
      type: "text",
      category: "personal",
      required: true,
      placeholder: "e.g. John Doe",
    },
    {
      id: "email",
      question: "What is your email address?",
      type: "text",
      category: "personal",
      required: true,
      validation: {
        pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$",
        message: "Please enter a valid email address",
      },
    },
    {
      id: "skills",
      question: "What are your key skills?",
      type: "multiselect",
      category: "skills",
      required: false,
      placeholder: "React, Node.js",
    },
    {
      id: "role",
      question: "What is your desired role?",
      type: "select",
      category: "professional",
      required: true,
      options: ["Developer", "Designer", "Manager"],
    },
    {
      id: "summary",
      question: "Professional Summary",
      type: "textarea",
      category: "professional",
      required: false,
    },
  ],
}));

describe("ResumeQAForm", () => {
  const mockOnComplete = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the first question correctly", () => {
    render(
      <ResumeQAForm onComplete={mockOnComplete} onCancel={mockOnCancel} />
    );
    expect(screen.getByText("What is your full name?")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("e.g. John Doe")).toBeInTheDocument();
    expect(screen.getByText("Question 1 of 5")).toBeInTheDocument();
  });

  it("validates required fields", () => {
    render(
      <ResumeQAForm onComplete={mockOnComplete} onCancel={mockOnCancel} />
    );

    fireEvent.click(screen.getByText("Next →"));

    expect(
      screen.getByText("What is your full name? is required")
    ).toBeInTheDocument();
    expect(mockOnComplete).not.toHaveBeenCalled();
  });

  it("navigates to next question on valid input", () => {
    render(
      <ResumeQAForm onComplete={mockOnComplete} onCancel={mockOnCancel} />
    );

    const input = screen.getByPlaceholderText("e.g. John Doe");
    fireEvent.change(input, { target: { value: "John Doe" } });

    fireEvent.click(screen.getByText("Next →"));

    expect(screen.getByText("What is your email address?")).toBeInTheDocument();
  });

  it("validates pattern matching (email)", () => {
    render(
      <ResumeQAForm onComplete={mockOnComplete} onCancel={mockOnCancel} />
    );

    // First question
    fireEvent.change(screen.getByPlaceholderText("e.g. John Doe"), {
      target: { value: "John Doe" },
    });
    fireEvent.click(screen.getByText("Next →"));

    // Second question (Email)
    const emailInput = screen.getByRole("textbox");
    fireEvent.change(emailInput, { target: { value: "invalid-email" } });
    fireEvent.click(screen.getByText("Next →"));

    expect(
      screen.getByText("Please enter a valid email address")
    ).toBeInTheDocument();

    fireEvent.change(emailInput, { target: { value: "john@example.com" } });
    fireEvent.click(screen.getByText("Next →"));

    expect(screen.getByText("What are your key skills?")).toBeInTheDocument();
  });

  it("handles multiselect input", () => {
    render(
      <ResumeQAForm onComplete={mockOnComplete} onCancel={mockOnCancel} />
    );

    // Skip to skills (3rd question)
    fireEvent.change(screen.getByPlaceholderText("e.g. John Doe"), {
      target: { value: "John Doe" },
    });
    fireEvent.click(screen.getByText("Next →"));
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "john@example.com" },
    });
    fireEvent.click(screen.getByText("Next →"));

    // Skills
    const skillsInput = screen.getByPlaceholderText("React, Node.js");
    fireEvent.change(skillsInput, {
      target: { value: "React, TypeScript, Jest" },
    });
    fireEvent.click(screen.getByText("Next →"));

    expect(screen.getByText("What is your desired role?")).toBeInTheDocument();
  });

  it("handles select input", () => {
    render(
      <ResumeQAForm onComplete={mockOnComplete} onCancel={mockOnCancel} />
    );

    // Navigate to 4th question
    fireEvent.change(screen.getByPlaceholderText("e.g. John Doe"), {
      target: { value: "John Doe" },
    });
    fireEvent.click(screen.getByText("Next →"));
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "john@example.com" },
    });
    fireEvent.click(screen.getByText("Next →"));
    fireEvent.click(screen.getByText("Next →")); // Skills optional

    // Role (Select)
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "Developer" } });
    fireEvent.click(screen.getByText("Next →"));

    expect(screen.getByText("Professional Summary")).toBeInTheDocument();
  });

  it("handles textarea input and completion", () => {
    render(
      <ResumeQAForm onComplete={mockOnComplete} onCancel={mockOnCancel} />
    );

    // Navigate to last question
    fireEvent.change(screen.getByPlaceholderText("e.g. John Doe"), {
      target: { value: "John Doe" },
    });
    fireEvent.click(screen.getByText("Next →"));
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "john@example.com" },
    });
    fireEvent.click(screen.getByText("Next →"));
    fireEvent.click(screen.getByText("Next →")); // Skills optional
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "Developer" },
    });
    fireEvent.click(screen.getByText("Next →"));

    // Summary (Textarea)
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "I am a developer." } });

    fireEvent.click(screen.getByText("Generate Resume ✓"));

    expect(mockOnComplete).toHaveBeenCalledWith({
      name: "John Doe",
      email: "john@example.com",
      skills: [], // Optional and skipped
      role: "Developer",
      summary: "I am a developer.",
    });
  });

  it("allows navigation back to previous questions", () => {
    render(
      <ResumeQAForm onComplete={mockOnComplete} onCancel={mockOnCancel} />
    );

    fireEvent.change(screen.getByPlaceholderText("e.g. John Doe"), {
      target: { value: "John Doe" },
    });
    fireEvent.click(screen.getByText("Next →"));

    expect(screen.getByText("What is your email address?")).toBeInTheDocument();

    fireEvent.click(screen.getByText("← Previous"));

    expect(screen.getByText("What is your full name?")).toBeInTheDocument();
    expect(screen.getByDisplayValue("John Doe")).toBeInTheDocument();
  });

  it("calls onCancel when cancel button is clicked", () => {
    render(
      <ResumeQAForm onComplete={mockOnComplete} onCancel={mockOnCancel} />
    );
    fireEvent.click(screen.getByText("Cancel"));
    expect(mockOnCancel).toHaveBeenCalled();
  });
});
