'use client';

import React, { useState } from 'react';
import { Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Notification } from '@/components/ui/Notification';
import { Clock, AlertCircle } from 'lucide-react';

interface TextInputProps {
  onSubmit: (text: string) => Promise<void>;
  loading?: boolean;
  maxLength?: number;
}

export function TextInput({
  onSubmit,
  loading = false,
  maxLength = 50000,
}: TextInputProps) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const charCount = text.length;
  const percentUsed = (charCount / maxLength) * 100;

  const handleSubmit = async () => {
    if (!text.trim()) {
      setError('Please enter some text');
      return;
    }

    if (charCount > maxLength) {
      setError(`Text exceeds maximum length of ${maxLength} characters`);
      return;
    }

    try {
      setError('');
      await onSubmit(text);
      setSuccess('Text submitted successfully!');
      setText('');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit text');
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Paste Text</h3>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Clock size={16} />
            <span>Characters: {charCount.toLocaleString()} / {maxLength.toLocaleString()}</span>
          </div>
        </div>

        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste your text here... (up to 50,000 characters)"
          rows={8}
          className="font-mono text-sm"
        />

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                percentUsed > 90 ? 'bg-red-500' : percentUsed > 75 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(percentUsed, 100)}%` }}
            />
          </div>
          {percentUsed > 90 && (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <AlertCircle size={14} />
              <span>Approaching character limit</span>
            </div>
          )}
        </div>

        {error && <Notification type="error" message={error} />}
        {success && <Notification type="success" message={success} />}

        <button
          onClick={handleSubmit}
          disabled={loading || !text.trim()}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition"
        >
          {loading ? 'Processing...' : 'Submit Text'}
        </button>
      </div>
    </Card>
  );
}
