const fs = require('fs');
const path = require('path');

function walk(d, a = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, a);
    else if (e.name.endsWith('.tsx')) a.push(p);
  }
  return a;
}

const exact = {
  'title="RECHERCHE AVANCÉE & AUDIT"': 'title="Recherche"',
  'subtitle="Indexation Global SCPB Survey"': 'subtitle="Planteurs, lots et dossiers"',
  'title="PERSONNES & ENFANTS"': 'title="Personnes et enfants"',
  'title="CONTRÔLES & VALIDATION"': 'title="Contrôles et validation"',
  'title="MOUVEMENTS & EXPÉDITIONS"': 'title="Mouvements et expéditions"',
  'title="POURQUOI CE SIGNAL ?"': 'title="Pourquoi ce signal ?"',
  'title="S21 - SOMMAIRE QUESTIONNAIRE"': 'title="Sommaire du questionnaire"',
  'title="S49 - VERSIONS RÈGLES MÉTIER"': 'title="Versions des règles"',
  'title="S71 - CHRONOLOGIE POST-RÉCOLTE"': 'title="Chronologie post-récolte"',
  'title="OBSERVATION TERRAIN"': 'title="Observation terrain"',
  'title="REGISTRE DES LOTS DE CACAO"': 'title="Registre des lots"',
  'title="WORKSPACE REMÉDIATION"': 'title="Remédiation"',
  'title="CENTRE DES SIGNALEMENTS"': 'title="Signalements"',
  'title="PLANS DE REMÉDIATION"': 'title="Plans de remédiation"',
  'title="SUPERVISION EXPLICITE ET EXPLICABLE"': 'title="Supervision"',
  'title="PROTECTION DES DONNÉES DU MÉNAGE ET DES ENFANTS"': 'title="Protection des données"',
};

const root = path.join(__dirname, '..', 'app');
let n = 0;
for (const f of walk(root)) {
  let c = fs.readFileSync(f, 'utf8');
  const o = c;
  for (const [a, b] of Object.entries(exact)) c = c.split(a).join(b);
  c = c.replace(/title="ESPACE DURABILITÉ[^"]*"/g, 'title="Durabilité"');
  c = c.replace(/title="ESPACE DE QUALIFICATION[^"]*"/g, 'title="Qualification confidentielle"');
  c = c.replace(/fontWeight:\s*'800'/g, "fontWeight: '700'");
  c = c.replace(/fontWeight:\s*"800"/g, 'fontWeight: "700"');
  // Hex → tokens (common offenders)
  c = c.split("'#FFF3CD'").join('colors.ambreClair');
  c = c.split('"\#FFF3CD"').join('colors.ambreClair');
  c = c.split("'#856404'").join('colors.attention');
  c = c.split("'#FADBD8'").join('colors.errorContainer');
  c = c.split("'#FFFFFF'").join('colors.blanc');
  if (c !== o) {
    fs.writeFileSync(f, c);
    n++;
    console.log(path.relative(root, f));
  }
}
console.log('updated', n);
