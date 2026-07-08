'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import { submitInternalLmsQuizAction } from '@/app/dashboard/chitralearning-lms/actions'

export interface QuizQuestion {
  id: number
  question: string
  questionImageUrl?: string
  options: { id: string; text: string; imageUrl?: string }[]
  correctOptionId?: string // only sent if allowed
}

interface LmsQuizPlayerProps {
  courseId: number
  lessonId: number
  testPhase: 'pretest' | 'posttest'
  questions: QuizQuestion[]
  nextLessonHref?: string | null
  courseHref?: string | null
}

function QuizHtml({ html, className = '' }: { html: string; className?: string }) {
  return (
    <div
      className={`prose prose-slate max-w-none [&_img]:my-4 [&_img]:max-h-[360px] [&_img]:rounded-xl [&_img]:border [&_img]:border-slate-200 [&_img]:object-contain ${className}`}
      dangerouslySetInnerHTML={{ __html: html || '' }}
    />
  )
}

export function LmsQuizPlayer({ courseId, lessonId, testPhase, questions, nextLessonHref, courseHref }: LmsQuizPlayerProps) {
  const router = useRouter()
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    setCurrentQuestionIndex(0)
    setAnswers({})
    setSubmitted(false)
  }, [lessonId])

  if (questions.length === 0) {
    return (
      <Card className="w-full max-w-3xl mx-auto border-amber-100 bg-amber-50/50">
        <CardContent className="p-8 text-center">
          <AlertCircle className="mx-auto mb-3 h-10 w-10 text-amber-500" />
          <h3 className="text-lg font-bold text-slate-900">Soal belum tersedia</h3>
          <p className="mt-2 text-sm text-slate-600">Belum ada soal yang tersimpan untuk materi ini.</p>
        </CardContent>
      </Card>
    )
  }
  
  const question = questions[currentQuestionIndex]
  const isLastQuestion = currentQuestionIndex === questions.length - 1
  const hasAnsweredCurrent = !!answers[question.id]

  const handleNext = () => {
    if (isLastQuestion) {
      const formData = new FormData()
      formData.append('courseId', String(courseId))
      formData.append('lessonId', String(lessonId))
      formData.append('testPhase', testPhase)
      Object.entries(answers).forEach(([questionId, answer]) => {
        formData.append(`answer_${questionId}`, answer)
      })

      startTransition(async () => {
        await submitInternalLmsQuizAction(formData)
        router.refresh()
        setSubmitted(true)
      })
    } else {
      setCurrentQuestionIndex(prev => prev + 1)
    }
  }

  if (submitted) {
    return (
      <Card className="w-full max-w-2xl mx-auto border-emerald-100 bg-emerald-50/50">
        <CardContent className="p-12 text-center flex flex-col items-center">
          <CheckCircle2 className="h-16 w-16 text-emerald-500 mb-4" />
          <h3 className="text-2xl font-bold font-heading text-slate-900 mb-2">Kuis Selesai!</h3>
          <p className="text-slate-600 mb-6">Jawaban Anda telah direkam.</p>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            {nextLessonHref && (
              <Button onClick={() => router.push(nextLessonHref)}>
                Materi Selanjutnya
              </Button>
            )}
            {courseHref && (
              <Button asChild variant="outline">
                <Link href={courseHref}>Kembali ke Kursus</Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-3xl mx-auto border-slate-200">
      <CardContent className="p-8">
        <div className="flex items-center justify-between mb-8">
          <Badge variant="outline" className="text-slate-500">
            Pertanyaan {currentQuestionIndex + 1} dari {questions.length}
          </Badge>
        </div>

        <div className="mb-8">
          {question.questionImageUrl && (
            <img
              src={question.questionImageUrl}
              alt="Gambar pertanyaan"
              className="mb-4 max-h-[360px] rounded-xl border border-slate-200 object-contain"
            />
          )}
          <QuizHtml html={question.question} className="text-xl font-medium leading-relaxed text-slate-900" />
        </div>

        <RadioGroup
          value={answers[question.id]}
          onValueChange={(val) => setAnswers(prev => ({ ...prev, [question.id]: val }))}
          className="space-y-4"
        >
          {question.options.map((option) => (
            <Label
              key={option.id}
              className={`flex items-center space-x-3 border p-4 rounded-xl cursor-pointer transition-colors ${
                answers[question.id] === option.id
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <RadioGroupItem value={option.id} id={option.id} />
              <span className="min-w-0 flex-1 text-base font-normal">
                <QuizHtml html={option.text} />
                {option.imageUrl && (
                  <img
                    src={option.imageUrl}
                    alt={`Gambar opsi ${option.id}`}
                    className="mt-3 max-h-48 rounded-lg border border-slate-200 object-contain"
                  />
                )}
              </span>
            </Label>
          ))}
        </RadioGroup>

        <div className="flex justify-end mt-10">
          <Button 
            size="lg"
            disabled={!hasAnsweredCurrent || isPending}
            onClick={handleNext}
            className="w-full sm:w-auto px-8"
          >
            {isPending ? 'Menyimpan...' : isLastQuestion ? 'Kumpulkan Jawaban' : 'Selanjutnya'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
