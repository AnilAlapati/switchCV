import { render, screen, fireEvent } from "@testing-library/react";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useRouter } from "next/navigation";
import SelectRolePage from "@/app/select-role/page";

jest.mock("@/hooks/useAuth");
jest.mock("@/hooks/useUserProfile");
jest.mock("next/navigation");
jest.mock("firebase/firestore");
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

describe("SelectRolePage", () => {
  const mockPush = jest.fn();
  const mockReplace = jest.fn();
  const mockMutate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
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

    const spinner = container.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
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
      user: { uid: "user123", email: "test@example.com" },
      loading: false,
    } as any);

    render(<SelectRolePage />);

    expect(screen.getByText("How will you use SwitchCV?")).toBeInTheDocument();
    expect(screen.getByText("Job Seeker")).toBeInTheDocument();
    expect(screen.getByText("Recruiter")).toBeInTheDocument();
  });

  it("should highlight selected role when clicked", () => {
    mockUseAuth.mockReturnValue({
      user: { uid: "user123", email: "test@example.com" },
      loading: false,
    } as any);

    render(<SelectRolePage />);

    const jobSeekerButton = screen.getByText("Job Seeker").closest("button");
    fireEvent.click(jobSeekerButton!);

    expect(jobSeekerButton).toHaveClass("border-teal-400/50");
  });

  it("should show jobseeker features", () => {
    mockUseAuth.mockReturnValue({
      user: { uid: "user123", email: "test@example.com" },
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
      user: { uid: "user123", email: "test@example.com" },
      loading: false,
    } as any);

    render(<SelectRolePage />);

    expect(screen.getByText("AI-powered candidate search")).toBeInTheDocument();
    expect(screen.getByText("Request contact information")).toBeInTheDocument();
    expect(screen.getByText("Manage candidate pipeline")).toBeInTheDocument();
  });

  it("should allow switching between roles before submission", () => {
    mockUseAuth.mockReturnValue({
      user: { uid: "user123", email: "test@example.com" },
      loading: false,
    } as any);

    render(<SelectRolePage />);

    const jobSeekerButton = screen.getByText("Job Seeker").closest("button");
    const recruiterButton = screen.getByText("Recruiter").closest("button");

    fireEvent.click(jobSeekerButton!);
    expect(jobSeekerButton).toHaveClass("border-teal-400/50");

    fireEvent.click(recruiterButton!);
    expect(recruiterButton).toHaveClass("border-blue-400/50");
  });

  it("should display both role options", () => {
    mockUseAuth.mockReturnValue({
      user: { uid: "user123", email: "test@example.com" },
      loading: false,
    } as any);

    render(<SelectRolePage />);

    const jobSeekerButton = screen.getByText("Job Seeker").closest("button");
    const recruiterButton = screen.getByText("Recruiter").closest("button");

    expect(jobSeekerButton).toBeInTheDocument();
    expect(recruiterButton).toBeInTheDocument();
    expect(jobSeekerButton).not.toBeDisabled();
    expect(recruiterButton).not.toBeDisabled();
  });
});
