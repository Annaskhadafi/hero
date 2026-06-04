import fs from 'fs';
import { parse } from '@babel/parser';

const code = fs.readFileSync('app/dashboard/hc/surat-perubahan-status/client-form.tsx', 'utf8');
try {
  parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript']
  });
  console.log('Parse successful!');
} catch (err) {
  console.error(err.message);
  console.error(err.loc);
}
