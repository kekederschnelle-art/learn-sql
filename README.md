# SQL-Prüfstand

SQL üben an einem Gebrauchtwagen-Datensatz, der mit jeder Stufe wächst.
Neun Stufen, je eine Einführung und acht Aufgaben (72 insgesamt), dazu ein
Prüfungsmodus, ein freier Modus und ein Spickzettel.

Das Datenbankschema (Tabellen, Spalten, Werte) ist englisch, alle Texte
sind deutsch.
Postgres läuft per WebAssembly in einem Web Worker im Browser – kein Server,
keine Datenbank, keine Kosten.

## Loslegen

```bash
npm install
npm run dev
```

Dann `http://localhost:3000` öffnen.

| Befehl | Was |
| --- | --- |
| `npm run dev` | Entwicklungsserver |
| `npm test` | Alle Tests (Aufgaben, Lektionen, Spickzettel, Logik) |
| `npm run typecheck` | TypeScript prüfen |
| `npm run build` | Produktions-Build |

## Auf Vercel deployen

1. Repo auf GitHub anlegen und pushen:
   ```bash
   git init && git add -A && git commit -m "SQL-Prüfstand"
   git remote add origin git@github.com:DEINNAME/sql-pruefstand.git
   git push -u origin main
   ```
2. Auf [vercel.com](https://vercel.com) mit GitHub einloggen → **Add New → Project** → Repo wählen.
3. Nichts konfigurieren, Next.js wird erkannt. **Deploy** drücken.

Ab dann deployt jeder Push auf `main` automatisch. Jeder Branch bekommt
eine eigene Preview-URL.

Hobby-Tarif reicht dauerhaft: die Seite ist vollständig statisch, es gibt
keine Serverless Functions und keine Datenbank. Der einzige nennenswerte
Download ist das PGlite-WASM-Modul (rund 3 MB, wird gecacht).

## Wie es aufgebaut ist

### Seiten

| Route | Was |
| --- | --- |
| `/` | Landingpage mit Demo-Editor zum direkten Ausprobieren |
| `/lektionen` | Übersicht: neun Stufenkarten, Fortschritt, Empfehlung, Sicherung (Export/Import) |
| `/lektion/[stufe]` | Einführung, in Abschnitten durchklickbar, Beispiele editier- und ausführbar |
| `/uebung/[stufe]` | Die acht Aufgaben dieser Stufe, mit Hinweisen und Musterlösung |
| `/pruefung` | Prüfungsmodus: zufällige Aufgaben quer über die Stufen, optional mit Zeitlimit, Auswertung erst am Ende, Prüfungslog |
| `/frei` | Freier Editor mit Schreibzugriff, Datenstand wählbar |
| `/spickzettel` | Syntax aller Stufen zum Nachschlagen, durchsuchbar |

Alle Seiten werden zur Build-Zeit statisch erzeugt.

### Dateien

| Datei | Zweck |
| --- | --- |
| `lib/migrations.ts` | Der Datensatz, in neun Stufen. Stufe N = Migration 1…N |
| `lib/lektionen.ts` | Die Einführungen: Abschnitte mit Text, Beispiel-SQL und Fallen |
| `lib/tasks.ts` | Aufgaben mit Musterlösung als SQL |
| `lib/spickzettel.ts` | Die Einträge des Spickzettels |
| `lib/compare.ts` | Vergleich zweier Ergebnismengen, Markierung der Abweichungen |
| `lib/pruefung.ts` | Auswahl der Aufgaben für den Prüfungsmodus |
| `lib/fortschritt.ts` | Gelöste Aufgaben, Entwürfe, gelesene Lektionen und Prüfungslog im localStorage; Sicherung als Datei |
| `lib/db.ts` | Schnittstelle zur Datenbank für die Oberfläche: schickt Aufträge an den Worker, Zeitlimit, Abbrechen |
| `lib/db.worker.ts` | Der Web Worker: hält die PGlite-Instanzen, arbeitet Aufträge nacheinander ab |
| `lib/db-kern.ts` | Alles, was direkt mit PGlite spricht: Ausführung mit garantiertem Rollback, Transaktionssperre, Schema lesen. Läuft im Worker und in den Tests |
| `test/` | Tests, siehe unten |

### Zwei Prüfmechanismen

Aufgaben haben ein Feld `art`:

- `'abfrage'` (Standard) — die Eingabe ist ein SELECT, verglichen wird die Ausgabe.
- `'zustand'` — die Eingabe verändert die Datenbank (INSERT/UPDATE/DELETE/CREATE)
  und liefert selbst nichts Vergleichbares. Danach läuft die in `pruefung`
  hinterlegte Abfrage und liest den entstandenen Zustand aus. Verglichen wird
  der Zustand nach der Eingabe mit dem nach der Musterlösung.

Wichtig bei `pruefung`: **keine serial-IDs auswählen.** Sequenzen werden von
ROLLBACK nicht zurückgesetzt, die Nummern wären zwischen den beiden Läufen
verschoben und die Aufgabe dadurch nie lösbar. Prüf lieber fachliche Spalten.
Für CREATE-TABLE-Aufgaben liest die Prüfung `information_schema` aus — also
Spalten, Typen, Nullbarkeit und Constraint-Typen, nie Constraint-*Namen*, die
vergibt Postgres automatisch. Die Tests fangen beide Fehler ab.

### Die Datenbank läuft in einem Web Worker

PGlite rechnet synchron. Auf dem Haupt-Thread hat eine Query wie
`select * from generate_series(1, 1e9)` früher den ganzen Tab eingefroren.
Deshalb läuft PGlite in `lib/db.worker.ts`:

- Läuft eine Eingabe länger als **10 Sekunden** (`ZEITLIMIT_MS` in `lib/db.ts`),
  oder drückt jemand **Abbrechen**, wird der Worker beendet und beim nächsten
  Auftrag frisch gestartet. Das Aufbauen des Datenstands zählt nicht zum Limit.
- Nach einem Abbruch ist der Datenstand der Aufgaben sofort wieder da, er wird
  einfach neu gebaut. Im freien Modus gehen eigene Änderungen dabei verloren,
  die Oberfläche sagt das dazu.
- Ergebnisse werden bei **5000 Zeilen** abgeschnitten (`ZEILEN_GRENZE` in
  `lib/db-kern.ts`). Die echte Zeilenzahl bleibt für Anzeige und Vergleich
  erhalten.

Der Worker hält zwei getrennte PGlite-Instanzen:

- `'uebung'` — für Lektionen, Aufgaben und Prüfung, jede Ausführung mit ROLLBACK
- `'frei'` — für den freien Modus, dort bleiben Änderungen bestehen

Das muss getrennt bleiben. Würde der freie Modus dieselbe Instanz benutzen,
könnte ein `drop table` dort die Aufgaben unlösbar machen.

### Der wichtigste Entwurfsentscheid

In `tasks.ts` steht **kein erwartetes Ergebnis als JSON**, sondern nur die
Musterlösung als SQL. Beim Prüfen läuft erst die Musterlösung gegen den
aktuellen Datenstand, dann die Eingabe — und die beiden Ergebnisse werden
verglichen.

Dadurch kannst du jederzeit Daten in einer frühen Migration ändern, ohne dass
spätere Aufgaben still kaputtgehen. Mit hartkodierten Erwartungswerten wäre
das die Sorte Fehler, die erst auffällt, wenn sich jemand beschwert.

### Was der Vergleich toleriert

| Egal | Wird geprüft |
| --- | --- |
| Spaltennamen und Aliase | Spaltenanzahl |
| `"12900.00"` vs. `12900` | Spaltenreihenfolge |
| Zeilenreihenfolge, falls die Aufgabe kein `ORDER BY` verlangt | Zeilenanzahl |
| Schreibweise des SQL, `JOIN` vs. Subquery vs. `NOT EXISTS` | jeder einzelne Wert |

Spaltenreihenfolge ist mit Absicht streng: würde man Spalten anhand ihrer
Werte einander zuordnen, gingen vertauschte Spalten gleichen Typs
(`name, city` statt `city, name`) als richtig durch. Stattdessen wird
positionsweise verglichen, und der Reihenfolgefehler bekommt eine eigene
Meldung.

Eingaben laufen immer in `BEGIN … ROLLBACK`. Ein `DROP TABLE` oder `UPDATE`
kann den Datenstand also nicht verändern. Eigenes `COMMIT`, `ROLLBACK` oder
`BEGIN` ist in Lektionen, Aufgaben und Prüfung deshalb gesperrt, im freien
Modus erlaubt.

### Fortschritt und Sicherung

Fortschritt liegt im localStorage, ist also pro Browser und Gerät. Auf
`/lektionen` lässt er sich als JSON-Datei **sichern** und auf einem anderen
Gerät **einlesen**. Beim Einlesen wird zusammengeführt, nicht überschrieben:
gelöste Aufgaben werden vereinigt, Prüfungsdurchgänge über ihre ID
zusammengelegt. Der Prüfungslog speichert nur Ergebnisse, keine Eingaben.

### Farbschema

Dunkel und hell, beide über dieselben CSS-Variablen in `app/globals.css`.
Standard ist dunkel, unabhängig von der Systemeinstellung. Der Schalter oben
rechts (`components/ThemaSchalter.tsx`) wechselt auf hell und merkt sich das
im localStorage; ein kleines Skript in `app/layout.tsx` wendet die Wahl vor
dem ersten Zeichnen an.

Beim Stylen gilt: **keine Farbe fest in eine Regel schreiben**, immer eine
Variable aus dem `:root`-Block – sonst stimmt sie nur in einem der beiden
Schemata. Die Editorfarben sind die `--code-*`-Variablen.

## Lektionen ergänzen

Abschnitte in `lib/lektionen.ts` anhängen:

```ts
{
  titel: 'Überschrift des Abschnitts',
  text: ['Absatz eins.', 'Absatz zwei.'],   // `code` und **fett** werden ausgezeichnet
  beispiel: 'select ...',                    // optional, wird ausführbar angezeigt
  beobachtung: 'Was man am Ergebnis sehen soll.',
  falle: 'Der typische Fehler.',             // optional, rot hervorgehoben
  darfScheitern: true,                       // optional: der Fehler ist hier die Lehre
  darfLeerSein: true,                        // optional: ein leeres Ergebnis ist die Aussage
}
```

Das Beispiel-SQL läuft gegen den Datenstand **dieser Stufe**. Ein JOIN auf
`dealers` funktioniert in Lektion 1 also nicht — die Tabelle gibt es dort
noch nicht. Die Tests führen jedes Beispiel aus und merken das.

Lohnt sich: Formulier die `beobachtung` als Aufforderung („Lösch das HAVING
und vergleich"). Die Beispiele sind editierbar, das wird sonst nicht genutzt.

## Aufgaben ergänzen

Neuen Eintrag in `lib/tasks.ts` anhängen:

```ts
{
  id: 'a73',
  level: 3,                    // ab welchem Datenstand lösbar
  titel: 'Kurzer Titel',
  aufgabe: 'Was gefragt ist. Spaltenreihenfolge hier klar benennen.',
  reihenfolgeZaehlt: true,     // true, wenn die Aufgabe ein ORDER BY verlangt
  hinweise: ['erster Hinweis', 'konkreterer Hinweis'],
  loesung: `select ...`,
}
```

Zwei Dinge, die man leicht vergisst:

- Die Aufgabenstellung muss die **Spaltenreihenfolge** nennen, sonst ist der
  strenge Positionsvergleich unfair.
- `reihenfolgeZaehlt: true` nur setzen, wenn die Sortierung **eindeutig** ist.
  Bei Gleichstand braucht das `ORDER BY` ein zweites Kriterium, sonst ist die
  Reihenfolge nicht deterministisch und die Aufgabe zufällig lösbar.

Danach die typischen Fehler zur neuen Aufgabe in `test/falsche-varianten.ts`
eintragen und `npm test` laufen lassen.

## Spickzettel ergänzen

Einträge in `lib/spickzettel.ts`, je Stufe ein Kapitel. Das `beispiel` läuft
im Test gegen den Datenstand seiner Stufe, darf also nur Tabellen und Spalten
benutzen, die es dort schon gibt.

## Migrationen ergänzen

Neue Stufe in `lib/migrations.ts` anhängen. Bestehende Migrationen dürfen
geändert werden, solange die Tests grün bleiben.

Nützlich beim Datenentwurf: baue **echte Fallen** ein. Ein Fahrzeug mit
Preis exakt 15.000 macht aus `<` vs. `<=` erst eine echte Prüfung. Eine
Marke mit genau einem Fahrzeug macht ein `HAVING count(*) >= 2` erst
wirksam. Ohne solche Grenzfälle bestehen auch falsche Lösungen – genau das
prüft `test/falsche-varianten.ts`.

## Tests

```bash
npm test
```

Läuft mit dem Test-Runner von Node und PGlite, gegen dieselben Funktionen
(`lib/db-kern.ts`, `lib/compare.ts`), die auch im Browser laufen. Dauert rund
30 Sekunden. Die GitHub Action (`.github/workflows/test.yml`) führt Typecheck,
Tests und Build bei jedem Push auf `main` und bei jedem Pull Request aus.

| Datei | Was geprüft wird |
| --- | --- |
| `test/aufgaben.test.ts` | Jede Musterlösung liefert Zeilen und besteht gegen sich selbst (Zustandsaufgaben zweimal, das fängt serial-IDs). Keine Zustandsaufgabe ist mit Nichtstun lösbar. Jede falsche Variante fällt durch. Alle Lektions- und Spickzettel-Beispiele laufen. |
| `test/falsche-varianten.ts` | Absichtlich falsche Lösungen („HAVING vergessen“, „DISTINCT vergessen“, `<=` statt `<` …) |
| `test/logik.test.ts` | Vergleich, Transaktionssperre, Aufgabenauswahl der Prüfung |

Eine falsche Variante, die trotzdem besteht, zeigt eine Lücke im Datensatz.
Solche bekannten Lücken lassen sich mit `luecke: '…'` markieren; sie
erscheinen dann im Testlauf als `todo`, statt ihn rot zu machen. Besser ist,
den fehlenden Grenzfall in `lib/migrations.ts` zu ergänzen.

## Später, falls ihr es wollt

Wenn ihr Accounts und geräteübergreifenden Fortschritt ohne Sicherungsdatei
wollt, ist `lib/fortschritt.ts` die einzige Datei, die getauscht werden muss —
Supabase Free Tier reicht dafür.
