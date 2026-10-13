// Both languages must define the same keys, and every T('key') used in code must exist.
const fs = require('fs'), path = require('path'), vm = require('vm');
const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'i18n.js'), 'utf8');
const ctx = { window: {}, navigator: { language: 'ko' }, document: { documentElement: {} } };
vm.createContext(ctx);
vm.runInContext(src.replace("window.I18N = {", "window.__S = S; window.I18N = {"), ctx);
const S = ctx.window.__S, ko = Object.keys(S.ko), en = Object.keys(S.en);
let bad = 0;
ko.filter(k => !en.includes(k)).forEach(k => { bad++; console.log('missing en:', k); });
en.filter(k => !ko.includes(k)).forEach(k => { bad++; console.log('missing ko:', k); });
const code = ['game.js', 'ui.js'].map(f => fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8')).join('\n')
  + fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const used = new Set([...code.matchAll(/T\('(\w+)'/g)].map(m => m[1]).concat([...code.matchAll(/data-t="(\w+)"/g)].map(m => m[1])));
for (const k of used) if (!(k in S.en) || !(k in S.ko)) { bad++; console.log('used but undefined:', k); }
console.log(bad ? bad + ' problems' : 'i18n ok (' + ko.length + ' keys, ' + used.size + ' used directly)');
process.exit(bad ? 1 : 0);
