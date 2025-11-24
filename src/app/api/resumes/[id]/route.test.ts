import { NextRequest, NextResponse } from "next/server";
import { PUT, GET } from "./route";

const collectionHandlers: Record<string, any> = {};

const createDoc = (initialData: Record<string, any>, exists = true) => {
  let store = { ...initialData };
  return {
    get: jest.fn(async () =>
      exists ? { exists: true, data: () => store } : { exists: false }
    ),
    set: jest.fn(
      async (data: Record<string, any>, options?: { merge?: boolean }) => {
        store = options?.merge ? { ...store, ...data } : { ...data };
      }
    ),
    getData: () => store,
  };
};

jest.mock("@/lib/firebase-admin", () => {
  const verifyIdToken = jest.fn();
  return {
    adminDb: {
      collection: (name: string) => collectionHandlers[name],
      batch: () => ({
        set: (docRef: any, data: any, options: any) => {
          docRef.set(data, options);
          return {};
        },
        commit: jest.fn().mockResolvedValue(undefined),
      }),
    },
    adminAuth: {
      verifyIdToken,
    },
  };
});

const { adminAuth } = jest.requireMock("@/lib/firebase-admin") as {
  adminAuth: { verifyIdToken: jest.Mock };
};

interface MockSetup {
  resumesDoc: ReturnType<typeof createDoc>;
  resumeProfilesDoc: ReturnType<typeof createDoc>;
  userResumeDoc: { set: jest.Mock };
  allResumesDoc: { set: jest.Mock };
}

const setupCollections = (): MockSetup => {
  const resumesDoc = createDoc({
    userId: "user-123",
    numericId: 42,
    title: "Original Title",
    visibility: "private",
    isPublic: false,
  });

  const resumeProfilesDoc = createDoc({}, false);

  const userResumeDoc = {
    set: jest.fn(),
  };

  const allResumesDoc = {
    set: jest.fn(),
  };

  collectionHandlers.resumes = {
    doc: jest.fn(() => resumesDoc),
  };

  collectionHandlers.resumeProfiles = {
    doc: jest.fn(() => resumeProfilesDoc),
  };

  collectionHandlers.users = {
    doc: jest.fn(() => ({
      collection: jest.fn(() => ({
        doc: jest.fn(() => userResumeDoc),
      })),
    })),
  };

  collectionHandlers.allResumes = {
    doc: jest.fn(() => allResumesDoc),
  };

  return { resumesDoc, resumeProfilesDoc, userResumeDoc, allResumesDoc };
};

const buildRequest = (body: Record<string, unknown>, headers?: HeadersInit) =>
  new NextRequest("http://localhost/api/resumes/42", {
    method: "PUT",
    body: JSON.stringify(body),
    headers,
  });

describe("PUT /api/resumes/[id]", () => {
  let mocks: MockSetup;

  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(collectionHandlers).forEach(
      (key) => delete collectionHandlers[key]
    );
    mocks = setupCollections();
  });

  it("returns 401 when authorization header is missing", async () => {
    const request = buildRequest({ resume: { title: "Updated" } });
    const response = await PUT(request, {
      params: Promise.resolve({ id: "42" }),
    });
    expect(response.status).toBe(401);
  });

  it("returns 403 when user does not own the resume", async () => {
    adminAuth.verifyIdToken.mockResolvedValue({ uid: "another-user" });

    const request = buildRequest(
      { resume: { title: "Updated" } },
      { authorization: "Bearer token" }
    );

    const response = await PUT(request, {
      params: Promise.resolve({ id: "42" }),
    });
    expect(response.status).toBe(403);
  });

  it("updates resume content and returns updated payload", async () => {
    adminAuth.verifyIdToken.mockResolvedValue({ uid: "user-123" });

    const request = buildRequest(
      {
        resume: {
          title: "Updated Title",
          summary: "New summary",
          userId: "malicious-change",
        },
      },
      { authorization: "Bearer token" }
    );

    const response = await PUT(request, {
      params: Promise.resolve({ id: "42" }),
    });
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.resume.title).toBe("Updated Title");
    expect(data.resume.summary).toBe("New summary");
    expect(data.resume.userId).toBe("user-123");

    expect(mocks.resumesDoc.set).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Updated Title",
        summary: "New summary",
      }),
      { merge: true }
    );

    expect(mocks.userResumeDoc.set).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Updated Title",
        summary: "New summary",
        userId: "user-123",
        numericId: 42,
      }),
      { merge: true }
    );

    expect(mocks.allResumesDoc.set).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Updated Title",
        numericId: 42,
        userId: "user-123",
      }),
      { merge: true }
    );

    const stored = mocks.resumesDoc.getData();
    expect(stored.title).toBe("Updated Title");
    expect(stored.summary).toBe("New summary");
    expect(stored.userId).toBe("user-123");
  });

  it("returns 400 when resume payload is invalid", async () => {
    adminAuth.verifyIdToken.mockResolvedValue({ uid: "user-123" });

    const request = buildRequest({}, { authorization: "Bearer token" });
    const response = await PUT(request, {
      params: Promise.resolve({ id: "42" }),
    });
    expect(response.status).toBe(400);
  });
});

describe("GET /api/resumes/[id]", () => {
  let mocks: MockSetup;

  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(collectionHandlers).forEach(
      (key) => delete collectionHandlers[key]
    );
    mocks = setupCollections();
  });

  it("returns cache headers for public resumes", async () => {
    // Setup public resume
    const publicResumeDoc = createDoc({
      userId: "user-123",
      numericId: 42,
      title: "Public Resume",
      isPublic: true,
      visibility: "public",
    });
    collectionHandlers.resumes = {
      doc: jest.fn(() => publicResumeDoc),
    };

    const request = new NextRequest("http://localhost/api/resumes/42", {
      method: "GET",
    });

    const response = await GET(request, {
      params: Promise.resolve({ id: "42" }),
    });

    console.log("Response headers:", response.headers);
    console.log("Cache-Control:", response.headers.get("Cache-Control"));

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe(
      "public, s-maxage=60, stale-while-revalidate=300"
    );
  });
});

// Mock NextResponse to ensure headers are passed correctly in test environment
jest.mock("next/server", () => {
  const actual = jest.requireActual("next/server");
  return {
    ...actual,
    NextResponse: {
      ...actual.NextResponse,
      json: (body: any, init: any) => {
        return Response.json(body, init);
      },
    },
  };
});
