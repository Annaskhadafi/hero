import { db } from '../db'
import { chitraLearningTestimonials, employees } from '../db/schema/hero'
import { eq, or } from 'drizzle-orm'

async function seed() {
  try {
    // 1. Check or find Andi Saputra / create sample employee or find existing
    let [andi] = await db
      .select()
      .from(employees)
      .where(or(eq(employees.name, 'Andi Saputra'), eq(employees.employeeSn, '70912')))
      .limit(1)

    if (!andi) {
      // Find a site
      const res: any = await db.execute(`SELECT id FROM hero_sites LIMIT 1`)
      const siteId = res.rows?.[0]?.id || 1

      const [newEmp] = await db
        .insert(employees)
        .values({
          name: 'Andi Saputra',
          email: 'andi.saputra@chitraparatama.co.id',
          employeeSn: '70912',
          jobTitle: 'Tireman',
          role: 'Tireman',
          section: 'Site Operation',
          department: 'Service Operation',
          siteId: siteId,
          accessRole: 'Site User',
          employmentStatus: 'active',
        })
        .returning()
      andi = newEmp
    }

    // Also get employee 71261 (Annas Khadafi) for testing
    const [annas] = await db
      .select()
      .from(employees)
      .where(eq(employees.employeeSn, '71261'))
      .limit(1)

    // Clear existing sample testimonials to avoid duplicates
    await db.delete(chitraLearningTestimonials)

    // Insert Mockup Testimonial 1 (Exact match with user image)
    await db.insert(chitraLearningTestimonials).values({
      employeeId: andi.id,
      rating: 5,
      trainingTitle: 'Basic Tire Knowledge',
      experienceReview:
        'Training ini sangat bermanfaat bagi saya. Saya mendapatkan pemahaman lebih baik mengenai konstruksi ban, teknik inspeksi, serta pentingnya perawatan ban untuk mendukung operasional di lapangan. Materinya mudah dipahami dan bisa langsung saya terapkan dalam pekerjaan sehari-hari.',
      knowledgeBenefit:
        'Saya menjadi lebih memahami konstruksi ban, cara inspeksi, dan perawatan ban.',
      feedbackSuggestion:
        'Materi sudah sangat komprehensif, semoga ke depan ada lebih banyak studi kasus riil lapangan.',
      allowDisplay: true,
      status: 'published',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    })

    // Insert Testimonial 2
    if (annas) {
      await db.insert(chitraLearningTestimonials).values({
        employeeId: annas.id,
        rating: 5,
        trainingTitle: 'Mounting & Dismounting Wheel Tire Type EM',
        experienceReview:
          'Penjelasan instruktur melalui video dan modul sangat interaktif dan to-the-point. Sangat membantu dalam memahami standar safety saat proses mounting ban unit besar.',
        knowledgeBenefit:
          'Prosedur keselamatan kerja (K3) penanganan ban EM serta teknik lock-ring inspection.',
        feedbackSuggestion:
          'Bagus sekali! Akses di mobile juga lancar tanpa buffering.',
        allowDisplay: true,
        status: 'published',
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      })
    }

    // Insert Testimonial 3 (e.g. 4 stars)
    const [anotherEmp] = await db
      .select()
      .from(employees)
      .where(eq(employees.role, 'Serviceman'))
      .limit(1)

    if (anotherEmp) {
      await db.insert(chitraLearningTestimonials).values({
        employeeId: anotherEmp.id,
        rating: 5,
        trainingTitle: 'Fastening System & Torque Control',
        experienceReview:
          'Materi torsi baut roda disajikan dengan visualisasi yang jelas. Tes pemahaman di akhir modul sangat menguji ketelitian kita.',
        knowledgeBenefit:
          'Pentingnya calibrated torque wrench dan bahaya under/over-torquing pada baut rim.',
        feedbackSuggestion:
          'Perbanyak quiz berbasis gambar komponen nyata agar makin seru.',
        allowDisplay: true,
        status: 'published',
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      })
    }

    console.log('Sample testimonials seeded successfully.')
  } catch (e) {
    console.error('Seed error:', e)
    process.exit(1)
  }
  process.exit(0)
}

seed()
