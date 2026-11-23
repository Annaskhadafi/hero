import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth-session'
import {
  getLmsTestimonials,
  getLmsTestimonialStats,
  getAvailableLmsCourses,
  getCurrentUserEmployeeInfo,
} from './actions'
import { TestimonialsClient } from './testimonials-client'

export const metadata = {
  title: 'Testimoni Pembelajaran | ChitraLearning',
}

export default async function TestimonialsPage() {
  const session = await getServerSession()
  if (!session?.user) {
    redirect('/auth/signin')
  }

  const [testimonials, stats, courses, currentUser] = await Promise.all([
    getLmsTestimonials(),
    getLmsTestimonialStats(),
    getAvailableLmsCourses(),
    getCurrentUserEmployeeInfo(),
  ])

  return (
    <TestimonialsClient
      initialTestimonials={testimonials}
      initialStats={stats}
      availableCourses={courses}
      currentUser={currentUser}
    />
  )
}
