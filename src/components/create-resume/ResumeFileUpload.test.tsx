/**
 * Tests for ResumeFileUpload component
 * Covers upload success, plan restriction (403), and scanned PDF (422) states.
 */

import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { ResumeFileUpload } from "./ResumeFileUpload";
import { useAuth } from "@/hooks/useAuth";

jest.mock("@/hooks/useAuth");

jest.mock("lucide-react", () => ({
  AlertCircle: () => <svg data-testid="icon-alert-circle" aria-hidden="true" />,
  CheckCircle2: () => (
    <svg data-testid="icon-check-circle" aria-hidden="true" />
  ),
  FileText: () => <svg data-testid="icon-file-text" aria-hidden="true" />,
  Loader2: () => (
    <svg data-testid="icon-loader" role="status" aria-hidden="true" />
  ),
  Upload: () => <svg data-testid="icon-upload" aria-hidden="true" />,
  X: () => <svg data-testid="icon-x" aria-hidden="true" />,
}));

const mockGetIdToken = jest.fn().mockResolvedValue("mock-id-token");

const mockUser = {
  uid: "test-user",
  getIdToken: mockGetIdToken,
};

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

const VALID_UPLOAD_DRAFT = {
  sourceChannel: "pdf" as const,
  fileName: "resume.pdf",
  extractedData: {
    name: "Jane Doe",
    email: "jane@example.com",
    phone: "555-1234",
    location: "San Francisco, CA",
    summary: "Experienced engineer.",
    skills: ["TypeScript", "React"],
    experience: [],
    education: [],
  },
  extractedFields: ["name", "email", "phone", "location", "summary", "skills"],
  missingFields: [],
  extractionMethod: "ai" as const,
  latencyMs: 1200,
};

const SUCCESS_RESPONSE = {
  ok: true,
  status: 200,
  json: async () => ({ uploadDraft: VALID_UPLOAD_DRAFT }),
};

function makePdf(name = "resume.pdf", bytes = 1024): File {
  return new File(["x".repeat(bytes)], name, { type: "application/pdf" });
}

describe("ResumeFileUpload", () => {
  const onComplete = jest.fn();
  const onCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
    } as any);
    global.fetch = jest.fn();
  });

  it("renders the upload zone and Choose File button", () => {
    render(<ResumeFileUpload onComplete={onComplete} onCancel={onCancel} />);

    expect(screen.getByText("Drop your resume file here")).toBeInTheDocument();
    expect(screen.getByText("PDF, DOCX, or TXT")).toBeInTheDocument();
    expect(screen.getByText("Choose File")).toBeInTheDocument();
  });

  it("shows client-side error for unsupported file extension", async () => {
    render(<ResumeFileUpload onComplete={onComplete} onCancel={onCancel} />);

    const input = screen.getByTestId("resume-file-input");
    const badFile = new File(["content"], "resume.xls", {
      type: "application/vnd.ms-excel",
    });
    fireEvent.change(input, { target: { files: [badFile] } });

    await waitFor(() => {
      expect(
        screen.getByText("Upload a PDF, DOCX, or TXT file."),
      ).toBeInTheDocument();
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("shows client-side error when file exceeds 5 MB", async () => {
    render(<ResumeFileUpload onComplete={onComplete} onCancel={onCancel} />);

    const input = screen.getByTestId("resume-file-input");
    const bigFile = makePdf("large.pdf", 6 * 1024 * 1024);
    fireEvent.change(input, { target: { files: [bigFile] } });

    await waitFor(() => {
      expect(
        screen.getByText("File size must be 5 MB or less."),
      ).toBeInTheDocument();
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("sends Authorization header with Firebase ID token on upload", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(SUCCESS_RESPONSE);
    render(<ResumeFileUpload onComplete={onComplete} onCancel={onCancel} />);

    const input = screen.getByTestId("resume-file-input");
    fireEvent.change(input, { target: { files: [makePdf()] } });

    await waitFor(() => {
      expect(screen.getByText("Review extracted details")).toBeInTheDocument();
    });

    const [url, options] = (global.fetch as jest.Mock).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(url).toBe("/api/resume/upload-and-extract");
    expect((options.headers as Record<string, string>)["Authorization"]).toBe(
      "Bearer mock-id-token",
    );
    expect(options.method).toBe("POST");
  });

  it("displays extracted draft fields after successful upload", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(SUCCESS_RESPONSE);
    render(<ResumeFileUpload onComplete={onComplete} onCancel={onCancel} />);

    const input = screen.getByTestId("resume-file-input");
    fireEvent.change(input, { target: { files: [makePdf()] } });

    await waitFor(() => {
      expect(screen.getByDisplayValue("Jane Doe")).toBeInTheDocument();
      expect(screen.getByDisplayValue("jane@example.com")).toBeInTheDocument();
    });
  });

  it("shows plan restriction error on 403 response", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({
        error: "File upload is not available on your plan",
      }),
    });
    render(<ResumeFileUpload onComplete={onComplete} onCancel={onCancel} />);

    const input = screen.getByTestId("resume-file-input");
    fireEvent.change(input, { target: { files: [makePdf()] } });

    await waitFor(() => {
      expect(
        screen.getByText("File upload is not available on your plan."),
      ).toBeInTheDocument();
    });
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("shows scanned PDF error on 422 SCANNED_PDF response", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({
        error: "Could not extract text",
        code: "SCANNED_PDF",
      }),
    });
    render(<ResumeFileUpload onComplete={onComplete} onCancel={onCancel} />);

    const input = screen.getByTestId("resume-file-input");
    fireEvent.change(input, { target: { files: [makePdf()] } });

    await waitFor(() => {
      expect(
        screen.getByText(
          "This looks like a scanned PDF. Paste your resume text in chat instead.",
        ),
      ).toBeInTheDocument();
    });
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("calls onComplete with merged draft when Create Resume is clicked", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(SUCCESS_RESPONSE);
    render(<ResumeFileUpload onComplete={onComplete} onCancel={onCancel} />);

    const input = screen.getByTestId("resume-file-input");
    fireEvent.change(input, { target: { files: [makePdf()] } });

    await waitFor(() => {
      expect(screen.getByDisplayValue("Jane Doe")).toBeInTheDocument();
    });

    const confirmBtn = screen.getByRole("button", { name: /create resume/i });
    fireEvent.click(confirmBtn);

    expect(onComplete).toHaveBeenCalledTimes(1);
    const arg = onComplete.mock.calls[0][0];
    expect(arg.fileName).toBe("resume.pdf");
    expect(arg.sourceChannel).toBe("pdf");
  });

  it("calls onCancel when Back to Chat is clicked after upload", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(SUCCESS_RESPONSE);
    render(<ResumeFileUpload onComplete={onComplete} onCancel={onCancel} />);

    const input = screen.getByTestId("resume-file-input");
    fireEvent.change(input, { target: { files: [makePdf()] } });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /back to chat/i }),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /back to chat/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
