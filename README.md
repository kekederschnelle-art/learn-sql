# SQL-Prüfstand

SQL lernen an einem Datensatz, der mitwächst. Neun Stufen vom ersten `SELECT` bis zum eigenen `CREATE TABLE` — und alle arbeiten am selben Gebrauchtwagen-Marktplatz. Was du auf Stufe 1 lernst, brauchst du auf Stufe 9 noch.

Postgres läuft per WebAssembly komplett im Browser. Es gibt keinen Server, keine Datenbank im Netz und keine Anmeldung.

**Live:** https://DEIN-PROJEKT.vercel.app

## Was drin ist

| | |
| --- | --- |
| Stufen | 9, jede mit Einführung und Übungen |
| Aufgaben | 72, davon 16 mit Datenänderung oder Tabellenbau |
| Lektionsabschnitte | 51, davon 49 mit ausführbarem Beispiel |
| Freier Modus | Editor mit Schreibzugriff, Datenstand wählbar, Reset-Knopf |
| Kosten, Anmeldung | keine |

Das Datenbankschema (Tabellen, Spalten, Werte) ist englisch, alle Erklärungen und Aufgabentexte sind deutsch.

## Die Stufen

Mit jeder Stufe kommen Tabellen oder Spalten dazu. Nichts wird ersetzt, nur ergänzt.

| Stufe | Thema | Neu im Datensatz | Schwerpunkt |
| --- | --- | --- | --- |
| 1 | Zeilen holen, filtern, sortieren, zählen | `cars` | SELECT, WHERE, ORDER BY, GROUP BY, HAVING |
| 2 | Zwei Tabellen verbinden | `dealers` | JOIN, Aliase, Fremdschlüssel |
| 3 | Viele zu viele | `customers`, `inquiries` | Mehrfach-JOIN, DISTINCT, LIMIT |
| 4 | NULL und was fehlt | NULL-Spalten, Händler ohne Bestand | IS NULL, LEFT JOIN, COALESCE |
| 5 | Zeitverläufe und Fensterfunktionen | `price_history` | TO_CHAR, OVER, PARTITION BY, WITH |
| 6 | Dreckige Daten aufräumen | `leads` (unbereinigt) | LOWER, TRIM, Dubletten, DISTINCT ON |
| 7 | Abfragen in Abfragen | `cars_archive` | Unterabfragen, EXISTS, CASE, UNION |
| 8 | Daten verändern | `watchlist` (leer) | INSERT, UPDATE, DELETE, DEFAULT |
| 9 | Tabellen selbst bauen | — | CREATE TABLE, Constraints, ALTER TABLE, VIEW |

## Seiten

| Route | Inhalt |
| --- | --- |
| `/` | Startseite mit Live-Editor und Übersicht, wie der Datensatz wächst |
| `/lektionen` | Alle Stufen mit Fortschritt und Empfehlung, wo man weitermacht |
| `/lektion/[stufe]` | Einführung in Abschnitten, Beispiele editier- und ausführbar |
| `/uebung/[stufe]` | Die acht Aufgaben einer Stufe |
| `/frei` | Freier Editor mit Schreibzugriff |

Alle Seiten werden beim Build statisch erzeugt.

## Lokal starten

```bash
npm install
npm run dev
```

Dann `http://localhost:3000` öffnen.

**Vor jedem Deploy** einmal den Produktions-Build testen. `npm run dev` prüft weniger streng und hat einen anderen Bundler-Pfad — Fehler können dort unsichtbar bleiben:

```bash
rm -rf .next
npm run build && npm start
```

## Deployen

Das Repo ist mit Vercel verbunden. Jeder Push auf `main` deployt automatisch, jeder andere Branch bekommt eine eigene Vorschau-URL. Nichts muss konfiguriert werden, die Build-Einstellungen stehen in `package.json`.

Der Hobby-Tarif reicht, solange das Projekt nicht-kommerziell bleibt: Die Seite ist vollständig statisch, es gibt keine Serverless Functions und keine Datenbank. Der größte Download ist das PGlite-WASM-Modul mit rund 3 MB, das gecacht wird. Auf der Startseite wird es erst beim ersten Klick auf „Ausführen" geladen.

## Technik

| | |
| --- | --- |
| Framework | Next.js 16 mit App Router, gebaut mit **Webpack** (siehe unten) |
| UI | React 19, TypeScript |
| Datenbank | PGlite 0.5 — Postgres als WebAssembly, läuft im Browser-Tab |
| Editor | CodeMirror 6 mit eigenem Farbschema |
| Schriften | Archivo, IBM Plex Mono |
| Fortschritt | `localStorage`, pro Gerät |

