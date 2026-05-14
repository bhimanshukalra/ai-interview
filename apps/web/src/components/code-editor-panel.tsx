'use client';

import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import type { OnChange } from '@monaco-editor/react';

export type CodeEditorLanguage = 'typescript' | 'javascript' | 'python' | 'sql';

type CodeEditorPanelProps = {
  initialCode?: string;
  initialLanguage?: CodeEditorLanguage;
  onCodeChange?: (code: string, language: CodeEditorLanguage) => void;
};

type LanguageOption = {
  label: string;
  value: CodeEditorLanguage;
};

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
});

const languageOptions: LanguageOption[] = [
  { label: 'TypeScript', value: 'typescript' },
  { label: 'JavaScript', value: 'javascript' },
  { label: 'Python', value: 'python' },
  { label: 'SQL', value: 'sql' },
];

const monacoLanguageByEditorLanguage = {
  typescript: 'typescript',
  javascript: 'javascript',
  python: 'python',
  sql: 'sql',
} satisfies Record<CodeEditorLanguage, string>;

const starterCode: Record<CodeEditorLanguage, string> = {
  typescript: `type Candidate = {
  name: string;
  score: number;
};

function rankCandidates(candidates: Candidate[]): Candidate[] {
  return [...candidates].sort((left, right) => right.score - left.score);
}
`,
  javascript: `function rankCandidates(candidates) {
  return [...candidates].sort((left, right) => right.score - left.score);
}
`,
  python: `def rank_candidates(candidates):
    return sorted(candidates, key=lambda candidate: candidate["score"], reverse=True)
`,
  sql: `select
  candidate_id,
  avg(score) as average_score
from interview_scores
group by candidate_id
order by average_score desc;
`,
};

const selectClass =
  'min-h-10 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-800 outline-none transition focus:border-teal-700 focus:ring-4 focus:ring-teal-700/15';
const secondaryButtonClass =
  'min-h-10 rounded-lg border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-50';

export function CodeEditorPanel({
  initialCode = '',
  initialLanguage = 'typescript',
  onCodeChange,
}: CodeEditorPanelProps): React.ReactElement {
  const [language, setLanguage] = useState<CodeEditorLanguage>(initialLanguage);
  const [code, setCode] = useState(initialCode);
  const lineCount = useMemo(() => getLineCount(code), [code]);

  function updateCode(nextCode: string, nextLanguage = language): void {
    setCode(nextCode);
    onCodeChange?.(nextCode, nextLanguage);
  }

  function updateLanguage(nextLanguage: CodeEditorLanguage): void {
    setLanguage(nextLanguage);
    onCodeChange?.(code, nextLanguage);
  }

  function useStarterCode(): void {
    updateCode(starterCode[language]);
  }

  function resetEditor(): void {
    updateCode('');
  }

  const handleEditorChange: OnChange = (value) => {
    updateCode(value ?? '');
  };

  return (
    <section className="w-full rounded-lg border border-stone-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-stone-200 p-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-teal-700">Live coding</p>
          <h2 className="mt-1 text-xl font-bold text-stone-950">Code editor</h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="code-editor-language">
            Language
          </label>
          <select
            className={selectClass}
            id="code-editor-language"
            value={language}
            onChange={(event) => updateLanguage(event.target.value as CodeEditorLanguage)}
          >
            {languageOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button className={secondaryButtonClass} type="button" onClick={useStarterCode}>
            Starter
          </button>
          <button className={secondaryButtonClass} type="button" onClick={resetEditor}>
            Reset
          </button>
        </div>
      </div>

      <div className="p-4">
        <div className="overflow-hidden rounded-lg border border-stone-300 bg-stone-950">
          <MonacoEditor
            height="420px"
            language={monacoLanguageByEditorLanguage[language]}
            loading={<EditorLoadingState />}
            options={{
              automaticLayout: true,
              fontSize: 14,
              minimap: { enabled: false },
              padding: { top: 16 },
              scrollBeyondLastLine: false,
              tabSize: 2,
              wordWrap: 'on',
            }}
            theme="vs-dark"
            value={code}
            onChange={handleEditorChange}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 px-4 py-3 text-sm text-stone-600">
        <p>{lineCount} lines</p>
        <p>Local draft</p>
      </div>
    </section>
  );
}

function EditorLoadingState(): React.ReactElement {
  return (
    <div className="flex min-h-80 items-center justify-center bg-stone-950 px-4 py-8 text-sm font-medium text-stone-300">
      Loading editor...
    </div>
  );
}

function getLineCount(value: string): number {
  if (value.length === 0) {
    return 1;
  }

  return value.split('\n').length;
}
