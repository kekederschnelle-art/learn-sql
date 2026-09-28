/**
 * V7: Pruefungsmodus.
 *
 * Der Lernpfad fragt Aufgaben in der Reihenfolge ab, in der sie erklaert
 * wurden - mit Hinweisen und Musterloesung daneben. Eine Klausur tut das
 * nicht. Hier werden Aufgaben quer ueber die Stufen gezogen, es gibt kein
 * Feedback waehrend der Bearbeitung, und am Ende eine Auswertung.
 *
 * Diese Datei enthaelt nur die Auswahl-Logik. Sie haelt keinen Zustand und
 * spricht nicht mit der Datenbank, damit sie sich einzeln testen laesst.
 */

import type { Task } from './tasks';

export type PruefungsKonfig = {
  /** Wie viele Aufgaben gezogen werden. Mehr als vorhanden gibt es nicht. */
  anzahl: number;
  vonLevel: number;
  bisLevel: number;
  mitTimer: boolean;
  /** Nur relevant, wenn mitTimer true ist. */
  minuten: number;
};

export const STANDARD_KONFIG: PruefungsKonfig = {
  anzahl: 10,
  vonLevel: 1,
  bisLevel: 9,
  mitTimer: true,
  minuten: 30,
};

export const ANZAHL_OPTIONEN = [5, 10, 15, 20];
export const MINUTEN_OPTIONEN = [10, 20, 30, 45, 60];

/** Fisher-Yates. Arbeitet auf einer Kopie, das Original bleibt unberuehrt. */
function mische<T>(liste: readonly T[]): T[] {
  const a = [...liste];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Zieht die Aufgaben fuer einen Durchgang.
 *
 * Nicht einfach zufaellig aus dem Topf: Sonst kommen bei zehn Aufgaben aus
 * neun Stufen regelmaessig vier aus derselben Stufe und drei Stufen gar nicht
 * vor. Stattdessen reihum eine pro Stufe, bis die Anzahl erreicht ist.
 *
 * Sortiert zurueck nach Stufe - das fuehlt sich wie eine Klausur an (leicht
 * nach schwer) und spart beim Bearbeiten Neuaufbauten der Datenbank, weil
 * der Datenstand nur einmal je Stufe gebaut werden muss.
 */
export function waehleAufgaben(alle: readonly Task[], konfig: PruefungsKonfig): Task[] {
  const von = Math.min(konfig.vonLevel, konfig.bisLevel);
  const bis = Math.max(konfig.vonLevel, konfig.bisLevel);

  const proLevel = new Map<number, Task[]>();
  for (const t of mische(alle.filter((t) => t.level >= von && t.level <= bis))) {
    if (!proLevel.has(t.level)) proLevel.set(t.level, []);
    proLevel.get(t.level)!.push(t);
  }

  const levels = [...proLevel.keys()].sort((a, b) => a - b);
  const out: Task[] = [];
  let i = 0;
  while (out.length < konfig.anzahl && levels.some((l) => proLevel.get(l)!.length > 0)) {
    const liste = proLevel.get(levels[i % levels.length])!;
    const naechste = liste.pop();
    if (naechste) out.push(naechste);
    i++;
  }

  return out.sort((a, b) => a.level - b.level || a.id.localeCompare(b.id));
}

/** Wie viele Aufgaben im gewaehlten Bereich ueberhaupt zur Verfuegung stehen. */
export function verfuegbar(alle: readonly Task[], von: number, bis: number): number {
  const u = Math.min(von, bis);
  const o = Math.max(von, bis);
  return alle.filter((t) => t.level >= u && t.level <= o).length;
}

/** mm:ss, auch bei ueber einer Stunde (dann h:mm:ss). */
export function alsUhrzeit(sekunden: number): string {
  const s = Math.max(0, Math.floor(sekunden));
  const std = Math.floor(s / 3600);
  const min = Math.floor((s % 3600) / 60);
  const sek = s % 60;
  const zwei = (n: number) => String(n).padStart(2, '0');
  return std > 0 ? `${std}:${zwei(min)}:${zwei(sek)}` : `${zwei(min)}:${zwei(sek)}`;
}

export type Note = { text: string; ton: 'gut' | 'mittel' | 'schwach' };

/** Eine Einordnung in einem Satz, ohne Schulnoten-Anmutung. */
export function einordnung(richtig: number, gesamt: number): Note {
  if (gesamt === 0) return { text: 'Keine Aufgaben bearbeitet.', ton: 'schwach' };
  const quote = richtig / gesamt;
  if (quote === 1) return { text: 'Alles richtig.', ton: 'gut' };
  if (quote >= 0.8) return { text: 'Sitzt weitgehend.', ton: 'gut' };
  if (quote >= 0.5) return { text: 'Die Hälfte steht, der Rest braucht noch Übung.', ton: 'mittel' };
  return { text: 'Da ist noch viel Luft – geh die Stufen nochmal durch.', ton: 'schwach' };
}
