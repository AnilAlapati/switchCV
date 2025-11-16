/**
 * Tests for /api/admin/init-system route
 */

import { GET, POST } from "@/app/api/admin/init-system/route";
import {
  initializeIdCounter,
  getCurrentIdCounter,
} from "@/lib/numericIdGenerator";

jest.mock("@/lib/numericIdGenerator", () => ({
  initializeIdCounter: jest.fn(),
  getCurrentIdCounter: jest.fn(),
}));

describe("POST /api/admin/init-system", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should initialize system successfully", async () => {
    const mockCounter = 5;
    (initializeIdCounter as jest.Mock).mockResolvedValue(undefined);
    (getCurrentIdCounter as jest.Mock).mockResolvedValue(mockCounter);

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe("✅ System initialized successfully");
    expect(data.status).toBe("initialized");
    expect(data.counter.currentId).toBe(mockCounter);
    expect(data.nextResumeId).toBe(mockCounter + 1);
    expect(data.firebaseLocation).toBe("system/resumeIdCounter");

    expect(initializeIdCounter).toHaveBeenCalledTimes(1);
    expect(getCurrentIdCounter).toHaveBeenCalledTimes(1);
  });

  it("should handle initialization error", async () => {
    const mockError = new Error("Database connection failed");
    (initializeIdCounter as jest.Mock).mockRejectedValue(mockError);

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.message).toBe("❌ Failed to initialize system");
    expect(data.error).toBe("Database connection failed");

    expect(initializeIdCounter).toHaveBeenCalledTimes(1);
    expect(getCurrentIdCounter).not.toHaveBeenCalled();
  });

  it("should handle unknown error", async () => {
    (initializeIdCounter as jest.Mock).mockRejectedValue("Unknown error");

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.message).toBe("❌ Failed to initialize system");
    expect(data.error).toBe("Unknown error");
  });
});

describe("GET /api/admin/init-system", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return system status successfully", async () => {
    const mockCounter = 10;
    (getCurrentIdCounter as jest.Mock).mockResolvedValue(mockCounter);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe("✅ System status retrieved");
    expect(data.status).toBe("active");
    expect(data.counter.currentId).toBe(mockCounter);
    expect(data.nextResumeId).toBe(mockCounter + 1);
    expect(data.firebaseLocation).toBe(
      "system/resumeIdCounter (document path: system/resumeIdCounter)"
    );

    expect(getCurrentIdCounter).toHaveBeenCalledTimes(1);
  });

  it("should handle status check error", async () => {
    const mockError = new Error("Firebase error");
    (getCurrentIdCounter as jest.Mock).mockRejectedValue(mockError);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.message).toBe("❌ Failed to check system status");
    expect(data.error).toBe("Firebase error");

    expect(getCurrentIdCounter).toHaveBeenCalledTimes(1);
  });

  it("should handle unknown error in GET", async () => {
    (getCurrentIdCounter as jest.Mock).mockRejectedValue(null);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.message).toBe("❌ Failed to check system status");
    expect(data.error).toBe("Unknown error");
  });
});
