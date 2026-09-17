/**
 * Der Datensatz waechst mit jedem Level. Stand fuer Level N = Migration 1..N.
 * Jede Migration darf Tabellen/Spalten ergaenzen, aber niemals bestehende
 * Aufgaben unloesbar machen.
 */

export type Migration = {
  level: number;
  /** Was in diesem Schritt dazukommt - wird im Schema-Panel angezeigt. */
  label: string;
  /** Welche SQL-Konzepte dieser Stand erst moeglich macht. */
  freischaltet: string;
  sql: string;
};

export const migrations: Migration[] = [
  {
    level: 1,
    label: 'fahrzeuge',
    freischaltet: 'SELECT, WHERE, ORDER BY, GROUP BY',
    sql: `
create table fahrzeuge (
  id        serial primary key,
  marke     text not null,
  modell    text not null,
  baujahr   int  not null,
  km_stand  int  not null,
  preis     numeric(10,2) not null,
  farbe     text not null,
  getriebe  text not null
);

insert into fahrzeuge (marke, modell, baujahr, km_stand, preis, farbe, getriebe) values
  ('Volkswagen', 'Golf VII',      2017, 118400,  12900.00, 'silber',   'manuell'),
  ('Volkswagen', 'Passat B8',     2019,  94200,  18750.00, 'schwarz',  'automatik'),
  ('Volkswagen', 'Polo VI',       2020,  41300,  13400.00, 'weiss',    'manuell'),
  ('BMW',        '320d F30',      2016, 167900,  11250.00, 'grau',     'automatik'),
  ('BMW',        '118i F20',      2018,  78500,  16900.00, 'blau',     'manuell'),
  ('BMW',        '520d G30',      2020,  62100,  27400.00, 'schwarz',  'automatik'),
  ('Mercedes',   'C 200 W205',    2018,  88700,  21300.00, 'silber',   'automatik'),
  ('Mercedes',   'A 180 W177',    2021,  33900,  24950.00, 'rot',      'automatik'),
  ('Mercedes',   'E 220d W213',   2017, 145200,  17800.00, 'schwarz',  'automatik'),
  ('Audi',       'A3 8V',         2016, 132600,   9950.00, 'weiss',    'manuell'),
  ('Audi',       'A4 B9',         2019, 101400,  19600.00, 'grau',     'automatik'),
  ('Audi',       'Q3 F3',         2021,  38800,  29900.00, 'blau',     'automatik'),
  ('Skoda',      'Octavia III',   2018, 124500,  11400.00, 'silber',   'manuell'),
  ('Skoda',      'Fabia III',     2019,  57200,   9800.00, 'rot',      'manuell'),
  ('Opel',       'Astra K',       2017, 109800,   8450.00, 'weiss',    'manuell'),
  ('Opel',       'Corsa F',       2021,  29400,  13950.00, 'blau',     'manuell'),
  ('Ford',       'Focus IV',      2019,  71600,  14200.00, 'grau',     'manuell'),
  ('Ford',       'Fiesta VII',    2018,  83100,   9300.00, 'rot',      'manuell'),
  ('Toyota',     'Corolla E210',  2020,  48900,  18400.00, 'weiss',    'automatik'),
  ('Toyota',     'Yaris XP210',   2022,  19700,  19850.00, 'silber',   'automatik'),
  -- Absicht: exakt auf der 15.000er-Grenze, damit < und <= sich unterscheiden.
  -- Absicht: einzige Seat im Bestand, damit HAVING count(*) >= 2 etwas bewirkt.
  ('Seat',       'Leon III',      2018,  96300,  15000.00, 'rot',      'manuell');
`,
  },

  {
    level: 2,
    label: 'haendler',
    freischaltet: 'JOIN ueber Fremdschluessel',
    sql: `
create table haendler (
  id         serial primary key,
  name       text not null,
  stadt      text not null,
  plz        text not null,
  gegruendet int  not null
);

insert into haendler (name, stadt, plz, gegruendet) values
  ('Autohaus Brunner',   'Muenchen',  '80339', 1994),
  ('Nordstern Mobile',   'Hamburg',   '22765', 2011),
  ('CarPoint Rhein',     'Koeln',     '50667', 2003),
  ('Sachsenring Autos',  'Leipzig',   '04109', 1998),
  ('Schwaben Fahrzeuge', 'Stuttgart', '70173', 2007);

alter table fahrzeuge add column haendler_id int references haendler(id);

update fahrzeuge set haendler_id = 1 where id in (1, 4, 7, 12, 16);
update fahrzeuge set haendler_id = 2 where id in (2, 5, 9, 17);
update fahrzeuge set haendler_id = 3 where id in (3, 10, 13, 18, 20);
update fahrzeuge set haendler_id = 4 where id in (6, 11, 15);
update fahrzeuge set haendler_id = 5 where id in (8, 14, 19, 21);
`,
  },

  {
    level: 3,
    label: 'kunden, anfragen',
    freischaltet: 'Mehrfach-JOIN ueber n:m, DISTINCT',
    sql: `
create table kunden (
  id             serial primary key,
  vorname        text not null,
  nachname       text not null,
  stadt          text not null,
  registriert_am date not null
);

insert into kunden (vorname, nachname, stadt, registriert_am) values
  ('Lena',    'Hofmann',   'Muenchen',  '2023-03-14'),
  ('Tobias',  'Krueger',   'Hamburg',   '2023-05-02'),
  ('Miriam',  'Seidel',    'Koeln',     '2023-07-21'),
  ('Jonas',   'Brandt',    'Muenchen',  '2024-01-09'),
  ('Aylin',   'Yildiz',    'Stuttgart', '2024-02-27'),
  ('Patrick', 'Lorenz',    'Leipzig',   '2024-04-16'),
  ('Sophie',  'Neumann',   'Hamburg',   '2024-06-03'),
  ('Dennis',  'Wagner',    'Koeln',     '2024-09-11');

create table anfragen (
  id          serial primary key,
  kunde_id    int not null references kunden(id),
  fahrzeug_id int not null references fahrzeuge(id),
  gestellt_am date not null,
  status      text not null
);

insert into anfragen (kunde_id, fahrzeug_id, gestellt_am, status) values
  (1,  7, '2024-03-02', 'beantwortet'),
  (1,  8, '2024-03-02', 'beantwortet'),
  (1,  4, '2024-03-18', 'offen'),
  (2,  2, '2024-04-05', 'beantwortet'),
  (2,  9, '2024-04-05', 'abgelehnt'),
  (3, 12, '2024-05-14', 'offen'),
  (3, 12, '2024-06-01', 'beantwortet'),
  (4,  8, '2024-06-09', 'offen'),
  (4,  7, '2024-06-09', 'offen'),
  (4,  9, '2024-07-22', 'beantwortet'),
  (5,  6, '2024-08-03', 'beantwortet'),
  (5, 12, '2024-08-19', 'offen'),
  (6, 15, '2024-09-07', 'abgelehnt'),
  (6, 16, '2024-09-30', 'beantwortet'),
  (7,  2, '2024-10-12', 'offen'),
  (7,  8, '2024-11-04', 'beantwortet'),
  (8, 12, '2024-11-25', 'offen'),
  (8, 20, '2025-01-08', 'beantwortet'),
  (2, 12, '2025-02-14', 'offen'),
  (5,  8, '2025-03-01', 'beantwortet');
`,
  },

  {
    level: 4,
    label: 'NULL-Werte, Haendler ohne Bestand',
    freischaltet: 'LEFT JOIN, IS NULL, COALESCE',
    sql: `
alter table fahrzeuge add column tuev_bis   date;
alter table fahrzeuge add column unfallfrei boolean;

update fahrzeuge set tuev_bis = '2026-04-30' where id = 1;
update fahrzeuge set tuev_bis = '2027-01-31' where id = 2;
update fahrzeuge set tuev_bis = '2027-08-31' where id = 3;
update fahrzeuge set tuev_bis = '2025-11-30' where id = 4;
update fahrzeuge set tuev_bis = '2026-09-30' where id = 6;
update fahrzeuge set tuev_bis = '2026-02-28' where id = 7;
update fahrzeuge set tuev_bis = '2028-03-31' where id = 8;
update fahrzeuge set tuev_bis = '2025-07-31' where id = 9;
update fahrzeuge set tuev_bis = '2026-12-31' where id = 11;
update fahrzeuge set tuev_bis = '2027-05-31' where id = 12;
update fahrzeuge set tuev_bis = '2026-06-30' where id = 14;
update fahrzeuge set tuev_bis = '2025-10-31' where id = 15;
update fahrzeuge set tuev_bis = '2027-03-31' where id = 16;
update fahrzeuge set tuev_bis = '2026-08-31' where id = 19;
update fahrzeuge set tuev_bis = '2028-01-31' where id = 20;
-- 5, 10, 13, 17, 18 bleiben bewusst NULL

update fahrzeuge set unfallfrei = true
  where id in (2, 3, 6, 8, 11, 12, 16, 19, 20);
update fahrzeuge set unfallfrei = false
  where id in (4, 9, 10, 15);
-- Rest bleibt NULL: unbekannt, nicht "nein"

insert into haendler (name, stadt, plz, gegruendet) values
  ('Elbmarsch Automobile', 'Bremen',    '28195', 2022),
  ('Ruhrpott Cars',        'Dortmund',  '44135', 2019);
`,
  },

  {
    level: 5,
    label: 'preis_historie',
    freischaltet: 'Datumsfunktionen, Window Functions',
    sql: `
create table preis_historie (
  id          serial primary key,
  fahrzeug_id int  not null references fahrzeuge(id),
  gueltig_ab  date not null,
  preis       numeric(10,2) not null
);

insert into preis_historie (fahrzeug_id, gueltig_ab, preis) values
  (1,  '2024-09-01', 14500.00), (1,  '2024-12-01', 13700.00), (1,  '2025-04-01', 12900.00),
  (2,  '2024-10-15', 19900.00), (2,  '2025-02-01', 18750.00),
  (3,  '2025-01-10', 13400.00),
  (4,  '2024-08-01', 13200.00), (4,  '2024-11-01', 12400.00), (4,  '2025-03-01', 11250.00),
  (5,  '2024-11-20', 17500.00), (5,  '2025-03-15', 16900.00),
  (6,  '2025-01-05', 28900.00), (6,  '2025-05-01', 27400.00),
  (7,  '2024-07-01', 23000.00), (7,  '2024-10-01', 22100.00), (7,  '2025-02-15', 21300.00),
  (8,  '2025-02-01', 24950.00),
  (9,  '2024-06-01', 19900.00), (9,  '2024-09-01', 18600.00), (9,  '2025-01-15', 17800.00),
  (10, '2024-05-01', 11800.00), (10, '2024-09-15', 10700.00), (10, '2025-02-01',  9950.00),
  (11, '2024-12-01', 20800.00), (11, '2025-04-01', 19600.00),
  (12, '2025-03-01', 29900.00),
  (13, '2024-08-15', 12900.00), (13, '2025-01-01', 11400.00),
  (14, '2024-10-01', 10500.00), (14, '2025-02-20',  9800.00),
  (15, '2024-04-01',  9900.00), (15, '2024-08-01',  9100.00), (15, '2025-01-10',  8450.00),
  (16, '2025-01-20', 13950.00),
  (17, '2024-11-01', 15400.00), (17, '2025-03-01', 14200.00),
  (18, '2024-07-15', 10600.00), (18, '2024-12-01',  9800.00), (18, '2025-04-01',  9300.00),
  (19, '2024-12-15', 19200.00), (19, '2025-04-15', 18400.00),
  (20, '2025-05-01', 19850.00),
  (21, '2025-02-10', 15000.00);
`,
  },

  {
    level: 6,
    label: 'leads (unbereinigt)',
    freischaltet: 'Duplikate finden, HAVING, Deduplizierung',
    sql: `
-- Roher Import aus drei Quellen. Absichtlich dreckig: unterschiedliche
-- Schreibweisen, Leerzeichen, Mehrfacherfassung derselben Person.
create table leads (
  id         serial primary key,
  email      text not null,
  name       text,
  quelle     text not null,
  erfasst_am timestamp not null
);

insert into leads (email, name, quelle, erfasst_am) values
  ('lena.hofmann@web.de',      'Lena Hofmann',    'messe',     '2025-01-12 09:14:00'),
  ('Lena.Hofmann@web.de',      'L. Hofmann',      'website',   '2025-02-03 17:41:00'),
  ('  lena.hofmann@web.de ',   'Lena Hofmann',    'telefon',   '2025-03-20 11:02:00'),
  ('t.krueger@gmx.net',        'Tobias Krueger',  'website',   '2025-01-28 14:33:00'),
  ('T.KRUEGER@GMX.NET',        NULL,              'messe',     '2025-04-11 10:05:00'),
  ('miriam.seidel@posteo.de',  'Miriam Seidel',   'website',   '2025-02-17 08:50:00'),
  ('jonas.brandt@icloud.com',  'Jonas Brandt',    'telefon',   '2025-03-02 16:20:00'),
  ('jonas.brandt@icloud.com',  'Jonas Brandt',    'website',   '2025-03-02 16:24:00'),
  ('aylin.yildiz@web.de',      'Aylin Yildiz',    'messe',     '2025-03-29 12:11:00'),
  ('aylin.yildiz@web.de ',     'Aylin Y.',        'website',   '2025-05-14 19:03:00'),
  ('p.lorenz@freenet.de',      NULL,              'website',   '2025-04-07 07:45:00'),
  ('sophie.neumann@gmail.com', 'Sophie Neumann',  'telefon',   '2025-04-22 13:37:00'),
  ('d.wagner@t-online.de',     'Dennis Wagner',   'messe',     '2025-05-30 15:58:00'),
  ('D.Wagner@t-online.de',     'Dennis Wagner',   'website',   '2025-06-18 09:27:00'),
  ('d.wagner@t-online.de',     'D. Wagner',       'telefon',   '2025-07-04 18:12:00');
`,
  },
];

export const MAX_LEVEL = migrations.length;

/** Alle Migrationen bis einschliesslich level, als ein SQL-Block. */
export function schemaBis(level: number): string {
  return migrations
    .filter((m) => m.level <= level)
    .map((m) => m.sql)
    .join('\n');
}
