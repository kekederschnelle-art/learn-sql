/**
 * Web Worker, in dem PGlite laeuft.
 *
 * Warum ein Worker: PGlite rechnet synchron im WebAssembly. Auf dem
 * Haupt-Thread friert eine Query wie `select * from generate_series(1, 1e9)`
 * den ganzen Tab ein - kein Klick, kein Scrollen, kein Abbrechen. Im Worker
 * bleibt die Oberflaeche bedienbar, und lib/db.ts kann den Worker nach einem
 * Zeitlimit einfach beenden.
 *
 * Es gibt zwei getrennte Instanzen:
 *   'uebung' - fuer Lektionen und Aufgaben. Jede Ausfuehrung laeuft in einer
 *              Transaktion, die zurueckgerollt wird. Der Datenstand ist damit
 *              immer exakt der der Stufe, egal was jemand eintippt.
 *   'frei'   - fuer den freien Modus. Dort bleiben Aenderungen bestehen, bis
 *              jemand zuruecksetzt. Deshalb darf sie nicht dieselbe Instanz
 *              sein wie die der Aufgaben.
 */

import type { PGlite } from '@electric-sql/pglite';
import {
  baueDatenbank,
  fuehreAus,
  fuehreAusOhneRollback,
  fuehreAusUndLiesZustand,
  schemaLesen,
} from './db-kern';
import type { Antwort, Auftrag, Slot } from './db-protokoll';

type Eintrag = { db: PGlite; level: number };

const instanzen: Record<Slot, Eintrag | null> = { uebung: null, frei: null };

async function instanz(slot: Slot, level: number, neu = false): Promise<PGlite> {
  const da = instanzen[slot];
  if (da && da.level === level && !neu) return da.db;
  instanzen[slot] = null;
  if (da) {
    try {
      await da.db.close();
    } catch {
      /* egal - wir werfen die Instanz sowieso weg */
    }
  }
  const db = await baueDatenbank(level);
  instanzen[slot] = { db, level };
  return db;
}

function sende(antwort: Antwort) {
  (self as unknown as Worker).postMessage(antwort);
}

async function bearbeite(a: Auftrag): Promise<unknown> {
  const db = await instanz(a.slot, a.level, a.art === 'neu');

  // Ab hier laeuft Nutzer-SQL. Erst jetzt startet in lib/db.ts die Uhr -
  // das Aufbauen der Datenbank zaehlt nicht zum Zeitlimit.
  switch (a.art) {
    case 'bereit':
    case 'neu':
      return null;
    case 'schema':
      return schemaLesen(db);
    case 'abfrage':
      sende({ id: a.id, art: 'start' });
      return fuehreAus(db, a.sql);
    case 'zustand':
      sende({ id: a.id, art: 'start' });
      return fuehreAusUndLiesZustand(db, a.sql, a.pruefung);
    case 'frei':
      sende({ id: a.id, art: 'start' });
      return fuehreAusOhneRollback(db, a.sql);
  }
}

/**
 * Auftraege nacheinander abarbeiten. fuehreAus() besteht aus mehreren
 * Schritten (begin, Eingabe, rollback) - zwei davon gleichzeitig auf
 * derselben Instanz wuerden sich gegenseitig in die Transaktion schreiben.
 */
let kette: Promise<void> = Promise.resolve();

self.onmessage = (e: MessageEvent<Auftrag>) => {
  const a = e.data;
  kette = kette.then(async () => {
    try {
      sende({ id: a.id, art: 'ok', wert: await bearbeite(a) });
    } catch (f) {
      const fehler = f as Error;
      // Ein Absturz im WebAssembly selbst (etwa Speicher voll) hinterlaesst
      // eine kaputte Instanz. Die wird verworfen und beim naechsten Auftrag
      // neu gebaut - ein normaler SQL-Fehler dagegen laesst sie heil.
      if (fehler?.name === 'RuntimeError') {
        instanzen[a.slot] = null;
      }
      sende({
        id: a.id,
        art: 'fehler',
        name: fehler?.name ?? 'Error',
        meldung: fehler?.message ?? String(f),
      });
    }
  });
};
