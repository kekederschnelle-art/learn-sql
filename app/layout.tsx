import type { Metadata, Viewport } from 'next';
import { Archivo, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

const archivo = Archivo({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-sans',
  display: 'swap',
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'SQL-Prüfstand',
  description:
    'SQL üben an einem Gebrauchtwagen-Datensatz, der mit jeder Aufgabe wächst. Läuft komplett im Browser.',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#17211e' },
    { media: '(prefers-color-scheme: light)', color: '#f2f0e9' },
  ],
};

/**
 * Setzt ein gewaehltes Farbschema, bevor die Seite gezeichnet wird. Als
 * React-Effekt kaeme das zu spaet: Die Seite blitzte erst im Systemschema auf.
 * Der Schluessel muss zu THEMA_SCHLUESSEL in components/ThemaSchalter.tsx passen.
 */
const THEMA_SKRIPT = `try{var t=localStorage.getItem('sql-pruefstand:thema');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: data-theme setzt das Skript unten, bevor React
    // die Seite uebernimmt. Das ist Absicht, keine Abweichung.
    <html lang="de" className={`${archivo.variable} ${plexMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEMA_SKRIPT }} />
      </head>
      <body>
        <a href="#inhalt" className="sprungmarke">
          Zum Inhalt springen
        </a>
        {children}
      </body>
    </html>
  );
}
