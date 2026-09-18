/** @type {import('next').NextConfig} */
const nextConfig = {
  // PGlite wird von Turbopack nicht korrekt gebunden: der Emscripten-Glue
  // referenziert sein WASM ueber einen Modul-Namespace, den Turbopack in
  // Next 16.3.x zerschiesst (vercel/next.js#98294). Deshalb baut dieses
  // Projekt mit Webpack - siehe die --webpack-Flags in package.json.
  //
  // transpilePackages ist die von PGlite dokumentierte Webpack-Einstellung.
  transpilePackages: ['@electric-sql/pglite'],
};

export default nextConfig;
