"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  Shield,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle,
  Check,
  Globe,
  Lock,
  ShieldCheck,
} from "lucide-react";
import { logger } from "@/lib/logger";

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
      logger.error("Failed to change privacy level:", error);
    }
  };

  const handleRevokeAllSessions = async () => {
    try {
      await onRevokeAllSessions();
      setRevokeConfirm(false);
    } catch (error) {
      logger.error("Failed to revoke sessions:", error);
    }
  };

  return (
    <div className="space-y-4">
      {/* Security Status */}
      <Card className="p-4 bg-ink-850 border-hair">
        <div className="flex items-start gap-3">
          <CheckCircle size={24} className="text-emerald-400 flex-shrink-0" />
          <div>
            <h3 className="font-medium text-ink-100 mb-1">
              Security Status
            </h3>
            <div className="space-y-1 text-sm text-ink-300">
              {securityInfo?.encryption === "enabled" && (
                <p className="flex items-center gap-1.5">
                  <Check size={12} className="text-emerald-400" />
                  End-to-end encryption enabled
                </p>
              )}
              {securityInfo?.auditLogging && (
                <p className="flex items-center gap-1.5">
                  <Check size={12} className="text-emerald-400" />
                  Audit logging active
                </p>
              )}
              {securityInfo?.dataLocalization && (
                <p className="flex items-center gap-1.5">
                  <Check size={12} className="text-emerald-400" />
                  Data localized to {securityInfo.dataLocalization}
                </p>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Data Privacy */}
      <Card className="p-4">
        <h3 className="font-medium mb-3 flex items-center gap-2 text-ink-100">
          <Shield size={18} />
          Data Privacy Level
        </h3>
        <div className="space-y-2 mb-4">
          {[
            {
              level: "public" as const,
              label: "Public",
              description: "Accessible to everyone (not recommended)",
              icon: Globe,
            },
            {
              level: "private" as const,
              label: "Private",
              description: "Only you can access",
              icon: Lock,
            },
            {
              level: "encrypted" as const,
              label: "End-to-End Encrypted",
              description: "Maximum security with client-side encryption",
              icon: ShieldCheck,
            },
          ].map((option) => (
            <button
              key={option.level}
              onClick={() => handlePrivacyChange(option.level)}
              className={`w-full text-left p-3 border-2 transition ${
                privacyLevel === option.level
                  ? "border-brand bg-ink-800"
                  : "border-ink-700 hover:border-ink-500"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <option.icon
                    size={18}
                    className={
                      privacyLevel === option.level
                        ? "text-brand"
                        : "text-ink-500"
                    }
                  />
                  <div>
                    <p className="font-medium text-sm text-ink-100">
                      {option.label}
                    </p>
                    <p className="text-xs text-ink-400 mt-1">
                      {option.description}
                    </p>
                  </div>
                </div>
                {privacyLevel === option.level && (
                  <CheckCircle size={18} className="text-brand" />
                )}
              </div>
            </button>
          ))}
        </div>
      </Card>

      {/* Token Management */}
      <Card className="p-4">
        <h3 className="font-medium mb-3 text-ink-100">Session Token Expiry</h3>
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
            <div className="flex justify-between text-xs text-ink-500 mt-1">
              <span>5 min (shorter)</span>
              <span>24 hours (longer)</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Active Sessions */}
      <Card className="p-4">
        <h3 className="font-medium mb-3 text-ink-100">Active Sessions</h3>
        <p className="text-sm text-ink-400 mb-3">You have 1 active session</p>

        {!revokeConfirm ? (
          <button
            onClick={() => setRevokeConfirm(true)}
            className="w-full py-2 px-4 border border-red-500/30 text-red-400 font-medium hover:bg-red-500/10 transition"
          >
            Revoke All Sessions
          </button>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-red-400 font-medium">
              This will log you out everywhere. Are you sure?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setRevokeConfirm(false)}
                className="flex-1 py-2 px-4 border border-hair font-medium text-ink-100 hover:bg-ink-800"
              >
                Cancel
              </button>
              <button
                onClick={handleRevokeAllSessions}
                className="flex-1 py-2 px-4 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 font-medium"
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
          className="flex items-center justify-between w-full font-medium text-ink-300"
        >
          <span>Advanced Options</span>
          {showAdvanced ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>

        {showAdvanced && (
          <div className="mt-4 space-y-3 pt-4 border-t border-hair">
            <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/25">
              <AlertTriangle
                size={18}
                className="text-amber-400 flex-shrink-0"
              />
              <div>
                <p className="text-xs font-medium text-ink-100">
                  Encryption Key Version
                </p>
                <p className="text-xs text-ink-300 mt-0.5">
                  Current: v{securityInfo?.encryptionKeyVersion || 1}
                </p>
              </div>
            </div>

            {securityInfo?.lastSecurityUpdate && (
              <div className="text-xs text-ink-500">
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
