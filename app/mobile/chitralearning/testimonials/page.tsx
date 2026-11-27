import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth-session'
import {
  getLmsTestimonials,
  getLmsTestimonialStats,
  getAvailableLmsCourses,
  getCurrentUserEmployeeInfo,
} from '@/app/dashboard/chitralearning-lms/testimonials/actions'
import { MobileTestimonialsClient } from './mobile-testimonials-client'

export const metadata = {
  title: 'Testimoni Pembelajaran | ChitraLearning Mobile',
}

export default async function MobileTestimonialsPage() {
  const session = await getServerSession()
  if (!session?.user?.email) {
    redirect('/sign-in')
  }

  const [testimonials, stats, courses, currentUser] = await Promise.all([
    getLmsTestimonials(),
    getLmsTestimonialStats(),
    getAvailableLmsCourses(),
    getCurrentUserEmployeeInfo(),
  ])

  return (
    <MobileTestimonialsClient
      initialTestimonials={testimonials}
      initialStats={stats}
      availableCourses={courses}
      currentUser={currentUser}
    />
  )
}
