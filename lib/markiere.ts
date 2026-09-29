/**
 * Sehr kleine Auszeichnung fuer Lehrtexte: `code` und **fett**.
 * Die Texte stammen ausschliesslich aus dem Repo (lib/lektionen.ts,
 * lib/spickzettel.ts) - es fliesst nichts hinein, was ein Nutzer eingeben
 * koennte. Trotzdem wird vorher escaped.
 */
export function markiere(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return escaped
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}
