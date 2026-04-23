/**
 * OpenAPI 3.0 specification for the Preventli API.
 * Mounted at /api/docs via swagger-ui-express.
 */

export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Preventli API",
    version: "1.0.0",
    description:
      "Workers' compensation case management platform — REST API reference.\n\n" +
      "**Authentication**: Most endpoints require a valid JWT Bearer token obtained from `POST /api/auth/login`. " +
      "Magic-link public endpoints (`/api/public/*`) require no authentication.",
    contact: {
      name: "Preventli Support",
      email: "support@preventli.ai",
      url: "https://app.preventli.ai",
    },
  },
  servers: [
    {
      url: "https://gpnet3.onrender.com",
      description: "Production",
    },
    {
      url: "http://localhost:5000",
      description: "Local development",
    },
  ],
  tags: [
    { name: "Auth", description: "Login, logout, magic links, session management" },
    { name: "Cases", description: "Worker case lifecycle management" },
    { name: "Workers", description: "Worker profile management" },
    { name: "Assessments", description: "Health assessments sent to workers" },
    { name: "Certificates", description: "Medical certificate tracking" },
    { name: "RTW Plans", description: "Return-to-work plan generation and management" },
    { name: "Bookings", description: "Telehealth appointment scheduling" },
    { name: "Employer", description: "Employer dashboard and case portfolio" },
    { name: "Notifications", description: "In-app notification feed" },
    { name: "Support", description: "In-app support contact form" },
    { name: "Admin", description: "Platform administration (admin role required)" },
    { name: "Public", description: "Unauthenticated worker-facing endpoints (magic link)" },
    { name: "Health", description: "Service health and diagnostics" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "JWT token from POST /api/auth/login",
      },
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          error: { type: "string", example: "Unauthorized" },
        },
      },
      User: {
        type: "object",
        properties: {
          id: { type: "integer" },
          email: { type: "string", format: "email" },
          name: { type: "string" },
          role: {
            type: "string",
            enum: ["admin", "case_manager", "employer", "worker"],
          },
          organizationId: { type: "integer", nullable: true },
        },
      },
      Case: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          workerId: { type: "integer" },
          status: {
            type: "string",
            enum: ["open", "active", "closed", "archived"],
          },
          injuryDate: { type: "string", format: "date" },
          injuryDescription: { type: "string" },
          lifecycleStage: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Assessment: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          caseId: { type: "string", format: "uuid" },
          workerId: { type: "integer" },
          status: {
            type: "string",
            enum: ["pending", "sent", "completed", "expired"],
          },
          sentAt: { type: "string", format: "date-time", nullable: true },
          completedAt: { type: "string", format: "date-time", nullable: true },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Notification: {
        type: "object",
        properties: {
          id: { type: "integer" },
          userId: { type: "integer" },
          type: { type: "string" },
          title: { type: "string" },
          body: { type: "string" },
          isRead: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      SupportContactRequest: {
        type: "object",
        required: ["subject", "message"],
        properties: {
          subject: {
            type: "string",
            minLength: 1,
            maxLength: 200,
            example: "Can't upload a certificate",
          },
          message: {
            type: "string",
            minLength: 10,
            maxLength: 5000,
            example: "When I click the upload button nothing happens...",
          },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    // ── Health ──────────────────────────────────────────────────────────────
    "/api/health": {
      get: {
        tags: ["Health"],
        summary: "Liveness check",
        security: [],
        responses: {
          200: {
            description: "Service is up",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "ok" },
                    timestamp: { type: "string", format: "date-time" },
                  },
                },
              },
            },
          },
        },
      },
    },

    // ── Auth ────────────────────────────────────────────────────────────────
    "/api/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login with email and password",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string", minLength: 8 },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Login successful",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    token: { type: "string", description: "JWT Bearer token" },
                    user: { $ref: "#/components/schemas/User" },
                  },
                },
              },
            },
          },
          401: { description: "Invalid credentials", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/api/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Invalidate current session",
        responses: {
          200: { description: "Logged out" },
          401: { description: "Not authenticated" },
        },
      },
    },
    "/api/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Get current authenticated user",
        responses: {
          200: {
            description: "Authenticated user",
            content: { "application/json": { schema: { $ref: "#/components/schemas/User" } } },
          },
          401: { description: "Not authenticated" },
        },
      },
    },
    "/api/auth/magic-link": {
      post: {
        tags: ["Auth"],
        summary: "Send magic link to worker email",
        responses: {
          200: { description: "Magic link sent" },
          404: { description: "Worker not found" },
        },
      },
    },
    "/api/auth/csrf-token": {
      get: {
        tags: ["Auth"],
        summary: "Get CSRF token for form submissions",
        security: [],
        responses: {
          200: {
            description: "CSRF token",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { csrfToken: { type: "string" } },
                },
              },
            },
          },
        },
      },
    },

    // ── Cases ───────────────────────────────────────────────────────────────
    "/api/cases": {
      get: {
        tags: ["Cases"],
        summary: "List cases (scoped to caller's role and organisation)",
        responses: {
          200: {
            description: "Array of cases",
            content: {
              "application/json": {
                schema: { type: "array", items: { $ref: "#/components/schemas/Case" } },
              },
            },
          },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/cases/{caseId}": {
      get: {
        tags: ["Cases"],
        summary: "Get a single case",
        parameters: [{ name: "caseId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          200: { description: "Case detail", content: { "application/json": { schema: { $ref: "#/components/schemas/Case" } } } },
          403: { description: "Forbidden" },
          404: { description: "Not found" },
        },
      },
      patch: {
        tags: ["Cases"],
        summary: "Update case fields",
        parameters: [{ name: "caseId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  status: { type: "string" },
                  injuryDescription: { type: "string" },
                  lifecycleStage: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Updated case" },
          403: { description: "Forbidden" },
          404: { description: "Not found" },
        },
      },
    },

    // ── Employer ─────────────────────────────────────────────────────────────
    "/api/employer/cases": {
      get: {
        tags: ["Employer"],
        summary: "List cases for employer dashboard",
        responses: {
          200: { description: "Employer cases array" },
          401: { description: "Unauthorized" },
          403: { description: "Employer role required" },
        },
      },
      post: {
        tags: ["Employer"],
        summary: "Create a new case",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["workerId", "injuryDate"],
                properties: {
                  workerId: { type: "integer" },
                  injuryDate: { type: "string", format: "date" },
                  injuryDescription: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Case created", content: { "application/json": { schema: { $ref: "#/components/schemas/Case" } } } },
          400: { description: "Validation error" },
          403: { description: "Forbidden" },
        },
      },
    },
    "/api/employer/summary": {
      get: {
        tags: ["Employer"],
        summary: "Portfolio-level summary metrics",
        responses: {
          200: {
            description: "Summary stats",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    totalCases: { type: "integer" },
                    activeCases: { type: "integer" },
                    overdueActions: { type: "integer" },
                  },
                },
              },
            },
          },
        },
      },
    },

    // ── Assessments ──────────────────────────────────────────────────────────
    "/api/assessments": {
      get: {
        tags: ["Assessments"],
        summary: "List assessments (scoped by role)",
        responses: {
          200: {
            description: "Assessment list",
            content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Assessment" } } } },
          },
        },
      },
      post: {
        tags: ["Assessments"],
        summary: "Create and optionally send an assessment",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["caseId", "workerId"],
                properties: {
                  caseId: { type: "string", format: "uuid" },
                  workerId: { type: "integer" },
                  sendImmediately: { type: "boolean", default: false },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Assessment created" },
          400: { description: "Validation error" },
        },
      },
    },
    "/api/assessments/{assessmentId}": {
      get: {
        tags: ["Assessments"],
        summary: "Get assessment detail",
        parameters: [{ name: "assessmentId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          200: { description: "Assessment", content: { "application/json": { schema: { $ref: "#/components/schemas/Assessment" } } } },
          404: { description: "Not found" },
        },
      },
    },
    "/api/assessments/{assessmentId}/send": {
      post: {
        tags: ["Assessments"],
        summary: "Send assessment email to worker",
        parameters: [{ name: "assessmentId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          200: { description: "Email sent" },
          404: { description: "Assessment not found" },
          502: { description: "Email delivery failed" },
        },
      },
    },

    // ── Workers ───────────────────────────────────────────────────────────────
    "/api/workers": {
      get: {
        tags: ["Workers"],
        summary: "List workers (scoped to organisation)",
        responses: {
          200: { description: "Worker list" },
          401: { description: "Unauthorized" },
        },
      },
      post: {
        tags: ["Workers"],
        summary: "Create a new worker profile",
        responses: {
          201: { description: "Worker created" },
          400: { description: "Validation error" },
        },
      },
    },
    "/api/workers/{workerId}": {
      get: {
        tags: ["Workers"],
        summary: "Get worker profile",
        parameters: [{ name: "workerId", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          200: { description: "Worker profile" },
          404: { description: "Not found" },
        },
      },
      patch: {
        tags: ["Workers"],
        summary: "Update worker profile",
        parameters: [{ name: "workerId", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          200: { description: "Updated worker" },
          404: { description: "Not found" },
        },
      },
    },

    // ── RTW Plans ─────────────────────────────────────────────────────────────
    "/api/rtw-plans": {
      get: {
        tags: ["RTW Plans"],
        summary: "List RTW plans",
        responses: { 200: { description: "RTW plan list" } },
      },
      post: {
        tags: ["RTW Plans"],
        summary: "Generate a new RTW plan (AI-assisted)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["caseId"],
                properties: {
                  caseId: { type: "string", format: "uuid" },
                  phases: { type: "integer", minimum: 1, maximum: 12 },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "RTW plan created" },
          400: { description: "Validation error" },
        },
      },
    },
    "/api/rtw-plans/{planId}": {
      get: {
        tags: ["RTW Plans"],
        summary: "Get RTW plan",
        parameters: [{ name: "planId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { 200: { description: "RTW plan detail" }, 404: { description: "Not found" } },
      },
    },
    "/api/rtw-plans/{planId}/email/send": {
      post: {
        tags: ["RTW Plans"],
        summary: "Email RTW plan to worker",
        parameters: [{ name: "planId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { 200: { description: "Email sent" }, 502: { description: "Email delivery failed" } },
      },
    },

    // ── Certificates ──────────────────────────────────────────────────────────
    "/api/certificates": {
      get: {
        tags: ["Certificates"],
        summary: "List certificates (scoped by role)",
        responses: { 200: { description: "Certificate list" } },
      },
      post: {
        tags: ["Certificates"],
        summary: "Create a certificate record",
        responses: { 201: { description: "Certificate created" } },
      },
    },
    "/api/certificates/{certId}": {
      get: {
        tags: ["Certificates"],
        summary: "Get certificate detail",
        parameters: [{ name: "certId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { 200: { description: "Certificate" }, 404: { description: "Not found" } },
      },
      patch: {
        tags: ["Certificates"],
        summary: "Update certificate fields",
        parameters: [{ name: "certId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { 200: { description: "Updated certificate" } },
      },
    },

    // ── Bookings ──────────────────────────────────────────────────────────────
    "/api/bookings": {
      get: {
        tags: ["Bookings"],
        summary: "List telehealth bookings",
        responses: { 200: { description: "Booking list" } },
      },
      post: {
        tags: ["Bookings"],
        summary: "Create a telehealth booking",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["caseId", "scheduledAt"],
                properties: {
                  caseId: { type: "string", format: "uuid" },
                  scheduledAt: { type: "string", format: "date-time" },
                  notes: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Booking created" },
          400: { description: "Validation error" },
        },
      },
    },

    // ── Notifications ─────────────────────────────────────────────────────────
    "/api/notifications/recent": {
      get: {
        tags: ["Notifications"],
        summary: "Get recent notifications for current user (last 20)",
        responses: {
          200: {
            description: "Recent notifications",
            content: {
              "application/json": {
                schema: { type: "array", items: { $ref: "#/components/schemas/Notification" } },
              },
            },
          },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/notifications/{notificationId}/read": {
      patch: {
        tags: ["Notifications"],
        summary: "Mark notification as read",
        parameters: [{ name: "notificationId", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          200: { description: "Marked as read" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/notifications/mark-all-read": {
      post: {
        tags: ["Notifications"],
        summary: "Mark all notifications as read",
        responses: { 200: { description: "All marked as read" } },
      },
    },

    // ── Support ───────────────────────────────────────────────────────────────
    "/api/support/contact": {
      post: {
        tags: ["Support"],
        summary: "Submit a support request (emails support@preventli.ai)",
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/SupportContactRequest" } },
          },
        },
        responses: {
          200: { description: "Support email sent" },
          400: { description: "Validation error" },
          401: { description: "Authentication required" },
          502: { description: "Email delivery failed" },
        },
      },
    },

    // ── Public (no auth) ──────────────────────────────────────────────────────
    "/api/public/assessment/{token}": {
      get: {
        tags: ["Public"],
        summary: "Load assessment form via magic-link token",
        security: [],
        parameters: [{ name: "token", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: { description: "Assessment form data" },
          404: { description: "Token not found or expired" },
        },
      },
    },
    "/api/public/assessment/{token}/submit": {
      post: {
        tags: ["Public"],
        summary: "Submit completed assessment",
        security: [],
        parameters: [{ name: "token", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { type: "object", description: "Assessment form responses" } },
          },
        },
        responses: {
          200: { description: "Assessment submitted" },
          400: { description: "Validation error" },
          404: { description: "Token not found" },
        },
      },
    },

    // ── Admin ─────────────────────────────────────────────────────────────────
    "/api/admin/invites": {
      post: {
        tags: ["Admin"],
        summary: "Send invitation email to a new user",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "role"],
                properties: {
                  email: { type: "string", format: "email" },
                  role: { type: "string", enum: ["case_manager", "employer"] },
                  organizationId: { type: "integer" },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Invitation sent" },
          400: { description: "Validation error" },
          403: { description: "Admin role required" },
        },
      },
    },
    "/api/admin/organizations": {
      get: {
        tags: ["Admin"],
        summary: "List all organisations",
        responses: { 200: { description: "Organisation list" }, 403: { description: "Admin required" } },
      },
      post: {
        tags: ["Admin"],
        summary: "Create an organisation",
        responses: { 201: { description: "Organisation created" }, 403: { description: "Admin required" } },
      },
    },
    "/api/notifications/test": {
      post: {
        tags: ["Admin"],
        summary: "Send a test notification email to your own address (admin only)",
        responses: {
          200: { description: "Test email sent" },
          403: { description: "Admin role required" },
        },
      },
    },
  },
};
