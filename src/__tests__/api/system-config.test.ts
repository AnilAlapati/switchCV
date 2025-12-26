import { NextResponse } from "next/server";
import { GET } from "@/app/api/system-config/route";
import { adminDb } from "@/lib/firebase-admin";
import {
  defaultSystemConfig,
  mergeWithDefaultConfig,
  type SystemConfig,
} from "@/lib/system-config";
import {
  validateSystemConfig,
  validateAICosts,
} from "@/lib/system-config-validator";
import { handleApiError } from "@/lib/utils/api-helpers";
import { logger } from "@/lib/logger";

jest.mock("@/lib/firebase-admin");
jest.mock("@/lib/system-config");
jest.mock("@/lib/system-config-validator");
jest.mock("@/lib/utils/api-helpers");
jest.mock("@/lib/logger");

const mockAdminDb = adminDb as jest.Mocked<typeof adminDb>;
const mockMergeWithDefaultConfig =
  mergeWithDefaultConfig as jest.MockedFunction<typeof mergeWithDefaultConfig>;
const mockValidateSystemConfig = validateSystemConfig as jest.MockedFunction<
  typeof validateSystemConfig
>;
const mockValidateAICosts = validateAICosts as jest.MockedFunction<
  typeof validateAICosts
>;
const mockHandleApiError = handleApiError as jest.MockedFunction<
  typeof handleApiError
>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe("GET /api/system-config", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return config when snapshot exists", async () => {
    const rawData: Partial<SystemConfig> = {
      maintenance: { enabled: false },
    };
    const mergedConfig = { ...defaultSystemConfig, ...rawData };
    const validatedConfig = mergedConfig;

    const mockSnapshot = {
      exists: true,
      data: jest.fn().mockReturnValue(rawData),
    };

    const mockDoc = { get: jest.fn().mockResolvedValue(mockSnapshot) };
    const mockCollection = { doc: jest.fn().mockReturnValue(mockDoc) };
    mockAdminDb.collection = jest.fn().mockReturnValue(mockCollection as any);

    mockMergeWithDefaultConfig.mockReturnValue(mergedConfig);
    mockValidateSystemConfig.mockReturnValue(validatedConfig);
    mockValidateAICosts.mockReturnValue(undefined);

    const response = await GET();
    const data = await response.json();

    expect(mockAdminDb.collection).toHaveBeenCalledWith("config");
    expect(mockCollection.doc).toHaveBeenCalledWith("system");
    expect(mockDoc.get).toHaveBeenCalled();
    expect(mockMergeWithDefaultConfig).toHaveBeenCalledWith(rawData);
    expect(mockValidateSystemConfig).toHaveBeenCalledWith(
      mergedConfig,
      defaultSystemConfig
    );
    expect(mockValidateAICosts).toHaveBeenCalledWith(validatedConfig);
    expect(response.status).toBe(200);
    expect(data.config).toEqual(validatedConfig);
    expect(data.fetchedAt).toBeDefined();
  });

  it("should return default config when snapshot does not exist", async () => {
    const mockSnapshot = {
      exists: false,
    };

    const mockDoc = { get: jest.fn().mockResolvedValue(mockSnapshot) };
    const mockCollection = { doc: jest.fn().mockReturnValue(mockDoc) };
    mockAdminDb.collection = jest.fn().mockReturnValue(mockCollection as any);

    const response = await GET();
    const data = await response.json();

    expect(mockLogger.warn).toHaveBeenCalledWith(
      "⚠️ No system config found in Firebase, using defaults"
    );
    expect(mockMergeWithDefaultConfig).not.toHaveBeenCalled();
    expect(mockValidateSystemConfig).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(data.config).toEqual(defaultSystemConfig);
    expect(data.fetchedAt).toBeDefined();
  });

  it("should handle errors when fetching config fails", async () => {
    const error = new Error("Database connection error");
    const errorResponse = NextResponse.json(
      { error: "Unable to fetch system configuration" },
      { status: 500 }
    );

    const mockDoc = { get: jest.fn().mockRejectedValue(error) };
    const mockCollection = { doc: jest.fn().mockReturnValue(mockDoc) };
    mockAdminDb.collection = jest.fn().mockReturnValue(mockCollection as any);

    mockHandleApiError.mockReturnValue(errorResponse);

    const response = await GET();

    expect(mockHandleApiError).toHaveBeenCalledWith(
      error,
      "Unable to fetch system configuration"
    );
    expect(response).toBe(errorResponse);
  });

  it("should validate fetchedAt timestamp format", async () => {
    const mockSnapshot = {
      exists: false,
    };

    const mockDoc = { get: jest.fn().mockResolvedValue(mockSnapshot) };
    const mockCollection = { doc: jest.fn().mockReturnValue(mockDoc) };
    mockAdminDb.collection = jest.fn().mockReturnValue(mockCollection as any);

    const response = await GET();
    const data = await response.json();

    // Verify fetchedAt is a valid ISO 8601 timestamp
    expect(data.fetchedAt).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
    );
    expect(new Date(data.fetchedAt).toISOString()).toBe(data.fetchedAt);
  });

  it("should handle validation errors gracefully", async () => {
    const rawData: Partial<SystemConfig> = {
      maintenance: { enabled: false },
    };
    const mergedConfig = { ...defaultSystemConfig, ...rawData };

    const mockSnapshot = {
      exists: true,
      data: jest.fn().mockReturnValue(rawData),
    };

    const mockDoc = { get: jest.fn().mockResolvedValue(mockSnapshot) };
    const mockCollection = { doc: jest.fn().mockReturnValue(mockDoc) };
    mockAdminDb.collection = jest.fn().mockReturnValue(mockCollection as any);

    mockMergeWithDefaultConfig.mockReturnValue(mergedConfig);
    mockValidateSystemConfig.mockImplementation(() => {
      throw new Error("Validation error");
    });

    const errorResponse = NextResponse.json(
      { error: "Unable to fetch system configuration" },
      { status: 500 }
    );
    mockHandleApiError.mockReturnValue(errorResponse);

    const response = await GET();

    expect(mockHandleApiError).toHaveBeenCalledWith(
      expect.any(Error),
      "Unable to fetch system configuration"
    );
    expect(response).toBe(errorResponse);
  });
});
