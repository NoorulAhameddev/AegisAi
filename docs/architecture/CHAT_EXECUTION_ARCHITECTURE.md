# Aegis AI — Chat Execution Architecture Specification

## 1. Executive Summary

This document specifies the unified **Dual-Mode Chat Execution Architecture** reconciled as part of the Aegis AI Engineering Hardening Campaign (Requirement R5 / Milestone M6).

Historically, the codebase suffered from an architectural inconsistency where two divergent pathways existed:
1. Direct Server-Sent Events (SSE) streaming (`/api/chat/stream-sse`)
2. Asynchronous job enqueueing with status polling (`/api/chat/stream` + BullMQ + `chat.worker.ts`)

Web clients previously executed a 1-second `while` polling loop against `/api/chat/status`, sacrificing real-time streaming responsiveness. Meanwhile, critical enterprise guardrails (token budgets, multi-modal attachments, RAG sanitization, plan quotas) were fragmented between the worker and API route.

Under Milestone M6, Aegis AI adopts a **verified dual-mode topology** that reconciles both paradigms:
- **Interactive Real-Time Mode (`/api/chat/stream-sse`)**: Serves web clients (`ChatClient.tsx`) via direct low-latency SSE streaming, fortified with plan quotas, token budgets, multi-modal support, RAG sanitization, and client-abort resilience.
- **Asynchronous Background Queue Mode (`/api/chat/stream`)**: Preserved for mobile applications (`apps/mobile`), batch prompts, and heavy background workloads backed by BullMQ workers and PostgreSQL fallback queues.

---

## 2. Architecture Topology Diagram

```
                              ┌──────────────────────────────────┐
                              │           Client Layer           │
                              └───────────────┬──────────────────┘
                                              │
                     ┌────────────────────────┴────────────────────────┐
                     │                                                 │
          [Web Browser / ChatClient]                      [Mobile / Background Batch]
                     │                                                 │
                     ▼                                                 ▼
      POST /api/chat/stream-sse                            POST /api/chat/stream
  (Interactive Real-Time Mode)                        (Asynchronous Queue Mode)
                     │                                                 │
  ┌──────────────────┴──────────────────┐             ┌────────────────┴──────────────────┐
  │ 1. verifyAuth & Rate Limiting       │             │ 1. verifyAuth & Rate Limiting     │
  │ 2. checkQuota (Monthly limits)      │             │ 2. Queue Backpressure Guard       │
  │ 3. reserveBudget (Daily limits)     │             │ 3. Encrypt & Save User Message    │
  │ 4. quickModeration & Ownership      │             │ 4. Enqueue to BullMQ (chatQueue)  │
  │ 5. Multi-modal Image Resolution     │             └────────────────┬──────────────────┘
  │ 6. RAG Context Sanitization         │                              │
  │ 7. Direct OpenAI SSE Stream         │                              ▼
  │    - 120s Timeout Guard             │                   BullMQ / Fallback Worker
  │    - Backpressure Buffer (50)       │                   (chat.worker.ts / processor.ts)
  │    - Client Abort -> isPartial:true │                              │
  │ 8. Finalize Usage & UsageMetrics    │                              ▼
  └──────────────────┬──────────────────┘                    OpenAI Completion & Storage
                     │                                                 │
                     ▼                                                 ▼
          Direct SSE Stream Chunks                         Status Polling (Mobile)
          (data: {"text":"..."}\n\n)                       (GET /api/chat/status?jobId=...)
```

---

## 3. Mode 1: Interactive Real-Time Mode (`/api/chat/stream-sse`)

### 3.1 Responsibilities & Endpoints
The direct SSE route (`/api/chat/stream-sse`) is the primary communication pathway for web clients requiring interactive, token-by-token generation.

### 3.2 Request Validation & Payload Schema
```typescript
const bodySchema = z
  .object({
    chatId: z.string().min(1, "Chat ID is required"),
    message: z.string().min(1, "Message is required"),
    projectId: z.string().optional(),
    fileId: z.string().uuid().optional().nullable(),
  })
  .strict();
```

