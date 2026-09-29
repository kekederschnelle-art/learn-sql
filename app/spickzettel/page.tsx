import type { Metadata } from 'next';
import Spickzettel from '@/components/Spickzettel';

export const metadata: Metadata = {
  title: 'Spickzettel · SQL-Prüfstand',
};

export default function Seite() {
  return <Spickzettel />;
}
