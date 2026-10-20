import { db } from '../db'
import {
  formTemplates,
  formTemplateVersions,
  formTemplateSections,
  formTemplateFields,
  formFieldOptions,
  formSubmissions,
  formSubmissionValues,
} from '../db/schema/hero'
import { eq, sql } from 'drizzle-orm'

async function seedDemoSurvey() {
  console.log('Seeding SurveyMonkey Demo Survey...')

  const existing = await db
    .select()
    .from(formTemplates)
    .where(eq(formTemplates.slug, 'survei-kepuasan-2026'))
    .limit(1)

  if (existing.length > 0) {
    console.log('Demo survey already exists, id:', existing[0].id)
    process.exit(0)
  }

  // 1. Create Template
  const [tpl] = await db
    .insert(formTemplates)
    .values({
      templateKey: 'survei-kepuasan-2026',
      slug: 'survei-kepuasan-2026',
      name: 'Survei Kepuasan Layanan & Rekomendasi PT Chitra Paratama 2026',
      category: 'Survei Pelanggan & Mitra',
      description:
        'Kuesioner evaluasi kualitas pelayanan, respon operasional, dan kepuasan kerja sama kemitraan tahun 2026.',
      viewCount: 142,
      startCount: 98,
      completionCount: 86,
      themeConfigJson: JSON.stringify({
        primaryColor: '#2563eb',
        backgroundColor: '#f8fafc',
      }),
      settingsJson: JSON.stringify({
        requireIdentity: true,
        requireEmail: true,
        requirePhone: true,
        showProgressBar: true,
        customThankYouMessage:
          'Terima kasih banyak atas masukan dan evaluasi yang Anda berikan. Masukan Anda akan segera ditindaklanjuti untuk peningkatan layanan kami!',
      }),
      isActive: true,
    })
    .returning()

  // 2. Create Version
  const [ver] = await db
    .insert(formTemplateVersions)
    .values({
      templateId: tpl.id,
      versionNumber: 1,
      publishStatus: 'published',
    })
    .returning()

  // 3. Create Section
  const [sec] = await db
    .insert(formTemplateSections)
    .values({
      versionId: ver.id,
      sectionKey: 'sec-main',
      label: 'Pertanyaan Evaluasi',
      sortOrder: 1,
    })
    .returning()

  // 4. Create Fields:
  // Q1: NPS
  const [qNps] = await db
    .insert(formTemplateFields)
    .values({
      versionId: ver.id,
      sectionId: sec.id,
      fieldKey: 'q_nps',
      fieldType: 'nps',
      label: 'Seberapa besar kemungkinan Anda merekomendasikan layanan PT Chitra Paratama kepada kolega atau rekan bisnis Anda?',
      helpText: 'Skala 0 (Sangat tidak mungkin) sampai 10 (Sangat mungkin)',
      isRequired: true,
      sortOrder: 1,
      configJson: JSON.stringify({ min: 0, max: 10 }),
    })
    .returning()

  // Q2: Likert Matrix
  const [qLikert] = await db
    .insert(formTemplateFields)
    .values({
      versionId: ver.id,
      sectionId: sec.id,
      fieldKey: 'q_matrix',
      fieldType: 'likert_matrix',
      label: 'Bagaimana penilaian Anda terhadap aspek-aspek operasional berikut?',
      isRequired: true,
      sortOrder: 2,
      configJson: JSON.stringify({
        likertRows: [
          { id: 'r1', label: 'Kecepatan Respon & Penanganan Kendala' },
          { id: 'r2', label: 'Kualitas dan Keandalan Produk/Jasa' },
          { id: 'r3', label: 'Profesionalisme & Komunikasi Tim' },
        ],
        likertColumns: [
          { id: 'c1', label: 'Sangat Buruk', points: 1 },
          { id: 'c2', label: 'Kurang', points: 2 },
          { id: 'c3', label: 'Cukup', points: 3 },
          { id: 'c4', label: 'Baik', points: 4 },
          { id: 'c5', label: 'Sangat Baik', points: 5 },
        ],
      }),
    })
    .returning()

  // Q3: Single Choice
  const [qChoice] = await db
    .insert(formTemplateFields)
    .values({
      versionId: ver.id,
      sectionId: sec.id,
      fieldKey: 'q_frequency',
      fieldType: 'single_choice',
      label: 'Seberapa sering Anda berinteraksi dengan tim operasional HERO?',
      isRequired: true,
      sortOrder: 3,
    })
    .returning()

  const choices = ['Setiap Hari', 'Beberapa Kali Seminggu', '1-2 Kali Sebulan', 'Jarang']
  for (let i = 0; i < choices.length; i++) {
    await db.insert(formFieldOptions).values({
      fieldId: qChoice.id,
      optionValue: choices[i],
      optionLabel: choices[i],
      sortOrder: i + 1,
    })
  }

  // Q4: Feedback
  const [qFeedback] = await db
    .insert(formTemplateFields)
    .values({
      versionId: ver.id,
      sectionId: sec.id,
      fieldKey: 'q_feedback',
      fieldType: 'long_text',
      label: 'Apa saran perbaikan atau masukan tambahan untuk kami?',
      placeholder: 'Tuliskan masukan dan pengalaman Anda...',
      isRequired: false,
      sortOrder: 4,
    })
    .returning()

  // 5. Seed Beberapa Contoh Submissions
  const respondents = [
    { name: 'Budi Santoso', email: 'budi.santoso@pertamina.com', phone: '081234567890', nps: 10, choice: 'Setiap Hari', feedback: 'Pelayanan sangat memuaskan dan tim sangat responsif!' },
    { name: 'Siti Rahma', email: 'siti.rahma@adaro.com', phone: '081298765432', nps: 9, choice: 'Beberapa Kali Seminggu', feedback: 'Sangat andal dalam pemeliharaan berkala.' },
    { name: 'Ahmad Fauzi', email: 'ahmad.fauzi@kaltimprima.com', phone: '081345678901', nps: 8, choice: 'Setiap Hari', feedback: 'Sudah baik, koordinasi lapangan bisa ditingkatkan.' },
    { name: 'Dewi Lestari', email: 'dewi.lestari@unitedtractors.com', phone: '081567890123', nps: 9, choice: '1-2 Kali Sebulan', feedback: 'Respon cepat saat ada kebutuhan darurat.' },
    { name: 'Rendra Pratama', email: 'rendra@buma.id', phone: '081789012345', nps: 6, choice: 'Jarang', feedback: 'Waktu tunggu pengiriman part mohon dipersingkat.' },
  ]

  for (let i = 0; i < respondents.length; i++) {
    const r = respondents[i]
    const [sub] = await db
      .insert(formSubmissions)
      .values({
        templateId: tpl.id,
        templateVersionId: ver.id,
        respondentName: r.name,
        respondentEmail: r.email,
        respondentPhone: r.phone,
        isPublicSubmission: true,
        durationSeconds: 45 + i * 15,
        requestNumber: `RES-DEMO-${i + 1}`,
        requestStatus: 'submitted',
        submittedAt: new Date(Date.now() - (i + 1) * 3600000 * 4),
      })
      .returning()

    // Values:
    await db.insert(formSubmissionValues).values({
      submissionId: sub.id,
      fieldKey: 'q_nps',
      fieldType: 'nps',
      numericValue: r.nps,
      valueText: String(r.nps),
      displayValue: String(r.nps),
    })

    await db.insert(formSubmissionValues).values({
      submissionId: sub.id,
      fieldKey: 'q_matrix',
      fieldType: 'likert_matrix',
      jsonValue: JSON.stringify({ r1: 'c5', r2: 'c4', r3: 'c5' }),
      valueText: 'Evaluasi Likert',
      displayValue: 'Sangat Baik / Baik',
    })

    await db.insert(formSubmissionValues).values({
      submissionId: sub.id,
      fieldKey: 'q_frequency',
      fieldType: 'single_choice',
      valueText: r.choice,
      displayValue: r.choice,
    })

    await db.insert(formSubmissionValues).values({
      submissionId: sub.id,
      fieldKey: 'q_feedback',
      fieldType: 'long_text',
      valueText: r.feedback,
      displayValue: r.feedback,
    })
  }

  console.log('Seed demo survey finished successfully! Template id:', tpl.id)
  process.exit(0)
}

seedDemoSurvey().catch((err) => {
  console.error(err)
  process.exit(1)
})
