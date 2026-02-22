// Recruiter and Recruiter Agent API path definitions for the OpenAPI spec.
// Imported and merged into src/lib/swagger.ts.
export const recruiterPaths = {
    // ── Recruiter ──────────────────────────────────────────────────
    "/api/recruiter/search-resumes": {
        get: {
            tags: ["Recruiter"],
            summary: "Search resumes (recruiter view)",
            description:
                "Search public resumes with filters. Rate limited: 20 req/min.",
            parameters: [
                { name: "q", in: "query", schema: { type: "string" } },
                { name: "skills", in: "query", schema: { type: "string" } },
                { name: "page", in: "query", schema: { type: "number" } },
            ],
            responses: {
                200: { description: "Resume results" },
                401: { $ref: "#/components/responses/Unauthorized" },
            },
        },
    },
    "/api/recruiter/search": {
        get: {
            tags: ["Recruiter"],
            summary: "Recruiter search",
            responses: {
                200: { description: "Results" },
                401: { $ref: "#/components/responses/Unauthorized" },
            },
        },
    },
    "/api/recruiter/jd-search": {
        post: {
            tags: ["Recruiter"],
            summary: "Job description-based search",
            description:
                "Find matching candidates by pasting a job description.",
            responses: {
                200: { description: "Matching candidates" },
                401: { $ref: "#/components/responses/Unauthorized" },
            },
        },
    },
    "/api/recruiter/requests": {
        get: {
            tags: ["Recruiter"],
            summary: "List recruiter requests",
            responses: {
                200: { description: "Requests list" },
                401: { $ref: "#/components/responses/Unauthorized" },
            },
        },
        post: {
            tags: ["Recruiter"],
            summary: "Create recruiter request",
            responses: {
                201: { description: "Request created" },
                401: { $ref: "#/components/responses/Unauthorized" },
            },
        },
    },
    "/api/recruiter/request-access": {
        post: {
            tags: ["Recruiter"],
            summary: "Request access to candidate profile",
            responses: {
                200: { description: "Access requested" },
                401: { $ref: "#/components/responses/Unauthorized" },
            },
        },
    },
    "/api/recruiter/candidates": {
        get: {
            tags: ["Recruiter"],
            summary: "List saved candidates",
            responses: {
                200: { description: "Candidates" },
                401: { $ref: "#/components/responses/Unauthorized" },
            },
        },
    },
    "/api/recruiter/pipeline": {
        get: {
            tags: ["Recruiter"],
            summary: "Get recruitment pipeline",
            responses: {
                200: { description: "Pipeline data" },
                401: { $ref: "#/components/responses/Unauthorized" },
            },
        },
        post: {
            tags: ["Recruiter"],
            summary: "Update pipeline",
            responses: {
                200: { description: "Updated" },
                401: { $ref: "#/components/responses/Unauthorized" },
            },
        },
    },
    "/api/recruiter/interviews": {
        get: {
            tags: ["Recruiter"],
            summary: "List scheduled interviews",
            responses: {
                200: { description: "Interviews" },
                401: { $ref: "#/components/responses/Unauthorized" },
            },
        },
        post: {
            tags: ["Recruiter"],
            summary: "Schedule interview",
            responses: {
                201: { description: "Scheduled" },
                401: { $ref: "#/components/responses/Unauthorized" },
            },
        },
    },
    "/api/recruiter/metrics": {
        get: {
            tags: ["Recruiter"],
            summary: "Recruiter dashboard metrics",
            responses: {
                200: { description: "Metrics" },
                401: { $ref: "#/components/responses/Unauthorized" },
            },
        },
    },
    "/api/recruiter/bulk-actions": {
        post: {
            tags: ["Recruiter"],
            summary: "Bulk recruiter actions",
            responses: {
                200: { description: "Actions processed" },
                401: { $ref: "#/components/responses/Unauthorized" },
            },
        },
    },
    "/api/recruiter/debug-resumes": {
        get: {
            tags: ["Recruiter"],
            summary: "Debug resume data (dev only)",
            responses: {
                200: { description: "Debug data" },
                401: { $ref: "#/components/responses/Unauthorized" },
            },
        },
    },

    // ── Recruiter Agents ───────────────────────────────────────────
    "/api/recruiter/agent/analyze": {
        post: {
            tags: ["Recruiter Agents"],
            summary: "AI candidate analysis",
            description:
                "Analyze a candidate's fit for a role. Rate limited: 10 req/min.",
            responses: {
                200: { description: "Analysis result" },
                401: { $ref: "#/components/responses/Unauthorized" },
                429: { $ref: "#/components/responses/RateLimited" },
            },
        },
    },
    "/api/recruiter/agent/screen": {
        post: {
            tags: ["Recruiter Agents"],
            summary: "AI candidate screening",
            responses: {
                200: { description: "Screening result" },
                401: { $ref: "#/components/responses/Unauthorized" },
                429: { $ref: "#/components/responses/RateLimited" },
            },
        },
    },
    "/api/recruiter/agent/outreach": {
        post: {
            tags: ["Recruiter Agents"],
            summary: "AI outreach message generation",
            responses: {
                200: { description: "Outreach message" },
                401: { $ref: "#/components/responses/Unauthorized" },
                429: { $ref: "#/components/responses/RateLimited" },
            },
        },
    },
    "/api/recruiter/agent/enhance-job": {
        post: {
            tags: ["Recruiter Agents"],
            summary: "AI job description enhancement",
            responses: {
                200: { description: "Enhanced JD" },
                401: { $ref: "#/components/responses/Unauthorized" },
                429: { $ref: "#/components/responses/RateLimited" },
            },
        },
    },
    "/api/recruiter/agent/interview-prep": {
        post: {
            tags: ["Recruiter Agents"],
            summary: "AI interview prep questions",
            responses: {
                200: { description: "Interview questions" },
                401: { $ref: "#/components/responses/Unauthorized" },
                429: { $ref: "#/components/responses/RateLimited" },
            },
        },
    },
    "/api/recruiter/agent/pipeline-suggest": {
        post: {
            tags: ["Recruiter Agents"],
            summary: "AI pipeline stage suggestions",
            responses: {
                200: { description: "Pipeline suggestions" },
                401: { $ref: "#/components/responses/Unauthorized" },
                429: { $ref: "#/components/responses/RateLimited" },
            },
        },
    },
};
