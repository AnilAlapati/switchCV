import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NotificationsMenu } from "../NotificationsMenu";
import { useAuth } from "@/hooks/useAuth";
import { onSnapshot } from "firebase/firestore";
import { logger } from "@/lib/logger";

jest.mock("@/hooks/useAuth", () => ({
    useAuth: jest.fn(),
}));

jest.mock("firebase/firestore", () => ({
    collection: jest.fn(),
    query: jest.fn(),
    where: jest.fn(),
    orderBy: jest.fn(),
    limit: jest.fn(),
    onSnapshot: jest.fn(),
}));

jest.mock("@/lib/firebase", () => ({
    db: {},
}));

jest.mock("@/lib/logger", () => ({
    logger: {
        error: jest.fn(),
    },
}));

global.fetch = jest.fn();

describe("NotificationsMenu", () => {
    const mockUser = { uid: "user-123" };
    const mockNotifs = [
        {
            id: "n1",
            status: "unread",
            payload: { title: "New View", body: "Someone viewed your resume" },
            createdAt: { toDate: () => new Date() },
        },
        {
            id: "n2",
            status: "read",
            payload: { title: "Welcome", body: "Welcome to SwitchCV" },
            createdAt: { toDate: () => new Date() },
        },
    ];

    beforeEach(() => {
        jest.clearAllMocks();
        (useAuth as jest.Mock).mockReturnValue({ user: mockUser });
        (onSnapshot as jest.Mock).mockImplementation((q, cb) => {
            cb({
                docs: mockNotifs.map(n => ({
                    id: n.id,
                    data: () => n,
                })),
            });
            return jest.fn(); // unsubscribe
        });
    });

    it("renders unread count badge", () => {
        render(<NotificationsMenu />);
        expect(screen.getByText("1")).toBeInTheDocument();
    });

    it("opens menu and displays notifications", () => {
        render(<NotificationsMenu />);
        fireEvent.click(screen.getByRole("button"));
        expect(screen.getByText("Notifications")).toBeInTheDocument();
        expect(screen.getByText("New View")).toBeInTheDocument();
        expect(screen.getByText("Welcome")).toBeInTheDocument();
    });

    it("shows empty state when no notifications", () => {
        (onSnapshot as jest.Mock).mockImplementation((q, cb) => {
            cb({ docs: [] });
            return jest.fn();
        });
        render(<NotificationsMenu />);
        fireEvent.click(screen.getByRole("button"));
        expect(screen.getByText("No notifications")).toBeInTheDocument();
    });

    it("marks notification as read on click", async () => {
        (global.fetch as jest.Mock).mockResolvedValue({ ok: true });
        render(<NotificationsMenu />);
        fireEvent.click(screen.getByRole("button"));
        fireEvent.click(screen.getByText("New View"));

        expect(global.fetch).toHaveBeenCalledWith("/api/notifications", expect.objectContaining({
            method: "POST",
            body: expect.stringContaining("mark-read"),
        }));

        await waitFor(() => {
            expect(screen.queryByText("1")).not.toBeInTheDocument();
        });
    });

    it("handles fetch error when marking as read", async () => {
        (global.fetch as jest.Mock).mockRejectedValue(new Error("Network error"));
        render(<NotificationsMenu />);
        fireEvent.click(screen.getByRole("button"));
        fireEvent.click(screen.getByText("New View"));

        await waitFor(() => {
            expect(logger.error).toHaveBeenCalled();
        });
    });

    it("handles firestore subscription error", () => {
        (onSnapshot as jest.Mock).mockImplementation((q, success, error) => {
            error(new Error("Firestore Error"));
            return jest.fn();
        });
        render(<NotificationsMenu />);
        expect(logger.error).toHaveBeenCalledWith(expect.anything(), "Firestore notifications subscription error");
    });

    it("closes when clicking outside", () => {
        render(<NotificationsMenu />);
        fireEvent.click(screen.getByRole("button"));
        expect(screen.getByText("Notifications")).toBeInTheDocument();

        fireEvent.mouseDown(document.body);
        expect(screen.queryByText("Notifications")).not.toBeInTheDocument();
    });
});
