"use client";

import React, { useEffect, useState } from "react";

/**
 * API Documentation Page
 * Interactive Swagger UI for Aegis AI REST API
 *
 * To complete setup:
 * 1. Install: npm install swagger-ui-react swagger-jsdoc
 * 2. Add JSDoc annotations to API routes (see lib/swagger-config.ts)
 * 3. Restart dev server
 */

export default function APIDocsPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading API Documentation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Aegis AI API Documentation
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Interactive API reference for developers
              </p>
            </div>
            <a
              href="/"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Back to App
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Installation Instructions */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg
                className="h-6 w-6 text-yellow-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-yellow-800">
                Setup Required
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p className="mb-2">
                  To enable interactive API documentation, install the required
                  packages:
                </p>
                <pre className="bg-yellow-100 border border-yellow-300 rounded p-3 overflow-x-auto">
                  <code>npm install swagger-ui-react swagger-jsdoc</code>
                </pre>
                <p className="mt-3">
                  Then uncomment the Swagger UI component below and restart the
                  dev server.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <a
            href="#authentication"
            className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              🔐 Authentication
            </h3>
            <p className="text-sm text-gray-600">
              Login, register, token refresh, and session management
            </p>
          </a>
          <a
            href="#chat"
            className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              💬 Chat
            </h3>
            <p className="text-sm text-gray-600">
              Streaming responses, SSE, message history, and exports
            </p>
          </a>
          <a
            href="#rag"
            className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">📚 RAG</h3>
            <p className="text-sm text-gray-600">
              Document ingestion, semantic search, and knowledge retrieval
            </p>
          </a>
        </div>

        {/* API Endpoints Preview */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 bg-gray-800 text-white">
            <h2 className="text-lg font-semibold">API Endpoints</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {/* Authentication */}
            <div className="p-6" id="authentication">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Authentication
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div className="flex items-center">
                    <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">
                      POST
                    </span>
                    <code className="ml-3 text-sm">/api/auth/login</code>
                  </div>
                  <span className="text-sm text-gray-500">
                    Authenticate user
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div className="flex items-center">
                    <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">
                      POST
                    </span>
                    <code className="ml-3 text-sm">/api/auth/register</code>
                  </div>
                  <span className="text-sm text-gray-500">
                    Create new account
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div className="flex items-center">
                    <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">
                      POST
                    </span>
                    <code className="ml-3 text-sm">/api/auth/refresh</code>
                  </div>
                  <span className="text-sm text-gray-500">
                    Refresh access token
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div className="flex items-center">
                    <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">
                      POST
                    </span>
                    <code className="ml-3 text-sm">/api/auth/logout</code>
                  </div>
                  <span className="text-sm text-gray-500">End session</span>
                </div>
              </div>
            </div>

            {/* Chat */}
            <div className="p-6" id="chat">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Chat</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div className="flex items-center">
                    <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">
                      POST
                    </span>
                    <code className="ml-3 text-sm">/api/chat/stream-sse</code>
                  </div>
                  <span className="text-sm text-gray-500">
                    Stream chat (SSE)
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div className="flex items-center">
                    <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">
                      POST
                    </span>
                    <code className="ml-3 text-sm">/api/chat/stream</code>
                  </div>
                  <span className="text-sm text-gray-500">
                    Stream chat (polling)
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div className="flex items-center">
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">
                      GET
                    </span>
                    <code className="ml-3 text-sm">/api/chat/history</code>
                  </div>
                  <span className="text-sm text-gray-500">
                    Get message history
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div className="flex items-center">
                    <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">
                      POST
                    </span>
                    <code className="ml-3 text-sm">/api/chat/export</code>
                  </div>
                  <span className="text-sm text-gray-500">
                    Export as PDF/Markdown
                  </span>
                </div>
              </div>
            </div>

            {/* RAG */}
            <div className="p-6" id="rag">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                RAG (Retrieval Augmented Generation)
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div className="flex items-center">
                    <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">
                      POST
                    </span>
                    <code className="ml-3 text-sm">/api/rag/ingest</code>
                  </div>
                  <span className="text-sm text-gray-500">Ingest document</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div className="flex items-center">
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">
                      GET
                    </span>
                    <code className="ml-3 text-sm">/api/rag/search</code>
                  </div>
                  <span className="text-sm text-gray-500">Semantic search</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div className="flex items-center">
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">
                      GET
                    </span>
                    <code className="ml-3 text-sm">/api/rag/documents</code>
                  </div>
                  <span className="text-sm text-gray-500">List documents</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Swagger UI Placeholder */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Interactive API Explorer
          </h2>
          <p className="text-gray-600 mb-4">
            Once you install{" "}
            <code className="bg-gray-100 px-2 py-1 rounded">
              swagger-ui-react
            </code>
            , the interactive API explorer will appear here.
          </p>

          {/* Uncomment this after installing swagger-ui-react and swagger-jsdoc */}
          {/*
          <SwaggerUI spec={swaggerSpec} />
          */}

          <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="mt-2 text-sm text-gray-500">
              Interactive Swagger UI will appear here after setup
            </p>
          </div>
        </div>

        {/* Documentation Links */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-sm font-medium text-blue-900 mb-3">
            📚 Additional Resources
          </h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>
              <a href="/docs/QUICKSTART.md" className="hover:underline">
                → Quick Start Guide
              </a>
            </li>
            <li>
              <a
                href="/docs/IMPLEMENTATION_GUIDE.md"
                className="hover:underline"
              >
                → Implementation Guide
              </a>
            </li>
            <li>
              <a href="/docs/SECURITY.md" className="hover:underline">
                → Security Documentation
              </a>
            </li>
            <li>
              <a
                href="https://github.com/aegis-ai/aegis-ai"
                className="hover:underline"
              >
                → GitHub Repository
              </a>
            </li>
          </ul>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-gray-500">
            Aegis AI API Documentation • Version 1.0.0 • Built with Next.js 16
          </p>
        </div>
      </footer>
    </div>
  );
}
