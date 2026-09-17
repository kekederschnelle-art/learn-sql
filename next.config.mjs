/** @type {import('next').NextConfig} */
const nextConfig = {
  // Absichtlich leer. PGlite wird ausschliesslich dynamisch im Browser
  // geladen (siehe lib/db.ts), deshalb braucht der Bundler keine
  // Sonderbehandlung fuer das WASM-Modul.
  turbopack: {},
};

export default nextConfig;
