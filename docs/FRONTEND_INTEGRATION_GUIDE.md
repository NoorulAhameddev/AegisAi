# Frontend Integration Guide - 90 Features

## Quick Start

### 1. Import Components
```tsx
import {
  TextInput,
  FileUpload,
  AICapabilities,
  AdvancedChat,
  ExportManager,
  FeaturesDashboard
} from '@/components/features';
```

### 2. Import Custom Hooks
```tsx
import {
  useTextProcessing,
  useFileUpload,
  useAIGeneration,
  useChat,
  useRAGSearch,
  useExport,
  useDocumentStorage
} from '@/hooks/useFeatures';
```

### 3. Use in Your Page
```tsx
export default function ProcessingPage() {
  const { content, loading, processText } = useTextProcessing();
  const { uploadStatus, uploadFile } = useFileUpload();
  const { generate, result } = useAIGeneration();

  return (
    <div className="space-y-6">
      <TextInput onSubmit={processText} loading={loading} />
      <FileUpload onUpload={uploadFile} />
      <AICapabilities onGenerate={generate} result={result} />
    </div>
  );
}
```

---

## Feature Integration Patterns

### Pattern 1: Text Processing Workflow
```tsx
function TextProcessingWorkflow() {
  const { content, loading, processText } = useTextProcessing();
  const { generate, result } = useAIGeneration();
  const { exportContent } = useExport();

  return (
    <div className="space-y-6">
      {/* Step 1: Input */}
      <TextInput onSubmit={processText} />

      {/* Step 2: Process */}
      {content && (
        <AICapabilities 
          onGenerate={(cap) => generate(cap, content)} 
          result={result}
        />
      )}

      {/* Step 3: Export */}
      {result && (
        <ExportManager 
          content={result} 
          onExport={(fmt) => exportContent(result, fmt, 'output')}
        />
      )}
    </div>
  );
}
```

### Pattern 2: Document Processing with RAG
```tsx
function DocumentRAGWorkflow() {
  const { uploadFile } = useFileUpload();
  const { search, results } = useRAGSearch();
  const { sendMessage, messages } = useChat();

  const [documents, setDocuments] = useState([]);

  const handleUpload = async (file: File) => {
    const doc = await uploadFile(file);
    setDocuments(prev => [...prev, doc]);
  };

  return (
    <div className="space-y-6">
      {/* Upload documents */}
      <FileUpload onUpload={handleUpload} />

      {/* Search across documents */}
      {documents.length > 0 && (
        <RAGContext 
          documents={documents}
          onSearch={(query) => search(query, documents.map(d => d.id))}
          searchResults={results}
        />
      )}

      {/* Chat with documents */}
      <AdvancedChat 
        onSendMessage={sendMessage}
        suggestedQuestions={[
          'What is the main topic?',
          'Summarize this document'
        ]}
      />
    </div>
  );
}
```

### Pattern 3: Study & Learning
```tsx
function StudyWorkflow() {
  const { generate } = useAIGeneration();
  const [content, setContent] = useState('');

  return (
    <div className="space-y-6">
      {/* Input content */}
      <TextInput onSubmit={(text) => setContent(text)} />

      {/* Generate study materials */}
      {content && (
        <Tabs>
          <Tab label="Flashcards">
            <FlashcardGenerator 
              onGenerate={() => generate('flashcards', content)}
            />
          </Tab>
          
          <Tab label="Quiz">
            <QuizGenerator 
              onGenerate={() => generate('quiz', content)}
            />
          </Tab>
        </Tabs>
      )}
    </div>
  );
}
```

---

## Backend API Requirements

Each component needs corresponding backend endpoints:

### Text Processing
```bash
POST /api/text/process
{
  "text": "...",
  "language": "en"
}
```

### File Upload
```bash
POST /api/files/upload
multipart/form-data
```

### AI Generation
```bash
POST /api/ai/{capability}
{
  "content": "...",
  "customPrompt": "..."
}
→ { result: "Generated content..." }
```

### Chat
```bash
POST /api/chat/message
{
  "message": "...",
  "context": "...",
  "chatId": "..."
}
→ { response: "AI response..." }
```

### RAG Search
```bash
POST /api/rag/search
{
  "query": "...",
  "documentIds": ["..."],
  "topK": 10
}
→ { results: [...] }
```

### Export
```bash
POST /api/export
{
  "content": "...",
  "format": "pdf|markdown|docx|json|txt",
  "filename": "..."
}
→ Blob (file download)
```

### Documents
```bash
POST /api/documents/save
{ title, content, tags }
→ { documentId }

DELETE /api/documents/{id}

GET /api/documents
→ { documents: [...] }
```

---

## Component API Reference

### TextInput
```tsx
<TextInput
  onSubmit={async (text: string) => void}
  loading?: boolean
  maxLength?: number
/>
```

### FileUpload
```tsx
<FileUpload
  onUpload={async (file: File) => void}
  acceptedFormats?: string[]
  maxFileSize?: number
  loading?: boolean
/>
```

