'use client';

import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import { PostgreSQL, sql } from '@codemirror/lang-sql';
import { EditorView, keymap } from '@codemirror/view';
import { Prec } from '@codemirror/state';

const CodeMirror = dynamic(() => import('@uiw/react-codemirror'), {
  ssr: false,
  loading: () => (
    <div className="editor-platzhalter">Editor wird geladen …</div>
  ),
});

/** Dunkles Thema passend zur Werkstattfarbwelt, statt eines Standardthemas. */
const werkstattThema = EditorView.theme(
  {
    '&': { color: '#e6eae5', backgroundColor: 'transparent' },
    '.cm-content': { caretColor: '#e6b422', padding: '12px 0' },
    '.cm-line': { padding: '0 14px' },
    '&.cm-focused .cm-cursor': { borderLeftColor: '#e6b422' },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': {
      backgroundColor: '#33453e',
    },
    '.cm-tooltip': {
      backgroundColor: '#26352f',
      border: '1px solid #435a51',
      color: '#e6eae5',
    },
    '.cm-tooltip-autocomplete ul li[aria-selected]': {
      backgroundColor: '#33453e',
      color: '#e6b422',
    },
  },
  { dark: true },
);

const hervorhebung = EditorView.theme({
  '.tok-keyword': { color: '#e6b422' },
  '.tok-string': { color: '#8fd6a8' },
  '.tok-number': { color: '#9fc7e8' },
  '.tok-comment': { color: '#64786d', fontStyle: 'italic' },
  '.tok-operator': { color: '#cfd8d1' },
});

type Props = {
  wert: string;
  onChange: (wert: string) => void;
  /** Cmd/Strg + Enter fuehrt aus, ohne dass man zur Maus greifen muss. */
  onAusfuehren: () => void;
};

export default function SqlEditor({ wert, onChange, onAusfuehren }: Props) {
  const extensions = useMemo(
    () => [
      sql({ dialect: PostgreSQL, upperCaseKeywords: false }),
      werkstattThema,
      hervorhebung,
      EditorView.lineWrapping,
      Prec.highest(
        keymap.of([
          {
            key: 'Mod-Enter',
            preventDefault: true,
            run: () => {
              onAusfuehren();
              return true;
            },
          },
        ]),
      ),
    ],
    [onAusfuehren],
  );

  return (
    <div className="editor-rahmen">
      <CodeMirror
        value={wert}
        onChange={onChange}
        extensions={extensions}
        height="180px"
        basicSetup={{
          lineNumbers: true,
          foldGutter: false,
          highlightActiveLine: true,
          autocompletion: true,
          bracketMatching: true,
          closeBrackets: true,
          highlightSelectionMatches: false,
        }}
      />
    </div>
  );
}
