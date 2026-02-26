# RAG Feature - Quick Start Guide

## What is RAG?

RAG (Retrieval Augmented Generation) allows your AI to reference your uploaded documents when answering questions, providing more accurate and contextual responses.

## Quick Start (3 Steps)

### 1. Upload Documents

1. Navigate to **Files** in the sidebar
2. Click "Upload" and select your documents (PDF, text, markdown, images)
3. Wait for the upload and automatic ingestion to complete

### 2. Chat with Context

1. Go to **Chat** and start a new conversation
2. Ask questions related to your uploaded documents
3. The AI will automatically retrieve and use relevant context

### 3. Manage Knowledge Base

1. Visit **Knowledge Base** in the sidebar
2. View statistics about your document collection
3. Search specific content or delete unwanted documents

## Example Workflow

### Scenario: Company Policy Assistant

**Step 1:** Upload your company handbook PDF

```
Files → Upload → company_handbook.pdf
✓ File uploaded (152 pages)
✓ Ingested into 47 chunks
```

**Step 2:** Ask questions in Chat

```
You: "What is our vacation policy?"

AI: "Based on your company handbook (Section 4.2), employees are
entitled to 15 days of paid vacation per year. Vacation days must be
requested at least 2 weeks in advance through the HR portal..."
```

**Step 3:** Verify sources in Knowledge Base

```
Knowledge Base → Search: "vacation policy"
✓ Found 3 relevant chunks from company_handbook.pdf
```

## Tips for Best Results

### ✅ Do:

- Upload clean, well-formatted documents
- Use descriptive file names
- Keep documents focused on specific topics
- Upload in supported formats (PDF, TXT, MD, PNG, JPG)

### ❌ Don't:

- Upload extremely large files (>10MB)
- Use heavily formatted PDFs (may cause extraction issues)
- Upload duplicate content
- Expect RAG to work with minimal context

## Supported File Types

| Type     | Extension         | Notes                           |
| -------- | ----------------- | ------------------------------- |
| Text     | .txt              | Best compatibility              |
| Markdown | .md               | Preserves structure             |
| PDF      | .pdf              | Text extraction (OCR if needed) |
| Images   | .png, .jpg, .jpeg | OCR for text extraction         |
| JSON     | .json             | Automatically parsed            |
| CSV      | .csv              | Table data supported            |

## RAG in Action

### Without RAG:

```
You: "What's our return policy for electronics?"
AI: "I don't have specific information about your return policy..."
```

### With RAG (after uploading return policy):

```
You: "What's our return policy for electronics?"
AI: "According to your return policy document, electronics can be
returned within 30 days of purchase if unopened. Opened electronics
have a 14-day return window with a 15% restocking fee. All returns
require the original receipt and packaging..."
```

## Knowledge Base Features

### Statistics Dashboard

- **Total Chunks**: Number of document segments in your knowledge base
- **Unique Sources**: Number of unique files/documents ingested
- **Refresh**: Update statistics in real-time

### Search Function

- Search your entire knowledge base
- See matching chunks with context
- View source file information
- Delete unwanted sources

### Document Management

- View which files have been ingested
- See chunk distribution per document
- Delete documents you no longer need
- Track ingestion timestamps

## Advanced Usage

### Manual Document Ingestion

For text that isn't in file form:

```bash
POST /api/rag/ingest
{
    "text": "Your content here...",
    "metadata": {
        "sourceId": "custom-id",
        "type": "note"
    }
}
```

### Custom Search

Search without using the UI:

```bash
POST /api/rag/search
{
    "query": "search terms",
    "limit": 10,
    "filters": {
        "sourceId": "specific-document-id"
    }
}
```

### Delete by Source

Remove all chunks from a specific document:

```bash
DELETE /api/rag/documents?sourceId=document-uuid
```

## Configuration

Default settings (can be modified in `src/lib/rag-config.ts`):

- **Chunk Size**: 1000 characters
- **Chunk Overlap**: 200 characters
- **Documents Retrieved**: 5 per query
- **Max Context Length**: 4000 characters
- **Max File Size**: 10MB

## Troubleshooting

### "No relevant documents found"

- Ensure your file was successfully uploaded
- Check that your query relates to uploaded content
- Try different search terms or phrasings

### "File too large"

- Files over 10MB cannot be ingested
- Split large files into smaller parts
- Contact admin to increase limit if needed

### "Could not extract content"

- File may be corrupt or password-protected
- Try converting to a simpler format (e.g., PDF → TXT)
- Ensure images have clear, readable text

### Context not appearing in responses

- Verify file was ingested (check Knowledge Base stats)
- Ensure query is relevant to content
- Check that RAG is enabled for your account

## Best Practices

1. **Organize by Topic**: Upload related documents together
2. **Name Files Clearly**: Use descriptive names for easy identification
3. **Regular Cleanup**: Remove outdated or irrelevant documents
4. **Test Retrieval**: Use Knowledge Base search to verify content
5. **Monitor Stats**: Keep track of your knowledge base size

## Next Steps

- Read the [full RAG documentation](./RAG_GUIDE.md)
- Learn about [chunking strategies](./RAG_GUIDE.md#chunking-algorithm)
- Explore [API endpoints](./RAG_GUIDE.md#api-endpoints)
- Understand [optimization tips](./RAG_GUIDE.md#optimization-tips)

## Support

For issues or questions:

1. Check the [troubleshooting section](#troubleshooting)
2. Review the [full documentation](./RAG_GUIDE.md)
3. Contact your system administrator
4. File an issue on GitHub
