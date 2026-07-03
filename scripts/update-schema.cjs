const fs = require('fs');
const path = './db/schema/hero.ts';
let content = fs.readFileSync(path, 'utf8');
content = content.replace(
  "  pointsOverrideReason: text('points_override_reason').notNull().default(''),\n  createdAt: timestamp('created_at').notNull().defaultNow(),\n})",
  "  pointsOverrideReason: text('points_override_reason').notNull().default(''),\n  signatureUrl: text('signature_url'),\n  createdAt: timestamp('created_at').notNull().defaultNow(),\n})"
);
fs.writeFileSync(path, content);
