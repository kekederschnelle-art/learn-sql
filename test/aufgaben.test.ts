/**
 * Prueft den Inhalt: Aufgaben, Musterloesungen und Lektionsbeispiele gegen
 * echte PGlite-Instanzen - dieselben Funktionen, die auch im Browser laufen.
 *
 * Schlaegt hier etwas fehl, nachdem eine Migration geaendert wurde, ist
 * eine Aufgabe still kaputtgegangen.
 */

import { after, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { tasks } from '../lib/tasks';
import { lektionen } from '../lib/lektionen';
import { migrations } from '../lib/migrations';
import { spickzettel } from '../lib/spickzettel';
import { fuehreAus } from '../lib/db-kern';
import { alleSchliessen, dbFuer, ergebnisVon, istZustandsaufgabe, urteil } from './hilfen';
import { falscheVarianten } from './falsche-varianten';

after(alleSchliessen);

describe('Aufgabenkatalog', () => {
  test('IDs sind eindeutig', () => {
    const ids = tasks.map((t) => t.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  test('jede Aufgabe gehört zu einer vorhandenen Stufe', () => {
    for (const t of tasks) {
      assert.ok(
        migrations.some((m) => m.level === t.level),
        `${t.id}: Stufe ${t.level} gibt es nicht`,
      );
    }
  });

  test('jede Stufe hat eine Lektion und Aufgaben', () => {
    for (const m of migrations) {
      assert.ok(lektionen.some((l) => l.level === m.level), `Stufe ${m.level}: keine Lektion`);
      assert.ok(tasks.some((t) => t.level === m.level), `Stufe ${m.level}: keine Aufgaben`);
    }
  });

  test('jede Aufgabe hat Hinweise', () => {
    for (const t of tasks) assert.ok(t.hinweise.length > 0, `${t.id}: keine Hinweise`);
  });

  test('Zustandsaufgaben haben eine Prüfabfrage', () => {
    for (const t of tasks.filter((t) => t.art === 'zustand')) {
      assert.ok(t.pruefung?.trim(), `${t.id}: art 'zustand' ohne pruefung`);
    }
  });
});

describe('Musterlösungen', () => {
  for (const t of tasks) {
    test(`${t.id} ${t.titel}`, async () => {
      const ergebnis = await ergebnisVon(t, t.loesung);
      assert.ok(ergebnis.felder.length > 0, 'liefert keine Spalten');
      assert.ok(ergebnis.zeilen.length > 0, 'liefert keine Zeilen - dann besteht auch jede leere Antwort');

      // Gegen sich selbst muss sie bestehen. Bei Zustandsaufgaben laeuft sie
      // dabei zweimal - das faengt serial-IDs in der Pruefabfrage, die sich
      // zwischen zwei Laeufen verschieben (siehe README).
      const u = await urteil(t, t.loesung);
      assert.ok(u.korrekt, `besteht gegen sich selbst nicht: ${u.meldung}`);
    });
  }
});

describe('Nichtstun besteht nicht', () => {
  // Eine Zustandsaufgabe, deren Pruefabfrage vor und nach der Loesung
  // dasselbe liefert, waere mit einem harmlosen "select 1" geloest.
  for (const t of tasks.filter(istZustandsaufgabe)) {
    test(`${t.id} ${t.titel}`, async () => {
      // Scheitert die Pruefabfrage ohne die Loesung (etwa weil die View
      // noch nicht existiert), zeigt die App einen Fehler - auch gut.
      const u = await urteil(t, 'select 1').catch(() => null);
      assert.notEqual(u?.korrekt, true, 'die Prüfabfrage sieht die Änderung nicht');
    });
  }
});

describe('Falsche Varianten fallen durch', () => {
  for (const v of falscheVarianten) {
    const t = tasks.find((x) => x.id === v.aufgabe);
    const name = `${v.aufgabe}: ${v.fehler}`;
    if (v.luecke) {
      test.todo(`${name} – bekannte Lücke: ${v.luecke}`);
      continue;
    }
    test(name, async () => {
      assert.ok(t, `Aufgabe ${v.aufgabe} gibt es nicht`);
      const u = await urteil(t, v.sql);
      assert.equal(
        u.korrekt,
        false,
        'wird als richtig gewertet - im Datensatz fehlt der Grenzfall, der das erwischt',
      );
    });
  }
});

describe('Lektionsbeispiele', () => {
  for (const l of lektionen) {
    for (const [i, a] of l.abschnitte.entries()) {
      if (!a.beispiel) continue;
      test(`Stufe ${l.level}, Abschnitt ${i + 1}: ${a.titel}`, async () => {
        const db = await dbFuer(l.level);
        if (a.darfScheitern) {
          await assert.rejects(fuehreAus(db, a.beispiel!), 'sollte scheitern, läuft aber durch');
          return;
        }
        const r = await fuehreAus(db, a.beispiel!);
        if (r.felder.length && !a.darfLeerSein) {
          assert.ok(r.zeilen.length > 0, 'liefert keine Zeilen');
        }
      });
    }
  }
});

describe('Spickzettel-Beispiele', () => {
  for (const kapitel of spickzettel) {
    for (const e of kapitel.eintraege) {
      test(`Stufe ${kapitel.level}: ${e.titel}`, async () => {
        const db = await dbFuer(kapitel.level);
        await fuehreAus(db, e.beispiel);
      });
    }
  }
});
