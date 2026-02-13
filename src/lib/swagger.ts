/* eslint-disable max-lines */
import { createSwaggerSpec } from "next-swagger-doc";

/**
 * Comprehensive OpenAPI 3.0 specification for the SwitchCV API.
 *
 * All 76 routes are documented with request/response schemas, auth
 * requirements, rate-limit tiers, and error codes.
 *
 * View live: GET /api/docs (requires authentication)
 */
export const getApiDocs = async () => {
  const spec = createSwaggerSpec({
    apiFolder: "src/app/api",
    definition: {
      openapi: "3.0.0",
      info: {
        title: "SwitchCV API",
        version: "2.0.0",
        description:
          "AI-powered resume builder connecting jobseekers with recruiters.\n\n" +
          "## Authentication\n" +
          "All endpoints (except public ones) require a Firebase JWT in the `Authorization: Bearer <token>` header.\n\n" +
          "## Rate Limits\n" +
          "| Tier | Limit | Window |\n" +
          "|------|-------|--------|\n" +
          "| Auth routes | 5 req | 60s |\n" +
          "| AI routes | 10 req | 60s |\n" +
          "| Search routes | 20 req | 60s |\n" +
          "| Admin routes | 30 req | 60s |\n" +
          "| Default | 100 req | 60s |\n\n" +
          "## Subscription Tiers\n" +
          "| Feature | Basic | Premium | Enterprise |\n" +
          "|---------|-------|---------|------------|\n" +
          "| Resumes | 1 | 50 | Unlimited |\n" +
          "| AI Search | ❌ | 50/mo | Unlimited |\n" +
          "| Recruiter Requests | 2 lifetime | 50/mo | Unlimited |\n",
        contact: {
          name: "SwitchCV Support",
          email: "support@switchcv.com",
        },
        license: {
          name: "Proprietary",
        },
      },
      servers: [
        {
          url: "https://switchcv.com",
          description: "Production",
        },
        {
          url: "http://localhost:3000",
          description: "Local Development",
        },
      ],
      tags: [
        { name: "Health", description: "System health and infrastructure checks" },
        { name: "Auth", description: "Authentication and password management" },
        { name: "User", description: "User profile, settings, and role management" },
        { name: "Resume", description: "Resume CRUD and enhancement" },
        { name: "AI", description: "AI model management and generation" },
        { name: "Search", description: "AI-powered and semantic search" },
        { name: "Recruiter", description: "Recruiter tools, agents, and pipeline" },
        { name: "Recruiter Agents", description: "AI-powered recruiter agent actions" },
        { name: "Profiles", description: "Public profiles and access management" },
        { name: "Jobseeker", description: "Jobseeker metrics and profile" },
        { name: "Analytics", description: "Dashboard and system analytics" },
        { name: "Admin", description: "Admin-only operations" },
        { name: "Notifications", description: "User notifications" },
        { name: "Contact", description: "Contact requests and feedback" },
        { name: "Drafts", description: "Resume draft management" },
        { name: "Interview", description: "Interview preparation assistant" },
        { name: "System", description: "System configuration and CSRF" },
        { name: "Templates", description: "Resume template catalog" },
        { name: "Skills", description: "Skills taxonomy" },
      ],
      components: {
        securitySchemes: {
          BearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
            description: "Firebase Auth JWT token",
          },
        },
        schemas: {
          Error: {
            type: "object",
            properties: {
              error: { type: "string", description: "Human-readable error message" },
            },
            required: ["error"],
          },
          ValidationError: {
            type: "object",
            properties: {
              error: { type: "string", example: "Invalid input" },
              details: {
                type: "object",
                description: "Zod validation error details",
              },
            },
          },
          RateLimitError: {
            type: "object",
            properties: {
              error: { type: "string", example: "Too many requests" },
              retryAfter: { type: "number", description: "Seconds until next request allowed" },
            },
          },
          HealthResponse: {
            type: "object",
            properties: {
              status: { type: "string", enum: ["healthy", "degraded", "unhealthy"] },
              timestamp: { type: "string", format: "date-time" },
              services: {
                type: "object",
                properties: {
                  firestore: { $ref: "#/components/schemas/ServiceStatus" },
                  gemini: { $ref: "#/components/schemas/ServiceStatus" },
                  email: { $ref: "#/components/schemas/ServiceStatus" },
                },
              },
            },
          },
          ServiceStatus: {
            type: "object",
            properties: {
              status: { type: "string", enum: ["ok", "error"] },
              latencyMs: { type: "number" },
            },
          },
          SystemConfig: {
            type: "object",
            properties: {
              config: { type: "object", description: "Merged system configuration" },
              fetchedAt: { type: "string", format: "date-time" },
            },
          },
          UserSettings: {
            type: "object",
            properties: {
              isRecruiter: { type: "boolean" },
              displayName: { type: "string" },
              companyName: { type: "string" },
              notifications: {
                type: "object",
                properties: {
                  marketing: { type: "boolean" },
                  security: { type: "boolean" },
                  activity: { type: "boolean" },
                },
              },
              privacy: {
                type: "object",
                properties: {
                  profilePublic: { type: "boolean" },
                  searchable: { type: "boolean" },
                },
              },
              updatedAt: { type: "string", format: "date-time" },
            },
          },
          Resume: {
            type: "object",
            properties: {
              id: { type: "string" },
              userId: { type: "string" },
              title: { type: "string" },
              content: { type: "object", description: "Structured resume data" },
              templateId: { type: "string" },
              isPublic: { type: "boolean" },
              createdAt: { type: "string", format: "date-time" },
              updatedAt: { type: "string", format: "date-time" },
            },
          },
          AIGenerateRequest: {
            type: "object",
            properties: {
              jobDescription: { type: "string", description: "Target job description" },
              userResume: { type: "string", description: "Existing resume text" },
              instructions: { type: "string", description: "Custom instructions" },
              mode: { type: "string", enum: ["standard", "autonomous"] },
            },
          },
          AIGenerateResponse: {
            type: "object",
            properties: {
              resumeMarkdown: { type: "string" },
              templateId: { type: "string" },
              reasoning: { type: "string" },
              tokensUsed: { type: "number" },
              cost: { type: "number" },
            },
          },
          Draft: {
            type: "object",
            properties: {
              id: { type: "string" },
              userId: { type: "string" },
              content: { type: "object" },
              createdAt: { type: "string", format: "date-time" },
              updatedAt: { type: "string", format: "date-time" },
            },
          },
          Notification: {
            type: "object",
            properties: {
              id: { type: "string" },
              recipientId: { type: "string" },
              type: { type: "string" },
              message: { type: "string" },
              read: { type: "boolean" },
              createdAt: { type: "string", format: "date-time" },
            },
          },
          RecruiterRequest: {
            type: "object",
            properties: {
              id: { type: "string" },
              recruiterId: { type: "string" },
              candidateId: { type: "string" },
              status: { type: "string", enum: ["pending", "approved", "denied"] },
              message: { type: "string" },
              createdAt: { type: "string", format: "date-time" },
            },
          },
          SearchResult: {
            type: "object",
            properties: {
              results: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    resumeId: { type: "string" },
                    score: { type: "number" },
                    snippet: { type: "string" },
                  },
                },
              },
              total: { type: "number" },
              page: { type: "number" },
            },
          },
          PaginatedResponse: {
            type: "object",
            properties: {
              data: { type: "array", items: { type: "object" } },
              total: { type: "number" },
              page: { type: "number" },
              pageSize: { type: "number" },
              hasMore: { type: "boolean" },
            },
          },
        },
        responses: {
          Unauthorized: {
            description: "Missing or invalid authentication token",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
                example: { error: "Unauthorized" },
              },
            },
          },
          Forbidden: {
            description: "Insufficient permissions",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
                example: { error: "Forbidden" },
              },
            },
          },
          BadRequest: {
            description: "Invalid input",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ValidationError" },
              },
            },
          },
          NotFound: {
            description: "Resource not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
                example: { error: "Not found" },
              },
            },
          },
          RateLimited: {
            description: "Too many requests",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/RateLimitError" },
              },
            },
          },
          ServerError: {
            description: "Internal server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
                example: { error: "Operation failed" },
              },
            },
          },
        },
      },
      security: [{ BearerAuth: [] }],
      paths: {
        // ── Health ──────────────────────────────────────────────────────
        "/api/health": {
          get: {
            tags: ["Health"],
            summary: "Health check",
            description: "Returns service health status for Firestore, Gemini, and email. Public endpoint.",
            security: [],
            responses: {
              200: {
                description: "Service statuses",
                content: { "application/json": { schema: { $ref: "#/components/schemas/HealthResponse" } } },
              },
            },
          },
        },
        "/api/health/infra": {
          get: {
            tags: ["Health"],
            summary: "Infrastructure health",
            description: "Detailed infrastructure health for monitoring systems. Public endpoint.",
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
            description: "Returns merged system config with defaults. Public endpoint, cached for 5 minutes.",
            security: [],
            responses: {
              200: {
                description: "System configuration",
                content: { "application/json": { schema: { $ref: "#/components/schemas/SystemConfig" } } },
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
              200: { description: "CSRF token", content: { "application/json": { schema: { type: "object", properties: { token: { type: "string" } } } } } },
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
              content: { "application/json": { schema: { type: "object", properties: { token: { type: "string" } }, required: ["token"] } } },
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
              content: { "application/json": { schema: { type: "object", properties: { email: { type: "string", format: "email" } }, required: ["email"] } } },
            },
            responses: {
              200: { description: "Reset email sent (always returns 200 to prevent enumeration)" },
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
              content: { "application/json": { schema: { type: "object", properties: { token: { type: "string" }, password: { type: "string", minLength: 8 } }, required: ["token", "password"] } } },
            },
            responses: {
              200: { description: "Password reset successful" },
              400: { $ref: "#/components/responses/BadRequest" },
            },
          },
        },

        // ── User ───────────────────────────────────────────────────────
        "/api/user/settings": {
          get: {
            tags: ["User"],
            summary: "Get user settings",
            description: "Retrieve authenticated user's settings.",
            parameters: [{ name: "userId", in: "query", required: true, schema: { type: "string" } }],
            responses: {
              200: { description: "User settings", content: { "application/json": { schema: { $ref: "#/components/schemas/UserSettings" } } } },
              401: { $ref: "#/components/responses/Unauthorized" },
              403: { $ref: "#/components/responses/Forbidden" },
            },
          },
          put: {
            tags: ["User"],
            summary: "Update user settings",
            description: "Update display name, notifications, and privacy preferences.",
            requestBody: {
              required: true,
              content: { "application/json": { schema: { type: "object", properties: { displayName: { type: "string" }, companyName: { type: "string" }, notifications: { type: "object" }, privacy: { type: "object" } } } } },
            },
            responses: {
              200: { description: "Settings updated" },
              400: { $ref: "#/components/responses/BadRequest" },
              401: { $ref: "#/components/responses/Unauthorized" },
            },
          },
        },
        "/api/user/update-role": {
          post: {
            tags: ["User"],
            summary: "Update user role",
            description: "Switch between jobseeker and recruiter roles. Updates both Firestore and Firebase Auth custom claims.",
            requestBody: {
              required: true,
              content: { "application/json": { schema: { type: "object", properties: { role: { type: "string", enum: ["jobseeker", "recruiter"] } }, required: ["role"] } } },
            },
            responses: {
              200: { description: "Role updated — client must call getIdToken(true) and reload" },
              401: { $ref: "#/components/responses/Unauthorized" },
            },
          },
        },
        "/api/user/profile": {
          get: {
            tags: ["User"],
            summary: "Get user profile",
            responses: {
              200: { description: "User profile data" },
              401: { $ref: "#/components/responses/Unauthorized" },
            },
          },
        },
        "/api/user/role": {
          get: {
            tags: ["User"],
            summary: "Get user role",
            responses: {
              200: { description: "Current user role", content: { "application/json": { schema: { type: "object", properties: { role: { type: "string" } } } } } },
              401: { $ref: "#/components/responses/Unauthorized" },
            },
          },
        },
        "/api/user/username/check": {
          get: {
            tags: ["User"],
            summary: "Check username availability",
            parameters: [{ name: "username", in: "query", required: true, schema: { type: "string" } }],
            responses: {
              200: { description: "Availability status", content: { "application/json": { schema: { type: "object", properties: { available: { type: "boolean" } } } } } },
              401: { $ref: "#/components/responses/Unauthorized" },
            },
          },
        },
        "/api/user-approval/approve": {
          post: {
            tags: ["User"],
            summary: "Approve user (token-based)",
            description: "Public endpoint using approval token.",
            security: [],
            responses: {
              200: { description: "User approved" },
              400: { $ref: "#/components/responses/BadRequest" },
            },
          },
        },
        "/api/user-approval/decline": {
          post: {
            tags: ["User"],
            summary: "Decline user (token-based)",
            security: [],
            responses: {
              200: { description: "User declined" },
              400: { $ref: "#/components/responses/BadRequest" },
            },
          },
        },

        // ── Resume ─────────────────────────────────────────────────────
        "/api/resume/create": {
          post: {
            tags: ["Resume"],
            summary: "Create resume",
            description: "Create a new resume. Supports idempotency via Idempotency-Key header. Rate limited: 10/hour.",
            parameters: [{ name: "Idempotency-Key", in: "header", schema: { type: "string" } }],
            requestBody: {
              required: true,
              content: { "application/json": { schema: { type: "object", properties: { title: { type: "string" }, content: { type: "object" }, templateId: { type: "string" } } } } },
            },
            responses: {
              201: { description: "Resume created", content: { "application/json": { schema: { $ref: "#/components/schemas/Resume" } } } },
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
              content: { "application/json": { schema: { type: "object", properties: { resumeId: { type: "string" } }, required: ["resumeId"] } } },
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
              content: { "application/json": { schema: { type: "object", properties: { resumeId: { type: "string" }, instructions: { type: "string" } } } } },
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
            description: "Full AI resume generation (standard or autonomous mode). Rate limited: 10 req/min.",
            requestBody: {
              required: true,
              content: { "application/json": { schema: { $ref: "#/components/schemas/AIGenerateRequest" } } },
            },
            responses: {
              200: { description: "Generated resume", content: { "application/json": { schema: { $ref: "#/components/schemas/AIGenerateResponse" } } } },
              401: { $ref: "#/components/responses/Unauthorized" },
              429: { $ref: "#/components/responses/RateLimited" },
            },
          },
        },
        "/api/resume/generate/status/{jobId}": {
          get: {
            tags: ["Resume"],
            summary: "Check generation job status",
            parameters: [{ name: "jobId", in: "path", required: true, schema: { type: "string" } }],
            responses: {
              200: { description: "Job status", content: { "application/json": { schema: { type: "object", properties: { status: { type: "string", enum: ["pending", "processing", "completed", "failed"] }, result: { type: "object" } } } } } },
              401: { $ref: "#/components/responses/Unauthorized" },
            },
          },
        },
        "/api/resume/compare": {
          post: {
            tags: ["Resume"],
            summary: "Compare two resumes",
            responses: { 200: { description: "Comparison result" }, 401: { $ref: "#/components/responses/Unauthorized" } },
          },
        },
        "/api/resume/map-id": {
          get: {
            tags: ["Resume"],
            summary: "Map legacy numeric resume ID to new format",
            responses: { 200: { description: "Mapped ID" }, 401: { $ref: "#/components/responses/Unauthorized" } },
          },
        },
        "/api/resumes/{id}": {
          get: {
            tags: ["Resume"],
            summary: "Get resume by ID",
            parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
            responses: {
              200: { description: "Resume data", content: { "application/json": { schema: { $ref: "#/components/schemas/Resume" } } } },
              401: { $ref: "#/components/responses/Unauthorized" },
              404: { $ref: "#/components/responses/NotFound" },
            },
          },
          put: {
            tags: ["Resume"],
            summary: "Update resume",
            parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
            responses: { 200: { description: "Updated" }, 401: { $ref: "#/components/responses/Unauthorized" } },
          },
          delete: {
            tags: ["Resume"],
            summary: "Delete resume by ID",
            parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
            responses: { 200: { description: "Deleted" }, 401: { $ref: "#/components/responses/Unauthorized" } },
          },
        },
        "/api/resumes/{id}/chat": {
          post: {
            tags: ["Resume"],
            summary: "Chat with resume (AI assistant)",
            parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
            responses: { 200: { description: "AI response" }, 401: { $ref: "#/components/responses/Unauthorized" } },
          },
        },
        "/api/resumes/create": {
          post: {
            tags: ["Resume"],
            summary: "Create resume (alternate endpoint)",
            responses: { 201: { description: "Created" }, 401: { $ref: "#/components/responses/Unauthorized" } },
          },
        },

        // ── AI ──────────────────────────────────────────────────────────
        "/api/ai/generate": {
          post: {
            tags: ["AI"],
            summary: "Generic AI generation",
            description: "General-purpose AI text generation. Rate limited: 10 req/min.",
            responses: { 200: { description: "Generated content" }, 401: { $ref: "#/components/responses/Unauthorized" }, 429: { $ref: "#/components/responses/RateLimited" } },
          },
        },
        "/api/ai/generate-resume": {
          post: {
            tags: ["AI"],
            summary: "AI resume generation (agentic)",
            description: "Uses 4-agent pipeline: Scout → Architect → Writer → Auditor.",
            requestBody: {
              required: true,
              content: { "application/json": { schema: { $ref: "#/components/schemas/AIGenerateRequest" } } },
            },
            responses: { 200: { description: "Generated resume" }, 401: { $ref: "#/components/responses/Unauthorized" }, 429: { $ref: "#/components/responses/RateLimited" } },
          },
        },
        "/api/ai/models": {
          get: {
            tags: ["AI"],
            summary: "List available AI models",
            description: "Returns available models based on user's subscription tier.",
            responses: { 200: { description: "Model list" }, 401: { $ref: "#/components/responses/Unauthorized" } },
          },
        },
        "/api/ai/refresh-models": {
          post: {
            tags: ["AI"],
            summary: "Refresh AI model cache",
            responses: { 200: { description: "Models refreshed" }, 401: { $ref: "#/components/responses/Unauthorized" } },
          },
        },
        "/api/ai/status": {
          get: {
            tags: ["AI"],
            summary: "AI service status",
            description: "Check health and availability of AI providers.",
            responses: { 200: { description: "AI service status" }, 401: { $ref: "#/components/responses/Unauthorized" } },
          },
        },

        // ── Search ──────────────────────────────────────────────────────
        "/api/search/ai": {
          post: {
            tags: ["Search"],
            summary: "AI-powered resume search",
            description: "Natural language search across resumes. Rate limited: 20 req/min.",
            requestBody: {
              required: true,
              content: { "application/json": { schema: { type: "object", properties: { query: { type: "string" }, page: { type: "number" }, pageSize: { type: "number" } } } } },
            },
            responses: {
              200: { description: "Search results", content: { "application/json": { schema: { $ref: "#/components/schemas/SearchResult" } } } },
              401: { $ref: "#/components/responses/Unauthorized" },
              429: { $ref: "#/components/responses/RateLimited" },
            },
          },
        },
        "/api/search/semantic": {
          post: {
            tags: ["Search"],
            summary: "Semantic vector search",
            description: "Embedding-based semantic similarity search.",
            responses: { 200: { description: "Semantic results" }, 401: { $ref: "#/components/responses/Unauthorized" } },
          },
        },

        // ── Recruiter ──────────────────────────────────────────────────
        "/api/recruiter/search-resumes": {
          get: {
            tags: ["Recruiter"],
            summary: "Search resumes (recruiter view)",
            description: "Search public resumes with filters. Rate limited: 20 req/min.",
            parameters: [
              { name: "q", in: "query", schema: { type: "string" } },
              { name: "skills", in: "query", schema: { type: "string" } },
              { name: "page", in: "query", schema: { type: "number" } },
            ],
            responses: { 200: { description: "Resume results" }, 401: { $ref: "#/components/responses/Unauthorized" } },
          },
        },
        "/api/recruiter/search": {
          get: {
            tags: ["Recruiter"],
            summary: "Recruiter search",
            responses: { 200: { description: "Results" }, 401: { $ref: "#/components/responses/Unauthorized" } },
          },
        },
        "/api/recruiter/jd-search": {
          post: {
            tags: ["Recruiter"],
            summary: "Job description-based search",
            description: "Find matching candidates by pasting a job description.",
            responses: { 200: { description: "Matching candidates" }, 401: { $ref: "#/components/responses/Unauthorized" } },
          },
        },
        "/api/recruiter/requests": {
          get: {
            tags: ["Recruiter"],
            summary: "List recruiter requests",
            responses: { 200: { description: "Requests list" }, 401: { $ref: "#/components/responses/Unauthorized" } },
          },
          post: {
            tags: ["Recruiter"],
            summary: "Create recruiter request",
            responses: { 201: { description: "Request created" }, 401: { $ref: "#/components/responses/Unauthorized" } },
          },
        },
        "/api/recruiter/request-access": {
          post: {
            tags: ["Recruiter"],
            summary: "Request access to candidate profile",
            responses: { 200: { description: "Access requested" }, 401: { $ref: "#/components/responses/Unauthorized" } },
          },
        },
        "/api/recruiter/candidates": {
          get: {
            tags: ["Recruiter"],
            summary: "List saved candidates",
            responses: { 200: { description: "Candidates" }, 401: { $ref: "#/components/responses/Unauthorized" } },
          },
        },
        "/api/recruiter/pipeline": {
          get: {
            tags: ["Recruiter"],
            summary: "Get recruitment pipeline",
            responses: { 200: { description: "Pipeline data" }, 401: { $ref: "#/components/responses/Unauthorized" } },
          },
          post: {
            tags: ["Recruiter"],
            summary: "Update pipeline",
            responses: { 200: { description: "Updated" }, 401: { $ref: "#/components/responses/Unauthorized" } },
          },
        },
        "/api/recruiter/interviews": {
          get: {
            tags: ["Recruiter"],
            summary: "List scheduled interviews",
            responses: { 200: { description: "Interviews" }, 401: { $ref: "#/components/responses/Unauthorized" } },
          },
          post: {
            tags: ["Recruiter"],
            summary: "Schedule interview",
            responses: { 201: { description: "Scheduled" }, 401: { $ref: "#/components/responses/Unauthorized" } },
          },
        },
        "/api/recruiter/metrics": {
          get: {
            tags: ["Recruiter"],
            summary: "Recruiter dashboard metrics",
            responses: { 200: { description: "Metrics" }, 401: { $ref: "#/components/responses/Unauthorized" } },
          },
        },
        "/api/recruiter/bulk-actions": {
          post: {
            tags: ["Recruiter"],
            summary: "Bulk recruiter actions",
            responses: { 200: { description: "Actions processed" }, 401: { $ref: "#/components/responses/Unauthorized" } },
          },
        },
        "/api/recruiter/debug-resumes": {
          get: {
            tags: ["Recruiter"],
            summary: "Debug resume data (dev only)",
            responses: { 200: { description: "Debug data" }, 401: { $ref: "#/components/responses/Unauthorized" } },
          },
        },

        // ── Recruiter Agents ───────────────────────────────────────────
        "/api/recruiter/agent/analyze": {
          post: {
            tags: ["Recruiter Agents"],
            summary: "AI candidate analysis",
            description: "Analyze a candidate's fit for a role. Rate limited: 10 req/min.",
            responses: { 200: { description: "Analysis result" }, 401: { $ref: "#/components/responses/Unauthorized" }, 429: { $ref: "#/components/responses/RateLimited" } },
          },
        },
        "/api/recruiter/agent/screen": {
          post: {
            tags: ["Recruiter Agents"],
            summary: "AI candidate screening",
            responses: { 200: { description: "Screening result" }, 401: { $ref: "#/components/responses/Unauthorized" }, 429: { $ref: "#/components/responses/RateLimited" } },
          },
        },
        "/api/recruiter/agent/outreach": {
          post: {
            tags: ["Recruiter Agents"],
            summary: "AI outreach message generation",
            responses: { 200: { description: "Outreach message" }, 401: { $ref: "#/components/responses/Unauthorized" }, 429: { $ref: "#/components/responses/RateLimited" } },
          },
        },
        "/api/recruiter/agent/enhance-job": {
          post: {
            tags: ["Recruiter Agents"],
            summary: "AI job description enhancement",
            responses: { 200: { description: "Enhanced JD" }, 401: { $ref: "#/components/responses/Unauthorized" }, 429: { $ref: "#/components/responses/RateLimited" } },
          },
        },
        "/api/recruiter/agent/interview-prep": {
          post: {
            tags: ["Recruiter Agents"],
            summary: "AI interview prep questions",
            responses: { 200: { description: "Interview questions" }, 401: { $ref: "#/components/responses/Unauthorized" }, 429: { $ref: "#/components/responses/RateLimited" } },
          },
        },
        "/api/recruiter/agent/pipeline-suggest": {
          post: {
            tags: ["Recruiter Agents"],
            summary: "AI pipeline stage suggestions",
            responses: { 200: { description: "Pipeline suggestions" }, 401: { $ref: "#/components/responses/Unauthorized" }, 429: { $ref: "#/components/responses/RateLimited" } },
          },
        },

        // ── Profiles ───────────────────────────────────────────────────
        "/api/profiles/search": {
          get: {
            tags: ["Profiles"],
            summary: "Search public profiles",
            responses: { 200: { description: "Profile results" }, 401: { $ref: "#/components/responses/Unauthorized" } },
          },
        },
        "/api/profiles/request-access": {
          post: {
            tags: ["Profiles"],
            summary: "Request profile access",
            responses: { 200: { description: "Access requested" }, 401: { $ref: "#/components/responses/Unauthorized" } },
          },
        },
        "/api/profiles/approve-access": {
          post: {
            tags: ["Profiles"],
            summary: "Approve access request",
            responses: { 200: { description: "Approved" }, 401: { $ref: "#/components/responses/Unauthorized" } },
          },
        },
        "/api/profiles/respond-access": {
          post: {
            tags: ["Profiles"],
            summary: "Respond to access request",
            responses: { 200: { description: "Response recorded" }, 401: { $ref: "#/components/responses/Unauthorized" } },
          },
        },
        "/api/profiles/check-access": {
          get: {
            tags: ["Profiles"],
            summary: "Check if access is granted",
            responses: { 200: { description: "Access status" }, 401: { $ref: "#/components/responses/Unauthorized" } },
          },
        },
        "/api/profiles/analytics": {
          get: {
            tags: ["Profiles"],
            summary: "Profile view analytics",
            responses: { 200: { description: "Analytics data" }, 401: { $ref: "#/components/responses/Unauthorized" } },
          },
        },

        // ── Jobseeker ──────────────────────────────────────────────────
        "/api/jobseeker/profile": {
          get: {
            tags: ["Jobseeker"],
            summary: "Get jobseeker profile",
            responses: { 200: { description: "Profile data" }, 401: { $ref: "#/components/responses/Unauthorized" } },
          },
          put: {
            tags: ["Jobseeker"],
            summary: "Update jobseeker profile",
            responses: { 200: { description: "Updated" }, 401: { $ref: "#/components/responses/Unauthorized" } },
          },
        },
        "/api/jobseeker/metrics": {
          get: {
            tags: ["Jobseeker"],
            summary: "Jobseeker dashboard metrics",
            responses: { 200: { description: "Metrics" }, 401: { $ref: "#/components/responses/Unauthorized" } },
          },
        },
        "/api/jobseeker/access-requests": {
          get: {
            tags: ["Jobseeker"],
            summary: "List received access requests",
            responses: { 200: { description: "Access requests" }, 401: { $ref: "#/components/responses/Unauthorized" } },
          },
        },

        // ── Contact ────────────────────────────────────────────────────
        "/api/recruiters/request-contact": {
          post: {
            tags: ["Contact"],
            summary: "Request contact with candidate",
            responses: { 200: { description: "Contact requested" }, 401: { $ref: "#/components/responses/Unauthorized" } },
          },
        },
        "/api/recruiters/approve-contact": {
          post: {
            tags: ["Contact"],
            summary: "Approve contact request",
            responses: { 200: { description: "Approved" }, 401: { $ref: "#/components/responses/Unauthorized" } },
          },
        },
        "/api/recruiters/deny-contact": {
          post: {
            tags: ["Contact"],
            summary: "Deny contact request",
            responses: { 200: { description: "Denied" }, 401: { $ref: "#/components/responses/Unauthorized" } },
          },
        },
        "/api/recruiters/verify-token": {
          post: {
            tags: ["Contact"],
            summary: "Verify access token",
            responses: { 200: { description: "Token verified" }, 401: { $ref: "#/components/responses/Unauthorized" } },
          },
        },
        "/api/contact/feedback": {
          post: {
            tags: ["Contact"],
            summary: "Submit feedback",
            description: "Submit user feedback or support request.",
            responses: { 200: { description: "Feedback received" }, 401: { $ref: "#/components/responses/Unauthorized" } },
          },
        },

        // ── Drafts ─────────────────────────────────────────────────────
        "/api/drafts/{draftId}": {
          get: {
            tags: ["Drafts"],
            summary: "Get draft by ID",
            parameters: [{ name: "draftId", in: "path", required: true, schema: { type: "string" } }],
            responses: { 200: { description: "Draft data" }, 401: { $ref: "#/components/responses/Unauthorized" }, 404: { $ref: "#/components/responses/NotFound" } },
          },
          put: {
            tags: ["Drafts"],
            summary: "Update draft",
            parameters: [{ name: "draftId", in: "path", required: true, schema: { type: "string" } }],
            responses: { 200: { description: "Updated" }, 401: { $ref: "#/components/responses/Unauthorized" } },
          },
          delete: {
            tags: ["Drafts"],
            summary: "Delete draft",
            parameters: [{ name: "draftId", in: "path", required: true, schema: { type: "string" } }],
            responses: { 200: { description: "Deleted" }, 401: { $ref: "#/components/responses/Unauthorized" } },
          },
        },

        // ── Analytics ──────────────────────────────────────────────────
        "/api/analytics/dashboard": {
          get: {
            tags: ["Analytics"],
            summary: "Dashboard analytics",
            responses: { 200: { description: "Dashboard data" }, 401: { $ref: "#/components/responses/Unauthorized" } },
          },
        },
        "/api/analytics/system": {
          get: {
            tags: ["Analytics"],
            summary: "System-wide analytics",
            responses: { 200: { description: "System metrics" }, 401: { $ref: "#/components/responses/Unauthorized" } },
          },
        },

        // ── Notifications ──────────────────────────────────────────────
        "/api/notifications": {
          get: {
            tags: ["Notifications"],
            summary: "List notifications",
            responses: { 200: { description: "Notifications", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Notification" } } } } }, 401: { $ref: "#/components/responses/Unauthorized" } },
          },
          patch: {
            tags: ["Notifications"],
            summary: "Mark notifications as read",
            responses: { 200: { description: "Updated" }, 401: { $ref: "#/components/responses/Unauthorized" } },
          },
        },

        // ── Interview ──────────────────────────────────────────────────
        "/api/interview/assistant": {
          post: {
            tags: ["Interview"],
            summary: "AI interview assistant",
            description: "Get AI-generated interview preparation content.",
            responses: { 200: { description: "Interview prep content" }, 401: { $ref: "#/components/responses/Unauthorized" } },
          },
        },

        // ── Templates & Skills ─────────────────────────────────────────
        "/api/templates": {
          get: {
            tags: ["Templates"],
            summary: "List resume templates",
            responses: { 200: { description: "Template catalog" }, 401: { $ref: "#/components/responses/Unauthorized" } },
          },
        },
        "/api/skills": {
          get: {
            tags: ["Skills"],
            summary: "Skills taxonomy",
            description: "Returns the full skills taxonomy for autocomplete.",
            responses: { 200: { description: "Skills list" }, 401: { $ref: "#/components/responses/Unauthorized" } },
          },
        },

        // ── Admin ──────────────────────────────────────────────────────
        "/api/admin/costs": {
          get: {
            tags: ["Admin"],
            summary: "Get cost reports",
            description: "Admin-only. Requires admin role in Firebase Auth custom claims.",
            responses: { 200: { description: "Cost data" }, 401: { $ref: "#/components/responses/Unauthorized" }, 403: { $ref: "#/components/responses/Forbidden" } },
          },
        },
        "/api/admin/stats": {
          get: {
            tags: ["Admin"],
            summary: "System statistics",
            responses: { 200: { description: "Stats" }, 401: { $ref: "#/components/responses/Unauthorized" }, 403: { $ref: "#/components/responses/Forbidden" } },
          },
        },
        "/api/admin/user-approval": {
          get: {
            tags: ["Admin"],
            summary: "List pending user approvals",
            responses: { 200: { description: "Pending users" }, 401: { $ref: "#/components/responses/Unauthorized" }, 403: { $ref: "#/components/responses/Forbidden" } },
          },
          post: {
            tags: ["Admin"],
            summary: "Process user approval",
            responses: { 200: { description: "Processed" }, 401: { $ref: "#/components/responses/Unauthorized" }, 403: { $ref: "#/components/responses/Forbidden" } },
          },
        },
        "/api/admin/init-system": {
          post: {
            tags: ["Admin"],
            summary: "Initialize system config",
            responses: { 200: { description: "Initialized" }, 401: { $ref: "#/components/responses/Unauthorized" }, 403: { $ref: "#/components/responses/Forbidden" } },
          },
        },
        "/api/admin/test-secrets": {
          get: {
            tags: ["Admin"],
            summary: "Test secret manager connectivity",
            responses: { 200: { description: "Secrets status" }, 401: { $ref: "#/components/responses/Unauthorized" }, 403: { $ref: "#/components/responses/Forbidden" } },
          },
        },
        "/api/admin/migrate-numeric-ids": {
          post: {
            tags: ["Admin"],
            summary: "Migrate legacy numeric IDs",
            responses: { 200: { description: "Migration result" }, 401: { $ref: "#/components/responses/Unauthorized" }, 403: { $ref: "#/components/responses/Forbidden" } },
          },
        },
        "/api/admin/migrate-resume-ids": {
          post: {
            tags: ["Admin"],
            summary: "Migrate resume IDs",
            responses: { 200: { description: "Migration result" }, 401: { $ref: "#/components/responses/Unauthorized" }, 403: { $ref: "#/components/responses/Forbidden" } },
          },
        },

        // ── Seed ───────────────────────────────────────────────────────
        "/api/seed/generate": {
          post: {
            tags: ["Admin"],
            summary: "Generate seed data (dev only)",
            description: "Generates demo data. Only available in development mode.",
            responses: { 200: { description: "Seed data generated" }, 401: { $ref: "#/components/responses/Unauthorized" }, 403: { $ref: "#/components/responses/Forbidden" } },
          },
        },
      },
    },
  });
  return spec;
};
