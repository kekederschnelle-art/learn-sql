import Uebung from '@/components/Uebung';
import { lektionen } from '@/lib/lektionen';

export function generateStaticParams() {
  return lektionen.map((l) => ({ stufe: String(l.level) }));
}

export default async function Seite({
  params,
}: {
  params: Promise<{ stufe: string }>;
}) {
  const { stufe } = await params;
  return <Uebung level={Number(stufe)} />;
}
