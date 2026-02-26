# RAG (Retrieval Augmented Generation) Feature

## Overview

The RAG feature enables your AI to have access to a knowledge base of documents, allowing it to provide more accurate and contextual responses based on your uploaded files and data.

## Features

### 1. **Smart Document Chunking**

- Automatically splits documents into semantic chunks
- Preserves sentence boundaries
- Configurable chunk size and overlap
- Support for different document types (text, markdown, PDF, images)

### 2. **Semantic Search**

- Vector-based similarity search using OpenAI embeddings
- Fast retrieval from LanceDB vector database
- Deduplication and reranking of results

### 3. **Automatic Ingestion**

- Files uploaded through the Files page are automatically ingested
- Extracts text from PDFs and images (OCR)
- Chunks and embeds content for retrieval

### 4. **Context Augmentation**

- Relevant context is automatically retrieved during chat
- Context is injected into the AI's system prompt
- Configurable number of retrieved documents

### 5. **Knowledge Base Management**

- View RAG statistics (total chunks, unique sources)
- Search your knowledge base
- Delete documents by source
- See which files have been ingested

## Architecture

### Components

```
src/lib/
├── rag-config.ts          # RAG configuration and settings
├── chunker.ts             # Document chunking logic
├── vector-store.ts        # LanceDB vector store operations
├── rag-retrieval.ts       # Enhanced retrieval with reranking
└── embeddings.ts          # OpenAI embedding generation

src/app/api/rag/
├── ingest/route.ts        # Document ingestion endpoint
├── search/route.ts        # Search endpoint
├── documents/route.ts     # Delete documents endpoint
└── stats/route.ts         # Statistics endpoint

src/components/rag/
└── RAGManagement.tsx      # UI for RAG management

src/app/knowledge/
└── page.tsx               # Knowledge base page
```

### Data Flow

1. **Ingestion Flow**:

   ```
   File Upload → Extract Text → Chunk Document → Generate Embeddings → Store in LanceDB
   ```

2. **Retrieval Flow**:
   ```
   User Query → Generate Query Embedding → Vector Search → Rerank Results → Inject Context → AI Response
   ```

## Configuration

Edit `src/lib/rag-config.ts` to customize RAG behavior:

```typescript
export const defaultRAGConfig: RAGConfig = {
  chunking: {
    chunkSize: 1000, // Characters per chunk
    chunkOverlap: 200, // Overlap between chunks
    minChunkSize: 100, // Minimum chunk size
  },
  retrieval: {
    topK: 5, // Number of documents to retrieve
    similarityThreshold: 0.7, // Similarity threshold (0-1)
    maxContextLength: 4000, // Max context characters
    rerank: true, // Enable reranking
  },
  processing: {
    supportedTypes: [
      // Supported file types
      "text/plain",
      "text/markdown",
      "application/pdf",
      "image/png",
      "image/jpeg",
      // ... more types
    ],
    maxFileSize: 10 * 1024 * 1024, // 10MB max
    extractImages: true,
  },
  embedding: {
    model: "openai/text-embedding-3-small",
    dimensions: 1536,
    batchSize: 100,
  },
};
```

## API Endpoints

### POST `/api/rag/ingest`

Ingest a document into the RAG system.

**Request Body:**

```json
{
  "fileId": "uuid", // File ID from database (optional if text provided)
  "text": "content...", // Direct text content (optional if fileId provided)
  "metadata": {
    // Optional metadata
    "sourceId": "custom-id",
    "type": "document"
  }
}
```

**Response:**

```json
{
    "success": true,
    "documentIds": ["uuid1", "uuid2", ...],
    "chunks": 5,
    "message": "Successfully ingested document into 5 chunks"
}
```

### POST `/api/rag/search`

Search for relevant documents.

**Request Body:**

```json
{
  "query": "search query",
  "limit": 5, // Optional, default 5
  "filters": {
    // Optional filters
    "sourceId": "uuid",
    "fileId": "uuid"
  }
}
```

**Response:**

```json
{
    "success": true,
    "results": [
        {
            "id": "uuid",
            "text": "document chunk content...",
            "metadata": { ... },
            "chunkIndex": 0,
            "sourceId": "uuid",
            "createdAt": 1234567890
        }
    ],
    "count": 5
}
```

### DELETE `/api/rag/documents?sourceId=uuid`

Delete all document chunks from a specific source.

**Response:**

