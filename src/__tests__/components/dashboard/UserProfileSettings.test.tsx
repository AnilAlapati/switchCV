import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("@/hooks/useAuth", () => {
  const mockUser = {
    uid: "test-uid",
    email: "test@example.com",
    getIdToken: jest.fn().mockResolvedValue("mock-id-token"),
  };
  return {
    useAuth: () => ({
      user: mockUser,
    }),
  };
});

import { UserProfileSettings } from "@/components/dashboard/UserProfileSettings";

describe("UserProfileSettings", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  test("fetches and displays profile info", async () => {
    const mockProfile = {
      isRecruiter: false,
      companyName: "",
      updatedAt: "now",
    };
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => mockProfile });

    render(<UserProfileSettings />);

    await waitFor(() =>
      expect(screen.getByText(/Profile Settings/i)).toBeInTheDocument()
    );

    expect(screen.getByText("test@example.com")).toBeInTheDocument();
    expect(screen.getByText(/Job Seeker/i)).toBeInTheDocument();
  });

  test("toggles recruiter status and shows success message", async () => {
    const mockProfile = { isRecruiter: false, companyName: "" };

    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => mockProfile })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    render(<UserProfileSettings />);

    await waitFor(() =>
      expect(screen.getByText(/Job Seeker/i)).toBeInTheDocument()
    );

    const toggle = screen.getByRole("switch");
    await userEvent.click(toggle);
    // Ensure a POST request to update role was made
    await waitFor(() => {
      const calls = (global.fetch as jest.Mock).mock.calls;
      const hasPost = calls.some((c: [string, { method?: string }]) => c[1] && c[1].method === "POST");
      expect(hasPost).toBe(true);
    });
  });

  test("saves company name when recruiter", async () => {
    const mockProfile = { isRecruiter: true, companyName: "Acme" };

    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => mockProfile })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    render(<UserProfileSettings />);

    await waitFor(() =>
      expect(screen.getByLabelText(/Company Name/i)).toBeInTheDocument()
    );

    const input = screen.getByLabelText(/Company Name/i) as HTMLInputElement;
    expect(input.value).toBe("Acme");

    await userEvent.clear(input);
    await userEvent.type(input, "NewCo");
    // find a button that contains 'Save' (some buttons may not have accessible name)

    const saveButton = screen.getByText("Save");
    await userEvent.click(saveButton);

    // verify PUT was called with updated company name
    await waitFor(() => {
      const calls = (global.fetch as jest.Mock).mock.calls;
      const putCall = calls.find((c: [string, { method?: string }]) => c[1] && c[1].method === "PUT");
      expect(putCall).toBeTruthy();
      const body = JSON.parse(putCall[1].body);
      expect(body.companyName).toBe("NewCo");
    });

  });
});
