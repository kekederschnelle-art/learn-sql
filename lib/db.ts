/**
 * PGlite laeuft komplett im Browser-Tab (Postgres als WebAssembly).
 * Kein Server, kein Backend, keine Anfrage verlaesst das Geraet.
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
import { schemaBis } from './migrations';
import type { QueryResult } from './compare';

export type Slot = 'uebung' | 'frei';

type Eintrag = { db: PGlite; level: number };

const instanzen: Record<Slot, Eintrag | null> = { uebung: null, frei: null };
const imAufbau: Record<Slot, Promise<PGlite> | null> = { uebung: null, frei: null };

async function baue(slot: Slot, level: number): Promise<PGlite> {
  const { PGlite } = await import('@electric-sql/pglite');
  const alt = instanzen[slot];
  if (alt) {
    try {
      await alt.db.close();
    } catch {
      /* egal - wir werfen die Instanz sowieso weg */
    }
  }
  const db = new PGlite();
  await db.exec(schemaBis(level));
  instanzen[slot] = { db, level };
  return db;
}

export async function dbFuerLevel(level: number, slot: Slot = 'uebung'): Promise<PGlite> {
  const da = instanzen[slot];
  if (da && da.level === level) return da.db;

  if (imAufbau[slot]) await imAufbau[slot];
  const nochmal = instanzen[slot];
  if (nochmal && nochmal.level === level) return nochmal.db;

  imAufbau[slot] = baue(slot, level);
  try {
    return await imAufbau[slot]!;
  } finally {
    imAufbau[slot] = null;
  }
}

/** Erzwingt einen Neuaufbau - der Reset-Knopf im freien Modus. */
export async function dbZuruecksetzen(level: number, slot: Slot = 'uebung') {
  instanzen[slot] = null;
  return dbFuerLevel(level, slot);
}

export type RohErgebnis = QueryResult & {
  /** Bei INSERT/UPDATE/DELETE: Anzahl betroffener Zeilen. */
  betroffen?: number;
  /** Anzahl der ausgefuehrten Anweisungen. */
  anweisungen: number;
};

function ausLetztem(ergebnisse: any[]): RohErgebnis {
  const mitSpalten = [...ergebnisse].reverse().find((r) => r.fields?.length);
  const letztes = ergebnisse[ergebnisse.length - 1];
  return {
    felder: mitSpalten ? mitSpalten.fields.map((f: { name: string }) => f.name) : [],
    zeilen: mitSpalten ? (mitSpalten.rows as Record<string, unknown>[]) : [],
    betroffen: letztes?.affectedRows,
    anweisungen: ergebnisse.length,
  };
}

/**
 * Fuehrt SQL aus und macht anschliessend garantiert ein ROLLBACK.
 * Damit kann keine Eingabe den Datenstand fuer die naechste Pruefung
 * veraendern - auch kein UPDATE, DELETE oder DROP.
 */
export async function fuehreAus(db: PGlite, sql: string): Promise<RohErgebnis> {
  await db.exec('begin');
  try {
    const ergebnisse = await db.exec(sql);
    await db.exec('rollback');
    return ausLetztem(ergebnisse);
  } catch (fehler) {
    try {
      await db.exec('rollback');
    } catch {
      /* Rollback nach Syntaxfehler kann selbst scheitern - ignorieren */
    }
    throw fehler;
  }
}

/**
 * Fuer Aufgaben vom Typ 'zustand': erst die Anweisungen ausfuehren, dann
 * innerhalb derselben Transaktion den entstandenen Zustand auslesen und
 * alles zurueckrollen. Zurueck kommt nur der Zustand.
 */
export async function fuehreAusUndLiesZustand(
  db: PGlite,
  sql: string,
  pruefung: string,
): Promise<QueryResult> {
  await db.exec('begin');
  try {
    await db.exec(sql);
    const ergebnisse = await db.exec(pruefung);
    await db.exec('rollback');
    const roh = ausLetztem(ergebnisse);
    return { felder: roh.felder, zeilen: roh.zeilen };
  } catch (fehler) {
    try {
      await db.exec('rollback');
    } catch {
      /* siehe oben */
    }
    throw fehler;
  }
}

/**
 * Fuer den freien Modus: fuehrt aus, OHNE zurueckzurollen. Aenderungen
 * bleiben bestehen, bis jemand zuruecksetzt.
 */
export async function fuehreAusOhneRollback(
  db: PGlite,
  sql: string,
): Promise<RohErgebnis> {
  const ergebnisse = await db.exec(sql);
  return ausLetztem(ergebnisse);
}

/** Liest das aktuelle Schema aus dem Katalog, statt es fest zu verdrahten. */
export async function schemaLesen(db: PGlite) {
  const res = await db.query<{
    tabelle: string;
    spalte: string;
    typ: string;
    nullbar: string;
  }>(`
    select c.table_name  as tabelle,
           c.column_name as spalte,
           c.data_type   as typ,
           c.is_nullable as nullbar
    from information_schema.columns c
    join information_schema.tables t
      on t.table_schema = c.table_schema and t.table_name = c.table_name
    where c.table_schema = 'public'
      and t.table_type in ('BASE TABLE', 'VIEW')
    order by c.table_name, c.ordinal_position
  `);

  const tabellen = new Map<
    string,
    { spalte: string; typ: string; nullbar: boolean }[]
  >();
  for (const r of res.rows) {
    if (!tabellen.has(r.tabelle)) tabellen.set(r.tabelle, []);
    tabellen.get(r.tabelle)!.push({
      spalte: r.spalte,
      typ: kurzTyp(r.typ),
      nullbar: r.nullbar === 'YES',
    });
  }
  return [...tabellen.entries()].map(([name, spalten]) => ({ name, spalten }));
}

function kurzTyp(typ: string): string {
  const map: Record<string, string> = {
    'character varying': 'text',
    'timestamp without time zone': 'timestamp',
    'timestamp with time zone': 'timestamptz',
    integer: 'int',
    boolean: 'bool',
    numeric: 'numeric',
    text: 'text',
    date: 'date',
    bigint: 'bigint',
  };
  return map[typ] ?? typ;
}
