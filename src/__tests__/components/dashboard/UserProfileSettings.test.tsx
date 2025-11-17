import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { uid: "test-uid", email: "test@example.com" } }),
}));

import { UserProfileSettings } from "@/components/dashboard/UserProfileSettings";

describe("UserProfileSettings", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  test("fetches and displays profile info", async () => {
    const mockProfile = { isRecruiter: false, companyName: "", updatedAt: "now" };
    global.fetch = jest.fn().mockResolvedValueOnce({ ok: true, json: async () => mockProfile });

    render(<UserProfileSettings />);

    await waitFor(() => expect(screen.getByText(/Profile Settings/i)).toBeInTheDocument());

    expect(screen.getByText(/Email:/i)).toHaveTextContent("test@example.com");
    expect(screen.getByText(/Job Seeker/i)).toBeInTheDocument();
  });

  test("toggles recruiter status and shows success message", async () => {
    const mockProfile = { isRecruiter: false, companyName: "" };

    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => mockProfile })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    render(<UserProfileSettings />);

    await waitFor(() => expect(screen.getByText(/Job Seeker/i)).toBeInTheDocument());

    const buttons = screen.getAllByRole("button");
    await userEvent.click(buttons[0]);

    await waitFor(() => expect(screen.getByText(/Recruiter/i)).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText(/Account type updated!/i)).toBeInTheDocument());
  });

  test("saves company name when recruiter", async () => {
    const mockProfile = { isRecruiter: true, companyName: "Acme" };

    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => mockProfile })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    render(<UserProfileSettings />);

    await waitFor(() => expect(screen.getByLabelText(/Company Name/i)).toBeInTheDocument());

    const input = screen.getByLabelText(/Company Name/i) as HTMLInputElement;
    expect(input.value).toBe("Acme");

    await userEvent.clear(input);
    await userEvent.type(input, "NewCo");

    const saveButton = screen.getByRole("button", { name: /Save/i });
    await userEvent.click(saveButton);

    await waitFor(() => expect(screen.getByText(/Company name saved!/i)).toBeInTheDocument());
  });
});
