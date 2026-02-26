/**
 * OpenAPI/Swagger Configuration for Aegis AI
 * Generates interactive API documentation at /api-docs
 */

export const swaggerConfig = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Aegis AI API Documentation",
      version: "1.0.0",
      description:
        "Enterprise AI chat platform with RAG, streaming, and admin capabilities",
      contact: {
        name: "Aegis AI Support",
        url: "https://aegis-ai.com/support",
        email: "support@aegis-ai.com",
      },
      license: {
        name: "MIT",
        url: "https://opensource.org/licenses/MIT",
      },
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Development server",
      },
      {
        url: "https://api.aegis-ai.com",
        description: "Production server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    tags: [
      {
        name: "Authentication",
        description: "User authentication and session management",
      },
      { name: "Chat", description: "Chat conversations and streaming" },
      { name: "RAG", description: "Retrieval Augmented Generation" },
      { name: "Files", description: "File upload and management" },
      { name: "Admin", description: "Admin operations (requires admin role)" },
      { name: "Health", description: "System health checks" },
    ],
  },
  apis: ["./src/app/api/**/*.ts"], // Path to API routes
};

/**
 * Example endpoint documentation (add to each route.ts):
 *
 * /**
 *  * @swagger
 *  * /api/chat/stream-sse:
 *  *   post:
 *  *     summary: Stream chat responses via Server-Sent Events
 *  *     tags: [Chat]
 *  *     security:
 *  *       - bearerAuth: []
 *  *     requestBody:
 *  *       required: true
 *  *       content:
 *  *         application/json:
 *  *           schema:
 *  *             type: object
 *  *             required:
 *  *               - chatId
 *  *               - message
 *  *             properties:
 *  *               chatId:
 *  *                 type: string
 *  *                 format: uuid
 *  *               message:
 *  *                 type: string
 *  *                 example: "Explain quantum computing"
 *  *               useRAG:
 *  *                 type: boolean
 *  *                 default: true
 *  *     responses:
 *  *       200:
 *  *         description: Streaming response started
 *  *         content:
 *  *           text/event-stream:
 *  *             schema:
 *  *               type: string
 *  *       401:
 *  *         description: Unauthorized
 *  *       429:
 *  *         description: Rate limit exceeded
 *  * /
 */
