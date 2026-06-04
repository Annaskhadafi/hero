import fs from 'fs';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';

const code = fs.readFileSync('app/dashboard/hc/surat-perubahan-status/client-form.tsx', 'utf8');
const ast = parse(code, {
  sourceType: 'module',
  plugins: ['jsx', 'typescript']
});

let found = false;
traverse.default(ast, {
  JSXText(path) {
    if (path.node.value.includes('}')) {
      console.log('Found stray brace in JSXText at line:', path.node.loc.start.line);
      console.log('Text:', JSON.stringify(path.node.value));
      found = true;
    }
  }
});

if (!found) {
  console.log('No stray braces found in JSXText nodes!');
}
