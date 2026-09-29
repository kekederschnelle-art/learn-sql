/**
 * Absichtlich falsche Loesungen. Jede davon muss in der App durchfallen.
 *
 * Wozu: Eine Aufgabe ist nur so gut wie ihre Grenzfaelle im Datensatz. Gibt
 * es kein Auto mit exakt 15.000 €, besteht `<=` statt `<` die Pruefung - und
 * niemand merkt es. Faellt hier eine Variante NICHT durch, fehlt im Datensatz
 * (lib/migrations.ts) die Falle, die sie erwischen sollte.
 *
 * Neue Aufgabe? Dann hier die typischen Fehler dazu eintragen.
 */

export type FalscheVariante = {
  aufgabe: string;
  /** Welcher Fehler hier nachgestellt wird. */
  fehler: string;
  sql: string;
  /**
   * Bekannte Luecke: Diese Variante besteht derzeit, weil dem Datensatz der
   * passende Grenzfall fehlt. Steht im Testlauf als "todo" und schlaegt
   * nicht fehl. Wird der Datensatz ergaenzt, das Feld entfernen.
   */
  luecke?: string;
};

export const falscheVarianten: FalscheVariante[] = [
  // ─────────────────────────────────────────────────────────── Stufe 1
  {
    aufgabe: 'a01',
    fehler: '<= statt <',
    sql: 'select brand, model, price from cars where price <= 15000 order by price',
  },
  {
    aufgabe: 'a01',
    fehler: 'Sortierung vergessen',
    sql: 'select brand, model, price from cars where price < 15000 order by price desc',
  },
  {
    aufgabe: 'a03',
    fehler: 'HAVING vergessen',
    sql: 'select brand, count(*) from cars group by brand order by count(*) desc, brand',
  },
  {
    aufgabe: 'a04',
    fehler: 'nicht gerundet',
    sql: 'select transmission, count(*), avg(price) from cars group by transmission',
  },
  {
    aufgabe: 'a37',
    fehler: 'nur eine Farbe',
    sql: "select brand, model, color from cars where color = 'red' order by brand, model",
  },
  {
    aufgabe: 'a38',
    fehler: 'Grenzen ausgeschlossen',
    sql: 'select brand, model, year from cars where year > 2018 and year < 2020 order by year, brand, model',
  },
  {
    aufgabe: 'a39',
    fehler: 'Marke statt Modell gefiltert',
    sql: "select brand, model from cars where brand like 'A%' order by model",
  },
  {
    aufgabe: 'a39',
    fehler: 'Muster ohne Anker am Anfang',
    sql: "select brand, model from cars where model like '%A%' order by model",
    luecke: 'Kein Modell hat ein großes A mitten im Namen.',
  },
  {
    aufgabe: 'a40',
    fehler: 'max statt min',
    sql: 'select color, count(*), max(price) from cars group by color order by count(*) desc, color',
  },

  // ─────────────────────────────────────────────────────────── Stufe 2
  {
    aufgabe: 'a06',
    fehler: 'falsch herum sortiert',
    sql: `select h.name, h.city, count(f.id), sum(f.price)
          from dealers h join cars f on f.dealer_id = h.id
          group by h.id, h.name, h.city order by sum(f.price) asc`,
  },
  {
    aufgabe: 'a16',
    fehler: 'andere Stadt',
    sql: `select f.brand, f.model, f.price from cars f
          join dealers h on h.id = f.dealer_id
          where h.city = 'Berlin' order by f.price desc`,
  },
  {
    aufgabe: 'a17',
    fehler: 'HAVING vergessen',
    sql: `select h.city, count(*), round(avg(f.price), 2)
          from dealers h join cars f on f.dealer_id = h.id
          group by h.city order by round(avg(f.price), 2) desc`,
  },
  {
    aufgabe: 'a41',
    fehler: 'Filter auf Automatik vergessen',
    sql: `select d.name, count(*) from dealers d join cars c on c.dealer_id = d.id
          group by d.id, d.name order by count(*) desc, d.name`,
  },

  // ─────────────────────────────────────────────────────────── Stufe 3
  {
    aufgabe: 'a07',
    fehler: 'DISTINCT vergessen',
    sql: `select k.first_name, k.last_name from customers k
          join inquiries a on a.customer_id = k.id
          join cars f on f.id = a.car_id
          where f.brand = 'Mercedes' order by k.last_name`,
  },
  {
    aufgabe: 'a08',
    fehler: 'LIMIT vergessen',
    sql: `select f.brand, f.model, count(a.id) from cars f
          join inquiries a on a.car_id = f.id
          group by f.id, f.brand, f.model
          order by count(a.id) desc, f.brand`,
  },
  {
    aufgabe: 'a18',
    fehler: 'HAVING vergessen',
    sql: `select k.first_name, k.last_name, count(a.id) from customers k
          join inquiries a on a.customer_id = k.id
          group by k.id, k.first_name, k.last_name
          order by count(a.id) desc, k.last_name`,
  },
  {
    aufgabe: 'a47',
    fehler: 'count(*) statt count(distinct ...)',
    sql: `select c.brand, c.model, count(*) from cars c
          join inquiries i on i.car_id = c.id
          group by c.id, c.brand, c.model
          having count(*) >= 2
          order by count(*) desc, c.brand, c.model`,
  },

  // ─────────────────────────────────────────────────────────── Stufe 4
  {
    aufgabe: 'a09',
    fehler: 'JOIN statt LEFT JOIN',
    sql: `select h.name, h.city from dealers h
          join cars f on f.dealer_id = h.id
          where f.id is null order by h.name`,
  },
  {
    aufgabe: 'a10',
    fehler: 'NULL-Fall vergessen',
    sql: `select brand, model, coalesce(to_char(inspection_due, 'MM/YYYY'), 'unknown')
          from cars where inspection_due < date '2026-06-01'`,
  },
  {
    aufgabe: 'a11',
    fehler: 'NULL nicht ersetzt',
    sql: 'select accident_free::text, count(*) from cars group by accident_free',
  },
  {
    aufgabe: 'a20',
    fehler: 'JOIN statt LEFT JOIN',
    sql: `select k.first_name, k.last_name, k.registered_at from customers k
          join inquiries a on a.customer_id = k.id
          where a.id is null order by k.last_name`,
  },
  {
    aufgabe: 'a49',
    fehler: '= false statt is null',
    sql: 'select brand, model from cars where accident_free = false order by brand, model',
  },
  {
    aufgabe: 'a50',
    fehler: 'JOIN statt LEFT JOIN',
    sql: `select d.name, count(c.id) from dealers d
          join cars c on c.dealer_id = d.id
          group by d.id, d.name order by count(c.id) desc, d.name`,
  },
  {
    aufgabe: 'a51',
    fehler: 'count(*) zählt auch NULL',
    sql: 'select count(*), count(*), 0 from cars',
  },
  {
    aufgabe: 'a52',
    fehler: 'count(*) zählt die leere Zeile vom LEFT JOIN mit',
    sql: `select cu.first_name, cu.last_name, count(*) from customers cu
          left join inquiries i on i.customer_id = cu.id
          group by cu.id, cu.first_name, cu.last_name
          order by count(*) desc, cu.last_name`,
  },

  // ─────────────────────────────────────────────────────────── Stufe 5
  {
    aufgabe: 'a13',
    fehler: 'HAVING vergessen',
    sql: `select to_char(valid_from, 'YYYY-MM') as m, count(*) from price_history
          group by to_char(valid_from, 'YYYY-MM') order by m`,
  },
  {
    aufgabe: 'a21',
    fehler: 'Fenster falsch herum sortiert',
    sql: `with r as (select brand, model, price,
            row_number() over (partition by brand order by price asc) as rn from cars)
          select brand, model, price from r where rn = 1 order by price desc`,
  },
  {
    aufgabe: 'a54',
    fehler: 'LAG ohne PARTITION BY',
    sql: `select car_id, valid_from, price, lag(price) over (order by car_id, valid_from)
          from price_history order by car_id, valid_from`,
  },
  {
    aufgabe: 'a56',
    fehler: 'Durchschnitt über alle statt pro Marke',
    sql: `select brand, model, price, round(avg(price) over (), 2)
          from cars order by brand, price desc`,
  },

  // ─────────────────────────────────────────────────────────── Stufe 6
  {
    aufgabe: 'a14',
    fehler: 'nicht normalisiert',
    sql: 'select email, count(*) from leads group by email having count(*) > 1',
  },
  {
    aufgabe: 'a23',
    fehler: 'count(*) zählt Mehrfacherfassungen mit',
    sql: `select source, count(*) from leads group by source
          order by count(*) desc, source`,
    luecke: 'Keine Person steht zweimal in derselben Quelle.',
  },
  {
    aufgabe: 'a24',
    fehler: 'einzelne Einträge statt Personen',
    sql: 'select distinct lower(trim(email)) from leads where name is null',
  },
  {
    aufgabe: 'a60',
    fehler: 'LAG ohne PARTITION BY',
    sql: `with f as (select lower(trim(email)) as email, captured_at,
            lag(captured_at) over (order by captured_at) as previous from leads)
          select email, captured_at from f
          where captured_at - previous < interval '10 minutes'`,
  },

  // ─────────────────────────────────────────────────────────── Stufe 7
  {
    aufgabe: 'a26',
    fehler: 'UNION statt EXCEPT',
    sql: 'select brand from cars_archive union select brand from cars order by brand',
  },
  {
    aufgabe: 'a27',
    fehler: 'Archiv vergessen',
    sql: "select brand, model, price, 'available' from cars order by price desc",
  },
  {
    aufgabe: 'a61',
    fehler: 'EXISTS statt NOT EXISTS',
    sql: `select c.brand, c.model from cars c
          where exists (select 1 from inquiries i where i.car_id = c.id)
          order by c.brand, c.model`,
  },
  {
    aufgabe: 'a62',
    fehler: 'Unterabfrage nicht korreliert',
    sql: `select c.brand, c.model, c.price from cars c
          where c.price = (select min(price) from cars) order by c.price`,
  },
  {
    aufgabe: 'a63',
    fehler: 'UNION statt INTERSECT',
    sql: 'select brand from cars union select brand from cars_archive order by brand',
  },

  // ─────────────────────────────────────────────────────────── Stufe 8
  {
    aufgabe: 'a29',
    fehler: 'Priorität vergessen',
    sql: "insert into watchlist (customer_id, car_id, note) values (3, 12, 'schedule test drive')",
  },
  {
    aufgabe: 'a30',
    fehler: 'falscher Status',
    sql: `insert into watchlist (customer_id, car_id, note, priority)
          select customer_id, car_id, 'from open inquiry', 2 from inquiries
          where status <> 'open'`,
  },
  {
    aufgabe: 'a31',
    fehler: 'auf 8 Prozent gesenkt statt um 8 Prozent',
    sql: 'update cars set price = price * 0.08 where mileage > 150000',
  },
  {
    aufgabe: 'a32',
    fehler: 'Datumsbedingung vergessen',
    sql: "delete from inquiries where status = 'rejected'",
  },
  {
    aufgabe: 'a65',
    fehler: 'nur ein Fahrzeug',
    sql: "insert into watchlist (customer_id, car_id, note, priority) values (1, 2, 'compare', 2)",
  },
  {
    aufgabe: 'a66',
    fehler: 'Baujahr vergessen',
    sql: "update cars set color = 'gray' where color = 'silver'",
  },
  {
    aufgabe: 'a68',
    fehler: 'auch beantwortete Anfragen geändert',
    sql: `update inquiries set status = 'rejected'
          where customer_id in (select id from customers where city = 'Munich')`,
  },

  // ─────────────────────────────────────────────────────────── Stufe 9
  {
    aufgabe: 'a33',
    fehler: 'remark als Pflichtfeld',
    sql: `create table test_drives (id serial primary key, car_id int not null,
          name text not null, scheduled_on date not null, remark text not null)`,
  },
  {
    aufgabe: 'a34',
    fehler: 'CHECK-Regel vergessen',
    sql: `create table reviews (id serial primary key,
          dealer_id int not null references dealers(id), stars int not null, comment text)`,
  },
  {
    aufgabe: 'a36',
    fehler: 'UNIQUE vergessen',
    sql: `create table newsletter (id serial primary key, email text not null,
          confirmed boolean not null default false,
          signed_up_on date not null default current_date)`,
  },
  {
    aufgabe: 'a69',
    fehler: 'nicht als Pflichtfeld',
    sql: "alter table cars add column fuel text default 'petrol'",
  },
  {
    aufgabe: 'a70',
    fehler: 'eigene id-Spalte statt zusammengesetztem Schlüssel',
    sql: `create table favorites (id serial primary key,
          customer_id int references customers(id), car_id int references cars(id))`,
  },
  {
    aufgabe: 'a71',
    fehler: 'LEFT JOIN nimmt Händler ohne Bestand mit',
    sql: `create view dealer_stats as select d.name, d.city, count(c.id) as car_count,
          sum(c.price) as total_value from dealers d left join cars c on c.dealer_id = d.id
          group by d.id, d.name, d.city`,
  },
  {
    aufgabe: 'a72',
    fehler: 'CHECK-Regel vergessen',
    sql: `create table price_changes (id serial primary key,
          car_id int not null references cars(id), old_price numeric(10,2) not null,
          new_price numeric(10,2) not null, changed_on date not null default current_date)`,
  },
];
