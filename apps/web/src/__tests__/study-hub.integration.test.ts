/**
 * Study Hub Integration Tests
 * Comprehensive test suite for all Study Hub features
 *
 * Run with: npm run test -- study-hub.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";

// Mock token for testing
const MOCK_TOKEN = "test-token";
const MOCK_USER_ID = "test-user-123";

// Base API URL
const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3000";

// Helper function to make API calls
async function apiCall(
  endpoint: string,
  method: string = "GET",
  body?: any,
  headers: Record<string, string> = {},
) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${MOCK_TOKEN}`,
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`API Error: ${response.status} - ${error.error}`);
  }

  return response;
}

const describeFn =
  process.env.RUN_INTEGRATION === "true" ? describe : describe.skip;
describeFn("Study Hub Integration Tests", () => {
  let projectId: string;
  let noteId: string;

  describe("Projects API", () => {
    it("should create a new project", async () => {
      const response = await apiCall("/api/projects", "POST", {
        name: "Test Study Project",
        description: "Test project for Study Hub",
      });

      const data = await response.json();
      expect(data.project).toBeDefined();
      expect(data.project.name).toBe("Test Study Project");
      projectId = data.project.id;
    });

    it("should list user projects", async () => {
      const response = await apiCall("/api/projects");
      const data = await response.json();

      expect(data.projects).toBeDefined();
      expect(Array.isArray(data.projects)).toBe(true);
      expect(data.projects.length).toBeGreaterThan(0);
    });

    it("should get project details", async () => {
      const response = await apiCall(`/api/projects?id=${projectId}`);
      const data = await response.json();

      expect(data.project).toBeDefined();
      expect(data.project.id).toBe(projectId);
    });
  });

  describe("AI Operations API", () => {
    const testContent =
      "Machine learning is a subset of artificial intelligence that enables systems to learn from data. Neural networks are computational models inspired by biological neurons. Deep learning uses multiple layers of neural networks.";

    it("should generate short summary", async () => {
      const response = await apiCall("/api/ai/operate", "POST", {
        operation: "summary-short",
        text: testContent,
        projectId,
      });

      const data = await response.json();
      expect(data.content).toBeDefined();
      expect(data.noteId).toBeDefined();
      noteId = data.noteId;
    });

    it("should generate detailed summary", async () => {
      const response = await apiCall("/api/ai/operate", "POST", {
        operation: "summary-detailed",
        text: testContent,
        projectId,
      });

      const data = await response.json();
      expect(data.content).toBeDefined();
      expect(data.content.length).toBeGreaterThan(100);
    });

    it("should generate structured notes", async () => {
      const response = await apiCall("/api/ai/operate", "POST", {
        operation: "structured-notes",
        text: testContent,
        projectId,
      });

      const data = await response.json();
      expect(data.content).toBeDefined();
      expect(data.content.includes("#")).toBe(true); // Check for markdown headers
    });

    it("should extract bullet points", async () => {
      const response = await apiCall("/api/ai/operate", "POST", {
        operation: "bullet-points",
        text: testContent,
        projectId,
      });

      const data = await response.json();
      expect(data.content).toBeDefined();
      expect(data.content.includes("•") || data.content.includes("-")).toBe(
        true,
      );
    });

    it("should extract key concepts", async () => {
      const response = await apiCall("/api/ai/operate", "POST", {
        operation: "key-concepts",
        text: testContent,
        projectId,
      });

      const data = await response.json();
      expect(data.content).toBeDefined();
      expect(
        data.content.toLowerCase().includes("learning") ||
          data.content.toLowerCase().includes("neural"),
      ).toBe(true);
    });

    it("should generate glossary", async () => {
      const response = await apiCall("/api/ai/operate", "POST", {
        operation: "glossary",
        text: testContent,
        projectId,
      });

      const data = await response.json();
      expect(data.content).toBeDefined();
    });

    it("should generate examples", async () => {
      const response = await apiCall("/api/ai/operate", "POST", {
        operation: "examples",
        text: testContent,
        projectId,
      });

      const data = await response.json();
      expect(data.content).toBeDefined();
    });

    it("should generate ELI5 explanation", async () => {
      const response = await apiCall("/api/ai/operate", "POST", {
        operation: "eli5",
        text: testContent,
        projectId,
      });

      const data = await response.json();
      expect(data.content).toBeDefined();
      // ELI5 should be simpler language
      expect(data.content.length).toBeGreaterThan(0);
    });

    it("should generate flashcards", async () => {
      const response = await apiCall("/api/ai/operate", "POST", {
        operation: "flashcards",
        text: testContent,
        projectId,
      });

      const data = await response.json();
      expect(data.content).toBeDefined();
      expect(data.content.includes("Q:") || data.content.includes("Q.")).toBe(
        true,
      );
    });

    it("should generate quiz questions", async () => {
      const response = await apiCall("/api/ai/operate", "POST", {
        operation: "quiz",
        text: testContent,
        projectId,
      });

      const data = await response.json();
      expect(data.content).toBeDefined();
      expect(
        data.content.includes("A)") ||
          data.content.includes("B)") ||
          data.content.includes("Option"),
      ).toBe(true);
    });

    it("should generate question bank", async () => {
      const response = await apiCall("/api/ai/operate", "POST", {
        operation: "questions",
        text: testContent,
        projectId,
      });

      const data = await response.json();
      expect(data.content).toBeDefined();
    });
  });

  describe("Notes API", () => {
    it("should create a note", async () => {
      const response = await apiCall("/api/notes", "POST", {
        title: "Test Note",
        content: "This is a test note content",
        type: "SUMMARY_SHORT",
        projectId,
        tags: ["test", "study"],
      });

      const data = await response.json();
      expect(data.note).toBeDefined();
      expect(data.note.title).toBe("Test Note");
    });

    it("should list user notes", async () => {
      const response = await apiCall("/api/notes?projectId=" + projectId);
      const data = await response.json();

      expect(data.notes).toBeDefined();
      expect(Array.isArray(data.notes)).toBe(true);
    });

    it("should export note to markdown", async () => {
      const response = await apiCall("/api/notes/export", "POST", {
        noteId,
        format: "markdown",
      });

      expect(response.status).toBe(200);
      const contentType = response.headers.get("content-type");
      expect(contentType).toContain("markdown");
    });

    it("should export note to PDF", async () => {
      const response = await apiCall("/api/notes/export", "POST", {
        noteId,
        format: "pdf",
      });

      expect(response.status).toBe(200);
      const contentType = response.headers.get("content-type");
      expect(contentType).toContain("pdf");
    });

    it("should export note to DOCX", async () => {
      const response = await apiCall("/api/notes/export", "POST", {
        noteId,
        format: "docx",
      });

      expect(response.status).toBe(200);
      const contentType = response.headers.get("content-type") ?? "";
      expect(contentType).toMatch(/wordprocessingml|openxmlformats|word/);
    });
  });

  describe("File Upload API", () => {
    it("should upload and ingest files", async () => {
      const formData = new FormData();
      const testFile = new File(
        ["Test file content for ingestion"],
        "test.txt",
        { type: "text/plain" },
      );
      formData.append("file-0", testFile);
      formData.append("projectId", projectId);

      const response = await fetch(`${API_BASE_URL}/api/files/batch-upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${MOCK_TOKEN}`,
        },
        body: formData,
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.results).toBeDefined();
      expect(data.successful).toBeGreaterThan(0);
    });
  });

  describe("RAG Search API", () => {
    it("should search for similar documents", async () => {
      const response = await apiCall("/api/rag/search", "POST", {
        query: "machine learning neural networks",
        limit: 5,
      });

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.results).toBeDefined();
      expect(Array.isArray(data.results)).toBe(true);
    });

    it("should reject short search queries", async () => {
      let error: any;
      try {
        await apiCall("/api/rag/search", "POST", {
          query: "ab", // Too short
        });
      } catch (e) {
        error = e;
      }

      expect(error).toBeDefined();
      expect(error.message).toContain("too short");
    });
  });

  describe("User Settings API", () => {
    it("should get default settings", async () => {
      const response = await apiCall("/api/user/settings");
      const data = await response.json();

      expect(data.userId).toBeDefined();
      expect(data.theme).toBeDefined();
      expect(data.notifications).toBeDefined();
    });

    it("should update user settings", async () => {
      const response = await apiCall("/api/user/settings", "PUT", {
        theme: "light",
        notifications: false,
        enableRAG: true,
      });

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.theme).toBe("light");
      expect(data.notifications).toBe(false);
    });

    it("should reset settings to default", async () => {
      const response = await apiCall("/api/user/settings", "DELETE");
      const data = await response.json();

      expect(data.success).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should return 401 without auth", async () => {
      let error: any;
      try {
        await fetch(`${API_BASE_URL}/api/projects`, {
          method: "GET",
        }).then((r) => {
          if (!r.ok) throw new Error(`${r.status}`);
          return r;
        });
      } catch (e) {
        error = e;
      }

      expect(error).toBeDefined();
    });

    it("should return 400 for invalid operation", async () => {
      let error: any;
      try {
        await apiCall("/api/ai/operate", "POST", {
          operation: "invalid-operation",
          text: "test content",
        });
      } catch (e) {
        error = e;
      }

      expect(error).toBeDefined();
    });

    it("should validate required fields", async () => {
      let error: any;
      try {
        await apiCall("/api/ai/operate", "POST", {
          operation: "summary-short",
          // missing text field
        });
      } catch (e) {
        error = e;
      }

      expect(error).toBeDefined();
    });
  });

  describe("Performance Tests", () => {
    it("should handle large text processing", async () => {
      const largeText = "Test content. ".repeat(100); // ~1400 chars

      const startTime = Date.now();
      const response = await apiCall("/api/ai/operate", "POST", {
        operation: "summary-short",
        text: largeText,
        projectId,
      });
      const endTime = Date.now();

      const data = await response.json();
      expect(data.content).toBeDefined();
      expect(endTime - startTime).toBeLessThan(30000); // Should complete in under 30 seconds
    });

    it("should handle concurrent requests", async () => {
      const promises = Array.from({ length: 5 }, (_, i) =>
        apiCall("/api/ai/operate", "POST", {
          operation: "summary-short",
          text: `Test content ${i}`,
          projectId,
        }),
      );

      const results = await Promise.all(promises);
      expect(results).toHaveLength(5);
      results.forEach((r) => {
        expect(r.ok).toBe(true);
      });
    });
  });

  afterAll(async () => {
    // Cleanup: Delete test project
    try {
      await apiCall(`/api/projects?id=${projectId}`, "DELETE");
    } catch (e) {
      console.error("Cleanup failed:", e);
    }
  });
});

// Export for use in test runner
export {};
