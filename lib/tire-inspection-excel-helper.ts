import ExcelJS from 'exceljs';
import type { TireRepairInspectionRecord } from './tire-repair-constants';

const MONTH_NAMES_INDONESIA = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

export async function generateTireInspectionExcelBuffer(
  records: TireRepairInspectionRecord[],
  filterParams?: { month?: string | number; year?: string | number }
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'PT Chitra Paratama HERO';
  workbook.lastModifiedBy = 'PT Chitra Paratama HERO';
  workbook.created = new Date();

  // Determine Month and Year for sheet name (e.g. format Oktober-2025)
  let monthName = 'September';
  let yearStr = '2026';

  if (filterParams?.month && Number(filterParams.month) >= 1 && Number(filterParams.month) <= 12) {
    monthName = MONTH_NAMES_INDONESIA[Number(filterParams.month) - 1];
  } else {
    const d = new Date();
    monthName = MONTH_NAMES_INDONESIA[d.getMonth()];
  }

  if (filterParams?.year) {
    yearStr = String(filterParams.year);
  } else {
    yearStr = String(new Date().getFullYear());
  }

  const sheetName = `format ${monthName}-${yearStr}`;
  const worksheet = workbook.addWorksheet(sheetName, {
    views: [{ showGridLines: true }],
  });

  // Set row heights for logo & title banner
  worksheet.getRow(1).height = 24;
  worksheet.getRow(2).height = 30;
  worksheet.getRow(3).height = 24;

  // Row 2: Title "TYRE INSPECTION REPORT CP-KPC" (Merged G2:O2 in middle)
  worksheet.mergeCells('G2:O2');
  const titleCell = worksheet.getCell('G2');
  titleCell.value = 'TYRE INSPECTION REPORT CP-KPC';
  titleCell.font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FF003F78' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

  // Row 3: Date line (Merged G3:O3 in middle)
  const now = new Date();
  const dateFormatted = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
  worksheet.mergeCells('G3:O3');
  const dateCell = worksheet.getCell('G3');
  dateCell.value = `TANGGAL EXPORT: ${dateFormatted} - ${records.length} ITEMS`;
  dateCell.font = { name: 'Arial', size: 9, italic: true, bold: true, color: { argb: 'FF555555' } };
  dateCell.alignment = { horizontal: 'center', vertical: 'middle' };

  // Load logos and place on left (Col A-E) and right (Col P-U)
  try {
    const fs = require('fs');
    const path = require('path');

    const cpLogoPath = path.join(process.cwd(), 'public', 'images', 'logo-cp.png');
    const kpcLogoPath = path.join(process.cwd(), 'public', 'images', 'logo-kpc.png');

    if (fs.existsSync(cpLogoPath)) {
      const cpBuffer = fs.readFileSync(cpLogoPath);
      const cpImageId = workbook.addImage({
        buffer: cpBuffer,
        extension: 'png',
      });
      worksheet.addImage(cpImageId, {
        tl: { col: 0.1, row: 0.05 },
        ext: { width: 340, height: 74 },
        editAs: 'oneCell',
      });
    }

    if (fs.existsSync(kpcLogoPath)) {
      const kpcBuffer = fs.readFileSync(kpcLogoPath);
      const kpcImageId = workbook.addImage({
        buffer: kpcBuffer,
        extension: 'png',
      });
      worksheet.addImage(kpcImageId, {
        tl: { col: 15.1, row: 0.05 },
        ext: { width: 280, height: 74 },
        editAs: 'oneCell',
      });
    }
  } catch (err) {
    console.warn('Could not embed logo image files into excel:', err);
  }

  // Row 4: Column Headers
  const headers = [
    'NO',
    'ID',
    'Removal Reason',
    'Scrap - Reason',
    'Status',
    'Priority',
    'Deffectex-repair',
    'Size',
    'Vehicle',
    'Wheel Position',
    'Hours',
    'Hours Since Last Repair',
    'Rtd',
    'Specification',
    'Foto1',
    'Foto2',
    'Foto3',
    'Foto4',
    'Foto5',
    'Pit Location',
    'Marking',
  ];

  const headerRow = worksheet.getRow(4);
  headerRow.height = 24;

  headers.forEach((h, colIdx) => {
    const cell = headerRow.getCell(colIdx + 1);
    cell.value = h;
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF003F78' },
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      bottom: { style: 'medium', color: { argb: 'FF00284D' } },
      right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
    };
  });

  // Helper to resolve photo buffer
  async function getBufferFromPhotoUrl(
    photoUrl?: string
  ): Promise<{ buffer: Buffer; extension: 'png' | 'jpeg' } | null> {
    if (!photoUrl || typeof photoUrl !== 'string') return null;
    try {
      if (photoUrl.startsWith('data:image/')) {
        const extension = photoUrl.includes('png') ? 'png' : 'jpeg';
        const base64Data = photoUrl.replace(/^data:image\/\w+;base64,/, '');
        return { buffer: Buffer.from(base64Data, 'base64'), extension };
      }
      if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
        const res = await fetch(photoUrl);
        if (res.ok) {
          const arrayBuf = await res.arrayBuffer();
          const extension = photoUrl.toLowerCase().includes('.png') ? 'png' : 'jpeg';
          return { buffer: Buffer.from(arrayBuf), extension };
        }
      }
      if (photoUrl.startsWith('/') || photoUrl.includes('uploads')) {
        const fs = require('fs');
        const path = require('path');
        const cleanPath = photoUrl.startsWith('/') ? photoUrl.slice(1) : photoUrl;
        const localPath = path.join(process.cwd(), 'public', cleanPath);
        if (fs.existsSync(localPath)) {
          const extension = localPath.toLowerCase().endsWith('.png') ? 'png' : 'jpeg';
          return { buffer: fs.readFileSync(localPath), extension };
        }
      }
    } catch (err) {
      console.warn('Could not load photo buffer for Excel export:', err);
    }
    return null;
  }

  // Data rows starting at Row 5
  for (let index = 0; index < records.length; index++) {
    const item = records[index];
    const rtdStr =
      item.rtd1 || item.rtd2
        ? item.rtd1 && item.rtd2
          ? `${item.rtd1} / ${item.rtd2}`
          : item.rtd1 || item.rtd2
        : '';

    const specParts = [
      item.brand || 'MICHELIN',
      item.tireSize,
      item.pattern || 'E4',
      item.typeConstruction || 'RADIAL',
    ].filter(Boolean);

    const specStr = specParts.join(', ');
    const photos = item.photos || [];

    const rowValues = [
      index + 1,
      item.serialNumber || '',
      item.removalReason || '',
      item.scrapReason || '',
      item.status || 'Repair',
      item.repairDuration || 'R1',
      item.deffectexRepair || '',
      item.tireSize || '',
      item.vehicle || '',
      item.wheelPosition || '',
      item.hours || '',
      item.hoursSinceLastRepair || '',
      rtdStr,
      specStr,
      '', // Foto1 - Image embedded via worksheet.addImage
      '', // Foto2
      '', // Foto3
      '', // Foto4
      '', // Foto5
      item.pitLocation || '',
      item.marking || '',
    ];

    const dataRow = worksheet.getRow(5 + index);
    const hasPhotos = photos.length > 0;
    dataRow.height = hasPhotos ? 65 : 22;

    rowValues.forEach((val, colIdx) => {
      const cell = dataRow.getCell(colIdx + 1);
      cell.value = val;
      cell.font = { name: 'Arial', size: 9 };
      cell.alignment = { vertical: 'middle', horizontal: colIdx === 0 ? 'center' : 'left' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        right: { style: 'thin', color: { argb: 'FFE0E0E0' } },
      };
    });

    // Embed photos physically in Foto1..Foto5 cells
    for (let fIdx = 0; fIdx < Math.min(5, photos.length); fIdx++) {
      const photoObj = photos[fIdx];
      if (photoObj?.photoUrl) {
        const imgRes = await getBufferFromPhotoUrl(photoObj.photoUrl);
        if (imgRes && imgRes.buffer) {
          try {
            const imgId = workbook.addImage({
              buffer: imgRes.buffer,
              extension: imgRes.extension,
            });

            worksheet.addImage(imgId, {
              tl: { col: 14 + fIdx + 0.05, row: 4 + index + 0.05 },
              br: { col: 15 + fIdx - 0.05, row: 5 + index - 0.05 },
              editAs: 'oneCell',
            });
          } catch (imgErr) {
            console.warn(`Could not embed photo ${fIdx + 1} for row ${index + 1}:`, imgErr);
          }
        }
      }
    }
  }

  // Set explicit column widths
  const colWidths = [6, 18, 16, 16, 12, 10, 16, 14, 12, 14, 10, 20, 12, 35, 25, 25, 25, 25, 25, 14, 14];
  colWidths.forEach((w, idx) => {
    worksheet.getColumn(idx + 1).width = w;
  });

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
