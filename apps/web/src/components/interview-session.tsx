'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import type { CreateInterviewResponse, InterviewAnswer } from '@ai-interview/shared';
import { getFriendlyApiErrorMessage } from '@/lib/api/errors';
import { useEvaluateInterview } from '@/features/interviews/use-evaluate-interview';
import { useSubmitAnswer } from '@/features/interviews/use-submit-answer';

type InterviewSessionProps = {
  interview: CreateInterviewResponse;
  savedAnswers: InterviewAnswer[];
};

export function InterviewSession({ interview, savedAnswers }: InterviewSessionProps) {
  const router = useRouter();
  const evaluateInterview = useEvaluateInterview();
  const submitAnswer = useSubmitAnswer();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>(() =>
    Object.fromEntries(savedAnswers.map((answer) => [answer.questionId, answer.answer])),
  );

  const currentQuestion = interview.questions[currentIndex];
  const isComplete = currentIndex >= interview.questions.length;
  const answeredCount = useMemo(
    () => Object.values(answers).filter((answer) => answer.trim().length > 0).length,
    [answers]
  );
  const isReportReady = answeredCount === interview.questions.length;

  async function saveCurrentAnswer() {
    const answer = answers[currentQuestion.id]?.trim();

    if (!answer) {
      return false;
    }

    await submitAnswer.mutateAsync({
      interviewId: interview.id,
      input: {
        questionId: currentQuestion.id,
        answer,
      },
    });

    return true;
  }

  async function goToNextQuestion() {
    const didSave = await saveCurrentAnswer();

    if (didSave) {
      setCurrentIndex((index) => index + 1);
    }
  }

  async function generateReport() {
    try {
      await evaluateInterview.mutateAsync(interview.id);
      router.push(`/interviews/${interview.id}/report`);
    } catch {
      // React Query exposes the error state for the UI.
    }
  }

  function restartInterview() {
    setCurrentIndex(0);
  }

  if (isComplete) {
    return (
      <section className="w-full max-w-3xl rounded-lg border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-teal-700">Interview complete</p>
        <h1 className="text-4xl font-bold leading-tight text-stone-950">Nice work</h1>
        <p className="mt-4 text-lg leading-8 text-stone-600">
          You answered {answeredCount} of {interview.questions.length} questions. Once every answer is saved, this MVP
          can evaluate them and turn them into a feedback report.
        </p>
        <div className="mt-7 grid gap-4">
          {interview.questions.map((question, index) => (
            <article key={question.id} className="rounded-lg border border-stone-200 p-4">
              <p className="text-sm font-semibold text-stone-500">Question {index + 1}</p>
              <h2 className="mt-1 font-semibold text-stone-950">{question.title}</h2>
              <p className="mt-2 text-sm leading-6 text-stone-700">{answers[question.id] || 'No answer submitted.'}</p>
            </article>
          ))}
        </div>
        <div className="mt-7 flex flex-wrap gap-3">
          <button
            className="min-h-11 rounded-lg bg-teal-700 px-4 py-2 font-bold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-stone-400"
            disabled={!isReportReady || evaluateInterview.isPending}
            type="button"
            onClick={() => void generateReport()}
          >
            {evaluateInterview.isPending ? 'Generating report...' : 'Generate report'}
          </button>
          <button
            className="min-h-11 rounded-lg border border-stone-300 px-4 py-2 font-semibold text-stone-700 transition hover:bg-stone-50"
            type="button"
            onClick={restartInterview}
          >
            Restart interview
          </button>
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-stone-300 px-4 py-2 font-semibold text-stone-700 transition hover:bg-stone-50"
            href="/"
          >
            Back to setup
          </Link>
        </div>
        {!isReportReady ? (
          <p className="mt-3 text-sm font-medium text-stone-600">
            Answer all questions before generating a report.
          </p>
        ) : null}
        {evaluateInterview.isError ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {getFriendlyApiErrorMessage(evaluateInterview.error, 'Could not generate the report.')}
          </p>
        ) : null}
      </section>
    );
  }

  return (
    <section className="w-full max-w-3xl rounded-lg border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-teal-700">Interview session</p>
          <h1 className="text-3xl font-bold leading-tight text-stone-950">{interview.input.role}</h1>
          <p className="mt-2 text-stone-600">
            {interview.input.level} · {interview.input.type}
            {interview.input.topic ? ` · ${interview.input.topic}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <p className="rounded-full border border-stone-200 px-3 py-2 text-sm font-semibold text-stone-700">
            Question {currentIndex + 1} / {interview.questions.length}
          </p>
          <p className="rounded-full border border-stone-200 px-3 py-2 text-sm font-semibold text-stone-700">
            {answeredCount} of {interview.questions.length} answered
          </p>
        </div>
      </div>

      <div className="mt-8">
        <div className="h-2 overflow-hidden rounded-full bg-stone-100">
          <div
            className="h-full rounded-full bg-teal-700 transition-all"
            style={{ width: `${((currentIndex + 1) / interview.questions.length) * 100}%` }}
          />
        </div>
      </div>

      <article className="mt-8 rounded-lg border border-stone-200 p-5">
        <p className="text-sm font-semibold text-stone-500">{currentQuestion.title}</p>
        <h2 className="mt-2 text-2xl font-bold leading-snug text-stone-950">{currentQuestion.question}</h2>
      </article>

      <label className="mt-6 grid gap-2">
        <span className="text-sm font-semibold text-stone-600">Your answer</span>
        <textarea
          className="min-h-48 w-full resize-y rounded-lg border border-stone-300 bg-white px-3 py-3 text-stone-950 outline-none transition focus:border-teal-700 focus:ring-4 focus:ring-teal-700/15"
          value={answers[currentQuestion.id] ?? ''}
          onChange={(event) =>
            setAnswers((currentAnswers) => ({
              ...currentAnswers,
              [currentQuestion.id]: event.target.value
            }))
          }
          placeholder="Write your answer here..."
        />
      </label>

      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-stone-300 px-4 py-2 font-semibold text-stone-700 transition hover:bg-stone-50"
          href="/"
        >
          Back to setup
        </Link>
        <button
          className="min-h-11 rounded-lg border border-stone-300 px-4 py-2 font-semibold text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={currentIndex === 0}
          type="button"
          onClick={() => setCurrentIndex((index) => Math.max(index - 1, 0))}
        >
          Previous
        </button>
        <button
          className="min-h-11 rounded-lg bg-teal-700 px-4 py-2 font-bold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-stone-400"
          disabled={submitAnswer.isPending}
          type="button"
          onClick={() => void goToNextQuestion()}
        >
          {submitAnswer.isPending
            ? 'Saving...'
            : currentIndex === interview.questions.length - 1
              ? 'Finish interview'
              : 'Next question'}
        </button>
        <button
          className="min-h-11 rounded-lg border border-stone-300 px-4 py-2 font-semibold text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={currentIndex === 0}
          type="button"
          onClick={restartInterview}
        >
          Restart interview
        </button>
      </div>
      {submitAnswer.isError ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {getFriendlyApiErrorMessage(submitAnswer.error, 'Could not save this answer.')}
        </p>
      ) : null}
    </section>
  );
}
