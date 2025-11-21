import { render, screen, waitFor } from "@testing-library/react";
import ResumeView from "@/app/resume/[id]/page";
import { useParams } from "next/navigation";
import { getDoc } from "firebase/firestore";

jest.mock("next/navigation", () => ({
  useParams: jest.fn(),
}));

jest.mock("firebase/firestore", () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  getFirestore: jest.fn(),
}));

jest.mock("@/lib/firebase", () => ({
  db: {},
}));

describe("ResumeView", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should show loading state initially", () => {
    (useParams as jest.Mock).mockReturnValue({ id: "123" });
    // Mock getDoc to not resolve immediately to test loading state
    (getDoc as jest.Mock).mockReturnValue(new Promise(() => {}));

    render(<ResumeView />);
    expect(screen.getByText("Loading resume...")).toBeInTheDocument();
  });

  it("should show resume not found if doc does not exist", async () => {
    (useParams as jest.Mock).mockReturnValue({ id: "123" });
    (getDoc as jest.Mock).mockResolvedValue({
      exists: () => false,
    });

    render(<ResumeView />);

    await waitFor(() => {
      expect(screen.getByText("Resume not found")).toBeInTheDocument();
    });
  });

  it("should render resume data when found", async () => {
    (useParams as jest.Mock).mockReturnValue({ id: "123" });
    const mockResume = {
      title: "My Resume",
      numericId: 1001,
      updatedAt: new Date().toISOString(),
      summary: "My summary",
      skills: ["React", "Node"],
    };
    (getDoc as jest.Mock).mockResolvedValue({
      exists: () => true,
      data: () => mockResume,
    });

    render(<ResumeView />);

    await waitFor(() => {
      expect(screen.getByText("My Resume")).toBeInTheDocument();
      expect(screen.getByText("1001")).toBeInTheDocument();
      expect(screen.getByText("My summary")).toBeInTheDocument();
      expect(screen.getByText("React")).toBeInTheDocument();
    });
  });

  it("should handle errors", async () => {
    (useParams as jest.Mock).mockReturnValue({ id: "123" });
    (getDoc as jest.Mock).mockRejectedValue(new Error("Fetch error"));

    render(<ResumeView />);

    await waitFor(() => {
      // It stays on loading or shows not found?
      // The code sets loading to false in finally block.
      // If resume is null (initial state), it shows "Resume not found".
      expect(screen.getByText("Resume not found")).toBeInTheDocument();
    });
  });
});
