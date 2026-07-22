module.exports = {
  createOldCatalogs: false,
  indentation: 2,
  lexers: {
    ts: ['JavascriptLexer'],
    tsx: ['JsxLexer'],
    astro: ['JsxLexer'],
    default: ['JavascriptLexer'],
  },
  locales: ['en'],
  output: 'src/locales/$LOCALE.json',
  input: ['src/**/*.{ts,tsx,astro}'],
  sort: true,
};
