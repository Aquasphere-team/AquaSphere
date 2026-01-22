const fs = require('fs');
const path = require('path');

const envFile = path.join(__dirname, '../src/environments/environments.prod.ts');

const content = `export const environment = {
  production: true,
  supabaseUrl: '${process.env.supabaseUrl || ''}',
  supabaseKey: '${process.env.supabaseKey || ''}'
};
`;

fs.writeFileSync(envFile, content);
console.log('Environment file generated successfully');
