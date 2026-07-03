const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const items = [
  {
    quotationId: 18,
    category: 'Labour Cost',
    desc: 'Labour cost Staff (Muhammad Randi Saputra)',
    qty: 1, price: 17000000,
    start: '2026-06-01', end: '2026-06-25',
    isBackup: true, backupStart: '2026-06-26', backupEnd: '2026-06-30', backupDesc: 'Labour cost Staff (Asri)', backupPrice: 17000000
  },
  {
    quotationId: 18,
    category: 'Labour Cost',
    desc: 'Labour cost Technical Engineer (Adit Prasetyo)',
    qty: 1, price: 18000000,
    start: '2026-06-01', end: '2026-06-30',
    isBackup: false
  },
  {
    quotationId: 18,
    category: 'Labour Cost',
    desc: 'Labour cost Serviceman (Heri Pratama)',
    qty: 1, price: 17000000,
    start: '2026-06-01', end: '2026-06-30',
    isBackup: false
  },
  {
    quotationId: 18,
    category: 'Labour Cost',
    desc: 'Labour cost Serviceman (Nurman)',
    qty: 1, price: 17000000,
    start: '2026-06-01', end: '2026-06-30',
    isBackup: false
  },
  {
    quotationId: 18,
    category: 'Labour Cost',
    desc: 'Labour cost Serviceman (Kurnia Dwifa)',
    qty: 1, price: 17000000,
    start: '2026-06-17', end: '2026-06-30',
    isBackup: true, backupStart: '2026-06-01', backupEnd: '2026-06-16', backupDesc: 'Labour cost Staff (Asri)', backupPrice: 17000000
  },
  {
    quotationId: 18,
    category: 'Labour Cost',
    desc: 'Labour cost Staff (Gilang Ade Putra Anugrah)',
    qty: 1, price: 17000000,
    start: '2026-06-01', end: '2026-06-30',
    isBackup: false
  },
  {
    quotationId: 18,
    category: 'Labour Cost',
    desc: 'Labour cost Serviceman (Mahmuddin)',
    qty: 1, price: 17000000,
    start: '2026-06-01', end: '2026-06-13',
    isBackup: false
  },
  {
    quotationId: 18,
    category: 'Labour Cost',
    desc: 'Labour cost Serviceman (Rangga Gesta)',
    qty: 1, price: 17000000,
    start: '2026-06-01', end: '2026-06-08',
    extraDates: '23 June 2026 - 30 June 2026',
    isBackup: true, backupStart: '2026-06-10', backupEnd: '2026-06-22', backupDesc: 'Labour cost Staff (Suparmi)', backupPrice: 17000000
  },
  {
    quotationId: 18,
    category: 'Labour Cost',
    desc: 'Labour cost Serviceman (Paiz Ahmad)',
    qty: 1, price: 17000000,
    start: '2026-06-01', end: '2026-06-30',
    isBackup: false
  },
  {
    quotationId: 18,
    category: 'Labour Cost',
    desc: 'Labour cost Serviceman (Zulkarnaini)',
    qty: 1, price: 17000000,
    start: '2026-06-01', end: '2026-06-30',
    isBackup: false
  },
  {
    quotationId: 18,
    category: 'Labour Cost',
    desc: 'Labour cost Staff (Muhamad Nurodin Hilmi)',
    qty: 1, price: 17000000,
    start: '2026-06-01', end: '2026-06-30',
    isBackup: false
  },
  {
    quotationId: 18,
    category: 'Labour Cost',
    desc: 'Labour cost Serviceman (Muhammad Arief Surahman)',
    qty: 1, price: 17000000,
    start: '2026-06-01', end: '2026-06-22',
    isBackup: true, backupStart: '2026-06-23', backupEnd: '2026-06-30', backupDesc: 'Labour cost Staff (Suparmi)', backupPrice: 17000000
  },
  {
    quotationId: 18,
    category: 'Labour Cost',
    desc: 'Labour cost Serviceman (Al Fikar Y)',
    qty: 1, price: 17000000,
    start: '2026-06-01', end: '2026-06-30',
    isBackup: false
  },
  {
    quotationId: 18,
    category: 'Labour Cost',
    desc: 'Labour cost Staff (Dedy Hidayat)',
    qty: 1, price: 17000000,
    start: '2026-06-01', end: '2026-06-30',
    isBackup: false
  },
  {
    quotationId: 18,
    category: 'Labour Cost',
    desc: 'Labour cost Staff (Agus Supriyanto)',
    qty: 1, price: 17000000,
    start: '2026-06-01', end: '2026-06-30',
    isBackup: false
  },
  {
    quotationId: 18,
    category: 'Rental & Tools',
    desc: 'Charge Light Vehicle',
    qty: 1, price: 18000000,
    start: '2026-06-01', end: '2026-06-27',
    isBackup: false
  },
  {
    quotationId: 18,
    category: 'Rental & Tools',
    desc: 'Charge Light Vehicle',
    qty: 1, price: 20000000,
    start: '2026-06-01', end: '2026-06-27',
    isBackup: false
  }
];

function calculateDays(startStr, endStr) {
  const start = new Date(startStr);
  const end = new Date(endStr);
  const diffTime = Math.abs(end - start);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

function getProrate(item) {
  let total = 0;
  const daysInMonth = 30; // June has 30 days
  if (item.start && item.end) {
    const days = calculateDays(item.start, item.end);
    total += (days / daysInMonth) * item.price * item.qty;
  }
  if (item.extraDates) {
    // For item 8
    total += (8 / daysInMonth) * item.price * item.qty;
  }
  
  let backup = 0;
  if (item.isBackup) {
    const bDays = calculateDays(item.backupStart, item.backupEnd);
    backup += (bDays / daysInMonth) * item.backupPrice * item.qty;
  }
  return total + backup;
}

function formatDt(dt) {
  const d = new Date(dt);
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  return `${d.getDate().toString().padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

async function seed() {
  try {
    // Delete existing items for 18
    await pool.query('DELETE FROM hero_service360_quotation_items WHERE quotation_id = 18');
    
    let totalSubtotal = 0;
    
    for (const item of items) {
      let mergedPeriod = `${formatDt(item.start)} - ${formatDt(item.end)}`;
      if (item.extraDates) {
        mergedPeriod += ` & ${item.extraDates}`;
      }
      
      const subtotal = getProrate(item);
      totalSubtotal += subtotal;
      
      const backupPeriod = item.isBackup ? `${formatDt(item.backupStart)} - ${formatDt(item.backupEnd)}` : null;
      
      await pool.query(`
        INSERT INTO hero_service360_quotation_items 
        (quotation_id, month_period, custom_description, quantity, price, subtotal, is_backup, backup_start_date, backup_end_date, backup_month_period, backup_description, backup_price)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [
        item.quotationId,
        mergedPeriod,
        item.desc,
        item.qty,
        item.price,
        subtotal,
        item.isBackup,
        item.backupStart || null,
        item.backupEnd || null,
        backupPeriod,
        item.backupDesc || null,
        item.backupPrice || 0
      ]);
    }
    
    const tax = totalSubtotal * 0.11;
    const total = totalSubtotal + tax;
    
    // Update quotation totals
    await pool.query('UPDATE hero_service360_quotations SET sub_total = $1, tax_amount = $2, total_amount = $3 WHERE id = 18', [totalSubtotal, tax, total]);
    
    console.log('Seed completed successfully');
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    pool.end();
  }
}

seed();
