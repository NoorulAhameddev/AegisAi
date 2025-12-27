"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
    const router = useRouter();
    const [form, setForm] = useState({ email: "", password: "" });
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
        });

        if (res.ok) {
            router.push("/dashboard");
        } else {
            const data = await res.json();
            setError(data.error || "Login failed");
        }
    };

    return (
        <main className="flex min-h-screen items-center justify-center bg-black text-white">
            <div className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900 p-6">
                <h1 className="mb-6 text-center text-2xl font-semibold">Login</h1>

                {error && <p className="mb-4 text-center text-sm text-red-500">{error}</p>}

                <form onSubmit={handleSubmit}>
                    <input
                        type="email"
                        placeholder="Email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="mb-4 w-full rounded bg-black px-4 py-2 text-white outline-none ring-1 ring-zinc-700 focus:ring-white"
                    />

                    <input
                        type="password"
                        placeholder="Password"
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        className="mb-6 w-full rounded bg-black px-4 py-2 text-white outline-none ring-1 ring-zinc-700 focus:ring-white"
                    />

                    <button className="w-full rounded bg-white py-2 font-medium text-black hover:bg-zinc-200">
                        Login
                    </button>
                </form>

                <p className="mt-4 text-center text-sm text-zinc-400">
                    Don't have an account?{" "}
                    <Link href="/register" className="text-white hover:underline">
                        Register
                    </Link>
                </p>
            </div>
        </main>
    );
}
