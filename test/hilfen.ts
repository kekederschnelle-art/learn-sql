/**
 * Gemeinsame Helfer fuer die Tests. Prueft genau so, wie die Oberflaeche
 * es tut (components/Uebung.tsx): erst die Musterloesung, dann die Eingabe,
 * beides gegen denselben Datenstand, dann vergleiche().
 */

import type { PGlite } from '@electric-sql/pglite';
import { baueDatenbank, fuehreAus, fuehreAusUndLiesZustand } from '../lib/db-kern';
import { vergleiche, type QueryResult, type VergleichsErgebnis } from '../lib/compare';
import type { Task } from '../lib/tasks';

const instanzen = new Map<number, Promise<PGlite>>();

/** Eine Instanz pro Stufe, fuer alle Tests geteilt. Jede Ausfuehrung rollt zurueck. */
export function dbFuer(level: number): Promise<PGlite> {
  let db = instanzen.get(level);
  if (!db) {
    db = baueDatenbank(level);
    instanzen.set(level, db);
  }
  return db;
}

export async function alleSchliessen() {
  for (const db of instanzen.values()) await (await db).close();
  instanzen.clear();
}

export function istZustandsaufgabe(t: Task): boolean {
  return t.art === 'zustand' && !!t.pruefung;
}

export async function ergebnisVon(t: Task, sql: string): Promise<QueryResult> {
  const db = await dbFuer(t.level);
  return istZustandsaufgabe(t)
    ? fuehreAusUndLiesZustand(db, sql, t.pruefung!)
    : fuehreAus(db, sql);
}

/** Das Urteil, das jemand in der App fuer diese Eingabe bekaeme. */
export async function urteil(t: Task, sql: string): Promise<VergleichsErgebnis> {
  const erwartet = await ergebnisVon(t, t.loesung);
  const eigene = await ergebnisVon(t, sql);
  return vergleiche(erwartet, eigene, t.reihenfolgeZaehlt);
}
