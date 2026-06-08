# Panduan Mengurangi Email Masuk Spam

## Langkah 1: DNS Records (WAJIB)

Tambahkan records ini di domain Anda (misal: `chitraparatama.com` atau domain yang digunakan untuk email).

### A. SPF Record
Tambahkan TXT record untuk domain utama:
```
Type: TXT
Name: @
Value: v=spf1 include:_spf.google.com ~all
```

Jika menggunakan provider SMTP lain (bukan Gmail), sesuaikan dengan provider Anda:
```
# Contoh SendGrid
v=spf1 include:sendgrid.net ~all

# Contoh Mailgun
v=spf1 include:mailgun.org ~all

# Contoh Amazon SES
v=spf1 include:amazonses.com ~all
```

### B. DKIM Record
DKIM harus di-setup di provider SMTP Anda. Setiap provider berbeda:
- **Gmail/Google Workspace**: Aktifkan di Google Admin Console
- **SendGrid**: Generate di dashboard SendGrid, tambahkan CNAME record
- **Mailgun**: Generate di dashboard Mailgun, tambahkan TXT record
- **Amazon SES**: Generate di AWS Console, tambahkan TXT record

### C. DMARC Record
Tambahkan TXT record:
```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com; pct=100
```

## Langkah 2: Reverse DNS (PTR Record)

Pastikan IP server Anda memiliki reverse DNS ke domain Anda. Ini biasanya diatur di hosting provider/VPS panel.

Contoh: IP `203.0.113.10` → reverse DNS ke `mail.chitraparatama.com`

## Langkah 3: Email Settings di HERO

Pastikan di **Settings > Email SMTP**:
1. **From Name**: Gunakan nama perusahaan yang jelas (contoh: `PT Chitra Paratama`)
2. **From Email**: Gunakan domain perusahaan (contoh: `noreply@chitraparatama.com`)
3. **Reply-To**: Isi dengan email aktif (contoh: `hc@chitraparatama.com`)
4. **Jangan gunakan**: `@gmail.com`, `@yahoo.com`, `@outlook.com` untuk From Email di production

## Langkah 4: Konten Email

1. **Jangan gunakan kata spam**: "Gratis", "Promo", "Dapatkan", "Klik di sini", "Segera", "Terbatas"
2. **Jangan ALL CAPS** di subject atau body
3. **Pastikan ada plain text** version (sudah otomatis di HERO)
4. **Gunakan link yang valid** dan tidak broken
5. **Balance text dan image** - jangan hanya image saja
6. **Tambahkan unsubscribe** info di footer (sudah ada di HERO)

## Langkah 5: Testing

1. Kirim test email ke:
   - Gmail → cek Promotions/Spam
   - Outlook/Hotmail → cek Junk
   - Yahoo → cek Spam
2. Gunakan tool:
   - https://www.mail-tester.com/
   - https://mxtoolbox.com/spf.aspx
   - https://mxtoolbox.com/dkim.aspx
   - https://mxtoolbox.com/dmarc.aspx

## Troubleshooting

### Email masih spam?
1. Cek apakah domain baru (< 30 hari) → spam filter lebih ketat
2. Cek apakah IP server di blacklist: https://mxtoolbox.com/blacklists.aspx
3. Cek reputation IP: https://www.senderscore.org/
4. Pastikan volume tidak terlalu banyak tiba-tiba (warm up IP)

### Gmail masuk Promotions?
- Normal untuk email transactional/bulk. User bisa drag ke Primary untuk melatih Gmail.
- Pastikan subject tidak terlalu marketing-oriented.

## Kontak Support

Jika masih ada masalah, hubungi admin IT untuk:
1. Setup DNS records SPF, DKIM, DMARC
2. Setup reverse DNS (PTR)
3. Pilih SMTP provider yang reputable (SendGrid, Mailgun, Amazon SES, atau Google Workspace)
