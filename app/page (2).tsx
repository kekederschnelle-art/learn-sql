import Lektion from '@/components/Lektion';
import { lektionen } from '@/lib/lektionen';

// Alle Stufen vorab erzeugen, damit die Seite statisch bleibt.
export function generateStaticParams() {
  return lektionen.map((l) => ({ stufe: String(l.level) }));
}

export default async function Seite({
  params,
}: {
  params: Promise<{ stufe: string }>;
}) {
  const { stufe } = await params;
  return <Lektion level={Number(stufe)} />;
}