### Warum Webpack statt Turbopack

Next.js 16 baut standardmäßig mit Turbopack. Dessen Minifier benennt in PGlite einen Modul-Namespace in einen Bezeichner um, der im inneren Scope schon vergeben ist ([vercel/next.js#98294](https://github.com/vercel/next.js/issues/98294)). Im Browser endet das mit `instantiateWasm is not a function`, und zwar nur im Produktions-Build, nicht in `next dev`.

Deshalb stehen in `package.json` die Flags `--webpack`, und `next.config.mjs` enthält `transpilePackages: ['@electric-sql/pglite']`. Sobald der Bug behoben ist, kann man zurück auf Turbopack.

## Aufbau

```
app/
  page.tsx                  Startseite
  lektionen/page.tsx        Übersicht aller Stufen
  lektion/[stufe]/page.tsx  Einführung einer Stufe
  uebung/[stufe]/page.tsx   Aufgaben einer Stufe
  frei/page.tsx             Freier Modus
  globals.css               Das gesamte Styling
components/
  Landing.tsx  Home.tsx  Lektion.tsx  Uebung.tsx  Frei.tsx
  SqlEditor.tsx  Ergebnistabelle.tsx  SchemaPanel.tsx
lib/
  migrations.ts   Der Datensatz, in neun Stufen
  lektionen.ts    Die Einführungen
  tasks.ts        Die Aufgaben mit Musterlösungen
  compare.ts      Vergleich zweier Ergebnisse
  db.ts           PGlite-Instanzen und Ausführung
  fortschritt.ts  localStorage-Zugriff
```

## Wie die Prüfung funktioniert

### Musterlösung statt Erwartungswert

In `tasks.ts` steht zu keiner Aufgabe ein erwartetes Ergebnis, sondern nur die Musterlösung als SQL. Beim Prüfen laufen Musterlösung und Eingabe gegen denselben Datenstand, dann werden die Ergebnisse verglichen.

Das ist der wichtigste Entwurfsentscheid im Projekt. Man kann jederzeit Daten in einer frühen Migration ändern, ohne dass spätere Aufgaben still kaputtgehen. Mit hartkodierten Erwartungswerten würde jede Datenänderung Dutzende Aufgaben brechen, und man würde es erst merken, wenn sich jemand beschwert.

### Zwei Arten von Aufgaben

Jede Aufgabe hat ein Feld `art`:

- **`'abfrage'`** (Standard) — Die Eingabe ist ein `SELECT`. Verglichen wird die Ausgabe.
- **`'zustand'`** — Die Eingabe verändert die Datenbank (`INSERT`, `UPDATE`, `DELETE`, `CREATE`, `ALTER`) und liefert selbst nichts Vergleichbares. Danach liest die Abfrage aus `pruefung` den entstandenen Zustand aus, und der wird verglichen.

### Was der Vergleich toleriert

| Egal | Wird geprüft |
| --- | --- |
| Spaltennamen und Aliase | Spaltenanzahl und -reihenfolge |
| `"12900.00"` gegen `12900` | Zeilenanzahl |
| Zeilenreihenfolge, wenn die Aufgabe kein `ORDER BY` verlangt | jeder einzelne Wert |
| Lösungsweg: `JOIN`, Unterabfrage oder `NOT EXISTS` | |

Die Spaltenreihenfolge wird absichtlich streng geprüft. Würde man Spalten anhand ihrer Werte einander zuordnen, gingen vertauschte Spalten gleichen Typs (`name, city` statt `city, name`) als richtig durch.

Bei einem Fehler sagt die App, welcher es ist: falsche Spalten- oder Zeilenanzahl, richtige Daten in falscher Sortierung, richtige Werte in falscher Spaltenreihenfolge oder abweichende Werte in einer bestimmten Spalte.

### Isolation

`lib/db.ts` hält zwei getrennte PGlite-Instanzen:

- **`'uebung'`** für Lektionen und Aufgaben. Jede Ausführung läuft in `BEGIN … ROLLBACK`. Auch ein `DROP TABLE` überlebt keine Prüfung.
- **`'frei'`** für den freien Modus. Dort bleiben Änderungen bestehen, bis jemand zurücksetzt.

Die beiden müssen getrennt bleiben. Würde der freie Modus dieselbe Instanz benutzen, könnte ein `DROP TABLE` dort die Aufgaben unlösbar machen.

## Inhalte ergänzen

### Aufgabe

In `lib/tasks.ts` anhängen:

```ts
{
  id: 'a73',
  level: 3,                     // ab welchem Datenstand lösbar
  titel: 'Kurzer Titel',
  aufgabe: 'Was gefragt ist. Spalten und ihre Reihenfolge ausdrücklich nennen.',
  reihenfolgeZaehlt: true,      // nur wenn die Aufgabe ein ORDER BY verlangt
  hinweise: ['grober Hinweis', 'konkreterer Hinweis'],
  loesung: `select ...`,
}
```

Für Aufgaben, die Daten ändern, zusätzlich `art: 'zustand'` und `pruefung: \`select ...\``.

### Lektionsabschnitt

In `lib/lektionen.ts`:

```ts
{
  titel: 'Überschrift',
  text: ['Absatz eins.', 'Absatz zwei.'],   // `code` und **fett** werden ausgezeichnet
  beispiel: 'select ...',                    // läuft gegen den Datenstand dieser Stufe
  beobachtung: 'Was man am Ergebnis sehen soll.',
  falle: 'Der typische Fehler.',             // optional, rot hervorgehoben
  darfScheitern: true,                       // optional: Beispiel soll absichtlich fehlschlagen
  darfLeerSein: true,                        // optional: leeres Ergebnis ist die Aussage
}
```

Formulier die `beobachtung` als Aufforderung („Lösch das HAVING und vergleich"). Die Beispiele sind editierbar, das wird sonst kaum genutzt.

### Stufe

Neue Migration in `lib/migrations.ts` anhängen, dazu eine Lektion in `lektionen.ts` und Aufgaben mit dem passenden `level`. Die Startseite, die Übersicht und die Wachstumsgrafik lesen ihre Zahlen selbst aus den Daten und passen sich an.

## Checkliste für neue Aufgaben

Diese Fehler sind beim Bau dieses Projekts jeweils mehrfach aufgetreten. Sie sind leicht zu machen und schwer zu sehen.

**Jede Bedingung muss im Datensatz etwas bewirken.** Eine Aufgabe mit `preis < 15000` testet nichts, solange kein Auto exakt 15.000 € kostet — dann liefern `<` und `<=` dasselbe. Ein `HAVING count(*) >= 2` ist wirkungslos, wenn jede Gruppe mindestens zwei Einträge hat. Ein `PARTITION BY` bewirkt nichts, wenn die Daten ohne Partition dasselbe ergeben. Deshalb gibt es im Datensatz absichtlich einen Seat für genau 15.000 € und ähnliche Grenzfälle, jeweils mit Kommentar markiert.

**Schick eine absichtlich falsche Lösung durch.** Lass die Bedingung weg, die die Aufgabe eigentlich prüfen soll. Wenn das trotzdem als richtig durchgeht, fehlen Daten oder die Aufgabe ist falsch gestellt.

**Bei Zustandsaufgaben ist die Prüfabfrage die eigentliche Fehlerquelle.** Prüft sie zu wenig, besteht jede halbrichtige Lösung. Eine Prüfung, die nur Spalten ausliest, sieht kein `UNIQUE` und kein `CHECK`. Für `CREATE TABLE` deshalb auch `information_schema.table_constraints` auslesen — Constraint-Typen, nie Constraint-Namen, die vergibt Postgres automatisch.

**Keine `serial`-IDs in `pruefung`.** Sequenzen werden von `ROLLBACK` nicht zurückgesetzt. Die Nummern sind zwischen Musterlösung und Eingabe verschoben, und die Aufgabe wird unlösbar. Fachliche Spalten prüfen.

**Spaltenreihenfolge im Aufgabentext nennen.** Sonst ist der strenge Positionsvergleich unfair.

**Sortierung eindeutig machen.** `reihenfolgeZaehlt: true` nur mit einem `ORDER BY`, das keine Gleichstände übrig lässt. Sonst ist die Reihenfolge zufällig und die Aufgabe manchmal lösbar, manchmal nicht.

**Zahlen in Lektionstexten nachprüfen.** Texte wie „Von 21 Anfragen bleiben 19" stimmen nur, solange sich die Daten nicht ändern. Nach jeder Datenänderung die Beispiele laufen lassen und die genannten Zahlen vergleichen.

## Fortschritt

Gelöste Aufgaben, Entwürfe und gelesene Lektionen liegen im `localStorage` des Browsers, also pro Gerät. Wer geräteübergreifenden Fortschritt oder Konten will, muss nur `lib/fortschritt.ts` austauschen — etwa gegen Supabase.

Der Schlüssel für Entwürfe trägt eine Version (`sql-pruefstand:entwurf:v4`). Bei der Umstellung auf das englische Schema wurde sie erhöht, weil alte Entwürfe mit deutschen Spaltennamen nicht mehr laufen würden. Gelöste Aufgaben hängen nur an der Aufgaben-ID und bleiben bei solchen Umstellungen erhalten.
