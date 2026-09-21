/**
 * Aufgaben. Wichtig: Hier steht KEIN erwartetes Ergebnis als JSON.
 * Gespeichert wird nur die Musterloesung als SQL. Das erwartete Ergebnis
 * entsteht zur Laufzeit, indem die Musterloesung gegen denselben Datenstand
 * laeuft wie die Eingabe des Nutzers. Damit koennen Migrationen jederzeit
 * geaendert werden, ohne dass Aufgaben still kaputtgehen.
 */

export type Task = {
  id: string;
  /** Ab welchem Datenstand loesbar. Bestimmt, welche Migrationen laufen. */
  level: number;
  titel: string;
  aufgabe: string;
  /**
   * 'abfrage' (Standard): Die Eingabe ist ein SELECT. Verglichen wird die
   *   Ausgabe der Eingabe mit der Ausgabe der Musterloesung.
   *
   * 'zustand': Die Eingabe veraendert die Datenbank (INSERT/UPDATE/DELETE/
   *   CREATE) und liefert selbst nichts Vergleichbares. Deshalb laeuft
   *   danach `pruefung` und liest den entstandenen Zustand aus. Verglichen
   *   wird der Zustand nach der Eingabe mit dem nach der Musterloesung.
   *   Beide laufen in einer eigenen Transaktion, die zurueckgerollt wird.
   */
  art?: 'abfrage' | 'zustand';
  /**
   * Nur bei art='zustand': SELECT, das den relevanten Zustand ausliest.
   * Darf keine serial-IDs enthalten - Sequenzen werden von ROLLBACK nicht
   * zurueckgesetzt, die Nummern waeren zwischen beiden Laeufen verschoben.
   */
  pruefung?: string;
  /** true = Reihenfolge der Zeilen wird geprueft (Aufgabe verlangt ORDER BY). */
  reihenfolgeZaehlt: boolean;
  hinweise: string[];
  loesung: string;
};

