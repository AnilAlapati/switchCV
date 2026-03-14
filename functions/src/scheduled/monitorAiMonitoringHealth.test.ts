import { monitorAiMonitoringHealthHandler } from "./monitorAiMonitoringHealth";
import { emailService } from "../services/emailService";
import { SUPPORT_EMAIL } from "../services/aiMonitoring/types";

// Mock email service
jest.mock("../services/emailService", () => ({
  emailService: {
    sendCustomEmail: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock logger
jest.mock("firebase-functions/v1", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock firebase-admin
jest.mock("firebase-admin", () => ({
  firestore: jest.fn(() => ({})),
}));

// Mock firestore context
const mockGetAlertState = jest.fn();
const mockGetDailyMetrics = jest.fn();

jest.mock("../services/aiMonitoring/types", () => {
    const originalModule = jest.requireActual("../services/aiMonitoring/types");
    return {
        ...originalModule,
        alertStateDoc: jest.fn(() => ({
            get: mockGetAlertState
        })),
        dailyMetricsCollection: jest.fn(() => ({
            doc: jest.fn(() => ({
                get: mockGetDailyMetrics
            }))
        })),
    }
});

describe("monitorAiMonitoringHealth", () => {
  let originalDate: DateConstructor;

  beforeAll(() => {
    originalDate = global.Date;
  });

  afterAll(() => {
    global.Date = originalDate;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("sends an alert if alert state document does not exist", async () => {
    mockGetAlertState.mockResolvedValueOnce({
      exists: false,
      data: () => undefined,
    });
    mockGetDailyMetrics.mockResolvedValueOnce({
        exists: true,
        data: () => ({ updatedAt: new Date() })
    });

    await monitorAiMonitoringHealthHandler({} as any);

    expect(emailService.sendCustomEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: SUPPORT_EMAIL,
        subject: "[SWITCHCV ALERT] AI monitoring pipeline may be stale",
      }),
    );
    
    // Check if the HTML contains the specific error message
    const callArg = (emailService.sendCustomEmail as jest.Mock).mock.calls[0][0];
    expect(callArg.html).toContain("Alert state document does not exist");
  });

  it("sends an alert if aggregateAiMonitoring is stale (> 2 hours)", async () => {
    const mockNow = new Date("2026-03-14T10:00:00Z");
    const staleTime = new Date("2026-03-14T07:00:00Z"); // 3 hours ago

    jest.useFakeTimers().setSystemTime(mockNow);

    mockGetAlertState.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        lastHourlySummaryAt: staleTime,
        lastDigestSentAt: mockNow, // Digest is fine
      }),
    });
    mockGetDailyMetrics.mockResolvedValueOnce({
        exists: true,
        data: () => ({ updatedAt: mockNow }) // Daily metrics is fine
    });

    await monitorAiMonitoringHealthHandler({} as any);

    expect(emailService.sendCustomEmail).toHaveBeenCalled();
    const callArg = (emailService.sendCustomEmail as jest.Mock).mock.calls[0][0];
    expect(callArg.html).toContain("aggregateAiMonitoring last ran 3.0h ago");
    
    jest.useRealTimers();
  });
  
  it("does not send an alert if everything is fresh", async () => {
     const mockNow = new Date("2026-03-14T10:00:00Z");
     const freshTime = new Date("2026-03-14T09:00:00Z"); // 1 hour ago
     
     jest.useFakeTimers().setSystemTime(mockNow);

     mockGetAlertState.mockResolvedValueOnce({
       exists: true,
       data: () => ({
         lastHourlySummaryAt: freshTime,
         lastDigestSentAt: freshTime,
       }),
     });
     mockGetDailyMetrics.mockResolvedValueOnce({
         exists: true,
         data: () => ({ updatedAt: freshTime })
     });
 
     await monitorAiMonitoringHealthHandler({} as any);
 
     expect(emailService.sendCustomEmail).not.toHaveBeenCalled();
     
     jest.useRealTimers();
  });
});
