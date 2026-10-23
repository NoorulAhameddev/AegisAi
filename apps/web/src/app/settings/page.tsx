"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Save,
  LogOut,
  Loader2,
  Lock,
  X,
  User,
  Shield,
  AlertTriangle,
  Menu,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";

type AppUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "security">("profile");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const [displayName, setDisplayName] = useState("");

  // Password Form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => {
        if (res.status === 401) router.push("/login");
        return res.json();
      })
      .then((data) => {
        if (data.id) {
          setUser(data);
          setDisplayName(data.name);
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  const handleUpdateProfile = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: displayName }),
      });
      const data = await res.json();
      if (res.ok) {
        setUser((prev) => (prev ? { ...prev, name: data.name } : null));
        logger.info("Profile updated");
      } else {
        logger.error("Profile update failed:", data.error);
      }
    } catch (e) {
      logger.error("Profile update failed", { error: e });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg("Updating...");
    try {
      const res = await fetch("/api/user/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setPasswordMsg("Password changed successfully!");
        setCurrentPassword("");
        setNewPassword("");
      } else {
        setPasswordMsg("Error: " + data.error);
      }
    } catch (e) {
      setPasswordMsg("Failed to connect");
    }
  };

  const handleLogout = async () => {
    // TODO: Replace with a confirmation modal
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } catch (error) {
      logger.error("Logout failed", error);
    }
  };

  const handleDeleteAccount = async () => {
    // TODO: Replace with a confirmation modal
    try {
      const res = await fetch("/api/user/delete-account", { method: "DELETE" });
      if (res.ok) {
        router.push("/login");
      } else {
        const data = await res.json();
        logger.error("Delete account failed:", data.error);
      }
    } catch (error) {
      logger.error("Delete account failed", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-zinc-500">
        Loading settings...
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-black text-ink-100 font-sans overflow-hidden bg-[url('/bg-noise.png')]">
      {user && (
        <>
          <div className="hidden md:block">
            <AppSidebar user={user} />
          </div>
          <MobileNav
            user={user}
            isOpen={mobileNavOpen}
            onClose={() => setMobileNavOpen(false)}
          />
        </>
      )}

      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="px-8 py-6 border-b border-hair bg-ink-900 sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileNavOpen(true)}
              className="md:hidden p-2 -ml-2 text-zinc-400 hover:text-ink-100 transition-colors"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div>
              <h1 className="font-display text-2xl font-medium tracking-tight">Settings</h1>
              <p className="text-zinc-400 text-sm">
                Manage your account and preferences.
              </p>
            </div>
          </div>
        </header>

        <div className="p-8 max-w-5xl mx-auto w-full">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Settings Nav */}
            <div className="w-full md:w-64 space-y-2">
              <button
                onClick={() => setActiveTab("profile")}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all text-left",
                  activeTab === "profile"
                    ? "bg-brand text-ink-950"
                    : "text-zinc-400 hover:text-ink-100 hover:bg-ink-800",
                )}
              >
                <User className="h-4 w-4" />
                My Profile
              </button>
              <button
                onClick={() => setActiveTab("security")}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all text-left",
                  activeTab === "security"
                    ? "bg-brand text-ink-950"
                    : "text-zinc-400 hover:text-ink-100 hover:bg-ink-800",
                )}
              >
                <Shield className="h-4 w-4" />
                Security
              </button>

              <div className="pt-8 mt-8 border-t border-hair">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-400 hover:bg-red-400/10 transition-colors text-left"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 space-y-6">
              {activeTab === "profile" && (
                <GlassCard className="p-8 animate-slide-up">
                  <h2 className="font-display text-xl font-medium mb-6">Profile Details</h2>

                  <div className="space-y-6">
                    <div className="flex items-center gap-6">
                      <div className="h-24 w-24 border border-hair p-px">
                        <div className="h-full w-full bg-ink-850 flex items-center justify-center font-display text-3xl font-medium">
                          {user?.name.charAt(0).toUpperCase()}
                        </div>
                      </div>
                      <div>
                        <button className="px-4 py-2 border border-hair hover:bg-ink-800 text-sm font-medium transition-colors">
                          Change Avatar
                        </button>
                        <p className="text-xs text-zinc-500 mt-2">
                          Recommended size 400x400px
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-6 max-w-lg">
                      <div className="space-y-2">
                        <label
                          htmlFor="display-name"
                          className="text-sm font-medium text-zinc-300"
                        >
                          Display Name
                        </label>
                        <div className="flex gap-3">
                          <input
                            id="display-name"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            className="flex-1 bg-ink-900 border border-ink-700 px-4 py-2.5 text-ink-100 focus:outline-none focus:border-brand transition-colors"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label
                          htmlFor="email"
                          className="text-sm font-medium text-zinc-300"
                        >
                          Email Address
                        </label>
                        <input
                          id="email"
                          disabled
                          value={user?.email || ""}
                          className="w-full bg-ink-900 border border-hair px-4 py-2.5 text-zinc-500 cursor-not-allowed"
                        />
                      </div>
                    </div>

                    <div className="pt-6 border-t border-hair flex justify-end">
                      <button
                        onClick={handleUpdateProfile}
                        disabled={saving || user?.name === displayName}
                        className="px-6 py-2.5 bg-brand text-ink-950 font-medium hover:bg-brand-dim disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {saving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Save Changes"
                        )}
                      </button>
                    </div>
                  </div>
                </GlassCard>
              )}

              {activeTab === "security" && (
                <div className="space-y-6 animate-slide-up">
                  <GlassCard className="p-8">
                    <h2 className="font-display text-xl font-medium mb-6">
                      Password & Security
                    </h2>
                    <form
                      onSubmit={handleChangePassword}
                      className="space-y-5 max-w-lg"
                    >
                      <div className="space-y-2">
                        <label
                          htmlFor="current-password"
                          className="text-sm font-medium text-zinc-300"
                        >
                          Current Password
                        </label>
                        <input
                          id="current-password"
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="w-full bg-ink-900 border border-ink-700 px-4 py-2.5 text-ink-100 focus:outline-none focus:border-brand transition-colors"
                          placeholder="Enter current password"
                        />
                      </div>
                      <div className="space-y-2">
                        <label
                          htmlFor="new-password"
                          className="text-sm font-medium text-zinc-300"
                        >
                          New Password
                        </label>
                        <input
                          id="new-password"
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full bg-ink-900 border border-ink-700 px-4 py-2.5 text-ink-100 focus:outline-none focus:border-brand transition-colors"
                          placeholder="Minimum 6 characters"
                        />
                      </div>

                      {passwordMsg && (
                        <p
                          className={cn(
                            "text-sm",
                            passwordMsg.includes("Error")
                              ? "text-red-400"
                              : "text-green-400",
                          )}
                        >
                          {passwordMsg}
                        </p>
                      )}

                      <div className="pt-4 flex justify-end">
                        <button
                          type="submit"
                          className="px-6 py-2.5 bg-brand text-ink-950 font-medium hover:bg-brand-dim transition-colors"
                        >
                          Update Password
                        </button>
                      </div>
                    </form>
                  </GlassCard>

                  <div className="p-6 border border-red-500/20 bg-ink-850">
                    <h3 className="font-display text-lg font-medium text-red-500 flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-5 w-5" /> Danger Zone
                    </h3>
                    <p className="text-zinc-400 text-sm mb-4">
                      Once you delete your account, there is no going back.
                      Please be certain.
                    </p>
                    <button
                      onClick={handleDeleteAccount}
                      className="px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors text-sm font-medium"
                    >
                      Delete Account
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
