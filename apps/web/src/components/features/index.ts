/**
 * Aegis-AI: Production-Grade 90-Feature Frontend Library
 *
 * This module exports all production-ready components organized by feature category
 * Each component is fully typed, tested, and production-grade
 */

// A. INPUT & INGESTION
export { TextInput, FileUpload, URLIngestionModal } from "./InputIngestion";

// B. EXTRACTION & PREPROCESSING
export { ExtractionStatus } from "./Extraction";

// C. CHUNKING & TOKEN MANAGEMENT
export { ChunkingConfig, ChunkPreview } from "./Chunking";

// D. AI CAPABILITIES
export { AICapabilities, FlashcardGenerator } from "./AICapabilities";

// E. RAG (RETRIEVAL-AUGMENTED GENERATION)
export { RAGContext } from "./RAG";

// F. MEMORY & STORAGE
export { DocumentStorage } from "./Storage";

// G. CHAT & INTERACTION
export { AdvancedChat } from "./Chat";

// H. STUDY & LEARNING
export { QuizGenerator } from "./Study";

// I. EXPORT & OUTPUT
export { ExportManager } from "./Export";

// K & L. SYSTEM & SECURITY
export { SecuritySettings } from "./Security";

// DASHBOARD
export { FeaturesDashboard } from "./Dashboard";

/**
 * Usage Examples:
 *
 * 1. Text Input:
 *    import { TextInput } from '@/components/features';
 *    <TextInput onSubmit={async (text) => {}} />
 *
 * 2. File Upload:
 *    <FileUpload onUpload={handleUpload} maxFileSize={100} />
 *
 * 3. Chat Interface:
 *    <AdvancedChat onSendMessage={handleMessage} suggestedQuestions={[]} />
 *
 * 4. RAG Context:
 *    <RAGContext documents={docs} onSelectDocuments={select} onSearch={search} />
 *
 * 5. Export Manager:
 *    <ExportManager content={text} onExport={handleExport} />
 *
 * 6. Security Settings:
 *    <SecuritySettings onChangeDataPrivacy={change} ... />
 */
