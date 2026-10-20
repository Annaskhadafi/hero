import assert from 'node:assert/strict';
import { isKpcCustomer, isKpcRecord } from '../lib/form-wo-customer.ts';

console.log('Testing 3-way Waiting WO partitioning logic (CAMOS API vs HERO KPC vs HERO Non-KPC)...');

// Sample test data matching user's structure
const sampleWaitingList = [
  // CAMOS API items (is_hero: false)
  { id_wo: 'WO-101', customer: 'PT Kaltim Prima Coal', site: 'Sangatta KPC', is_hero: false, source: 'api' },
  { id_wo: 'WO-102', customer: 'PT Kaltim Prima Coal', site: 'Sangatta KPC', is_hero: false, source: 'api' },
  
  // HERO KPC items (is_hero: true, customer: KPC)
  { id_wo: 'HERO-1', customer: 'PT Kaltim Prima Coal', site: 'Sangatta KPC', is_hero: true, source: 'hero' },
  
  // HERO Non-KPC items (is_hero: true, customer: Non-KPC)
  { id_wo: 'HERO-2', customer: 'PT Vale Indonesia', site: 'Sorowako', is_hero: true, source: 'hero' },
  { id_wo: 'HERO-3', customer: 'PT Berau Coal', site: 'Lati', is_hero: true, source: 'hero' },
];

const camosList = [];
const kpcList = [];
const heroList = [];

sampleWaitingList.forEach((item) => {
  const isHero = item.is_hero === true || item.source === 'hero' || item.id_wo?.startsWith('HERO-');
  if (!isHero) {
    camosList.push(item);
  } else if (isKpcRecord(item)) {
    kpcList.push(item);
  } else {
    heroList.push(item);
  }
});

// Assertions
assert.equal(camosList.length, 2, 'CAMOS API list count should be 2');
assert.equal(kpcList.length, 1, 'HERO KPC list count should be 1');
assert.equal(heroList.length, 2, 'HERO Non-KPC list count should be 2');
assert.equal(
  camosList.length + kpcList.length + heroList.length,
  sampleWaitingList.length,
  'Total items must equal the sum of all 3 tabs without overlap or missing data'
);

console.log('✓ All 3-way Waiting WO tab partitioning tests passed successfully!');
