/**
 * Fortschritt liegt im localStorage - kein Konto, keine Datenbank, kein Server.
 * Wenn ihr spaeter Accounts wollt, ist das hier die Stelle, die getauscht wird.
 */

const SCHLUESSEL_GELOEST = 'sql-pruefstand:geloest';
const SCHLUESSEL_ENTWURF = 'sql-pruefstand:entwurf';

function lies<T>(schluessel: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const roh = window.localStorage.getItem(schluessel);
    return roh ? (JSON.parse(roh) as T) : fallback;
  } catch {
    return fallback;
  }
}

function schreib(schluessel: string, wert: unknown) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(schluessel, JSON.stringify(wert));
  } catch {
    /* privater Modus oder Speicher voll - Fortschritt ist nicht kritisch */
  }
}

export const ladeGeloest = (): string[] => lies<string[]>(SCHLUESSEL_GELOEST, []);
export const speichereGeloest = (ids: string[]) => schreib(SCHLUESSEL_GELOEST, ids);

export const ladeEntwuerfe = (): Record<string, string> =>
  lies<Record<string, string>>(SCHLUESSEL_ENTWURF, {});
export const speichereEntwuerfe = (e: Record<string, string>) =>
  schreib(SCHLUESSEL_ENTWURF, e);

export function alleszuruecksetzen() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(SCHLUESSEL_GELOEST);
  window.localStorage.removeItem(SCHLUESSEL_ENTWURF);
}
