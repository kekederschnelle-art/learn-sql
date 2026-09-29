/** Einheitstests fuer die reine Logik, ohne Datenbank. */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { vergleiche, type QueryResult } from '../lib/compare';
import { pruefeTransaktionsfrei, TransaktionsFehler } from '../lib/db-kern';
import { waehleAufgaben, STANDARD_KONFIG } from '../lib/pruefung';
import { tasks } from '../lib/tasks';

const INT = 23;
const NUMERIC = 1700;
const TEXT = 25;

function ergebnis(felder: string[], typen: number[], zeilen: unknown[][]): QueryResult {
  return {
    felder,
    typen,
    zeilen: zeilen.map((z) => Object.fromEntries(felder.map((f, i) => [f, z[i]]))),
  };
}

describe('vergleiche', () => {
  const soll = ergebnis(['brand', 'price'], [TEXT, NUMERIC], [
    ['Audi', '12900.00'],
    ['BMW', '15000.00'],
  ]);

  test('Aliase und Zahlformat sind egal', () => {
    const ist = ergebnis(['marke', 'p'], [TEXT, INT], [
      ['Audi', 12900],
      ['BMW', 15000],
    ]);
    assert.equal(vergleiche(soll, ist, true).korrekt, true);
  });

  test('Zeilenreihenfolge nur, wenn verlangt', () => {
    const ist = ergebnis(['brand', 'price'], [TEXT, NUMERIC], [
      ['BMW', '15000.00'],
      ['Audi', '12900.00'],
    ]);
    assert.equal(vergleiche(soll, ist, false).korrekt, true);
    const u = vergleiche(soll, ist, true);
    assert.equal(u.korrekt, false);
    assert.match(u.meldung, /Sortierung/);
  });

  test('vertauschte Spalten werden erkannt', () => {
    const ist = ergebnis(['price', 'brand'], [NUMERIC, TEXT], [
      ['12900.00', 'Audi'],
      ['15000.00', 'BMW'],
    ]);
    const u = vergleiche(soll, ist, true);
    assert.equal(u.korrekt, false);
    assert.match(u.meldung, /Spaltenreihenfolge/);
  });

  test('Text "007" ist nicht die Zahl 7', () => {
    const a = ergebnis(['x'], [TEXT], [['007']]);
    const b = ergebnis(['x'], [INT], [[7]]);
    assert.equal(vergleiche(a, b, false).korrekt, false);
  });

  test('abgeschnittene Ergebnisse zählen mit ihrer echten Zeilenzahl', () => {
    const ist = { ...soll, zeilenGesamt: 9000 };
    const u = vergleiche(soll, ist, true);
    assert.equal(u.korrekt, false);
    assert.match(u.meldung, /9000 statt 2/);
  });
});

describe('Transaktionssperre', () => {
  test('commit, rollback und begin sind gesperrt', () => {
    for (const sql of ['commit', 'select 1; ROLLBACK;', 'begin; select 1', 'start transaction']) {
      assert.throws(() => pruefeTransaktionsfrei(sql), TransaktionsFehler, sql);
    }
  });

  test('in Strings, Kommentaren und Bezeichnern nicht', () => {
    for (const sql of [
      "select 'commit'",
      "select 'it''s a commit'",
      '-- don\'t commit\nselect 1',
      '/* rollback */ select 1',
      'select 1 as "begin"',
      'select $$commit$$',
    ]) {
      assert.doesNotThrow(() => pruefeTransaktionsfrei(sql), sql);
    }
  });
});

describe('Prüfungsauswahl', () => {
  test('zieht die gewünschte Anzahl, ohne Doppelte, im Stufenbereich', () => {
    const konfig = { ...STANDARD_KONFIG, anzahl: 10, vonLevel: 2, bisLevel: 5 };
    const gezogen = waehleAufgaben(tasks, konfig);
    assert.equal(gezogen.length, 10);
    assert.equal(new Set(gezogen.map((t) => t.id)).size, 10);
    for (const t of gezogen) assert.ok(t.level >= 2 && t.level <= 5);
  });

  test('verteilt gleichmäßig über die Stufen', () => {
    const gezogen = waehleAufgaben(tasks, { ...STANDARD_KONFIG, anzahl: 9, vonLevel: 1, bisLevel: 9 });
    assert.equal(new Set(gezogen.map((t) => t.level)).size, 9);
  });

  test('sortiert nach Stufe', () => {
    const gezogen = waehleAufgaben(tasks, { ...STANDARD_KONFIG, anzahl: 20 });
    const stufen = gezogen.map((t) => t.level);
    assert.deepEqual(stufen, [...stufen].sort((a, b) => a - b));
  });
});