```json
{
  "success": true,
  "deletedCount": 5,
  "message": "Deleted 5 document chunks"
}
```

### GET `/api/rag/stats`

Get RAG statistics for the current user.

**Response:**

```json
{
  "success": true,
  "stats": {
    "totalDocuments": 42,
    "uniqueSources": 7
  }
}
```

## Usage

### 1. Upload Documents

Navigate to the Files page and upload your documents. They will be automatically ingested into the RAG system.

### 2. Chat with Context

When you chat with the AI, it will automatically retrieve relevant context from your uploaded documents and use it to provide more accurate responses.

### 3. Manage Knowledge Base

Visit `/knowledge` to:

- View statistics about your knowledge base
- Search for specific content
- Delete documents you no longer need

### 4. Programmatic Ingestion

You can also ingest documents programmatically:

```typescript
import { ingestDocument } from "@/lib/vector-store";

const documentIds = await ingestDocument(
  "Your document text content here...",
  {
    fileName: "document.txt",
    fileType: "text/plain",
    sourceId: "custom-source-id",
    type: "document",
  },
  userId,
);
```

### 5. Custom Search

Search your knowledge base programmatically:

```typescript
import { retrieveContext } from "@/lib/rag-retrieval";

const result = await retrieveContext("What is quantum computing?", userId, {
  topK: 5,
  includeMetadata: true,
});

console.log(`Found ${result.documents.length} documents`);
console.log(`Context: ${result.context}`);
```

## How RAG Enhances AI Responses

### Before RAG:

```
User: "What is our company's refund policy?"
AI: "I don't have specific information about your company's refund policy..."
```

### After RAG (with company policy document uploaded):

```
User: "What is our company's refund policy?"
AI: "Based on your company policy document, refunds are available within 30 days
     of purchase for unused items with original packaging. The refund will be
     processed to the original payment method within 5-7 business days..."
```

## Optimization Tips

1. **Chunk Size**: Smaller chunks (500-1000 chars) work better for precise information retrieval
2. **Overlap**: Use 10-20% overlap to ensure context continuity
3. **TopK**: Start with 3-5 documents, increase if responses lack context
4. **Document Quality**: Clean, well-structured documents yield better results
5. **File Types**: Plain text and markdown work best; PDFs may have extraction issues

## Troubleshooting

### Documents Not Retrieved

- Check if file was successfully ingested (see RAG stats)
- Verify query is relevant to document content
- Try increasing `topK` in configuration

### Slow Ingestion

- Large files take longer to process
- Consider splitting very large documents
- Check OpenAI API rate limits

### Context Not Used in Responses

- Ensure RAG is enabled for the query type
- Check that retrieved documents are relevant
- Verify system prompt includes context

### Vector Store Issues

- Ensure LanceDB directory (`data/lancedb/`) has write permissions
- Check disk space availability
- Verify LanceDB dependencies are installed

## Technical Details

### Embedding Model

- **Model**: `text-embedding-3-small` (OpenAI)
- **Dimensions**: 1536
- **Cost**: ~$0.02 per 1M tokens

### Vector Database

- **Database**: LanceDB (embedded vector database)
- **Storage**: Local file system (`data/lancedb/`)
- **Index Type**: IVF-PQ (Inverted File with Product Quantization)

### Chunking Algorithm

- **Strategy**: Sentence-boundary aware splitting
- **Overlap**: Configurable (default 200 chars)
- **Deduplication**: Automatic removal of duplicate chunks

### Reranking Algorithm

- **Keyword Scoring**: Term frequency scoring
- **Position Bias**: Earlier chunks weighted higher
- **Recency Bias**: Newer documents boosted
- **Threshold**: Configurable similarity cutoff

## Future Enhancements

- [ ] Multi-modal embeddings (text + images)
- [ ] Hybrid search (keyword + semantic)
- [ ] Query expansion and reformulation
- [ ] Citation tracking and references
- [ ] Batch processing for large document sets
- [ ] Support for more file types (Word, Excel, etc.)
- [ ] Advanced reranking with cross-encoders
- [ ] User feedback loop for relevance tuning

## Dependencies

```json
{
  "@lancedb/lancedb": "^0.23.0",
  "openai": "^6.15.0",
  "pdf-parse": "^2.4.5",
  "tesseract.js": "^5.0.0" // For OCR
}
```

## License

Part of Aegis AI - MIT License
