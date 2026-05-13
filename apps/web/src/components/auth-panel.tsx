"use client";

import { useEffect, useState } from "react";
import type React from "react";
import { LoginSchema, RegisterSchema, type AuthUser } from "@ai-interview/shared";
import { getCurrentUser, login, register } from "@/features/auth/api";
import { LoadingPanel } from "@/components/loading-panel";
import {
  getStoredApiAuthorizationToken,
  setApiAuthorizationToken,
} from "@/lib/api/client";
import { getFriendlyApiErrorMessage } from "@/lib/api/errors";

type AuthMode = "login" | "register";

type AuthPanelProps = {
  children: React.ReactNode;
};

const initialForm = {
  name: "",
  email: "",
  password: "",
};

export function AuthPanel({ children }: AuthPanelProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [form, setForm] = useState(initialForm);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      if (!getStoredApiAuthorizationToken()) {
        setIsCheckingSession(false);
        return;
      }

      try {
        const currentUser = await getCurrentUser();

        if (isMounted) {
          setUser(currentUser);
        }
      } catch {
        setApiAuthorizationToken(null);
      } finally {
        if (isMounted) {
          setIsCheckingSession(false);
        }
      }
    }

    void loadSession();

    return () => {
      isMounted = false;
    };
  }, []);

  function updateField(field: keyof typeof initialForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const result =
      mode === "register"
        ? RegisterSchema.safeParse(form)
        : LoginSchema.safeParse(form);

    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Check your auth details.");
      return;
    }

    setIsPending(true);

    try {
      const response =
        mode === "register"
          ? await register(RegisterSchema.parse(form))
          : await login(LoginSchema.parse(form));

      setApiAuthorizationToken(response.token);
      setUser(response.user);
      setForm(initialForm);
    } catch (authError) {
      setError(getFriendlyApiErrorMessage(authError, "Could not sign in."));
    } finally {
      setIsPending(false);
    }
  }

  function logout() {
    setApiAuthorizationToken(null);
    setUser(null);
  }

  const inputClass =
    "min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-950 outline-none transition focus:border-teal-700 focus:ring-4 focus:ring-teal-700/15";

  if (isCheckingSession) {
    return (
      <LoadingPanel eyebrow="Account" title="Checking session" lines={2} />
    );
  }

  if (user) {
    return (
      <div className="grid w-full max-w-3xl gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-stone-200 bg-white px-4 py-3 shadow-sm">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-teal-700">
              Signed in
            </p>
            <p className="font-semibold text-stone-950">
              {user.name} <span className="font-normal text-stone-500">{user.email}</span>
            </p>
          </div>
          <button
            className="min-h-10 rounded-lg border border-stone-300 px-3 py-2 font-semibold text-stone-700 transition hover:bg-stone-50"
            type="button"
            onClick={logout}
          >
            Sign out
          </button>
        </div>
        {children}
      </div>
    );
  }

  return (
    <section className="w-full max-w-xl rounded-lg border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
      <p className="mb-3 text-xs font-bold uppercase tracking-wide text-teal-700">
        Account
      </p>
      <h1 className="text-4xl font-bold leading-tight text-stone-950">
        {mode === "register" ? "Create your account" : "Sign in"}
      </h1>

      <form className="mt-7 grid gap-4" onSubmit={handleSubmit}>
        {mode === "register" ? (
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-stone-600">Name</span>
            <input
              className={inputClass}
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              placeholder="Ada Lovelace"
            />
          </label>
        ) : null}

        <label className="grid gap-2">
          <span className="text-sm font-semibold text-stone-600">Email</span>
          <input
            className={inputClass}
            type="email"
            value={form.email}
            onChange={(event) => updateField("email", event.target.value)}
            placeholder="you@example.com"
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-semibold text-stone-600">Password</span>
          <input
            className={inputClass}
            type="password"
            value={form.password}
            onChange={(event) => updateField("password", event.target.value)}
            placeholder="At least 8 characters"
          />
        </label>

        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </p>
        ) : null}

        <button
          className="min-h-12 rounded-lg bg-teal-700 px-4 py-3 font-bold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-stone-400"
          disabled={isPending}
          type="submit"
        >
          {isPending
            ? "Please wait..."
            : mode === "register"
              ? "Create account"
              : "Sign in"}
        </button>
      </form>

      <button
        className="mt-4 font-semibold text-teal-800 transition hover:text-teal-900"
        type="button"
        onClick={() => {
          setError(null);
          setMode((current) => (current === "login" ? "register" : "login"));
        }}
      >
        {mode === "register"
          ? "Already have an account? Sign in"
          : "Need an account? Create one"}
      </button>
    </section>
  );
}
