/**
 * Fortschritt liegt im localStorage - kein Konto, keine Datenbank, kein Server.
 * Wenn ihr spaeter Accounts wollt, ist das hier die Stelle, die getauscht wird.
 */

const K_GELOEST = 'sql-pruefstand:geloest';
// v4: Schema ist jetzt englisch. Alte Entwuerfe mit deutschen Spaltennamen
// wuerden nicht mehr laufen, deshalb neuer Schluessel. Geloeste Aufgaben
// bleiben erhalten - die haengen nur an der Aufgaben-id.
const K_ENTWURF = 'sql-pruefstand:entwurf:v4';
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

// ═══════════════════════════════════════════ V7: Sichern und einlesen ══

/**
 * Der localStorage ist weg, sobald jemand "Websitedaten löschen" antippt -
 * und er gilt nur fuer diesen einen Browser auf diesem einen Geraet.
 * Deshalb eine Datei zum Mitnehmen.
 */
export type Sicherung = {
  format: 'sql-pruefstand';
  version: 1;
  erstellt: string;
  geloest: string[];
  entwuerfe: Record<string, string>;
  gelesen: number[];
};

export function standLesen(): Sicherung {
  return {
    format: 'sql-pruefstand',
    version: 1,
    erstellt: new Date().toISOString(),
    geloest: ladeGeloest(),
    entwuerfe: ladeEntwuerfe(),
    gelesen: ladeGelesen(),
  };
}

export type EinlesErgebnis =
  | { ok: true; geloestDazu: number; entwuerfeDazu: number }
  | { ok: false; fehler: string };

/**
 * Liest eine Sicherung ein und fuehrt sie mit dem vorhandenen Stand
 * ZUSAMMEN, statt ihn zu ersetzen: Geloeste Aufgaben werden vereinigt,
 * Entwuerfe aus der Datei gewinnen bei Gleichstand. So kann man zwei Geraete
 * zusammenfuehren, ohne auf einem davon etwas zu verlieren.
 */
export function standEinlesen(roh: string): EinlesErgebnis {
  let daten: unknown;
  try {
    daten = JSON.parse(roh);
  } catch {
    return { ok: false, fehler: 'Das ist keine gültige JSON-Datei.' };
  }

  const s = daten as Partial<Sicherung>;
  if (!s || typeof s !== 'object' || s.format !== 'sql-pruefstand') {
    return { ok: false, fehler: 'Diese Datei stammt nicht aus dem SQL-Prüfstand.' };
  }
  if (s.version !== 1) {
    return { ok: false, fehler: `Unbekannte Version: ${String(s.version)}.` };
  }

  const geloestNeu = Array.isArray(s.geloest)
    ? s.geloest.filter((x): x is string => typeof x === 'string')
    : [];
  const gelesenNeu = Array.isArray(s.gelesen)
    ? s.gelesen.filter((x): x is number => typeof x === 'number')
    : [];
  const entwuerfeNeu: Record<string, string> = {};
  if (s.entwuerfe && typeof s.entwuerfe === 'object') {
    for (const [k, v] of Object.entries(s.entwuerfe)) {
      if (typeof v === 'string') entwuerfeNeu[k] = v;
    }
  }

  const geloestAlt = ladeGeloest();
  const gelesenAlt = ladeGelesen();
  const entwuerfeAlt = ladeEntwuerfe();

  const geloestDazu = geloestNeu.filter((id) => !geloestAlt.includes(id));
  const entwuerfeDazu = Object.keys(entwuerfeNeu).filter(
    (id) => entwuerfeAlt[id] !== entwuerfeNeu[id],
  );

  speichereGeloest([...geloestAlt, ...geloestDazu]);
  speichereGelesen([...new Set([...gelesenAlt, ...gelesenNeu])]);
  speichereEntwuerfe({ ...entwuerfeAlt, ...entwuerfeNeu });

  return {
    ok: true,
    geloestDazu: geloestDazu.length,
    entwuerfeDazu: entwuerfeDazu.length,
  };
}

/** Loest den Download der Sicherungsdatei aus. */
export function sicherungHerunterladen() {
  if (typeof window === 'undefined') return;
  const stand = standLesen();
  const datum = stand.erstellt.slice(0, 10);
  const blob = new Blob([JSON.stringify(stand, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sql-pruefstand-${datum}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Erst freigeben, wenn der Browser den Download angestoßen hat.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
