// Health, System, and Auth API path definitions for the OpenAPI spec.
// Imported and merged into src/lib/swagger.ts.
export const authPaths = {
    // ── Health ──────────────────────────────────────────────────────
    "/api/health": {
        get: {
            tags: ["Health"],
            summary: "Health check",
            description:
                "Returns service health status for Firestore, Gemini, and email. Public endpoint.",
            security: [],
            responses: {
                200: {
                    description: "Service statuses",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/HealthResponse" },
                        },
                    },
                },
            },
        },
    },
    "/api/health/infra": {
        get: {
            tags: ["Health"],
            summary: "Infrastructure health",
            description:
                "Detailed infrastructure health for monitoring systems. Public endpoint.",
            security: [],
            responses: {
                200: { description: "Infrastructure health details" },
            },
        },
    },

    // ── System ─────────────────────────────────────────────────────
    "/api/system-config": {
        get: {
            tags: ["System"],
            summary: "Get system configuration",
            description:
                "Returns merged system config with defaults. Public endpoint, cached for 5 minutes.",
            security: [],
            responses: {
                200: {
                    description: "System configuration",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/SystemConfig" },
                        },
                    },
                },
            },
        },
    },
    "/api/csrf-token": {
        get: {
            tags: ["System"],
            summary: "Get CSRF token",
            description: "Returns a CSRF token for state-changing requests.",
            security: [],
            responses: {
                200: {
                    description: "CSRF token",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: { token: { type: "string" } },
                            },
                        },
                    },
                },
            },
        },
    },
    "/api/docs": {
        get: {
            tags: ["System"],
            summary: "OpenAPI specification",
            description: "Returns this OpenAPI spec as JSON. Requires authentication.",
            responses: {
                200: { description: "OpenAPI 3.0 spec" },
                401: { $ref: "#/components/responses/Unauthorized" },
            },
        },
    },

    // ── Auth ───────────────────────────────────────────────────────
    "/api/auth/verify": {
        post: {
            tags: ["Auth"],
            summary: "Verify email",
            description: "Verify user email with the token sent via email.",
            security: [],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: {
                            type: "object",
                            properties: { token: { type: "string" } },
                            required: ["token"],
                        },
                    },
                },
            },
            responses: {
                200: { description: "Email verified" },
                400: { $ref: "#/components/responses/BadRequest" },
            },
        },
    },
    "/api/auth/request-password-reset": {
        post: {
            tags: ["Auth"],
            summary: "Request password reset",
            description: "Sends a password reset email. Rate limited: 5 req/min.",
            security: [],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: {
                            type: "object",
                            properties: { email: { type: "string", format: "email" } },
                            required: ["email"],
                        },
                    },
                },
            },
            responses: {
                200: {
                    description:
                        "Reset email sent (always returns 200 to prevent enumeration)",
                },
            },
        },
    },
    "/api/auth/reset-password": {
        post: {
            tags: ["Auth"],
            summary: "Reset password",
            description: "Reset password using token from email.",
            security: [],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: {
                            type: "object",
                            properties: {
                                token: { type: "string" },
                                password: { type: "string", minLength: 8 },
                            },
                            required: ["token", "password"],
                        },
                    },
                },
            },
            responses: {
                200: { description: "Password reset successful" },
                400: { $ref: "#/components/responses/BadRequest" },
            },
        },
    },
};
