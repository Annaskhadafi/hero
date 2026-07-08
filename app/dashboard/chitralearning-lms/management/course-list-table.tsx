'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ChevronDown, ChevronRight, Users } from 'lucide-react'

export function CourseListTable({ courses }: { courses: any[] }) {
  const [expandedCourseId, setExpandedCourseId] = useState<number | null>(null)

  const toggleExpand = (courseId: number) => {
    setExpandedCourseId(current => current === courseId ? null : courseId)
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <table className="w-full text-sm text-left">
        <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-medium">
          <tr>
            <th className="w-10 px-4 py-4"></th>
            <th className="px-6 py-4">Judul Kursus</th>
            <th className="px-6 py-4">Kategori</th>
            <th className="px-6 py-4">Level</th>
            <th className="px-6 py-4">Status</th>
            <th className="px-6 py-4 text-right">Aksi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {courses.map(course => (
            <React.Fragment key={course.id}>
              <tr 
                className="hover:bg-slate-50/50 cursor-pointer"
                onClick={() => toggleExpand(course.id)}
              >
                <td className="px-4 py-4 text-slate-400">
                  {expandedCourseId === course.id ? (
                    <ChevronDown className="h-5 w-5" />
                  ) : (
                    <ChevronRight className="h-5 w-5" />
                  )}
                </td>
                <td className="px-6 py-4 font-medium text-slate-900">{course.title}</td>
                <td className="px-6 py-4 text-slate-600">{course.category}</td>
                <td className="px-6 py-4 text-slate-600 capitalize">{course.level}</td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    course.status === 'published' ? 'bg-emerald-100 text-emerald-700' :
                    course.status === 'draft' ? 'bg-amber-100 text-amber-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {course.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={course.action}>Edit</Link>
                  </Button>
                </td>
              </tr>
              
              {/* Expandable Row Content */}
              {expandedCourseId === course.id && (
                <tr className="bg-slate-50/30">
                  <td colSpan={6} className="p-0 border-b-2 border-slate-200">
                    <div className="p-6 bg-slate-50/50 shadow-inner">
                      <div className="flex items-center gap-2 mb-4">
                        <Users className="h-4 w-4 text-slate-500" />
                        <h4 className="font-semibold text-slate-700 text-sm">Peserta Terdaftar ({course.enrollments?.length || 0})</h4>
                      </div>
                      
                      {course.enrollments?.length > 0 ? (
                        <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                          <table className="w-full text-xs">
                            <thead className="bg-slate-100 text-slate-500">
                              <tr>
                                <th className="px-4 py-2 font-medium">Nama</th>
                                <th className="px-4 py-2 font-medium">SN</th>
                                <th className="px-4 py-2 font-medium">Section</th>
                                <th className="px-4 py-2 font-medium">Tanggal Join</th>
                                <th className="px-4 py-2 font-medium">Tanggal Lulus</th>
                                <th className="px-4 py-2 font-medium text-center">Progress</th>
                                <th className="px-4 py-2 font-medium text-right">Nilai Akhir</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {course.enrollments.map((e: any) => (
                                <tr key={e.id} className="hover:bg-slate-50">
                                  <td className="px-4 py-2.5 font-medium text-slate-900">{e.employeeName}</td>
                                  <td className="px-4 py-2.5 text-slate-600">{e.employeeSn}</td>
                                  <td className="px-4 py-2.5 text-slate-600">{e.department || '-'}</td>
                                  <td className="px-4 py-2.5 text-slate-600">
                                    {e.joinedAt ? new Date(e.joinedAt).toLocaleDateString('id-ID') : '-'}
                                  </td>
                                  <td className="px-4 py-2.5 text-slate-600">
                                    {e.completedAt ? new Date(e.completedAt).toLocaleDateString('id-ID') : '-'}
                                  </td>
                                  <td className="px-4 py-2.5">
                                    <div className="flex items-center gap-2 justify-center">
                                      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div 
                                          className={`h-full ${e.progress === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} 
                                          style={{ width: `${e.progress || 0}%` }} 
                                        />
                                      </div>
                                      <span className="text-slate-600 w-8">{e.progress || 0}%</span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-2.5 text-right font-medium">
                                    {e.finalScore !== null ? e.finalScore : '-'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-center py-8 bg-white rounded-lg border border-slate-200 text-slate-500 text-sm">
                          Belum ada peserta yang mendaftar atau disetujui untuk kursus ini.
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
          {courses.length === 0 && (
            <tr>
              <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                Belum ada kursus.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
