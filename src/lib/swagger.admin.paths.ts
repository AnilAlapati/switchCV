// Admin, Profiles, Jobseeker, Analytics, Notifications, Contact, and Seed
// API path definitions for the OpenAPI spec.
// Imported and merged into src/lib/swagger.ts.
export const adminPaths = {
    // ── Profiles ───────────────────────────────────────────────────
    "/api/profiles/search": {
        get: {
            tags: ["Profiles"],
            summary: "Search public profiles",
            responses: {
                200: { description: "Profile results" },
                401: { $ref: "#/components/responses/Unauthorized" },
            },
        },
    },
    "/api/profiles/request-access": {
        post: {
            tags: ["Profiles"],
            summary: "Request profile access",
            responses: {
                200: { description: "Access requested" },
                401: { $ref: "#/components/responses/Unauthorized" },
            },
        },
    },
    "/api/profiles/approve-access": {
        post: {
            tags: ["Profiles"],
            summary: "Approve access request",
            responses: {
                200: { description: "Approved" },
                401: { $ref: "#/components/responses/Unauthorized" },
            },
        },
    },
    "/api/profiles/respond-access": {
        post: {
            tags: ["Profiles"],
            summary: "Respond to access request",
            responses: {
                200: { description: "Response recorded" },
                401: { $ref: "#/components/responses/Unauthorized" },
            },
        },
    },
    "/api/profiles/check-access": {
        get: {
            tags: ["Profiles"],
            summary: "Check if access is granted",
            responses: {
                200: { description: "Access status" },
                401: { $ref: "#/components/responses/Unauthorized" },
            },
        },
    },
    "/api/profiles/analytics": {
        get: {
            tags: ["Profiles"],
            summary: "Profile view analytics",
            responses: {
                200: { description: "Analytics data" },
                401: { $ref: "#/components/responses/Unauthorized" },
            },
        },
    },

    // ── Jobseeker ──────────────────────────────────────────────────
    "/api/jobseeker/profile": {
        get: {
            tags: ["Jobseeker"],
            summary: "Get jobseeker profile",
            responses: {
                200: { description: "Profile data" },
                401: { $ref: "#/components/responses/Unauthorized" },
            },
        },
        put: {
            tags: ["Jobseeker"],
            summary: "Update jobseeker profile",
            responses: {
                200: { description: "Updated" },
                401: { $ref: "#/components/responses/Unauthorized" },
            },
        },
    },
    "/api/jobseeker/metrics": {
        get: {
            tags: ["Jobseeker"],
            summary: "Jobseeker dashboard metrics",
            responses: {
                200: { description: "Metrics" },
                401: { $ref: "#/components/responses/Unauthorized" },
            },
        },
    },
    "/api/jobseeker/access-requests": {
        get: {
            tags: ["Jobseeker"],
            summary: "List received access requests",
            responses: {
                200: { description: "Access requests" },
                401: { $ref: "#/components/responses/Unauthorized" },
            },
        },
    },

    // ── Contact ────────────────────────────────────────────────────
    "/api/recruiters/request-contact": {
        post: {
            tags: ["Contact"],
            summary: "Request contact with candidate",
            responses: {
                200: { description: "Contact requested" },
                401: { $ref: "#/components/responses/Unauthorized" },
            },
        },
    },
    "/api/recruiters/approve-contact": {
        post: {
            tags: ["Contact"],
            summary: "Approve contact request",
            responses: {
                200: { description: "Approved" },
                401: { $ref: "#/components/responses/Unauthorized" },
            },
        },
    },
    "/api/recruiters/deny-contact": {
        post: {
            tags: ["Contact"],
            summary: "Deny contact request",
            responses: {
                200: { description: "Denied" },
                401: { $ref: "#/components/responses/Unauthorized" },
            },
        },
    },
    "/api/recruiters/verify-token": {
        post: {
            tags: ["Contact"],
            summary: "Verify access token",
            responses: {
                200: { description: "Token verified" },
                401: { $ref: "#/components/responses/Unauthorized" },
            },
        },
    },
    "/api/contact/feedback": {
        post: {
            tags: ["Contact"],
            summary: "Submit feedback",
            description: "Submit user feedback or support request.",
            responses: {
                200: { description: "Feedback received" },
                401: { $ref: "#/components/responses/Unauthorized" },
            },
        },
    },

    // ── Analytics ──────────────────────────────────────────────────
    "/api/analytics/dashboard": {
        get: {
            tags: ["Analytics"],
            summary: "Dashboard analytics",
            responses: {
                200: { description: "Dashboard data" },
                401: { $ref: "#/components/responses/Unauthorized" },
            },
        },
    },
    "/api/analytics/system": {
        get: {
            tags: ["Analytics"],
            summary: "System-wide analytics",
            responses: {
                200: { description: "System metrics" },
                401: { $ref: "#/components/responses/Unauthorized" },
            },
        },
    },

    // ── Notifications ──────────────────────────────────────────────
    "/api/notifications": {
        get: {
            tags: ["Notifications"],
            summary: "List notifications",
            responses: {
                200: {
                    description: "Notifications",
                    content: {
                        "application/json": {
                            schema: {
                                type: "array",
                                items: { $ref: "#/components/schemas/Notification" },
                            },
                        },
                    },
                },
                401: { $ref: "#/components/responses/Unauthorized" },
            },
        },
        patch: {
            tags: ["Notifications"],
            summary: "Mark notifications as read",
            responses: {
                200: { description: "Updated" },
                401: { $ref: "#/components/responses/Unauthorized" },
            },
        },
    },

    // ── Admin ──────────────────────────────────────────────────────
    "/api/admin/costs": {
        get: {
            tags: ["Admin"],
            summary: "Get cost reports",
            description:
                "Admin-only. Requires admin role in Firebase Auth custom claims.",
            responses: {
                200: { description: "Cost data" },
                401: { $ref: "#/components/responses/Unauthorized" },
                403: { $ref: "#/components/responses/Forbidden" },
            },
        },
    },
    "/api/admin/stats": {
        get: {
            tags: ["Admin"],
            summary: "System statistics",
            responses: {
                200: { description: "Stats" },
                401: { $ref: "#/components/responses/Unauthorized" },
                403: { $ref: "#/components/responses/Forbidden" },
            },
        },
    },
    "/api/admin/user-approval": {
        get: {
            tags: ["Admin"],
            summary: "List pending user approvals",
            responses: {
                200: { description: "Pending users" },
                401: { $ref: "#/components/responses/Unauthorized" },
                403: { $ref: "#/components/responses/Forbidden" },
            },
        },
        post: {
            tags: ["Admin"],
            summary: "Process user approval",
            responses: {
                200: { description: "Processed" },
                401: { $ref: "#/components/responses/Unauthorized" },
                403: { $ref: "#/components/responses/Forbidden" },
            },
        },
    },
    "/api/admin/init-system": {
        post: {
            tags: ["Admin"],
            summary: "Initialize system config",
            responses: {
                200: { description: "Initialized" },
                401: { $ref: "#/components/responses/Unauthorized" },
                403: { $ref: "#/components/responses/Forbidden" },
            },
        },
    },
    "/api/admin/test-secrets": {
        get: {
            tags: ["Admin"],
            summary: "Test secret manager connectivity",
            responses: {
                200: { description: "Secrets status" },
                401: { $ref: "#/components/responses/Unauthorized" },
                403: { $ref: "#/components/responses/Forbidden" },
            },
        },
    },
    "/api/admin/migrate-numeric-ids": {
        post: {
            tags: ["Admin"],
            summary: "Migrate legacy numeric IDs",
            responses: {
                200: { description: "Migration result" },
                401: { $ref: "#/components/responses/Unauthorized" },
                403: { $ref: "#/components/responses/Forbidden" },
            },
        },
    },
    "/api/admin/migrate-resume-ids": {
        post: {
            tags: ["Admin"],
            summary: "Migrate resume IDs",
            responses: {
                200: { description: "Migration result" },
                401: { $ref: "#/components/responses/Unauthorized" },
                403: { $ref: "#/components/responses/Forbidden" },
            },
        },
    },

    // ── Seed ───────────────────────────────────────────────────────
    "/api/seed/generate": {
        post: {
            tags: ["Admin"],
            summary: "Generate seed data (dev only)",
            description:
                "Generates demo data. Only available in development mode.",
            responses: {
                200: { description: "Seed data generated" },
                401: { $ref: "#/components/responses/Unauthorized" },
                403: { $ref: "#/components/responses/Forbidden" },
            },
        },
    },
};
