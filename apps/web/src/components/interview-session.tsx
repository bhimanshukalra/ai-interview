'use client';

import { useMemo, useState } from 'react';
import type { CreateInterviewResponse } from '@ai-interview/shared';

type InterviewSessionProps = {
  interview: CreateInterviewResponse;
};

export function InterviewSession({ interview }: InterviewSessionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const currentQuestion = interview.questions[currentIndex];
  const isComplete = currentIndex >= interview.questions.length;
  const answeredCount = useMemo(
    () => Object.values(answers).filter((answer) => answer.trim().length > 0).length,
    [answers]
  );

  if (isComplete) {
    return (
      <section className="w-full max-w-3xl rounded-lg border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-teal-700">Interview complete</p>
        <h1 className="text-4xl font-bold leading-tight text-stone-950">Nice work</h1>
        <p className="mt-4 text-lg leading-8 text-stone-600">
          You answered {answeredCount} of {interview.questions.length} questions. The next MVP step will evaluate these
          answers and turn them into a feedback report.
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
        <p className="rounded-full border border-stone-200 px-3 py-2 text-sm font-semibold text-stone-700">
          {currentIndex + 1} / {interview.questions.length}
        </p>
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
        <button
          className="min-h-11 rounded-lg border border-stone-300 px-4 py-2 font-semibold text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={currentIndex === 0}
          type="button"
          onClick={() => setCurrentIndex((index) => Math.max(index - 1, 0))}
        >
          Previous
        </button>
        <button
          className="min-h-11 rounded-lg bg-teal-700 px-4 py-2 font-bold text-white transition hover:bg-teal-800"
          type="button"
          onClick={() => setCurrentIndex((index) => index + 1)}
        >
          {currentIndex === interview.questions.length - 1 ? 'Finish interview' : 'Next question'}
        </button>
      </div>
    </section>
  );
}
