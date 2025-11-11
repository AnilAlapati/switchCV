import React from "react";
import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";

// Mock Firebase completely before any imports
jest.mock("firebase/app", () => ({
  initializeApp: jest.fn(),
}));

jest.mock("firebase/auth", () => ({
  getAuth: jest.fn(),
}));

jest.mock("firebase/storage", () => ({
  getStorage: jest.fn(),
}));

jest.mock("firebase/functions", () => ({
  getFunctions: jest.fn(),
}));

// Mock Next.js navigation
const mockParams: { id?: string } = { id: "test-resume-id" };
jest.mock("next/navigation", () => ({
  useParams: () => mockParams,
}));

// Mock Firebase config
jest.mock("@/lib/firebase", () => ({
  db: "mock-db",
}));

// Mock resume data
const mockResumeData = {
  title: "Software Engineer Resume",
  summary: "Experienced software engineer with expertise in React and Node.js",
  skills: [
    { name: "JavaScript", level: "Expert" },
    { name: "React", level: "Expert" },
    { name: "Node.js", level: "Advanced" },
  ],
  experience: [
    {
      company: "Tech Corp",
      role: "Senior Developer",
      startDate: "Jan 2020",
      endDate: "Present",
      description: "Led development of web applications",
    },
  ],
  education: [
    {
      institution: "University of Tech",
      degree: "Bachelor of Science",
      startDate: "2016",
      endDate: "2020",
      description: "Computer Science major",
    },
  ],
  contact: {
    email: { value: "john.doe@example.com", visibility: "public" },
    phone: { value: "+1234567890", visibility: "public" },
  },
  projects: [
    {
      name: "Portfolio Website",
      description: "Personal portfolio built with React",
      url: "https://portfolio.example.com",
    },
  ],
  generatedText: {
    polished: JSON.stringify({
      enhancedSummary:
        "Highly skilled software engineer with extensive experience...",
      enhancedExperience: [
        {
          enhancedDescription:
            "Successfully led development teams and delivered complex projects...",
        },
      ],
      skillSuggestions: ["TypeScript", "AWS"],
    }),
  },
  lastUpdatedAt: "2024-01-15T10:00:00Z",
};

// Mock firestore completely with inline functions
jest.mock("firebase/firestore", () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
}));

// Import component after all mocks are set up
import PublicResume from "@/app/resume/[id]/page";
import { collection, query, where, getDocs } from "firebase/firestore";

describe("PublicResume", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set up default success mock
    (getDocs as jest.Mock).mockResolvedValue({
      empty: false,
      docs: [
        {
          data: () => mockResumeData,
        },
      ],
    });
    mockParams.id = "test-resume-id";
  });

  it("should show loading state initially", () => {
    render(<PublicResume />);

    expect(screen.getByText("Loading resume...")).toBeInTheDocument();
  });

  it("should fetch resume data on mount", async () => {
    render(<PublicResume />);

    await waitFor(() => {
      expect(collection).toHaveBeenCalledWith("mock-db", "resumeProfiles");
      expect(where).toHaveBeenCalledWith("slug", "==", "test-resume-id");
      expect(query).toHaveBeenCalled();
      expect(getDocs).toHaveBeenCalled();
    });
  });

  it("should display resume title and header", async () => {
    render(<PublicResume />);

    await waitFor(() => {
      expect(screen.getByText("Software Engineer Resume")).toBeInTheDocument();
      expect(screen.getByText("Professional Resume")).toBeInTheDocument();
    });
  });

  it("should handle resume not found", async () => {
    (getDocs as jest.Mock).mockResolvedValueOnce({
      empty: true,
      docs: [],
    });

    render(<PublicResume />);

    await waitFor(() => {
      expect(screen.getByText("Resume not found")).toBeInTheDocument();
    });
  });

  it("should handle fetch error", async () => {
    (getDocs as jest.Mock).mockRejectedValueOnce(new Error("Network error"));

    render(<PublicResume />);

    await waitFor(() => {
      expect(screen.getByText("Failed to load resume")).toBeInTheDocument();
    });
  });
});
