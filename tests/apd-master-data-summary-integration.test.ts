import fs from 'fs';
import path from 'path';
import { buildDynamicApdColumns } from '../lib/summary-constants';

describe('APD Master Data & Summary Document Integration', () => {
  test('buildDynamicApdColumns correctly uses master data APD items', () => {
    const mockMasterItems = [
      { name: 'Sarung Tangan Dotting', hasSize: false },
      { name: 'Safety Glasses', hasSize: false },
      { name: 'Safety Shoes', hasSize: true },
      { name: 'Rompi Safety Reflective', hasSize: false },
    ];

    const { qtyOnlyCols, allCols } = buildDynamicApdColumns(mockMasterItems);

    expect(qtyOnlyCols).toContain('Sarung Tangan Dotting');
    expect(qtyOnlyCols).toContain('Rompi Safety Reflective');
    expect(qtyOnlyCols).not.toContain('Kaos Tangan Dotting');
    expect(allCols).toContain('Safety Shoes');
    expect(allCols.length).toBe(4);
  });

  test('renaming master data APD item dynamically updates summary column headers', () => {
    const mockMasterItemsRenamed = [
      { name: 'Sarung Tangan Heavy Duty', hasSize: false },
      { name: 'Safety Glasses UV', hasSize: false },
      { name: 'Safety Shoes High Cut', hasSize: true },
    ];

    const { qtyOnlyCols, allCols } = buildDynamicApdColumns(mockMasterItemsRenamed);

    expect(qtyOnlyCols).toEqual(['Sarung Tangan Heavy Duty', 'Safety Glasses UV']);
    expect(allCols).toEqual(['Sarung Tangan Heavy Duty', 'Safety Glasses UV', 'Safety Shoes High Cut']);
  });

  test('summary-engine.ts queries hero_master_apd as single source of truth', () => {
    const summaryEngineSource = fs.readFileSync(
      path.join(process.cwd(), 'lib/summary-engine.ts'),
      'utf8'
    );

    expect(summaryEngineSource).toContain('masterApd');
    expect(summaryEngineSource).toContain('masterCatalog');
    expect(summaryEngineSource).toContain('Sarung Tangan Dotting');
  });

  test('summary-preview.tsx and print summary page render dynamic columns from masterCatalog', () => {
    const previewSource = fs.readFileSync(
      path.join(process.cwd(), 'components/summary/summary-preview.tsx'),
      'utf8'
    );
    const printSource = fs.readFileSync(
      path.join(process.cwd(), 'app/print/summary/[id]/page.tsx'),
      'utf8'
    );

    expect(previewSource).toContain('buildDynamicApdColumns');
    expect(previewSource).toContain('masterCatalog');
    expect(printSource).toContain('buildDynamicApdColumns');
    expect(printSource).toContain('masterCatalog');
  });
});
