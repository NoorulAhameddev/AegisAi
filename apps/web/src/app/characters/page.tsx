"use client";

import { useEffect, useState } from "react";
import { Menu, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { CharacterManager } from "@/components/characters/CharacterManager";

type AppUser = {
  id: string;
  name: string;
  email: string;
};

export default function CharactersPage() {
  const router = useRouter();
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => {
        if (res.status === 401) router.push("/login");
        return res.json();
      })
      .then((data) => {
        if (data?.id) setUser(data);
      })
      .catch(() => {
        router.push("/login");
      })
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-zinc-500">
        Loading characters...
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
        <header className="px-8 py-6 flex items-center justify-between gap-4 border-b border-hair bg-ink-900 sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileNavOpen(true)}
              className="md:hidden p-2 -ml-2 text-zinc-400 hover:text-ink-100 transition-colors"
              aria-label="Open navigation"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div>
              <h1 className="font-display text-2xl font-medium tracking-tight">Characters</h1>
              <p className="text-zinc-400 text-sm">
                Create and manage AI personas for your chats.
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-zinc-400">
            <Users className="h-4 w-4" />
            Presets
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto w-full">
          <CharacterManager />
        </div>
      </main>
    </div>
  );
}
