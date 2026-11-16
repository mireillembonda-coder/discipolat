// Serveur de test local : fait tourner serveur/Code.gs sans Google, avec un faux tableur en mémoire.
// Usage :  node pharmacie/outils/serveur-local.js [port]
// puis ouvrir http://localhost:8080/?serveur=/api   (la page garde cette adresse).
// Pour développer seulement — en vrai, Code.gs tourne dans Google Apps Script.
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');
const vm = require('vm');
const crypto = require('crypto');

const RACINE = path.join(__dirname, '..');
const PORT = Number(process.argv[2] || 8080);

/* ---- faux services Google ---- */
const feuilles = {};
function fausseFeuille(nom) {
  const lignes = [];
  const f = {
    nom, lignes,
    getDataRange: () => ({ getValues: () => lignes.map(l => l.slice()) }),
    getLastRow: () => lignes.length,
    appendRow: (v) => { lignes.push(v.map(x => (typeof x === 'string' && x[0] === "'") ? x.slice(1) : x)); },
    deleteRow: (n) => { lignes.splice(n - 1, 1); },
    setFrozenRows: () => {},
    getRange: (r, c, nr = 1, nc = 1) => ({
      getValues: () => { const res = []; for (let i = 0; i < nr; i++) { const l = lignes[r - 1 + i] || []; res.push(l.slice(c - 1, c - 1 + nc)); } return res; },
      setValues: (vals) => {
        vals.forEach((ligne, i) => {
          const l = lignes[r - 1 + i] || (lignes[r - 1 + i] = []);
          ligne.forEach((x, j) => { l[c - 1 + j] = (typeof x === 'string' && x[0] === "'") ? x.slice(1) : x; });
        });
        return { setFontWeight: () => {} };
      },
      setValue: (x) => { const l = lignes[r - 1] || (lignes[r - 1] = []); l[c - 1] = x; },
    }),
  };
  return f;
}
const contexte = {
  SpreadsheetApp: { getActive: () => ({
    getSheetByName: (n) => feuilles[n] || null,
    insertSheet: (n) => (feuilles[n] = fausseFeuille(n)),
    getUrl: () => 'https://docs.google.com/spreadsheets/d/exemple',
  }) },
  LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
  CacheService: { getScriptCache: () => {
    const c = contexte.__cache || (contexte.__cache = {});
    return { get: k => c[k] || null, put: (k, v) => { c[k] = v; }, remove: k => { delete c[k]; } };
  } },
  PropertiesService: { getScriptProperties: () => {
    const p = contexte.__props || (contexte.__props = {});
    return { getProperty: k => p[k] || null, setProperty: (k, v) => { p[k] = v; } };
  } },
  Utilities: {
    getUuid: () => crypto.randomUUID(),
    DigestAlgorithm: { SHA_256: 'sha256' }, Charset: { UTF_8: 'utf8' },
    computeDigest: (algo, s) => Array.from(crypto.createHash(algo).update(s, 'utf8').digest()).map(b => b > 127 ? b - 256 : b),
    formatDate: (d, tz, f) => f === 'HH:mm' ? d.toISOString().slice(11, 16) : d.toISOString().slice(0, 10),
  },
  Session: { getScriptTimeZone: () => 'UTC' },
  ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (t) => ({ texte: t, setMimeType() { return this; } }) },
  console,
};
vm.createContext(contexte);
vm.runInContext(fs.readFileSync(path.join(RACINE, 'serveur', 'Code.gs'), 'utf8'), contexte);

/* ---- serveur web ---- */
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml' };
http.createServer((req, res) => {
  if (req.method === 'POST' && req.url.startsWith('/api')) {
    let corps = '';
    req.on('data', d => { corps += d; });
    req.on('end', () => {
      const sortie = contexte.doPost({ postData: { contents: corps } });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(sortie.texte);
    });
    return;
  }
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const fichier = path.join(RACINE, path.normalize(p));
  if (!fichier.startsWith(RACINE) || !fs.existsSync(fichier) || fs.statSync(fichier).isDirectory()) { res.writeHead(404); res.end('404'); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(fichier)] || 'application/octet-stream' });
  fs.createReadStream(fichier).pipe(res);
}).listen(PORT, () => console.log('Pharmacie (test local) : http://localhost:' + PORT + '/?serveur=/api'));
