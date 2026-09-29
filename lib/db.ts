/**
 * Die Datenbank-Schnittstelle fuer die Oberflaeche.
 *
 * PGlite (Postgres als WebAssembly) laeuft in einem Web Worker
 * (lib/db.worker.ts). Kein Server, kein Backend, keine Anfrage verlaesst das
 * Geraet. Diese Datei schickt nur Auftraege hin und wartet auf Antworten.
 *
 * Der Worker ist der Grund, warum eine endlose Query den Tab nicht mehr
 * einfriert: Laeuft Nutzer-SQL laenger als ZEITLIMIT_MS, oder drueckt jemand
 * "Abbrechen", wird der Worker beendet und beim naechsten Auftrag frisch
 * gestartet. Den Datenstand der Aufgaben baut er dann einfach neu auf.
 * Im freien Modus gehen dabei die eigenen Aenderungen verloren - das sagt
 * die Oberflaeche dazu.
 */

import type { Antwort, Auftrag, Slot } from './db-protokoll';
import { pruefeTransaktionsfrei, type RohErgebnis } from './db-kern';
import type { QueryResult } from './compare';
import type { SchemaTabelle } from '@/components/SchemaPanel';

export type { Slot } from './db-protokoll';
export { TransaktionsFehler, ZEILEN_GRENZE, type RohErgebnis } from './db-kern';

/** So lange darf eine einzelne Eingabe laufen, bevor sie abgebrochen wird. */
export const ZEITLIMIT_MS = 10_000;

/** Verweist auf einen Datenstand im Worker. Die Instanz selbst liegt dort. */
export type DbHandle = { slot: Slot; level: number };

export type AbbruchGrund = 'zeitlimit' | 'abgebrochen' | 'absturz';

export class AbbruchFehler extends Error {
  constructor(public grund: AbbruchGrund) {
    super(
      grund === 'zeitlimit'
        ? `Die Abfrage lief länger als ${ZEITLIMIT_MS / 1000} Sekunden und wurde abgebrochen. ` +
            'Vielleicht fehlt eine JOIN-Bedingung, oder es entstehen sehr viele Zeilen.'
        : grund === 'abgebrochen'
          ? 'Die Abfrage wurde abgebrochen.'
          : 'Die Datenbank ist abgestürzt, vermutlich war der Speicher voll. Sie wurde neu gestartet.',
    );
    this.name = 'AbbruchFehler';
  }
}

// ═════════════════════════════════════════════════════════ Worker ══

type OhneId<T> = T extends unknown ? Omit<T, 'id'> : never;

type Offen = {
  auftrag: Auftrag;
  erfuellen: (wert: unknown) => void;
  ablehnen: (fehler: Error) => void;
  /** true, sobald Nutzer-SQL laeuft (Antwort 'start'). */
  gestartet: boolean;
  uhr?: ReturnType<typeof setTimeout>;
};

let worker: Worker | null = null;
const offen = new Map<number, Offen>();
let naechsteId = 1;

function holeWorker(): Worker {
  if (worker) return worker;
  const w = new Worker(new URL('./db.worker.ts', import.meta.url), { type: 'module' });
  w.onmessage = (e: MessageEvent<Antwort>) => {
    const a = e.data;
    const o = offen.get(a.id);
    if (!o) return;
    if (a.art === 'start') {
      o.gestartet = true;
      o.uhr = setTimeout(() => neustart('zeitlimit'), ZEITLIMIT_MS);
      return;
    }
    clearTimeout(o.uhr);
    offen.delete(a.id);
    if (a.art === 'ok') {
      o.erfuellen(a.wert);
    } else {
      const f = new Error(a.meldung);
      f.name = a.name;
      o.ablehnen(f);
    }
  };
  w.onerror = (e) => {
    e.preventDefault();
    neustart('absturz');
  };
  worker = w;
  return w;
}

/**
 * Beendet den Worker. Abgelehnt wird der Auftrag, dessen Nutzer-SQL gerade
 * lief. Was nur in der Warteschlange stand (etwa das Schema fuers Panel),
 * geht an den neuen Worker - daran war nichts falsch.
 *
 * Laeuft noch gar kein Nutzer-SQL (die Datenbank wird noch gebaut), trifft
 * ein Abbrechen alles, was offen ist. Sonst taete der Knopf nichts.
 */
