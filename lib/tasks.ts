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
select marke, modell, preis
from fahrzeuge
where preis < 15000
order by preis asc
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
      "In der Spalte getriebe steht 'manuell' oder 'automatik'.",
    ],
    loesung: `
select marke, modell, baujahr, km_stand
from fahrzeuge
where getriebe = 'manuell'
  and km_stand < 60000
order by km_stand asc
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
select marke, count(*) as anzahl
from fahrzeuge
group by marke
having count(*) >= 2
order by count(*) desc, marke asc
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
select getriebe,
       count(*) as anzahl,
       round(avg(preis), 2) as schnittpreis
from fahrzeuge
group by getriebe
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
      'fahrzeuge.haendler_id zeigt auf haendler.id.',
      'Tabellen-Aliase (f, h) sparen dir viel Tipperei.',
    ],
    loesung: `
select f.marke, f.modell, h.name, h.stadt
from fahrzeuge f
join haendler h on h.id = f.haendler_id
order by h.stadt, f.marke, f.modell
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
select h.name, h.stadt,
       count(f.id) as anzahl,
       sum(f.preis) as bestandswert
from haendler h
join fahrzeuge f on f.haendler_id = h.id
group by h.id, h.name, h.stadt
order by sum(f.preis) desc
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
      'Der Weg geht über zwei JOINs: kunden → anfragen → fahrzeuge.',
      'Wer zwei Mercedes angefragt hat, taucht sonst doppelt auf.',
    ],
    loesung: `
select distinct k.vorname, k.nachname
from kunden k
join anfragen a on a.kunde_id = k.id
join fahrzeuge f on f.id = a.fahrzeug_id
where f.marke = 'Mercedes'
order by k.nachname
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
select f.marke, f.modell, count(a.id) as anfragen
from fahrzeuge f
join anfragen a on a.fahrzeug_id = f.id
group by f.id, f.marke, f.modell
order by count(a.id) desc, f.marke asc
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
select h.name, h.stadt
from haendler h
left join fahrzeuge f on f.haendler_id = h.id
where f.id is null
order by h.name
`,
  },
  {
    id: 'a10',
    level: 4,
    titel: 'TÜV läuft ab oder ist unklar',
    aufgabe:
      'Alle Fahrzeuge, deren TÜV vor dem 01.06.2026 abläuft oder gar nicht hinterlegt ist. Spalten: Marke, Modell und eine Spalte mit dem TÜV-Datum im Format MM/YYYY – wenn keines hinterlegt ist, steht dort "unbekannt".',
    reihenfolgeZaehlt: false,
    hinweise: [
      'NULL < irgendwas ergibt nicht true, sondern NULL. Du brauchst eine zweite Bedingung.',
      "TO_CHAR(datum, 'MM/YYYY') formatiert, COALESCE fängt den NULL-Fall ab.",
    ],
    loesung: `
select marke, modell,
       coalesce(to_char(tuev_bis, 'MM/YYYY'), 'unbekannt') as tuev
from fahrzeuge
where tuev_bis < date '2026-06-01'
   or tuev_bis is null
`,
  },
  {
    id: 'a11',
    level: 4,
    titel: 'Unfallfrei, nicht unfallfrei, keine Ahnung',
    aufgabe:
      'Zähl die Fahrzeuge nach Unfall-Status. Fahrzeuge ohne Angabe sollen als eigene Gruppe "unbekannt" erscheinen, nicht bei "false" mitlaufen. Zwei Spalten: Status und Anzahl.',
    reihenfolgeZaehlt: false,
    hinweise: [
      'Ein boolean lässt sich mit ::text in Text umwandeln.',
      'Gruppieren kannst du auch über einen berechneten Ausdruck, nicht nur über eine Spalte.',
    ],
    loesung: `
select coalesce(unfallfrei::text, 'unbekannt') as status,
       count(*) as anzahl
from fahrzeuge
group by coalesce(unfallfrei::text, 'unbekannt')
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
with verlauf as (
  select fahrzeug_id,
         first_value(preis) over (partition by fahrzeug_id order by gueltig_ab asc)  as start_preis,
         first_value(preis) over (partition by fahrzeug_id order by gueltig_ab desc) as akt_preis,
         count(*) over (partition by fahrzeug_id) as eintraege
  from preis_historie
)
select distinct f.marke, f.modell,
       v.start_preis,
       v.akt_preis,
       v.start_preis - v.akt_preis as nachlass
from verlauf v
join fahrzeuge f on f.id = v.fahrzeug_id
where v.eintraege > 1
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
select to_char(gueltig_ab, 'YYYY-MM') as monat,
       count(*) as aenderungen
from preis_historie
group by to_char(gueltig_ab, 'YYYY-MM')
having count(*) >= 3
order by monat asc
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
       count(*) as eintraege
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
       quelle,
       erfasst_am
from leads
order by lower(trim(email)), erfasst_am asc
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
      "In den Daten ist die Stadt ohne Umlaut geschrieben: 'Muenchen'.",
    ],
    loesung: `
select f.marke, f.modell, f.preis
from fahrzeuge f
join haendler h on h.id = f.haendler_id
where h.stadt = 'Muenchen'
order by f.preis desc
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
select h.stadt,
       count(*) as anzahl,
       round(avg(f.preis), 2) as schnittpreis
from haendler h
join fahrzeuge f on f.haendler_id = h.id
group by h.stadt
having count(*) >= 4
order by round(avg(f.preis), 2) desc
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
select k.vorname, k.nachname, count(a.id) as anfragen
from kunden k
join anfragen a on a.kunde_id = k.id
group by k.id, k.vorname, k.nachname
having count(a.id) >= 3
order by count(a.id) desc, k.nachname asc
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
      'Der Weg ist lang: kunden → anfragen → fahrzeuge → haendler.',
      'Die Bedingung vergleicht zwei Spalten aus zwei Tabellen miteinander, nicht eine Spalte mit einem festen Wert.',
      'Wer mehrere passende Anfragen hat, taucht sonst mehrfach auf.',
    ],
    loesung: `
select distinct k.vorname, k.nachname, k.stadt
from kunden k
join anfragen a on a.kunde_id = k.id
join fahrzeuge f on f.id = a.fahrzeug_id
join haendler h on h.id = f.haendler_id
where h.stadt = k.stadt
order by k.nachname
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
select k.vorname, k.nachname, k.registriert_am
from kunden k
left join anfragen a on a.kunde_id = k.id
where a.id is null
order by k.nachname
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
with rang as (
  select marke, modell, preis,
         row_number() over (partition by marke order by preis desc) as nr
  from fahrzeuge
)
select marke, modell, preis
from rang
where nr = 1
order by preis desc
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
with spanne as (
  select fahrzeug_id,
         min(gueltig_ab) as erster,
         max(gueltig_ab) as letzter,
         count(*) as eintraege
  from preis_historie
  group by fahrzeug_id
)
select f.marke, f.modell,
       s.erster, s.letzter,
       (s.letzter - s.erster) as tage
from spanne s
join fahrzeuge f on f.id = s.fahrzeug_id
where s.eintraege > 1
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
select quelle,
       count(distinct lower(trim(email))) as personen
from leads
group by quelle
order by count(distinct lower(trim(email))) desc, quelle asc
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
select marke, modell, preis
from fahrzeuge
where preis > (select avg(preis) from fahrzeuge)
order by preis desc
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
select marke from fahrzeuge_archiv
except
select marke from fahrzeuge
order by marke
`,
  },
  {
    id: 'a27',
    level: 7,
    titel: 'Bestand und Archiv in einer Liste',
    aufgabe:
      'Führe aktuellen Bestand und Archiv zusammen. Spalten: Marke, Modell, Preis und eine Spalte mit dem Wert "verfügbar" bzw. "verkauft". Sortiert nach Preis absteigend.',
    reihenfolgeZaehlt: true,
    hinweise: [
      'UNION ALL hängt zwei Ergebnisse aneinander, ohne Duplikate zu entfernen.',
      "Die Statusspalte ist ein fester Text, den du einfach hinschreibst: 'verfügbar' as status.",
      'Das ORDER BY gilt für das Gesamtergebnis und steht ganz am Ende, nicht in jedem Teil.',
    ],
    loesung: `
select marke, modell, preis, 'verfügbar' as status from fahrzeuge
union all
select marke, modell, preis, 'verkauft' as status from fahrzeuge_archiv
order by preis desc
`,
  },
  {
    id: 'a28',
    level: 7,
    titel: 'Preisklassen bilden',
    aufgabe:
      'Teil den Bestand in Preisklassen ein: unter 10.000 heißt "günstig", unter 20.000 "mittel", ab 20.000 "gehoben". Zeig die Klasse und die Anzahl der Fahrzeuge darin.',
    reihenfolgeZaehlt: false,
    hinweise: [
      'CASE WHEN bedingung THEN wert WHEN ... ELSE ... END bildet Fallunterscheidungen.',
      'Die Bedingungen werden von oben nach unten geprüft – die erste passende gewinnt.',
      'Denselben CASE-Ausdruck brauchst du auch im GROUP BY.',
    ],
    loesung: `
select case
         when preis < 10000 then 'günstig'
         when preis < 20000 then 'mittel'
         else 'gehoben'
       end as klasse,
       count(*) as anzahl
from fahrzeuge
group by case
           when preis < 10000 then 'günstig'
           when preis < 20000 then 'mittel'
           else 'gehoben'
         end
`,
  },

  {
    id: 'a29',
    level: 8,
    art: 'zustand',
    titel: 'Etwas auf die Merkliste setzen',
    aufgabe:
      'Setz für Kunde 3 das Fahrzeug 12 auf die Merkliste, mit der Notiz "Probefahrt vereinbaren" und Priorität 1. Alle übrigen Spalten sollen ihren Standardwert behalten.',
    reihenfolgeZaehlt: false,
    pruefung: `
select kunde_id, fahrzeug_id, notiz, prioritaet
from merkliste
order by kunde_id, fahrzeug_id
`,
    hinweise: [
      'INSERT INTO tabelle (spalten…) VALUES (werte…);',
      'Spalten, die du weglässt, füllt Postgres mit ihrem DEFAULT – genau das ist hier gewollt.',
    ],
    loesung: `
insert into merkliste (kunde_id, fahrzeug_id, notiz, prioritaet)
values (3, 12, 'Probefahrt vereinbaren', 1);
`,
  },
  {
    id: 'a30',
    level: 8,
    art: 'zustand',
    titel: 'Die Merkliste automatisch füllen',
    aufgabe:
      'Übernimm alle offenen Anfragen auf die Merkliste: für jede Anfrage mit Status "offen" ein Eintrag mit passender Kunden- und Fahrzeug-ID, Notiz "aus offener Anfrage" und Priorität 2.',
    reihenfolgeZaehlt: false,
    pruefung: `
select kunde_id, fahrzeug_id, notiz, prioritaet
from merkliste
order by kunde_id, fahrzeug_id
`,
    hinweise: [
      'Statt VALUES darf hinter INSERT INTO auch direkt ein SELECT stehen.',
      'Die Spalten des SELECT müssen in Reihenfolge und Typ zu den Zielspalten passen.',
      "Feste Werte wie 'aus offener Anfrage' schreibst du einfach als Spalte in den SELECT.",
    ],
    loesung: `
insert into merkliste (kunde_id, fahrzeug_id, notiz, prioritaet)
select a.kunde_id, a.fahrzeug_id, 'aus offener Anfrage', 2
from anfragen a
where a.status = 'offen';
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
select marke, modell, km_stand, preis
from fahrzeuge
order by marke, modell
`,
    hinweise: [
      'UPDATE tabelle SET spalte = ausdruck WHERE bedingung;',
      'Der Ausdruck darf die Spalte selbst verwenden: preis * 0.92.',
      'Runden musst du nicht – die Spalte ist numeric(10,2) und rundet beim Speichern von selbst.',
      'Ohne WHERE trifft ein UPDATE jede einzelne Zeile. Schreib es immer zuerst.',
    ],
    loesung: `
update fahrzeuge
set preis = preis * 0.92
where km_stand > 150000;
`,
  },
  {
    id: 'a32',
    level: 8,
    art: 'zustand',
    titel: 'Abgelehntes wegräumen',
    aufgabe:
      'Lösch alle Anfragen mit dem Status "abgelehnt" – aber nur die, die vor dem 01.01.2025 gestellt wurden.',
    reihenfolgeZaehlt: true,
    pruefung: `
select kunde_id, fahrzeug_id, gestellt_am, status
from anfragen
order by gestellt_am, kunde_id, fahrzeug_id
`,
    hinweise: [
      'DELETE FROM tabelle WHERE bedingung;',
      'Zwei Bedingungen mit AND verknüpfen.',
      'Tipp fürs echte Leben: Schreib die Bedingung erst als SELECT und schau dir an, was du triffst. Dann tausch SELECT gegen DELETE.',
    ],
    loesung: `
delete from anfragen
where status = 'abgelehnt'
  and gestellt_am < date '2025-01-01';
`,
  },

  {
    id: 'a33',
    level: 9,
    art: 'zustand',
    titel: 'Eine Tabelle anlegen',
    aufgabe:
      'Leg eine Tabelle `probefahrten` an, mit genau diesen Spalten in dieser Reihenfolge: `id` (ganze Zahl, Primärschlüssel), `fahrzeug_id` (ganze Zahl, Pflichtfeld), `name` (Text, Pflichtfeld), `termin` (Datum, Pflichtfeld) und `bemerkung` (Text, darf leer bleiben).',
    reihenfolgeZaehlt: true,
    pruefung: `
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'probefahrten'
order by ordinal_position
`,
    hinweise: [
      'CREATE TABLE name ( spalte typ constraints, … );',
      '`serial` erzeugt eine automatisch hochzählende ganze Zahl – dahinter steckt der Typ integer.',
      'NOT NULL macht eine Spalte zum Pflichtfeld. Lässt du es weg, sind NULL-Werte erlaubt.',
    ],
    loesung: `
create table probefahrten (
  id          serial primary key,
  fahrzeug_id int  not null,
  name        text not null,
  termin      date not null,
  bemerkung   text
);
`,
  },
  {
    id: 'a34',
    level: 9,
    art: 'zustand',
    titel: 'Regeln in die Tabelle einbauen',
    aufgabe:
      'Leg eine Tabelle `bewertungen` an mit `id` (Primärschlüssel), `haendler_id` (Pflichtfeld, Fremdschlüssel auf haendler), `sterne` (Pflichtfeld, nur Werte von 1 bis 5 erlaubt) und `text` (optional). Die Tabelle soll einen Primärschlüssel, einen Fremdschlüssel und eine CHECK-Regel besitzen.',
    reihenfolgeZaehlt: false,
    pruefung: `
select constraint_type, count(*) as anzahl
from information_schema.table_constraints
where table_schema = 'public' and table_name = 'bewertungen'
group by constraint_type
`,
    hinweise: [
      'REFERENCES haendler(id) hinter der Spalte erzeugt den Fremdschlüssel.',
      'CHECK (sterne between 1 and 5) schränkt die erlaubten Werte ein.',
      'Die Datenbank erzwingt diese Regeln – falsche Daten kommen gar nicht erst hinein.',
    ],
    loesung: `
create table bewertungen (
  id          serial primary key,
  haendler_id int  not null references haendler(id),
  sterne      int  not null check (sterne between 1 and 5),
  text        text
);
`,
  },
  {
    id: 'a35',
    level: 9,
    art: 'zustand',
    titel: 'Eine gespeicherte Abfrage',
    aufgabe:
      'Leg eine View `bestand_uebersicht` an, die Marke, Modell, Preis, Händlername und Stadt jedes Fahrzeugs zeigt – in dieser Spaltenreihenfolge.',
    reihenfolgeZaehlt: true,
    pruefung: `
select marke, modell, preis, name, stadt
from bestand_uebersicht
order by marke, modell
`,
    hinweise: [
      'CREATE VIEW name AS select …;',
      'Eine View speichert keine Daten, sondern die Abfrage selbst. Bei jedem Zugriff läuft sie neu.',
      'Die Spaltennamen der View ergeben sich aus deinem SELECT.',
    ],
    loesung: `
create view bestand_uebersicht as
select f.marke, f.modell, f.preis, h.name, h.stadt
from fahrzeuge f
join haendler h on h.id = f.haendler_id;
`,
  },
  {
    id: 'a36',
    level: 9,
    art: 'zustand',
    titel: 'Standardwerte und Eindeutigkeit',
    aufgabe:
      'Leg eine Tabelle `newsletter` an mit `id` (Primärschlüssel), `email` (Pflichtfeld, darf nur einmal vorkommen), `bestaetigt` (Wahrheitswert, Pflichtfeld, standardmäßig false) und `angemeldet_am` (Datum, Pflichtfeld, standardmäßig das heutige Datum).',
    reihenfolgeZaehlt: true,
    pruefung: `
select 'spalte ' || ordinal_position || ': ' || column_name
       || ' / ' || data_type
       || ' / null=' || is_nullable
       || ' / default=' || (column_default is not null)::text as merkmal
from information_schema.columns
where table_schema = 'public' and table_name = 'newsletter'
union all
select 'regel: ' || constraint_type
from information_schema.table_constraints
where table_schema = 'public' and table_name = 'newsletter'
order by merkmal
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
  bestaetigt    boolean not null default false,
  angemeldet_am date    not null default current_date
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
