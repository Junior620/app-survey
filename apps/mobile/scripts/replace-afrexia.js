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

const pairs = [
  ['afrexiaColors.primaryContainer', 'colors.vertClair'],
  ['afrexiaColors.onPrimaryContainer', 'colors.vertFonce'],
  ['afrexiaColors.secondaryContainer', 'colors.brunClair'],
  ['afrexiaColors.onSecondaryContainer', 'colors.texte'],
  ['afrexiaColors.onSurfaceVariant', 'colors.texteSecondaire'],
  ['afrexiaColors.onBackground', 'colors.texte'],
  ['afrexiaColors.onSurface', 'colors.texte'],
  ['afrexiaColors.background', 'colors.fond'],
  ['afrexiaColors.surfaceVariant', 'colors.surface2'],
  ['afrexiaColors.surface', 'colors.blanc'],
  ['afrexiaColors.outline', 'colors.bordure'],
  ['afrexiaColors.primary', 'colors.vert'],
  ['afrexiaColors.secondary', 'colors.brun'],
  ['afrexiaColors.error', 'colors.erreur'],
  ['afrexiaColors.onError', 'colors.blanc'],
  ['afrexiaColors.onPrimary', 'colors.blanc'],
  ['afrexiaColors.onSecondary', 'colors.blanc'],
  ['afrexiaColors.success', 'colors.succes'],
  ['afrexiaColors.warning', 'colors.attention'],
  ['afrexiaColors.info', 'colors.info'],
  ['afrexiaColors.disabled', 'colors.disabled'],
  ["import { afrexiaColors } from '@appsurvey/shared';\n", ''],
  ['import { afrexiaColors, afrexiaTheme } from \'@appsurvey/shared\';\n', ''],
];

const root = path.join(__dirname, '..', 'app');
let n = 0;
for (const f of walk(root)) {
  let c = fs.readFileSync(f, 'utf8');
  const o = c;
  for (const [a, b] of pairs) c = c.split(a).join(b);
  // Ensure colors import if colors. used and missing
  if (c.includes('colors.') && !/from ['"].*theme['"]/.test(c) && c !== o) {
    // insert after react-native import block heuristically
    if (!c.includes("from '../../src/theme'") && !c.includes("from '../../../src/theme'") && !c.includes("from '../../../../src/theme'")) {
      const depth = f.split(path.sep).filter((x) => x === '(protected)' || x === '(public)' || x === '(agent)' || x === '(admin)' || x === '(durabilite)' || x === '(auditeur)' || x === 'questionnaires' || x === '[id]' || x === 'question' || x === '[qid]' || x === 'users').length;
      // simpler: count ../ needed from file to src
      const rel = path.relative(path.dirname(f), path.join(__dirname, '..', 'src', 'theme')).replace(/\\/g, '/');
      if (!c.includes(`from '${rel}'`) && !c.includes('src/theme')) {
        c = c.replace(
          /(import .+ from 'react-native';\n)/,
          `$1import { colors } from '${rel.startsWith('.') ? rel : './' + rel}';\n`
        );
      }
    }
  }
  if (c !== o) {
    fs.writeFileSync(f, c);
    n++;
    console.log(path.relative(root, f));
  }
}
console.log('updated', n);
