import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ResumeFileUpload } from "@/components/create-resume/ResumeFileUpload";
import { useAuth } from "@/hooks/useAuth";

jest.mock("@/hooks/useAuth", () => ({
  useAuth: jest.fn(),
}));

const mockUser = {
  uid: "user-123",
  getIdToken: jest.fn().mockResolvedValue("id-token-123"),
};

function createResumeFile(): File {
  return new File(["Jane Doe resume content"], "resume.pdf", {
    type: "application/pdf",
  });
}

describe("ResumeFileUpload", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({ user: mockUser });
    global.fetch = jest.fn();
  });

  it("uploads with a Firebase bearer token and confirms edited draft", async () => {
    const onComplete = jest.fn();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        uploadDraft: {
          sourceChannel: "pdf",
          fileName: "resume.pdf",
          extractedData: {
            name: "Jane Doe",
            email: "jane@example.com",
            summary: "Software engineer",
            skills: ["React", "TypeScript"],
          },
          extractedFields: ["name", "email", "summary", "skills"],
          missingFields: [],
          extractionMethod: "ai",
        },
      }),
    });

    render(<ResumeFileUpload onComplete={onComplete} onCancel={jest.fn()} />);

    fireEvent.change(screen.getByTestId("resume-file-input"), {
      target: { files: [createResumeFile()] },
    });

    await waitFor(() => {
      expect(screen.getByText("Review extracted details")).toBeInTheDocument();
    });

    expect(mockUser.getIdToken).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/resume/upload-and-extract",
      expect.objectContaining({
        method: "POST",
        headers: { Authorization: "Bearer id-token-123" },
      }),
    );

    fireEvent.change(screen.getByLabelText(/name/i), {
      target: { value: "Jane Q. Doe" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create resume/i }));

    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        extractedData: expect.objectContaining({ name: "Jane Q. Doe" }),
        extractedFields: expect.arrayContaining(["name", "email", "skills"]),
      }),
    );
  });

  it("shows the plan error when the upload API returns 403", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({
        error: "File upload is not available on your plan",
      }),
    });

    render(<ResumeFileUpload onComplete={jest.fn()} onCancel={jest.fn()} />);

    fireEvent.change(screen.getByTestId("resume-file-input"), {
      target: { files: [createResumeFile()] },
    });

    await waitFor(() => {
      expect(
        screen.getByText("File upload is not available on your plan."),
      ).toBeInTheDocument();
    });
  });

  it("shows scanned PDF guidance when the upload API returns SCANNED_PDF", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({
        error: "Could not extract text",
        code: "SCANNED_PDF",
      }),
    });

    render(<ResumeFileUpload onComplete={jest.fn()} onCancel={jest.fn()} />);

    fireEvent.change(screen.getByTestId("resume-file-input"), {
      target: { files: [createResumeFile()] },
    });

    await waitFor(() => {
      expect(
        screen.getByText(
          "This looks like a scanned PDF. Paste your resume text in chat instead.",
        ),
      ).toBeInTheDocument();
    });
  });
});
