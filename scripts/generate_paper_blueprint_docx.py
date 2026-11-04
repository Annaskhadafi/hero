import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn
import os

def create_hero_paper_blueprint_docx(output_path):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    doc = docx.Document()

    def add_watermark_background(header, image_path, width_in=5.8, height_in=5.8, top_in=3.0, left_in=1.2):
        if not os.path.exists(image_path):
            return
        p = header.paragraphs[0]
        run = p.add_run()
        pic = run.add_picture(image_path, width=Inches(width_in), height=Inches(height_in))
        inline = pic._inline
        graphic = inline.graphic
        extent = inline.extent
        docPr = inline.docPr
        cx = extent.cx
        cy = extent.cy
        pos_x = int(left_in * 914400)
        pos_y = int(top_in * 914400)
        
        anchor_xml = f'''
        <wp:anchor {nsdecls('wp')} distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="251658240" behindDoc="1" locked="0" layoutInCell="1" allowOverlap="1">
          <wp:simplePos x="0" y="0"/>
          <wp:positionH relativeFrom="page">
            <wp:posOffset>{pos_x}</wp:posOffset>
          </wp:positionH>
          <wp:positionV relativeFrom="page">
            <wp:posOffset>{pos_y}</wp:posOffset>
          </wp:positionV>
          <wp:extent cx="{cx}" cy="{cy}"/>
          <wp:effectExtent l="0" t="0" r="0" b="0"/>
          <wp:wrapNone/>
          <wp:docPr id="{docPr.id}" name="BlueprintWatermark"/>
          <wp:cNvGraphicFramePr/>
        </wp:anchor>
        '''
        anchor = parse_xml(anchor_xml)
        anchor.append(graphic)
        inline.getparent().replace(inline, anchor)

    # Setup A4 page geometry
    for section in doc.sections:
        section.page_width = Inches(8.27)   # A4 Width
        section.page_height = Inches(11.69) # A4 Height
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.85)
        section.left_margin = Inches(0.85)
        section.right_margin = Inches(0.85)

        # Header with subtle background watermark & text
        header = section.header
        
        # Add Chitra Letterhead Background Watermark with Logo
        bg_watermark_path = r"public\brand\chitra-letterhead-bg.png"
        if not os.path.exists(bg_watermark_path):
            bg_watermark_path = r"public\chitra-letterhead-bg.png"
        add_watermark_background(header, bg_watermark_path)

        p_hdr = header.paragraphs[0]
        p_hdr.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        r_hdr = p_hdr.add_run("HERO (Human Capital & Operational Hub) — Business Blueprint & Handover")
        r_hdr.font.name = "Arial"
        r_hdr.font.size = Pt(8.0)
        r_hdr.font.color.rgb = RGBColor(100, 116, 139)

        footer = section.footer
        p_ftr = footer.paragraphs[0]
        p_ftr.alignment = WD_ALIGN_PARAGRAPH.LEFT
        r_ftr_l = p_ftr.add_run("PT Chitra Paratama (One Chitra Ecosystem) — Internal Restricted & Engineering Handover")
        r_ftr_l.font.name = "Arial"
        r_ftr_l.font.size = Pt(7.5)
        r_ftr_l.font.color.rgb = RGBColor(148, 163, 184)

    # Colors
    NAVY = RGBColor(15, 23, 42)         # #0F172A
    BLUE = RGBColor(7, 83, 231)         # #0753E7 Brand Blue
    TEAL = RGBColor(13, 148, 136)       # #0D9488
    EMERALD = RGBColor(5, 150, 105)     # #059669
    DARK_TEXT = RGBColor(51, 65, 85)    # #334155
    MUTED = RGBColor(100, 116, 139)     # #64748B

    def set_cell_background(cell, fill_hex):
        tcPr = cell._tc.get_or_add_tcPr()
        shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
        tcPr.append(shd)

    def set_cell_margins(cell, top=80, bottom=80, left=120, right=120):
        tcPr = cell._tc.get_or_add_tcPr()
        tcMar = OxmlElement('w:tcMar')
        for margin_name, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
            node = OxmlElement(f'w:{margin_name}')
            node.set(qn('w:w'), str(val))
            node.set(qn('w:type'), 'dxa')
            tcMar.append(node)
        tcPr.append(tcMar)

    def format_heading(text, level):
        h = doc.add_heading(text, level=level)
        h.paragraph_format.keep_with_next = True
        run = h.runs[0]
        run.font.name = "Arial"
        if level == 1:
            run.font.size = Pt(14)
            run.font.bold = True
            run.font.color.rgb = NAVY
            h.paragraph_format.space_before = Pt(14)
            h.paragraph_format.space_after = Pt(4)
        elif level == 2:
            run.font.size = Pt(11.5)
            run.font.bold = True
            run.font.color.rgb = BLUE
            h.paragraph_format.space_before = Pt(10)
            h.paragraph_format.space_after = Pt(3)
        elif level == 3:
            run.font.size = Pt(10)
            run.font.bold = True
            run.font.color.rgb = TEAL
            h.paragraph_format.space_before = Pt(6)
            h.paragraph_format.space_after = Pt(2)

    def add_p(text, bold=False, italic=False, space_after=3, bullet=False):
        if bullet:
            p = doc.add_paragraph(style='List Bullet')
        else:
            p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(space_after)
        run = p.add_run(text)
        run.font.name = "Arial"
        run.font.size = Pt(9.5)
        run.font.color.rgb = DARK_TEXT
        run.bold = bold
        run.italic = italic
        return p

    def add_callout(text, title="CATATAN ARSITEKTUR & KEBIJAKAN SISTEM", border_color="0753E7"):
        table = doc.add_table(rows=1, cols=1)
        table.alignment = WD_TABLE_ALIGNMENT.CENTER
        cell = table.cell(0, 0)
        set_cell_background(cell, "F8FAFC")
        set_cell_margins(cell, top=100, bottom=100, left=140, right=140)
        
        tcPr = cell._tc.get_or_add_tcPr()
        borders = parse_xml(f'''
            <w:tcBorders {nsdecls("w")}>
                <w:top w:val="none"/>
                <w:left w:val="single" w:sz="36" w:space="0" w:color="{border_color}"/>
                <w:bottom w:val="none"/>
                <w:right w:val="none"/>
            </w:tcBorders>
        ''')
        tcPr.append(borders)
        
        p = cell.paragraphs[0]
        p.paragraph_format.space_before = Pt(1)
        p.paragraph_format.space_after = Pt(3)
        run_t = p.add_run(f"📌 {title}\n")
        run_t.bold = True
        run_t.font.name = "Arial"
        run_t.font.size = Pt(9.0)
        run_t.font.color.rgb = NAVY
        
        run_b = p.add_run(text)
        run_b.font.name = "Arial"
        run_b.font.size = Pt(8.5)
        run_b.font.color.rgb = DARK_TEXT
        run_b.italic = True

    def add_code_block(code_text):
        table = doc.add_table(rows=1, cols=1)
        table.alignment = WD_TABLE_ALIGNMENT.CENTER
        cell = table.cell(0, 0)
        set_cell_background(cell, "F1F5F9")
        set_cell_margins(cell, top=80, bottom=80, left=120, right=120)

        tcPr = cell._tc.get_or_add_tcPr()
        borders = parse_xml(f'''
            <w:tcBorders {nsdecls("w")}>
                <w:top w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
                <w:left w:val="single" w:sz="24" w:space="0" w:color="0753E7"/>
                <w:bottom w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
                <w:right w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
            </w:tcBorders>
        ''')
        tcPr.append(borders)

        p = cell.paragraphs[0]
        p.paragraph_format.space_before = Pt(1)
        p.paragraph_format.space_after = Pt(1)
        r = p.add_run(code_text)
        r.font.name = "Consolas"
        r.font.size = Pt(8.0)
        r.font.color.rgb = RGBColor(15, 23, 42)

    def style_table(table, header_bg="0F172A", compact=False):
        table.alignment = WD_TABLE_ALIGNMENT.CENTER
        for i, row in enumerate(table.rows):
            is_header = (i == 0)
            for cell in row.cells:
                top_m = 40 if compact else 60
                bot_m = 40 if compact else 60
                set_cell_margins(cell, top=top_m, bottom=bot_m, left=80, right=80)
                if is_header:
                    set_cell_background(cell, header_bg)
                    p = cell.paragraphs[0]
                    p.paragraph_format.space_after = Pt(0)
                    for run in p.runs:
                        run.font.name = "Arial"
                        run.font.size = Pt(8.5)
                        run.font.bold = True
                        run.font.color.rgb = RGBColor(255, 255, 255)
                else:
                    bg = "FFFFFF" if i % 2 == 1 else "F8FAFC"
                    set_cell_background(cell, bg)
                    p = cell.paragraphs[0]
                    p.paragraph_format.space_after = Pt(0)
                    for run in p.runs:
                        run.font.name = "Arial"
                        run.font.size = Pt(8.0)
                        run.font.color.rgb = DARK_TEXT

    # ==========================================
    # COVER & DOCUMENT CONTROL
    # ==========================================
    # Top Header Logo Banner
    logo_table = doc.add_table(rows=1, cols=2)
    logo_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    c_logo_l = logo_table.cell(0, 0)
    c_logo_r = logo_table.cell(0, 1)

    hero_logo_path = r"public\Hero Logo\hero landscape.png"
    if os.path.exists(hero_logo_path):
        p_ll = c_logo_l.paragraphs[0]
        p_ll.alignment = WD_ALIGN_PARAGRAPH.LEFT
        r_ll = p_ll.add_run()
        r_ll.add_picture(hero_logo_path, width=Inches(2.2))
    else:
        c_logo_l.paragraphs[0].text = "HERO ENTERPRISE"

    chitra_logo_path = r"public\brand\Chitra-Paratama.png"
    if not os.path.exists(chitra_logo_path):
        chitra_logo_path = r"public\cp_logo-removebg-preview.png"
    if os.path.exists(chitra_logo_path):
        p_rr = c_logo_r.paragraphs[0]
        p_rr.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        r_rr = p_rr.add_run()
        r_rr.add_picture(chitra_logo_path, width=Inches(1.8))
    else:
        c_logo_r.paragraphs[0].text = "PT CHITRA PARATAMA"

    p_header = doc.add_paragraph()
    p_header.paragraph_format.space_before = Pt(14)
    p_header.paragraph_format.space_after = Pt(2)
    r_cname = p_header.add_run("PT CHITRA PARATAMA\n")
    r_cname.font.name = "Arial"
    r_cname.font.size = Pt(13)
    r_cname.font.bold = True
    r_cname.font.color.rgb = NAVY

    r_pname = p_header.add_run("HERO (HUMAN CAPITAL, EMPLOYEE REPORTING & OPERATIONAL HUB)\n")
    r_pname.font.name = "Arial"
    r_pname.font.size = Pt(17)
    r_pname.font.bold = True
    r_pname.font.color.rgb = BLUE

    r_sub = p_header.add_run("Business Blueprint Design & Technical Handover Guide")
    r_sub.font.name = "Arial"
    r_sub.font.size = Pt(11.5)
    r_sub.font.italic = True
    r_sub.font.color.rgb = DARK_TEXT

    # Document Control
    p_dc_t = doc.add_paragraph()
    p_dc_t.paragraph_format.space_before = Pt(14)
    p_dc_t.paragraph_format.space_after = Pt(2)
    r_dc = p_dc_t.add_run("DOCUMENT CONTROL")
    r_dc.font.name = "Arial"
    r_dc.font.size = Pt(10)
    r_dc.font.bold = True
    r_dc.font.color.rgb = NAVY

    dc_table = doc.add_table(rows=6, cols=2)
    dc_data = [
        ("Attribute", "Detail"),
        ("Author", "Mochamad Annas Khadafi"),
        ("File Name", "HERO_Enterprise_System_Blueprint"),
        ("Created Date", "November 2026"),
        ("Status / Version", "Version 2.0 (Enterprise Production Edition)"),
        ("Departement", "Human Capital, HSE & IT Engineering / One Chitra"),
    ]
    for r_idx, (col0, col1) in enumerate(dc_data):
        row = dc_table.rows[r_idx]
        row.cells[0].paragraphs[0].text = col0
        row.cells[1].paragraphs[0].text = col1
        if r_idx > 0:
            row.cells[0].paragraphs[0].runs[0].font.bold = True
    style_table(dc_table, header_bg="0F172A")

    # Document Approval / Review
    p_appr_t = doc.add_paragraph()
    p_appr_t.paragraph_format.space_before = Pt(10)
    p_appr_t.paragraph_format.space_after = Pt(2)
    r_appr = p_appr_t.add_run("Document Approval / Review")
    r_appr.font.name = "Arial"
    r_appr.font.size = Pt(10)
    r_appr.font.bold = True
    r_appr.font.color.rgb = NAVY

    appr_table = doc.add_table(rows=4, cols=4)
    appr_data = [
        ("Role / Title", "Name", "Date", "Sign-Off"),
        ("Prepared by (Lead Engineer)", "Mochamad Annas Khadafi", "November 2026", "Approved"),
        ("Reviewed by (Solution Architect)", "Arif Maulana Ghafar", "November 2026", "Approved"),
        ("Approved by (Head of Tech / Sponsor)", "Febrian Dani", "November 2026", "Approved"),
    ]
    for r_idx, (c0, c1, c2, c3) in enumerate(appr_data):
        row = appr_table.rows[r_idx]
        row.cells[0].paragraphs[0].text = c0
        row.cells[1].paragraphs[0].text = c1
        row.cells[2].paragraphs[0].text = c2
        row.cells[3].paragraphs[0].text = c3
        if r_idx > 0:
            row.cells[0].paragraphs[0].runs[0].font.bold = True
            row.cells[3].paragraphs[0].runs[0].font.color.rgb = EMERALD
            row.cells[3].paragraphs[0].runs[0].font.bold = True
    style_table(appr_table, header_bg="0F172A")

    # Table of Content
    p_toc_t = doc.add_paragraph()
    p_toc_t.paragraph_format.space_before = Pt(14)
    p_toc_t.paragraph_format.space_after = Pt(2)
    r_toc = p_toc_t.add_run("TABLE OF CONTENT")
    r_toc.font.name = "Arial"
    r_toc.font.size = Pt(10)
    r_toc.font.bold = True
    r_toc.font.color.rgb = NAVY

    toc_items = [
        "1. General Information (Background, Objective, Tech Stack)",
        "2. Business Requirement (HC, HSE, Operations, Attendance & MAESTRO Scope)",
        "3. Project Scope & Architecture (10 Domain Modul Utama)",
        "4. Solution Design & Data Model (4.1 Master Data, 4.2 Transactional Data, 4.3 ERD & Kamus Basis Data)",
        "5. System Processes & Workflows (5.1 HC Review Kontrak, 5.2 HSE Insiden, 5.3 Central Service WO-24, 5.4 Kehadiran Biometrik, 5.5 Approvals)",
        "6. Integration System (6.1 S3 Storage Proxy, 6.2 Face-API Biometrics, 6.3 SAP Assets, 6.4 Email SMTP)",
        "7. Business Users and Security (7.1 RBAC Matrix, 7.2 Session, 7.3 File Upload, 7.4 Data Protection & UU PDP)",
        "8. Planning Development, DevOps & Error Handling Runbook (8.1 Dokploy Docker, 8.2 .env, 8.3 CLI, 8.4 Error Handling Runbook)",
        "9. Complete Module & Page Directory (All Detailed Pages Specifications)",
        "10. Developer Handover Checklist & Sign-Off",
    ]
    for item in toc_items:
        p_t = doc.add_paragraph()
        p_t.paragraph_format.space_before = Pt(0)
        p_t.paragraph_format.space_after = Pt(2)
        r_item = p_t.add_run(item)
        r_item.font.name = "Arial"
        r_item.font.size = Pt(9.0)
        r_item.font.color.rgb = DARK_TEXT

    doc.add_page_break()

    # ==========================================
    # 1. GENERAL INFORMATION
    # ==========================================
    format_heading("1. General Information", level=1)
    add_p("HERO (Human Capital, Employee Reporting & Operational Hub) adalah platform Enterprise terintegrasi dan Operational Hub komprehensif milik PT Chitra Paratama yang mengintegrasikan pengelolaan siklus hidup kepegawaian (Human Capital), kedisiplinan dan kepatuhan keselamatan tambang (HSE/EVHS), manajemen operasional workshop perbaikan ban alat berat (Central Service & WO-24), pemantauan logistik armada dan pengiriman (Deliveries & Cargo Manifest), akuntabilitas jam kerja harian (My Day & Team Board), presensi GPS dan biometrik wajah anti titip-absen, mesin persetujuan bertingkat terpadu (Universal Multi-Tier Approval Matrix), hingga portal layanan mandiri bagi pelanggan korporat tambang (MAESTRO Customer Portal).")

    format_heading("1.1. Background (Latar Belakang & Konteks Operasional)", level=2)
    add_p("PT Chitra Paratama sebagai salah satu penyedia solusi ban alat berat, jasa rekondisi (retread/vulkanisir), dan manajemen keselamatan operasional tambang terkemuka di Indonesia memiliki operasional yang tersebar luas di berbagai remote mining sites (seperti Sangatta, Satui, Balikpapan, Lahat, dan site lainnya). Karakteristik lingkungan kerja tambang yang berisiko tinggi dan terpencil menghadirkan berbagai tantangan operasional nyata:")
    add_p("• Fragmentasi Data Kepegawaian: Karyawan tersebar di puluhan site penempatan tanpa satu sistem basis data terpusat, menyebabkan kesulitan rekonsiliasi status kontrak PKWT, penempatan, dan relasi atasan.")
    add_p("• Risiko Pelanggaran Kontrak PKWT: Monitoring jatuh tempo kontrak kerja karyawan yang sebelumnya bersifat semi-manual rentan menimbulkan keterlambatan evaluasi (melewati 30-60 hari jatuh tempo), berisiko menimbulkan sengketa ketenagakerjaan dan denda regulasi.")
    add_p("• Kehadiran Lapangan & Anti Titip-Absen: Diperlukan mekanisme pencatatan kehadiran yang tidak bisa dimanipulasi dengan memvalidasi radius fisik koordinat GPS resmi site dan verifikasi wajah secara lokal di browser klien yang patuh terhadap Undang-Undang Perlindungan Data Pribadi (UU PDP No. 27 Tahun 2022).")
    add_p("• Ketertelusuran Servis Ban Alat Berat (WO-24): Proses servis ban vulkanisir bernilai ratusan juta rupiah memerlukan pencatatan riwayat serial number fisik ban, alokasi teknisi, otorisasi tanda tangan digital Quality Control (QC), serta penerbitan Surat Jalan (Delivery Order) resmi yang dapat diaudit secara real-time.")
    add_p("• Budaya K3 & Mitigasi Zero-Accident: Pelaporan kondisi bahaya (KTA) dan tindakan tidak aman (TTA) di lapangan harus dapat dilakukan secara instan dari smartphone dengan bukti foto dan analisis akar masalah 5-Why terpadu.")
    add_p("HERO dibangun untuk mengintegrasikan seluruh proses bisnis kritis tersebut ke dalam satu ekosistem web modern yang tangguh, cepat, dan aman.")

    format_heading("1.2. Objective (Tujuan Strategis & Sasaran Sistem)", level=2)
    add_p("Pembangunan dan penerapan HERO menetapkan 6 sasaran strategis perusahaan:")
    add_p("1. Mewujudkan Single Source of Truth (SSoT): Menjadikan tabel hero_employees sebagai satu-satunya rujukan data kepegawaian yang terhubung langsung ke otentikasi login, departemen, seksi kerja, dan hak akses.")
    add_p("2. Menjamin Kepatuhan Regulasi Ketenagakerjaan: Mengotomatisasi sistem peringatan dini (early warning) evaluasi kontrak PKWT jatuh tempo 30, 60, dan 90 hari sebelum masa berlaku berakhir.")
    add_p("3. Meningkatkan Disiplin & Akuntabilitas Jam Kerja: Memastikan kehadiran karyawan 100% tervalidasi radius geofence GPS dan face biometrics, serta laporan jam produktif mandiri (My Day).")
    add_p("4. Meningkatkan Keandalan & Standarisasi Servis Ban: Mempercepat siklus penerbitan WO-24, pemantauan status perbaikan di workshop, dan penerbitan Surat Jalan DO standar A4 ber-QR Code.")
    add_p("5. Mempercepat Pengambilan Keputusan (SLA Approval): Menyediakan Inbox Persetujuan Terpadu satu atap lintas hierarki jabatan (Section Head -> Dept Head -> Division Head/Direksi).")
    add_p("6. Menyediakan Layanan Mandiri B2B (MAESTRO): Membuka transparansi progres servis ban dan inventaris scrap tire kepada pelanggan tambang eksternal secara terkontrol.")

    format_heading("1.3. Core Tech Stack Foundation", level=2)
    tech_table = doc.add_table(rows=10, cols=3)
    tech_data = [
        ("Category Layer", "Technology & Version", "Role & Responsibility"),
        ("Frontend Framework", "Next.js 15 (App Router, Turbopack, React 19)", "Server Components, Client Components, Server Actions, Dynamic Layouts & Streaming UI"),
        ("Language & Runtime", "TypeScript 5.x & Node.js 22 LTS", "Static type safety, modern async runtime, ESM modules, zero compilation drift"),
        ("Styling & UI Components", "Tailwind CSS v4, Radix UI Primitives, Lucide Icons, @/components/templates", "Design system responsif seragam, aksesibilitas WAI-ARIA, tinggi tombol baku h-9 (36px)"),
        ("Database & ORM", "PostgreSQL 16+ & Drizzle ORM (drizzle-orm, drizzle-kit)", "Relational database dengan schema-as-code, typed parameterized queries, migration engine"),
        ("State & Data Fetching", "TanStack React Query v5 & TanStack Virtual v3", "Client-side caching, optimistic updates, virtualized table rendering untuk ribuan baris data"),
        ("Authentication & Authorization", "Better Auth & Role-Based Access Control (RBAC)", "Session cookies (HttpOnly, Secure), dynamic resource permissions (resource:action), site scoping"),
        ("Object Storage & File Upload", "IS3 CloudHost (S3 Private API) & Dokploy Persistent Mount", "Sentralisasi berkas aman via proxy /api/uploads/[...path] dan resolver resolveUploadUrl()"),
        ("Biometrics & AI Engine", "@vladmandic/face-api (TensorFlow.js WebAssembly)", "Deteksi wajah klien, ekstraksi 128-vektor deskriptor terenkripsi, UU PDP compliant"),
        ("DevOps & Deployment", "Docker Standalone, Dokploy Engine, Multi-Stage Build", "Containerized deployment dengan bind mount /mnt/data/one-chitra/uploads dan zero data loss"),
    ]
    for r_idx, (col0, col1, col2) in enumerate(tech_data):
        row = tech_table.rows[r_idx]
        row.cells[0].paragraphs[0].text = col0
        row.cells[1].paragraphs[0].text = col1
        row.cells[2].paragraphs[0].text = col2
    style_table(tech_table)

    # ==========================================
    # 2. BUSINESS REQUIREMENT
    # ==========================================
    format_heading("2. Business Requirement", level=1)
    add_p("Sistem HERO dirancang untuk menyelesaikan tantangan operasional kepegawaian, keselamatan, dan servis teknis di seluruh cabang dan site operasional tambang PT Chitra Paratama:")
    add_p("• Single Source of Truth Kepegawaian: Menstandarisasi master data karyawan ke dalam satu tabel terpusat (hero_employees), mengeliminasi fragmentasi data antar-cabang, dan menghubungkan identitas karyawan ke akun login, departemen, seksi kerja, dan hak akses.")
    add_p("• Kepatuhan K3 & Mitigasi Risiko Tambang: Pelaporan cepat temuan kondisi bahaya (KTA/TTA) di pit tambang melalui modul EVHS, matriks risiko standar, audit 5R berkala, dan inspeksi ban unit hauling secara presisi.")
    add_p("• Akuntabilitas Jam Kerja & Presensi Biometrik: Memastikan pencatatan kehadiran karyawan akurat berbasis GPS Geofencing radius site resmi dan verifikasi biometrik pengenalan wajah anti titip-absen, didukung pelaporan aktivitas mandiri (My Day).")
    add_p("• Transparansi Perbaikan Ban (WO-24): Digitalisasi surat perintah kerja perbaikan ban alat berat di workshop Central Service dari penerimaan awal, penugasan teknisi, inspeksi QC, hingga penerbitan Surat Jalan pengiriman.")
    add_p("• Engine Persetujuan Terpadu Multi-Tier: Otomatisasi persetujuan dokumen transaksi perusahaan (lembur, izin kerja, evaluasi kontrak, perbaikan ban) dengan alur hierarki atasan dinamis.")
    add_p("• Layanan Pelanggan Eksternal (MAESTRO): Memberikan akses transparan bagi pelanggan tambang untuk memantau status ban servis dan histori inspeksi tanpa membuka data internal perusahaan.")

    # ==========================================
    # 3. PROJECT SCOPE
    # ==========================================
    format_heading("3. Project Scope & Architecture", level=1)
    add_p("Ruang lingkup sistem mencakup 10 domain modul utama:")
    add_p("1. Human Capital (HC) & Organization: Master Karyawan SSoT, Review Kontrak PKWT (30/60/90 hari), Onboarding/Offboarding, Struktur Organisasi, E-Filing, dan MCU Wellness.")
    add_p("2. Health, Safety & Environment (HSE / EVHS): Laporan Bahaya & Insiden EVHS, Investigasi 5-Why, Matriks Risiko, Inspeksi Ban Tambang (PSI/Tread Depth), Audit 5R/5S, Izin Kerja Berbahaya (PTW), dan JSA.")
    add_p("3. Central Service & Workshop Operations: Surat Perintah Kerja WO-24, Inspeksi Penerimaan Ban, Master Barang Repair, Kanban WIP Repair, Pattern Designer, dan Manajemen Suku Cadang Gudang Repair.")
    add_p("4. Attendance, Geofencing & Biometrics: Presensi Datang/Pulang via GPS Haversine, Face Verification Biometrik (UU PDP Compliant), Kalender Shift/Roster, Rekap Kehadiran, dan Live Map Monitor.")
    add_p("5. Activity Hub (Employee Productivity): Laporan Aktivitas Harian (My Day), Papan Supervisi Tim (Team Board), Sesi Kerja Lapangan, dan Approval Jam Produktif.")
    add_p("6. Logistics, Deliveries & Fleet: Surat Jalan Resmi (DO) standar A4, Pelacakan Pengiriman Kargo Ban, Manifest Muatan, dan Penugasan Pengemudi/Armada.")
    add_p("7. Universal Approval Engine: Inbox Persetujuan Terpadu (/dashboard/approval), Dynamic Multi-Tier Approver Resolution, Dokumen Pratinjau Modal (max-w-5xl), dan Audit Trail Approval.")
    add_p("8. ChitraLearning LMS: Pelatihan Daring Korporat, Manajemen Kursus & Modul, Ujian Sertifikasi Kontrak, Quiz Builder, dan Leaderboard Prestasi.")
    add_p("9. MAESTRO B2B Customer Portal: Portal Layanan Pelanggan Tambang (maestro.chitraparatama.com), Pelacakan Tiket Servis Ban, Pemantauan Scrap Tire, dan Read-Only Scoped Data Access.")
    add_p("10. System, Security & DevOps: Manajemen Role & Permission RBAC (resource:action), S3 Proxy Serving, Persistent Dokploy Mounts, Audit Logging, dan Troubleshooting Runbook.")

    # ==========================================
    # 4. SOLUTION DESIGN & DATA ARCHITECTURE
    # ==========================================
    format_heading("4. Solution Design & Data Architecture", level=1)
    
    format_heading("4.1. Master Data / Configuration Data", level=2)
    add_p("Data konfigurasi dasar yang menjadi acuan seluruh transaksi di HERO:")
    add_p("• Employees Master (SSoT): NRP/SN karyawan, nama lengkap, penempatan site tambang, departemen, seksi kerja, jabatan resmi, status kepegawaian (Permanent, PKWT, Prob), tanggal masa berlaku kontrak, dan relasi atasan langsung (reports_to_employee_id).")
    add_p("• Organization & Sites: Master cabang site tambang (Balikpapan, Sangatta, Satui, Lahat, dll), koordinat latitude/longitude gerbang site, radius toleransi GPS meter, master departemen, dan master seksi kerja.")
    add_p("• HSE & Safety Standards: Master parameter bahaya EVHS, matriks konsekuensi & probabilitas risiko K3, checklist standar 5R, dan master katalog Alat Pelindung Diri (APD).")
    add_p("• Workshop Master: Katalog pola kembangan ban (pattern), spesifikasi ukuran ban tambang, master part repair, dan kriteria inspeksi QC.")
    add_p("• Security & Roles: Master peran (Super Admin, Site Manager, Section Head, Technician, dll), master daftar menu, dan matriks perizinan berbutir halus.")

    format_heading("4.2. Transactional Data", level=2)
    add_p("Data transaksi dinamis yang dihasilkan dari aktivitas operasional harian:")
    add_p("• Attendance & Biometric Records: Waktu log clock-in/out, koordinat GPS aktual, jarak Haversine ke titik site, status verifikasi biometrik wajah, kemiripan deskriptor, dan foto verifikasi.")
    add_p("• Activity Hub Records: Sesi kerja karyawan, log timeline aktivitas per jam, durasi efektif, foto bukti dokumentasi pekerjaan lapangan, dan status approval atasan.")
    add_p("• EVHS Reports & Investigations: Tiket laporan bahaya, foto KTA/TTA, skor tingkat keparahan risiko, tindakan perbaikan langsung, serta hasil analisis akar masalah 5-Why.")
    add_p("• Central Service WO-24: Nomor urut WO-24, nomor seri fisik ban, riwayat penanganan vulkanisir, tanda tangan digital teknisi & QC, serta status kelolosan inspeksi.")
    add_p("• Approval Transactions: Instance permohonan persetujuan dokumen, riwayat keputusan approver per hierarki tingkatan, stempel waktu, dan catatan alasan persetujuan/penolakan.")

    format_heading("4.3. ERD & Kamus Basis Data (Tabel-tabel SSoT & Operasional)", level=2)
    
    add_p("1. Kepegawaian & Single Source of Truth (SSoT)", bold=True)
    table_ssot = doc.add_table(rows=7, cols=4)
    ssot_data = [
        ("Table Name", "Primary Key", "Description", "Key Relations"),
        ("hero_employees", "id (uuid)", "Single Source of Truth data kepegawaian: NRP/SN, nama, site, departemen, seksi, jabatan, masa kontrak.", "Many-to-One -> hero_sites, hero_master_departments, hero_master_sections; One-to-One -> user"),
        ("hero_sites", "id (uuid)", "Master kantor cabang dan site tambang lengkap dengan koordinat geofencing latitude/longitude.", "One-to-Many -> hero_employees, attendance"),
        ("hero_master_departments", "id (uuid)", "Master departemen korporat (HC, HSE, Operations, Finance, IT).", "One-to-Many -> hero_employees, hero_master_sections"),
        ("hero_master_sections", "id (uuid)", "Master seksi kerja fungsional di bawah departemen.", "Many-to-One -> hero_master_departments; One-to-Many -> hero_employees"),
        ("hero_master_positions", "id (uuid)", "Katalog jabatan struktural dan fungsional di PT Chitra Paratama.", "One-to-Many -> hero_employees"),
        ("hero_hr_contract_reviews", "id (uuid)", "Rekaman peninjauan masa berlaku kontrak PKWT, evaluasi kinerja, dan surat rekomendasi.", "Many-to-One -> hero_employees"),
    ]
    for r_idx, (c0, c1, c2, c3) in enumerate(ssot_data):
        row = table_ssot.rows[r_idx]
        row.cells[0].paragraphs[0].text = c0
        row.cells[1].paragraphs[0].text = c1
        row.cells[2].paragraphs[0].text = c2
        row.cells[3].paragraphs[0].text = c3
    style_table(table_ssot, header_bg="0F172A", compact=True)

    add_p("2. Keamanan, Autentikasi & RBAC", bold=True)
    table_sec = doc.add_table(rows=6, cols=4)
    sec_data = [
        ("Table Name", "Primary Key", "Description", "Key Relations"),
        ("user", "id (text/uuid)", "Data akun login Better Auth, email, kredensial password terenkripsi, status aktif.", "One-to-One -> hero_employees; One-to-Many -> session"),
        ("session", "id (text/uuid)", "Sesi cookie aktif pengguna, token otentikasi, IP address, user agent, waktu kedaluwarsa.", "Many-to-One -> user"),
        ("hero_security_roles", "id (uuid)", "Daftar master peran dalam sistem (Super Admin, Dept Head, Section Head, Staff).", "One-to-Many -> hero_role_menu_permissions"),
        ("hero_role_menu_permissions", "id (uuid)", "Matriks hak akses berbutir halus format resource:action (view, create, edit, delete).", "Many-to-One -> hero_security_roles"),
        ("audit_logs", "id (uuid)", "Jejak audit permanen mencatat mutasi data (CREATE, UPDATE, DELETE) dengan data sebelum & sesudah.", "Many-to-One -> user"),
    ]
    for r_idx, (c0, c1, c2, c3) in enumerate(sec_data):
        row = table_sec.rows[r_idx]
        row.cells[0].paragraphs[0].text = c0
        row.cells[1].paragraphs[0].text = c1
        row.cells[2].paragraphs[0].text = c2
        row.cells[3].paragraphs[0].text = c3
    style_table(table_sec, header_bg="0F172A", compact=True)

    add_p("3. Presensi, Biometrik & Operasional Lapangan", bold=True)
    table_ops = doc.add_table(rows=7, cols=4)
    ops_data = [
        ("Table Name", "Primary Key", "Description", "Key Relations"),
        ("attendance", "id (uuid)", "Transaksi presensi clock-in/out, koordinat GPS, jarak radius Haversine, dan foto verifikasi.", "Many-to-One -> hero_employees, hero_sites"),
        ("hero_biometric_descriptors", "id (uuid)", "Vektor deskriptor wajah 128 dimensi terenkripsi untuk pencocokan wajah anti-spoofing (UU PDP).", "Many-to-One -> hero_employees"),
        ("hero_daily_activities", "id (uuid)", "Laporan aktivitas harian mandiri (My Day), deskripsi pekerjaan, durasi jam kerja, foto bukti.", "Many-to-One -> hero_employees, hero_approval_workflows"),
        ("hero_evhs_reports", "id (uuid)", "Laporan insiden bahaya KTA/TTA, klasifikasi risiko, foto bukti lapangan, status perbaikan.", "Many-to-One -> hero_employees, hero_sites"),
        ("hero_form_wo", "id (uuid)", "Surat Perintah Kerja WO-24 perbaikan ban vulkanisir, data serial number, teknisi, QC.", "Many-to-One -> hero_customers, hero_approval_workflows"),
        ("hero_approval_workflows", "id (uuid)", "Definisi alur persetujuan dokumen, batas nilai wewenang, dan urutan hierarki approver.", "One-to-Many -> hero_approval_steps"),
    ]
    for r_idx, (c0, c1, c2, c3) in enumerate(ops_data):
        row = table_ops.rows[r_idx]
        row.cells[0].paragraphs[0].text = c0
        row.cells[1].paragraphs[0].text = c1
        row.cells[2].paragraphs[0].text = c2
        row.cells[3].paragraphs[0].text = c3
    style_table(table_ops, header_bg="0F172A", compact=True)

    # ==========================================
    # 5. SYSTEM PROCESSES & WORKFLOWS
    # ==========================================
    doc.add_page_break()
    format_heading("5. System Processes & Workflows", level=1)

    format_heading("HC: Alur Siklus Karyawan & Review Kontrak PKWT", level=2)
    add_p("Proses otomatisasi pemantauan masa berlaku kontrak kerja PKWT karyawan guna mencegah pelanggaran regulasi ketenagakerjaan:")
    table_wf_hc = doc.add_table(rows=5, cols=4)
    hc_wf_data = [
        ("Step", "Actor", "Action Description", "Expected Output"),
        ("Step 1", "Background Job / System", "Memindai contract_duration_end pada hero_employees setiap hari dan mendeteksi kontrak jatuh tempo 30, 60, 90 hari.", "Notifikasi peringatan dini & badge status pada menu Review Kontrak"),
        ("Step 2", "Section Head / Atasan", "Mengisi formulir evaluasi kinerja kompetensi dan kedisiplinan karyawan di menu Review Kontrak Form.", "Rekomendasi perpanjangan kontrak atau selesai masa kerja"),
        ("Step 3", "Dept Head / HC Manager", "Meninjau hasil evaluasi dan rekomendasi via Approval Inbox untuk menyetujui usulan perpanjangan.", "Dokumen review berstatus 'APPROVED'"),
        ("Step 4", "HC Officer", "Menerbitkan Surat PKWT perpanjangan baru atau surat penyelesaian masa kontrak resmi standar A4.", "Draf surat perpanjangan tercetak & masa berlaku terupdate di SSoT"),
    ]
    for r_idx, (c0, c1, c2, c3) in enumerate(hc_wf_data):
        row = table_wf_hc.rows[r_idx]
        row.cells[0].paragraphs[0].text = c0
        row.cells[1].paragraphs[0].text = c1
        row.cells[2].paragraphs[0].text = c2
        row.cells[3].paragraphs[0].text = c3
    style_table(table_wf_hc, header_bg="0F172A", compact=True)

    format_heading("HSE: Alur Pelaporan Bahaya & Investigasi EVHS", level=2)
    add_p("Siklus penanganan temuan bahaya keselamatan di lapangan dari pelaporan awal hingga tindakan perbaikan:")
    table_wf_hse = doc.add_table(rows=5, cols=4)
    hse_wf_data = [
        ("Step", "Actor", "Action Description", "Expected Output"),
        ("Step 1", "Karyawan / Pengawas", "Menemukan Kondisi/Tindakan Tidak Aman (KTA/TTA), mengambil foto via kamera mobile, dan mengisi form EVHS.", "Tiket laporan bahaya baru berstatus 'SUBMITTED'"),
        ("Step 2", "Safety Officer (HSE)", "Memvalidasi laporan, menentukan klasifikasi risiko via Risk Matrix, dan menugaskan PIC perbaikan.", "Penetapan PIC dan target waktu penyelesaian (SLA)"),
        ("Step 3", "Penanggung Jawab (PIC)", "Melakukan tindakan perbaikan fisik di lapangan dan mengunggah foto bukti perbaikan ke sistem.", "Status laporan berubah menjadi 'RESOLVED'"),
        ("Step 4", "HSE Supervisor / Lead", "Memverifikasi hasil perbaikan di lapangan dan melakukan analisis akar masalah 5-Why jika insiden berulang.", "Tiket berstatus 'CLOSED' dan tercatat di statistik safety"),
    ]
    for r_idx, (c0, c1, c2, c3) in enumerate(hse_wf_data):
        row = table_wf_hse.rows[r_idx]
        row.cells[0].paragraphs[0].text = c0
        row.cells[1].paragraphs[0].text = c1
        row.cells[2].paragraphs[0].text = c2
        row.cells[3].paragraphs[0].text = c3
    style_table(table_wf_hse, header_bg="0F172A", compact=True)

    format_heading("Central Service: Alur Servis WO-24 & Reparasi Ban Tambang", level=2)
    add_p("Siklus penerimaan ban alat berat di workshop Central Service hingga selesai rekondisi dan dikirim kembali:")
    table_wf_cs = doc.add_table(rows=6, cols=4)
    cs_wf_data = [
        ("Step", "Actor", "Action Description", "Expected Output"),
        ("Step 1", "Receiver Workshop", "Menerima fisik ban dari site pelanggan, mencatat nomor seri ban, dan melakukan inspeksi awal.", "Lembar Inspeksi Penerimaan Ban & Draf Form WO-24"),
        ("Step 2", "Workshop Supervisor", "Menentukan metode rekondisi (vulkanisir dingin/panas), alokasi teknisi, dan estimasi waktu kerja.", "Surat Perintah Kerja WO-24 resmi berstatus 'IN_PROGRESS'"),
        ("Step 3", "Teknisi Rekondisi", "Melaksanakan perbaikan fisik ban (buffing, skiving, curing) dan update progres di Kanban WIP Repair.", "Ban selesai dikerjakan siap masuk ruang uji QC"),
        ("Step 4", "Quality Control (QC)", "Memeriksa ketebalan tapak, shearography, dan membubuhkan tanda tangan digital QC pada WO-24.", "Status WO-24 'QC_PASSED', sertifikat garansi terbit"),
        ("Step 5", "Logistics Dispatcher", "Menerbitkan Surat Jalan (DO) resmi dan mengirimkan ban kembali ke site tambang pelanggan.", "Status 'DELIVERED', histori tercatat di nomor seri ban"),
    ]
    for r_idx, (c0, c1, c2, c3) in enumerate(cs_wf_data):
        row = table_wf_cs.rows[r_idx]
        row.cells[0].paragraphs[0].text = c0
        row.cells[1].paragraphs[0].text = c1
        row.cells[2].paragraphs[0].text = c2
        row.cells[3].paragraphs[0].text = c3
    style_table(table_wf_cs, header_bg="0F172A", compact=True)

    format_heading("Kehadiran: Alur Presensi Geofencing & Biometrik Wajah", level=2)
    add_p("Validasi kehadiran datang dan pulang kerja mandiri berbasis GPS radius site dan verifikasi wajah:")
    table_wf_att = doc.add_table(rows=5, cols=4)
    att_wf_data = [
        ("Step", "Actor", "Action Description", "Expected Output"),
        ("Step 1", "Karyawan di Lapangan", "Membuka menu Attendance di smartphone dan menyetujui aktivasi GPS dan sensor kamera biometrik.", "Posisi koordinat latitude/longitude dan feed kamera aktif"),
        ("Step 2", "Sistem (Haversine Engine)", "Menghitung jarak horizontal antara posisi perangkat karyawan dengan titik koordinat resmi site (hero_sites).", "Validasi radius (Lolos jika jarak <= radius site)"),
        ("Step 3", "Face-API AI Runtime", "Mengekstrak deskriptor wajah karyawan secara lokal di browser dan mencocokkan dengan template terdaftar.", "Skor kemiripan (Lolos jika confidence score >= 0.6)"),
        ("Step 4", "Server Action Presensi", "Menyimpan transaksi kehadiran ke tabel attendance, upload foto bukti ke S3 proxy, update rekap bulanan.", "Jam masuk tercatat sah 'PRESENT', kartu presensi terupdate"),
    ]
    for r_idx, (c0, c1, c2, c3) in enumerate(att_wf_data):
        row = table_wf_att.rows[r_idx]
        row.cells[0].paragraphs[0].text = c0
        row.cells[1].paragraphs[0].text = c1
        row.cells[2].paragraphs[0].text = c2
        row.cells[3].paragraphs[0].text = c3
    style_table(table_wf_att, header_bg="0F172A", compact=True)

    # ==========================================
    # 6. INTEGRATION SYSTEM
    # ==========================================
    format_heading("6. Integration System", level=1)
    add_p("6.1. S3 Private Storage & Upload Proxy Engine: Seluruh berkas diunggah ke private bucket S3 CloudHost dan disajikan secara aman via reverse proxy /api/uploads/[...path]. Seluruh komponen UI wajib membungkus tautan gambar/dokumen dengan resolveUploadUrl() untuk mencegah error 403 Forbidden dan URL presigned kedaluwarsa.")
    add_p("6.2. Face-API Biometrics & TensorFlow.js Runtime: Engine verifikasi biometrik wajah beroperasi di sisi klien (client-side) menggunakan @vladmandic/face-api. Model deteksi disimpan lokal di public/models/ dan menghasilkan deskriptor 128 dimensi terenkripsi.")
    add_p("6.3. SAP Assets & ERP Integration Bridge: Terhubung berkala ke SAP korporat untuk menyelaraskan master aset armada tambang dan pemetaan nomor Storage Location (SLoc) gudang repair ban.")
    add_p("6.4. Email SMTP & Notification Delivery: Dikelola via /dashboard/settings/email untuk pengiriman notifikasi approval, reminder SLA evaluasi kontrak, dan notifikasi darurat insiden HSE.")

    # ==========================================
    # 7. BUSINESS USERS AND SECURITY
    # ==========================================
    format_heading("7. Business Users and Security", level=1)
    add_p("7.1. Role-Based Access Control (RBAC) Matrix & Data Scoping: Otorisasi format resource:action (view, create, edit, delete). Data scoping membatasi visibilitas transaksi menjadi 'own' (data pribadi), 'site' (seluruh data di site yang sama), atau 'global' (seluruh perusahaan).")
    add_p("7.2. Session Management & Data Protection: Better-Auth dengan cookie HttpOnly, Secure, SameSite=Lax. Password di-hash dengan bcrypt/Argon2. Perlindungan SQL Injection bawaan Drizzle ORM parameterized statements dan validasi skema Zod.")
    add_p("7.3. Centralized Upload Rule: Seluruh file upload wajib memakai uploadFile(formData) dari app/actions/upload.ts. Nama file otomatis diganti UUID v4 acak untuk mencegah path traversal.")
    add_p("7.4. Kepatuhan UU PDP Biometrik Wajah: Memenuhi UU PDP No. 27 Tahun 2022 melalui 4 pilar: Persetujuan Eksplisit (Informed Consent), Enkripsi Deskriptor Vektor (tanpa simpan citra mentah), Audit Trail Akses, dan Hak Hapus Data Mandiri.")

    # ==========================================
    # 8. DEVOPS & ERROR HANDLING RUNBOOK
    # ==========================================
    doc.add_page_break()
    format_heading("8. Planning Development, DevOps & Error Handling Runbook", level=1)
    add_p("8.1. Platform Deployment Dokploy: Multi-stage Dockerfile standalone Next.js dengan Persistent Bind Mount: /mnt/data/one-chitra/uploads <-> /app/public/uploads.")
    
    format_heading("8.2. Kamus Variabel Lingkungan (.env)", level=2)
    env_table = doc.add_table(rows=7, cols=4)
    env_data = [
        ("Variable Name", "Requirement", "Description", "Example Value"),
        ("DATABASE_URL", "Wajib", "URL koneksi PostgreSQL lengkap ke database HERO.", "postgresql://postgres:pass@localhost:5432/hero_db?sslmode=prefer"),
        ("BETTER_AUTH_SECRET", "Wajib", "Kunci enkripsi rahasia 32+ karakter tanda tangan token sesi.", "a8f9c1e74b28d4e92a83c74921b38f90c8e21a47d6e5c9b2"),
        ("BETTER_AUTH_URL", "Wajib", "Alamat URL domain publik aplikasi HERO.", "https://hero.chitraparatama.com"),
        ("S3_ENDPOINT", "Wajib", "Endpoint Object Storage IS3 CloudHost.", "https://is3.cloudhost.id"),
        ("S3_BUCKET", "Wajib", "Nama bucket penyimpanan pribadi S3.", "onechitra"),
        ("NODE_ENV", "Wajib", "Lingkungan eksekusi aplikasi (production / development).", "production"),
    ]
    for r_idx, (c0, c1, c2, c3) in enumerate(env_data):
        row = env_table.rows[r_idx]
        row.cells[0].paragraphs[0].text = c0
        row.cells[1].paragraphs[0].text = c1
        row.cells[2].paragraphs[0].text = c2
        row.cells[3].paragraphs[0].text = c3
    style_table(env_table, header_bg="0F172A", compact=True)

    format_heading("8.3. Perintah CLI Database & Pemeliharaan", level=2)
    cli_table = doc.add_table(rows=6, cols=2)
    cli_data = [
        ("Command Script", "Purpose & Execution"),
        ("npm run db:push", "Sinkronisasi langsung skema TypeScript di db/schema/ ke PostgreSQL target."),
        ("npm run db:generate", "Menghasilkan berkas migrasi SQL baru di direktori drizzle/ sebelum rilis ke production."),
        ("npm run db:migrate", "Mengeksekusi berkas migrasi SQL tertunda pada database production."),
        ("npm run test:e2e", "Menjalankan seluruh rangkaian tes otomatis browser (E2E) dengan kredensial baku 71261."),
        ("npm run check-types", "Memvalidasi integritas tipe data TypeScript pada seluruh proyek sebelum commit."),
    ]
    for r_idx, (c0, c1) in enumerate(cli_data):
        row = cli_table.rows[r_idx]
        row.cells[0].paragraphs[0].text = c0
        row.cells[1].paragraphs[0].text = c1
    style_table(cli_table, header_bg="0F172A")

    format_heading("8.4. Standalone Comprehensive Error Handling & Troubleshooting Runbook", level=2)
    add_p("Matriks Penanganan Insiden Kritis di Seluruh Lapisan HERO:")
    
    eh_matrix_table = doc.add_table(rows=7, cols=3)
    eh_matrix_data = [
        ("Lapisan Sistem", "Gejala & Akar Masalah Insiden", "Solusi Kode & Tindakan Cepat"),
        ("S3 Private Storage", "HTTP 403 Forbidden / Broken Image (Akses URL S3 langsung)", "Bungkus URL dengan resolveUploadUrl(url) & daftarkan prefix di ALLOWED_UPLOAD_PREFIXES."),
        ("S3 Token Expired", "Tautan berkas rusak setelah 60 menit (Presigned token tersimpan di DB)", "Database HANYA boleh menyimpan path relatif /api/uploads/${key} tanpa token tanda tangan."),
        ("Database Drizzle", "PostgresError: column 'xyz' does not exist (Skema desync)", "Jalankan npm run db:push lalu restart dev server / container Docker untuk membersihkan metadata cache."),
        ("Database Connection", "too many clients already (Connection pool habis saat jam sibuk)", "Gunakan globalThis.postgresPool singleton di db/index.ts dengan max connection pool = 20."),
        ("Keamanan RBAC", "Redirect loop / 403 Forbidden pada rute sah karyawan", "Masuk sebagai Super Admin ke /dashboard/security lalu klik tombol 'Sync Permissions'."),
        ("Dokploy Volume", "File upload hilang pasca container reboot / redeploy", "Pastikan Host Bind Mount /mnt/data/one-chitra/uploads <-> /app/public/uploads aktif di Dokploy."),
    ]
    for r_idx, (c0, c1, c2) in enumerate(eh_matrix_data):
        row = eh_matrix_table.rows[r_idx]
        row.cells[0].paragraphs[0].text = c0
        row.cells[1].paragraphs[0].text = c1
        row.cells[2].paragraphs[0].text = c2
    style_table(eh_matrix_table, header_bg="1E3A8A", compact=True)

    # ==========================================
    # 9. COMPLETE MODULE & PAGE DIRECTORY
    # ==========================================
    doc.add_page_break()
    format_heading("9. Complete Module & Page Directory (All HERO Pages Detailed Specifications)", level=1)
    add_p("Berikut adalah lembar spesifikasi teknis lengkap dari rute-rute halaman utama di dalam sistem HERO Enterprise:")

    pages_specs = [
        ("1. Executive Dashboard (/dashboard)", "Main & Portal | Resource: dashboard", "app/dashboard/page.tsx | Action: app/actions/dashboard.ts", "All Logged-in Users (Scoped by Site & Role)",
         "Menyajikan ringkasan eksekutif secara real-time mengenai produktivitas karyawan hari ini, status keselamatan (EVHS zero-accident), progres WO workshop, kehadiran tim, dan pintasan aksi cepat operasional.",
         "Tabel attendance, hero_daily_activities, hero_evhs_reports, hero_form_wo, hero_employees",
         "Scorecard KPI performa cerah (HeroKpiCard), grafik tren jam kerja produktif, widget status presensi hari ini, daftar notifikasi persetujuan tertunda, tombol pintas navigasi cepat."),

        ("2. Master Data Karyawan (SSoT) (/dashboard/hc/employee)", "Human Capital (HC) | Resource: hc-employees", "app/dashboard/hc/employee/page.tsx | Action: app/actions/employee.ts", "Super Admin, HC Manager, HC Site Officer",
         "Menjadi Single Source of Truth (SSoT) seluruh data kepegawaian perusahaan: NRP/SN, nama, penempatan site, departemen, seksi kerja, jabatan resmi, status PKWT/Permanen, dan tanggal kontrak.",
         "Tabel hero_employees, hero_master_departments, hero_master_sections, hero_sites, hero_master_positions, user",
         "Tabel tervirtualisasi HeroDataTable, filter multi-select site tambang dan departemen, dialog modal Create/Edit HeroFormDialog, import CSV data karyawan, export Excel .xlsx, tombol reset kredensial login."),

        ("3. Detail Profil Karyawan (/dashboard/hc/employee/[id])", "Human Capital (HC) | Resource: hc-employees", "app/dashboard/hc/employee/[id]/page.tsx | Action: app/actions/employee.ts", "Super Admin, HC Staff, Atasan Langsung, Karyawan Bersangkutan",
         "Menampilkan profil 360 derajat karyawan secara mendalam: riwayat penempatan site, histori perpanjangan kontrak, rekap absensi, sertifikasi keahlian, dan dokumen arsip digital (E-Filing).",
         "Tabel hero_employees, hero_hr_contract_reviews, attendance, hero_biometric_descriptors",
         "Dokumen pratinjau resmi HeroDetailModal, badge status hubungan kerja, tombol shortcut edit data, tabulasi riwayat kontrak, kartu identitas karyawan digital."),

        ("4. Review Kontrak PKWT Karyawan (/dashboard/hc/contract-review)", "Human Capital (HC) | Resource: contract-review", "app/dashboard/hc/contract-review/page.tsx | Action: app/actions/contract-review.ts", "Super Admin, HC Corporate, Site Manager, Section Head",
         "Sistem peringatan dini (early warning system) masa berlaku kontrak kerja PKWT yang jatuh tempo dalam 30, 60, dan 90 hari guna menjamin kepatuhan regulasi ketenagakerjaan.",
         "Tabel hero_employees, hero_hr_contract_reviews, hero_sites",
         "Filter cepat status jatuh tempo (30/60/90 hari), badge sisa hari masa kontrak, shortcut formulir evaluasi kinerja, penerbitan draf surat perpanjangan PKWT, ekspor rekap Excel."),

        ("5. Formulir Evaluasi Review Kontrak (/dashboard/hc/contract-review/form/[id])", "Human Capital (HC) | Resource: contract-review", "app/dashboard/hc/contract-review/form/[id]/page.tsx | Action: app/actions/contract-review.ts", "Section Head, Dept Head, HC Manager",
         "Tempat atasan mengisi penilaian kinerja kompetensi teknis, kedisiplinan, dan kepatuhan safety karyawan untuk menentukan rekomendasi perpanjangan kontrak.",
         "Tabel hero_hr_contract_reviews, hero_employees, hero_approval_workflows",
         "Form penilaian kompetensi bertingkat, kalkulasi otomatis skor evaluasi akhir, unggah lampiran pendukung via S3 proxy, integrasi pengajuan persetujuan ke Dept Head."),

        ("6. Master Struktur Organisasi & Site (/dashboard/master-data)", "System & Master Data | Resource: master-data", "app/dashboard/master-data/page.tsx | Action: app/actions/master-data.ts", "Super Admin, HC Corporate",
         "Mengelola entitas dasar organisasi perusahaan: master cabang site tambang operasional, koordinat geofencing, radius toleransi GPS meter, departemen, dan seksi kerja.",
         "Tabel hero_sites, hero_master_departments, hero_master_sections, hero_master_positions",
         "Peta hierarki organisasi (Tree View), peta picker koordinat latitude/longitude site, dialog modal Create/Edit HeroFormDialog, ekspor data master ke Excel."),

        ("7. Presensi Geofencing & Biometrik Wajah (/dashboard/attendance)", "Attendance & Operations | Resource: attendance", "app/dashboard/attendance/page.tsx | Action: app/actions/attendance.ts", "All Logged-in Employees",
         "Pencatatan kehadiran datang dan pulang kerja mandiri tervalidasi radius lokasi GPS site resmi dan verifikasi biometrik pengenalan wajah anti titip-absen.",
         "Tabel attendance, hero_sites, hero_biometric_descriptors, hero_employees",
         "Kalkulasi jarak Haversine real-time, kamera verifikasi biometrik wajah face-api.js, deteksi liveness anti spoofing, rekaman waktu clock-in/out akurat, kartu status kehadiran hari ini."),

        ("8. Peta Presensi GPS & Face Live Map (/dashboard/attendance/live-map)", "Attendance & Operations | Resource: attendance-live-map", "app/dashboard/attendance/live-map/page.tsx | Action: app/actions/attendance.ts", "Super Admin, Site Manager, Section Head",
         "Monitoring visual posisi sebaran presensi karyawan di lapangan tambang pada peta digital secara real-time untuk mendeteksi kecurangan lokasi.",
         "Tabel attendance, hero_sites, hero_employees",
         "Peta interaktif Leaflet/Mapbox, cluster pin marker karyawan per site tambang, lingkaran geofence radius site resmi, popup detail foto dan jam clock-in."),

        ("9. Laporan Aktivitas Harian Saya (My Day) (/dashboard/activity-hub/my-day)", "Activity Hub | Resource: activity-hub", "app/dashboard/activity-hub/my-day/page.tsx | Action: app/actions/daily-activity.ts", "All Logged-in Employees",
         "Pencatatan laporan aktivitas kerja harian mandiri oleh karyawan: mendokumentasikan pekerjaan per jam, durasi efektif, dan foto bukti lapangan sebelum diajukan ke atasan.",
         "Tabel hero_daily_activities, hero_daily_activity_sessions, hero_employees",
         "Timer sesi interaktif, timeline aktivitas harian terstruktur, upload foto dokumentasi lapangan via S3 proxy, kalkulasi jam kerja efektif, tombol submit ke atasan."),

        ("10. Papan Pantau Tim (Team Board) (/dashboard/activity-hub/team-board)", "Activity Hub | Resource: team-board", "app/dashboard/activity-hub/team-board/page.tsx | Action: app/actions/daily-activity.ts", "Section Head, Dept Head, Site Manager",
         "Dashboard supervisi atasan untuk memantau progres aktivitas kerja harian seluruh anggota tim dalam satu seksi/site, melihat siapa yang belum submit, dan menyetujui laporan tim.",
         "Tabel hero_daily_activities, hero_employees, hero_master_sections",
         "Filter tim per seksi kerja dan site, timeline progres pekerjaan anggota tim, indikator belum submit laporan, modal pratinjau foto bukti kerja, ekspor rekap harian ke Excel."),

        ("11. Pengajuan & Rekap Lembur (SPL) (/dashboard/overtime-requests)", "Attendance & Operations | Resource: overtime-requests", "app/dashboard/overtime-requests/page.tsx | Action: app/actions/overtime.ts", "All Logged-in Employees & Supervisors",
         "Pengelolaan pengajuan Surat Perintah Lembur (SPL) karyawan sebelum/sesudah pekerjaan, kalkulasi otomatis upah lembur regulasi Depnaker, dan integrasi persetujuan atasan.",
         "Tabel hero_overtime_requests, hero_employees, hero_approval_workflows",
         "Formulir pengajuan jam lembur, kalkulator otomatis upah lembur, alur persetujuan bertingkat Section Head & Dept Head, cetak form SPL standar A4, ekspor ke payroll."),

        ("12. Inbox Persetujuan Terpadu (/dashboard/approval)", "Approval Engine | Resource: approvals", "app/dashboard/approval/page.tsx | Action: app/actions/approval.ts", "Section Head, Dept Head, Site Manager, Division Head",
         "Pintu gerbang persetujuan satu atap untuk seluruh dokumen transaksi perusahaan (Lembur, RFR, Form WO-24, Evaluasi Kontrak, Audit 5R) tanpa berpindah modul.",
         "Tabel hero_approval_workflows, hero_approval_steps, hero_approval_logs, hero_employees",
         "Filter jenis dokumen transaksi, tombol cepat Approve & Reject berikon, dialog alasan penolakan, Official Document Preview Modal (sm:max-w-5xl), jejak hierarki approver."),

        ("13. Pelaporan Bahaya & Insiden EVHS (/dashboard/hse/evhs)", "HSE & Keselamatan Kerja | Resource: evhs", "app/dashboard/hse/evhs/page.tsx | Action: app/actions/evhs.ts", "All Employees & HSE Officers",
         "Pelaporan cepat temuan Kondisi Tidak Aman (KTA) atau Tindakan Tidak Aman (TTA) di lingkungan kerja pit tambang dan workshop untuk mewujudkan target zero accident.",
         "Tabel hero_evhs_reports, hero_employees, hero_sites",
         "Form pelaporan bahaya dengan upload foto bukti, Risk Matrix interaktif (Likelihood x Consequence), penetapan PIC perbaikan, investigasi 5-Why, notifikasi email darurat."),

        ("14. Audit & Penilaian 5R / 5S (/dashboard/quality/5r)", "Quality & HSE | Resource: five-r", "app/dashboard/quality/5r/page.tsx | Action: app/actions/five-r.ts", "HSE Officer, Quality Auditor, Workshop Lead",
         "Pelaksanaan audit berkala kepatuhan budaya kerja Ringkas, Rapi, Resik, Rawat, Rajin di workshop servis, gudang logistik, dan area kantor.",
         "Tabel hero_five_r_assessments, hero_sites, hero_employees",
         "Checklist penilaian kriteria 5R, kalkulasi scoring persentase otomatis, dokumentasi foto temuan audit, penerbitan laporan hasil audit PDF resmi standar A4."),

        ("15. Inspeksi Ban di Pit Tambang (/dashboard/hse/tire-inspection)", "HSE & Operations | Resource: tire-inspection", "app/dashboard/hse/tire-inspection/page.tsx | Action: app/actions/tire-inspection.ts", "Tire Inspector, HSE Officer, Site Engineer",
         "Pemeriksaan teknis lapangan ban unit hauling di area tambang: mengukur tekanan angin (PSI), temperatur ban, ketebalan tapak R1-R4, dan deteksi keretakan dini.",
         "Tabel hero_tire_inspections, hero_fleet, hero_customers",
         "Input multi-titik tapak ban (R1-R4), foto kerusakan fisik ban pit, rekomendasi teknis otomatis (lanjut pakai / rekondisi / scrap), ekspor laporan inspeksi PDF."),

        ("16. Surat Perintah Kerja WO-24 Servis Ban (/dashboard/repair-retread/form-wo)", "Central Service & Repair | Resource: service-form", "app/dashboard/repair-retread/form-wo/page.tsx | Action: app/actions/wo.ts", "Workshop Receiver, Technician, QC Inspector",
         "Dokumen operasional utama perbaikan ban vulkanisir di workshop Central Service dari penerimaan awal, penugasan teknisi, inspeksi kelolosan QC, hingga siap kirim.",
         "Tabel hero_form_wo, hero_customers, hero_approval_workflows",
         "Pencatatan serial number unik ban, alokasi teknisi rekondisi, pembubuhan tanda tangan digital teknisi & QC, cetak formulir resmi WO-24 standar A4 dengan logo perusahaan."),

        ("17. Pengiriman & Surat Jalan DO (/dashboard/deliveries)", "Logistics & Deliveries | Resource: deliveries", "app/dashboard/deliveries/page.tsx | Action: app/actions/deliveries.ts", "Logistics Dispatcher, Warehouse Staff, Supir",
         "Penerbitan Surat Jalan (Delivery Order) resmi standar A4 untuk pengiriman ban servis atau ban baru dari workshop ke site tambang pelanggan, disertai bukti tanda terima digital.",
         "Tabel hero_deliveries, hero_fleet, hero_customers, hero_form_wo",
         "Pembuatan DO dari WO yang lolos QC, penugasan armada truk dan supir, pelacakan status ekspedisi pengiriman, upload foto bukti serah terima (POD), cetak DO standar A4."),

        ("18. Manajemen Role, Hak Akses & Audit Trail (/dashboard/security)", "System & Security Management | Resource: security", "app/dashboard/security/page.tsx | Action: app/actions/users.ts", "Super Admin",
         "Pusat kendali keamanan sistem: mengatur hak menu, matriks perizinan resource:action (view, create, edit, delete), data scope (own, site, global), dan inspeksi jejak audit permanen.",
         "Tabel hero_security_roles, hero_role_menu_permissions, audit_logs, session",
         "Matriks hak akses visual, tombol aksi 'Sync Permissions', monitor sesi aktif real-time dengan tombol Revoke paksa, penampil log mutasi data audit trail."),

        ("19. Pengaturan Email & Template Notifikasi (/dashboard/settings/email)", "System Settings | Resource: settings", "app/dashboard/settings/email/page.tsx | Action: app/actions/email-settings.ts", "Super Admin",
         "Mengelola kredensial server SMTP korporat dan kustomisasi template email untuk notifikasi approval, reminder jatuh tempo kontrak, dan peringatan darurat HSE.",
         "Tabel hero_email_settings, hero_email_templates",
         "Konfigurasi host/port/auth SMTP, editor template surat elektronik, pratinjau data sampel variabel dinamis, pengujian kirim email live test."),

        ("20. Portal Layanan Pelanggan MAESTRO (/maestro/dashboard)", "Customer Portal MAESTRO | Resource: maestro-portal", "app/maestro/dashboard/page.tsx | Action: app/actions/maestro.ts", "B2B Customer Users (Scoped by Customer ID & Site ID)",
         "Menyediakan portal layanan mandiri bagi manajemen pelanggan tambang (maestro.chitraparatama.com) untuk melihat status perbaikan ban, data inventaris di site mereka, dan pelaporan berkala secara aman.",
         "Tabel hero_form_wo, hero_deliveries, hero_customers, hero_sites",
         "Pelacakan status tiket servis ban, pemantauan ban afkir (scrap tire), scorecard KPI armada tambang, data access scope terisolasi read-only."),
    ]

    for title, cat_res, src_file, roles, purpose, data_src, features in pages_specs:
        p_pg_t = doc.add_paragraph()
        p_pg_t.paragraph_format.space_before = Pt(8)
        p_pg_t.paragraph_format.space_after = Pt(2)
        r_pt = p_pg_t.add_run(title)
        r_pt.font.name = "Arial"
        r_pt.font.size = Pt(9.5)
        r_pt.font.bold = True
        r_pt.font.color.rgb = NAVY

        t_spec = doc.add_table(rows=7, cols=2)
        spec_rows = [
            ("Specification Field", "Technical & Business Detail"),
            ("Category & Resource", cat_res),
            ("Source File", src_file),
            ("Allowed Roles", roles),
            ("1. Fungsi & Peran Bisnis", purpose),
            ("2. Sumber Data", data_src),
            ("3. Fitur-Fitur Utama", features),
        ]
        for r_idx, (k, v) in enumerate(spec_rows):
            row = t_spec.rows[r_idx]
            row.cells[0].paragraphs[0].text = k
            row.cells[1].paragraphs[0].text = v
            if r_idx > 0:
                row.cells[0].paragraphs[0].runs[0].font.bold = True
        style_table(t_spec, header_bg="0F172A", compact=True)

    # ==========================================
    # 10. DEVELOPER HANDOVER CHECKLIST & SIGN-OFF
    # ==========================================
    doc.add_page_break()
    format_heading("10. Developer Handover Checklist & Sign-Off", level=1)
    
    format_heading("Langkah 1: Setup Lingkungan Lokal (Local Environment)", level=2)
    add_p("[X] Pastikan Node.js terpasang dengan versi 22 LTS (node -v).")
    add_p("[X] Pastikan Docker & Docker Compose aktif di komputer pengembang.")
    add_p("[X] Kloning repository: git clone <repo-url> dan masuk ke direktori proyek HERO.")
    add_p("[X] Jalankan npm install untuk mengunduh seluruh dependensi.")
    add_p("[X] Salin berkas konfigurasi: cp .env.example .env dan sesuaikan DATABASE_URL ke PostgreSQL lokal.")
    add_p("[X] Jalankan migrasi dan sinkronisasi awal: npm run db:push.")
    add_p("[X] Nyalakan server development: npm run dev dan buka http://localhost:3000 di browser.")

    format_heading("Langkah 2: Standar Pengkodean Wajib (Golden Rules)", level=2)
    add_p("[X] Single Source of Truth Rule: Seluruh query data kepegawaian WAJIB ke tabel hero_employees. DILARANG KERAS melakukan query runtime ke tabel staging hero_hr_employees!")
    add_p("[X] S3 Storage & Proxy Rule: Seluruh file dan gambar WAJIB disajikan melalui proxy /api/uploads/[...path] dan dibungkus resolveUploadUrl(rawUrl). DILARANG menyimpan URL bertanda tangan presigned S3 ke database!")
    add_p("[X] RBAC & Navigation Rule: Setiap penambahan rute/modul baru WAJIB didaftarkan resource-nya di lib/navigation.ts, lalu jalankan aksi 'Sync Permissions' pada menu Admin Roles.")
    add_p("[X] Reusable Templates Rule: Seluruh tabel, form, dan modal WAJIB mengimpor modul baku dari @/components/templates (HeroDataTable, HeroSearchableSelect, HeroFormField, dll) dengan tinggi tombol seragam h-9 (36px). DILARANG menggunakan raw <table> atau <select> manual.")
    add_p("[X] Database Sync Rule: Setelah memodifikasi skema di db/schema/, WAJIB jalankan npm run db:push dan restart server untuk membersihkan in-memory metadata cache Drizzle.")
    add_p("[X] E2E Testing Rule: Setiap penambahan fitur atau perbaikan bug WAJIB diverifikasi menggunakan pengujian otomatis browser npm run test:e2e dengan kredensial baku 71261 / Chitra#71261.")

    format_heading("Langkah 3: Panduan Deployment & Verifikasi (Production Release)", level=2)
    add_p("[X] Jalankan pemeriksaan integritas tipe data TypeScript sebelum rilis: npm run check-types.")
    add_p("[X] Buat berkas migrasi fisik permanen: npm run db:generate.")
    add_p("[X] Pastikan Host Bind Mount /mnt/data/one-chitra/uploads <-> /app/public/uploads terpasang di platform Dokploy host server.")
    add_p("[X] Buka menu Admin > Roles (/dashboard/security) dan klik 'Sync Permissions' untuk memastikan seluruh hak akses baru tercatat di database.")
    add_p("[X] Ambil tangkapan layar verifikasi E2E (await app.screenshot()) sebagai bukti antarmuka berfungsi tanpa cela.")

    format_heading("Langkah 4: Troubleshooting Umum (Common Gotchas)", level=2)
    add_p("[X] Error 'column \"xyz\" does not exist' saat query Drizzle: Jalankan npm run db:push lalu restart dev server atau container produksi (docker restart one-chitra-hero).")
    add_p("[X] Foto/Berkas menghasilkan HTTP 403 Forbidden: Bungkus URL dengan resolveUploadUrl(photoUrl) dan periksa apakah prefix folder sudah didaftarkan pada ALLOWED_UPLOAD_PREFIXES di app/api/uploads/[...path]/route.ts.")
    add_p("[X] File unggahan hilang setelah container Dokploy di-rebuild: Periksa apakah Persistent Bind Mount /mnt/data/one-chitra/uploads sudah aktif pada dashboard Dokploy.")
    add_p("[X] Menu sidebar tidak muncul setelah rute baru dibuat: Pastikan resource sudah didaftarkan di lib/navigation.ts dan klik tombol 'Sync Permissions' di Admin Roles.")

    # Simpan Berkas
    saved = False
    for candidate in [output_path, output_path.replace(".docx", "_v2.docx"), output_path.replace(".docx", "_v3.docx"), output_path.replace(".docx", "_latest.docx")]:
        try:
            doc.save(candidate)
            print(f"File DOCX berhasil disimpan di: {candidate}")
            saved = True
            break
        except PermissionError:
            continue
    if not saved:
        import time
        ts_path = output_path.replace(".docx", f"_{int(time.time())}.docx")
        doc.save(ts_path)
        print(f"File DOCX berhasil disimpan dengan timestamp di: {ts_path}")

if __name__ == "__main__":
    out_file = r"d:\[01] PROJECT\HERO\paper\HERO_Technical_Blueprint.docx"
    create_hero_paper_blueprint_docx(out_file)
