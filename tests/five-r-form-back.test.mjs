import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('components/five-r/five-r-form.tsx contains Kembali button with unsaved change confirmation', () => {
  const formPath = path.join(process.cwd(), 'components/five-r/five-r-form.tsx');
  const content = fs.readFileSync(formPath, 'utf8');

  assert.ok(content.includes('handleBack'), 'Must define handleBack handler');
  assert.ok(content.includes('isFormDirty'), 'Must check form dirty state');
  assert.ok(content.includes('Ada perubahan yang belum disimpan'), 'Must prompt user when unsaved changes exist');
  assert.ok(content.includes('Kembali'), 'Must render Kembali button');
  assert.ok(content.includes('Single Source'), 'Must show single source of truth indicator for PIC');
});
