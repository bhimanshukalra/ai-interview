"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type React from "react";
import {
  CreateInterviewSchema,
  type CreateInterviewInput,
  type CreateInterviewResponse,
} from "@ai-interview/shared";
import { useCreateInterview } from "@/features/interviews/use-create-interview";
import { z } from "zod";

type FormState = {
  role: string;
  level: CreateInterviewInput["level"];
  type: CreateInterviewInput["type"];
  topic: string;
  questionCount: number;
};

type FormSubmitEvent = Parameters<NonNullable<React.ComponentProps<"form">["onSubmit"]>>[0];

type SetupFormFieldsProps = {
  form: FormState;
  preview: string[];
  onUpdateField: <Key extends keyof FormState>(field: Key, value: FormState[Key]) => void;
};

type SetupErrorStateProps = {
  submitError: string | null;
  validationErrors: string[];
};

type InterviewCreatedStateProps = {
  interview: CreateInterviewResponse;
};

const initialForm: FormState = {
  role: "Frontend Engineer",
  level: "junior",
  type: "technical",
  topic: "React",
  questionCount: 5,
};

function formatIssue(issue: z.ZodIssue) {
  const field = issue.path.join(".") || "form";
  return `${field}: ${issue.message}`;
}

export function InterviewSetupForm(): React.ReactElement {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialForm);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const {
    error: submitError,
    interview: createdInterview,
    isPending,
    create,
  } = useCreateInterview();

  const preview = useMemo(() => {
    const topic = form.topic.trim();

    return [
      form.role || "Role not set",
      form.level,
      form.type,
      topic || "general",
      `${form.questionCount} questions`,
    ];
  }, [form]);

  function updateField<Key extends keyof FormState>(
    field: Key,
    value: FormState[Key],
  ): void {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormSubmitEvent): Promise<void> {
    event.preventDefault();

    const result = CreateInterviewSchema.safeParse({
      ...form,
      role: form.role.trim(),
      topic: form.topic.trim() || undefined,
    });

    if (!result.success) {
      setValidationErrors(result.error.issues.map(formatIssue));
      return;
    }

    setValidationErrors([]);
    const interview = await create(result.data);

    router.push(`/interviews/${interview.id}`);
  }

  return (
    <section className="w-full max-w-3xl rounded-lg border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="max-w-2xl">
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-teal-700">
          MVP setup
        </p>
        <h1 className="text-4xl font-bold leading-tight text-stone-950 sm:text-5xl">
          Create an interview
        </h1>
        <p className="mt-4 text-lg leading-8 text-stone-600">
          Choose the interview shape. Submitting creates a mock interview
          session for you to practice with.
        </p>
      </div>

      <form className="mt-7 grid gap-5 sm:grid-cols-2" onSubmit={handleSubmit}>
        <SetupFormFields form={form} preview={preview} onUpdateField={updateField} />

        <SetupErrorState submitError={submitError} validationErrors={validationErrors} />

        {createdInterview ? <InterviewCreatedState interview={createdInterview} /> : null}

        <button
          className="min-h-12 cursor-pointer rounded-lg bg-teal-700 px-4 py-3 font-bold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-stone-400 sm:col-span-2"
          disabled={isPending}
          type="submit"
        >
          {isPending ? "Creating interview..." : "Create interview"}
        </button>
      </form>
    </section>
  );
}

const fieldClass = "grid gap-2";
const labelClass = "text-sm font-semibold text-stone-600";
const inputClass =
  "min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-950 outline-none transition focus:border-teal-700 focus:ring-4 focus:ring-teal-700/15";

function SetupFormFields({ form, preview, onUpdateField }: SetupFormFieldsProps): React.ReactElement {
  return (
    <>
      <label className={`${fieldClass} sm:col-span-2`}>
        <span className={labelClass}>Role</span>
        <input
          className={inputClass}
          value={form.role}
          onChange={(event) => onUpdateField("role", event.target.value)}
          placeholder="Frontend Engineer"
        />
      </label>

      <label className={fieldClass}>
        <span className={labelClass}>Level</span>
        <select
          className={inputClass}
          value={form.level}
          onChange={(event) => onUpdateField("level", event.target.value as FormState["level"])}
        >
          <option value="intern">Intern</option>
          <option value="junior">Junior</option>
          <option value="mid">Mid</option>
          <option value="senior">Senior</option>
        </select>
      </label>

      <label className={fieldClass}>
        <span className={labelClass}>Interview type</span>
        <select
          className={inputClass}
          value={form.type}
          onChange={(event) => onUpdateField("type", event.target.value as FormState["type"])}
        >
          <option value="technical">Technical</option>
          <option value="behavioral">Behavioral</option>
          <option value="system-design">System design</option>
          <option value="mixed">Mixed</option>
        </select>
      </label>

      <label className={fieldClass}>
        <span className={labelClass}>Topic</span>
        <input
          className={inputClass}
          value={form.topic}
          onChange={(event) => onUpdateField("topic", event.target.value)}
          placeholder="React"
        />
      </label>

      <label className={fieldClass}>
        <span className={labelClass}>Questions</span>
        <input
          className={inputClass}
          type="number"
          min={3}
          max={10}
          value={form.questionCount}
          onChange={(event) => onUpdateField("questionCount", Number(event.target.value))}
        />
      </label>

      <div className="flex flex-wrap gap-2 sm:col-span-2" aria-label="Interview preview">
        {preview.map((item) => (
          <span key={item} className="rounded-full border border-stone-200 px-3 py-2 text-sm text-stone-700">
            {item}
          </span>
        ))}
      </div>
    </>
  );
}

function SetupErrorState({ submitError, validationErrors }: SetupErrorStateProps): React.ReactElement | null {
  if (validationErrors.length === 0 && !submitError) {
    return null;
  }

  return (
    <div className="grid gap-3 sm:col-span-2">
      {validationErrors.length > 0 ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
          {validationErrors.map((error) => (
            <p key={error}>{error}</p>
          ))}
        </div>
      ) : null}

      {submitError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
          <p>{submitError}</p>
        </div>
      ) : null}
    </div>
  );
}

function InterviewCreatedState({ interview }: InterviewCreatedStateProps): React.ReactElement {
  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 sm:col-span-2" role="status">
      <p className="font-semibold">Interview created.</p>
      <dl className="mt-3 grid gap-2 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-semibold uppercase text-emerald-800">Session</dt>
          <dd className="break-all">{interview.id}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase text-emerald-800">Questions</dt>
          <dd>{interview.questions.length}</dd>
        </div>
      </dl>
      <ol className="mt-4 grid gap-2">
        {interview.questions.map((question) => (
          <li key={question.id}>{question.question}</li>
        ))}
      </ol>
    </div>
  );
}
