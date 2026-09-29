/**
 * Der Spickzettel: die Syntax aller Stufen zum Nachschlagen, ohne Lehrtext.
 *
 * Jedes Beispiel ist echtes SQL und laeuft gegen den Datenstand seiner Stufe.
 * Die Tests (test/aufgaben.test.ts) fuehren alle Beispiele aus - ein Beispiel,
 * das auf eine Spalte zeigt, die es auf der Stufe noch nicht gibt, faellt auf.
 */

export type SpickEintrag = {
  titel: string;
  /** Die allgemeine Form. Grossbuchstaben = Schluesselwort, Kleinbuchstaben = Platzhalter. */
  syntax: string;
  /** Lauffaehiges Beispiel am Datensatz. */
  beispiel: string;
  /** Die eine Sache, die man sich merken sollte. `code` und **fett** werden ausgezeichnet. */
  merke?: string;
};

export type SpickKapitel = {
  level: number;
  titel: string;
  eintraege: SpickEintrag[];
};

export const spickzettel: SpickKapitel[] = [
  {
    level: 1,
    titel: 'Eine Tabelle abfragen',
    eintraege: [
      {
        titel: 'Spalten auswählen',
        syntax: 'SELECT spalte1, spalte2 FROM tabelle;',
        beispiel: 'select brand, model, price from cars;',
        merke: '`*` heißt „alle Spalten“. Die Reihenfolge im SELECT ist die Reihenfolge im Ergebnis.',
      },
      {
        titel: 'Zeilen filtern',
        syntax: 'SELECT … FROM tabelle\nWHERE bedingung AND/OR bedingung;',
        beispiel: "select brand, model from cars\nwhere price < 15000 and transmission = 'manual';",
        merke:
          'Text in **einfachen** Anführungszeichen. `<>` heißt ungleich. Bei gemischtem `and`/`or` Klammern setzen.',
      },
      {
        titel: 'IN, BETWEEN, LIKE',
        syntax:
          "WHERE spalte IN (wert1, wert2)\nWHERE spalte BETWEEN von AND bis\nWHERE spalte LIKE 'A%'",
        beispiel:
          "select brand, model, year from cars\nwhere color in ('red', 'blue')\n  and year between 2018 and 2020;",
        merke:
          '`between` schließt beide Grenzen ein. `%` = beliebig viele Zeichen, `_` = genau eines. `ilike` ignoriert Groß-/Kleinschreibung.',
      },
      {
        titel: 'Sortieren und begrenzen',
        syntax: 'ORDER BY spalte1 ASC, spalte2 DESC\nLIMIT n',
        beispiel: 'select brand, model, price from cars\norder by brand, price desc\nlimit 5;',
        merke: 'Ohne `order by` ist die Reihenfolge **nicht garantiert**.',
      },
      {
        titel: 'Aggregatfunktionen',
        syntax: 'count(*)  sum(x)  avg(x)  min(x)  max(x)\nround(wert, stellen)',
        beispiel:
          'select count(*) as total, round(avg(price), 2) as avg_price,\n       min(price), max(price)\nfrom cars;',
        merke: 'Eine Aggregatfunktion macht aus vielen Zeilen eine.',
      },
      {
        titel: 'Gruppieren',
        syntax: 'SELECT gruppe, count(*)\nFROM tabelle\nGROUP BY gruppe\nHAVING count(*) >= 2;',
        beispiel:
          'select brand, count(*) as total\nfrom cars\ngroup by brand\nhaving count(*) >= 2\norder by total desc;',
        merke:
          'Jede Spalte im SELECT ohne Aggregat muss ins `group by`. `where` filtert Zeilen, `having` filtert Gruppen.',
      },
      {
        titel: 'Reihenfolge der Klauseln',
        syntax: 'SELECT → FROM → WHERE → GROUP BY → HAVING → ORDER BY → LIMIT',
        beispiel:
          'select transmission, count(*) as total\nfrom cars\nwhere year >= 2018\ngroup by transmission\nhaving count(*) > 3\norder by total desc\nlimit 5;',
        merke:
          'Ausgeführt wird anders: FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT. Deshalb kennt `where` keine Aliase aus dem SELECT.',
      },
    ],
  },
  {
    level: 2,
    titel: 'Tabellen verbinden',
    eintraege: [
      {
        titel: 'JOIN',
        syntax: 'SELECT …\nFROM tabelle_a a\nJOIN tabelle_b b ON b.id = a.b_id;',
        beispiel:
          'select c.brand, c.model, d.name, d.city\nfrom cars c\njoin dealers d on d.id = c.dealer_id;',
        merke:
          'Der Fremdschlüssel (`cars.dealer_id`) zeigt auf den Primärschlüssel (`dealers.id`). Gleichnamige Spalten mit Tabelle oder Alias qualifizieren.',
      },
      {
        titel: 'JOIN mit GROUP BY',
        syntax: 'SELECT b.name, count(a.id)\nFROM b JOIN a ON a.b_id = b.id\nGROUP BY b.id, b.name;',
        beispiel:
          'select d.name, count(c.id) as total, sum(c.price) as stock_value\nfrom dealers d\njoin cars c on c.dealer_id = d.id\ngroup by d.id, d.name\norder by stock_value desc;',
        merke: 'Über die `id` mitgruppieren – zwei Händler könnten gleich heißen.',
      },
    ],
  },
  {
    level: 3,
    titel: 'Mehrere JOINs',
    eintraege: [
      {
        titel: 'Über eine Zwischentabelle (n:m)',
        syntax: 'FROM a\nJOIN zwischen z ON z.a_id = a.id\nJOIN b ON b.id = z.b_id',
        beispiel:
          'select cu.first_name, cu.last_name, c.brand, c.model\nfrom customers cu\njoin inquiries i on i.customer_id = cu.id\njoin cars c on c.id = i.car_id;',
        merke: 'Jedes JOIN bringt seine eigene `on`-Bedingung mit.',
      },
      {
        titel: 'DISTINCT',
        syntax: 'SELECT DISTINCT spalte1, spalte2 FROM …',
        beispiel:
          "select distinct cu.first_name, cu.last_name\nfrom customers cu\njoin inquiries i on i.customer_id = cu.id\njoin cars c on c.id = i.car_id\nwhere c.brand = 'Mercedes';",
        merke: 'JOINs vervielfachen Zeilen. `distinct` wirft vollständig gleiche Zeilen weg.',
      },
      {
        titel: 'Verschiedene zählen',
        syntax: 'count(DISTINCT spalte)',
        beispiel:
          'select c.brand, c.model, count(distinct i.customer_id) as customers\nfrom cars c\njoin inquiries i on i.car_id = c.id\ngroup by c.id, c.brand, c.model;',
      },
    ],
  },
  {
    level: 4,
    titel: 'NULL',
    eintraege: [
      {
        titel: 'Auf NULL prüfen',
        syntax: 'WHERE spalte IS NULL\nWHERE spalte IS NOT NULL',
        beispiel: 'select brand, model from cars\nwhere accident_free is null;',
        merke: '`= null` ist nie wahr, auch nicht bei NULL. NULL heißt „unbekannt“.',
      },
      {
        titel: 'Ersatzwert',
        syntax: 'coalesce(spalte, ersatz)',
        beispiel:
          "select brand, model,\n       coalesce(to_char(inspection_due, 'MM/YYYY'), 'unknown') as inspection\nfrom cars;",
        merke: 'Beide Argumente müssen denselben Typ haben – notfalls mit `::text` umwandeln.',
      },
      {
        titel: 'LEFT JOIN',
        syntax: 'FROM a\nLEFT JOIN b ON b.a_id = a.id',
        beispiel:
          'select d.name, count(c.id) as total\nfrom dealers d\nleft join cars c on c.dealer_id = d.id\ngroup by d.id, d.name;',
        merke:
          'Behält alle Zeilen der linken Tabelle. `count(c.id)` zählt dann 0, `count(*)` fälschlich 1.',
      },
      {
        titel: 'Was keinen Partner hat',
        syntax: 'FROM a LEFT JOIN b ON …\nWHERE b.id IS NULL',
        beispiel:
          'select d.name, d.city\nfrom dealers d\nleft join cars c on c.dealer_id = d.id\nwhere c.id is null;',
      },
    ],
  },
  {
    level: 5,
    titel: 'Datum und Fensterfunktionen',
    eintraege: [
      {
        titel: 'Datum formatieren und zerlegen',
        syntax:
          "to_char(datum, 'YYYY-MM')\nextract(year from datum)\ndate_trunc('month', datum)",
        beispiel:
          "select to_char(valid_from, 'YYYY-MM') as month, count(*)\nfrom price_history\ngroup by month\norder by month;",
      },
      {
        titel: 'Mit Datum rechnen',
        syntax: "datum2 - datum1          -- Tage\ndatum + interval '30 days'\ndate '2025-01-01'",
        beispiel:
          "select car_id, valid_from, valid_from + interval '30 days' as plus_30\nfrom price_history\nwhere valid_from >= date '2025-01-01';",
      },
      {
        titel: 'OVER und PARTITION BY',
        syntax: 'funktion(...) OVER (PARTITION BY gruppe ORDER BY spalte)',
        beispiel:
          'select brand, model, price,\n       round(avg(price) over (partition by brand), 2) as brand_avg\nfrom cars;',
        merke: 'Wie GROUP BY, aber jede Zeile bleibt erhalten.',
      },
      {
        titel: 'Rang und Nummer',
        syntax: 'row_number()  rank()  dense_rank()  OVER (ORDER BY …)',
        beispiel:
          'select brand, model, price,\n       row_number() over (order by price desc) as nr,\n       rank()       over (order by price desc) as rang\nfrom cars;',
        merke: '`rank` vergibt bei Gleichstand denselben Rang und lässt danach eine Lücke.',
      },
      {
        titel: 'Vorige und erste Zeile',
        syntax: 'lag(spalte) OVER (…)\nlead(spalte) OVER (…)\nfirst_value(spalte) OVER (…)',
        beispiel:
          'select car_id, valid_from, price,\n       lag(price) over (partition by car_id order by valid_from) as previous_price\nfrom price_history;',
        merke: 'Ohne `partition by` greift `lag` in das vorige Fahrzeug hinein.',
      },
      {
        titel: 'WITH (Common Table Expression)',
        syntax: 'WITH name AS (\n  SELECT …\n)\nSELECT … FROM name;',
        beispiel:
          'with ranked as (\n  select brand, model, price,\n         row_number() over (partition by brand order by price desc) as rn\n  from cars\n)\nselect brand, model, price from ranked where rn = 1;',
        merke: 'Fensterfunktionen darf man nicht im WHERE benutzen – also erst in ein WITH, dann filtern.',
      },
    ],
  },
  {
    level: 6,
    titel: 'Daten bereinigen',
    eintraege: [
      {
        titel: 'Text normalisieren',
        syntax: 'lower(text)  upper(text)  trim(text)\nsplit_part(text, trenner, n)',
        beispiel:
          "select email, lower(trim(email)) as cleaned,\n       split_part(lower(trim(email)), '@', 2) as domain\nfrom leads;",
      },
      {
        titel: 'Dubletten finden',
        syntax: 'SELECT schluessel, count(*)\nFROM …\nGROUP BY schluessel\nHAVING count(*) > 1;',
        beispiel:
          'select lower(trim(email)) as email, count(*) as entries\nfrom leads\ngroup by lower(trim(email))\nhaving count(*) > 1;',
      },
      {
        titel: 'Eine Zeile pro Gruppe',
        syntax: 'SELECT DISTINCT ON (gruppe) …\nFROM …\nORDER BY gruppe, kriterium;',
        beispiel:
          'select distinct on (lower(trim(email)))\n       lower(trim(email)) as email, name, captured_at\nfrom leads\norder by lower(trim(email)), captured_at;',
        merke:
          'Postgres-spezifisch. Überall sonst: `row_number() over (partition by … order by …)` und `where rn = 1`.',
      },
    ],
  },
  {
    level: 7,
    titel: 'Unterabfragen und Mengen',
    eintraege: [
      {
        titel: 'Unterabfrage als Wert',
        syntax: 'WHERE spalte > (SELECT avg(spalte) FROM …)',
        beispiel: 'select brand, model, price\nfrom cars\nwhere price > (select avg(price) from cars);',
      },
      {
        titel: 'IN und EXISTS',
        syntax:
          'WHERE id IN (SELECT … FROM …)\nWHERE [NOT] EXISTS (SELECT 1 FROM … WHERE …)',
        beispiel:
          'select c.brand, c.model\nfrom cars c\nwhere not exists (\n  select 1 from inquiries i where i.car_id = c.id\n);',
        merke: '`not in` mit einer Unterabfrage, die NULL liefert, findet nie etwas. `not exists` ist sicher.',
      },
      {
        titel: 'Korrelierte Unterabfrage',
        syntax: 'WHERE a.x = (SELECT min(b.x) FROM t b WHERE b.gruppe = a.gruppe)',
        beispiel:
          'select c.brand, c.model, c.price\nfrom cars c\nwhere c.price = (\n  select min(c2.price) from cars c2 where c2.brand = c.brand\n);',
      },
      {
        titel: 'CASE',
        syntax: "CASE\n  WHEN bedingung THEN wert\n  ELSE wert\nEND",
        beispiel:
          "select brand, model,\n       case\n         when price < 10000 then 'budget'\n         when price < 20000 then 'mid'\n         else 'premium'\n       end as price_class\nfrom cars;",
        merke: 'Die erste zutreffende Bedingung gewinnt.',
      },
      {
        titel: 'Bedingt zählen',
        syntax: 'count(*) FILTER (WHERE bedingung)\nsum(CASE WHEN … THEN 1 ELSE 0 END)',
        beispiel:
          "select transmission,\n       count(*) filter (where price < 15000) as cheap,\n       count(*) filter (where price >= 15000) as expensive\nfrom cars\ngroup by transmission;",
      },
      {
        titel: 'Mengenoperationen',
        syntax: 'SELECT … UNION [ALL] SELECT …\nSELECT … INTERSECT SELECT …\nSELECT … EXCEPT SELECT …',
        beispiel:
          'select brand from cars_archive\nexcept\nselect brand from cars;',
        merke:
          'Gleiche Spaltenanzahl und -typen. `union` entfernt Dubletten, `union all` nicht (und ist schneller).',
      },
    ],
  },
  {
    level: 8,
    titel: 'Daten verändern',
    eintraege: [
      {
        titel: 'INSERT',
        syntax: 'INSERT INTO tabelle (spalte1, spalte2)\nVALUES (wert1, wert2), (wert3, wert4);',
        beispiel:
          "insert into watchlist (customer_id, car_id, note)\nvalues (1, 2, 'compare');",
        merke: 'Nicht genannte Spalten bekommen ihren Standardwert (`default`) oder NULL.',
      },
      {
        titel: 'INSERT aus einer Abfrage',
        syntax: 'INSERT INTO tabelle (spalten)\nSELECT … FROM …;',
        beispiel:
          "insert into watchlist (customer_id, car_id, note, priority)\nselect customer_id, car_id, 'from open inquiry', 2\nfrom inquiries\nwhere status = 'open';",
      },
      {
        titel: 'UPDATE',
        syntax: 'UPDATE tabelle\nSET spalte = wert\nWHERE bedingung;',
        beispiel: 'update cars\nset price = price * 0.92\nwhere mileage > 150000;',
        merke: 'Ohne `where` trifft es **jede** Zeile. Erst als SELECT mit demselben WHERE ausprobieren.',
      },
      {
        titel: 'DELETE',
        syntax: 'DELETE FROM tabelle\nWHERE bedingung;',
        beispiel:
          "delete from inquiries\nwhere status = 'rejected'\n  and created_at < date '2025-01-01';",
        merke: 'Auch hier: erst `select *` mit demselben WHERE, dann löschen.',
      },
      {
        titel: 'Was geändert wurde zurückgeben',
        syntax: 'INSERT/UPDATE/DELETE … RETURNING spalten;',
        beispiel: "update cars\nset color = 'gray'\nwhere color = 'silver'\nreturning brand, model, color;",
      },
    ],
  },
  {
    level: 9,
    titel: 'Tabellen bauen',
    eintraege: [
      {
        titel: 'CREATE TABLE',
        syntax:
          'CREATE TABLE name (\n  id      serial PRIMARY KEY,\n  spalte  typ NOT NULL,\n  …\n);',
        beispiel:
          'create table test_drives (\n  id           serial primary key,\n  car_id       int  not null,\n  name         text not null,\n  scheduled_on date not null,\n  remark       text\n);',
        merke: 'Häufige Typen: `int`, `numeric(10,2)`, `text`, `boolean`, `date`, `timestamp`.',
      },
      {
        titel: 'Regeln (Constraints)',
        syntax:
          'NOT NULL\nUNIQUE\nCHECK (bedingung)\nREFERENCES andere_tabelle(id)\nPRIMARY KEY (spalte1, spalte2)',
        beispiel:
          'create table reviews (\n  id        serial primary key,\n  dealer_id int  not null references dealers(id),\n  stars     int  not null check (stars between 1 and 5),\n  comment   text\n);',
      },
      {
        titel: 'Standardwerte',
        syntax: 'spalte typ DEFAULT wert',
        beispiel:
          'create table newsletter (\n  id           serial primary key,\n  email        text    not null unique,\n  confirmed    boolean not null default false,\n  signed_up_on date    not null default current_date\n);',
      },
      {
        titel: 'Tabelle ändern',
        syntax:
          'ALTER TABLE name ADD COLUMN spalte typ;\nALTER TABLE name DROP COLUMN spalte;\nALTER TABLE name RENAME COLUMN alt TO neu;',
        beispiel: "alter table cars\nadd column fuel text not null default 'petrol';",
        merke: 'Eine neue Pflichtspalte braucht einen Standardwert – sonst stünde in den alten Zeilen NULL.',
      },
      {
        titel: 'VIEW',
        syntax: 'CREATE VIEW name AS\nSELECT …;',
        beispiel:
          'create view inventory_overview as\nselect c.brand, c.model, c.price, d.name, d.city\nfrom cars c\njoin dealers d on d.id = c.dealer_id;',
        merke: 'Speichert die Abfrage, nicht die Daten. Jeder Zugriff liefert den aktuellen Stand.',
      },
      {
        titel: 'Tabelle löschen',
        syntax: 'DROP TABLE [IF EXISTS] name;\nDROP VIEW [IF EXISTS] name;',
        beispiel: 'drop table if exists test_drives;',
      },
    ],
  },
];
