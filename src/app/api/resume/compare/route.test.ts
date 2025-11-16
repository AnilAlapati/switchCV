 

import { NextRequest } from "next/server";
import { POST } from "./route";
import { compareResumes } from "@/lib/resumeComparison";

// Mock the resumeComparison module
jest.mock("@/lib/resumeComparison", () => ({
  compareResumes: jest.fn(),
}));

describe("POST /api/resume/compare", () => {
  let mockCompareResumes: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCompareResumes = compareResumes as jest.Mock;
  });

  describe("Input Validation", () => {
    it("should return 400 when resume1 is missing", async () => {
      const request = new NextRequest("http://localhost", {
        method: "POST",
        body: JSON.stringify({ resume2: {} }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Both resume1 and resume2 are required");
    });

    it("should return 400 when resume2 is missing", async () => {
      const request = new NextRequest("http://localhost", {
        method: "POST",
        body: JSON.stringify({ resume1: {} }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Both resume1 and resume2 are required");
    });

    it("should return 400 when both resumes are missing", async () => {
      const request = new NextRequest("http://localhost", {
        method: "POST",
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Both resume1 and resume2 are required");
    });
  });

  describe("Resume Format Validation", () => {
    it("should return 400 when resume1 has invalid format", async () => {
      const request = new NextRequest("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          resume1: {
            title: "Developer",
            skills: ["JS"],
            experience: [],
            education: [],
          }, // missing id
          resume2: {
            id: "2",
            title: "Developer",
            skills: ["JS"],
            experience: [],
            education: [],
          },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid resume format");
    });

    it("should return 400 when resume2 has invalid format", async () => {
      const request = new NextRequest("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          resume1: {
            id: "1",
            title: "Developer",
            skills: ["JS"],
            experience: [],
            education: [],
          },
          resume2: {
            title: "Developer",
            skills: ["JS"],
            experience: [],
            education: [],
          }, // missing id
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid resume format");
    });

    it("should return 400 when resume format is invalid - non-object", async () => {
      const request = new NextRequest("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          resume1: "invalid",
          resume2: {
            id: "2",
            title: "Developer",
            skills: ["JS"],
            experience: [],
            education: [],
          },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid resume format");
    });
  });

  describe("Successful Comparison", () => {
    const validResume1 = {
      id: "resume-1",
      title: "Senior JavaScript Developer",
      skills: ["JavaScript", "React", "Node.js", "TypeScript"],
      experience: [
        {
          company: "Tech Corp",
          position: "Senior Developer",
          duration: "3 years",
        },
      ],
      education: [
        { degree: "BS Computer Science", school: "University", year: "2020" },
      ],
    };

    const validResume2 = {
      id: "resume-2",
      title: "Full Stack Developer",
      skills: ["JavaScript", "Vue.js", "Python", "Django"],
      experience: [
        { company: "Startup Inc", position: "Developer", duration: "2 years" },
      ],
      education: [
        { degree: "BA Software Engineering", school: "College", year: "2019" },
      ],
    };

    it("should successfully compare two valid resumes", async () => {
      const mockResult = {
        similarity: 0.75,
        skillMatches: ["JavaScript"],
        skillGaps: ["React", "Vue.js"],
        experienceComparison: "Similar experience levels",
        educationComparison: "Comparable education backgrounds",
        recommendations: ["Consider highlighting React experience"],
      };

      mockCompareResumes.mockReturnValue(mockResult);

      const request = new NextRequest("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          resume1: validResume1,
          resume2: validResume2,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockResult);
      expect(mockCompareResumes).toHaveBeenCalledWith(
        validResume1,
        validResume2
      );
    });

    it("should handle resumes with different skill sets", async () => {
      const resumeWithDifferentSkills = {
        ...validResume2,
        skills: ["Python", "Django", "PostgreSQL", "AWS"],
      };

      const mockResult = {
        similarity: 0.3,
        skillMatches: [],
        skillGaps: [
          "JavaScript",
          "React",
          "Node.js",
          "TypeScript",
          "Python",
          "Django",
          "PostgreSQL",
          "AWS",
        ],
        experienceComparison: "Different experience focus",
        educationComparison: "Similar education levels",
        recommendations: ["Skills are quite different"],
      };

      mockCompareResumes.mockReturnValue(mockResult);

      const request = new NextRequest("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          resume1: validResume1,
          resume2: resumeWithDifferentSkills,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockResult);
    });

    it("should handle identical resumes", async () => {
      const mockResult = {
        similarity: 1.0,
        skillMatches: ["JavaScript", "React", "Node.js", "TypeScript"],
        skillGaps: [],
        experienceComparison: "Identical experience",
        educationComparison: "Identical education",
        recommendations: ["Resumes are very similar"],
      };

      mockCompareResumes.mockReturnValue(mockResult);

      const request = new NextRequest("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          resume1: validResume1,
          resume2: validResume1, // Same resume
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.similarity).toBe(1.0);
      expect(data.skillGaps).toEqual([]);
    });
  });

  describe("Error Handling", () => {
    it("should handle comparison function errors", async () => {
      mockCompareResumes.mockImplementation(() => {
        throw new Error("Comparison algorithm failed");
      });

      const request = new NextRequest("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          resume1: {
            id: "1",
            title: "Developer",
            skills: ["JS"],
            experience: [],
            education: [],
          },
          resume2: {
            id: "2",
            title: "Developer",
            skills: ["JS"],
            experience: [],
            education: [],
          },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to compare resumes");
      expect(data.details).toBe("Comparison algorithm failed");
    });

    it("should handle unknown errors", async () => {
      mockCompareResumes.mockImplementation(() => {
        throw "Unknown error";
      });

      const request = new NextRequest("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          resume1: {
            id: "1",
            title: "Developer",
            skills: ["JS"],
            experience: [],
            education: [],
          },
          resume2: {
            id: "2",
            title: "Developer",
            skills: ["JS"],
            experience: [],
            education: [],
          },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to compare resumes");
      expect(data.details).toBe("Unknown error");
    });
  });
});
