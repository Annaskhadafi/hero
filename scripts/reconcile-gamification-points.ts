import 'dotenv/config'
import pg from 'pg'

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    console.log('🚀 Memulai rekonsiliasi poin karyawan & ChitraLearning LMS events...\n')

    // 1. Ambil seluruh course yang lulus dari hero_chitralearning_enrollments
    const lmsPassedCourses = await client.query(`
      SELECT 
        e.id as enrollment_id,
        e.employee_id,
        e.course_id,
        c.title as course_title,
        e.completed_at,
        emp.name as employee_name,
        emp.employee_sn
      FROM hero_chitralearning_enrollments e
      JOIN hero_chitralearning_courses c ON c.id = e.course_id
      JOIN hero_employees emp ON emp.id = e.employee_id
      WHERE e.is_passed = true
      ORDER BY e.completed_at ASC
    `)

    console.log(`Ditemukan ${lmsPassedCourses.rows.length} kelulusan materi ChitraLearning LMS.`)

    // 2. Cek apakah sudah ada event LMS di hero_point_events
    let insertedEventsCount = 0
    for (const row of lmsPassedCourses.rows) {
      const existing = await client.query(`
        SELECT id FROM hero_point_events 
        WHERE employee_id = $1 
          AND (
            (source_type = 'lms_completion' AND source_id = $2)
            OR (label ILIKE $3)
          )
        LIMIT 1
      `, [row.employee_id, row.course_id, `%${row.course_title}%`])

      if (existing.rows.length === 0) {
        await client.query(`
          INSERT INTO hero_point_events (
            employee_id,
            transaction_type,
            source_type,
            source_id,
            category,
            label,
            points,
            balance_after,
            metadata,
            created_at
          ) VALUES (
            $1,
            'reward',
            'lms_completion',
            $2,
            'ChitraLearning LMS',
            $3,
            100,
            NULL,
            $4,
            COALESCE($5, NOW())
          )
        `, [
          row.employee_id,
          row.course_id,
          `Lulus Pelatihan: ${row.course_title}`,
          JSON.stringify({ courseId: row.course_id, enrollmentId: row.enrollment_id, source: 'reconciliation' }),
          row.completed_at
        ])
        insertedEventsCount++
      }
    }
    console.log(`Berhasil menyisipkan ${insertedEventsCount} point events LMS baru ke hero_point_events.\n`)

    // 3. Rekonsiliasi total_points di hero_employees untuk seluruh karyawan terdampak
    const discrepancies = await client.query(`
      WITH lms_summary AS (
        SELECT 
          employee_id,
          COUNT(*) as lms_count
        FROM hero_chitralearning_enrollments
        WHERE is_passed = true
        GROUP BY employee_id
      ),
      da_summary AS (
        SELECT 
          employee_id,
          COALESCE(SUM(points), 0) as da_total
        FROM hero_point_events
        WHERE source_type != 'lms_completion'
        GROUP BY employee_id
      ),
      pen_summary AS (
        SELECT 
          employee_id,
          COALESCE(SUM(points_deducted), 0) as pen_total
        FROM hero_penalty_events
        GROUP BY employee_id
      ),
      red_summary AS (
        SELECT 
          employee_id,
          COALESCE(SUM(points_spent), 0) as red_total
        FROM hero_reward_redemptions
        WHERE status != 'cancelled'
        GROUP BY employee_id
      )
      SELECT 
        e.id,
        e.employee_sn,
        e.name,
        e.total_points as current_points,
        COALESCE(d.da_total, 0) as da_points,
        COALESCE(l.lms_count, 0) as lms_passed,
        COALESCE(p.pen_total, 0) as pen_points,
        COALESCE(r.red_total, 0) as red_points,
        (COALESCE(d.da_total, 0) + COALESCE(l.lms_count, 0) * 100 - COALESCE(p.pen_total, 0) - COALESCE(r.red_total, 0)) as true_points
      FROM hero_employees e
      LEFT JOIN da_summary d ON d.employee_id = e.id
      LEFT JOIN lms_summary l ON l.employee_id = e.id
      LEFT JOIN pen_summary p ON p.employee_id = e.id
      LEFT JOIN red_summary r ON r.employee_id = e.id
      WHERE (COALESCE(d.da_total, 0) + COALESCE(l.lms_count, 0) * 100 - COALESCE(p.pen_total, 0) - COALESCE(r.red_total, 0)) > e.total_points
      ORDER BY ((COALESCE(d.da_total, 0) + COALESCE(l.lms_count, 0) * 100 - COALESCE(p.pen_total, 0) - COALESCE(r.red_total, 0)) - e.total_points) DESC
    `)

    let updatedEmployeesCount = 0
    for (const emp of discrepancies.rows) {
      const targetPoints = Math.max(0, Number(emp.true_points))
      await client.query(`
        UPDATE hero_employees
        SET total_points = $1
        WHERE id = $2
      `, [targetPoints, emp.id])
      updatedEmployeesCount++
    }

    console.log(`Berhasil merekonsiliasi dan memulihkan poin untuk ${updatedEmployeesCount} karyawan!`)

    // 4. Verifikasi khusus Maslam
    const maslamVerify = await client.query(`
      SELECT id, employee_sn, name, total_points 
      FROM hero_employees 
      WHERE id = 1243
    `)
    console.log('\n=== STATUS POIN MASLAM SETELAH REKONSILIASI ===')
    console.log(maslamVerify.rows[0])

    await client.query('COMMIT')
    console.log('\n✅ Transaksi database berhasil di-commit!')
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('❌ Gagal melakukan rekonsiliasi, rollback dilakukan:', error)
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch(console.error)
