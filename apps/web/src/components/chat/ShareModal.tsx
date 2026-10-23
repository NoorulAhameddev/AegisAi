import React, { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Loader2 } from "lucide-react";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
  onShared?: (result: { shareUrl?: string; invitations?: any[] }) => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  chatId,
  onShared,
}) => {
  const [emails, setEmails] = useState<string>("");
  const [role, setRole] = useState("VIEWER");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleShare = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const payload: any = { chatId, role };
      if (emails.trim()) {
        payload.emails = emails.split(/[,;\s]+/).filter(Boolean);
      }
      const res = await fetch("/api/collaboration/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok)
        throw new Error((await res.json()).error || "Failed to share");
      const data = await res.json();
      setResult(data);
      if (onShared) onShared(data);
    } catch (err: any) {
      setError(err.message || "Failed to share");
    } finally {
      setLoading(false);
    }
  };

  const shareUrl = result?.shareUrl;
  const invitations = result?.invitations;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Share Chat"
      className="max-w-md w-full"
    >
      <div className="space-y-4 mt-2">
        <div>
          <label className="block text-sm font-medium mb-1">
            Invite by Email
          </label>
          <Input
            type="text"
            placeholder="alice@example.com, bob@example.com"
            value={emails}
            onChange={(e) => setEmails(e.target.value)}
            disabled={loading}
          />
          <div className="text-xs text-ink-500 mt-1">
            Separate multiple emails with commas or spaces.
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Role</label>
          <select
            className="w-full border border-hair bg-ink-900 text-ink-100 px-2 py-1 text-sm"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            disabled={loading}
          >
            <option value="VIEWER">Viewer (read-only)</option>
            <option value="COMMENTER">Commenter</option>
            <option value="EDITOR">Editor</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
        {error && <div className="text-red-500 text-sm">{error}</div>}
        <div className="flex items-center gap-2 mt-4">
          <Button onClick={handleShare} disabled={loading}>
            {loading ? <Loader2 className="animate-spin h-4 w-4" /> : "Share"}
          </Button>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
        </div>
        {shareUrl && (
          <div className="mt-4">
            <div className="text-xs text-ink-500 mb-1">Shareable Link:</div>
            <div className="bg-ink-900 border border-hair px-2 py-1 text-sm text-ink-300 break-all select-all">
              {shareUrl}
            </div>
          </div>
        )}
        {invitations && invitations.length > 0 && (
          <div className="mt-4">
            <div className="text-xs text-ink-500 mb-1">Invitations Sent:</div>
            <ul className="text-sm text-ink-300 list-disc pl-5">
              {invitations.map((inv: any, i: number) => (
                <li key={i}>
                  {inv.inviteeEmail} ({inv.status})
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Dialog>
  );
};
