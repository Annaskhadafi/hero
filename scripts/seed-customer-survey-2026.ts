import { db } from '@/db'
import {
  formTemplates,
  formTemplateVersions,
  formTemplateSections,
  formTemplateFields,
  formFieldOptions,
} from '@/db/schema/hero'
import { eq } from 'drizzle-orm'

async function main() {
  console.log('Seeding "Customer Survey 2026" form template...')

  const templateKey = 'customer-survey-2026'
  const slug = 'customer-survey-2026'
  const formName = 'Survei Kepuasan Pelanggan 2026'
  const category = 'Survei Kepuasan Pelanggan'
  const description =
    'Selamat datang di Survei Kepuasan Pelanggan PT Chitra Paratama (Chitra) tahun 2026. Seiring dengan usaha kami untuk melakukan proses perbaikan secara terus-menerus, kami sangat menghargai masukan Anda atas kinerja kami selama 1 tahun terakhir ini. Survei ini berlangsung kurang lebih 5 menit.'

  // Cek jika sudah ada dengan slug/templateKey ini
  const existing = await db
    .select()
    .from(formTemplates)
    .where(eq(formTemplates.slug, slug))
    .limit(1)

  let templateId: number

  const themeConfigJson = JSON.stringify({
    primaryColor: '#0753e7',
    accentColor: '#38bdf8',
    backgroundColor: '#f8fafc',
    bgPattern: 'mesh',
    headerBannerStyle: 'corporate',
    borderRadius: 'lg',
  })

  const settingsJson = JSON.stringify({
    requireIdentity: true,
    requireEmail: true,
    requirePhone: false,
    requireCompany: true,
    requireDepartment: true,
    requireSite: false,
    identityTitle: 'Identitas Responden',
    identitySubtitle:
      'Mohon lengkapi data diri Anda sebelum mengisi kuesioner. Jawaban Anda tidak akan dipublikasikan dan hanya digunakan untuk kepentingan perbaikan layanan.',
    companyLabel: 'Nama Perusahaan',
    departmentLabel: 'Departemen / Divisi',
    allowMultipleSubmissions: true,
    showProgressBar: true,
    customThankYouMessage:
      'Terima kasih telah ikut serta dalam survei ini. Kontribusi Anda penting untuk upaya perbaikan berkelanjutan dari kami. Kami sangat menghargai waktu dan upaya Anda dalam menyelesaikan kuesioner ini. Jika ada pertanyaan mengenai survei ini, silakan hubungi kami di info@chitraparatama.co.id.\n\nHormat kami,\nPT Chitra Paratama',
  })

  if (existing.length > 0) {
    templateId = existing[0].id
    console.log(`Form with slug ${slug} already exists (ID: ${templateId}). Updating...`)

    await db
      .update(formTemplates)
      .set({
        name: formName,
        category,
        description,
        themeConfigJson,
        settingsJson,
        isActive: true,
        updatedAt: new Date(),
      })
      .where(eq(formTemplates.id, templateId))
  } else {
    const [newTpl] = await db
      .insert(formTemplates)
      .values({
        templateKey,
        slug,
        name: formName,
        category,
        description,
        themeConfigJson,
        settingsJson,
        isActive: true,
      })
      .returning()

    templateId = newTpl.id
    console.log(`Created new form template with ID: ${templateId}`)
  }

  // Cari atau buat version
  let versions = await db
    .select()
    .from(formTemplateVersions)
    .where(eq(formTemplateVersions.templateId, templateId))
    .limit(1)

  let versionId: number
  if (versions.length === 0) {
    const [v] = await db
      .insert(formTemplateVersions)
      .values({
        templateId,
        versionNumber: 1,
        publishStatus: 'published',
      })
      .returning()
    versionId = v.id
  } else {
    versionId = versions[0].id
  }

  // Cari atau buat section
  let sections = await db
    .select()
    .from(formTemplateSections)
    .where(eq(formTemplateSections.versionId, versionId))
    .limit(1)

  let sectionId: number
  if (sections.length === 0) {
    const [sec] = await db
      .insert(formTemplateSections)
      .values({
        versionId,
        sectionKey: 'sec-main',
        label: 'Kuesioner Kepuasan Pelanggan',
        sortOrder: 1,
      })
      .returning()
    sectionId = sec.id
  } else {
    sectionId = sections[0].id
  }

  // Bersihkan field lama di version ini
  const existingFields = await db
    .select()
    .from(formTemplateFields)
    .where(eq(formTemplateFields.versionId, versionId))

  for (const ef of existingFields) {
    await db.delete(formFieldOptions).where(eq(formFieldOptions.fieldId, ef.id))
  }
  await db.delete(formTemplateFields).where(eq(formTemplateFields.versionId, versionId))

  // Kolom Skala 1 s/d 10 untuk Matriks Likert (Header angka rapi 1 - 10)
  const scale1To10Columns = Array.from({ length: 10 }, (_, i) => ({
    id: String(i + 1),
    label: String(i + 1),
    points: i + 1,
  }))

  const priority1To5Columns = [
    { id: '1', label: '1 (Prioritas Tertinggi)', points: 1 },
    { id: '2', label: '2', points: 2 },
    { id: '3', label: '3', points: 3 },
    { id: '4', label: '4', points: 4 },
    { id: '5', label: '5 (Prioritas Terendah)', points: 5 },
  ]

  // Daftar pertanyaan berdasarkan Customer Survey 2026.htm
  const fieldsData = [
    {
      fieldKey: 'q_sales_rep',
      fieldType: 'likert_matrix' as const,
      label: '4. Tenaga Penjual - Bagaimana Chitra berhasil memenuhi harapan Anda tentang Tenaga Penjual yang berhubungan dengan Anda:',
      helpText: 'Skala penilaian: 1 (Sangat Buruk) sampai 10 (Sangat Baik)',
      isRequired: true,
      config: {
        likertColumns: scale1To10Columns,
        likertRows: [
          { id: 'sr_product_knowledge', label: 'Pengetahuan produk Chitra' },
          { id: 'sr_understand_needs', label: 'Memahami kebutuhan bisnis Anda' },
          { id: 'sr_professionalism', label: 'Profesionalisme dan kedisiplinan' },
          { id: 'sr_friendliness', label: 'Keramahan' },
          { id: 'sr_response_rate', label: 'Tingkat respon terhadap permintaan pelanggan' },
        ],
      },
    },
    {
      fieldKey: 'q_product_price',
      fieldType: 'likert_matrix' as const,
      label: '5. Produk dan Harga - Bagaimana Chitra telah memenuhi harapan Anda tentang Produk yang kami jual:',
      helpText: 'Skala penilaian: 1 (Sangat Buruk) sampai 10 (Sangat Baik)',
      isRequired: true,
      config: {
        likertColumns: scale1To10Columns,
        likertRows: [
          { id: 'pp_price_value', label: 'Harga yang ditawarkan sebanding dengan kualitas produk' },
          { id: 'pp_competitiveness', label: 'Daya saing dengan produk sejenis' },
          { id: 'pp_business_fit', label: 'Kesesuaian produk dengan kebutuhan bisnis Anda' },
          { id: 'pp_availability', label: 'Ketersediaan barang pada saat dibutuhkan' },
          { id: 'pp_variety', label: 'Variasi produk dan jasa yang kami miliki' },
        ],
      },
    },
    {
      fieldKey: 'q_delivery',
      fieldType: 'likert_matrix' as const,
      label: '6. Pengiriman - Seberapa jauh Chitra berhasil memenuhi harapan Anda tentang Pengiriman:',
      helpText: 'Skala penilaian: 1 (Sangat Buruk) sampai 10 (Sangat Baik)',
      isRequired: true,
      config: {
        likertColumns: scale1To10Columns,
        likertRows: [
          { id: 'del_punctuality', label: 'Ketepatan waktu pengiriman' },
          { id: 'del_item_condition', label: 'Kondisi barang pada saat diterima' },
        ],
      },
    },
    {
      fieldKey: 'q_admin_doc',
      fieldType: 'likert_matrix' as const,
      label: '7. Administrasi dan Dokumentasi - Bagaimana Chitra berhasil memenuhi harapan Anda tentang Administrasi dan Dokumentasi penjualan (invoice, faktur, surat jalan, dsb):',
      helpText: 'Skala penilaian: 1 (Sangat Buruk) sampai 10 (Sangat Baik)',
      isRequired: true,
      config: {
        likertColumns: scale1To10Columns,
        likertRows: [
          { id: 'doc_accuracy', label: 'Akurasi dokumen' },
          { id: 'doc_duration', label: 'Durasi pengiriman dokumen' },
          { id: 'doc_completeness', label: 'Kelengkapan informasi pendukung' },
        ],
      },
    },
    {
      fieldKey: 'q_she',
      fieldType: 'likert_matrix' as const,
      label: '8. Safety, Health & Environment (SHE) - Bagaimana Chitra berhasil memenuhi harapan Anda tentang Tingkat SHE (kesadaran karyawan di setiap touchpoint):',
      helpText: 'Skala penilaian: 1 (Sangat Buruk) sampai 10 (Sangat Baik)',
      isRequired: true,
      config: {
        likertColumns: scale1To10Columns,
        likertRows: [
          { id: 'she_awareness', label: 'Kesadaran karyawan Chitra' },
          { id: 'she_procedures', label: 'Prosedur kerja keselamatan' },
          { id: 'she_equipment', label: 'Peralatan kerja dan APD' },
        ],
      },
    },
    {
      fieldKey: 'q_after_sales',
      fieldType: 'likert_matrix' as const,
      label: '9. Layanan Purna Jual - Bagaimana Chitra berhasil memenuhi harapan Anda tentang Layanan Purna Jual kami:',
      helpText: 'Skala penilaian: 1 (Sangat Buruk) sampai 10 (Sangat Baik)',
      isRequired: true,
      config: {
        likertColumns: scale1To10Columns,
        likertRows: [
          { id: 'as_tech_support', label: 'Dukungan teknis / technical support' },
          { id: 'as_complaint_handling', label: 'Penanganan keluhan' },
          { id: 'as_services', label: 'Layanan Services' },
          { id: 'as_dts', label: 'Digital Tire System' },
        ],
      },
    },
    {
      fieldKey: 'q_general_perception',
      fieldType: 'likert_matrix' as const,
      label: '10. Evaluasi Pelayanan - Apa pendapat Anda mengenai pernyataan-pernyataan di bawah ini yang berkaitan dengan pelayanan Chitra:',
      helpText: 'Skala penilaian: 1 (Sangat Tidak Setuju) sampai 10 (Sangat Setuju)',
      isRequired: true,
      config: {
        likertColumns: scale1To10Columns,
        likertRows: [
          { id: 'gp_continue_business', label: 'Ada banyak alasan untuk melanjutkan bisnis dengan Chitra' },
          { id: 'gp_try_new_product', label: 'Saya akan mempertimbangkan untuk menggunakan produk baru yang ditawarkan oleh Chitra' },
          { id: 'gp_good_service', label: 'Saya mendapat pelayanan yang baik dari Chitra' },
        ],
      },
    },
    {
      fieldKey: 'q_nps',
      fieldType: 'nps' as const,
      label: '11. Net Promoter Score (NPS) - Seberapa besar kemungkinan Anda merekomendasikan Chitra pada rekan bisnis atau pelanggan Anda?',
      helpText: 'Skala 0 (Sangat Tidak Mungkin) sampai 10 (Sangat Mungkin)',
      isRequired: true,
      config: {
        min: 0,
        max: 10,
        minLabel: '0 = Sangat Tidak Mungkin',
        maxLabel: '10 = Sangat Mungkin',
      },
    },
    {
      fieldKey: 'q_has_complaints',
      fieldType: 'single_choice' as const,
      label: '12. Dalam kurun waktu 1 tahun terakhir, apakah Anda mempunyai keluhan atas layanan Chitra?',
      helpText: 'Pilih salah satu jawaban yang sesuai:',
      isRequired: true,
      options: [
        { value: 'ada_tanpa_keluhan', label: 'Ya, tetapi tidak mengajukan keluhan' },
        { value: 'ada_diajukan', label: 'Ya, keluhan sudah diajukan' },
        { value: 'tidak_ada', label: 'Tidak ada keluhan' },
      ],
    },
    {
      fieldKey: 'q_complaint_process',
      fieldType: 'multiple_choice' as const,
      label: '13. Dari item di bawah ini, proses manakah yang menjadi keluhan Anda terhadap Chitra?',
      helpText: 'Pilih semua yang sesuai (lewati jika tidak memiliki keluhan):',
      isRequired: false,
      options: [
        { value: 'tenaga_penjual', label: 'Tenaga Penjual' },
        { value: 'produk_harga', label: 'Produk & Harga' },
        { value: 'pengiriman', label: 'Pengiriman' },
        { value: 'administrasi_dokumen', label: 'Administrasi dan dokumentasi (invoice, surat jalan, dsb)' },
        { value: 'lainnya', label: 'Lainnya' },
      ],
    },
    {
      fieldKey: 'q_priority_areas',
      fieldType: 'likert_matrix' as const,
      label: '14. Urutan Prioritas Kerjasama - Di antara area-area di bawah ini, mohon beri tingkat prioritas yang paling penting menurut Anda ketika bekerja sama dengan Chitra:',
      helpText: 'Skala 1 (Paling Penting) sampai 5 (Paling Kurang Penting)',
      isRequired: true,
      config: {
        likertColumns: priority1To5Columns,
        likertRows: [
          { id: 'prio_produk', label: 'Produk' },
          { id: 'prio_sales', label: 'Tenaga Penjual' },
          { id: 'prio_delivery', label: 'Pengiriman' },
          { id: 'prio_admin', label: 'Administrasi dan Dokumentasi' },
          { id: 'prio_she', label: 'Safety, Health & Environment (SHE)' },
          { id: 'prio_after_sales', label: 'Layanan Purna Jual' },
          { id: 'prio_dts', label: 'Digital Tire System' },
        ],
      },
    },
    {
      fieldKey: 'q_future_expectations',
      fieldType: 'long_text' as const,
      label: '15. Produk / Jasa / Layanan Purna Jual apa yang Anda harapkan dari Chitra ke depannya?',
      placeholder: 'Contoh: Untuk ban mungkin bisa lebih diperbanyak ukurannya dan ready stok di Pekanbaru...',
      helpText: 'Tuliskan saran, harapan, atau kebutuhan khusus bisnis Anda di sini:',
      isRequired: false,
    },
  ]

  for (let i = 0; i < fieldsData.length; i++) {
    const fd = fieldsData[i]
    const [insertedField] = await db
      .insert(formTemplateFields)
      .values({
        versionId,
        sectionId,
        fieldKey: fd.fieldKey,
        fieldType: fd.fieldType,
        label: fd.label,
        placeholder: (fd as any).placeholder || '',
        helpText: fd.helpText || '',
        defaultValue: '',
        configJson: JSON.stringify(fd.config || {}),
        isRequired: fd.isRequired,
        sortOrder: i + 1,
      })
      .returning()

    if (fd.options && fd.options.length > 0) {
      for (let j = 0; j < fd.options.length; j++) {
        const opt = fd.options[j]
        await db.insert(formFieldOptions).values({
          fieldId: insertedField.id,
          optionValue: opt.value,
          optionLabel: opt.label,
          sortOrder: j + 1,
        })
      }
    }
  }

  console.log(`Success! ${fieldsData.length} questions created for Customer Survey 2026.`)
  console.log(`Form Studio URL: /dashboard/form-studio/${templateId}/builder`)
  console.log(`Public Form URL: /form/f/${slug}`)
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Seed error:', e)
    process.exit(1)
  })
