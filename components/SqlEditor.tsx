'use client';

import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import { PostgreSQL, sql } from '@codemirror/lang-sql';
import { EditorView, keymap } from '@codemirror/view';
import { Prec } from '@codemirror/state';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';

const CodeMirror = dynamic(() => import('@uiw/react-codemirror'), {
  ssr: false,
  loading: () => <div className="editor-platzhalter">Editor wird geladen …</div>,
});

/**
 * Warum das hier so aussieht: Bis V3 standen die Farben als CSS-Klassen
 * (.tok-keyword) in einem Theme. Die greifen aber nur, wenn CodeMirror mit
 * dem classHighlighter arbeitet - tut es standardmaessig nicht. Stattdessen
 * lief das eingebaute Farbschema fuer HELLEN Hintergrund, daher das dunkle
 * Lila auf dunklem Grund.
 *
 * Jetzt: eigenes HighlightStyle, direkt als Extension. Alle Farben sind auf
 * #1e2a26 (Editorhintergrund) auf Kontrast von mindestens 4.5:1 gewaehlt.
 */
const farben = HighlightStyle.define([
  { tag: [t.keyword, t.operatorKeyword, t.modifier], color: '#f0c24a', fontWeight: '500' },
  { tag: [t.string, t.special(t.string)], color: '#9ee0b3' },
  { tag: [t.number, t.integer, t.float], color: '#a9d4f5' },
  { tag: [t.bool, t.null, t.atom], color: '#f2a58e' },
  { tag: [t.typeName, t.standard(t.name)], color: '#d4b8ff' },
  { tag: [t.function(t.name), t.function(t.variableName)], color: '#7fd4d0' },
  { tag: [t.comment, t.lineComment, t.blockComment], color: '#8ea398', fontStyle: 'italic' },
  { tag: [t.operator, t.punctuation, t.separator, t.bracket], color: '#cfd8d1' },
  { tag: [t.name, t.variableName, t.propertyName], color: '#e6eae5' },
]);

const rahmen = EditorView.theme(
  {
    '&': { color: '#e6eae5', backgroundColor: 'transparent' },
    '.cm-content': { caretColor: '#f0c24a', padding: '12px 0' },
    '.cm-line': { padding: '0 14px' },
    '&.cm-focused .cm-cursor': { borderLeftColor: '#f0c24a', borderLeftWidth: '2px' },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': {
      backgroundColor: '#3a4f47',
    },
    '.cm-gutters': {
      backgroundColor: '#1e2a26',
      color: '#8ea398',
      borderRight: '1px solid #33453e',
    },
    '.cm-activeLine': { backgroundColor: 'rgba(255,255,255,0.03)' },
    '.cm-activeLineGutter': { backgroundColor: 'rgba(255,255,255,0.03)', color: '#cfd8d1' },
    '.cm-matchingBracket': { backgroundColor: '#3a4f47', outline: '1px solid #5b7369' },
    '.cm-tooltip': {
      backgroundColor: '#26352f',
      border: '1px solid #435a51',
      color: '#e6eae5',
    },
    '.cm-tooltip-autocomplete ul li[aria-selected]': {
      backgroundColor: '#3a4f47',
      color: '#f0c24a',
    },
  },
  { dark: true },
);

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
      rahmen,
      syntaxHighlighting(farben),
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
        // 'none' schaltet das eingebaute helle Theme samt Farbschema ab.
        theme="none"
        height="180px"
        basicSetup={{
          lineNumbers: true,
          foldGutter: false,
          highlightActiveLine: true,
          autocompletion: true,
          bracketMatching: true,
          closeBrackets: true,
          highlightSelectionMatches: false,
          // Das eingebaute Farbschema wuerde sonst als Rueckfallebene greifen.
          syntaxHighlighting: false,
        }}
      />
    </div>
  );
}
