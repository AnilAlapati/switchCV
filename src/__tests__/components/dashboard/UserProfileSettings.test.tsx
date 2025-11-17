import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { UserProfileSettings } from "@/components/dashboard/UserProfileSettings";
import { useAuth } from "@/hooks/useAuth";

// Mock the useAuth hook
jest.mock("@/hooks/useAuth", () => ({
  useAuth: jest.fn(),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("UserProfileSettings", () => {
  const mockUser = {
    uid: "test-user-id",
    email: "test@example.com",
    emailVerified: true,
    isAnonymous: false,
    metadata: {},
    providerData: [],
    refreshToken: "",
    tenantId: null,
    delete: jest.fn(),
    getIdToken: jest.fn(),
    getIdTokenResult: jest.fn(),
    reload: jest.fn(),
    toJSON: jest.fn(),
    displayName: null,
    phoneNumber: null,
    photoURL: null,
    providerId: "",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      signIn: jest.fn(),
      signUp: jest.fn(),
      logout: jest.fn(),
    });
  });

  describe("Loading State", () => {
    it("displays loading skeleton when loading", () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: true,
        signIn: jest.fn(),
        signUp: jest.fn(),
        logout: jest.fn(),
      });

      render(<UserProfileSettings />);

      // Check for loading skeleton structure
      const loadingSkeleton = document.querySelector(".animate-pulse");
      expect(loadingSkeleton).toBeInTheDocument();
    });

    it("fetches profile data on mount when user is available", async () => {
      const mockProfileData = {
        isRecruiter: true,
        displayName: "Test User",
        companyName: "Test Company",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockProfileData),
      });

      render(<UserProfileSettings />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          `/api/user/profile?userId=${mockUser.uid}`
        );
      });
    });
  });

  describe("Profile Display", () => {
    it("displays user email and account type", async () => {
      const mockProfileData = {
        isRecruiter: false,
        displayName: "Test User",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockProfileData),
      });

      render(<UserProfileSettings />);

      await waitFor(() => {
        expect(screen.getByText("test@example.com")).toBeInTheDocument();
        expect(screen.getByText("Job Seeker")).toBeInTheDocument();
      });
    });

    it("displays recruiter account type when user is recruiter", async () => {
      const mockProfileData = {
        isRecruiter: true,
        companyName: "Test Company",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockProfileData),
      });

      render(<UserProfileSettings />);

      await waitFor(() => {
        expect(screen.getByText("Recruiter")).toBeInTheDocument();
      });
    });
  });

  describe("Recruiter Toggle", () => {
    it("toggles from job seeker to recruiter successfully", async () => {
      const mockProfileData = {
        isRecruiter: false,
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockProfileData),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        });

      render(<UserProfileSettings />);

      await waitFor(() => {
        expect(screen.getByText("Job Seeker")).toBeInTheDocument();
      });

      const toggleButton = screen.getByRole("button");
      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/user/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uid: mockUser.uid,
            isRecruiter: true,
          }),
        });
      });

      expect(screen.getByText("Account type updated!")).toBeInTheDocument();
    });

    it("shows error message when toggle fails", async () => {
      const mockProfileData = {
        isRecruiter: false,
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockProfileData),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
          json: () => Promise.resolve({ error: "Server error" }),
        });

      render(<UserProfileSettings />);

      await waitFor(() => {
        expect(screen.getByText("Job Seeker")).toBeInTheDocument();
      });

      const toggleButton = screen.getByRole("button");
      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByText("Server error")).toBeInTheDocument();
      });
    });
  });

  describe("Company Name Management", () => {
    it("shows company input when user becomes recruiter", async () => {
      const mockProfileData = {
        isRecruiter: false,
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockProfileData),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        });

      render(<UserProfileSettings />);

      await waitFor(() => {
        expect(screen.getByText("Job Seeker")).toBeInTheDocument();
      });

      const toggleButton = screen.getByRole("button");
      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByLabelText("Company Name")).toBeInTheDocument();
      });
    });

    it("saves company name successfully", async () => {
      const mockProfileData = {
        isRecruiter: true,
        companyName: "Old Company",
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockProfileData),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        });

      render(<UserProfileSettings />);

      await waitFor(() => {
        expect(screen.getByDisplayValue("Old Company")).toBeInTheDocument();
      });

      const input = screen.getByDisplayValue("Old Company");
      fireEvent.change(input, { target: { value: "New Company" } });

      const saveButton = screen.getByText("Save");
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/user/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uid: mockUser.uid,
            companyName: "New Company",
          }),
        });
      });

      expect(screen.getByText("Company name saved!")).toBeInTheDocument();
    });

    it("shows error when saving empty company name", async () => {
      const mockProfileData = {
        isRecruiter: true,
        companyName: "",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockProfileData),
      });

      render(<UserProfileSettings />);

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText("Enter your company name")
        ).toBeInTheDocument();
      });

      const saveButton = screen.getByText("Save");
      fireEvent.click(saveButton);

      expect(
        screen.getByText("Please enter a company name.")
      ).toBeInTheDocument();
    });
  });

  describe("UI Rendering", () => {
    it("renders all UI elements correctly", async () => {
      const mockProfileData = {
        isRecruiter: true,
        companyName: "Test Company",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockProfileData),
      });

      render(<UserProfileSettings />);

      await waitFor(() => {
        expect(screen.getByText("Profile Settings")).toBeInTheDocument();
        expect(screen.getByText("test@example.com")).toBeInTheDocument();
        expect(screen.getByText("Recruiter")).toBeInTheDocument();
        expect(screen.getByText("Recruiter Account")).toBeInTheDocument();
        expect(screen.getByLabelText("Company Name")).toBeInTheDocument();
        expect(screen.getByDisplayValue("Test Company")).toBeInTheDocument();
        expect(screen.getByText("Save")).toBeInTheDocument();
      });
    });
  });
});
