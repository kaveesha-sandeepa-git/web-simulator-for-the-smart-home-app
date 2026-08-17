"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { useRouter } from "next/navigation";
import { getFirebaseApp } from "../firebase";

type AuthMode = "signin" | "signup";

function readableAuthError(error: unknown) {
  const code = (error as { code?: string }).code;

  switch (code) {
    case "auth/invalid-credential":
      return "The email or password is incorrect.";
    case "auth/email-already-in-use":
      return "An account already exists for this email.";
    case "auth/weak-password":
      return "Use a password with at least 6 characters.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/operation-not-allowed":
      return "Enable Email/Password authentication in Firebase Console.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a moment and try again.";
    default:
      return (error as { message?: string }).message ?? "Authentication failed. Please try again.";
  }
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(getAuth(getFirebaseApp()), (user) => {
      if (user) router.replace("/");
    });
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (mode === "signup" && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);

    try {
      const auth = getAuth(getFirebaseApp());
      if (mode === "signup") {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
      router.replace("/");
    } catch (authError) {
      setError(readableAuthError(authError));
    } finally {
      setSubmitting(false);
    }
  }

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError("");
    setConfirmPassword("");
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#05070d] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(0,212,255,0.18),transparent_30%),radial-gradient(circle_at_82%_76%,rgba(255,183,3,0.14),transparent_32%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:44px_44px]" />

      <div className="relative mx-auto grid min-h-screen max-w-6xl items-center gap-12 px-6 py-12 lg:grid-cols-[1.05fr_0.95fr] lg:px-10">
        <section>
          <div className="inline-flex items-center gap-3 rounded-full border border-cyan-300/20 bg-cyan-300/8 px-4 py-2 text-xs uppercase tracking-[0.28em] text-cyan-100">
            <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_14px_rgba(103,232,249,0.9)]" />
            Secure home access
          </div>
          <h1 className="mt-7 max-w-xl text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            Your home, <span className="text-cyan-300">connected</span> and protected.
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-slate-400 sm:text-lg">
            Sign in to view live room states, connected hardware, safety alerts, and power usage from Firebase.
          </p>

          <div className="mt-10 grid max-w-lg gap-3 sm:grid-cols-3">
            {["Realtime sync", "Protected data", "Live monitoring"].map((label, index) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
                <span className={`block h-2.5 w-2.5 rounded-full ${index === 1 ? "bg-amber-300" : "bg-cyan-300"}`} />
                <p className="mt-4 text-sm font-medium text-slate-200">{label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-slate-950/75 p-6 shadow-[0_28px_90px_rgba(0,0,0,0.55)] backdrop-blur-2xl sm:p-9">
          <div className="flex rounded-xl border border-white/10 bg-black/25 p-1">
            {(["signin", "signup"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => changeMode(item)}
                className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                  mode === item ? "bg-cyan-300 text-slate-950 shadow-[0_0_20px_rgba(103,232,249,0.25)]" : "text-slate-400 hover:text-white"
                }`}
              >
                {item === "signin" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          <div className="mt-8">
            <p className="text-xs uppercase tracking-[0.28em] text-cyan-300">Firebase authentication</p>
            <h2 className="mt-3 text-3xl font-semibold">{mode === "signin" ? "Welcome back" : "Join your smart home"}</h2>
            <p className="mt-2 text-sm text-slate-400">
              {mode === "signin" ? "Enter your credentials to open the dashboard." : "Create credentials for protected dashboard access."}
            </p>
          </div>

          <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-2 block text-sm text-slate-300">Email address</span>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/60 focus:ring-4 focus:ring-cyan-300/10"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm text-slate-300">Password</span>
              <input
                type="password"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                required
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/60 focus:ring-4 focus:ring-cyan-300/10"
              />
            </label>

            {mode === "signup" ? (
              <label className="block">
                <span className="mb-2 block text-sm text-slate-300">Confirm password</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Repeat your password"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/60 focus:ring-4 focus:ring-cyan-300/10"
                />
              </label>
            ) : null}

            {error ? (
              <div role="alert" className="rounded-xl border border-rose-300/25 bg-rose-300/10 px-4 py-3 text-sm text-rose-100">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-gradient-to-r from-cyan-300 to-sky-400 px-4 py-3.5 font-semibold text-slate-950 shadow-[0_0_28px_rgba(56,189,248,0.25)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Connecting..." : mode === "signin" ? "Open dashboard" : "Create account"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs leading-5 text-slate-500">
            Access is secured through Firebase Authentication and your Realtime Database rules.
          </p>
        </section>
      </div>
    </main>
  );
}
