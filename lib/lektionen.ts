/**
 * Die Einfuehrungen. Jede Stufe hat eine Lektion, jede Lektion besteht aus
 * Abschnitten, die man nacheinander durchklickt.
 *
 * Beispiele sind echtes SQL und laufen gegen genau den Datenstand, den die
 * Stufe hat. Sie muessen also zum jeweiligen Level passen - ein Beispiel mit
 * JOIN auf haendler funktioniert in Lektion 1 nicht.
 */

export type Abschnitt = {
  titel: string;
  /** Absaetze. Kurz halten - das wird am Bildschirm gelesen, nicht im Sessel. */
  text: string[];
  /** Lauffaehiges Beispiel, das man direkt ausprobieren kann. */
  beispiel?: string;
  /** Was man am Ergebnis des Beispiels sehen soll. */
  beobachtung?: string;
  /** Die typische Falle. Wird hervorgehoben. */
  falle?: string;
  /**
   * true = dieses Beispiel soll absichtlich einen Fehler ausloesen (etwa ein
   * INSERT, der an einem CHECK scheitert). Der Fehler ist dann die Lehre,
   * nicht ein Defekt.
   */
  darfScheitern?: boolean;
  /** true = ein leeres Ergebnis ist hier die Aussage, kein Defekt. */
  darfLeerSein?: boolean;
};

export type Lektion = {
  level: number;
  titel: string;
  /** Eine Zeile fuer die Karte auf der Startseite. */
  kurz: string;
  /** Welche Schluesselwoerter hier drankommen - fuer die Karte. */
  begriffe: string[];
  abschnitte: Abschnitt[];
};

