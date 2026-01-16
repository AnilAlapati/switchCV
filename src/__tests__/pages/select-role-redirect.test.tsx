import { render, screen, waitFor } from "@testing-library/react";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useRouter } from "next/navigation";
import SelectRolePage from "@/app/select-role/page";

jest.mock("@/hooks/useAuth");
jest.mock("@/hooks/useUserProfile");
jest.mock("next/navigation");
jest.mock("firebase/firestore", () => ({
    doc: jest.fn(),
    setDoc: jest.fn(),
    increment: jest.fn(),
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

describe("SelectRolePage Redirection", () => {
    const mockPush = jest.fn();
    const mockReplace = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        mockUseRouter.mockReturnValue({
            push: mockPush,
            replace: mockReplace,
        } as any);
    });

    it("should redirect to /dashboard if user already has a role (jobseeker)", async () => {
        mockUseAuth.mockReturnValue({
            user: { uid: "user123" },
            loading: false,
        } as any);

        mockUseUserProfile.mockReturnValue({
            role: "jobseeker",
            loading: false,
        } as any);

        render(<SelectRolePage />);

        await waitFor(() => {
            expect(mockReplace).toHaveBeenCalledWith("/dashboard");
        });
    });

    it("should redirect to /dashboard if user already has a role (recruiter)", async () => {
        mockUseAuth.mockReturnValue({
            user: { uid: "user123" },
            loading: false,
        } as any);

        mockUseUserProfile.mockReturnValue({
            role: "recruiter",
            loading: false,
        } as any);

        render(<SelectRolePage />);

        await waitFor(() => {
            expect(mockReplace).toHaveBeenCalledWith("/dashboard");
        });
    });

    it("should NOT redirect if user has no role", () => {
        mockUseAuth.mockReturnValue({
            user: { uid: "user123" },
            loading: false,
        } as any);

        mockUseUserProfile.mockReturnValue({
            role: undefined,
            loading: false,
        } as any);

        render(<SelectRolePage />);

        expect(screen.getByText("How will you use SwitchCV?")).toBeInTheDocument();
        expect(mockReplace).not.toHaveBeenCalledWith("/dashboard");
    });
});
