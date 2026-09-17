/**
 * PGlite laeuft komplett im Browser-Tab (Postgres als WebAssembly).
 * Kein Server, kein Backend, keine Anfrage verlaesst das Geraet.
 *
 * Fuer jedes Level wird die Datenbank aus den Migrationen 1..level
 * frisch aufgebaut. Das dauert wenige Millisekunden, deshalb brauchen
 * wir keinen persistenten Zustand.
 */

import type { PGlite } from '@electric-sql/pglite';
import { schemaBis } from './migrations';
import type { QueryResult } from './compare';

let instanz: PGlite | null = null;
let instanzLevel = -1;
let imAufbau: Promise<PGlite> | null = null;

export async function dbFuerLevel(level: number): Promise<PGlite> {
  if (instanz && instanzLevel === level) return instanz;
  if (imAufbau) await imAufbau;
  if (instanz && instanzLevel === level) return instanz;

  imAufbau = (async () => {
    const { PGlite } = await import('@electric-sql/pglite');
    if (instanz) {
      try {
        await instanz.close();
      } catch {
        /* egal - wir werfen die Instanz sowieso weg */
      }
    }
    const db = new PGlite();
    await db.exec(schemaBis(level));
    instanz = db;
    instanzLevel = level;
    return db;
  })();

  try {
    return await imAufbau;
  } finally {
    imAufbau = null;
  }
}

/** Erzwingt einen Neuaufbau, z. B. nachdem jemand DROP TABLE probiert hat. */
export async function dbZuruecksetzen(level: number): Promise<PGlite> {
  instanzLevel = -1;
  return dbFuerLevel(level);
}

/**
 * Fuehrt SQL aus und macht anschliessend garantiert ein ROLLBACK.
 * Damit kann keine Eingabe den Datenstand fuer die naechste Pruefung
 * veraendern - auch kein UPDATE oder DELETE.
 */
export async function fuehreAus(db: PGlite, sql: string): Promise<QueryResult> {
  await db.exec('begin');
  try {
    const ergebnisse = await db.exec(sql);
    await db.exec('rollback');

    // Bei mehreren Statements zaehlt das letzte, das Spalten liefert.
    const letztes = [...ergebnisse].reverse().find((r) => r.fields?.length);
    if (!letztes) {
      return { felder: [], zeilen: [] };
    }
    return {
      felder: letztes.fields.map((f: { name: string }) => f.name),
      zeilen: letztes.rows as Record<string, unknown>[],
    };
  } catch (fehler) {
    try {
      await db.exec('rollback');
    } catch {
      /* Rollback nach Syntaxfehler kann selbst scheitern - ignorieren */
    }
    throw fehler;
  }
}

/** Liest das aktuelle Schema aus dem Katalog, statt es fest zu verdrahten. */
export async function schemaLesen(db: PGlite) {
  const res = await db.query<{
    tabelle: string;
    spalte: string;
    typ: string;
    nullbar: string;
  }>(`
    select table_name  as tabelle,
           column_name as spalte,
           data_type   as typ,
           is_nullable as nullbar
    from information_schema.columns
    where table_schema = 'public'
    order by table_name, ordinal_position
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
  };
  return map[typ] ?? typ;
}
