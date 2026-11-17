import fs from 'fs';
import path from 'path';

describe('Mobile APD Request Master Data Synchronization', () => {
  test('app/mobile/apd/new/page.tsx fetches and passes APD master data items and details', () => {
    const pagePath = path.join(process.cwd(), 'app/mobile/apd/new/page.tsx');
    const content = fs.readFileSync(pagePath, 'utf8');

    expect(content).toContain('fetchApdItemOptions("APD")');
    expect(content).toContain('fetchApdMasterDetails()');
    expect(content).toContain('fetchMasterSections()');
    expect(content).toContain('itemOptions={{ APD: apdOptions, TOOLS: toolsOptions, MATERIAL: materialOptions }}');
    expect(content).toContain('masterApdDetails={masterApdDetails}');
    expect(content).toContain('sectionOptions={sectionOptions}');
    expect(content).toContain('canSelectTargetSection={canSelectTargetSection}');
  });

  test('app/mobile/tools/new/page.tsx and material/new/page.tsx pass synchronized APD master data options and details', () => {
    const toolsPath = path.join(process.cwd(), 'app/mobile/tools/new/page.tsx');
    const materialPath = path.join(process.cwd(), 'app/mobile/material/new/page.tsx');

    const toolsContent = fs.readFileSync(toolsPath, 'utf8');
    const materialContent = fs.readFileSync(materialPath, 'utf8');

    expect(toolsContent).toContain('fetchApdItemOptions("APD")');
    expect(toolsContent).toContain('fetchApdMasterDetails()');
    expect(toolsContent).toContain('masterApdDetails={masterApdDetails}');
    expect(toolsContent).toContain('itemOptions={{ APD: apdOptions, TOOLS: toolsOptions, MATERIAL: materialOptions }}');

    expect(materialContent).toContain('fetchApdItemOptions("APD")');
    expect(materialContent).toContain('fetchApdMasterDetails()');
    expect(materialContent).toContain('masterApdDetails={masterApdDetails}');
    expect(materialContent).toContain('itemOptions={{ APD: apdOptions, TOOLS: toolsOptions, MATERIAL: materialOptions }}');
  });

  test('app/dashboard/apd/new/apd-form.tsx defaults to master APD items instead of hardcoded items when available', () => {
    const formPath = path.join(process.cwd(), 'app/dashboard/apd/new/apd-form.tsx');
    const content = fs.readFileSync(formPath, 'utf8');

    expect(content).toContain('const defaultApdItem = (itemOptions.APD && itemOptions.APD.length > 0) ? itemOptions.APD[0] : APD_ITEMS[0];');
    expect(content).toContain('masterApdDetails');
    expect(content).toContain('getItemSizeConfig');
  });
});
