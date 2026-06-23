import fs from 'fs'
import path from 'path'

function read(file: string) {
  return fs.readFileSync(path.join(process.cwd(), file), 'utf8')
}

describe('mobile profile runtime schema guards', () => {
  it('ensures attendance permission approval submission column before profile query', () => {
    const profileSource = read('app/mobile/profile/page.tsx')
    const infrastructureSource = read('lib/timesheet/scheduling-infrastructure.ts')

    expect(profileSource).toContain('await ensureSchedulingTimesheetTables()')
    expect(profileSource).toContain('from(attendancePermissionRequests)')
    expect(infrastructureSource).toContain('alter table hero_attendance_permission_requests add column if not exists approval_submission_id')
  })
})
