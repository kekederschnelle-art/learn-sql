'use client';

import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import { PostgreSQL, sql } from '@codemirror/lang-sql';
import { EditorView, keymap } from '@codemirror/view';
import { Prec } from '@codemirror/state';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import type { SchemaTabelle } from './SchemaPanel';

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
 *
 * V8: Die Farben stehen als CSS-Variablen in app/globals.css, einmal fuer
 * das dunkle und einmal fuer das helle Schema. CodeMirror schreibt die
 * Werte nur in sein Stylesheet, var() funktioniert dort wie ueberall.
 */
const farben = HighlightStyle.define([
  {
    tag: [t.keyword, t.operatorKeyword, t.modifier],
    color: 'var(--code-schluesselwort)',
    fontWeight: '500',
  },
  { tag: [t.string, t.special(t.string)], color: 'var(--code-text)' },
  { tag: [t.number, t.integer, t.float], color: 'var(--code-zahl)' },
  { tag: [t.bool, t.null, t.atom], color: 'var(--code-wert)' },
  { tag: [t.typeName, t.standard(t.name)], color: 'var(--code-typ)' },
  { tag: [t.function(t.name), t.function(t.variableName)], color: 'var(--code-funktion)' },
  {
    tag: [t.comment, t.lineComment, t.blockComment],
    color: 'var(--code-kommentar)',
    fontStyle: 'italic',
  },
  { tag: [t.operator, t.punctuation, t.separator, t.bracket], color: 'var(--code-zeichen)' },
  { tag: [t.name, t.variableName, t.propertyName], color: 'var(--code-name)' },
]);

/**
 * V6: Markierung sichtbar gemacht.
 *
 * Bis V5 stand hier '&.cm-focused .cm-selectionBackground' mit #3a4f47.
 * Zwei Probleme: Das Grau-Gruen war kaum vom Hintergrund zu unterscheiden,
 * und im fokussierten Editor griff es gar nicht - CodeMirrors eigenes
 * Dunkel-Theme hat dafuer einen spezifischeren Selektor
 * ('&dark.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground')
 * und setzte #233, also praktisch unsichtbar.
 *
 * Jetzt: exakt derselbe Selektor (gewinnt, weil unser Theme spaeter kommt)
 * und ein Blau, das sich klar vom Gruen abhebt. Text darauf bleibt lesbar.
 */
const MARKIERUNG = 'var(--code-markierung)';
const MARKIERUNG_UNFOKUSSIERT = 'var(--code-markierung-leise)';

const rahmen = EditorView.theme(
  {
    '&': { color: 'var(--code-name)', backgroundColor: 'transparent' },
    '.cm-content': { caretColor: 'var(--code-cursor)', padding: '12px 0' },
    '.cm-line': { padding: '0 14px' },
    '&.cm-focused .cm-cursor': { borderLeftColor: 'var(--code-cursor)', borderLeftWidth: '2px' },
    '& > .cm-scroller > .cm-selectionLayer .cm-selectionBackground': {
      background: MARKIERUNG_UNFOKUSSIERT,
    },
    '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground': {
      background: MARKIERUNG,
    },
    '.cm-content ::selection': { backgroundColor: MARKIERUNG },
    '.cm-gutters': {
      backgroundColor: 'var(--flaeche)',
      color: 'var(--code-kommentar)',
      borderRight: '1px solid var(--kante)',
    },
    // Die aktive Zeile liegt UEBER der Markierung. Deshalb nur ein Hauch,
    // sonst schluckt sie die Markierung in der Zeile, in der der Cursor steht.
    '.cm-activeLine': { backgroundColor: 'var(--code-zeile)' },
    '.cm-activeLineGutter': { backgroundColor: 'var(--code-zeile)', color: 'var(--code-zeichen)' },
    '.cm-matchingBracket': {
      backgroundColor: 'var(--code-klammer)',
      outline: '1px solid var(--code-klammer-kante)',
    },
    '.cm-tooltip': {
      backgroundColor: 'var(--flaeche-hoch)',
      border: '1px solid var(--kante-hell)',
      color: 'var(--code-name)',
    },
    '.cm-tooltip-autocomplete ul li[aria-selected]': {
      backgroundColor: 'var(--code-klammer)',
      color: 'var(--code-schluesselwort)',
    },
  },
  { dark: true },
);

