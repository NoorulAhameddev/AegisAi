export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-black text-white">
      <div className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h1 className="mb-6 text-center text-2xl font-semibold">
          Create Account
        </h1>

        <input
          type="text"
          placeholder="Name"
          className="mb-4 w-full rounded bg-black px-4 py-2 text-white outline-none ring-1 ring-zinc-700 focus:ring-white"
        />

        <input
          type="email"
          placeholder="Email"
          className="mb-4 w-full rounded bg-black px-4 py-2 text-white outline-none ring-1 ring-zinc-700 focus:ring-white"
        />

        <input
          type="password"
          placeholder="Password"
          className="mb-6 w-full rounded bg-black px-4 py-2 text-white outline-none ring-1 ring-zinc-700 focus:ring-white"
        />

        <button className="w-full rounded bg-white py-2 font-medium text-black hover:bg-zinc-200">
          Register
        </button>
      </div>
    </main>
  );
}