### AICapabilities
```tsx
<AICapabilities
  onGenerate={async (capability, customPrompt?) => string}
  loading?: boolean
  result?: string
/>
```

### AdvancedChat
```tsx
<AdvancedChat
  onSendMessage={async (message, context?) => string}
  loading?: boolean
  suggestedQuestions?: string[]
/>
```

### RAGContext
```tsx
<RAGContext
  documents={RAGDocument[]}
  onSelectDocuments={(ids: string[]) => void}
  onSearch={async (query: string) => void}
  searchResults?: any[]
  loading?: boolean
/>
```

### ExportManager
```tsx
<ExportManager
  content: string
  onExport={async (format) => Blob}
  filename?: string
/>
```

### DocumentStorage
```tsx
<DocumentStorage
  onSave={async (title, content, tags) => string}
  onDelete={async (docId) => void}
  documents={StoredDocument[]}
  currentContent?: string
/>
```

### SecuritySettings
```tsx
<SecuritySettings
  onChangeDataPrivacy={async (level) => void}
  onChangeTokenExpiry={async (minutes) => void}
  onRevokeAllSessions={async () => void}
  securityInfo?: SecurityInfo
  loading?: boolean
/>
```

---

## Error Handling

All components have built-in error handling:

```tsx
<AICapabilities
  onGenerate={async (cap) => {
    try {
      const result = await generateContent(cap);
      return result;
    } catch (error) {
      // Component displays error automatically
      throw error;
    }
  }}
/>
```

Errors show:
- User-friendly messages
- Retry buttons where appropriate
- Detailed logs in console

---

## Loading States

All components show appropriate loading states:
- Spinner animations
- Disabled buttons
- Progress indicators
- Status badges

```tsx
{loading && <Loader2 className="animate-spin" />}
```

---

## Real-Time Streaming

For streaming responses (chat, generation):

```tsx
// Server-Sent Events (SSE)
async function* streamGenerateContent(content: string) {
  const response = await fetch('/api/generate/stream', {
    method: 'POST',
    body: JSON.stringify({ content })
  });

  const reader = response.body?.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    yield new TextDecoder().decode(value);
  }
}
```

---

## Accessibility Features

All components include:
- ✅ ARIA labels and roles
- ✅ Keyboard navigation
- ✅ Focus management
- ✅ Screen reader support
- ✅ Color contrast compliance
- ✅ Semantic HTML

---

## Mobile Responsiveness

All components are fully responsive:
- Mobile: Single column, touch-friendly
- Tablet: Two-column layout
- Desktop: Full multi-column layout

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Responsive to screen size */}
</div>
```

---

## Dark Mode Support

Components support dark mode via Tailwind:

```css
@media (prefers-color-scheme: dark) {
  /* Dark mode styles */
}
```

Or manually:
```tsx
<div className="dark:bg-gray-900 dark:text-white">
  {/* Dark mode ready */}
</div>
```

---

## Performance Optimization

### Code Splitting
```tsx
import dynamic from 'next/dynamic';

const AICapabilities = dynamic(
  () => import('@/components/features').then(m => m.AICapabilities),
  { loading: () => <Skeleton /> }
);
```

### Lazy Loading
```tsx
<InView triggerOnce>
  {({ inView, ref }) => (
    <div ref={ref}>
      {inView && <AdvancedChat {...props} />}
    </div>
  )}
</InView>
```

### Memoization
```tsx
const MemoizedChat = React.memo(AdvancedChat, (prev, next) => {
  return prev.messages === next.messages;
});
```

---

## State Management

Use hooks for local state:
```tsx
const [messages, setMessages] = useState([]);
const { loading } = useAIGeneration();
```

Use Context for global state:
```tsx
<FeaturesProvider>
  <YourApp />
</FeaturesProvider>
```

Use Redux/Zustand for complex state:
```tsx
const { docs } = useDocumentStore();
```

---

## Testing Components

With React Testing Library:
```tsx
import { render, screen } from '@testing-library/react';

test('TextInput displays character count', () => {
  render(<TextInput onSubmit={() => {}} />);
  expect(screen.getByText(/Characters:/)).toBeInTheDocument();
});
```

---

## Browser Compatibility

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

---

## Production Deployment Checklist

- [ ] All API endpoints implemented
- [ ] Error monitoring (Sentry, LogRocket)
- [ ] Performance monitoring (Vercel Analytics)
- [ ] User analytics (Mixpanel, Amplitude)
- [ ] A/B testing setup
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] Security headers set
- [ ] CSP policy configured
- [ ] SSL/TLS certificates valid
- [ ] Database backups automated
- [ ] Logging and audit trails setup
- [ ] Error alerts configured
- [ ] Performance budgets set

---

## Support & Resources

- **Component Showcase**: `/features` page
- **Documentation**: `docs/FRONTEND_COMPONENTS.md`
- **Source Code**: `src/components/features/`
- **Hooks**: `src/hooks/useFeatures.ts`
- **Examples**: `src/app/features/page.tsx`

---

**Last Updated**: January 25, 2026
**Status**: ✅ Production Ready
**Version**: 1.0.0
