'use client';

export type SchemaTabelle = {
  name: string;
  spalten: { spalte: string; typ: string; nullbar: boolean }[];
};

export default function SchemaPanel({
  tabellen,
  level,
}: {
  tabellen: SchemaTabelle[];
  level: number;
}) {
  return (
    <aside className="schema">
      <h3>Datenstand auf Level {level}</h3>
      <p className="erklaerung">
        Genau diese Tabellen existieren gerade. Mit jedem Level kommen Tabellen oder
        Spalten dazu. Ein <span className="mono">?</span> hinter dem Typ heißt: Hier
        stehen NULL-Werte drin.
      </p>

      {tabellen.length === 0 && <p className="erklaerung">Wird aufgebaut …</p>}

      {tabellen.map((t) => (
        <div className="tabelle-eintrag" key={t.name}>
          <div className="name">{t.name}</div>
          <ul>
            {t.spalten.map((s) => (
              <li key={s.spalte} data-nullbar={s.nullbar}>
                <span>{s.spalte}</span>
                <span className="typ">{s.typ}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </aside>
  );
}
