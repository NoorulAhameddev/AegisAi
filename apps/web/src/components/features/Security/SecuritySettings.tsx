"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Shield, Eye, EyeOff, AlertTriangle, CheckCircle } from "lucide-react";

interface SecurityInfo {
  encryption: "enabled" | "disabled";
  encryptionKeyVersion?: number;
  dataLocalization?: string;
  auditLogging: boolean;
  tokenExpiry?: number;
  lastSecurityUpdate?: string;
}

interface SecuritySettingsProps {
  onChangeDataPrivacy: (
    level: "public" | "private" | "encrypted",
  ) => Promise<void>;
  onChangeTokenExpiry: (minutes: number) => Promise<void>;
  onRevokeAllSessions: () => Promise<void>;
  securityInfo?: SecurityInfo;
  loading?: boolean;
}

export function SecuritySettings({
  onChangeDataPrivacy,
  onChangeTokenExpiry,
  onRevokeAllSessions,
  securityInfo,
  loading = false,
}: SecuritySettingsProps) {
  const [privacyLevel, setPrivacyLevel] = useState<
    "public" | "private" | "encrypted"
  >("private");
  const [tokenExpiry, setTokenExpiry] = useState(10);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [revokeConfirm, setRevokeConfirm] = useState(false);

  const handlePrivacyChange = async (
    level: "public" | "private" | "encrypted",
  ) => {
    setPrivacyLevel(level);
    try {
      await onChangeDataPrivacy(level);
    } catch (error) {
      console.error("Failed to change privacy level:", error);
    }
  };

  const handleRevokeAllSessions = async () => {
    try {
      await onRevokeAllSessions();
      setRevokeConfirm(false);
    } catch (error) {
      console.error("Failed to revoke sessions:", error);
    }
  };

  return (
    <div className="space-y-4">
      {/* Security Status */}
      <Card className="p-4 bg-gradient-to-br from-green-50 to-blue-50 border-green-200">
        <div className="flex items-start gap-3">
          <CheckCircle size={24} className="text-green-600 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-green-900 mb-1">
              Security Status
            </h3>
            <div className="space-y-1 text-sm text-green-800">
              {securityInfo?.encryption === "enabled" && (
                <p>✓ End-to-end encryption enabled</p>
              )}
              {securityInfo?.auditLogging && <p>✓ Audit logging active</p>}
              {securityInfo?.dataLocalization && (
                <p>✓ Data localized to {securityInfo.dataLocalization}</p>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Data Privacy */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Shield size={18} />
          Data Privacy Level
        </h3>
        <div className="space-y-2 mb-4">
          {[
            {
              level: "public" as const,
              label: "🌐 Public",
              description: "Accessible to everyone (not recommended)",
              color: "gray",
            },
            {
              level: "private" as const,
              label: "🔒 Private",
              description: "Only you can access",
              color: "blue",
            },
            {
              level: "encrypted" as const,
              label: "🔐 End-to-End Encrypted",
              description: "Maximum security with client-side encryption",
              color: "green",
            },
          ].map((option) => (
            <button
              key={option.level}
              onClick={() => handlePrivacyChange(option.level)}
              className={`w-full text-left p-3 rounded-lg border-2 transition ${
                privacyLevel === option.level
                  ? `border-${option.color}-500 bg-${option.color}-50`
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm text-gray-900">
                    {option.label}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {option.description}
                  </p>
                </div>
                {privacyLevel === option.level && (
                  <CheckCircle
                    size={18}
                    className={`text-${option.color}-600`}
                  />
                )}
              </div>
            </button>
          ))}
        </div>
      </Card>

      {/* Token Management */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3">Session Token Expiry</h3>
        <div className="space-y-3">
          <div>
            <label className="flex items-center justify-between text-sm mb-2">
              <span className="font-medium">Expiry Time (minutes)</span>
              <Badge variant="secondary">{tokenExpiry}m</Badge>
            </label>
            <input
              type="range"
              min="5"
              max="1440"
              value={tokenExpiry}
              onChange={(e) => setTokenExpiry(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>5 min (shorter)</span>
              <span>24 hours (longer)</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Active Sessions */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3">Active Sessions</h3>
        <p className="text-sm text-gray-600 mb-3">You have 1 active session</p>

        {!revokeConfirm ? (
          <button
            onClick={() => setRevokeConfirm(true)}
            className="w-full py-2 px-4 border border-red-300 text-red-600 rounded-lg font-medium hover:bg-red-50 transition"
          >
            Revoke All Sessions
          </button>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-red-600 font-medium">
              This will log you out everywhere. Are you sure?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setRevokeConfirm(false)}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRevokeAllSessions}
                className="flex-1 py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium"
              >
                Revoke All
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Advanced Options */}
      <Card className="p-4">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center justify-between w-full font-semibold text-gray-700"
        >
          <span>Advanced Options</span>
          {showAdvanced ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>

        {showAdvanced && (
          <div className="mt-4 space-y-3 pt-4 border-t">
            <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertTriangle
                size={18}
                className="text-yellow-600 flex-shrink-0"
              />
              <div>
                <p className="text-xs font-semibold text-yellow-900">
                  Encryption Key Version
                </p>
                <p className="text-xs text-yellow-800 mt-0.5">
                  Current: v{securityInfo?.encryptionKeyVersion || 1}
                </p>
              </div>
            </div>

            {securityInfo?.lastSecurityUpdate && (
              <div className="text-xs text-gray-600">
                Last security update:{" "}
                {new Date(securityInfo.lastSecurityUpdate).toLocaleDateString()}
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
