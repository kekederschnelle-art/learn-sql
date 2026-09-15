# SQL-Prüfstand

SQL üben an einem Gebrauchtwagen-Datensatz, der mit jeder Stufe wächst.
Postgres läuft per WebAssembly im Browser-Tab — kein Server, keine Datenbank,
keine Kosten.

## Loslegen

```bash
npm install
npm run dev
```

Dann `http://localhost:3000` öffnen.

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

| Datei | Zweck |
| --- | --- |
| `lib/migrations.ts` | Der Datensatz, in sechs Stufen. Stufe N = Migration 1…N |
| `lib/tasks.ts` | Aufgaben mit Musterlösung als SQL |
| `lib/compare.ts` | Vergleich zweier Ergebnismengen |
| `lib/db.ts` | PGlite-Instanz pro Stufe, Ausführung mit garantiertem Rollback |
| `lib/fortschritt.ts` | Gelöste Aufgaben und Entwürfe im localStorage |

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
(`name, stadt` statt `stadt, name`) als richtig durch. Stattdessen wird
positionsweise verglichen, und der Reihenfolgefehler bekommt eine eigene
Meldung.

Eingaben laufen immer in `BEGIN … ROLLBACK`. Ein `DROP TABLE` oder `UPDATE`
kann den Datenstand also nicht verändern.

## Aufgaben ergänzen

Neuen Eintrag in `lib/tasks.ts` anhängen:

```ts
{
  id: 'a16',
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

## Migrationen ergänzen

Neue Stufe in `lib/migrations.ts` anhängen. Bestehende Migrationen dürfen
geändert werden, solange die Musterlösungen noch durchlaufen.

Nützlich beim Datenentwurf: baue **echte Fallen** ein. Ein Fahrzeug mit
Preis exakt 15.000 macht aus `<` vs. `<=` erst eine echte Prüfung. Eine
Marke mit genau einem Fahrzeug macht ein `HAVING count(*) >= 2` erst
wirksam. Ohne solche Grenzfälle bestehen auch falsche Lösungen.

## Test

Es gibt keinen Testlauf im Repo, aber der Selbsttest ist schnell gebaut:
Musterlösung gegen sich selbst vergleichen (muss `korrekt` ergeben), und
absichtlich falsche Varianten durchschicken (müssen durchfallen). Lohnt sich
besonders für die Fälle „HAVING vergessen" und „DISTINCT vergessen" — die
bestehen sonst gern versehentlich.

## Später, falls ihr es wollt

Fortschritt liegt im localStorage, ist also pro Gerät. Wenn ihr Accounts und
geräteübergreifenden Fortschritt wollt, ist `lib/fortschritt.ts` die einzige
Datei, die getauscht werden muss — Supabase Free Tier reicht dafür.
