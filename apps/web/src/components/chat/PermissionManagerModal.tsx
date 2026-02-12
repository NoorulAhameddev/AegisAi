import React, { useState, useEffect } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";

interface Collaborator {
  userId: string;
  userName: string;
  role: string;
}

interface PermissionManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
  currentUserId: string;
}

export const PermissionManagerModal: React.FC<PermissionManagerModalProps> = ({
  isOpen,
  onClose,
  chatId,
  currentUserId,
}) => {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!chatId) return;
    setLoading(true);
    setError(null);
    fetch(`/api/collaboration/${chatId}/permissions`)
      .then((res) => res.json())
      .then((data) => {
        setCollaborators(data.collaborators || []);
      })
      .catch((err) => setError("Failed to load collaborators"))
      .finally(() => setLoading(false));
  }, [chatId, isOpen]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/collaboration/${chatId}/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole }),
      });
      if (!res.ok)
        throw new Error((await res.json()).error || "Failed to update role");
      setCollaborators(
        collaborators.map((c) =>
          c.userId === userId ? { ...c, role: newRole } : c,
        ),
      );
    } catch (err: any) {
      setError(err.message || "Failed to update role");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (userId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/collaboration/${chatId}/permissions?userId=${userId}`,
        {
          method: "DELETE",
        },
      );
      if (!res.ok)
        throw new Error((await res.json()).error || "Failed to remove user");
      setCollaborators(collaborators.filter((c) => c.userId !== userId));
    } catch (err: any) {
      setError(err.message || "Failed to remove user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Manage Permissions"
      className="max-w-lg w-full"
    >
      <div className="space-y-4 mt-2">
        {error && <div className="text-red-500 text-sm">{error}</div>}
        <ul className="space-y-3">
          {collaborators.map((c) => (
            <li key={c.userId} className="flex items-center gap-3">
              <span className="font-medium text-zinc-200">{c.userName}</span>
              <select
                className="rounded border px-2 py-1 bg-zinc-900 text-white"
                value={c.role}
                onChange={(e) => handleRoleChange(c.userId, e.target.value)}
                disabled={
                  loading || c.userId === currentUserId || c.role === "OWNER"
                }
              >
                <option value="VIEWER">Viewer</option>
                <option value="COMMENTER">Commenter</option>
                <option value="EDITOR">Editor</option>
                <option value="ADMIN">Admin</option>
                <option value="OWNER">Owner</option>
              </select>
              {c.userId !== currentUserId && c.role !== "OWNER" && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleRemove(c.userId)}
                  disabled={loading}
                >
                  Remove
                </Button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </Dialog>
  );
};