function neustart(grund: AbbruchGrund) {
  worker?.terminate();
  worker = null;

  const alle = [...offen.values()];
  const laufend = alle.filter((o) => o.gestartet);
  const opfer = laufend.length ? laufend : alle;
  for (const o of opfer) {
    clearTimeout(o.uhr);
    offen.delete(o.auftrag.id);
    o.ablehnen(new AbbruchFehler(grund));
  }

  if (offen.size) {
    const w = holeWorker();
    for (const o of offen.values()) w.postMessage(o.auftrag);
  }
}

function schicke<T>(ohneId: OhneId<Auftrag>): Promise<T> {
  const auftrag = { ...ohneId, id: naechsteId++ } as Auftrag;
  return new Promise<T>((erfuellen, ablehnen) => {
    offen.set(auftrag.id, {
      auftrag,
      erfuellen: erfuellen as (wert: unknown) => void,
      ablehnen,
      gestartet: false,
    });
    holeWorker().postMessage(auftrag);
  });
}

/** Bricht die laufende Eingabe ab. Tut nichts, wenn nichts laeuft. */
export function abbrechen() {
  if (offen.size) neustart('abgebrochen');
}

// ═════════════════════════════════════════════════════ Schnittstelle ══

/** Sorgt dafuer, dass der Datenstand der Stufe gebaut ist. */
export async function dbFuerLevel(level: number, slot: Slot = 'uebung'): Promise<DbHandle> {
  await schicke({ art: 'bereit', slot, level });
  return { slot, level };
}

/** Erzwingt einen Neuaufbau - der Reset-Knopf im freien Modus. */
export async function dbZuruecksetzen(level: number, slot: Slot = 'uebung'): Promise<DbHandle> {
  await schicke({ art: 'neu', slot, level });
  return { slot, level };
}

/**
 * Fuehrt SQL aus und macht anschliessend garantiert ein ROLLBACK.
 * Damit kann keine Eingabe den Datenstand fuer die naechste Pruefung
 * veraendern - auch kein UPDATE, DELETE oder DROP.
 */
export function fuehreAus(db: DbHandle, sql: string): Promise<RohErgebnis> {
  // Schon hier pruefen, damit der TransaktionsFehler als solcher ankommt
  // (ueber die Worker-Grenze reist nur Name und Text eines Fehlers).
  pruefeTransaktionsfrei(sql);
  return schicke({ art: 'abfrage', slot: db.slot, level: db.level, sql });
}

/**
 * Fuer Aufgaben vom Typ 'zustand': erst die Anweisungen ausfuehren, dann
 * innerhalb derselben Transaktion den entstandenen Zustand auslesen und
 * alles zurueckrollen. Zurueck kommt nur der Zustand.
 */
export function fuehreAusUndLiesZustand(
  db: DbHandle,
  sql: string,
  pruefung: string,
): Promise<QueryResult> {
  pruefeTransaktionsfrei(sql);
  return schicke({ art: 'zustand', slot: db.slot, level: db.level, sql, pruefung });
}

/** Fuer den freien Modus: Aenderungen bleiben bestehen. */
export function fuehreAusOhneRollback(db: DbHandle, sql: string): Promise<RohErgebnis> {
  return schicke({ art: 'frei', slot: db.slot, level: db.level, sql });
}

/** Liest das aktuelle Schema aus dem Katalog, statt es fest zu verdrahten. */
export function schemaLesen(db: DbHandle): Promise<SchemaTabelle[]> {
  return schicke({ art: 'schema', slot: db.slot, level: db.level });
}

/** Die Ueberschrift ueber einer Fehlermeldung, je nach Art des Fehlers. */
export function fehlerKopf(f: unknown): string {
  if (f instanceof AbbruchFehler) return 'Abgebrochen.';
  if ((f as Error)?.name === 'TransaktionsFehler') {
    return 'Diese Anweisung ist in den Aufgaben gesperrt.';
  }
  return 'Postgres nimmt die Query nicht an.';
}
