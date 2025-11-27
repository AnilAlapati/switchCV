import { renderHook, act } from "@testing-library/react";
import {
  useAuditLog,
  useNotificationPreferences,
  usePersonalAuditLogs,
  ClientAuditAction,
} from "../../hooks/useAuditLog";
import { auth, functions } from "@/lib/firebase";
import { addDoc, getDoc, updateDoc, query, getDocs } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { logger } from "@/lib/logger";

// Mock logger
jest.mock("@/lib/logger", () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

// Mock dependencies
jest.mock("@/lib/firebase", () => ({
  auth: {
    currentUser: {
      uid: "user123",
      email: "test@example.com",
    },
  },
  functions: {},
}));

jest.mock("firebase/firestore", () => ({
  __esModule: true,
  collection: jest.fn(),
  addDoc: jest.fn(),
  Timestamp: {
    now: jest.fn(() => "mock-timestamp"),
  },
  getDoc: jest.fn(),
  doc: jest.fn(),
  updateDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  getDocs: jest.fn(),
}));

jest.mock("firebase/functions", () => ({
  httpsCallable: jest.fn(),
}));

describe("useAuditLog", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should log action successfully", async () => {
    const { result } = renderHook(() => useAuditLog());

    await act(async () => {
      await result.current.logAction({
        action: ClientAuditAction.PROFILE_VIEW,
        resourceType: "profile",
        resourceId: "p1",
      });
    });

    expect(addDoc).toHaveBeenCalledWith(
      undefined, // collection result (mocked as undefined by default)
      expect.objectContaining({
        userId: "user123",
        action: ClientAuditAction.PROFILE_VIEW,
        resourceType: "profile",
        resourceId: "p1",
      })
    );
  });

  it("should handle log action error gracefully", async () => {
    (addDoc as jest.Mock).mockRejectedValue(new Error("Log failed"));

    const { result } = renderHook(() => useAuditLog());

    await act(async () => {
      await result.current.logAction({
        action: ClientAuditAction.PROFILE_VIEW,
        resourceType: "profile",
      });
    });

    expect(logger.error).toHaveBeenCalled();
  });

  it("should not log if no user", async () => {
    const originalUser = auth.currentUser;
    // @ts-expect-error - Testing null user case
    auth.currentUser = null;

    const { result } = renderHook(() => useAuditLog());

    await act(async () => {
      await result.current.logAction({
        action: ClientAuditAction.PROFILE_VIEW,
        resourceType: "profile",
      });
    });

    expect(addDoc).not.toHaveBeenCalled();

    // Restore user
    // @ts-expect-error - Restoring user
    auth.currentUser = originalUser;
  });

  it("should log profile view", async () => {
    const { result } = renderHook(() => useAuditLog());

    await act(async () => {
      await result.current.logProfileView("p1", { meta: "data" });
    });

    expect(addDoc).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({
        action: ClientAuditAction.PROFILE_VIEW,
        resourceId: "p1",
        metadata: { meta: "data" },
      })
    );
  });
});

describe("useNotificationPreferences", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should get preferences", async () => {
    const mockPrefs = {
      recruiterRequests: true,
      profileViews: false,
      weeklyDigest: true,
      adminAlerts: false,
    };
    (getDoc as jest.Mock).mockResolvedValue({
      data: () => ({ notificationPreferences: mockPrefs }),
    });

    const { result } = renderHook(() => useNotificationPreferences());

    let prefs;
    await act(async () => {
      prefs = await result.current.getPreferences();
    });

    expect(prefs).toEqual(mockPrefs);
    expect(getDoc).toHaveBeenCalled();
  });

  it("should return default preferences if none exist", async () => {
    (getDoc as jest.Mock).mockResolvedValue({
      data: () => ({}),
    });

    const { result } = renderHook(() => useNotificationPreferences());

    let prefs;
    await act(async () => {
      prefs = await result.current.getPreferences();
    });

    expect(prefs).toEqual({
      recruiterRequests: true,
      profileViews: true,
      weeklyDigest: true,
      adminAlerts: true,
    });
  });

  it("should update preferences", async () => {
    const { result } = renderHook(() => useNotificationPreferences());

    await act(async () => {
      await result.current.updatePreferences({ weeklyDigest: false });
    });

    expect(updateDoc).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({
        notificationPreferences: { weeklyDigest: false },
      })
    );
  });
});

describe("usePersonalAuditLogs", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should get my audit logs", async () => {
    const mockLogs = [
      { id: "log1", action: "VIEW" },
      { id: "log2", action: "EDIT" },
    ];
    (getDocs as jest.Mock).mockResolvedValue({
      docs: mockLogs.map((log) => ({
        id: log.id,
        data: () => log,
      })),
    });

    const { result } = renderHook(() => usePersonalAuditLogs());

    let logs;
    await act(async () => {
      logs = await result.current.getMyAuditLogs();
    });

    expect(logs).toEqual(mockLogs);
    expect(query).toHaveBeenCalled();
    expect(getDocs).toHaveBeenCalled();
  });

  it("should export my data", async () => {
    const mockExportFn = jest.fn().mockResolvedValue({ data: "export-url" });
    (httpsCallable as jest.Mock).mockReturnValue(mockExportFn);

    const { result } = renderHook(() => usePersonalAuditLogs());

    let exportResult;
    await act(async () => {
      exportResult = await result.current.exportMyData();
    });

    expect(exportResult).toBe("export-url");
    expect(httpsCallable).toHaveBeenCalledWith(functions, "exportUserData");
    expect(mockExportFn).toHaveBeenCalledWith({ userId: "user123" });
  });
});
