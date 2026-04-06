import { useState } from "react";
import { FirebaseError } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { getFirebaseAuth } from "../lib/firebase";

type Mode = "signin" | "signup" | "reset";

function authErrorMessage(code: string): string {
  if (code === "auth/invalid-email") return "Invalid email address.";
  if (code === "auth/user-disabled") return "This account has been disabled.";
  if (code === "auth/user-not-found") return "No account found for that email.";
  if (code === "auth/wrong-password") return "Incorrect password.";
  if (code === "auth/invalid-credential") return "Invalid email or password.";
  if (code === "auth/email-already-in-use") return "That email is already registered.";
  if (code === "auth/weak-password") return "Password should be at least 6 characters.";
  if (code === "auth/popup-closed-by-user") return "Sign-in was cancelled.";
  if (code === "auth/account-exists-with-different-credential") {
    return "An account already exists with this email using a different sign-in method.";
  }
  return "Sign-in failed. Try again.";
}

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const auth = getFirebaseAuth();

  const runEmailSignIn = async () => {
    if (!auth) return;
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (e) {
      setError(e instanceof FirebaseError ? authErrorMessage(e.code) : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  };

  const runEmailSignUp = async () => {
    if (!auth) return;
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      await createUserWithEmailAndPassword(auth, email.trim(), password);
    } catch (e) {
      setError(e instanceof FirebaseError ? authErrorMessage(e.code) : "Could not create account.");
    } finally {
      setBusy(false);
    }
  };

  const runGoogle = async () => {
    if (!auth) return;
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (e) {
      setError(e instanceof FirebaseError ? authErrorMessage(e.code) : "Google sign-in failed.");
    } finally {
      setBusy(false);
    }
  };

  const runPasswordReset = async () => {
    if (!auth) return;
    setError(null);
    setMessage(null);
    const to = email.trim();
    if (!to) {
      setError("Enter your email address.");
      return;
    }
    setBusy(true);
    try {
      await sendPasswordResetEmail(auth, to);
      setMessage("Check your inbox for a reset link.");
    } catch (e) {
      setError(e instanceof FirebaseError ? authErrorMessage(e.code) : "Could not send reset email.");
    } finally {
      setBusy(false);
    }
  };

  if (!auth) {
    return (
      <div className="min-h-dvh bg-zinc-950 text-zinc-100 flex items-center justify-center p-6">
        <p className="text-amber-300 text-sm text-center leading-relaxed">
          Firebase is not configured. Add your web app keys to <code className="text-emerald-400">.env</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Can I cut it?</h1>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Sign in to check private land tree rules in Victoria (indicative only).
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-4">
          {mode !== "reset" ? (
            <div className="flex rounded-xl border border-zinc-700 p-0.5 bg-zinc-950/80">
              <button
                type="button"
                onClick={() => {
                  setMode("signin");
                  setError(null);
                  setMessage(null);
                }}
                className={`flex-1 rounded-lg py-2 text-sm font-medium ${
                  mode === "signin" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setError(null);
                  setMessage(null);
                }}
                className={`flex-1 rounded-lg py-2 text-sm font-medium ${
                  mode === "signup" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Create account
              </button>
            </div>
          ) : null}

          <label className="block space-y-2">
            <span className="text-sm text-zinc-300">Email</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-3 text-base outline-none focus:border-emerald-500"
            />
          </label>

          {mode !== "reset" ? (
            <label className="block space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-zinc-300">Password</span>
                <label className="flex items-center gap-2 text-xs text-zinc-500 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showPassword}
                    onChange={(e) => setShowPassword(e.target.checked)}
                    className="rounded border-zinc-600"
                  />
                  Show password
                </label>
              </div>
              <input
                type={showPassword ? "text" : "password"}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-3 text-base outline-none focus:border-emerald-500"
              />
            </label>
          ) : null}

          {mode === "signin" ? (
            <button
              type="button"
              onClick={() => void runEmailSignIn()}
              disabled={busy}
              className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-base font-medium text-white disabled:opacity-50"
            >
              {busy ? "Signing in…" : "Sign in with email"}
            </button>
          ) : null}

          {mode === "signup" ? (
            <button
              type="button"
              onClick={() => void runEmailSignUp()}
              disabled={busy}
              className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-base font-medium text-white disabled:opacity-50"
            >
              {busy ? "Creating…" : "Create account"}
            </button>
          ) : null}

          {mode === "reset" ? (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => void runPasswordReset()}
                disabled={busy}
                className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-base font-medium text-white disabled:opacity-50"
              >
                {busy ? "Sending…" : "Send reset link"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("signin");
                  setError(null);
                  setMessage(null);
                }}
                className="w-full text-sm text-zinc-400 hover:text-zinc-200"
              >
                Back to sign in
              </button>
            </div>
          ) : null}

          {mode !== "reset" ? (
            <>
              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-zinc-800" />
                </div>
                <div className="relative flex justify-center text-xs uppercase tracking-wide">
                  <span className="bg-zinc-900/40 px-2 text-zinc-500">or</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void runGoogle()}
                disabled={busy}
                className="w-full rounded-xl border border-zinc-600 bg-zinc-950 px-4 py-3 text-base font-medium text-zinc-100 hover:bg-zinc-900 disabled:opacity-50"
              >
                Continue with Google
              </button>
              {mode === "signin" ? (
                <button
                  type="button"
                  onClick={() => {
                    setMode("reset");
                    setError(null);
                    setMessage(null);
                  }}
                  className="w-full text-sm text-zinc-400 hover:text-emerald-400/90"
                >
                  Forgot password?
                </button>
              ) : null}
            </>
          ) : null}

          {error ? (
            <p className="text-sm text-rose-300 leading-relaxed" role="alert">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="text-sm text-emerald-400/90 leading-relaxed" role="status">
              {message}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
