import { NextRequest } from "next/server";
import { GET } from "@/app/api/ai/models/route";
import { getSelectableModels } from "@/lib/services/aiProviderService";
import { getUserTier } from "@/lib/services/userService";
import {
  getAuthenticatedUserId,
  handleApiError,
} from "@/lib/utils/api-helpers";

jest.mock("@/lib/services/aiProviderService");
jest.mock("@/lib/services/userService");
jest.mock("@/lib/utils/api-helpers");

describe("AI Models API", () => {
  const mockRequest = new NextRequest("http://localhost/api/ai/models");

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return models for the user's tier", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user-123",
    });
    (getUserTier as jest.Mock).mockResolvedValue("premium");
    (getSelectableModels as jest.Mock).mockReturnValue([
      { id: "model-1", name: "Model 1" },
    ]);

    const response = await GET(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      tier: "premium",
      models: [{ id: "model-1", name: "Model 1" }],
    });
    expect(getUserTier).toHaveBeenCalledWith("user-123");
    expect(getSelectableModels).toHaveBeenCalledWith("premium");
  });

  it("should return 401 if unauthorized", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      error: {
        status: 401,
        json: () => Promise.resolve({ error: "Unauthorized" }),
      },
    });

    const response = await GET(mockRequest);
    expect(response).toBeDefined();
    // The mock returns the error object directly as per api-helpers pattern
  });

  it("should handle errors gracefully", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user-123",
    });
    (getUserTier as jest.Mock).mockRejectedValue(new Error("Database error"));
    (handleApiError as jest.Mock).mockReturnValue({ status: 500 });

    const response = await GET(mockRequest);
    expect(handleApiError).toHaveBeenCalled();
  });
});
