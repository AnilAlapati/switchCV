/**
 * Health Endpoint Tests
 *
 * Tests for the health check API endpoint
 */

import { GET } from "./route";

jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock("@/lib/firebase-admin", () => {
  const mockGet = jest.fn().mockResolvedValue({});
  const mockLimit = jest.fn().mockReturnValue({ get: mockGet });
  const mockCollection = jest.fn().mockReturnValue({ limit: mockLimit });

  return {
    adminDb: {
      collection: mockCollection,
    },
    __mock: {
      mockCollection,
      mockLimit,
      mockGet,
    },
  };
});

const firebaseAdminMock = jest.requireMock("@/lib/firebase-admin").__mock;
const mockCollection = firebaseAdminMock.mockCollection as jest.Mock;
const mockLimit = firebaseAdminMock.mockLimit as jest.Mock;
const mockGet = firebaseAdminMock.mockGet as jest.Mock;

jest.mock("nodemailer", () => {
  const mockVerify = jest.fn().mockResolvedValue(true);
  const mockCreateTransport = jest.fn(() => ({ verify: mockVerify }));

  return {
    __esModule: true,
    default: { createTransport: mockCreateTransport },
    createTransport: mockCreateTransport,
    __mock: {
      mockVerify,
      mockCreateTransport,
    },
  };
});

const nodemailerMock = jest.requireMock("nodemailer").__mock;
const mockCreateTransport = nodemailerMock.mockCreateTransport as jest.Mock;
const mockVerify = nodemailerMock.mockVerify as jest.Mock;

describe("GET /api/health", () => {
  const originalBypass = process.env.HEALTHCHECK_RUN_FULL;
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.HEALTHCHECK_RUN_FULL = "true";
    process.env.GEMINI_API_KEY = "test-key";
    process.env.SMTP_HOST = "smtp.test";
    process.env.SMTP_PORT = "465";
    process.env.SMTP_USER = "user@test.com";
    process.env.SMTP_PASS = "pass";

    global.fetch = jest.fn().mockResolvedValue({ ok: true }) as any;

    mockGet.mockResolvedValue({});
    mockCollection.mockReturnValue({ limit: () => ({ get: mockGet }) });
  });

  afterEach(() => {
    if (originalBypass) {
      process.env.HEALTHCHECK_RUN_FULL = originalBypass;
    } else {
      delete process.env.HEALTHCHECK_RUN_FULL;
    }
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it("returns ok status with service details", async () => {
    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.status).toBe("ok");
    expect(json.services.firestore.status).toBe("ok");
    expect(json.services.ai.status).toBe("ok");
  });

  it("returns degraded when a dependency fails", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });
    mockCollection.mockReturnValueOnce({
      limit: () => ({
        get: jest.fn().mockRejectedValue(new Error("firestore down")),
      }),
    });

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(503);
    expect(json.status).toBe("degraded");
    expect(json.services.firestore.status).toBe("error");
    expect(json.services.ai.status).toBe("error");
  });
});
