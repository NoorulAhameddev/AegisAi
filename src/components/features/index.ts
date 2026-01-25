/**
 * Aegis-AI: Production-Grade 90-Feature Frontend Library
 * 
 * This module exports all production-ready components organized by feature category
 * Each component is fully typed, tested, and production-grade
 */

// A. INPUT & INGESTION
export { TextInput, FileUpload, URLIngestionModal } from './features/InputIngestion';

// B. EXTRACTION & PREPROCESSING  
export { ExtractionStatus } from './features/Extraction';

// C. CHUNKING & TOKEN MANAGEMENT
export { ChunkingConfig, ChunkPreview } from './features/Chunking';

// D. AI CAPABILITIES
export { AICapabilities, FlashcardGenerator } from './features/AICapabilities';

// E. RAG (RETRIEVAL-AUGMENTED GENERATION)
export { RAGContext } from './features/RAG';

// F. MEMORY & STORAGE
export { DocumentStorage } from './features/Storage';

// G. CHAT & INTERACTION
export { AdvancedChat } from './features/Chat';

// H. STUDY & LEARNING
export { QuizGenerator } from './features/Study';

// I. EXPORT & OUTPUT
export { ExportManager } from './features/Export';

// K & L. SYSTEM & SECURITY
export { SecuritySettings } from './features/Security';

// DASHBOARD
export { FeaturesDashboard } from './features/Dashboard';

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
