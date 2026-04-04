// User, AI, Search, Drafts, Interview, Templates, and Skills API path definitions.
// Resume paths are in swagger.resume.paths.ts.
// Imported and merged into src/lib/swagger.ts.
export const userPaths = {
  // ── User ───────────────────────────────────────────────────────
  "/api/user/settings": {
    get: {
      tags: ["User"],
      summary: "Get user settings",
      description: "Retrieve authenticated user's settings.",
      parameters: [
        {
          name: "userId",
          in: "query",
          required: true,
          schema: { type: "string" },
        },
      ],
      responses: {
        200: {
          description: "User settings",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UserSettings" },
            },
          },
        },
        401: { $ref: "#/components/responses/Unauthorized" },
        403: { $ref: "#/components/responses/Forbidden" },
      },
    },
    put: {
      tags: ["User"],
      summary: "Update user settings",
      description:
        "Update display name, notifications, and privacy preferences.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                displayName: { type: "string" },
                companyName: { type: "string" },
                notifications: { type: "object" },
                privacy: { type: "object" },
              },
            },
          },
        },
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
      description:
        "Switch between jobseeker and recruiter roles. Updates both Firestore and Firebase Auth custom claims.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                role: { type: "string", enum: ["jobseeker", "recruiter"] },
              },
              required: ["role"],
            },
          },
        },
      },
      responses: {
        200: {
          description:
            "Role updated — client must call getIdToken(true) and reload",
        },
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
        200: {
          description: "Current user role",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { role: { type: "string" } },
              },
            },
          },
        },
        401: { $ref: "#/components/responses/Unauthorized" },
      },
    },
  },
  "/api/user/username/check": {
    get: {
      tags: ["User"],
      summary: "Check username availability",
      parameters: [
        {
          name: "username",
          in: "query",
          required: true,
          schema: { type: "string" },
        },
      ],
      responses: {
        200: {
          description: "Availability status",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { available: { type: "boolean" } },
              },
            },
          },
        },
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

  // ── AI ──────────────────────────────────────────────────────────
  "/api/ai/generate": {
    post: {
      tags: ["AI"],
      summary: "Generic AI generation",
      description:
        "General-purpose AI text generation. Rate limited: 10 req/min.",
      responses: {
        200: { description: "Generated content" },
        401: { $ref: "#/components/responses/Unauthorized" },
        429: { $ref: "#/components/responses/RateLimited" },
      },
    },
  },
  "/api/ai/generate-resume": {
    post: {
      tags: ["AI"],
      summary: "AI resume generation (agentic)",
      description:
        "Uses 4-agent pipeline: Scout → Architect → Writer → Auditor.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/AIGenerateRequest" },
          },
        },
      },
      responses: {
        200: { description: "Generated resume" },
        401: { $ref: "#/components/responses/Unauthorized" },
        429: { $ref: "#/components/responses/RateLimited" },
      },
    },
  },
  "/api/ai/models": {
    get: {
      tags: ["AI"],
      summary: "List available AI models",
      description:
        "Returns available models based on user's subscription tier.",
      responses: {
        200: { description: "Model list" },
        401: { $ref: "#/components/responses/Unauthorized" },
      },
    },
  },
  "/api/ai/refresh-models": {
    post: {
      tags: ["AI"],
      summary: "Refresh AI model cache",
      responses: {
        200: { description: "Models refreshed" },
        401: { $ref: "#/components/responses/Unauthorized" },
      },
    },
  },
  "/api/ai/status": {
    get: {
      tags: ["AI"],
      summary: "AI service status",
      description: "Check health and availability of AI providers.",
      responses: {
        200: { description: "AI service status" },
        401: { $ref: "#/components/responses/Unauthorized" },
      },
    },
  },

  // ── Search ──────────────────────────────────────────────────────
  "/api/search/ai": {
    post: {
      tags: ["Search"],
      summary: "AI-powered resume search",
      description:
        "Natural language search across resumes. Rate limited: 20 req/min.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                query: { type: "string" },
                page: { type: "number" },
                pageSize: { type: "number" },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: "Search results",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SearchResult" },
            },
          },
        },
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
      responses: {
        200: { description: "Semantic results" },
        401: { $ref: "#/components/responses/Unauthorized" },
      },
    },
  },

  // ── Drafts ─────────────────────────────────────────────────────
  "/api/drafts/{draftId}": {
    get: {
      tags: ["Drafts"],
      summary: "Get draft by ID",
      parameters: [
        {
          name: "draftId",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      responses: {
        200: { description: "Draft data" },
        401: { $ref: "#/components/responses/Unauthorized" },
        404: { $ref: "#/components/responses/NotFound" },
      },
    },
    put: {
      tags: ["Drafts"],
      summary: "Update draft",
      parameters: [
        {
          name: "draftId",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      responses: {
        200: { description: "Updated" },
        401: { $ref: "#/components/responses/Unauthorized" },
      },
    },
    delete: {
      tags: ["Drafts"],
      summary: "Delete draft",
      parameters: [
        {
          name: "draftId",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      responses: {
        200: { description: "Deleted" },
        401: { $ref: "#/components/responses/Unauthorized" },
      },
    },
  },

  // ── Interview ──────────────────────────────────────────────────
  "/api/interview/assistant": {
    post: {
      tags: ["Interview"],
      summary: "AI interview assistant",
      description: "Get AI-generated interview preparation content.",
      responses: {
        200: { description: "Interview prep content" },
        401: { $ref: "#/components/responses/Unauthorized" },
      },
    },
  },

  // ── Templates & Skills ─────────────────────────────────────────
  "/api/templates": {
    get: {
      tags: ["Templates"],
      summary: "List resume templates",
      responses: {
        200: { description: "Template catalog" },
        401: { $ref: "#/components/responses/Unauthorized" },
      },
    },
  },
  "/api/skills": {
    get: {
      tags: ["Skills"],
      summary: "Skills taxonomy",
      description: "Returns the full skills taxonomy for autocomplete.",
      responses: {
        200: { description: "Skills list" },
        401: { $ref: "#/components/responses/Unauthorized" },
      },
    },
  },
};
