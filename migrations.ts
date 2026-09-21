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
    label: 'cars',
    freischaltet: 'SELECT, WHERE, ORDER BY, GROUP BY',
    sql: `
create table cars (
  id        serial primary key,
  brand     text not null,
  model    text not null,
  year   int  not null,
  mileage  int  not null,
  price     numeric(10,2) not null,
  color     text not null,
  transmission  text not null
);

insert into cars (brand, model, year, mileage, price, color, transmission) values
  ('Volkswagen', 'Golf VII',      2017, 118400,  12900.00, 'silver',   'manual'),
  ('Volkswagen', 'Passat B8',     2019,  94200,  18750.00, 'black',  'automatic'),
  ('Volkswagen', 'Polo VI',       2020,  41300,  13400.00, 'white',    'manual'),
  ('BMW',        '320d F30',      2016, 167900,  11250.00, 'gray',     'automatic'),
  ('BMW',        '118i F20',      2018,  78500,  16900.00, 'blue',     'manual'),
  ('BMW',        '520d G30',      2020,  62100,  27400.00, 'black',  'automatic'),
  ('Mercedes',   'C 200 W205',    2018,  88700,  21300.00, 'silver',   'automatic'),
  ('Mercedes',   'A 180 W177',    2021,  33900,  24950.00, 'red',      'automatic'),
  ('Mercedes',   'E 220d W213',   2017, 145200,  17800.00, 'black',  'automatic'),
  ('Audi',       'A3 8V',         2016, 132600,   9950.00, 'white',    'manual'),
  ('Audi',       'A4 B9',         2019, 101400,  19600.00, 'gray',     'automatic'),
  ('Audi',       'Q3 F3',         2021,  38800,  29900.00, 'blue',     'automatic'),
  ('Skoda',      'Octavia III',   2018, 124500,  11400.00, 'silver',   'manual'),
  ('Skoda',      'Fabia III',     2019,  57200,   9800.00, 'red',      'manual'),
  ('Opel',       'Astra K',       2017, 109800,   8450.00, 'white',    'manual'),
  ('Opel',       'Corsa F',       2021,  29400,  13950.00, 'blue',     'manual'),
  ('Ford',       'Focus IV',      2019,  71600,  14200.00, 'gray',     'manual'),
  ('Ford',       'Fiesta VII',    2018,  83100,   9300.00, 'red',      'manual'),
  ('Toyota',     'Corolla E210',  2020,  48900,  18400.00, 'white',    'automatic'),
  ('Toyota',     'Yaris XP210',   2022,  19700,  19850.00, 'silver',   'automatic'),
  -- Absicht: exakt auf der 15.000er-Grenze, damit < und <= sich unterscheiden.
  -- Absicht: einzige Seat im Bestand, damit HAVING count(*) >= 2 etwas bewirkt.
  ('Seat',       'Leon III',      2018,  96300,  15000.00, 'red',      'manual');
`,
  },

  {
    level: 2,
    label: 'dealers',
    freischaltet: 'JOIN ueber Fremdschluessel',
    sql: `
create table dealers (
  id         serial primary key,
  name       text not null,
  city      text not null,
  zip        text not null,
  founded int  not null
);

insert into dealers (name, city, zip, founded) values
  ('Autohaus Brunner',   'Munich',  '80339', 1994),
  ('Nordstern Mobile',   'Hamburg',   '22765', 2011),
  ('CarPoint Rhein',     'Cologne',     '50667', 2003),
  ('Sachsenring Autos',  'Leipzig',   '04109', 1998),
  ('Schwaben Fahrzeuge', 'Stuttgart', '70173', 2007);

alter table cars add column dealer_id int references dealers(id);

update cars set dealer_id = 1 where id in (1, 4, 7, 12, 16);
update cars set dealer_id = 2 where id in (2, 5, 9, 17);
update cars set dealer_id = 3 where id in (3, 10, 13, 18, 20);
update cars set dealer_id = 4 where id in (6, 11, 15);
update cars set dealer_id = 5 where id in (8, 14, 19, 21);
`,
  },

  {
    level: 3,
    label: 'customers, inquiries',
    freischaltet: 'Mehrfach-JOIN ueber n:m, DISTINCT',
    sql: `
create table customers (
  id             serial primary key,
  first_name        text not null,
  last_name       text not null,
  city          text not null,
  registered_at date not null
);

insert into customers (first_name, last_name, city, registered_at) values
  ('Lena',    'Hofmann',   'Munich',  '2023-03-14'),
  ('Tobias',  'Krueger',   'Hamburg',   '2023-05-02'),
  ('Miriam',  'Seidel',    'Cologne',     '2023-07-21'),
  ('Jonas',   'Brandt',    'Munich',  '2024-01-09'),
  ('Aylin',   'Yildiz',    'Stuttgart', '2024-02-27'),
  ('Patrick', 'Lorenz',    'Leipzig',   '2024-04-16'),
  ('Sophie',  'Neumann',   'Hamburg',   '2024-06-03'),
  ('Dennis',  'Wagner',    'Cologne',     '2024-09-11');

create table inquiries (
  id          serial primary key,
  customer_id    int not null references customers(id),
  car_id int not null references cars(id),
  created_at date not null,
  status      text not null
);

insert into inquiries (customer_id, car_id, created_at, status) values
  (1,  7, '2024-03-02', 'answered'),
  (1,  8, '2024-03-02', 'answered'),
  (1,  4, '2024-03-18', 'open'),
  (2,  2, '2024-04-05', 'answered'),
  (2,  9, '2024-04-05', 'rejected'),
  (3, 12, '2024-05-14', 'open'),
  (3, 12, '2024-06-01', 'answered'),
  (4,  8, '2024-06-09', 'open'),
  (4,  7, '2024-06-09', 'open'),
  (4,  9, '2024-07-22', 'answered'),
  (5,  6, '2024-08-03', 'answered'),
  (5, 12, '2024-08-19', 'open'),
  (6, 15, '2024-09-07', 'rejected'),
  (6, 16, '2024-09-30', 'answered'),
  (7,  2, '2024-10-12', 'open'),
  (7,  8, '2024-11-04', 'answered'),
  (8, 12, '2024-11-25', 'open'),
  (8, 20, '2025-01-08', 'answered'),
  (2, 12, '2025-02-14', 'open'),
  (5,  8, '2025-03-01', 'answered'),
  -- Absicht: eine abgelehnte Anfrage NACH dem 01.01.2025, damit eine
  -- Datumsbedingung auf 'rejected' ueberhaupt etwas bewirkt.
  (7, 15, '2025-04-18', 'rejected');
`,
  },

  {
    level: 4,
    label: 'NULL-Werte, Haendler ohne Bestand',
    freischaltet: 'LEFT JOIN, IS NULL, COALESCE',
    sql: `
alter table cars add column inspection_due   date;
alter table cars add column accident_free boolean;

update cars set inspection_due = '2026-04-30' where id = 1;
update cars set inspection_due = '2027-01-31' where id = 2;
update cars set inspection_due = '2027-08-31' where id = 3;
update cars set inspection_due = '2025-11-30' where id = 4;
update cars set inspection_due = '2026-09-30' where id = 6;
update cars set inspection_due = '2026-02-28' where id = 7;
update cars set inspection_due = '2028-03-31' where id = 8;
update cars set inspection_due = '2025-07-31' where id = 9;
update cars set inspection_due = '2026-12-31' where id = 11;
update cars set inspection_due = '2027-05-31' where id = 12;
update cars set inspection_due = '2026-06-30' where id = 14;
update cars set inspection_due = '2025-10-31' where id = 15;
update cars set inspection_due = '2027-03-31' where id = 16;
update cars set inspection_due = '2026-08-31' where id = 19;
update cars set inspection_due = '2028-01-31' where id = 20;
-- 5, 10, 13, 17, 18 bleiben bewusst NULL

update cars set accident_free = true
  where id in (2, 3, 6, 8, 11, 12, 16, 19, 20);
update cars set accident_free = false
  where id in (4, 9, 10, 15);
-- Rest bleibt NULL: unbekannt, nicht "nein"

insert into dealers (name, city, zip, founded) values
  ('Elbmarsch Automobile', 'Bremen',    '28195', 2022),
  ('Ruhrpott Cars',        'Dortmund',  '44135', 2019);

-- Absicht: zwei Kunden ohne jede Anfrage, damit LEFT JOIN auf inquiries
-- auch auf dieser Seite etwas zu finden hat.
insert into customers (first_name, last_name, city, registered_at) values
  ('Nils',  'Baumann', 'Bremen',   '2025-02-10'),
  ('Carla', 'Vogt',    'Dortmund', '2025-04-02');
`,
  },

  {
    level: 5,
    label: 'price_history',
    freischaltet: 'Datumsfunktionen, Window Functions',
    sql: `
create table price_history (
  id          serial primary key,
  car_id int  not null references cars(id),
  valid_from  date not null,
  price       numeric(10,2) not null
);

insert into price_history (car_id, valid_from, price) values
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
  source     text not null,
  captured_at timestamp not null
);

insert into leads (email, name, source, captured_at) values
  ('lena.hofmann@web.de',      'Lena Hofmann',    'trade_fair',     '2025-01-12 09:14:00'),
  ('Lena.Hofmann@web.de',      'L. Hofmann',      'website',   '2025-02-03 17:41:00'),
  ('  lena.hofmann@web.de ',   'Lena Hofmann',    'phone',   '2025-03-20 11:02:00'),
  ('t.krueger@gmx.net',        'Tobias Krueger',  'website',   '2025-01-28 14:33:00'),
  ('T.KRUEGER@GMX.NET',        NULL,              'trade_fair',     '2025-04-11 10:05:00'),
  ('miriam.seidel@posteo.de',  'Miriam Seidel',   'website',   '2025-02-17 08:50:00'),
  ('jonas.brandt@icloud.com',  'Jonas Brandt',    'phone',   '2025-03-02 16:20:00'),
  ('jonas.brandt@icloud.com',  'Jonas Brandt',    'website',   '2025-03-02 16:24:00'),
  ('aylin.yildiz@web.de',      'Aylin Yildiz',    'trade_fair',     '2025-03-29 12:11:00'),
  ('aylin.yildiz@web.de ',     'Aylin Y.',        'website',   '2025-05-14 19:03:00'),
  ('p.lorenz@freenet.de',      NULL,              'website',   '2025-04-07 07:45:00'),
  ('sophie.neumann@gmail.com', 'Sophie Neumann',  'phone',   '2025-04-22 13:37:00'),
  ('d.wagner@t-online.de',     'Dennis Wagner',   'trade_fair',     '2025-05-30 15:58:00'),
  ('D.Wagner@t-online.de',     'Dennis Wagner',   'website',   '2025-06-18 09:27:00'),
  ('d.wagner@t-online.de',     'D. Wagner',       'phone',   '2025-07-04 18:12:00'),
  -- Absicht: eine ANDERE Person drei Minuten nach Jonas. Ohne PARTITION BY
  -- wuerde LAG diesen Eintrag faelschlich als Doppelklick erkennen.
  ('nils.baumann@web.de',      'Nils Baumann',    'website',   '2025-03-02 16:27:00');
`,
  },
  {
    level: 7,
    label: 'cars_archive',
    freischaltet: 'Unterabfragen, EXISTS, CASE, UNION',
    sql: `
-- Bereits verkaufte Fahrzeuge. Gleiche Struktur wie der aktive Bestand,
-- damit sich beide mit UNION zusammenfuehren lassen.
create table cars_archive (
  id          serial primary key,
  brand       text not null,
  model      text not null,
  year     int  not null,
  mileage    int  not null,
  price       numeric(10,2) not null,
  color       text not null,
  transmission    text not null,
  sold_at date not null
);

insert into cars_archive (brand, model, year, mileage, price, color, transmission, sold_at) values
  ('Volkswagen', 'Tiguan II',    2018, 112000, 19400.00, 'gray',    'automatic', '2024-11-08'),
  ('Volkswagen', 'Up! I',        2017,  64300,  7900.00, 'white',   'manual',   '2025-01-22'),
  ('BMW',        'X1 F48',       2019,  87600, 23800.00, 'black', 'automatic', '2024-12-14'),
  ('Mercedes',   'B 200 W247',   2020,  51200, 22400.00, 'silver',  'automatic', '2025-02-05'),
  ('Audi',       'A1 GB',        2019,  43900, 16200.00, 'red',     'manual',   '2025-03-17'),
  ('Audi',       'A6 C8',        2018, 158300, 24600.00, 'black', 'automatic', '2025-04-29'),
  ('Skoda',      'Superb III',   2017, 176500, 12800.00, 'blue',    'automatic', '2024-10-30'),
  ('Ford',       'Kuga III',     2020,  69800, 20100.00, 'gray',    'manual',   '2025-05-12'),
  ('Renault',    'Clio V',       2021,  35400, 14700.00, 'white',   'manual',   '2025-06-03'),
  ('Peugeot',    '208 II',       2020,  48100, 13600.00, 'blue',    'manual',   '2025-06-25');
`,
  },

  {
    level: 8,
    label: 'watchlist (leer)',
    freischaltet: 'INSERT, UPDATE, DELETE',
    sql: `
-- Absichtlich leer. Auf dieser Stufe fuellst du sie selbst.
create table watchlist (
  id          serial primary key,
  customer_id    int  not null references customers(id),
  car_id int  not null references cars(id),
  note       text,
  priority  int  not null default 3,
  added_at  date not null default current_date
);
`,
  },

  {
    level: 9,
    label: 'nichts - hier baust du selbst',
    freischaltet: 'CREATE TABLE, Constraints, VIEW',
    sql: `
-- Diese Stufe bringt keine fertigen Tabellen mit. Du legst sie selbst an.
select 1 as ready;
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
