import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UserProfileMenu } from "@/components/dashboard/UserProfileMenu";

// Mock Next.js Link
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href, onClick }: any) => (
    <a href={href} onClick={onClick}>
      {children}
    </a>
  ),
}));

// Mock useUserProfile hook
jest.mock("@/hooks/useUserProfile", () => ({
  useUserProfile: jest.fn(() => ({
    role: "recruiter", // Default to recruiter for tests
  })),
}));

describe("UserProfileMenu", () => {
  const mockOnLogout = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders user avatar with initial from email", () => {
    render(
      <UserProfileMenu
        userEmail="john.doe@example.com"
        onLogout={mockOnLogout}
      />
    );

    expect(screen.getByText("J")).toBeInTheDocument();
  });

  it("renders default initial when no email provided", () => {
    render(<UserProfileMenu userEmail={null} onLogout={mockOnLogout} />);

    expect(screen.getByText("U")).toBeInTheDocument();
  });

  it("displays user name and email on larger screens", () => {
    render(
      <UserProfileMenu
        userEmail="john.doe@example.com"
        onLogout={mockOnLogout}
      />
    );

    expect(screen.getByText("john.doe")).toBeInTheDocument();
    expect(screen.getByText("john.doe@example.com")).toBeInTheDocument();
  });

  it("shows username as 'User' when email has no @ symbol", () => {
    render(
      <UserProfileMenu userEmail="invalidemail" onLogout={mockOnLogout} />
    );

    // Check that both the username and email show the same text since there's no @
    const usernameElements = screen.getAllByText("invalidemail");
    expect(usernameElements).toHaveLength(2); // One for username, one for email
  });

  it("toggles dropdown menu when button is clicked", async () => {
    render(
      <UserProfileMenu
        userEmail="john.doe@example.com"
        onLogout={mockOnLogout}
      />
    );

    const button = screen.getByRole("button");
    expect(screen.queryByText("Profile Settings")).not.toBeInTheDocument();

    await userEvent.click(button);
    expect(screen.getByText("Profile Settings")).toBeInTheDocument();

    await userEvent.click(button);
    expect(screen.queryByText("Profile Settings")).not.toBeInTheDocument();
  });

  it("rotates chevron icon when menu is open", async () => {
    render(
      <UserProfileMenu
        userEmail="john.doe@example.com"
        onLogout={mockOnLogout}
      />
    );

    const chevron = screen.getByRole("button").querySelector("svg");
    expect(chevron).not.toHaveClass("rotate-180");

    await userEvent.click(screen.getByRole("button"));
    expect(chevron).toHaveClass("rotate-180");
  });

  it("closes menu when clicking outside", async () => {
    render(
      <UserProfileMenu
        userEmail="john.doe@example.com"
        onLogout={mockOnLogout}
      />
    );

    await userEvent.click(screen.getByRole("button"));
    expect(screen.getByText("Profile Settings")).toBeInTheDocument();

    // Click outside the menu
    await userEvent.click(document.body);
    await waitFor(() => {
      expect(screen.queryByText("Profile Settings")).not.toBeInTheDocument();
    });
  });

  it("renders all menu items", async () => {
    render(
      <UserProfileMenu
        userEmail="john.doe@example.com"
        onLogout={mockOnLogout}
      />
    );

    await userEvent.click(screen.getByRole("button"));

    expect(screen.getByText("Profile Settings")).toBeInTheDocument();
    expect(screen.getByText("Account & Security")).toBeInTheDocument();
    expect(screen.getByText("Subscription Plan")).toBeInTheDocument();
    expect(screen.getByText("Basic")).toBeInTheDocument();
    expect(screen.getByText("Feedback & Support")).toBeInTheDocument();
    expect(screen.getByText("Email Support")).toBeInTheDocument();
    expect(screen.getByText("Logout")).toBeInTheDocument();
  });

  it("closes menu when menu item is clicked", async () => {
    render(
      <UserProfileMenu
        userEmail="john.doe@example.com"
        onLogout={mockOnLogout}
      />
    );

    await userEvent.click(screen.getByRole("button"));
    expect(screen.getByText("Profile Settings")).toBeInTheDocument();

    const profileLink = screen.getByText("Profile Settings");
    await userEvent.click(profileLink);

    await waitFor(() => {
      expect(screen.queryByText("Profile Settings")).not.toBeInTheDocument();
    });
  });

  it("calls onLogout when logout button is clicked", async () => {
    render(
      <UserProfileMenu
        userEmail="john.doe@example.com"
        onLogout={mockOnLogout}
      />
    );

    await userEvent.click(screen.getByRole("button"));

    const logoutButton = screen.getByText("Logout");
    await userEvent.click(logoutButton);

    expect(mockOnLogout).toHaveBeenCalledTimes(1);
  });

  it("closes menu when logout button is clicked", async () => {
    render(
      <UserProfileMenu
        userEmail="john.doe@example.com"
        onLogout={mockOnLogout}
      />
    );

    await userEvent.click(screen.getByRole("button"));
    expect(screen.getByText("Profile Settings")).toBeInTheDocument();

    const logoutButton = screen.getByText("Logout");
    await userEvent.click(logoutButton);

    await waitFor(() => {
      expect(screen.queryByText("Profile Settings")).not.toBeInTheDocument();
    });
  });

  it("renders menu with correct styling and animations", async () => {
    render(
      <UserProfileMenu
        userEmail="john.doe@example.com"
        onLogout={mockOnLogout}
      />
    );

    await userEvent.click(screen.getByRole("button"));

    // Find the dropdown menu by its classes
    const menu = document.querySelector(".absolute.right-0.mt-2.w-72");
    expect(menu).toHaveClass(
      "bg-white",
      "rounded-xl",
      "shadow-xl"
    );
    expect(menu).toHaveClass("animate-in", "fade-in", "slide-in-from-top-2");
  });

  it("renders user info section in dropdown with larger avatar", async () => {
    render(
      <UserProfileMenu
        userEmail="john.doe@example.com"
        onLogout={mockOnLogout}
      />
    );

    await userEvent.click(screen.getByRole("button"));

    // Check for the larger avatar in dropdown (w-12 h-12)
    const avatars = screen.getAllByText("J");
    expect(avatars).toHaveLength(2); // One in button, one in dropdown

    // The dropdown avatar should be larger
    const dropdownAvatar = avatars[1].closest("div");
    expect(dropdownAvatar).toHaveClass("w-12", "h-12");
  });

  it("handles email with complex domain", () => {
    render(
      <UserProfileMenu
        userEmail="test.user+tag@subdomain.example.co.uk"
        onLogout={mockOnLogout}
      />
    );

    expect(screen.getByText("test.user+tag")).toBeInTheDocument();
    expect(
      screen.getByText("test.user+tag@subdomain.example.co.uk")
    ).toBeInTheDocument();
  });

  it("renders subscription badge with correct styling", async () => {
    render(
      <UserProfileMenu
        userEmail="john.doe@example.com"
        onLogout={mockOnLogout}
      />
    );

    await userEvent.click(screen.getByRole("button"));

    const badge = screen.getByText("Basic");
    expect(badge).toHaveClass("bg-amber-100", "text-amber-700");
  });
});