type Props = {
  wert: string;
  onChange: (wert: string) => void;
  /** Cmd/Strg + Enter fuehrt aus, ohne dass man zur Maus greifen muss. */
  onAusfuehren: () => void;
  /** Optional: Cmd/Strg + Shift + Enter - ausfuehren ohne zu pruefen. */
  onNurAusfuehren?: () => void;
  /**
   * V7: Der aktuelle Datenstand. Ohne das kennt die Autovervollstaendigung
   * nur SQL-Schluesselwoerter; mit ihm auch Tabellen- und Spaltennamen,
   * inklusive "c." -> Spalten der Tabelle hinter dem Alias.
   */
  schema?: SchemaTabelle[];
  /** Hoehe des Editors. Laengere Queries brauchen mehr Platz. */
  hoehe?: string;
  /** Wird vorgelesen, wenn der Editor den Fokus bekommt. */
  beschriftung?: string;
};

export default function SqlEditor({
  wert,
  onChange,
  onAusfuehren,
  onNurAusfuehren,
  schema,
  hoehe = '180px',
  beschriftung = 'SQL-Eingabe',
}: Props) {
  // Die Extensions duerfen sich nicht bei jedem Tastendruck neu aufbauen.
  // Deshalb haengt der Memo an einer stabilen Kurzform des Schemas, nicht
  // am Array selbst (das kommt bei jedem Render neu aus dem State).
  const schemaSchluessel = useMemo(
    () =>
      (schema ?? [])
        .map((t) => `${t.name}:${t.spalten.map((s) => s.spalte).join(',')}`)
        .join('|'),
    [schema],
  );

  const extensions = useMemo(
    () => {
      const tabellen: Record<string, string[]> = {};
      for (const eintrag of schemaSchluessel ? schemaSchluessel.split('|') : []) {
        const [name, spalten] = eintrag.split(':');
        if (name) tabellen[name] = spalten ? spalten.split(',') : [];
      }

      const tasten = [
        {
          key: 'Mod-Enter',
          preventDefault: true,
          run: () => {
            onAusfuehren();
            return true;
          },
        },
      ];
      if (onNurAusfuehren) {
        tasten.push({
          key: 'Mod-Shift-Enter',
          preventDefault: true,
          run: () => {
            onNurAusfuehren();
            return true;
          },
        });
      }

      return [
        sql({
          dialect: PostgreSQL,
          upperCaseKeywords: false,
          // Leeres Objekt statt undefined waere ein Unterschied: Mit einem
          // leeren Schema schlaegt CodeMirror gar keine Namen mehr vor.
          ...(Object.keys(tabellen).length ? { schema: tabellen } : {}),
        }),
        rahmen,
        syntaxHighlighting(farben),
        EditorView.lineWrapping,
        Prec.highest(keymap.of(tasten)),
        // Das Eingabefeld von CodeMirror ist ein contenteditable ohne Namen.
        // Screenreader sagten bisher nur "Textfeld".
        EditorView.contentAttributes.of({
          'aria-label': `${beschriftung}. Strg und Enter führt aus.`,
          'aria-multiline': 'true',
        }),
      ];
    },
    [onAusfuehren, onNurAusfuehren, schemaSchluessel, beschriftung],
  );

  return (
    <div className="editor-rahmen">
      <CodeMirror
        value={wert}
        onChange={onChange}
        extensions={extensions}
        // 'none' schaltet das eingebaute helle Theme samt Farbschema ab.
        theme="none"
        height={hoehe}
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
