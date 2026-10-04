// Valida o journal do Drizzle antes de gerar/rodar o app.
// O runner aplica apenas migrations com `when` maior que a última já aplicada,
// então um `when` fora de ordem faria a migration ser pulada silenciosamente.
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'drizzle');
const journal = JSON.parse(fs.readFileSync(path.join(dir, 'meta', '_journal.json'), 'utf8'));
const migrationsJs = fs.readFileSync(path.join(dir, 'migrations.js'), 'utf8');

const errors = [];
let prev = 0;
let maxBefore = 0;
journal.entries.forEach((e, i) => {
  if (e.idx !== i) errors.push(`idx ${e.idx} fora de sequência (esperado ${i})`);
  // Migrations antigas (0007, 0010) já têm "when" fora de ordem e fazem parte do histórico;
  // a regra é obrigatória para a mais recente, senão ela é pulada em bancos existentes.
  if (i === journal.entries.length - 1 && e.when <= maxBefore) {
    errors.push(`${e.tag}: "when" (${e.when}) deve ser maior que o maior anterior (${maxBefore})`);
  }
  maxBefore = Math.max(maxBefore, e.when);
  prev = e.when;
  if (!fs.existsSync(path.join(dir, `${e.tag}.sql`))) errors.push(`${e.tag}.sql não existe`);
  if (!migrationsJs.includes(`./${e.tag}.sql`)) errors.push(`${e.tag} não registrada em migrations.js`);
});

if (errors.length) {
  console.error('Problemas nas migrations:\n - ' + errors.join('\n - '));
  process.exit(1);
}
console.log(`OK: ${journal.entries.length} migrations consistentes.`);
