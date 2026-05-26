const fs = require('fs');
const path = require('path');
const target = path.join(__dirname, 'src/components/admin/catalog/product-form.tsx');
fs.writeFileSync(target, '// written by script\n', 'utf8');
console.log('done');
