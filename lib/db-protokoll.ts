/** Nachrichten zwischen lib/db.ts (Haupt-Thread) und lib/db.worker.ts. */

export type Slot = 'uebung' | 'frei';

type Basis = { id: number; slot: Slot; level: number };

export type Auftrag =
  /** Datenstand aufbauen, falls noch nicht da. */
  | (Basis & { art: 'bereit' })
  /** Datenstand verwerfen und frisch aufbauen. */
  | (Basis & { art: 'neu' })
  | (Basis & { art: 'schema' })
  /** Mit garantiertem Rollback. */
  | (Basis & { art: 'abfrage'; sql: string })
  | (Basis & { art: 'zustand'; sql: string; pruefung: string })
  /** Ohne Rollback, fuer den freien Modus. */
  | (Basis & { art: 'frei'; sql: string });

export type Antwort =
  /** Nutzer-SQL beginnt jetzt zu laufen - ab hier zaehlt das Zeitlimit. */
  | { id: number; art: 'start' }
  | { id: number; art: 'ok'; wert: unknown }
  | { id: number; art: 'fehler'; name: string; meldung: string };
