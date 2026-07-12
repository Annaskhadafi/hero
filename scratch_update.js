const fs = require('fs');
const files = [
  'd:/[01] PROJECT/HERO/app/mobile/information/create/broadcast-create-form.tsx',
  'd:/[01] PROJECT/HERO/app/mobile/leader-performance/client-page.tsx',
  'd:/[01] PROJECT/HERO/components/mobile/mobile-approval-center.tsx',
  'd:/[01] PROJECT/HERO/components/mobile/mobile-hse-checklist-client.tsx',
  'd:/[01] PROJECT/HERO/components/mobile/mobile-hse-client.tsx',
  'd:/[01] PROJECT/HERO/components/mobile/mobile-hse-inspections-client.tsx',
  'd:/[01] PROJECT/HERO/components/mobile/mobile-hse-inventaris-client.tsx',
  'd:/[01] PROJECT/HERO/components/mobile/mobile-hse-modules-client.tsx',
  'd:/[01] PROJECT/HERO/components/mobile/mobile-observasi-emergency-client.tsx',
  'd:/[01] PROJECT/HERO/components/mobile/mobile-overtime-request-form.tsx',
  'd:/[01] PROJECT/HERO/components/mobile/mobile-safety-data-client.tsx',
  'd:/[01] PROJECT/HERO/components/mobile/mobile-sia-sio-tools-client.tsx'
];

files.forEach(f => {
  if (!fs.existsSync(f)) {
    console.log('Not found:', f);
    return;
  }
  let content = fs.readFileSync(f, 'utf8');
  let newContent = content.replace(/import\s*\{\s*Textarea\s*\}\s*from\s*['"]@\/components\/ui\/textarea['"]/g, 'import { SpeechTextarea as Textarea } from "@/components/ui/speech-textarea"');
  if (content !== newContent) {
    fs.writeFileSync(f, newContent);
    console.log('Updated:', f);
  } else {
    console.log('No change:', f);
  }
});
