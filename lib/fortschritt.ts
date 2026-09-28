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
// v7.1
const K_LOG = 'sql-pruefstand:pruefungslog';

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

// ═══════════════════════════════════════════ V7.1: Pruefungslog ══

/**
 * Was von einem Pruefungsdurchgang uebrig bleibt.
 *
 * Bewusst NUR das Ergebnis, nicht die eingegebenen Queries. Nicht wegen des
 * Speichers - ein Durchgang kostet als Ergebnis rund ein Kilobyte, mit den
 * Antworten vielleicht fuenf, gegen ein Limit von mehreren Megabyte. Sondern
 * weil ein Log zum Ueberfliegen da ist: Was saß, was nicht, und wo es immer
 * wieder hakt. Alte Queries beantworten diese Frage nicht.
 *
 * Soll spaeter doch die Antwort mit rein, kommt ein Feld in `AufgabenStand`
 * dazu - der Rest bleibt, wie er ist.
 */
export type AufgabenStand = {
  /** Aufgaben-id, damit Titel und Stufe jederzeit nachgeschlagen werden koennen. */
  id: string;
  level: number;
  stand: 'korrekt' | 'falsch' | 'leer';
  /** Nur bei 'falsch': die Urteilsmeldung, etwa "Richtige Daten, falsche Sortierung." */
  meldung?: string;
};

export type PruefungsLauf = {
  /** Zeitstempel in Millisekunden als Text - dient zugleich als id. */
  id: string;
  erstellt: string;
  /** Bearbeitungsdauer in Sekunden. */
  dauer: number;
  konfig: {
    anzahl: number;
    vonLevel: number;
    bisLevel: number;
    /** null = ohne Zeitlimit gelaufen. */
    minuten: number | null;
  };
  ergebnisse: AufgabenStand[];
};

/** Aeltere Durchgaenge fallen hinten raus. */
export const LOG_MAX = 25;

/** Neueste zuerst. */
export function ladeLog(): PruefungsLauf[] {
  const roh = lies<PruefungsLauf[]>(K_LOG, []);
  if (!Array.isArray(roh)) return [];
  return roh
    .filter((l) => l && typeof l.id === 'string' && Array.isArray(l.ergebnisse))
    .sort((a, b) => (a.erstellt < b.erstellt ? 1 : -1));
}

export function speichereLauf(lauf: PruefungsLauf) {
  const alt = ladeLog().filter((l) => l.id !== lauf.id);
  schreib(K_LOG, [lauf, ...alt].slice(0, LOG_MAX));
}

export function logLeeren() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(K_LOG);
  } catch {
    /* siehe oben */
  }
}

/**
 * Wie oft eine Stufe ueber alle Durchgaenge hinweg danebenging.
 * Nicht bearbeitete Aufgaben zaehlen mit - wer nicht hinkam, konnte es
 * in dem Moment auch nicht.
 */
export function schwacheStufen(log: PruefungsLauf[]): { level: number; daneben: number }[] {
  const zaehler = new Map<number, number>();
  for (const lauf of log) {
    for (const e of lauf.ergebnisse) {
      if (e.stand === 'korrekt') continue;
      zaehler.set(e.level, (zaehler.get(e.level) ?? 0) + 1);
    }
  }
  return [...zaehler.entries()]
    .map(([level, daneben]) => ({ level, daneben }))
    .sort((a, b) => b.daneben - a.daneben || a.level - b.level);
}

export function allesZuruecksetzen() {
  if (typeof window === 'undefined') return;
  for (const k of [K_GELOEST, K_ENTWURF, K_GELESEN, K_LOG]) {
    window.localStorage.removeItem(k);
  }
}

// ═══════════════════════════════════════════ V7: Sichern und einlesen ══

/**
 * Der localStorage ist weg, sobald jemand "Websitedaten löschen" antippt -
 * und er gilt nur fuer diesen einen Browser auf diesem einen Geraet.
 * Deshalb eine Datei zum Mitnehmen.
 *
 * Version 2 (v7.1) fuehrt `log` ein. Dateien aus Version 1 lassen sich
 * weiterhin einlesen, sie haben dann eben keinen Log dabei.
 */
export type Sicherung = {
  format: 'sql-pruefstand';
  version: 1 | 2;
  erstellt: string;
  geloest: string[];
  entwuerfe: Record<string, string>;
  gelesen: number[];
  log?: PruefungsLauf[];
};

export function standLesen(): Sicherung {
  return {
    format: 'sql-pruefstand',
    version: 2,
    erstellt: new Date().toISOString(),
    geloest: ladeGeloest(),
    entwuerfe: ladeEntwuerfe(),
    gelesen: ladeGelesen(),
    log: ladeLog(),
  };
}

export type EinlesErgebnis =
  | { ok: true; geloestDazu: number; entwuerfeDazu: number; laeufeDazu: number }
  | { ok: false; fehler: string };

/**
 * Liest eine Sicherung ein und fuehrt sie mit dem vorhandenen Stand
 * ZUSAMMEN, statt ihn zu ersetzen: Geloeste Aufgaben werden vereinigt,
 * Entwuerfe aus der Datei gewinnen bei Gleichstand, Durchgaenge werden
 * ueber ihre id zusammengelegt. So kann man zwei Geraete zusammenfuehren,
 * ohne auf einem davon etwas zu verlieren.
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
  if (s.version !== 1 && s.version !== 2) {
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
  const logNeu = Array.isArray(s.log)
    ? s.log.filter(
        (l): l is PruefungsLauf =>
          !!l && typeof l.id === 'string' && Array.isArray(l.ergebnisse),
      )
    : [];

  const geloestAlt = ladeGeloest();
  const gelesenAlt = ladeGelesen();
  const entwuerfeAlt = ladeEntwuerfe();
  const logAlt = ladeLog();

  const geloestDazu = geloestNeu.filter((id) => !geloestAlt.includes(id));
  const entwuerfeDazu = Object.keys(entwuerfeNeu).filter(
    (id) => entwuerfeAlt[id] !== entwuerfeNeu[id],
  );
  const bekannt = new Set(logAlt.map((l) => l.id));
  const laeufeDazu = logNeu.filter((l) => !bekannt.has(l.id));

  speichereGeloest([...geloestAlt, ...geloestDazu]);
  speichereGelesen([...new Set([...gelesenAlt, ...gelesenNeu])]);
  speichereEntwuerfe({ ...entwuerfeAlt, ...entwuerfeNeu });
  if (laeufeDazu.length) {
    schreib(
      K_LOG,
      [...logAlt, ...laeufeDazu]
        .sort((a, b) => (a.erstellt < b.erstellt ? 1 : -1))
        .slice(0, LOG_MAX),
    );
  }

  return {
    ok: true,
    geloestDazu: geloestDazu.length,
    entwuerfeDazu: entwuerfeDazu.length,
    laeufeDazu: laeufeDazu.length,
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
