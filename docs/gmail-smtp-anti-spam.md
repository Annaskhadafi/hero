# Panduan Gmail SMTP - Anti Spam

## Problem
Jika Anda menggunakan **Gmail SMTP** (@gmail.com atau Google Workspace) untuk mengirim email, kemungkinan besar email akan masuk ke folder **Spam/Promotions** karena:

1. Gmail sangat ketat terhadap email dari @gmail.com yang dikirim via SMTP
2. Tidak ada SPF/DKIM/DMARC untuk @gmail.com
3. Gmail mendeteksi "email dari diri sendiri via pihak ketiga"

## Solusi

### 1. Jika Pakai @gmail.com (Bukan Google Workspace) ⛔

**Sangat tidak direkomendasikan untuk production.**

- Limit: 100 email/hari
- 90% kemungkinan masuk Spam
- Tidak bisa setup SPF/DKIM/DMARC untuk @gmail.com
- Solusi: **Upgrade ke Google Workspace** atau **gunakkan SendGrid/Mailgun/Amazon SES**

### 2. Jika Pakai Google Workspace ✅ (Direkomendasikan)

#### Setup App Password (WAJIB)

1. Aktifkan **2-Step Verification** di Google Account
2. Buat **App Password**:
   - Buka https://myaccount.google.com/apppasswords
   - Pilih app: `Mail`
   - Pilih device: `Other (Custom name)` → `HERO Recruitment`
   - Klik **Generate**
   - Copy password 16 karakter (tanpa spasi)
3. Di HERO Settings, isi:
   - **SMTP Password**: Paste App Password (bukan password Gmail biasa)
   - **SMTP Host**: `smtp.gmail.com`
   - **SMTP Port**: `587` (STARTTLS) atau `465` (SSL)
   - **From Email**: `noreply@yourdomain.com` (bukan @gmail.com)
   - **From Name**: `PT Chitra Paratama`

#### Setup SPF/DKIM/DMARC di Google Workspace

**A. SPF Record**
```
Type: TXT
Name: @
Value: v=spf1 include:_spf.google.com ~all
```

**B. DKIM (via Google Admin Console)**
1. Buka https://admin.google.com
2. Go to **Apps > Google Workspace > Gmail > Authenticate email**
3. Klik **Generate new record**
4. Pilih domain → Generate
5. Copy DNS record (TXT) ke DNS panel Anda
6. Kembali ke Admin Console → klik **Start authentication**

**C. DMARC Record**
```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=quarantine; rua=mailto:admin@yourdomain.com; pct=100
```

**D. Reverse DNS (PTR)**
1. Google Workspace biasanya sudah auto-managed
2. Untuk dedicated IP: setup di Google Admin Console

#### Whitelist di Gmail (Personal User)

Agar karyawan tidak kena spam, minta mereka:
1. Buka email pertama dari HERO
2. Klik **Not spam** (jika masuk Spam)
3. Klik **Create filter** → check **Never send it to Spam**
4. Atau tambahkan `noreply@yourdomain.com` ke contacts

### 3. Alternatif: SendGrid (Gratis 100 email/hari) ✅

Jika tidak mau repot setup Google Workspace:

1. Daftar di https://sendgrid.com (free tier: 100/hari)
2. Verifikasi sender identity (domain atau single email)
3. Generate API Key
4. Di HERO Settings:
   - **Host**: `smtp.sendgrid.net`
   - **Port**: `587`
   - **Username**: `apikey`
   - **Password**: `SG.xxxxxx` (API key)
   - **From Email**: `noreply@yourdomain.com`
5. Setup SPF: `v=spf1 include:sendgrid.net ~all`
6. Setup DKIM: ikuti wizard di SendGrid dashboard

### 4. Checklist Sebelum Production

- [ ] Bukan @gmail.com (gunakan domain custom)
- [ ] App Password aktif (bukan password Gmail)
- [ ] SPF record di DNS
- [ ] DKIM di-setup dan authenticated
- [ ] DMARC record di DNS
- [ ] Reverse DNS (PTR) aktif
- [ ] Test kirim ke Gmail, Outlook, Yahoo
- [ ] Semua masuk Inbox (bukan Spam)
- [ ] Volume per hari di bawah limit provider

### 5. Testing

1. Test ke https://www.mail-tester.com/
2. Score harus > 8/10
3. Jika masih spam, cek: https://mxtoolbox.com/blacklists.aspx

## Kontak

Jika masih bingung, hubungi IT admin untuk:
1. Setup Google Workspace (jika belum punya)
2. Konfigurasi DNS SPF/DKIM/DMARC
3. Atau setup SendGrid sebagai alternatif