export const tasks: Task[] = [
  {
    id: 'a01',
    level: 1,
    titel: 'Was ist bezahlbar',
    aufgabe:
      'Zeig Marke, Modell und Preis aller Fahrzeuge unter 15.000 €, sortiert nach Preis aufsteigend.',
    reihenfolgeZaehlt: true,
    hinweise: [
      'Drei Spalten, ein Filter, eine Sortierung.',
      'WHERE kommt vor ORDER BY.',
    ],
    loesung: `
select brand, model, price
from cars
where price < 15000
order by price asc
`,
  },
  {
    id: 'a02',
    level: 1,
    titel: 'Wenig gelaufen, selbst geschaltet',
    aufgabe:
      'Alle Fahrzeuge mit Schaltgetriebe und weniger als 60.000 km. Spalten: Marke, Modell, Baujahr, Kilometerstand. Sortiert nach Kilometerstand aufsteigend.',
    reihenfolgeZaehlt: true,
    hinweise: [
      'Zwei Bedingungen gleichzeitig - mit AND verknüpfen.',
      "In der Spalte transmission steht 'manual' oder 'automatic'.",
    ],
    loesung: `
select brand, model, year, mileage
from cars
where transmission = 'manual'
  and mileage < 60000
order by mileage asc
`,
  },
  {
    id: 'a03',
    level: 1,
    titel: 'Welche Marke ist stark vertreten',
    aufgabe:
      'Zähl die Fahrzeuge pro Marke, aber zeig nur Marken mit mindestens zwei Fahrzeugen. Sortiert nach Anzahl absteigend, bei Gleichstand alphabetisch nach Marke.',
    reihenfolgeZaehlt: true,
    hinweise: [
      'Nach der Gruppierung filtern heißt HAVING, nicht WHERE.',
      'ORDER BY verträgt mehrere Kriterien, durch Komma getrennt.',
    ],
    loesung: `
select brand, count(*) as total
from cars
group by brand
having count(*) >= 2
order by count(*) desc, brand asc
`,
  },
  {
    id: 'a04',
    level: 1,
    titel: 'Kostet Automatik mehr',
    aufgabe:
      'Pro Getriebeart: die Getriebeart, die Anzahl der Fahrzeuge und der Durchschnittspreis auf zwei Nachkommastellen gerundet.',
    reihenfolgeZaehlt: false,
    hinweise: [
      'AVG liefert viele Nachkommastellen - ROUND(wert, 2) schneidet sie ab.',
      'COUNT und AVG dürfen im selben SELECT stehen.',
    ],
    loesung: `
select transmission,
       count(*) as total,
       round(avg(price), 2) as avg_price
from cars
group by transmission
`,
  },

  {
    id: 'a05',
    level: 2,
    titel: 'Wo steht welches Auto',
    aufgabe:
      'Verbinde Fahrzeuge mit ihren Händlern. Spalten: Marke, Modell, Händlername, Stadt. Sortiert nach Stadt, dann Marke, dann Modell.',
    reihenfolgeZaehlt: true,
    hinweise: [
      'cars.dealer_id zeigt auf dealers.id.',
      'Tabellen-Aliase (f, h) sparen dir viel Tipperei.',
    ],
    loesung: `
select f.brand, f.model, h.name, h.city
from cars f
join dealers h on h.id = f.dealer_id
order by h.city, f.brand, f.model
`,
  },
  {
    id: 'a06',
    level: 2,
    titel: 'Wer hat den teuersten Hof stehen',
    aufgabe:
      'Pro Händler: Name, Stadt, Anzahl der Fahrzeuge und der Gesamtwert des Bestands. Der wertvollste Bestand zuerst.',
    reihenfolgeZaehlt: true,
    hinweise: [
      'Erst JOIN, dann GROUP BY über die Händlerspalten.',
      'Gruppier nach h.id mit - sonst fallen zwei Händler mit gleichem Namen zusammen.',
    ],
    loesung: `
select h.name, h.city,
       count(f.id) as total,
       sum(f.price) as stock_value
from dealers h
join cars f on f.dealer_id = h.id
group by h.id, h.name, h.city
order by sum(f.price) desc
`,
  },

  {
    id: 'a07',
    level: 3,
    titel: 'Wer interessiert sich für einen Mercedes',
    aufgabe:
      'Vorname und Nachname aller Kunden, die mindestens eine Anfrage zu einem Mercedes gestellt haben. Jeder Kunde genau einmal, sortiert nach Nachname.',
    reihenfolgeZaehlt: true,
    hinweise: [
      'Der Weg geht über zwei JOINs: customers → inquiries → cars.',
      'Wer zwei Mercedes angefragt hat, taucht sonst doppelt auf.',
    ],
    loesung: `
select distinct k.first_name, k.last_name
from customers k
join inquiries a on a.customer_id = k.id
join cars f on f.id = a.car_id
where f.brand = 'Mercedes'
order by k.last_name
`,
  },
  {
    id: 'a08',
    level: 3,
    titel: 'Die drei gefragtesten Fahrzeuge',
    aufgabe:
      'Marke, Modell und Anzahl der Anfragen für die drei meistangefragten Fahrzeuge. Bei Gleichstand entscheidet die Marke alphabetisch.',
    reihenfolgeZaehlt: true,
    hinweise: [
      'Zählen, sortieren, abschneiden - LIMIT kommt ganz zum Schluss.',
      'Zwei Fahrzeuge können denselben Modellnamen haben, gruppier deshalb über f.id.',
    ],
    loesung: `
select f.brand, f.model, count(a.id) as inquiries
from cars f
join inquiries a on a.car_id = f.id
group by f.id, f.brand, f.model
order by count(a.id) desc, f.brand asc
limit 3
`,
  },

  {
    id: 'a09',
    level: 4,
    titel: 'Leerer Hof',
    aufgabe:
      'Name und Stadt aller Händler, die aktuell kein einziges Fahrzeug im Bestand haben. Alphabetisch nach Name.',
    reihenfolgeZaehlt: true,
    hinweise: [
      'Ein normaler JOIN wirft diese Händler raus - genau das willst du hier nicht.',
      'Nach dem LEFT JOIN sind die Fahrzeugspalten NULL. Darauf kannst du filtern.',
    ],
    loesung: `
select h.name, h.city
from dealers h
left join cars f on f.dealer_id = h.id
where f.id is null
order by h.name
`,
  },
  {
    id: 'a10',
    level: 4,
    titel: 'TÜV läuft ab oder ist unklar',
    aufgabe:
      'Alle Fahrzeuge, deren TÜV vor dem 01.06.2026 abläuft oder gar nicht hinterlegt ist. Spalten: Marke, Modell und eine Spalte mit dem TÜV-Datum im Format MM/YYYY – wenn keines hinterlegt ist, steht dort "unknown".',
    reihenfolgeZaehlt: false,
    hinweise: [
      'NULL < irgendwas ergibt nicht true, sondern NULL. Du brauchst eine zweite Bedingung.',
      "TO_CHAR(datum, 'MM/YYYY') formatiert, COALESCE fängt den NULL-Fall ab.",
    ],
    loesung: `
select brand, model,
       coalesce(to_char(inspection_due, 'MM/YYYY'), 'unknown') as inspection
from cars
where inspection_due < date '2026-06-01'
   or inspection_due is null
`,
  },
  {
    id: 'a11',
    level: 4,
    titel: 'Unfallfrei, nicht unfallfrei, keine Ahnung',
    aufgabe:
      'Zähl die Fahrzeuge nach Unfall-Status. Fahrzeuge ohne Angabe sollen als eigene Gruppe "unknown" erscheinen, nicht bei "false" mitlaufen. Zwei Spalten: Status und Anzahl.',
    reihenfolgeZaehlt: false,
    hinweise: [
      'Ein boolean lässt sich mit ::text in Text umwandeln.',
      'Gruppieren kannst du auch über einen berechneten Ausdruck, nicht nur über eine Spalte.',
    ],
    loesung: `
select coalesce(accident_free::text, 'unknown') as status,
       count(*) as total
from cars
group by coalesce(accident_free::text, 'unknown')
`,
  },

  {
    id: 'a12',
    level: 5,
    titel: 'Wie weit ist der Preis gefallen',
    aufgabe:
      'Für jedes Fahrzeug, dessen Preis mindestens einmal angepasst wurde: Marke, Modell, der allererste Preis, der aktuelle Preis und die Differenz zwischen beiden.',
    reihenfolgeZaehlt: false,
    hinweise: [
      'FIRST_VALUE(...) OVER (PARTITION BY ... ORDER BY ...) liefert den ersten Wert je Gruppe.',
      'Sortierst du innerhalb des OVER absteigend, bekommst du den letzten Wert.',
      'COUNT(*) OVER (PARTITION BY ...) sagt dir, wie viele Einträge ein Fahrzeug hat.',
    ],
    loesung: `
with history as (
  select car_id,
         first_value(price) over (partition by car_id order by valid_from asc)  as start_price,
         first_value(price) over (partition by car_id order by valid_from desc) as current_price,
         count(*) over (partition by car_id) as entries
  from price_history
)
select distinct f.brand, f.model,
       v.start_price,
       v.current_price,
       v.start_price - v.current_price as discount
from history v
join cars f on f.id = v.car_id
where v.entries > 1
`,
  },
  {
    id: 'a13',
    level: 5,
    titel: 'In welchen Monaten wurde nachgebessert',
    aufgabe:
      'Zähl die Preisänderungen pro Kalendermonat und zeig nur Monate mit mindestens drei Änderungen. Spalten: Monat im Format YYYY-MM und Anzahl. Chronologisch sortiert.',
    reihenfolgeZaehlt: true,
    hinweise: [
      "TO_CHAR(datum, 'YYYY-MM') macht aus einem Datum einen Monatsschlüssel.",
      'Denselben Ausdruck brauchst du auch im GROUP BY.',
    ],
    loesung: `
select to_char(valid_from, 'YYYY-MM') as month,
       count(*) as changes
from price_history
group by to_char(valid_from, 'YYYY-MM')
having count(*) >= 3
order by month asc
`,
  },

  {
    id: 'a14',
    level: 6,
    titel: 'Wer steht mehrfach in der Liste',
    aufgabe:
      'Finde in der Lead-Liste alle E-Mail-Adressen, die mehr als einmal vorkommen. Groß-/Kleinschreibung und Leerzeichen am Rand sollen dabei egal sein. Spalten: bereinigte E-Mail und Anzahl der Einträge.',
    reihenfolgeZaehlt: false,
    hinweise: [
      'LOWER und TRIM lassen sich ineinander verschachteln.',
      'Was du im SELECT berechnest, muss auch im GROUP BY stehen.',
    ],
    loesung: `
select lower(trim(email)) as email,
       count(*) as entries
from leads
group by lower(trim(email))
having count(*) > 1
`,
  },
  {
    id: 'a15',
    level: 6,
    titel: 'Eine saubere Liste bauen',
    aufgabe:
      'Erzeug aus der Lead-Liste eine bereinigte Fassung: pro E-Mail-Adresse genau ein Eintrag, und zwar der älteste. Spalten: bereinigte E-Mail, Name, Quelle, Erfassungszeitpunkt.',
    reihenfolgeZaehlt: false,
    hinweise: [
      'DISTINCT ON (ausdruck) behält pro Gruppe die erste Zeile.',
      'Welche das ist, entscheidet dein ORDER BY - es muss mit demselben Ausdruck beginnen.',
      'Alternativ geht es auch mit ROW_NUMBER() in einem CTE.',
    ],
    loesung: `
select distinct on (lower(trim(email)))
       lower(trim(email)) as email,
       name,
       source,
       captured_at
from leads
order by lower(trim(email)), captured_at asc
`,
  },
  {
    id: 'a16',
    level: 2,
    titel: 'Der Bestand in München',
    aufgabe:
      'Alle Fahrzeuge, die bei einem Händler in München stehen. Spalten: Marke, Modell, Preis. Das teuerste zuerst.',
    reihenfolgeZaehlt: true,
    hinweise: [
      'Die Stadt steht in der Händlertabelle, nicht bei den Fahrzeugen.',
      "Die Daten sind englisch – die Stadt heißt dort 'Munich'.",
    ],
    loesung: `
select f.brand, f.model, f.price
from cars f
join dealers h on h.id = f.dealer_id
where h.city = 'Munich'
order by f.price desc
`,
  },
  {
    id: 'a17',
    level: 2,
    titel: 'Preisniveau nach Standort',
    aufgabe:
      'Pro Stadt: Stadt, Anzahl der Fahrzeuge und Durchschnittspreis auf zwei Nachkommastellen. Nur Städte mit mindestens vier Fahrzeugen. Teuerster Durchschnitt zuerst.',
    reihenfolgeZaehlt: true,
    hinweise: [
      'JOIN, dann GROUP BY über die Stadt.',
      'Die Mindestanzahl ist eine Bedingung an die Gruppe, nicht an die einzelne Zeile.',
    ],
    loesung: `
select h.city,
       count(*) as total,
       round(avg(f.price), 2) as avg_price
from dealers h
join cars f on f.dealer_id = h.id
group by h.city
having count(*) >= 4
order by round(avg(f.price), 2) desc
`,
  },

  {
    id: 'a18',
    level: 3,
    titel: 'Wer sucht am aktivsten',
    aufgabe:
      'Kunden mit mindestens drei Anfragen. Spalten: Vorname, Nachname, Anzahl der Anfragen. Meiste Anfragen zuerst, bei Gleichstand nach Nachname.',
    reihenfolgeZaehlt: true,
    hinweise: [
      'Ein JOIN reicht hier – die Fahrzeugtabelle brauchst du nicht.',
      'Gruppier über die Kunden-id mit, nicht nur über den Namen.',
    ],
    loesung: `
select k.first_name, k.last_name, count(a.id) as inquiries
from customers k
join inquiries a on a.customer_id = k.id
group by k.id, k.first_name, k.last_name
having count(a.id) >= 3
order by count(a.id) desc, k.last_name asc
`,
  },
  {
    id: 'a19',
    level: 3,
    titel: 'Vor der eigenen Haustür',
    aufgabe:
      'Welche Kunden haben ein Fahrzeug angefragt, das bei einem Händler in ihrer eigenen Stadt steht? Spalten: Vorname, Nachname, Stadt. Jeder Kunde einmal, sortiert nach Nachname.',
    reihenfolgeZaehlt: true,
    hinweise: [
      'Der Weg ist lang: customers → inquiries → cars → dealers.',
      'Die Bedingung vergleicht zwei Spalten aus zwei Tabellen miteinander, nicht eine Spalte mit einem festen Wert.',
      'Wer mehrere passende Anfragen hat, taucht sonst mehrfach auf.',
    ],
    loesung: `
select distinct k.first_name, k.last_name, k.city
from customers k
join inquiries a on a.customer_id = k.id
join cars f on f.id = a.car_id
join dealers h on h.id = f.dealer_id
where h.city = k.city
order by k.last_name
`,
  },

  {
    id: 'a20',
    level: 4,
    titel: 'Angemeldet, aber nie gemeldet',
    aufgabe:
      'Kunden, die noch nie eine Anfrage gestellt haben. Spalten: Vorname, Nachname, Registrierungsdatum. Sortiert nach Nachname.',
    reihenfolgeZaehlt: true,
    hinweise: [
      'Ein normaler JOIN kann diese Kunden gar nicht zeigen – sie haben ja nichts zum Verbinden.',
      'Prüf nach dem LEFT JOIN auf eine Spalte, die niemals NULL sein kann.',
    ],
    loesung: `
select k.first_name, k.last_name, k.registered_at
from customers k
left join inquiries a on a.customer_id = k.id
where a.id is null
order by k.last_name
`,
  },

  {
    id: 'a21',
    level: 5,
    titel: 'Das Flaggschiff jeder Marke',
    aufgabe:
      'Das teuerste Fahrzeug jeder Marke. Spalten: Marke, Modell, Preis. Teuerstes zuerst.',
    reihenfolgeZaehlt: true,
    hinweise: [
      'Nummerier die Fahrzeuge innerhalb ihrer Marke nach Preis durch.',
      'ROW_NUMBER() darf nicht ins WHERE – dafür brauchst du einen CTE mit WITH.',
    ],
    loesung: `
with ranked as (
  select brand, model, price,
         row_number() over (partition by brand order by price desc) as rn
  from cars
)
select brand, model, price
from ranked
where rn = 1
order by price desc
`,
  },
  {
    id: 'a22',
    level: 5,
    titel: 'Wie lange steht es schon',
    aufgabe:
      'Für jedes Fahrzeug mit mehr als einem Preiseintrag: Marke, Modell, Datum des ersten Eintrags, Datum des letzten Eintrags und die Anzahl Tage dazwischen.',
    reihenfolgeZaehlt: false,
    hinweise: [
      'Hier reichen MIN und MAX mit GROUP BY – eine Fensterfunktion brauchst du nicht.',
      'Die Differenz zweier Datumswerte ergibt in Postgres direkt die Anzahl Tage.',
    ],
    loesung: `
with span as (
  select car_id,
         min(valid_from) as first_date,
         max(valid_from) as last_date,
         count(*) as entries
  from price_history
  group by car_id
)
select f.brand, f.model,
       s.first_date, s.last_date,
       (s.last_date - s.first_date) as days
from span s
join cars f on f.id = s.car_id
where s.entries > 1
`,
  },

  {
    id: 'a23',
    level: 6,
    titel: 'Welche Quelle bringt echte Kontakte',
    aufgabe:
      'Pro Quelle die Anzahl verschiedener Personen – Mehrfacherfassungen derselben Adresse zählen nur einmal. Spalten: Quelle und Anzahl. Meiste zuerst, bei Gleichstand alphabetisch nach Quelle.',
    reihenfolgeZaehlt: true,
    hinweise: [
      'COUNT darf ein DISTINCT enthalten: COUNT(DISTINCT ausdruck).',
      'Bereinigen musst du trotzdem, sonst zählt jede Schreibweise eigenständig.',
    ],
    loesung: `
select source,
       count(distinct lower(trim(email))) as persons
from leads
group by source
order by count(distinct lower(trim(email))) desc, source asc
`,
  },
  {
    id: 'a24',
    level: 6,
    titel: 'Kontakte ganz ohne Namen',
    aufgabe:
      'Finde die E-Mail-Adressen, zu denen in keinem einzigen Eintrag ein Name hinterlegt ist. Eine Spalte: die bereinigte Adresse.',
    reihenfolgeZaehlt: false,
    hinweise: [
      'COUNT(*) zählt Zeilen, COUNT(spalte) zählt nur die Zeilen, in denen dort etwas steht.',
      'Gesucht ist also die Gruppe, bei der die zweite Zählung null ergibt.',
    ],
    loesung: `
select lower(trim(email)) as email
from leads
group by lower(trim(email))
having count(name) = 0
`,
  },
  {
    id: 'a25',
    level: 7,
    titel: 'Teurer als der Durchschnitt',
    aufgabe:
      'Alle Fahrzeuge, die teurer sind als der Durchschnittspreis des gesamten Bestands. Spalten: Marke, Modell, Preis. Teuerstes zuerst.',
    reihenfolgeZaehlt: true,
    hinweise: [
      'Den Durchschnitt kannst du in Klammern als eigene Abfrage in die WHERE-Bedingung setzen.',
      'Eine Unterabfrage, die genau einen Wert liefert, darf überall stehen, wo ein Wert erwartet wird.',
    ],
    loesung: `
select brand, model, price
from cars
where price > (select avg(price) from cars)
order by price desc
`,
  },
  {
    id: 'a26',
    level: 7,
    titel: 'Marken, die es nicht mehr gibt',
    aufgabe:
      'Welche Marken kommen im Archiv vor, aber nicht mehr im aktuellen Bestand? Eine Spalte: Marke. Alphabetisch.',
    reihenfolgeZaehlt: true,
    hinweise: [
      'EXCEPT zieht das Ergebnis der zweiten Abfrage von dem der ersten ab.',
      'Beide Abfragen müssen gleich viele Spalten mit passenden Typen liefern.',
      'Alternativ geht es mit NOT EXISTS oder NOT IN.',
    ],
    loesung: `
select brand from cars_archive
except
select brand from cars
order by brand
`,
  },
  {
    id: 'a27',
    level: 7,
    titel: 'Bestand und Archiv in einer Liste',
    aufgabe:
      'Führe aktuellen Bestand und Archiv zusammen. Spalten: Marke, Modell, Preis und eine Spalte mit dem Wert "available" bzw. "sold". Sortiert nach Preis absteigend.',
    reihenfolgeZaehlt: true,
    hinweise: [
      'UNION ALL hängt zwei Ergebnisse aneinander, ohne Duplikate zu entfernen.',
      "Die Statusspalte ist ein fester Text, den du einfach hinschreibst: 'available' as status.",
      'Das ORDER BY gilt für das Gesamtergebnis und steht ganz am Ende, nicht in jedem Teil.',
    ],
    loesung: `
select brand, model, price, 'available' as status from cars
union all
select brand, model, price, 'sold' as status from cars_archive
order by price desc
`,
  },
  {
    id: 'a28',
    level: 7,
    titel: 'Preisklassen bilden',
    aufgabe:
      'Teil den Bestand in Preisklassen ein: unter 10.000 heißt "budget", unter 20.000 "mid", ab 20.000 "premium". Zeig die Klasse und die Anzahl der Fahrzeuge darin.',
    reihenfolgeZaehlt: false,
    hinweise: [
      'CASE WHEN bedingung THEN wert WHEN ... ELSE ... END bildet Fallunterscheidungen.',
      'Die Bedingungen werden von oben nach unten geprüft – die erste passende gewinnt.',
      'Denselben CASE-Ausdruck brauchst du auch im GROUP BY.',
    ],
    loesung: `
select case
         when price < 10000 then 'budget'
         when price < 20000 then 'mid'
         else 'premium'
       end as price_class,
       count(*) as total
from cars
group by case
           when price < 10000 then 'budget'
           when price < 20000 then 'mid'
           else 'premium'
         end
`,
  },

  {
    id: 'a29',
    level: 8,
    art: 'zustand',
    titel: 'Etwas auf die Merkliste setzen',
    aufgabe:
      'Setz für Kunde 3 das Fahrzeug 12 auf die Merkliste, mit der Notiz "schedule test drive" und Priorität 1. Alle übrigen Spalten sollen ihren Standardwert behalten.',
    reihenfolgeZaehlt: false,
    pruefung: `
select customer_id, car_id, note, priority
from watchlist
order by customer_id, car_id
`,
    hinweise: [
      'INSERT INTO tabelle (spalten…) VALUES (werte…);',
      'Spalten, die du weglässt, füllt Postgres mit ihrem DEFAULT – genau das ist hier gewollt.',
    ],
    loesung: `
insert into watchlist (customer_id, car_id, note, priority)
values (3, 12, 'schedule test drive', 1);
`,
  },
  {
    id: 'a30',
    level: 8,
    art: 'zustand',
    titel: 'Die Merkliste automatisch füllen',
    aufgabe:
      'Übernimm alle offenen Anfragen auf die Merkliste: für jede Anfrage mit Status "open" ein Eintrag mit passender Kunden- und Fahrzeug-ID, Notiz "from open inquiry" und Priorität 2.',
    reihenfolgeZaehlt: false,
    pruefung: `
select customer_id, car_id, note, priority
from watchlist
order by customer_id, car_id
`,
    hinweise: [
      'Statt VALUES darf hinter INSERT INTO auch direkt ein SELECT stehen.',
      'Die Spalten des SELECT müssen in Reihenfolge und Typ zu den Zielspalten passen.',
      "Feste Werte wie 'from open inquiry' schreibst du einfach als Spalte in den SELECT.",
    ],
    loesung: `
insert into watchlist (customer_id, car_id, note, priority)
select a.customer_id, a.car_id, 'from open inquiry', 2
from inquiries a
where a.status = 'open';
`,
  },
  {
    id: 'a31',
    level: 8,
    art: 'zustand',
    titel: 'Preise anpassen',
    aufgabe:
      'Senk den Preis aller Fahrzeuge mit mehr als 150.000 km um 8 Prozent.',
    reihenfolgeZaehlt: true,
    pruefung: `
select brand, model, mileage, price
from cars
order by brand, model
`,
    hinweise: [
      'UPDATE tabelle SET spalte = ausdruck WHERE bedingung;',
      'Der Ausdruck darf die Spalte selbst verwenden: price * 0.92.',
      'Runden musst du nicht – die Spalte ist numeric(10,2) und rundet beim Speichern von selbst.',
      'Ohne WHERE trifft ein UPDATE jede einzelne Zeile. Schreib es immer zuerst.',
    ],
    loesung: `
update cars
set price = price * 0.92
where mileage > 150000;
`,
  },
  {
    id: 'a32',
    level: 8,
    art: 'zustand',
    titel: 'Abgelehntes wegräumen',
    aufgabe:
      'Lösch alle Anfragen mit dem Status "rejected" – aber nur die, die vor dem 01.01.2025 gestellt wurden.',
    reihenfolgeZaehlt: true,
    pruefung: `
select customer_id, car_id, created_at, status
from inquiries
order by created_at, customer_id, car_id
`,
    hinweise: [
      'DELETE FROM tabelle WHERE bedingung;',
      'Zwei Bedingungen mit AND verknüpfen.',
      'Tipp fürs echte Leben: Schreib die Bedingung erst als SELECT und schau dir an, was du triffst. Dann tausch SELECT gegen DELETE.',
    ],
    loesung: `
delete from inquiries
where status = 'rejected'
  and created_at < date '2025-01-01';
`,
  },

  {
    id: 'a33',
    level: 9,
    art: 'zustand',
    titel: 'Eine Tabelle anlegen',
    aufgabe:
      'Leg eine Tabelle `test_drives` an, mit genau diesen Spalten in dieser Reihenfolge: `id` (ganze Zahl, Primärschlüssel), `car_id` (ganze Zahl, Pflichtfeld), `name` (Text, Pflichtfeld), `scheduled_on` (Datum, Pflichtfeld) und `remark` (Text, darf leer bleiben).',
    reihenfolgeZaehlt: true,
    pruefung: `
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'test_drives'
order by ordinal_position
`,
    hinweise: [
      'CREATE TABLE name ( spalte typ constraints, … );',
      '`serial` erzeugt eine automatisch hochzählende ganze Zahl – dahinter steckt der Typ integer.',
      'NOT NULL macht eine Spalte zum Pflichtfeld. Lässt du es weg, sind NULL-Werte erlaubt.',
    ],
    loesung: `
create table test_drives (
  id          serial primary key,
  car_id int  not null,
  name        text not null,
  scheduled_on      date not null,
  remark   text
);
`,
  },
  {
    id: 'a34',
    level: 9,
    art: 'zustand',
    titel: 'Regeln in die Tabelle einbauen',
    aufgabe:
      'Leg eine Tabelle `reviews` an mit `id` (Primärschlüssel), `dealer_id` (Pflichtfeld, Fremdschlüssel auf dealers), `stars` (Pflichtfeld, nur Werte von 1 bis 5 erlaubt) und `comment` (optional). Die Tabelle soll einen Primärschlüssel, einen Fremdschlüssel und eine CHECK-Regel besitzen.',
    reihenfolgeZaehlt: false,
    pruefung: `
select constraint_type, count(*) as total
from information_schema.table_constraints
where table_schema = 'public' and table_name = 'reviews'
group by constraint_type
`,
    hinweise: [
      'REFERENCES dealers(id) hinter der Spalte erzeugt den Fremdschlüssel.',
      'CHECK (stars between 1 and 5) schränkt die erlaubten Werte ein.',
      'Die Datenbank erzwingt diese Regeln – falsche Daten kommen gar nicht erst hinein.',
    ],
    loesung: `
create table reviews (
  id          serial primary key,
  dealer_id int  not null references dealers(id),
  stars      int  not null check (stars between 1 and 5),
  comment     text
);
`,
  },
  {
    id: 'a35',
    level: 9,
    art: 'zustand',
    titel: 'Eine gespeicherte Abfrage',
    aufgabe:
      'Leg eine View `inventory_overview` an, die Marke, Modell, Preis, Händlername und Stadt jedes Fahrzeugs zeigt – in dieser Spaltenreihenfolge.',
    reihenfolgeZaehlt: true,
    pruefung: `
select brand, model, price, name, city
from inventory_overview
order by brand, model
`,
    hinweise: [
      'CREATE VIEW name AS select …;',
      'Eine View speichert keine Daten, sondern die Abfrage selbst. Bei jedem Zugriff läuft sie neu.',
      'Die Spaltennamen der View ergeben sich aus deinem SELECT.',
    ],
    loesung: `
create view inventory_overview as
select f.brand, f.model, f.price, h.name, h.city
from cars f
join dealers h on h.id = f.dealer_id;
`,
  },
  {
    id: 'a36',
    level: 9,
    art: 'zustand',
    titel: 'Standardwerte und Eindeutigkeit',
    aufgabe:
      'Leg eine Tabelle `newsletter` an mit `id` (Primärschlüssel), `email` (Pflichtfeld, darf nur einmal vorkommen), `confirmed` (Wahrheitswert, Pflichtfeld, standardmäßig false) und `signed_up_on` (Datum, Pflichtfeld, standardmäßig das heutige Datum).',
    reihenfolgeZaehlt: true,
    pruefung: `
select 'spalte ' || ordinal_position || ': ' || column_name
       || ' / ' || data_type
       || ' / null=' || is_nullable
       || ' / default=' || (column_default is not null)::text as feature
from information_schema.columns
where table_schema = 'public' and table_name = 'newsletter'
union all
select 'regel: ' || constraint_type
from information_schema.table_constraints
where table_schema = 'public' and table_name = 'newsletter'
order by feature
`,
    hinweise: [
      'UNIQUE verhindert doppelte Werte in einer Spalte.',
      'DEFAULT wert setzt den Standard, wenn beim INSERT nichts angegeben wird.',
      'Für das heutige Datum gibt es die Funktion current_date.',
    ],
    loesung: `
create table newsletter (
  id            serial primary key,
  email         text    not null unique,
  confirmed    boolean not null default false,
  signed_up_on date    not null default current_date
);
`,
  },
  // ══════════════════════════════════════════ V4: vier weitere pro Stufe ══

  {
    id: 'a37',
    level: 1,
    titel: 'Rot oder blau',
    aufgabe:
      'Alle roten und alle blauen Fahrzeuge. Spalten: Marke, Modell, Farbe. Sortiert nach Marke, dann Modell.',
    reihenfolgeZaehlt: true,
    hinweise: [
      "Zwei Bedingungen mit OR gehen – kürzer ist color IN ('red', 'blue').",
      'Die Farben stehen englisch in den Daten.',
    ],
    loesung: `
select brand, model, color
from cars
where color in ('red', 'blue')
order by brand, model
`,
  },
  {
    id: 'a38',
    level: 1,
    titel: 'Die Jahrgänge 2018 bis 2020',
    aufgabe:
      'Alle Fahrzeuge mit Baujahr von 2018 bis einschließlich 2020. Spalten: Marke, Modell, Baujahr. Sortiert nach Baujahr, dann Marke, dann Modell.',
    reihenfolgeZaehlt: true,
    hinweise: [
      'BETWEEN a AND b schließt beide Grenzen ein.',
      'Drei Sortierkriterien, durch Komma getrennt.',
    ],
    loesung: `
select brand, model, year
from cars
where year between 2018 and 2020
order by year, brand, model
`,
  },
  {
    id: 'a39',
    level: 1,
    titel: 'Alles, was mit A anfängt',
    aufgabe:
      'Alle Fahrzeuge, deren Modellbezeichnung mit einem großen A beginnt. Spalten: Marke und Modell. Sortiert nach Modell.',
    reihenfolgeZaehlt: true,
    hinweise: [
      "LIKE vergleicht mit einem Muster. Das Prozentzeichen steht für beliebig viele Zeichen: 'A%'.",
      'Es sind nicht nur Audis – schau genau hin.',
    ],
    loesung: `
select brand, model
from cars
where model like 'A%'
order by model
`,
  },
  {
    id: 'a40',
    level: 1,
    titel: 'Was jede Farbe mindestens kostet',
    aufgabe:
      'Pro Farbe: die Farbe, die Anzahl der Fahrzeuge und der niedrigste Preis. Meiste Fahrzeuge zuerst, bei Gleichstand alphabetisch nach Farbe.',
    reihenfolgeZaehlt: true,
    hinweise: [
      'COUNT und MIN in derselben Abfrage.',
      'Das zweite Sortierkriterium entscheidet bei gleicher Anzahl.',
    ],
    loesung: `
select color, count(*) as total, min(price) as cheapest
from cars
group by color
order by count(*) desc, color asc
`,
  },

  {
    id: 'a41',
    level: 2,
    titel: 'Wer hat Automatik auf dem Hof',
    aufgabe:
      'Pro Händler die Anzahl seiner Fahrzeuge mit Automatikgetriebe. Spalten: Händlername und Anzahl. Meiste zuerst, bei Gleichstand nach Name.',
    reihenfolgeZaehlt: true,
    hinweise: [
      'Erst filtern (WHERE), dann gruppieren.',
      "Der Wert in der Spalte transmission heißt 'automatic'.",
    ],
    loesung: `
select d.name, count(*) as total
from dealers d
join cars c on c.dealer_id = d.id
where c.transmission = 'automatic'
group by d.id, d.name
order by count(*) desc, d.name
`,
  },
  {
    id: 'a42',
    level: 2,
    titel: 'Die alten Hasen',
    aufgabe:
      'Alle Fahrzeuge von Händlern, die vor 2005 gegründet wurden. Spalten: Händlername, Gründungsjahr, Marke, Modell. Sortiert nach Gründungsjahr, dann Marke, dann Modell.',
    reihenfolgeZaehlt: true,
    hinweise: [
      'Die Bedingung betrifft die Händlertabelle, das Ergebnis zeigt auch Fahrzeugspalten.',
      'Das Gründungsjahr steht in dealers.founded.',
    ],
    loesung: `
select d.name, d.founded, c.brand, c.model
from dealers d
join cars c on c.dealer_id = d.id
where d.founded < 2005
order by d.founded, c.brand, c.model
`,
  },
  {
    id: 'a43',
    level: 2,
    titel: 'Wie viel sind die Autos gelaufen',
    aufgabe:
      'Pro Händler die durchschnittliche Laufleistung seiner Fahrzeuge, auf ganze Kilometer gerundet. Spalten: Händlername und Durchschnitt. Höchster Durchschnitt zuerst.',
    reihenfolgeZaehlt: true,
    hinweise: [
      'ROUND ohne zweites Argument rundet auf eine ganze Zahl.',
      'Gruppier über die Händler-id mit.',
    ],
    loesung: `
select d.name, round(avg(c.mileage)) as avg_mileage
from dealers d
join cars c on c.dealer_id = d.id
group by d.id, d.name
order by round(avg(c.mileage)) desc
`,
  },
  {
    id: 'a44',
    level: 2,
    titel: 'Welche Marken führt wer',
    aufgabe:
      'Für jede Kombination aus Händler und Marke die Anzahl der Fahrzeuge. Spalten: Händlername, Marke, Anzahl. Sortiert nach Händlername, dann Marke.',
    reihenfolgeZaehlt: true,
    hinweise: [
      'GROUP BY darf mehrere Spalten enthalten – dann gibt es eine Gruppe pro Kombination.',
    ],
    loesung: `
select d.name, c.brand, count(*) as total
from dealers d
join cars c on c.dealer_id = d.id
group by d.id, d.name, c.brand
order by d.name, c.brand
`,
  },

  {
    id: 'a45',
    level: 3,
    titel: 'Wie steht es um die Anfragen',
    aufgabe: 'Die Anzahl der Anfragen je Status. Spalten: Status und Anzahl.',
    reihenfolgeZaehlt: false,
    hinweise: ['Eine Tabelle, ein GROUP BY – mehr brauchst du hier nicht.'],
    loesung: `
select status, count(*) as total
from inquiries
group by status
`,
  },
  {
    id: 'a46',
    level: 3,
    titel: 'Was sucht Hamburg',
    aufgabe:
      'Alle Kunden aus Hamburg mit den Fahrzeugen, die sie angefragt haben. Spalten: Vorname, Nachname, Marke, Modell. Sortiert nach Nachname, dann Marke, dann Modell.',
    reihenfolgeZaehlt: true,
    hinweise: [
      'Zwei JOINs: customers → inquiries → cars.',
      'Die Stadt des Kunden steht in customers.city.',
    ],
    loesung: `
select cu.first_name, cu.last_name, c.brand, c.model
from customers cu
join inquiries i on i.customer_id = cu.id
join cars c on c.id = i.car_id
where cu.city = 'Hamburg'
order by cu.last_name, c.brand, c.model
`,
  },
  {
    id: 'a47',
    level: 3,
    titel: 'Mehrere Interessenten',
    aufgabe:
      'Fahrzeuge, die von mindestens zwei verschiedenen Kunden angefragt wurden. Spalten: Marke, Modell, Anzahl verschiedener Kunden. Meiste zuerst, bei Gleichstand nach Marke, dann Modell.',
    reihenfolgeZaehlt: true,
    hinweise: [
      'Manche Kunden fragen dasselbe Auto zweimal an. COUNT(*) zählt die dann doppelt.',
      'COUNT(DISTINCT spalte) zählt jeden Wert nur einmal.',
    ],
    loesung: `
select c.brand, c.model, count(distinct i.customer_id) as customers
from cars c
join inquiries i on i.car_id = c.id
group by c.id, c.brand, c.model
having count(distinct i.customer_id) >= 2
order by count(distinct i.customer_id) desc, c.brand, c.model
`,
  },
  {
    id: 'a48',
    level: 3,
    titel: 'Wer wartet am längsten',
    aufgabe:
      'Alle offenen Anfragen mit Kunde und Fahrzeug. Spalten: Vorname, Nachname, Marke, Modell, Anfragedatum. Älteste zuerst; bei gleichem Datum nach Nachname, dann Marke.',
    reihenfolgeZaehlt: true,
    hinweise: [
      "Offen heißt in den Daten status = 'open'.",
      'Jonas hat zwei Anfragen am selben Tag gestellt – deshalb reicht das Datum als Sortierung nicht.',
    ],
    loesung: `
select cu.first_name, cu.last_name, c.brand, c.model, i.created_at
from inquiries i
join customers cu on cu.id = i.customer_id
join cars c on c.id = i.car_id
where i.status = 'open'
order by i.created_at, cu.last_name, c.brand
`,
  },

  {
    id: 'a49',
    level: 4,
    titel: 'Unfallstatus unbekannt',
    aufgabe:
      'Alle Fahrzeuge, bei denen nicht bekannt ist, ob sie unfallfrei sind. Spalten: Marke und Modell. Sortiert nach Marke, dann Modell.',
    reihenfolgeZaehlt: true,
    hinweise: [
      '= NULL funktioniert nicht. Dafür gibt es einen eigenen Operator.',
    ],
    loesung: `
select brand, model
from cars
where accident_free is null
order by brand, model
`,
  },
  {
    id: 'a50',
    level: 4,
    titel: 'Alle Händler, auch die leeren',
    aufgabe:
      'Jeder Händler mit der Anzahl seiner Fahrzeuge – Händler ohne Bestand sollen mit 0 erscheinen. Spalten: Name und Anzahl. Meiste zuerst, bei Gleichstand nach Name.',
    reihenfolgeZaehlt: true,
    hinweise: [
      'Ohne LEFT JOIN fehlen die Händler ohne Bestand ganz.',
      'COUNT(*) zählt Zeilen – auch die aufgefüllte NULL-Zeile. Das ergibt 1 statt 0.',
      'COUNT(spalte) zählt nur Zeilen, in denen dort etwas steht.',
    ],
    loesung: `
select d.name, count(c.id) as total
from dealers d
left join cars c on c.dealer_id = d.id
group by d.id, d.name
order by count(c.id) desc, d.name
`,
  },
  {
    id: 'a51',
    level: 4,
    titel: 'Wie lückenhaft ist der TÜV',
    aufgabe:
      'Eine einzige Zeile mit drei Zahlen: Anzahl aller Fahrzeuge, Anzahl mit hinterlegtem TÜV-Datum, Anzahl ohne. In dieser Reihenfolge.',
    reihenfolgeZaehlt: false,
    hinweise: [
      'COUNT(*) und COUNT(spalte) liefern unterschiedliche Zahlen, sobald NULLs im Spiel sind.',
      'Die dritte Zahl ist die Differenz der ersten beiden.',
    ],
    loesung: `
select count(*) as total,
       count(inspection_due) as with_inspection,
       count(*) - count(inspection_due) as without_inspection
from cars
`,
  },
  {
    id: 'a52',
    level: 4,
    titel: 'Jeder Kunde, auch die stillen',
    aufgabe:
      'Alle Kunden mit der Anzahl ihrer Anfragen, auch wenn diese 0 ist. Spalten: Vorname, Nachname, Anzahl. Meiste zuerst, bei Gleichstand nach Nachname.',
    reihenfolgeZaehlt: true,
    hinweise: [
      'Dasselbe Muster wie bei den Händlern ohne Bestand.',
      'Zähl eine Spalte der rechten Tabelle, nicht die Zeilen.',
    ],
    loesung: `
select cu.first_name, cu.last_name, count(i.id) as inquiries
from customers cu
left join inquiries i on i.customer_id = cu.id
group by cu.id, cu.first_name, cu.last_name
order by count(i.id) desc, cu.last_name
`,
  },

  {
    id: 'a53',
    level: 5,
    titel: 'Eine Rangliste nach Preis',
    aufgabe:
      'Alle Fahrzeuge mit ihrem Preisrang – das teuerste bekommt Rang 1. Spalten: Marke, Modell, Preis, Rang. Sortiert nach Rang.',
    reihenfolgeZaehlt: true,
    hinweise: [
      'RANK() OVER (ORDER BY …) vergibt Ränge über die ganze Tabelle.',
      'Ohne PARTITION BY gibt es nur ein einziges Fenster.',
    ],
    loesung: `
select brand, model, price,
       rank() over (order by price desc) as price_rank
from cars
order by price_rank
`,
  },
  {
    id: 'a54',
    level: 5,
    titel: 'Was es vorher gekostet hat',
    aufgabe:
      'Jeder Eintrag der Preishistorie mit dem jeweils vorherigen Preis desselben Fahrzeugs daneben. Spalten: Fahrzeug-ID, Gültig ab, Preis, vorheriger Preis. Beim ersten Eintrag eines Fahrzeugs ist der vorherige Preis leer. Sortiert nach Fahrzeug-ID, dann Datum.',
    reihenfolgeZaehlt: true,
    hinweise: [
      'LAG(spalte) holt den Wert aus der vorigen Zeile des Fensters.',
      'Das Fenster muss pro Fahrzeug gebildet und nach Datum sortiert sein.',
    ],
    loesung: `
select car_id, valid_from, price,
       lag(price) over (partition by car_id order by valid_from) as previous_price
from price_history
order by car_id, valid_from
`,
  },
  {
    id: 'a55',
    level: 5,
    titel: 'Preisänderungen pro Jahr',
    aufgabe:
      'Die Anzahl der Preisänderungen pro Kalenderjahr. Spalten: Jahr (als Zahl) und Anzahl. Chronologisch sortiert.',
    reihenfolgeZaehlt: true,
    hinweise: [
      'EXTRACT(YEAR FROM datum) holt das Jahr als Zahl heraus.',
      'Denselben Ausdruck brauchst du im GROUP BY.',
    ],
    loesung: `
select extract(year from valid_from) as year, count(*) as changes
from price_history
group by extract(year from valid_from)
order by year
`,
  },
  {
    id: 'a56',
    level: 5,
    titel: 'Im Vergleich zur eigenen Marke',
    aufgabe:
      'Jedes Fahrzeug mit dem Durchschnittspreis seiner Marke daneben, auf zwei Nachkommastellen gerundet. Spalten: Marke, Modell, Preis, Markendurchschnitt. Sortiert nach Marke, dann Preis absteigend.',
    reihenfolgeZaehlt: true,
    hinweise: [
      'AVG funktioniert auch als Fensterfunktion: AVG(spalte) OVER (PARTITION BY …).',
      'Im Unterschied zu GROUP BY bleibt dabei jede Zeile erhalten.',
    ],
    loesung: `
select brand, model, price,
       round(avg(price) over (partition by brand), 2) as brand_avg
from cars
order by brand, price desc
`,
  },

  {
    id: 'a57',
    level: 6,
    titel: 'Wo die Namen fehlen',
    aufgabe:
      'Pro Quelle die Anzahl der Einträge ohne hinterlegten Namen. Nur Quellen, bei denen das mindestens einmal vorkommt. Spalten: Quelle und Anzahl.',
    reihenfolgeZaehlt: false,
    hinweise: [
      'Filter zuerst auf die Einträge ohne Namen, dann gruppieren.',
    ],
    loesung: `
select source, count(*) as total
from leads
where name is null
group by source
`,
  },
  {
    id: 'a58',
    level: 6,
    titel: 'Welche Mailanbieter',
    aufgabe:
      'Pro Maildomain (der Teil hinter dem @) die Anzahl verschiedener Personen. Groß-/Kleinschreibung und Leerzeichen sollen dabei keine Rolle spielen. Spalten: Domain und Anzahl. Meiste zuerst, bei Gleichstand alphabetisch nach Domain.',
    reihenfolgeZaehlt: true,
    hinweise: [
      "SPLIT_PART(text, '@', 2) liefert den Teil nach dem ersten @.",
      'Erst bereinigen, dann zerlegen.',
      'Personen, nicht Einträge – also COUNT(DISTINCT …).',
    ],
    loesung: `
select split_part(lower(trim(email)), '@', 2) as domain,
       count(distinct lower(trim(email))) as persons
from leads
group by split_part(lower(trim(email)), '@', 2)
order by count(distinct lower(trim(email))) desc, domain
`,
  },
  {
    id: 'a59',
    level: 6,
    titel: 'Erster und letzter Kontakt',
    aufgabe:
      'Für jede Person mit mehr als einem Eintrag: bereinigte E-Mail, Zeitpunkt des ersten und des letzten Eintrags.',
    reihenfolgeZaehlt: false,
    hinweise: [
      'MIN und MAX funktionieren auch auf Zeitstempeln.',
      'Die Bedingung „mehr als ein Eintrag" betrifft die Gruppe.',
    ],
    loesung: `
select lower(trim(email)) as email,
       min(captured_at) as first_contact,
       max(captured_at) as last_contact
from leads
group by lower(trim(email))
having count(*) > 1
`,
  },
  {
    id: 'a60',
    level: 6,
    titel: 'Doppelt abgeschickt',
    aufgabe:
      'Finde Einträge, die weniger als zehn Minuten nach einem vorherigen Eintrag derselben Person erfasst wurden – typische Doppelklicks im Formular. Spalten: bereinigte E-Mail und Erfassungszeitpunkt des späteren Eintrags.',
    reihenfolgeZaehlt: false,
    hinweise: [
      'LAG holt den vorherigen Zeitpunkt – pro Person, nach Zeit sortiert.',
      'Die Differenz zweier Zeitstempel ist ein Intervall. Vergleichen kannst du mit interval \'10 minutes\'.',
      'Fensterfunktionen dürfen nicht ins WHERE – also ein CTE.',
    ],
    loesung: `
with folge as (
  select lower(trim(email)) as email,
         captured_at,
         lag(captured_at) over (
           partition by lower(trim(email)) order by captured_at
         ) as previous
  from leads
)
select email, captured_at
from folge
where captured_at - previous < interval '10 minutes'
`,
  },

  {
    id: 'a61',
    level: 7,
    titel: 'Ladenhüter',
    aufgabe:
      'Alle Fahrzeuge, zu denen es noch keine einzige Anfrage gibt. Spalten: Marke und Modell. Sortiert nach Marke, dann Modell.',
    reihenfolgeZaehlt: true,
    hinweise: [
      'NOT EXISTS mit einer Unterabfrage, die auf das äußere Fahrzeug Bezug nimmt.',
      'LEFT JOIN plus IS NULL wäre ebenfalls richtig.',
    ],
    loesung: `
select c.brand, c.model
from cars c
where not exists (
  select 1 from inquiries i where i.car_id = c.id
)
order by c.brand, c.model
`,
  },
  {
    id: 'a62',
    level: 7,
    titel: 'Der Einstieg in jede Marke',
    aufgabe:
      'Das günstigste Fahrzeug jeder Marke. Löse es mit einer Unterabfrage, die sich auf die äußere Zeile bezieht. Spalten: Marke, Modell, Preis. Günstigstes zuerst.',
    reihenfolgeZaehlt: true,
    hinweise: [
      'Die innere Abfrage sucht den Mindestpreis – aber nur innerhalb derselben Marke wie die äußere Zeile.',
      'Dafür bekommt die innere Tabelle einen anderen Alias, etwa c2.',
    ],
    loesung: `
select c.brand, c.model, c.price
from cars c
where c.price = (
  select min(c2.price) from cars c2 where c2.brand = c.brand
)
order by c.price
`,
  },
  {
    id: 'a63',
    level: 7,
    titel: 'Immer im Programm',
    aufgabe:
      'Welche Marken kommen sowohl im aktuellen Bestand als auch im Archiv vor? Eine Spalte: Marke. Alphabetisch.',
    reihenfolgeZaehlt: true,
    hinweise: [
      'INTERSECT behält nur, was in beiden Ergebnissen vorkommt.',
    ],
    loesung: `
select brand from cars
intersect
select brand from cars_archive
order by brand
`,
  },
  {
    id: 'a64',
    level: 7,
    titel: 'Laufleistung nach Getriebe',
    aufgabe:
      "Teile die Fahrzeuge nach Laufleistung ein: unter 50.000 km 'low', unter 120.000 km 'medium', sonst 'high'. Zeig pro Getriebeart und Kategorie die Anzahl. Spalten: Getriebe, Kategorie, Anzahl.",
    reihenfolgeZaehlt: false,
    hinweise: [
      'CASE im SELECT, und derselbe CASE im GROUP BY.',
      'GROUP BY über zwei Ausdrücke: die Getriebeart und den CASE.',
    ],
    loesung: `
select transmission,
       case
         when mileage < 50000 then 'low'
         when mileage < 120000 then 'medium'
         else 'high'
       end as category,
       count(*) as total
from cars
group by transmission,
         case
           when mileage < 50000 then 'low'
           when mileage < 120000 then 'medium'
           else 'high'
         end
`,
  },

  {
    id: 'a65',
    level: 8,
    art: 'zustand',
    titel: 'Zwei auf einmal merken',
    aufgabe:
      "Setz für Kunde 1 die Fahrzeuge 2 und 5 auf die Merkliste, beide mit der Notiz 'compare' und Priorität 2 – in einer einzigen Anweisung.",
    reihenfolgeZaehlt: false,
    pruefung: `
select customer_id, car_id, note, priority
from watchlist
order by customer_id, car_id
`,
    hinweise: [
      'Hinter VALUES dürfen mehrere Klammern stehen, durch Komma getrennt.',
    ],
    loesung: `
insert into watchlist (customer_id, car_id, note, priority) values
  (1, 2, 'compare', 2),
  (1, 5, 'compare', 2);
`,
  },
  {
    id: 'a66',
    level: 8,
    art: 'zustand',
    titel: 'Neu lackiert',
    aufgabe:
      "Alle silbernen Fahrzeuge mit Baujahr vor 2019 wurden grau umlackiert. Trag das ein: Die Farbe wird 'gray'.",
    reihenfolgeZaehlt: true,
    pruefung: `
select brand, model, year, color
from cars
order by brand, model
`,
    hinweise: [
      'Zwei Bedingungen im WHERE.',
      "Die Farben heißen in den Daten 'silver' und 'gray'.",
    ],
    loesung: `
update cars
set color = 'gray'
where color = 'silver'
  and year < 2019;
`,
  },
  {
    id: 'a67',
    level: 8,
    art: 'zustand',
    titel: 'Hochläufer aus den Anfragen',
    aufgabe:
      'Lösch alle Anfragen zu Fahrzeugen mit mehr als 130.000 km Laufleistung. Die Laufleistung steht nicht in der Anfragetabelle.',
    reihenfolgeZaehlt: true,
    pruefung: `
select customer_id, car_id, created_at, status
from inquiries
order by created_at, customer_id, car_id
`,
    hinweise: [
      'DELETE kann in seinem WHERE eine Unterabfrage benutzen.',
      'car_id IN (select id from cars where …)',
    ],
    loesung: `
delete from inquiries
where car_id in (
  select id from cars where mileage > 130000
);
`,
  },
  {
    id: 'a68',
    level: 8,
    art: 'zustand',
    titel: 'München räumt auf',
    aufgabe:
      "Alle noch offenen Anfragen von Kunden aus München werden geschlossen: Setz ihren Status auf 'rejected'. Bereits beantwortete Anfragen bleiben, wie sie sind.",
    reihenfolgeZaehlt: true,
    pruefung: `
select customer_id, car_id, created_at, status
from inquiries
order by created_at, customer_id, car_id
`,
    hinweise: [
      'Die Stadt steht beim Kunden, nicht bei der Anfrage.',
      "Offen heißt 'open', München heißt 'Munich'.",
      'Ohne die Statusbedingung würdest du auch beantwortete Anfragen auf abgelehnt setzen.',
    ],
    loesung: `
update inquiries
set status = 'rejected'
where status = 'open'
  and customer_id in (select id from customers where city = 'Munich');
`,
  },

  {
    id: 'a69',
    level: 9,
    art: 'zustand',
    titel: 'Eine Spalte nachrüsten',
    aufgabe:
      "Ergänz die Tabelle cars um eine Spalte fuel vom Typ text. Sie ist Pflichtfeld, und alle vorhandenen Fahrzeuge sollen den Wert 'petrol' bekommen.",
    reihenfolgeZaehlt: true,
    pruefung: `
select column_name, data_type, is_nullable,
       coalesce(column_default, '-') as column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'cars'
order by ordinal_position
`,
    hinweise: [
      'ALTER TABLE tabelle ADD COLUMN spalte typ …;',
      'Eine Pflichtspalte lässt sich nur hinzufügen, wenn es für die bestehenden Zeilen einen Wert gibt – dafür sorgt DEFAULT.',
    ],
    loesung: `
alter table cars
add column fuel text not null default 'petrol';
`,
  },
  {
    id: 'a70',
    level: 9,
    art: 'zustand',
    titel: 'Ein Schlüssel aus zwei Spalten',
    aufgabe:
      'Leg eine Tabelle favorites an, mit genau zwei Spalten: customer_id (Verweis auf customers) und car_id (Verweis auf cars). Jede Kombination darf nur einmal vorkommen – und diese Kombination ist der Primärschlüssel. Keine eigene id-Spalte.',
    reihenfolgeZaehlt: true,
    pruefung: `
select 'spalte ' || ordinal_position || ': ' || column_name
       || ' / ' || data_type || ' / null=' || is_nullable as feature
from information_schema.columns
where table_schema = 'public' and table_name = 'favorites'
union all
select 'regel: ' || tc.constraint_type || ' auf '
       || string_agg(kcu.column_name, ',' order by kcu.column_name)
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on kcu.constraint_name = tc.constraint_name
 and kcu.table_name = tc.table_name
where tc.table_schema = 'public' and tc.table_name = 'favorites'
group by tc.constraint_name, tc.constraint_type
order by feature
`,
    hinweise: [
      'Ein zusammengesetzter Primärschlüssel steht am Ende der Spaltenliste: primary key (spalte1, spalte2).',
      'REFERENCES hinter jeder Spalte macht sie zum Fremdschlüssel.',
    ],
    loesung: `
create table favorites (
  customer_id int references customers(id),
  car_id      int references cars(id),
  primary key (customer_id, car_id)
);
`,
  },
  {
    id: 'a71',
    level: 9,
    art: 'zustand',
    titel: 'Eine View mit Kennzahlen',
    aufgabe:
      'Leg eine View dealer_stats an mit den Spalten name, city, car_count und total_value – pro Händler mit Bestand einmal Name, Stadt, Anzahl Fahrzeuge und Summe der Preise.',
    reihenfolgeZaehlt: true,
    pruefung: `
select name, city, car_count, total_value
from dealer_stats
order by name
`,
    hinweise: [
      'Eine View darf ein GROUP BY enthalten.',
      'Die Spaltennamen der View kommen aus den Aliasen deines SELECT – hier müssen sie exakt stimmen.',
    ],
    loesung: `
create view dealer_stats as
select d.name, d.city,
       count(c.id) as car_count,
       sum(c.price) as total_value
from dealers d
join cars c on c.dealer_id = d.id
group by d.id, d.name, d.city;
`,
  },
  {
    id: 'a72',
    level: 9,
    art: 'zustand',
    titel: 'Eine Regel über zwei Spalten',
    aufgabe:
      'Leg eine Tabelle price_changes an: id (Primärschlüssel), car_id (Pflichtfeld, Verweis auf cars), old_price und new_price (beide numeric(10,2), Pflichtfeld) und changed_on (Datum, Pflichtfeld, standardmäßig heute). Die Datenbank soll verhindern, dass new_price größer oder gleich old_price ist.',
    reihenfolgeZaehlt: true,
    pruefung: `
select 'spalte ' || ordinal_position || ': ' || column_name
       || ' / ' || data_type || ' / null=' || is_nullable
       || ' / default=' || (column_default is not null)::text as feature
from information_schema.columns
where table_schema = 'public' and table_name = 'price_changes'
union all
select 'regel: ' || constraint_type || ' x' || count(*)
from information_schema.table_constraints
where table_schema = 'public' and table_name = 'price_changes'
group by constraint_type
order by feature
`,
    hinweise: [
      'Ein CHECK darf mehrere Spalten vergleichen. Dann steht er nicht hinter einer Spalte, sondern als eigene Zeile am Ende.',
      'check (new_price < old_price)',
    ],
    loesung: `
create table price_changes (
  id         serial primary key,
  car_id     int           not null references cars(id),
  old_price  numeric(10,2) not null,
  new_price  numeric(10,2) not null,
  changed_on date          not null default current_date,
  check (new_price < old_price)
);
`,
  },
];

export function tasksNachLevel(): { level: number; tasks: Task[] }[] {
  const map = new Map<number, Task[]>();
  for (const t of tasks) {
    if (!map.has(t.level)) map.set(t.level, []);
    map.get(t.level)!.push(t);
  }
  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([level, tasks]) => ({ level, tasks }));
}
