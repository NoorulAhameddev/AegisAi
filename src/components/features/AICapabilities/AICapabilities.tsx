'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Loader2, Zap, Copy, Check, Settings } from 'lucide-react';

type AICapability = 'summarize' | 'notes' | 'bullets' | 'concepts' | 'definitions' | 'examples' | 'explain' | 'qa';

interface AICapabilityOption {
  id: AICapability;
  label: string;
  icon: string;
  description: string;
  complexity: 'fast' | 'medium' | 'slow';
}

const CAPABILITIES: AICapabilityOption[] = [
  {
    id: 'summarize',
    label: 'Summarize',
    icon: '📝',
    description: 'Generate concise summary',
    complexity: 'fast',
  },
  {
    id: 'notes',
    label: 'Notes',
    icon: '📄',
    description: 'Detailed structured notes',
    complexity: 'medium',
  },
  {
    id: 'bullets',
    label: 'Bullet Points',
    icon: '📋',
    description: 'Key takeaways as bullets',
    complexity: 'fast',
  },
  {
    id: 'concepts',
    label: 'Key Concepts',
    icon: '🧠',
    description: 'Extract main concepts',
    complexity: 'medium',
  },
  {
    id: 'definitions',
    label: 'Glossary',
    icon: '📚',
    description: 'Definitions & explanations',
    complexity: 'medium',
  },
  {
    id: 'examples',
    label: 'Examples',
    icon: '💡',
    description: 'Real-world examples',
    complexity: 'medium',
  },
  {
    id: 'explain',
    label: 'ELI5',
    icon: '👧',
    description: 'Simplified explanation',
    complexity: 'fast',
  },
  {
    id: 'qa',
    label: 'Q&A',
    icon: '❓',
    description: 'Answer questions',
    complexity: 'medium',
  },
];

interface AICapabilitiesProps {
  onGenerate: (capability: AICapability, customPrompt?: string) => Promise<string>;
  loading?: boolean;
  result?: string;
}

export function AICapabilities({ onGenerate, loading = false, result }: AICapabilitiesProps) {
  const [selectedCapability, setSelectedCapability] = useState<AICapability>('summarize');
  const [customPrompt, setCustomPrompt] = useState('');
  const [output, setOutput] = useState(result || '');
  const [copied, setCopied] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const capability = CAPABILITIES.find((c) => c.id === selectedCapability);

  const handleGenerate = async () => {
    try {
      const response = await onGenerate(selectedCapability, customPrompt);
      setOutput(response);
    } catch (error) {
      setOutput(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Capability Grid */}
      <div className="grid grid-cols-4 gap-2">
        {CAPABILITIES.map((cap) => (
          <button
            key={cap.id}
            onClick={() => setSelectedCapability(cap.id)}
            className={`p-3 rounded-lg border-2 transition text-left ${
              selectedCapability === cap.id
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <p className="text-xl mb-1">{cap.icon}</p>
            <p className="text-sm font-semibold">{cap.label}</p>
            <p className="text-xs text-gray-500 mt-1">{cap.description}</p>
            <div className="mt-2">
              {cap.complexity === 'fast' && (
                <Badge variant="success" className="text-xs">
                  Fast
                </Badge>
              )}
              {cap.complexity === 'medium' && (
                <Badge variant="warning" className="text-xs">
                  Medium
                </Badge>
              )}
              {cap.complexity === 'slow' && (
                <Badge variant="error" className="text-xs">
                  Slow
                </Badge>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Settings & Custom Prompt */}
      <Card className="p-4">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900"
        >
          <Settings size={16} />
          Advanced Options
        </button>

        {showAdvanced && (
          <div className="mt-4 space-y-3 border-t pt-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">
                Custom Prompt (optional)
              </label>
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Add custom instructions or context..."
                rows={3}
                className="w-full border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}
      </Card>

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition"
      >
        {loading ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Zap size={18} />
            Generate {capability?.label}
          </>
        )}
      </button>

      {/* Output */}
      {output && (
        <Card className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-gray-900">Output</p>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2 py-1 text-sm rounded-lg hover:bg-white"
            >
              {copied ? (
                <>
                  <Check size={14} />
                  Copied
                </>
              ) : (
                <>
                  <Copy size={14} />
                  Copy
                </>
              )}
            </button>
          </div>
          <div className="bg-white rounded-lg p-4 max-h-72 overflow-y-auto">
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{output}</p>
          </div>
        </Card>
      )}
    </div>
  );
}
