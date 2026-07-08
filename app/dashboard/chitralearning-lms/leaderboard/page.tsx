import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth-session'
import { db } from '@/db'
import { employees } from '@/db/schema/hero'
import { desc, gt, eq } from 'drizzle-orm'
import { Trophy, Medal, Award, Star } from 'lucide-react'

export const metadata = {
  title: 'Leaderboard Pembelajaran | ChitraLearning',
}

export default async function LeaderboardPage() {
  const session = await getServerSession()
  if (!session?.user) {
    redirect('/auth/signin')
  }

  // Get top 20 employees by points
  const topPerformers = await db
    .select({
      id: employees.id,
      name: employees.name,
      department: employees.department,
      section: employees.section,
      totalPoints: employees.totalPoints,
      email: employees.email,
    })
    .from(employees)
    .where(gt(employees.totalPoints, 0))
    .orderBy(desc(employees.totalPoints))
    .limit(20)

  // Find current user's rank
  let currentUserRank = topPerformers.findIndex(e => e.email === session.user.email) + 1
  let currentUserData = currentUserRank > 0 ? topPerformers[currentUserRank - 1] : null

  if (!currentUserData) {
    // If not in top 20, fetch their specific data
    const [me] = await db
      .select({
        id: employees.id,
        name: employees.name,
        department: employees.department,
        section: employees.section,
        totalPoints: employees.totalPoints,
        email: employees.email,
      })
      .from(employees)
      .where(eq(employees.email, session.user.email))
      .limit(1)

    if (me) {
      currentUserData = me
      // Calculate rank by counting how many people have MORE points
      const [countResult] = await db
        .select({ count: employees.id })
        .from(employees)
        .where(gt(employees.totalPoints, me.totalPoints))
      // It's a rough rank, assuming countResult returns rows or we can just do raw count
    }
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Trophy className="h-6 w-6 text-yellow-500" />
      case 2: return <Medal className="h-6 w-6 text-slate-400" />
      case 3: return <Medal className="h-6 w-6 text-amber-600" />
      default: return <span className="font-bold text-slate-500 w-6 text-center">{rank}</span>
    }
  }

  const getLevelBadge = (points: number) => {
    if (points >= 1000) return { label: 'Legend', color: 'bg-purple-100 text-purple-700 border-purple-200' }
    if (points >= 500) return { label: 'Expert', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' }
    if (points >= 200) return { label: 'Pro', color: 'bg-blue-100 text-blue-700 border-blue-200' }
    return { label: 'Rookie', color: 'bg-slate-100 text-slate-700 border-slate-200' }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="text-center space-y-2 mt-4 mb-10">
        <div className="inline-flex items-center justify-center p-3 bg-amber-100 rounded-full mb-2">
          <Trophy className="h-8 w-8 text-amber-600" />
        </div>
        <h1 className="text-3xl font-heading font-bold text-slate-900">Hall of Fame</h1>
        <p className="text-slate-500">Peringkat karyawan dengan poin pembelajaran tertinggi.</p>
      </div>

      {/* Current User Stats */}
      {currentUserData && (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-6 text-white shadow-lg flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-3 rounded-lg">
              <Star className="h-8 w-8 text-yellow-300" />
            </div>
            <div>
              <p className="text-blue-100 text-sm font-medium">Poin Anda Saat Ini</p>
              <div className="flex items-baseline gap-2">
                <h2 className="text-3xl font-bold">{currentUserData.totalPoints}</h2>
                <span className="text-blue-200">pts</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-blue-100 text-sm font-medium mb-1">Status Level</p>
            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getLevelBadge(currentUserData.totalPoints).color} bg-white/10 border-white/20 text-white`}>
              {getLevelBadge(currentUserData.totalPoints).label}
            </span>
          </div>
        </div>
      )}

      {/* Leaderboard Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h2 className="font-semibold text-slate-800">Top 20 Pembelajar</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {topPerformers.map((user, index) => {
            const rank = index + 1
            const badge = getLevelBadge(user.totalPoints)
            const isCurrentUser = user.email === session.user.email

            return (
              <div 
                key={user.id} 
                className={`flex items-center p-4 transition-colors ${
                  isCurrentUser ? 'bg-blue-50/50' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex-shrink-0 w-12 flex justify-center">
                  {getRankIcon(rank)}
                </div>
                
                <div className="ml-4 flex-1">
                  <h3 className={`text-sm font-bold ${isCurrentUser ? 'text-blue-700' : 'text-slate-900'}`}>
                    {user.name} {isCurrentUser && '(Anda)'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {user.department} {user.section ? `• ${user.section}` : ''}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${badge.color}`}>
                    {badge.label}
                  </span>
                  <div className="text-right min-w-[80px]">
                    <span className="text-lg font-bold text-slate-700">{user.totalPoints}</span>
                    <span className="text-xs text-slate-400 ml-1">pts</span>
                  </div>
                </div>
              </div>
            )
          })}
          
          {topPerformers.length === 0 && (
            <div className="p-8 text-center text-slate-500">
              Belum ada data poin pembelajaran. Ayo mulai kursus pertama!
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