export const lektionen: Lektion[] = [
  // ─────────────────────────────────────────────────────────────── Stufe 1
  {
    level: 1,
    titel: 'Zeilen holen, filtern, sortieren, zählen',
    kurz: 'Die Grundlagen: eine einzelne Tabelle abfragen.',
    begriffe: ['SELECT', 'WHERE', 'ORDER BY', 'GROUP BY', 'HAVING'],
    abschnitte: [
      {
        titel: 'Eine Tabelle ist ein Blatt Papier',
        text: [
          'Die Tabelle `fahrzeuge` ist nichts weiter als eine Liste. Jede Zeile ist ein Auto, jede Spalte eine Eigenschaft: Marke, Modell, Baujahr, Preis und so weiter.',
          'SQL ist die Sprache, mit der du dieser Liste Fragen stellst. Jede Frage fängt mit `select` an und liefert wieder eine Tabelle zurück — nur kleiner, gefilterter oder zusammengefasst.',
          'Der Stern bedeutet „alle Spalten". Damit siehst du erstmal, was überhaupt da ist.',
        ],
        beispiel: 'select * from fahrzeuge;',
        beobachtung:
          '21 Zeilen. Das ist der komplette Bestand auf dieser Stufe. Schau dir die Spaltennamen an, die brauchst du gleich.',
      },
      {
        titel: 'Nur bestimmte Spalten',
        text: [
          'Meistens willst du nicht alles sehen. Statt des Sterns schreibst du die Spalten hin, durch Komma getrennt.',
          'Die Reihenfolge, in der du sie hinschreibst, ist die Reihenfolge im Ergebnis. Das ist wichtig: In den Aufgaben wird sie geprüft.',
        ],
        beispiel: 'select marke, modell, preis\nfrom fahrzeuge;',
        beobachtung:
          'Immer noch 21 Zeilen, aber nur drei Spalten. Filtern von Spalten ändert nichts an der Zeilenzahl.',
      },
      {
        titel: 'WHERE filtert Zeilen',
        text: [
          '`where` wirft alle Zeilen weg, für die die Bedingung nicht zutrifft. Übrig bleibt, was du sehen willst.',
          'Zahlen vergleichst du mit `<`, `>`, `<=`, `>=`, `=` und `<>` (ungleich). Text steht in **einfachen** Anführungszeichen — doppelte bedeuten in Postgres etwas anderes.',
        ],
        beispiel: "select marke, modell, preis\nfrom fahrzeuge\nwhere preis < 12000;",
        beobachtung: 'Aus 21 Zeilen werden 6. Probier mal `<= 12000` statt `< 12000`.',
        falle:
          '`preis < 15000` und `preis <= 15000` sind nicht dasselbe. Im Datensatz steht ein Auto mit exakt 15.000 €. Achte in Aufgaben auf „unter" (echt kleiner) gegen „höchstens" (kleiner oder gleich).',
      },
      {
        titel: 'Mehrere Bedingungen',
        text: [
          'Mit `and` müssen beide Bedingungen zutreffen, mit `or` reicht eine. Du darfst beliebig viele verketten.',
          'Wenn du `and` und `or` mischst, setz Klammern. `or` bindet schwächer als `and`, und das führt regelmäßig zu Ergebnissen, die man nicht erwartet hat.',
        ],
        beispiel:
          "select marke, modell, baujahr, getriebe\nfrom fahrzeuge\nwhere getriebe = 'automatik'\n  and baujahr >= 2020;",
        beobachtung:
          'Nur junge Automatikfahrzeuge. Nimm mal die zweite Bedingung raus und sieh, wie die Liste wächst.',
      },
      {
        titel: 'ORDER BY sortiert',
        text: [
          '`order by` legt fest, in welcher Reihenfolge die Zeilen herauskommen. `asc` ist aufsteigend (und der Standard), `desc` absteigend.',
          'Du kannst mehrere Kriterien angeben. Das zweite entscheidet nur dann, wenn das erste gleich ist.',
        ],
        beispiel:
          'select marke, modell, preis\nfrom fahrzeuge\norder by marke asc, preis desc;',
        beobachtung:
          'Erst alphabetisch nach Marke, innerhalb einer Marke das teuerste Auto zuerst.',
        falle:
          'Ohne `order by` ist die Reihenfolge **nicht garantiert**. Sie sieht oft stabil aus, ist es aber nicht. Wenn eine Aufgabe eine Reihenfolge verlangt, musst du sie hinschreiben.',
      },
      {
        titel: 'Zusammenfassen statt auflisten',
        text: [
          'Manchmal willst du keine Zeilen sehen, sondern eine Zahl darüber. Dafür gibt es Aggregatfunktionen:',
          '`count(*)` zählt Zeilen, `sum(...)` addiert, `avg(...)` bildet den Durchschnitt, `min(...)` und `max(...)` finden den kleinsten und größten Wert.',
          'Eine Aggregatfunktion macht aus vielen Zeilen eine einzige.',
        ],
        beispiel:
          'select count(*) as anzahl,\n       round(avg(preis), 2) as schnitt,\n       min(preis) as guenstigstes,\n       max(preis) as teuerstes\nfrom fahrzeuge;',
        beobachtung:
          'Eine Zeile, vier Zahlen. `round(wert, 2)` schneidet die Nachkommastellen ab — ohne das bekommst du bei `avg` eine sehr lange Zahl.',
      },
      {
        titel: 'GROUP BY: pro Gruppe zusammenfassen',
        text: [
          'Spannend wird es, wenn du nicht über alles zusammenfasst, sondern pro Gruppe. `group by marke` bildet für jede Marke eine eigene Gruppe, und die Aggregatfunktion rechnet innerhalb jeder Gruppe.',
          'Die Regel dazu: Jede Spalte im `select`, die **keine** Aggregatfunktion ist, muss im `group by` stehen. Sonst weiß die Datenbank nicht, welchen der vielen Werte sie zeigen soll.',
        ],
        beispiel:
          'select marke,\n       count(*) as anzahl,\n       round(avg(preis), 2) as schnitt\nfrom fahrzeuge\ngroup by marke\norder by anzahl desc;',
        beobachtung:
          'Eine Zeile pro Marke statt eine pro Auto. Aus 21 Zeilen werden 9.',
      },
      {
        titel: 'HAVING filtert Gruppen',
        text: [
          '`where` filtert einzelne Zeilen, **bevor** gruppiert wird. Wenn du aber die fertigen Gruppen filtern willst — „nur Marken mit mindestens zwei Autos" — kommst du mit `where` nicht weiter, weil es die Gruppen zu dem Zeitpunkt noch nicht gibt.',
          'Dafür gibt es `having`. Es steht nach dem `group by` und darf Aggregatfunktionen verwenden.',
        ],
        beispiel:
          'select marke, count(*) as anzahl\nfrom fahrzeuge\ngroup by marke\nhaving count(*) >= 2\norder by anzahl desc, marke;',
        beobachtung:
          'Seat fliegt raus, weil es nur ein einziges Fahrzeug dieser Marke gibt. Lösch das `having` und vergleich.',
        falle:
          '`where count(*) >= 2` ist ein Fehler und wird von Postgres abgelehnt. Merksatz: `where` filtert Zeilen, `having` filtert Gruppen.',
      },
      {
        titel: 'Die Reihenfolge der Bausteine',
        text: [
          'Die Klauseln müssen in dieser Reihenfolge stehen, immer:',
          '`select` → `from` → `where` → `group by` → `having` → `order by` → `limit`',
          'Die Datenbank arbeitet sie allerdings in einer anderen Reihenfolge ab: erst `from`, dann `where`, dann `group by`, dann `having`, dann `select`, zuletzt `order by`. Deshalb kann `where` noch nichts von Aggregaten wissen — die entstehen erst später.',
        ],
        beispiel:
          "select getriebe, count(*) as anzahl\nfrom fahrzeuge\nwhere baujahr >= 2018\ngroup by getriebe\nhaving count(*) > 3\norder by anzahl desc\nlimit 5;",
        beobachtung:
          'Alle sechs Klauseln in einer Abfrage. Genau dieses Gerüst brauchst du für die meisten Aufgaben.',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────── Stufe 2
  {
    level: 2,
    titel: 'Zwei Tabellen verbinden',
    kurz: 'Fahrzeuge gehören jetzt Händlern. JOIN führt beides zusammen.',
    begriffe: ['JOIN', 'ON', 'Aliase', 'Fremdschlüssel'],
    abschnitte: [
      {
        titel: 'Warum es eine zweite Tabelle gibt',
        text: [
          'Ab dieser Stufe gibt es `haendler`. Man könnte Händlername und Stadt einfach in jede Fahrzeugzeile schreiben — aber dann stünde „Autohaus Brunner, München" fünfmal da, und beim Umzug müsste man fünf Zeilen ändern und würde eine vergessen.',
          'Stattdessen steht jeder Händler **einmal** in seiner eigenen Tabelle, und jedes Fahrzeug merkt sich nur die `id` seines Händlers. Diese verweisende Spalte heißt Fremdschlüssel: `fahrzeuge.haendler_id` zeigt auf `haendler.id`.',
        ],
        beispiel: 'select id, name, stadt from haendler;',
        beobachtung:
          'Fünf Händler. Merk dir die Spalte `id` — über die läuft gleich die Verbindung.',
      },
      {
        titel: 'JOIN führt zusammen',
        text: [
          '`join` klebt die passende Händlerzeile an jede Fahrzeugzeile. Das `on` sagt, woran „passend" erkannt wird: dort, wo die beiden Schlüssel übereinstimmen.',
          'Steht links und rechts eine Spalte mit demselben Namen — `id` gibt es in beiden Tabellen — musst du dazusagen, welche du meinst: `fahrzeuge.id` oder `haendler.id`.',
        ],
        beispiel:
          'select fahrzeuge.marke, fahrzeuge.modell, haendler.name, haendler.stadt\nfrom fahrzeuge\njoin haendler on haendler.id = fahrzeuge.haendler_id;',
        beobachtung:
          'Weiterhin 21 Zeilen, aber jetzt mit Händlerdaten daneben. Jedes Auto hat genau einen Händler, deshalb wächst die Zeilenzahl nicht.',
      },
      {
        titel: 'Aliase sparen Tipparbeit',
        text: [
          'Das ständige Ausschreiben der Tabellennamen wird schnell mühsam. Du kannst jeder Tabelle einen kurzen Namen geben, indem du ihn direkt hinter den Tabellennamen schreibst.',
          'Üblich sind ein oder zwei Buchstaben. Ab dann kannst du überall `f.` und `h.` schreiben.',
        ],
        beispiel:
          'select f.marke, f.modell, h.name, h.stadt\nfrom fahrzeuge f\njoin haendler h on h.id = f.haendler_id\norder by h.stadt, f.marke;',
        beobachtung:
          'Dasselbe Ergebnis wie vorher, nur kürzer geschrieben und sortiert. Aliase ändern nichts am Ergebnis.',
      },
      {
        titel: 'JOIN und GROUP BY zusammen',
        text: [
          'Sobald zwei Tabellen verbunden sind, kannst du ganz normal gruppieren. Das ist der häufigste Fall überhaupt: „wie viel hat jeder Händler auf dem Hof stehen".',
          'Gruppier dabei über `h.id` mit, nicht nur über den Namen. Zwei Händler könnten denselben Namen tragen — dann würden sie sonst zu einer Zeile zusammenfallen.',
        ],
        beispiel:
          'select h.name, h.stadt,\n       count(f.id) as anzahl,\n       sum(f.preis) as bestandswert\nfrom haendler h\njoin fahrzeuge f on f.haendler_id = h.id\ngroup by h.id, h.name, h.stadt\norder by bestandswert desc;',
        beobachtung:
          'Fünf Zeilen, eine pro Händler. Die Summe aller `anzahl`-Werte ergibt wieder 21.',
        falle:
          'Es ist egal, ob du `from fahrzeuge join haendler` oder `from haendler join fahrzeuge` schreibst — das Ergebnis ist dasselbe. Bei `left join` auf der nächsten Stufe ist das plötzlich **nicht** mehr egal.',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────── Stufe 3
  {
    level: 3,
    titel: 'Viele zu viele',
    kurz: 'Kunden und Anfragen. Mehrere JOINs, und warum Duplikate entstehen.',
    begriffe: ['Mehrfach-JOIN', 'DISTINCT', 'LIMIT', 'n:m'],
    abschnitte: [
      {
        titel: 'Eine Beziehung, die in keine Spalte passt',
        text: [
          'Ein Kunde kann mehrere Fahrzeuge anfragen. Ein Fahrzeug kann von mehreren Kunden angefragt werden. So etwas lässt sich nicht mit einer einzelnen Fremdschlüsselspalte abbilden — wohin sollte sie auch zeigen.',
          'Die Lösung ist eine dritte Tabelle dazwischen. `anfragen` enthält pro Anfrage eine Zeile mit `kunde_id` und `fahrzeug_id`. Sie verbindet die beiden Seiten und kann nebenbei eigene Informationen tragen, hier Datum und Status.',
        ],
        beispiel: 'select * from anfragen limit 8;',
        beobachtung:
          'Nur IDs und ein bisschen Zusatzinfo. Allein ist die Tabelle schwer zu lesen — sie ergibt erst mit JOINs Sinn.',
      },
      {
        titel: 'Zwei JOINs hintereinander',
        text: [
          'Um von Kunden zu Fahrzeugen zu kommen, gehst du über die Zwischentabelle: erst `kunden` an `anfragen`, dann `anfragen` an `fahrzeuge`.',
          'Du hängst einfach ein zweites `join` an. Jedes bringt seine eigene `on`-Bedingung mit.',
        ],
        beispiel:
          'select k.vorname, k.nachname, f.marke, f.modell, a.status\nfrom kunden k\njoin anfragen a on a.kunde_id = k.id\njoin fahrzeuge f on f.id = a.fahrzeug_id\norder by k.nachname\nlimit 10;',
        beobachtung:
          'Jetzt ist lesbar, wer was angefragt hat. `limit 10` schneidet nach zehn Zeilen ab.',
      },
      {
        titel: 'Warum plötzlich Namen doppelt auftauchen',
        text: [
          'Das Ergebnis hat jetzt **eine Zeile pro Anfrage**, nicht eine pro Kunde. Wer drei Autos angefragt hat, steht dreimal drin.',
          'Das ist kein Fehler, sondern genau das, was ein JOIN tut. Es wird nur dann zum Problem, wenn du eigentlich eine Liste von Kunden wolltest.',
        ],
        beispiel:
          "select k.vorname, k.nachname\nfrom kunden k\njoin anfragen a on a.kunde_id = k.id\njoin fahrzeuge f on f.id = a.fahrzeug_id\nwhere f.marke = 'Mercedes'\norder by k.nachname;",
        beobachtung:
          'Acht Zeilen, aber nur fünf verschiedene Personen. Lena und Jonas stehen mehrfach drin, weil sie mehrere Mercedes angefragt haben.',
      },
      {
        titel: 'DISTINCT wirft Dubletten weg',
        text: [
          '`select distinct` behält von identischen Ergebniszeilen nur eine. Es wirkt auf die **gesamte** Zeile, nicht auf einzelne Spalten.',
          'Das reicht hier, weil nach dem Weglassen der Fahrzeugspalten alle Zeilen desselben Kunden identisch aussehen.',
        ],
        beispiel:
          "select distinct k.vorname, k.nachname\nfrom kunden k\njoin anfragen a on a.kunde_id = k.id\njoin fahrzeuge f on f.id = a.fahrzeug_id\nwhere f.marke = 'Mercedes'\norder by k.nachname;",
        beobachtung: 'Fünf Zeilen statt acht. Jeder Kunde genau einmal.',
        falle:
          'Nimmst du eine Spalte dazu, in der sich die Zeilen unterscheiden — etwa `f.modell` — wirkt `distinct` nicht mehr, weil die Zeilen dann eben nicht mehr identisch sind. `distinct` ist kein „pro Kunde", sondern „keine doppelten Zeilen".',
      },
      {
        titel: 'Zählen statt auflisten',
        text: [
          'Oft ist die eigentliche Frage nicht „wer", sondern „wie viele". Dann gruppierst du wie auf Stufe 1 — der JOIN davor ändert daran nichts.',
          'Mit `order by ... desc limit 3` bekommst du eine Top-Liste. `limit` wird ganz zum Schluss angewendet, nach dem Sortieren.',
        ],
        beispiel:
          'select f.marke, f.modell, count(a.id) as anfragen\nfrom fahrzeuge f\njoin anfragen a on a.fahrzeug_id = f.id\ngroup by f.id, f.marke, f.modell\norder by anfragen desc, f.marke\nlimit 3;',
        beobachtung:
          'Die drei gefragtesten Fahrzeuge. Das zweite Sortierkriterium entscheidet bei Gleichstand — ohne das wäre die Reihenfolge zufällig.',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────── Stufe 4
  {
    level: 4,
    titel: 'NULL und was fehlt',
    kurz: 'Unbekannte Werte, und wie man findet, was gar nicht da ist.',
    begriffe: ['NULL', 'IS NULL', 'LEFT JOIN', 'COALESCE'],
    abschnitte: [
      {
        titel: 'NULL heißt „unbekannt"',
        text: [
          'Ab dieser Stufe haben Fahrzeuge die Spalten `tuev_bis` und `unfallfrei`. Bei manchen steht dort nichts — in SQL heißt das `NULL`.',
          '`NULL` ist nicht 0 und nicht der leere Text. Es bedeutet: Wir wissen es nicht. Der Unterschied ist wichtig. Ein Auto mit `unfallfrei = NULL` ist nicht „nicht unfallfrei", sondern „ungeprüft".',
        ],
        beispiel:
          'select marke, modell, tuev_bis, unfallfrei\nfrom fahrzeuge\norder by tuev_bis nulls first\nlimit 10;',
        beobachtung:
          'Die leeren Zellen sind NULL. `nulls first` holt sie nach oben — sonst sortiert Postgres sie ans Ende.',
      },
      {
        titel: 'NULL vergleicht sich mit nichts',
        text: [
          'Jeder Vergleich mit `NULL` ergibt wieder `NULL` — nicht wahr, nicht falsch. Und `where` lässt nur Zeilen durch, bei denen die Bedingung **wahr** ist.',
          'Deshalb findet `where unfallfrei = null` nichts, und `where tuev_bis < irgendwas` lässt alle NULL-Zeilen stillschweigend unter den Tisch fallen. Für den Test auf NULL gibt es `is null` und `is not null`.',
        ],
        beispiel:
          'select count(*) as gesamt,\n       count(tuev_bis) as mit_tuev,\n       count(*) filter (where tuev_bis is null) as ohne_tuev\nfrom fahrzeuge;',
        beobachtung:
          'Der Unterschied zwischen `count(*)` und `count(spalte)`: Ersteres zählt Zeilen, Letzteres zählt nur nicht-leere Werte. Das ist der einfachste Weg, NULLs zu zählen.',
        falle:
          'Der häufigste Fehler überhaupt: „alle Fahrzeuge, deren TÜV vor X abläuft **oder unbekannt ist**" braucht zwei Bedingungen. `where tuev_bis < date \'2026-06-01\'` allein verliert sechs Autos, ohne sich zu beschweren.',
      },
      {
        titel: 'COALESCE setzt einen Ersatzwert ein',
        text: [
          '`coalesce(a, b)` gibt `a` zurück, wenn es nicht NULL ist, sonst `b`. Damit machst du aus einer leeren Zelle eine lesbare Angabe.',
          'Die Typen müssen zusammenpassen. Ein Datum lässt sich nicht direkt durch den Text „unbekannt" ersetzen — wandle es vorher mit `to_char` in Text um.',
        ],
        beispiel:
          "select marke, modell,\n       coalesce(to_char(tuev_bis, 'MM/YYYY'), 'unbekannt') as tuev,\n       coalesce(unfallfrei::text, 'ungeprüft') as unfall\nfrom fahrzeuge\nlimit 10;",
        beobachtung:
          'Keine leeren Zellen mehr. `::text` wandelt den Wahrheitswert in Text um, damit COALESCE beide Seiten vergleichen kann.',
      },
      {
        titel: 'LEFT JOIN behält, was keinen Partner hat',
        text: [
          'Ein normaler `join` wirft jede Zeile weg, die drüben keine Entsprechung findet. Wenn du wissen willst, welche Händler **kein** Fahrzeug haben, ist das genau das Falsche — die fliegen raus, bevor du sie sehen kannst.',
          '`left join` behält alle Zeilen der linken Tabelle. Findet sich rechts nichts, füllt Postgres die rechten Spalten mit NULL auf.',
          'Ab jetzt ist die Reihenfolge der Tabellen entscheidend: „links" ist die Tabelle im `from`.',
        ],
        beispiel:
          'select h.name, h.stadt, f.marke, f.modell\nfrom haendler h\nleft join fahrzeuge f on f.haendler_id = h.id\norder by h.name;',
        beobachtung:
          'Zwei Händler (Bremen und Dortmund) tauchen mit leeren Fahrzeugspalten auf. Mit einem normalen `join` wären sie verschwunden.',
      },
      {
        titel: 'Der Trick: LEFT JOIN plus IS NULL',
        text: [
          'Aus der vorigen Abfrage wird ein Werkzeug, sobald du auf die aufgefüllten NULLs filterst. „Die rechte Seite ist NULL" heißt genau: Hier gab es keinen Partner.',
          'Das ist das Standardmuster für „was fehlt": Händler ohne Fahrzeuge, Kunden ohne Anfragen, Bestellungen ohne Zahlung.',
        ],
        beispiel:
          'select h.name, h.stadt\nfrom haendler h\nleft join fahrzeuge f on f.haendler_id = h.id\nwhere f.id is null\norder by h.name;',
        beobachtung:
          'Genau die zwei Händler ohne Bestand. Prüf immer auf eine Spalte, die niemals NULL sein kann — der Primärschlüssel `id` eignet sich dafür am besten.',
        falle:
          'Schreib die Einschränkung der rechten Tabelle ins `on`, nicht ins `where`. Ein `where f.marke = \'BMW\'` nach einem LEFT JOIN macht daraus wieder einen normalen JOIN, weil die aufgefüllten NULL-Zeilen die Bedingung nicht erfüllen.',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────── Stufe 5
  {
    level: 5,
    titel: 'Zeitverläufe und Fensterfunktionen',
    kurz: 'Preishistorie: Datumsfunktionen, und rechnen ohne zu gruppieren.',
    begriffe: ['TO_CHAR', 'OVER', 'PARTITION BY', 'WITH'],
    abschnitte: [
      {
        titel: 'Eine Zeile pro Änderung',
        text: [
          'Die Tabelle `preis_historie` speichert jede Preisanpassung als eigene Zeile, mit dem Datum, ab dem sie gilt. Ein Auto, dessen Preis dreimal gesenkt wurde, hat dort drei Einträge.',
          'So ein Verlauf ist der Normalfall in echten Systemen. Der aktuelle Preis ist nicht gespeichert, sondern der Eintrag mit dem jüngsten Datum.',
        ],
        beispiel:
          'select * from preis_historie\nwhere fahrzeug_id = 1\norder by gueltig_ab;',
        beobachtung: 'Drei Einträge für ein einziges Auto — von 14.500 auf 12.900 €.',
      },
      {
        titel: 'Mit Datumsangaben rechnen',
        text: [
          '`to_char(datum, muster)` formt ein Datum in Text um. `\'YYYY-MM\'` ergibt einen Monatsschlüssel, mit dem sich gut gruppieren lässt.',
          'Umgekehrt liefert `date \'2025-01-01\'` ein echtes Datum aus Text. Und die Differenz zweier Daten ergibt die Anzahl Tage dazwischen.',
        ],
        beispiel:
          "select to_char(gueltig_ab, 'YYYY-MM') as monat,\n       count(*) as aenderungen\nfrom preis_historie\ngroup by to_char(gueltig_ab, 'YYYY-MM')\norder by monat;",
        beobachtung:
          'Preisänderungen pro Monat. Denk daran: Was im `select` berechnet wird, muss genauso im `group by` stehen.',
      },
      {
        titel: 'Das Problem mit GROUP BY',
        text: [
          '`group by` fasst Zeilen zusammen — und danach sind die Einzelzeilen weg. Wenn du aber sowohl den Einzelwert **als auch** etwas über die ganze Gruppe brauchst, ist das hinderlich.',
          'Beispiel: „Zeig jeden Preiseintrag und daneben den ersten Preis dieses Fahrzeugs." Mit `group by` bekommst du entweder das eine oder das andere.',
        ],
      },
      {
        titel: 'OVER rechnet, ohne zusammenzufassen',
        text: [
          'Eine Fensterfunktion rechnet über eine Gruppe von Zeilen, behält aber jede Zeile einzeln. Das Fenster definierst du mit `over (...)`.',
          '`partition by fahrzeug_id` bildet ein eigenes Fenster je Fahrzeug — das entspricht dem `group by`. `order by` **innerhalb** des `over` legt fest, in welcher Reihenfolge innerhalb des Fensters gerechnet wird.',
        ],
        beispiel:
          'select fahrzeug_id, gueltig_ab, preis,\n       count(*) over (partition by fahrzeug_id) as eintraege,\n       row_number() over (partition by fahrzeug_id order by gueltig_ab) as nr\nfrom preis_historie\norder by fahrzeug_id, gueltig_ab\nlimit 12;',
        beobachtung:
          'Alle Einzelzeilen bleiben erhalten, aber jede weiß jetzt, wie viele Einträge ihr Fahrzeug hat und die wievielte sie ist.',
      },
      {
        titel: 'Den ersten und letzten Wert greifen',
        text: [
          '`first_value(spalte) over (partition by ... order by ...)` gibt den Wert aus der ersten Zeile des Fensters.',
          'Für den letzten Wert drehst du die Sortierung im `over` einfach um — dann ist der letzte der erste. Das ist bequemer als `last_value`, das zusätzliche Angaben zum Fensterrahmen bräuchte.',
          'Nützliche Nachbarn: `rank()` vergibt Ränge (mit Lücken bei Gleichstand), `lag(spalte)` holt den Wert der vorigen Zeile.',
        ],
        beispiel:
          'select fahrzeug_id, gueltig_ab, preis,\n       first_value(preis) over (partition by fahrzeug_id order by gueltig_ab asc)  as start_preis,\n       first_value(preis) over (partition by fahrzeug_id order by gueltig_ab desc) as akt_preis\nfrom preis_historie\norder by fahrzeug_id, gueltig_ab\nlimit 12;',
        beobachtung:
          'Start- und Endpreis stehen in jeder Zeile desselben Fahrzeugs — deshalb wiederholen sie sich.',
      },
      {
        titel: 'WITH macht lange Abfragen lesbar',
        text: [
          'Fensterfunktionen darfst du nicht im `where` verwenden, weil sie erst nach dem Filtern berechnet werden. Du musst die Abfrage also in zwei Schritte teilen.',
          '`with name as ( ... )` definiert ein Zwischenergebnis, auf das du danach zugreifst wie auf eine Tabelle. Das ist der saubere Weg, „erst rechnen, dann filtern" hinzuschreiben.',
        ],
        beispiel:
          'with verlauf as (\n  select fahrzeug_id,\n         first_value(preis) over (partition by fahrzeug_id order by gueltig_ab asc)  as start_preis,\n         first_value(preis) over (partition by fahrzeug_id order by gueltig_ab desc) as akt_preis,\n         count(*) over (partition by fahrzeug_id) as eintraege\n  from preis_historie\n)\nselect distinct f.marke, f.modell,\n       v.start_preis, v.akt_preis,\n       v.start_preis - v.akt_preis as nachlass\nfrom verlauf v\njoin fahrzeuge f on f.id = v.fahrzeug_id\nwhere v.eintraege > 1\norder by nachlass desc;',
        beobachtung:
          'Erst der Block mit den Fensterfunktionen, dann das Filtern darauf. Nur Fahrzeuge mit mehr als einem Eintrag bleiben übrig.',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────── Stufe 6
  {
    level: 6,
    titel: 'Dreckige Daten aufräumen',
    kurz: 'Ein roher Import mit Dubletten. Finden, zählen, bereinigen.',
    begriffe: ['LOWER', 'TRIM', 'HAVING', 'DISTINCT ON'],
    abschnitte: [
      {
        titel: 'So sehen echte Daten aus',
        text: [
          'Die Tabelle `leads` ist ein Import aus drei Quellen: Messe, Website, Telefon. Niemand hat sich abgestimmt.',
          'Dieselbe Person steht mehrfach drin — mal groß, mal klein geschrieben, mal mit Leerzeichen am Rand. Manchmal fehlt der Name. Das ist nicht konstruiert, sondern der Normalfall, sobald Daten aus mehr als einer Quelle kommen.',
        ],
        beispiel: 'select * from leads order by email;',
        beobachtung:
          'Fünfzehn Zeilen. Schau dir die E-Mail-Adressen genau an — wie viele verschiedene Personen sind das wirklich?',
      },
      {
        titel: 'Erst normalisieren, dann vergleichen',
        text: [
          'Für die Datenbank sind `Lena.Hofmann@web.de` und `lena.hofmann@web.de` zwei völlig verschiedene Texte. Beim Vergleichen zählt jedes Zeichen.',
          '`lower(text)` macht alles klein, `trim(text)` entfernt Leerzeichen am Anfang und Ende. Beide zusammen ergeben eine vergleichbare Form. Verschachteln ist erlaubt: `lower(trim(email))`.',
        ],
        beispiel:
          'select email, lower(trim(email)) as bereinigt\nfrom leads\norder by bereinigt;',
        beobachtung:
          'Links das Original, rechts die bereinigte Form. Jetzt sieht man, welche Zeilen zusammengehören.',
      },
      {
        titel: 'Dubletten finden',
        text: [
          'Sobald es eine vergleichbare Form gibt, ist das Finden von Dubletten dasselbe Muster wie auf Stufe 1: gruppieren und die Gruppen mit mehr als einem Mitglied behalten.',
          'Wichtig ist nur, dass du über den **bereinigten** Ausdruck gruppierst, nicht über die Rohspalte.',
        ],
        beispiel:
          'select lower(trim(email)) as email,\n       count(*) as eintraege\nfrom leads\ngroup by lower(trim(email))\nhaving count(*) > 1\norder by eintraege desc;',
        beobachtung:
          'Fünf Adressen kommen mehrfach vor. Gruppier zum Vergleich mal über `email` statt über den bereinigten Ausdruck — dann findet er fast nichts.',
      },
      {
        titel: 'DISTINCT ON behält eine Zeile pro Gruppe',
        text: [
          'Finden ist die eine Hälfte, Aufräumen die andere. Du willst pro Person genau einen Eintrag behalten — sinnvollerweise den ältesten, weil der den ersten Kontakt dokumentiert.',
          '`distinct on (ausdruck)` ist eine Postgres-Besonderheit: Es behält pro Gruppe die **erste** Zeile. Welche das ist, entscheidet dein `order by` — und das muss mit demselben Ausdruck beginnen.',
        ],
        beispiel:
          'select distinct on (lower(trim(email)))\n       lower(trim(email)) as email,\n       name, quelle, erfasst_am\nfrom leads\norder by lower(trim(email)), erfasst_am asc;',
        beobachtung:
          'Acht Zeilen statt fünfzehn. Dreh `erfasst_am asc` auf `desc` — dann bekommst du den jeweils neuesten Eintrag.',
        falle:
          'Beginnt das `order by` nicht mit dem Ausdruck aus `distinct on`, lehnt Postgres die Abfrage ab. Und ohne ein zweites Sortierkriterium ist willkürlich, welche Zeile überlebt.',
      },
      {
        titel: 'Der Weg, der überall funktioniert',
        text: [
          '`distinct on` gibt es nur in Postgres. Dasselbe erreichst du mit einer Fensterfunktion: Nummeriere die Zeilen je Gruppe durch und behalte die Nummer 1.',
          'Das ist etwas länger, funktioniert aber in jeder Datenbank — und lässt sich leichter erweitern, wenn du etwa die zwei jüngsten Einträge behalten willst.',
        ],
        beispiel:
          'with nummeriert as (\n  select lower(trim(email)) as email, name, quelle, erfasst_am,\n         row_number() over (\n           partition by lower(trim(email))\n           order by erfasst_am asc\n         ) as nr\n  from leads\n)\nselect email, name, quelle, erfasst_am\nfrom nummeriert\nwhere nr = 1\norder by email;',
        beobachtung:
          'Dasselbe Ergebnis wie mit `distinct on`. Ändere `where nr = 1` auf `where nr <= 2` und du behältst die zwei ältesten pro Person.',
      },
    ],
  },
  // ─────────────────────────────────────────────────────────────── Stufe 7
  {
    level: 7,
    titel: 'Abfragen in Abfragen',
    kurz: 'Unterabfragen, EXISTS, Fallunterscheidungen und Mengenoperationen.',
    begriffe: ['Unterabfrage', 'EXISTS', 'CASE', 'UNION'],
    abschnitte: [
      {
        titel: 'Ein Wert, der selbst berechnet wird',
        text: [
          'Bisher standen in deinen Bedingungen feste Werte: `preis < 15000`. Manchmal kennst du den Vergleichswert aber vorher gar nicht — „teurer als der Durchschnitt" hängt vom Bestand ab.',
          'Eine Abfrage in Klammern darf überall stehen, wo ein Wert erwartet wird. Liefert sie genau eine Zeile mit einer Spalte, verhält sie sich wie eine Zahl.',
        ],
        beispiel:
          'select marke, modell, preis\nfrom fahrzeuge\nwhere preis > (select avg(preis) from fahrzeuge)\norder by preis desc;',
        beobachtung:
          'Die innere Abfrage läuft einmal und liefert den Durchschnitt. Führ sie mal allein aus, um den Wert zu sehen.',
        falle:
          'Liefert die Unterabfrage mehr als eine Zeile, bricht Postgres ab. Für Vergleiche mit mehreren Werten brauchst du `in (...)` statt `=`.',
      },
      {
        titel: 'IN und EXISTS: gibt es überhaupt etwas?',
        text: [
          '`spalte in (select ...)` prüft, ob ein Wert in einer Ergebnismenge vorkommt. Das kennst du im Prinzip schon von `in (1, 2, 3)`.',
          '`exists (select ...)` fragt etwas anderes: Kommt überhaupt irgendeine Zeile zurück? Der Inhalt ist egal, deshalb schreibt man üblicherweise `select 1`. Die innere Abfrage darf dabei auf die äußere zugreifen.',
          '`not exists` ist oft die klarste Art, „hat keinen Partner" auszudrücken — die Alternative zum LEFT JOIN von Stufe 4.',
        ],
        beispiel:
          'select h.name, h.stadt\nfrom haendler h\nwhere not exists (\n  select 1 from fahrzeuge f where f.haendler_id = h.id\n)\norder by h.name;',
        beobachtung:
          'Dasselbe Ergebnis wie mit LEFT JOIN plus IS NULL. Welche Schreibweise du nimmst, ist Geschmackssache.',
        falle:
          '`not in` und NULL vertragen sich nicht. Enthält die Liste auch nur ein NULL, ist das Ergebnis für jede Zeile NULL — und du bekommst gar nichts zurück, ohne Fehlermeldung. `not exists` hat dieses Problem nicht.',
      },
      {
        titel: 'CASE: Wenn-dann im SELECT',
        text: [
          '`case when bedingung then wert when ... else ... end` ist die Fallunterscheidung von SQL. Die Bedingungen werden von oben nach unten geprüft, die erste zutreffende gewinnt.',
          'Damit lassen sich Rohwerte in Kategorien übersetzen — aus einem Preis wird eine Preisklasse, aus einem Datum eine Ampelfarbe.',
        ],
        beispiel:
          "select marke, modell, preis,\n       case\n         when preis < 10000 then 'günstig'\n         when preis < 20000 then 'mittel'\n         else 'gehoben'\n       end as klasse\nfrom fahrzeuge\norder by preis;",
        beobachtung:
          'Weil die Fälle der Reihe nach geprüft werden, braucht die zweite Bedingung kein „und mindestens 10.000" — dieser Fall ist oben schon abgefangen.',
      },
      {
        titel: 'Bedingt zählen',
        text: [
          'Richtig nützlich wird CASE zusammen mit Aggregaten. Statt mehrerer Abfragen bekommst du mehrere Kennzahlen in einer Zeile.',
          'Postgres bietet dafür zusätzlich die kürzere Schreibweise `count(*) filter (where bedingung)`. Beide Wege führen zum selben Ergebnis.',
        ],
        beispiel:
          "select marke,\n       count(*) as gesamt,\n       count(*) filter (where getriebe = 'automatik') as automatik,\n       sum(case when baujahr >= 2020 then 1 else 0 end) as ab_2020\nfrom fahrzeuge\ngroup by marke\norder by gesamt desc, marke;",
        beobachtung:
          'Zwei Schreibweisen für dasselbe Prinzip — einmal mit FILTER, einmal mit CASE in einer Summe.',
      },
      {
        titel: 'Ergebnisse zusammenführen',
        text: [
          'Ab dieser Stufe gibt es `fahrzeuge_archiv` mit bereits verkauften Autos. Beide Tabellen haben dieselbe Struktur — das ist die Voraussetzung dafür, ihre Ergebnisse zu stapeln.',
          '`union all` hängt zwei Ergebnisse aneinander. `union` tut dasselbe, entfernt aber doppelte Zeilen und ist dadurch langsamer. `except` zieht ab, `intersect` behält nur die Schnittmenge.',
          'Alle drei verlangen dieselbe Spaltenanzahl mit passenden Typen. Ein `order by` gilt fürs Gesamtergebnis und steht ganz am Ende.',
        ],
        beispiel:
          "select marke, modell, preis, 'verfügbar' as status from fahrzeuge\nunion all\nselect marke, modell, preis, 'verkauft' as status from fahrzeuge_archiv\norder by preis desc\nlimit 12;",
        beobachtung:
          'Beide Bestände in einer Liste. Die Statusspalte ist ein fester Text, den du einfach in den SELECT schreibst.',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────── Stufe 8
  {
    level: 8,
    titel: 'Daten verändern',
    kurz: 'Zeilen anlegen, ändern und löschen — und wie man dabei nichts kaputt macht.',
    begriffe: ['INSERT', 'UPDATE', 'DELETE', 'DEFAULT'],
    abschnitte: [
      {
        titel: 'Hier passiert nichts Schlimmes',
        text: [
          'Bis jetzt hast du nur gelesen. Ab dieser Stufe veränderst du Daten — und das fühlt sich zu Recht anders an.',
          'In diesem Trainer ist es gefahrlos: Jede Ausführung läuft in einer Transaktion, die danach zurückgerollt wird. Dein `delete` wirkt für die Dauer der Prüfung und ist danach spurlos weg. Auch ein `drop table` überlebt keine Sekunde.',
          'Neu dabei ist die Tabelle `merkliste`. Sie ist leer — du füllst sie selbst.',
        ],
        beispiel: 'select * from merkliste;',
        darfLeerSein: true,
        beobachtung:
          'Null Zeilen, aber die Spalten sind da. Beachte `prioritaet` und `gesetzt_am`: Die haben Standardwerte.',
      },
      {
        titel: 'INSERT legt Zeilen an',
        text: [
          '`insert into tabelle (spalten…) values (werte…);` — die Werte werden der Reihe nach den genannten Spalten zugeordnet.',
          'Spalten, die du weglässt, bekommen ihren Standardwert. `prioritaet` wird ohne Angabe zu 3, `gesetzt_am` zum heutigen Datum, und `id` zählt automatisch hoch.',
          'Mit mehreren Klammern hintereinander legst du mehrere Zeilen auf einmal an.',
        ],
        beispiel:
          "insert into merkliste (kunde_id, fahrzeug_id, notiz) values\n  (1, 8, 'Farbe passt'),\n  (2, 6, 'Preis beobachten');\n\nselect kunde_id, fahrzeug_id, notiz, prioritaet, gesetzt_am from merkliste;",
        beobachtung:
          'Zwei Zeilen, obwohl du `prioritaet` und `gesetzt_am` nie erwähnt hast. Genau dafür sind Standardwerte da.',
      },
      {
        titel: 'INSERT aus einer Abfrage',
        text: [
          'Statt `values` darf hinter dem INSERT auch direkt ein `select` stehen. Damit füllst du eine Tabelle aus vorhandenen Daten, ohne einen einzigen Wert abzutippen.',
          'Die Spalten des SELECT müssen in Reihenfolge und Typ zu den Zielspalten passen. Feste Werte schreibst du einfach als zusätzliche Spalte hin.',
        ],
        beispiel:
          "insert into merkliste (kunde_id, fahrzeug_id, notiz, prioritaet)\nselect a.kunde_id, a.fahrzeug_id, 'aus offener Anfrage', 2\nfrom anfragen a\nwhere a.status = 'offen';\n\nselect kunde_id, fahrzeug_id, notiz, prioritaet from merkliste order by kunde_id;",
        beobachtung:
          'Acht Zeilen aus einer einzigen Anweisung. Das ist der übliche Weg, Daten von einer Tabelle in eine andere zu übernehmen.',
      },
      {
        titel: 'UPDATE ändert vorhandene Zeilen',
        text: [
          '`update tabelle set spalte = wert where bedingung;` Der neue Wert darf sich auf den alten beziehen: `preis = preis * 0.9` senkt um zehn Prozent.',
          'Mehrere Spalten trennst du durch Komma: `set preis = …, farbe = …`.',
        ],
        beispiel:
          'update fahrzeuge\nset preis = preis * 0.92\nwhere km_stand > 150000;\n\nselect marke, modell, km_stand, preis\nfrom fahrzeuge\nwhere km_stand > 150000;',
        beobachtung:
          'Gerundet wird automatisch — die Spalte ist `numeric(10,2)` und lässt gar nicht mehr Nachkommastellen zu.',
        falle:
          'Ein `update` ohne `where` trifft **jede einzelne Zeile** der Tabelle. Das ist der klassische Weg, an einem Dienstagnachmittag eine Produktionsdatenbank zu ruinieren. Schreib das `where` zuerst, dann den Rest.',
      },
      {
        titel: 'DELETE, und die Gewohnheit, die dich rettet',
        text: [
          '`delete from tabelle where bedingung;` löscht ganze Zeilen. Auch hier gilt: ohne `where` ist die Tabelle leer.',
          'Die Angewohnheit, die sich im Berufsleben auszahlt: Formulier die Bedingung erst als `select` und schau dir an, was du triffst. Passt das Ergebnis, tauschst du nur `select *` gegen `delete`.',
          'Außerdem schützen Fremdschlüssel. Der Versuch, einen Kunden zu löschen, auf den noch Anfragen verweisen, wird abgelehnt — probier es im Beispiel ruhig aus.',
        ],
        beispiel:
          "-- Erst schauen:\nselect * from anfragen\nwhere status = 'abgelehnt' and gestellt_am < date '2025-01-01';\n\n-- Dann erst löschen:\ndelete from anfragen\nwhere status = 'abgelehnt' and gestellt_am < date '2025-01-01';\n\nselect count(*) as verbleibend from anfragen;",
        beobachtung:
          'Von 21 Anfragen bleiben 19. Ersetz die Datumsbedingung mal durch nichts und sieh, wie viele dann verschwinden.',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────── Stufe 9
  {
    level: 9,
    titel: 'Tabellen selbst bauen',
    kurz: 'CREATE TABLE, Regeln, die die Datenbank erzwingt, und Views.',
    begriffe: ['CREATE TABLE', 'NOT NULL', 'CHECK', 'VIEW'],
    abschnitte: [
      {
        titel: 'Diese Stufe bringt nichts mit',
        text: [
          'Alle bisherigen Stufen haben dir Tabellen hingestellt. Auf dieser legst du selbst welche an.',
          'Der Datenstand ist derselbe wie auf Stufe 8, plus das, was du baust. Wie überall gilt: Alles wird nach der Prüfung zurückgerollt, du kannst nichts dauerhaft anrichten.',
        ],
      },
      {
        titel: 'CREATE TABLE',
        text: [
          'Eine Tabelle definierst du als Liste von Spalten, jede mit einem Namen und einem Typ. Die wichtigsten: `int` für ganze Zahlen, `numeric(10,2)` für Geldbeträge, `text`, `date`, `timestamp` und `boolean`.',
          '`serial` ist kein eigener Typ, sondern eine Abkürzung: eine ganze Zahl, die automatisch hochzählt. Genau das will man fast immer für eine `id`.',
        ],
        beispiel:
          'create table probefahrten (\n  id          serial primary key,\n  fahrzeug_id int  not null,\n  name        text not null,\n  termin      date not null,\n  bemerkung   text\n);\n\nselect column_name, data_type, is_nullable\nfrom information_schema.columns\nwhere table_name = \'probefahrten\'\norder by ordinal_position;',
        beobachtung:
          'Die letzte Abfrage liest den Systemkatalog aus — dort steht, was die Datenbank über sich selbst weiß. Genau damit prüft der Trainer deine Lösung.',
      },
      {
        titel: 'Regeln, an die sich niemand vorbeischummeln kann',
        text: [
          'Ein Constraint ist eine Bedingung, die die Datenbank selbst durchsetzt. Sie gilt unabhängig davon, welches Programm gerade schreibt — und das ist der Punkt: Anwendungscode kann man vergessen, ein Constraint nicht.',
          '`primary key` macht eine Spalte eindeutig und zum Bezugspunkt. `not null` verlangt einen Wert. `unique` verbietet Doppelte. `check (bedingung)` erlaubt nur, was die Bedingung erfüllt. `references tabelle(spalte)` erzwingt, dass der Verweis auf eine existierende Zeile zeigt.',
        ],
        beispiel:
          "create table bewertungen (\n  id          serial primary key,\n  haendler_id int  not null references haendler(id),\n  sterne      int  not null check (sterne between 1 and 5),\n  text        text\n);\n\n-- Das hier wird die Datenbank ablehnen:\ninsert into bewertungen (haendler_id, sterne) values (1, 9);",
        darfScheitern: true,
        beobachtung:
          'Der INSERT scheitert an der CHECK-Regel – genau so soll es sein. Ändere die 9 auf eine 4 und er geht durch. Probier auch mal `haendler_id` 99, dann greift der Fremdschlüssel.',
      },
      {
        titel: 'Standardwerte',
        text: [
          '`default wert` füllt eine Spalte, wenn beim INSERT nichts angegeben wird. Das kennst du schon von der `merkliste` auf Stufe 8.',
          'Als Standard sind auch Funktionen erlaubt: `current_date` für das heutige Datum, `now()` für den Zeitpunkt. Sie werden bei jedem INSERT neu ausgewertet, nicht einmal beim Anlegen der Tabelle.',
        ],
        beispiel:
          "create table newsletter (\n  id            serial primary key,\n  email         text    not null unique,\n  bestaetigt    boolean not null default false,\n  angemeldet_am date    not null default current_date\n);\n\ninsert into newsletter (email) values ('test@example.com');\nselect * from newsletter;",
        beobachtung:
          'Du hast nur die E-Mail angegeben, trotzdem sind alle vier Spalten gefüllt. Führ den INSERT zweimal aus — beim zweiten Mal greift UNIQUE.',
      },
      {
        titel: 'Views: eine Abfrage unter einem Namen',
        text: [
          'Eine View speichert keine Daten, sondern eine Abfrage. Bei jedem Zugriff läuft sie neu und liefert den aktuellen Stand.',
          'Das lohnt sich für Abfragen, die man ständig braucht — ein mehrfacher JOIN wird zu einem einzigen Tabellennamen. Danach kannst du eine View verwenden wie jede andere Tabelle, inklusive `where` und `join`.',
        ],
        beispiel:
          'create view bestand_uebersicht as\nselect f.marke, f.modell, f.preis, h.name, h.stadt\nfrom fahrzeuge f\njoin haendler h on h.id = f.haendler_id;\n\nselect * from bestand_uebersicht\nwhere stadt = \'Muenchen\'\norder by preis desc;',
        beobachtung:
          'Die zweite Abfrage sieht aus, als gäbe es eine Tabelle `bestand_uebersicht` — dahinter läuft aber jedes Mal der JOIN.',
      },
    ],
  },
];

export const lektionFuerLevel = (level: number) =>
  lektionen.find((l) => l.level === level);
