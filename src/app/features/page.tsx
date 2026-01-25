'use client';

import React, { useState } from 'react';
import { Tabs } from '@/components/ui/Tabs';
import {
  TextInput,
  FileUpload,
  URLIngestionModal,
  ExtractionStatus,
  ChunkingConfig,
  ChunkPreview,
  AICapabilities,
  FlashcardGenerator,
  RAGContext,
  DocumentStorage,
  AdvancedChat,
  QuizGenerator,
  ExportManager,
  SecuritySettings,
  FeaturesDashboard,
} from '@/components/features';

/**
 * Complete example showing all 90+ features in action
 * This page demonstrates the full workflow from input to export
 */
export default function FeaturesShowcasePage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [content, setContent] = useState('');
  const [documents, setDocuments] = useState([]);

  // Example handlers
  const handleTextSubmit = async (text: string) => {
    console.log('Text submitted:', text);
    setContent(text);
  };

  const handleFileUpload = async (file: File) => {
    console.log('File uploaded:', file.name);
    // In production, call API to process file
  };

  const handleURLIngest = async (url: string, type: string) => {
    console.log('URL ingested:', url, type);
  };

  const handleGenerate = async (capability: string) => {
    console.log('Generating:', capability);
    return 'This is generated content...';
  };

  const handleExport = async (format: string): Promise<Blob> => {
    console.log('Exporting as:', format);
    return new Blob([content], { type: 'text/plain' });
  };

  const mockDocuments = [
    {
      id: 'doc-1',
      title: 'My Notes',
      content: 'Sample content...',
      tags: ['important', 'work'],
      createdAt: '2024-01-25',
      updatedAt: '2024-01-25',
      version: 1,
      archived: false,
    },
  ];

  const mockRAGDocuments = [
    {
      id: 'rag-1',
      name: 'document.pdf',
      uploadedAt: 'Jan 25, 2024',
      chunks: 50,
      tokens: 12000,
      language: 'en',
      selected: true,
    },
  ];

  const tabs = [
    { label: '📊 Dashboard', value: 'dashboard' },
    { label: '📥 Input', value: 'input' },
    { label: '🔍 Extraction', value: 'extraction' },
    { label: '✂️ Chunking', value: 'chunking' },
    { label: '🧠 AI', value: 'ai' },
    { label: '📚 RAG', value: 'rag' },
    { label: '💬 Chat', value: 'chat' },
    { label: '🎓 Study', value: 'study' },
    { label: '📤 Export', value: 'export' },
    { label: '🔐 Security', value: 'security' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Aegis-AI Features Showcase
          </h1>
          <p className="text-gray-600">
            Complete frontend demonstration of 90+ production-ready features
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6 flex gap-2 flex-wrap">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                activeTab === tab.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <FeaturesDashboard
              stats={{
                totalDocuments: 42,
                totalChunks: 2150,
                totalTokens: 425000,
                totalChats: 156,
                totalExports: 89,
              }}
              recentActivity={[
                {
                  id: '1',
                  action: 'Uploaded PDF',
                  description: 'document.pdf (2.3 MB)',
                  timestamp: '2 min ago',
                  type: 'upload',
                },
                {
                  id: '2',
                  action: 'Generated Summary',
                  description: '156 words generated',
                  timestamp: '5 min ago',
                  type: 'process',
                },
              ]}
            />
          )}

          {/* Input Tab */}
          {activeTab === 'input' && (
            <div className="space-y-6">
              <TextInput onSubmit={handleTextSubmit} />
              <FileUpload onUpload={handleFileUpload} />
              <URLIngestionModal
                isOpen={false}
                onClose={() => {}}
                onSubmit={handleURLIngest}
              />
            </div>
          )}

          {/* Extraction Tab */}
          {activeTab === 'extraction' && (
            <ExtractionStatus
              status="success"
              documentName="document.pdf"
              preview={{
                title: 'Sample Document',
                author: 'John Doe',
                language: 'en',
                chunks: 50,
                tokens: 12000,
                textPreview: 'This is a sample document excerpt...',
              }}
            />
          )}

          {/* Chunking Tab */}
          {activeTab === 'chunking' && (
            <div className="space-y-6">
              <ChunkingConfig
                settings={{
                  chunkSize: 512,
                  overlapSize: 64,
                  chunkingStrategy: 'recursive',
                  preserveStructure: true,
                }}
                onChange={(s) => console.log('Settings changed:', s)}
                documentTokens={25000}
              />
              <ChunkPreview
                chunks={Array.from({ length: 10 }, (_, i) => ({
                  id: `chunk-${i}`,
                  text: `Chunk ${i + 1} content...`,
                  tokens: 256 + i * 50,
                  startToken: i * 300,
                }))}
                totalTokens={25000}
              />
            </div>
          )}

          {/* AI Tab */}
          {activeTab === 'ai' && (
            <div className="space-y-6">
              <AICapabilities onGenerate={handleGenerate} result={content} />
              <FlashcardGenerator onGenerate={async () => []} />
            </div>
          )}

          {/* RAG Tab */}
          {activeTab === 'rag' && (
            <RAGContext
              documents={mockRAGDocuments}
              onSelectDocuments={(ids) => console.log('Selected:', ids)}
              onSearch={async (q) => console.log('Searching:', q)}
            />
          )}

          {/* Chat Tab */}
          {activeTab === 'chat' && (
            <AdvancedChat
              onSendMessage={async (msg) => {
                return `Response to: ${msg}`;
              }}
              suggestedQuestions={[
                'What is the main topic?',
                'Summarize in 2 sentences',
              ]}
            />
          )}

          {/* Study Tab */}
          {activeTab === 'study' && (
            <div className="space-y-6">
              <FlashcardGenerator onGenerate={async () => []} />
              <QuizGenerator onGenerate={async () => []} />
            </div>
          )}

          {/* Export Tab */}
          {activeTab === 'export' && (
            <div className="space-y-6">
              <ExportManager
                content={content || 'Sample content to export...'}
                onExport={handleExport}
                filename="export"
              />
              <DocumentStorage
                onSave={async (title, content, tags) => {
                  console.log('Saving:', title, tags);
                  return 'doc-id';
                }}
                onDelete={async (id) => {
                  console.log('Deleting:', id);
                }}
                documents={mockDocuments}
                currentContent={content}
              />
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <SecuritySettings
              onChangeDataPrivacy={async (level) => console.log('Privacy:', level)}
              onChangeTokenExpiry={async (mins) => console.log('Expiry:', mins)}
              onRevokeAllSessions={async () => console.log('Revoking...')}
              securityInfo={{
                encryption: 'enabled',
                encryptionKeyVersion: 1,
                dataLocalization: 'US-EAST-1',
                auditLogging: true,
              }}
            />
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-gray-600 text-sm">
          <p>
            All 90+ features are production-ready with TypeScript, Accessibility, and
            Responsive Design
          </p>
          <p className="mt-2">📖 See docs/FRONTEND_COMPONENTS.md for complete documentation</p>
        </div>
      </div>
    </div>
  );
}