### 3.3 Execution Pipeline & Safety Guardrails
1. **Authentication & Rate Limiting**:
   - `verifyAuth(req)` ensures valid session and active user status (non-banned).
   - `rateLimit(req, { limit: 10, window: 60 })` prevents resource exhaustion on streaming connections.
2. **Monthly Plan Quota Verification**:
   - `await checkQuota(userId)` evaluates cumulative token consumption against user tier limits.
   - Quota exhaustion immediately returns `403 Forbidden` (`{ error: "Monthly token quota exceeded. Please upgrade your plan." }`).
3. **Pre-Stream Token Budget Reservation**:
   - Computes estimated token count: `Math.ceil(message.length / 4) + 100`.
   - `await tokenBudgetManager.reserveBudget(userId, estimatedTokens)` prevents concurrent over-allocation.
   - Over-budget requests fail fast with `429 Too Many Requests`.
4. **Pre-Moderation & Chat Verification**:
   - Executes `quickModeration(message)` to catch malicious inputs prior to model invocation.
   - Verifies chat ownership and active status (`deletedAt: null`).
5. **Multi-Modal Base64 Image Resolution**:
   - If `fileId` is supplied, queries `prisma.file.findFirst({ where: { id: fileId, userId, deletedAt: null } })`.
   - Confirms image MIME type (`image/png`, `image/jpeg`, etc.) and reads file from disk.
   - Injects base64 data URL into OpenAI vision format:
     ```json
     [
       { "type": "text", "text": "===USER_MESSAGE_START===\n...\n===USER_MESSAGE_END===" },
       { "type": "image_url", "image_url": { "url": "data:image/png;base64,..." } }
     ]
     ```
6. **RAG Context Sanitization**:
   - Retrieves semantic knowledge base documents via `retrieveContext(message, userId)`.
   - Passes context through `sanitizeRagContext(ragContext)` to neutralize prompt injection attacks.
   - Wraps external context in explicit system boundaries (`===EXTERNAL_KNOWLEDGE_BASE_START===`).
7. **Resilient SSE Streaming**:
   - Initiates stream via `openai.chat.completions.create({ model: "openai/gpt-4o-mini", stream: true })`.
   - Races against a 120-second timeout promise (`STREAM_TIMEOUT_MS`).
   - Implements backpressure throttle: if buffered chunks exceed `MAX_BUFFER_SIZE` (50), introduces non-blocking yield (100ms).
   - Async background content moderation buffers 10 tokens at a time without stalling HTTP stream.
8. **Client Disconnect & Abort Handling**:
   - Listens on `req.signal.addEventListener("abort")`.
   - Immediately persists accumulated content to PostgreSQL via `prisma.message.create` with `isPartial: true`.
   - Finalizes token budget reservation based on actual tokens emitted.
9. **Finalization & Metrics**:
   - On completion, persists full assistant response (`isPartial: false`).
   - Logs database metrics to `UsageMetric` table (`tokens`, `model`, `userId`).
   - Reconciles reserved vs actual tokens via `tokenBudgetManager.finalizeUsage`.
   - Emits completion payloads (`{ "done": true, "sources": [...] }`) and SSE terminator (`data: [DONE]\n\n`).

---

## 4. Mode 2: Asynchronous Background Queue Mode (`/api/chat/stream`)

### 4.1 Responsibilities & Endpoints
The asynchronous queue route (`/api/chat/stream`) is preserved for clients with polling architectures (e.g. mobile apps, CLI tools), batch processing pipelines, or long-running tasks involving multi-step tools.

### 4.2 Lifecycle & Infrastructure
1. **Job Enqueueing**:
   - Validates payload, verifies user credentials, checks queue backpressure via `checkQueueBackpressure(chatQueue, "chat")`.
   - Computes deterministic idempotency key using SHA-256 hash of `chatId:userId:message`.
   - Adds job to BullMQ queue (`chat-job`) with fallback to PostgreSQL table `fallback_queue` if Redis is degraded.
   - Returns `{ jobId, status: "queued" }` synchronously within <20ms.
