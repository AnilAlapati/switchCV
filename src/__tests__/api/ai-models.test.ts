import { NextRequest, NextResponse } from "next/server";
import { AIProvider } from "@/types/ai";
import { GET } from "@/app/api/ai/models/route";
import { getSelectableModels } from "@/lib/services/aiProviderService";
import { getUserTier } from "@/lib/services/userService";
import {
  handleApiError,
  getAuthenticatedUserId,
} from "@/lib/utils/api-helpers";

jest.mock("@/lib/services/aiProviderService");
jest.mock("@/lib/services/userService");
jest.mock("@/lib/utils/api-helpers");

const mockGetSelectableModels = getSelectableModels as jest.MockedFunction<
  typeof getSelectableModels
>;
const mockGetUserTier = getUserTier as jest.MockedFunction<typeof getUserTier>;
const mockGetAuthenticatedUserId =
  getAuthenticatedUserId as jest.MockedFunction<typeof getAuthenticatedUserId>;
const mockHandleApiError = handleApiError as jest.MockedFunction<
  typeof handleApiError
>;

describe("GET /api/ai/models", () => {
  let mockRequest: NextRequest;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest = new NextRequest("http://localhost:3000/api/ai/models");
  });

  it("should return models for authenticated user with basic tier", async () => {
    const mockModels = [
      {
        id: "gpt-3.5-turbo",
        name: "GPT-3.5 Turbo",
        provider: "openai" as AIProvider,
        tier: "free" as const,
        quality: 1,
        costPer1MTokens: 1,
      },
    ];

    mockGetAuthenticatedUserId.mockResolvedValue({
      userId: "user123",
      error: undefined,
    });
    mockGetUserTier.mockResolvedValue("basic");
    mockGetSelectableModels.mockReturnValue(mockModels);

    const response = await GET(mockRequest);
    const data = await response.json();

    expect(mockGetAuthenticatedUserId).toHaveBeenCalledWith(mockRequest);
    expect(mockGetUserTier).toHaveBeenCalledWith("user123");
    expect(mockGetSelectableModels).toHaveBeenCalledWith("basic");
    expect(response.status).toBe(200);
    expect(data).toEqual({
      tier: "basic",
      models: mockModels,
    });
  });

  it("should return models for premium tier user", async () => {
    const mockModels = [
      {
        id: "model-1",
        name: "Model 1",
        provider: "google" as AIProvider,
        tier: "premium" as const,
        quality: 1,
        costPer1MTokens: 1,
      },
      {
        id: "model-2",
        name: "Model 2",
        provider: "google" as AIProvider,
        tier: "premium" as const,
        quality: 1,
        costPer1MTokens: 1,
      },
    ];

    mockGetAuthenticatedUserId.mockResolvedValue({
      userId: "user456",
      error: undefined,
    });
    mockGetUserTier.mockResolvedValue("premium");
    mockGetSelectableModels.mockReturnValue(mockModels);

    const response = await GET(mockRequest);
    const data = await response.json();

    expect(mockGetUserTier).toHaveBeenCalledWith("user456");
    expect(mockGetSelectableModels).toHaveBeenCalledWith("premium");
    expect(data.tier).toBe("premium");
    expect(data.models).toHaveLength(2);
  });

  it("should return error when user is not authenticated", async () => {
    const errorResponse = NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );

    mockGetAuthenticatedUserId.mockResolvedValue({
      userId: undefined,
      error: errorResponse,
    });

    const response = await GET(mockRequest);

    expect(response).toBe(errorResponse);
    expect(mockGetUserTier).not.toHaveBeenCalled();
    expect(mockGetSelectableModels).not.toHaveBeenCalled();
  });

  it("should return error when userId is null", async () => {
    const errorResponse = NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );

    mockGetAuthenticatedUserId.mockResolvedValue({
      userId: undefined,
      error: undefined,
    });
    mockHandleApiError.mockReturnValue(errorResponse);

    const response = await GET(mockRequest);

    expect(mockHandleApiError).toHaveBeenCalledWith(null, "Unauthorized", 401);
    expect(response).toBe(errorResponse);
  });

  it("should handle errors when getting user tier fails", async () => {
    const errorResponse = NextResponse.json(
      { error: "Failed to load AI models" },
      { status: 500 }
    );

    mockGetAuthenticatedUserId.mockResolvedValue({
      userId: "user789",
      error: undefined,
    });
    mockGetUserTier.mockRejectedValue(new Error("Database error"));
    mockHandleApiError.mockReturnValue(errorResponse);

    const response = await GET(mockRequest);

    expect(mockHandleApiError).toHaveBeenCalledWith(
      expect.any(Error),
      "Failed to load AI models"
    );
    expect(response).toBe(errorResponse);
  });

  it("should handle errors when getting selectable models fails", async () => {
    const errorResponse = NextResponse.json(
      { error: "Failed to load AI models" },
      { status: 500 }
    );

    mockGetAuthenticatedUserId.mockResolvedValue({
      userId: "user999",
      error: undefined,
    });
    mockGetUserTier.mockResolvedValue("enterprise");
    mockGetSelectableModels.mockImplementation(() => {
      throw new Error("Models configuration error");
    });
    mockHandleApiError.mockReturnValue(errorResponse);

    const response = await GET(mockRequest);

    expect(mockHandleApiError).toHaveBeenCalledWith(
      expect.any(Error),
      "Failed to load AI models"
    );
    expect(response).toBe(errorResponse);
  });
});
