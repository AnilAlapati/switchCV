/* eslint-disable max-lines */
import { createSwaggerSpec } from "next-swagger-doc";
import { authPaths } from "./swagger.auth.paths";
import { userPaths } from "./swagger.user-resume.paths";
import { resumePaths } from "./swagger.resume.paths";
import { recruiterPaths } from "./swagger.recruiter.paths";
import { adminPaths } from "./swagger.admin.paths";

/**
 * Comprehensive OpenAPI 3.0 specification for the SwitchCV API.
 *
 * All 76 routes are documented with request/response schemas, auth
 * requirements, rate-limit tiers, and error codes.
 *
 * Paths are split into focused sub-files by API domain:
 *   - swagger.auth.paths.ts      → Health, System, Auth
 *   - swagger.user-resume.paths.ts → User, Resume, AI, Search, Drafts, Interview, Templates, Skills
 *   - swagger.recruiter.paths.ts → Recruiter, Recruiter Agents
 *   - swagger.admin.paths.ts     → Profiles, Jobseeker, Analytics, Admin, Notifications, Contact
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
              retryAfter: {
                type: "number",
                description: "Seconds until next request allowed",
              },
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
        ...authPaths,
        ...userPaths,
        ...resumePaths,
        ...recruiterPaths,
        ...adminPaths,
      },
    },
  });
  return spec;
};