2. **Worker Processing (`chat.worker.ts` & `processor.ts`)**:
   - BullMQ worker polls `chatQueue` with concurrency limits (`env.WORKER_CONCURRENCY`).
   - Executes background pipeline: vector store message ingestion, RAG indexing, OpenAI LLM completion, memory extraction, and usage tracking.
   - Employs Dead-Letter Queue (`chat-dlq`) after max retry exhaustion.
   - Background interval migrates fallback jobs back to Redis upon connection recovery.
3. **Status Polling**:
   - Client polls `GET /api/chat/status?jobId=...`.
   - Returns job state (`waiting`, `active`, `completed`, `failed`) and final message payload once finished.

---

## 5. Web Frontend Migration (`ChatClient.tsx`)

`apps/web/src/app/chat/ChatClient.tsx` was transitioned from 1-second polling to direct SSE consumption:

### 5.1 Before (Polling Anti-Pattern)
```typescript
// Legacy: Enqueue job and poll status every 1 second
const res = await fetch("/api/chat/stream", { ... });
const { jobId } = await res.json();
while (attempts < maxAttempts) {
  const sRes = await fetch(`/api/chat/status?jobId=${jobId}`);
  const { state, result } = await sRes.json();
  if (state === "completed") { ... break; }
  await new Promise(r => setTimeout(r, 1000));
}
```

### 5.2 After (Real-Time SSE Streaming)
```typescript
// Reconciled: Direct SSE streaming via ReadableStream reader
const res = await fetch("/api/chat/stream-sse", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ chatId: activeChatId, message: userMsg, fileId: uploadedFileId || undefined }),
  signal: abortController.signal,
});

const reader = res.body?.getReader();
const decoder = new TextDecoder();
let accumulatedContent = "";
let sseBuffer = "";

while (true) {
  if (abortController.signal.aborted) break;
  const { done, value } = await reader.read();
  if (done) break;

  sseBuffer += decoder.decode(value, { stream: true });
  const lines = sseBuffer.split("\n");
  sseBuffer = lines.pop() || "";

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) continue;
    const dataStr = trimmed.slice(5).trim();
    if (dataStr === "[DONE]") break;

    const parsed = JSON.parse(dataStr);
    const token = parsed.text ?? parsed.content ?? "";
    if (token) {
      accumulatedContent += token;
      setMessages(prev => updateLastMessage(prev, accumulatedContent));
    }
  }
}
```

---

## 6. Acceptance Criteria & Automated Regression Tests

Automated regression coverage for the reconciled architecture is implemented in `apps/web/src/__tests__/chat-sse.test.ts`:

| ID | Specification Criterion | Verification Method | Status |
|---|---|---|---|
| **AC-11** | SSE token streaming emits message events with low latency | `npm --workspace=@aegis-ai/web test -- src/__tests__/chat-sse.test.ts -t 'streams tokens as real-time server-sent events'` | **PASS** |
| **AC-12** | Client disconnect triggers abort and saves partial message (`isPartial: true`) | `npm --workspace=@aegis-ai/web test -- src/__tests__/chat-sse.test.ts -t 'persists partial message with isPartial: true'` | **PASS** |
| **AC-13** | Token budget reservation, quota check, and usage metric recording | `npm --workspace=@aegis-ai/web test -- src/__tests__/chat-sse.test.ts -t 'reserves token budget, logs usage metrics'` | **PASS** |
| **AC-14** | Multi-modal file attachment (`fileId`) supported with base64 data URL injection | `npm --workspace=@aegis-ai/web test -- src/__tests__/chat-sse.test.ts -t 'resolves image file attachment and injects base64'` | **PASS** |

---

## 7. Operational & Security Checklist

- [x] Rate limiting active on SSE endpoint (10 req/min).
- [x] User plan monthly quota verified prior to LLM call (`403 Forbidden` on breach).
- [x] Token budget concurrency reservation verified (`429 Too Many Requests` on breach).
- [x] RAG retrieved documents filtered through injection sanitizer (`sanitizeRagContext`).
- [x] Base64 image payload scoped to user ownership (`userId`) and active file record.
- [x] Stream timeouts capped at 120 seconds.
- [x] Backpressure buffer prevents Node event loop memory exhaustion.
- [x] Client connection drops persist partial assistant message with `isPartial: true`.
- [x] Mobile polling path and BullMQ worker preserved intact.
