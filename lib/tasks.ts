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
