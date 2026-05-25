'use client';

import dynamic from 'next/dynamic';
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState, type ForwardedRef } from 'react';
import type { OnMount } from '@monaco-editor/react';
import type { editor as MonacoEditor } from 'monaco-editor';
import type { MonacoBinding } from 'y-monaco';
import type { CodeEditorLanguage } from '@ai-interview/shared';
import { useYjsCodeDocument } from './use-yjs-code-document';
import { useCodeRoomSocket } from './use-code-room-socket';
import { ParticipantsList } from './participants-list';
import { CODE_ROOM_COLORS, DEFAULT_CODE_LANGUAGE } from './constants';

type CollaborativeCodeEditorProps = {
  initialLanguage?: CodeEditorLanguage;
  interviewId: string;
  onCodeChange: (code: string, language: CodeEditorLanguage) => void;
  questionId: string;
  readOnly?: boolean;
};

export type CollaborativeCodeEditorHandle = {
  getCurrentCodeDraft: () => {
    code: string;
    language: CodeEditorLanguage;
  };
};

const MonacoEditorComponent = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
});

const monacoLanguageByEditorLanguage = {
  typescript: 'typescript',
  javascript: 'javascript',
  python: 'python',
  sql: 'sql',
} satisfies Record<CodeEditorLanguage, string>;

const connectionLabel = {
  connected: 'Connected',
  connecting: 'Connecting',
  disconnected: 'Disconnected',
  reconnecting: 'Reconnecting',
};

const syncLabel = {
  idle: 'Idle',
  synced: 'Synced',
  syncing: 'Syncing',
};

export const CollaborativeCodeEditor = forwardRef<CollaborativeCodeEditorHandle, CollaborativeCodeEditorProps>(
  CollaborativeCodeEditorComponent,
);

function CollaborativeCodeEditorComponent({
  initialLanguage = DEFAULT_CODE_LANGUAGE,
  interviewId,
  onCodeChange,
  questionId,
  readOnly = false,
}: CollaborativeCodeEditorProps, ref: ForwardedRef<CollaborativeCodeEditorHandle>): React.ReactElement {
  const { awareness, doc, text } = useYjsCodeDocument();
  const bindingRef = useRef<MonacoBinding | null>(null);
  const onCodeChangeRef = useRef(onCodeChange);
  const [language, setLanguage] = useState<CodeEditorLanguage>(initialLanguage);
  const [code, setCode] = useState('');
  const { access, connectionState, errorMessage, participants, syncState } = useCodeRoomSocket({
    awareness,
    doc,
    interviewId,
    onLanguageChange: setLanguage,
    questionId,
  });
  const lineCount = useMemo(() => getLineCount(code), [code]);
  const isEditorReadOnly =
    readOnly || access?.canEdit === false || connectionState === 'disconnected' || connectionState === 'reconnecting';

  useImperativeHandle(ref, function createCollaborativeCodeEditorHandle() {
    return {
      getCurrentCodeDraft() {
        return {
          code: text.toString(),
          language,
        };
      },
    };
  }, [language, text]);

  useEffect(() => {
    onCodeChangeRef.current = onCodeChange;
  }, [onCodeChange]);

  useEffect(() => {
    awareness.setLocalStateField('user', {
      color: CODE_ROOM_COLORS.localCollaborator,
      name: 'You',
    });
  }, [awareness]);

  useEffect(() => {
    function syncCodeDraft(): void {
      const nextCode = text.toString();
      setCode(nextCode);
      onCodeChangeRef.current(nextCode, language);
    }

    text.observe(syncCodeDraft);
    syncCodeDraft();

    return function cleanupCodeObserver() {
      text.unobserve(syncCodeDraft);
    };
  }, [language, text]);

  async function bindEditor(editor: MonacoEditor.IStandaloneCodeEditor): Promise<void> {
    const model = editor.getModel();

    if (!model) {
      return;
    }

    const { MonacoBinding: ImportedMonacoBinding } = await import('y-monaco');
    bindingRef.current = new ImportedMonacoBinding(text, model, new Set([editor]), awareness);
  }

  const handleEditorMount: OnMount = (editor) => {
    void bindEditor(editor);
  };

  useEffect(() => {
    return function cleanupMonacoBinding() {
      bindingRef.current?.destroy();
      bindingRef.current = null;
    };
  }, []);

  return (
    <section className="w-full rounded-lg border border-stone-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-stone-200 p-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-teal-700">Live coding</p>
          <h2 className="mt-1 text-xl font-bold text-stone-950">Collaborative code editor</h2>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <StatusPill label={connectionLabel[connectionState]} />
          <StatusPill label={syncLabel[syncState]} />
          <StatusPill label={languageLabel(language)} />
          {access ? <StatusPill label={access.canEdit ? 'Can edit' : 'View only'} /> : null}
        </div>
      </div>

      <div className="border-b border-stone-200 px-4 py-3">
        <ParticipantsList participants={participants} />
      </div>

      <div className="p-4">
        <div className="overflow-hidden rounded-lg border border-stone-300 bg-stone-950">
          <MonacoEditorComponent
            height="420px"
            language={monacoLanguageByEditorLanguage[language]}
            loading={<EditorLoadingState />}
            options={{
              automaticLayout: true,
              fontSize: 14,
              minimap: { enabled: false },
              padding: { top: 16 },
              readOnly: isEditorReadOnly,
              scrollBeyondLastLine: false,
              tabSize: 2,
              wordWrap: 'on',
            }}
            theme="vs-dark"
            onMount={handleEditorMount}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 px-4 py-3 text-sm text-stone-600">
        <p>{lineCount} lines</p>
        <p>Shared room</p>
      </div>

      {errorMessage ? (
        <p className="border-t border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{errorMessage}</p>
      ) : null}
    </section>
  );
}

function StatusPill({ label }: { label: string }): React.ReactElement {
  return (
    <span className="rounded-full border border-stone-200 px-3 py-1 font-semibold text-stone-700">{label}</span>
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

function languageLabel(language: CodeEditorLanguage): string {
  return language === 'sql' ? 'SQL' : language.charAt(0).toUpperCase() + language.slice(1);
}
