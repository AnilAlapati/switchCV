const fs = require('fs');
const path = require('path');
const filePath = path.resolve(__dirname, '..', 'coverage', 'coverage-final.json');
if (!fs.existsSync(filePath)) {
  console.error('coverage-final.json not found at', filePath);
  process.exit(1);
}
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
const zero = [];
for (const k of Object.keys(data)) {
  const file = data[k];
  const s = file.s;
  if (!s) continue;
  const sum = Object.values(s).reduce((a, b) => a + (b || 0), 0);
  if (sum === 0) zero.push(file.path.replace(process.cwd() + '/', ''));
}
console.log(zero.join('\n'));
