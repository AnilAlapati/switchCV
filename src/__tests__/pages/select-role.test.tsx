import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useRouter } from "next/navigation";
import { doc, setDoc } from "firebase/firestore";
import SelectRolePage from "@/app/select-role/page";

jest.mock("@/hooks/useAuth");
jest.mock("@/hooks/useUserProfile");
jest.mock("next/navigation");
jest.mock("firebase/firestore", () => ({
  doc: jest.fn(),
  setDoc: jest.fn(),
  serverTimestamp: jest.fn(() => "mock-timestamp"),
  increment: jest.fn((n) => n),
}));
jest.mock("@/lib/firebase", () => ({
  db: {},
}));
jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseUserProfile = useUserProfile as jest.MockedFunction<
  typeof useUserProfile
>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockSetDoc = setDoc as jest.MockedFunction<typeof setDoc>;
const mockDoc = doc as jest.MockedFunction<typeof doc>;

describe("SelectRolePage", () => {
  const mockPush = jest.fn();
  const mockReplace = jest.fn();
  const mockMutate = jest.fn();
  const mockGetIdToken = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    mockUseRouter.mockReturnValue({
      push: mockPush,
      replace: mockReplace,
    } as any);
    mockUseUserProfile.mockReturnValue({
      mutate: mockMutate,
    } as any);
  });

  it("should show loading spinner when loading", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: true,
    } as any);

    const { container } = render(<SelectRolePage />);

    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("should redirect to /auth when not logged in", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
    } as any);

    render(<SelectRolePage />);

    expect(mockReplace).toHaveBeenCalledWith("/auth");
  });

  it("should display role selection UI when user is authenticated", () => {
    mockUseAuth.mockReturnValue({
      user: {
        uid: "user123",
        email: "test@example.com",
        getIdToken: mockGetIdToken,
      },
      loading: false,
    } as any);

    render(<SelectRolePage />);

    expect(screen.getByText("How will you use SwitchCV?")).toBeInTheDocument();
    expect(screen.getByText("Job Seeker")).toBeInTheDocument();
    expect(screen.getByText("Recruiter")).toBeInTheDocument();
  });

  it("should highlight selected role when clicked", () => {
    mockUseAuth.mockReturnValue({
      user: {
        uid: "user123",
        email: "test@example.com",
        getIdToken: mockGetIdToken,
      },
      loading: false,
    } as any);

    render(<SelectRolePage />);

    const jobSeekerButton = screen.getByText("Job Seeker").closest("button");
    fireEvent.click(jobSeekerButton!);

    // The button should have active styling
    expect(jobSeekerButton).toHaveClass("border-teal-400");
  });

  it("should enable Continue button when role is selected", () => {
    mockUseAuth.mockReturnValue({
      user: {
        uid: "user123",
        email: "test@example.com",
        getIdToken: mockGetIdToken,
      },
      loading: false,
    } as any);

    render(<SelectRolePage />);

    const jobSeekerButton = screen.getByText("Job Seeker").closest("button");
    fireEvent.click(jobSeekerButton!);

    const continueButton = screen.getByText("Continue to Dashboard");
    expect(continueButton).not.toBeDisabled();
  });

  it("should submit jobseeker role and redirect to dashboard", async () => {
    mockUseAuth.mockReturnValue({
      user: {
        uid: "user123",
        email: "test@example.com",
        getIdToken: mockGetIdToken,
      },
      loading: false,
    } as any);

    mockGetIdToken.mockResolvedValue("mock-token");
    mockDoc.mockReturnValue({} as any);
    mockSetDoc.mockResolvedValue(undefined);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<SelectRolePage />);

    const jobSeekerButton = screen.getByText("Job Seeker").closest("button");
    fireEvent.click(jobSeekerButton!);

    const continueButton = screen.getByText("Continue to Dashboard");
    fireEvent.click(continueButton);

    await waitFor(() => {
      expect(mockSetDoc).toHaveBeenCalledTimes(1); // Only stats update, user doc is handled by API
      expect(mockMutate).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("should submit recruiter role and redirect to dashboard", async () => {
    mockUseAuth.mockReturnValue({
      user: {
        uid: "user456",
        email: "recruiter@example.com",
        getIdToken: mockGetIdToken,
      },
      loading: false,
    } as any);

    mockGetIdToken.mockResolvedValue("mock-token");
    mockDoc.mockReturnValue({} as any);
    mockSetDoc.mockResolvedValue(undefined);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<SelectRolePage />);

    const recruiterButton = screen.getByText("Recruiter").closest("button");
    fireEvent.click(recruiterButton!);

    const continueButton = screen.getByText("Continue to Dashboard");
    fireEvent.click(continueButton);

    await waitFor(() => {
      expect(mockSetDoc).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("should display error message when submission fails", async () => {
    mockUseAuth.mockReturnValue({
      user: {
        uid: "user789",
        email: "test@example.com",
        getIdToken: mockGetIdToken,
      },
      loading: false,
    } as any);

    mockGetIdToken.mockResolvedValue("mock-token");
    mockDoc.mockReturnValue({} as any);
    mockSetDoc.mockResolvedValue(undefined);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Something went wrong" }),
    });

    render(<SelectRolePage />);

    const jobSeekerButton = screen.getByText("Job Seeker").closest("button");
    fireEvent.click(jobSeekerButton!);

    const continueButton = screen.getByText("Continue to Dashboard");
    fireEvent.click(continueButton);

    await waitFor(() => {
      expect(
        screen.getByText("Error: Something went wrong")
      ).toBeInTheDocument();
    });
  });

  it("should disable buttons during submission", async () => {
    mockUseAuth.mockReturnValue({
      user: {
        uid: "user999",
        email: "test@example.com",
        getIdToken: mockGetIdToken,
      },
      loading: false,
    } as any);

    mockGetIdToken.mockResolvedValue("mock-token");
    mockDoc.mockReturnValue({} as any);
    mockSetDoc.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );
    (global.fetch as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: async () => ({ success: true }),
              }),
            100
          )
        )
    );

    render(<SelectRolePage />);

    const jobSeekerButton = screen.getByText("Job Seeker").closest("button");
    fireEvent.click(jobSeekerButton!);

    const continueButton = screen.getByText("Continue to Dashboard");
    fireEvent.click(continueButton);

    // Buttons should be disabled during submission
    expect(jobSeekerButton).toBeDisabled();
    expect(screen.getByText("Recruiter").closest("button")).toBeDisabled();

    await waitFor(() => {
      expect(mockSetDoc).toHaveBeenCalled();
    });
  });

  it("should show jobseeker features", () => {
    mockUseAuth.mockReturnValue({
      user: {
        uid: "user123",
        email: "test@example.com",
        getIdToken: mockGetIdToken,
      },
      loading: false,
    } as any);

    render(<SelectRolePage />);

    expect(screen.getByText("Create AI-powered resumes")).toBeInTheDocument();
    expect(screen.getByText("Track who views your resume")).toBeInTheDocument();
    expect(
      screen.getByText("Control your contact info privacy")
    ).toBeInTheDocument();
  });

  it("should show recruiter features", () => {
    mockUseAuth.mockReturnValue({
      user: {
        uid: "user123",
        email: "test@example.com",
        getIdToken: mockGetIdToken,
      },
      loading: false,
    } as any);

    render(<SelectRolePage />);

    expect(screen.getByText("AI-powered candidate search")).toBeInTheDocument();
    expect(screen.getByText("Request contact information")).toBeInTheDocument();
    expect(screen.getByText("Manage candidate pipeline")).toBeInTheDocument();
  });

  it("should allow switching between roles before submission", () => {
    mockUseAuth.mockReturnValue({
      user: {
        uid: "user123",
        email: "test@example.com",
        getIdToken: mockGetIdToken,
      },
      loading: false,
    } as any);

    render(<SelectRolePage />);

    const jobSeekerButton = screen.getByText("Job Seeker").closest("button");
    const recruiterButton = screen.getByText("Recruiter").closest("button");

    fireEvent.click(jobSeekerButton!);
    expect(jobSeekerButton).toHaveClass("border-teal-400");

    fireEvent.click(recruiterButton!);
    expect(recruiterButton).toHaveClass("border-blue-400");
  });

  it("should not submit if no role is selected", async () => {
    mockUseAuth.mockReturnValue({
      user: { uid: "user123", getIdToken: mockGetIdToken },
      loading: false,
    } as any);

    render(<SelectRolePage />);

    const continueButton = screen.getByText("Continue to Dashboard");
    // Force click even if disabled
    continueButton.removeAttribute("disabled");
    fireEvent.click(continueButton);

    expect(mockSetDoc).not.toHaveBeenCalled();
  });
});
