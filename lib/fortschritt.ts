/**
 * Fortschritt liegt im localStorage - kein Konto, keine Datenbank, kein Server.
 * Wenn ihr spaeter Accounts wollt, ist das hier die Stelle, die getauscht wird.
 */

const K_GELOEST = 'sql-pruefstand:geloest';
const K_ENTWURF = 'sql-pruefstand:entwurf';
const K_GELESEN = 'sql-pruefstand:gelesen';

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

export const ladeGeloest = () => lies<string[]>(K_GELOEST, []);
export const speichereGeloest = (ids: string[]) => schreib(K_GELOEST, ids);

export const ladeEntwuerfe = () => lies<Record<string, string>>(K_ENTWURF, {});
export const speichereEntwuerfe = (e: Record<string, string>) => schreib(K_ENTWURF, e);

/** Stufen, deren Lektion einmal bis zum Ende durchgeklickt wurde. */
export const ladeGelesen = () => lies<number[]>(K_GELESEN, []);
export const speichereGelesen = (level: number[]) => schreib(K_GELESEN, level);

export function allesZuruecksetzen() {
  if (typeof window === 'undefined') return;
  for (const k of [K_GELOEST, K_ENTWURF, K_GELESEN]) {
    window.localStorage.removeItem(k);
  }
}
