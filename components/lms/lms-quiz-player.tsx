'use client'

import { useEffect, useState, useTransition, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, AlertCircle, RotateCcw } from 'lucide-react'
import { submitInternalLmsQuizAction } from '@/app/dashboard/chitralearning-lms/actions'

export interface QuizQuestion {
  id: number
  questionType?: string
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
  randomizeOptions?: boolean
  attemptCount?: number
  maxRetakes?: number
}

function QuizHtml({ html, className = '' }: { html: string; className?: string }) {
  return (
    <div
      className={`prose prose-slate max-w-none [&_img]:my-4 [&_img]:max-h-[360px] [&_img]:rounded-xl [&_img]:border [&_img]:border-slate-200 [&_img]:object-contain ${className}`}
      dangerouslySetInnerHTML={{ __html: html || '' }}
    />
  )
}

export function LmsQuizPlayer({ courseId, lessonId, testPhase, questions, nextLessonHref, courseHref, randomizeOptions, attemptCount = 0, maxRetakes = -1 }: LmsQuizPlayerProps) {
  const router = useRouter()
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [localAttemptCount, setLocalAttemptCount] = useState(attemptCount)
  const [scoreResult, setScoreResult] = useState<{ score: number; passed: boolean } | null>(null)
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
  const hasAnsweredCurrent = !!answers[question.id] && answers[question.id].length > 0

  const shuffledOptions = useMemo(() => {
    if (!question) return []
    if (!randomizeOptions) return question.options
    // Fisher-Yates shuffle
    const array = [...question.options]
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[array[i], array[j]] = [array[j], array[i]]
    }
    return array
  }, [question, randomizeOptions])

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
        const res = await submitInternalLmsQuizAction(formData)
        if (res && res.success) {
          setScoreResult({ score: res.score, passed: res.passed })
        }
        setLocalAttemptCount(prev => prev + 1)
        router.refresh()
        setSubmitted(true)
      })
    } else {
      setCurrentQuestionIndex(prev => prev + 1)
    }
  }

  const handleRetake = () => {
    setCurrentQuestionIndex(0)
    setAnswers({})
    setSubmitted(false)
    setScoreResult(null)
  }

  const qType = question.questionType || 'single_choice'

  const handleMultipleChoiceToggle = (optionId: string) => {
    const current = (answers[question.id] || '').split(',').filter(Boolean)
    if (current.includes(optionId)) {
      setAnswers(prev => ({ ...prev, [question.id]: current.filter(id => id !== optionId).join(',') }))
    } else {
      setAnswers(prev => ({ ...prev, [question.id]: [...current, optionId].sort().join(',') }))
    }
  }

  const handleImageMatchingChange = (rowIdx: string, selectedLetter: string) => {
    const arr = (answers[question.id] || ',,,').split(',')
    arr[parseInt(rowIdx, 10)] = selectedLetter
    setAnswers(prev => ({ ...prev, [question.id]: arr.join(',') }))
  }

  if (submitted) {
    return (
      <Card className={`w-full max-w-2xl mx-auto border ${scoreResult?.passed === false ? 'border-amber-100 bg-amber-50/10' : 'border-emerald-100 bg-emerald-50/50'}`}>
        <CardContent className="p-12 text-center flex flex-col items-center">
          {scoreResult?.passed === false ? (
            <AlertCircle className="h-16 w-16 text-amber-500 mb-4" />
          ) : (
            <CheckCircle2 className="h-16 w-16 text-emerald-500 mb-4" />
          )}
          <h3 className="text-2xl font-bold font-heading text-slate-900 mb-2">Kuis Selesai!</h3>
          <p className="text-slate-600 mb-4">Jawaban Anda telah direkam.</p>
          
          {scoreResult && (
            <div className={`mt-2 mb-6 px-8 py-4 rounded-xl border ${scoreResult.passed ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-200'}`}>
               <p className="text-sm font-medium text-slate-600 mb-1">Skor Anda:</p>
               <p className={`text-4xl font-bold ${scoreResult.passed ? 'text-emerald-600' : 'text-amber-600'}`}>{scoreResult.score}%</p>
               <p className={`text-sm mt-2 font-medium ${scoreResult.passed ? 'text-emerald-700' : 'text-amber-700'}`}>
                 {scoreResult.passed ? 'Lulus' : 'Belum Lulus'}
               </p>
            </div>
          )}
          
          {maxRetakes >= 0 && localAttemptCount >= maxRetakes + 1 && (
            <p className="text-sm font-medium text-amber-600 mt-2 mb-4 bg-amber-50 px-4 py-2 rounded-lg border border-amber-200">
              Anda telah mencapai batas maksimal percobaan ({maxRetakes + 1} kali).
            </p>
          )}

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row flex-wrap justify-center mt-2">
            {(maxRetakes < 0 || localAttemptCount < maxRetakes + 1) && (
              <Button onClick={handleRetake} variant={scoreResult?.passed ? "outline" : "destructive"}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Ulangi Tes
              </Button>
            )}
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
          {qType === 'multiple_choice' && <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-0">Pilih Semua yang Benar</Badge>}
          {qType === 'image_matching' && <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 border-0">Pasangkan Gambar</Badge>}
        </div>

        <div className="mb-8">
          {question.questionImageUrl && (
            <img
              src={question.questionImageUrl}
              alt="Gambar pertanyaan"
              className="mb-4 max-h-[360px] rounded-xl border border-slate-200 object-contain"
            />
          )}
          <QuizHtml 
            html={qType === 'fill_in_the_gap' ? question.question.replace(/\[BLANK\]/g, '____') : question.question} 
            className="text-xl font-medium leading-relaxed text-slate-900" 
          />
        </div>

        {qType === 'fill_in_the_gap' ? (
          <div className="space-y-4">
            <Label className="text-base text-slate-700">Ketikkan jawaban Anda:</Label>
            <Input 
              value={answers[question.id] || ''} 
              onChange={e => setAnswers(prev => ({ ...prev, [question.id]: e.target.value }))} 
              placeholder="Jawaban..."
              className="max-w-md h-12 text-lg"
            />
          </div>
        ) : qType === 'multiple_choice' ? (
          <div className="space-y-4">
            {shuffledOptions.map((option) => (
              <Label
                key={option.id}
                className={`flex items-center space-x-3 border p-4 rounded-xl cursor-pointer transition-colors ${
                  (answers[question.id] || '').split(',').includes(option.id)
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <Checkbox 
                  checked={(answers[question.id] || '').split(',').includes(option.id)}
                  onCheckedChange={() => handleMultipleChoiceToggle(option.id)}
                  className="h-5 w-5"
                />
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
          </div>
        ) : qType === 'image_matching' ? (
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white mt-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-medium min-w-[150px]">Keterangan</th>
                    {['A', 'B', 'C', 'D'].map(letter => (
                      <th key={letter} className="px-4 py-3 font-medium text-center w-16">{letter}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {question.options.filter(opt => opt.text).map((option, idx) => (
                    <tr key={option.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-slate-900 font-medium">
                        <QuizHtml html={option.text} className="[&>p]:m-0" />
                      </td>
                      {['A', 'B', 'C', 'D'].map(letter => {
                        const isChecked = (answers[question.id] || ',,,').split(',')[idx] === letter;
                        return (
                          <td key={letter} className="px-4 py-3 text-center align-middle border-l border-slate-100">
                            <label className="flex items-center justify-center cursor-pointer w-full h-full p-2">
                              <input 
                                type="radio" 
                                name={`match-${question.id}-${idx}`}
                                className="h-5 w-5 border-slate-300 text-primary focus:ring-primary cursor-pointer"
                                checked={isChecked}
                                onChange={() => handleImageMatchingChange(String(idx), letter)}
                              />
                            </label>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <RadioGroup
            value={answers[question.id] || ''}
            onValueChange={(val) => setAnswers(prev => ({ ...prev, [question.id]: val }))}
            className="space-y-4"
          >
            {shuffledOptions.map((option) => (
              <Label
                key={option.id}
                className={`flex items-center space-x-3 border p-4 rounded-xl cursor-pointer transition-colors ${
                  answers[question.id] === option.id
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <RadioGroupItem value={option.id} id={option.id} className={qType === 'true_false' ? "h-5 w-5" : ""} />
                <span className={`min-w-0 flex-1 font-normal ${qType === 'true_false' ? "text-lg font-medium" : "text-base"}`}>
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
        )}

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
