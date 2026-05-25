'use client';

import { useEffect, useMemo } from 'react';
import { Awareness } from 'y-protocols/awareness.js';
import * as Y from 'yjs';

export function useYjsCodeDocument(): {
  awareness: Awareness;
  doc: Y.Doc;
  text: Y.Text;
} {
  const doc = useMemo(() => new Y.Doc(), []);
  const text = useMemo(() => doc.getText('code'), [doc]);
  const awareness = useMemo(() => new Awareness(doc), [doc]);

  useEffect(() => {
    return function cleanupYjsCodeDocument() {
      awareness.destroy();
      doc.destroy();
    };
  }, [awareness, doc]);

  return { awareness, doc, text };
}
