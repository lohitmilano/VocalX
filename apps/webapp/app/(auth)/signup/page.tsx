import Link from "next/link";

export default function SignupPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl">
        <h1 className="text-2xl font-semibold">Create account</h1>
        <p className="mt-2 text-sm text-slate-400">
          For now, signup is handled via OAuth providers.
        </p>

        <div className="mt-6 space-y-3">
          <a
            className="block w-full rounded-xl bg-white/10 px-4 py-3 text-center text-sm font-medium hover:bg-white/15"
            href="/api/auth/signin"
          >
            Continue with OAuth
          </a>
        </div>

        <p className="mt-6 text-sm text-slate-400">
          Already have an account?{" "}
          <Link className="text-brand-500 hover:underline" href="/login">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}


