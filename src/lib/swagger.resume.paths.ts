// Resume API path definitions for the OpenAPI spec.
// Imported and merged into src/lib/swagger.ts.
export const resumePaths = {
    // ── Resume ─────────────────────────────────────────────────────
    "/api/resume/create": {
        post: {
            tags: ["Resume"],
            summary: "Create resume",
            description:
                "Create a new resume. Supports idempotency via Idempotency-Key header. Rate limited: 10/hour.",
            parameters: [
                { name: "Idempotency-Key", in: "header", schema: { type: "string" } },
            ],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: {
                            type: "object",
                            properties: {
                                title: { type: "string" },
                                content: { type: "object" },
                                templateId: { type: "string" },
                            },
                        },
                    },
                },
            },
            responses: {
                201: {
                    description: "Resume created",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/Resume" },
                        },
                    },
                },
                401: { $ref: "#/components/responses/Unauthorized" },
                429: { $ref: "#/components/responses/RateLimited" },
            },
        },
    },
    "/api/resume/delete": {
        delete: {
            tags: ["Resume"],
            summary: "Delete resume",
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: {
                            type: "object",
                            properties: { resumeId: { type: "string" } },
                            required: ["resumeId"],
                        },
                    },
                },
            },
            responses: {
                200: { description: "Resume deleted" },
                401: { $ref: "#/components/responses/Unauthorized" },
                404: { $ref: "#/components/responses/NotFound" },
            },
        },
    },
    "/api/resume/enhance": {
        post: {
            tags: ["Resume"],
            summary: "Enhance resume with AI",
            description: "AI-powered resume enhancement. Rate limited: 10 req/min.",
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: {
                            type: "object",
                            properties: {
                                resumeId: { type: "string" },
                                instructions: { type: "string" },
                            },
                        },
                    },
                },
            },
            responses: {
                200: { description: "Enhanced resume content" },
                401: { $ref: "#/components/responses/Unauthorized" },
                429: { $ref: "#/components/responses/RateLimited" },
            },
        },
    },
    "/api/resume/generate": {
        post: {
            tags: ["Resume"],
            summary: "Generate resume with AI",
            description:
                "Full AI resume generation (standard or autonomous mode). Rate limited: 10 req/min.",
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/ResumeGenerateRequest" },
                    },
                },
            },
            responses: {
                200: {
                    description: "Generated resume",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/ResumeGenerateResponse" },
                        },
                    },
                },
                401: { $ref: "#/components/responses/Unauthorized" },
                429: { $ref: "#/components/responses/RateLimited" },
            },
        },
    },
    "/api/resume/generate/preview": {
        post: {
            tags: ["Resume"],
            summary: "Generate non-persisted resume preview",
            description:
                "Creates a preview with quality signals but does not persist a resume document.",
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/ResumeGeneratePreviewRequest" },
                    },
                },
            },
            responses: {
                200: {
                    description: "Preview generated",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/ResumeGenerateResponse" },
                        },
                    },
                },
                401: { $ref: "#/components/responses/Unauthorized" },
                400: { description: "Invalid request payload" },
            },
        },
    },
    "/api/resume/intake/normalize": {
        post: {
            tags: ["Resume"],
            summary: "Normalize resume intake content",
            description:
                "Normalizes chat/paste/PDF/DOCX extracted text into sectioned draft data and evidence mapping.",
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/ResumeIntakeNormalizeRequest" },
                    },
                },
            },
            responses: {
                200: {
                    description: "Normalized draft with evidence map",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/ResumeIntakeNormalizeResponse" },
                        },
                    },
                },
                401: { $ref: "#/components/responses/Unauthorized" },
                400: { description: "Invalid request payload" },
            },
        },
    },
    "/api/resume/generate/status/{jobId}": {
        get: {
            tags: ["Resume"],
            summary: "Check generation job status",
            parameters: [
                { name: "jobId", in: "path", required: true, schema: { type: "string" } },
            ],
            responses: {
                200: {
                    description: "Job status",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    status: {
                                        type: "string",
                                        enum: ["pending", "processing", "completed", "failed"],
                                    },
                                    result: { type: "object" },
                                },
                            },
                        },
                    },
                },
                401: { $ref: "#/components/responses/Unauthorized" },
            },
        },
    },
    "/api/resume/compare": {
        post: {
            tags: ["Resume"],
            summary: "Compare two resumes",
            responses: {
                200: { description: "Comparison result" },
                401: { $ref: "#/components/responses/Unauthorized" },
            },
        },
    },
    "/api/resume/map-id": {
        get: {
            tags: ["Resume"],
            summary: "Map legacy numeric resume ID to new format",
            responses: {
                200: { description: "Mapped ID" },
                401: { $ref: "#/components/responses/Unauthorized" },
            },
        },
    },
    "/api/resumes/{id}": {
        get: {
            tags: ["Resume"],
            summary: "Get resume by ID",
            parameters: [
                { name: "id", in: "path", required: true, schema: { type: "string" } },
            ],
            responses: {
                200: {
                    description: "Resume data",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/Resume" },
                        },
                    },
                },
                401: { $ref: "#/components/responses/Unauthorized" },
                404: { $ref: "#/components/responses/NotFound" },
            },
        },
        put: {
            tags: ["Resume"],
            summary: "Update resume",
            parameters: [
                { name: "id", in: "path", required: true, schema: { type: "string" } },
            ],
            responses: {
                200: { description: "Updated" },
                401: { $ref: "#/components/responses/Unauthorized" },
            },
        },
        delete: {
            tags: ["Resume"],
            summary: "Delete resume by ID",
            parameters: [
                { name: "id", in: "path", required: true, schema: { type: "string" } },
            ],
            responses: {
                200: { description: "Deleted" },
                401: { $ref: "#/components/responses/Unauthorized" },
            },
        },
    },
    "/api/resumes/{id}/chat": {
        post: {
            tags: ["Resume"],
            summary: "Chat with resume (AI assistant)",
            parameters: [
                { name: "id", in: "path", required: true, schema: { type: "string" } },
            ],
            responses: {
                200: { description: "AI response" },
                401: { $ref: "#/components/responses/Unauthorized" },
            },
        },
    },
    "/api/resumes/create": {
        post: {
            tags: ["Resume"],
            summary: "Create resume (alternate endpoint)",
            responses: {
                201: { description: "Created" },
                401: { $ref: "#/components/responses/Unauthorized" },
            },
        },
    },
};
