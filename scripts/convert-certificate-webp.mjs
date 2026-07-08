import sharp from 'sharp';

async function convert() {
  await sharp('d:/[01] PROJECT/HERO/public/CERTIFICATE-LMS-CLEAR.webp')
    .png()
    .toFile('d:/[01] PROJECT/HERO/public/CERTIFICATE-LMS-CLEAR.png');
  console.log('Conversion complete');
}

convert().catch(console.error);
