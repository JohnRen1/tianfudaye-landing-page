export type Question = {
  id: number
  kind: 'choice' | 'judge' | 'blank'
  text: string
  options: string[]
  answer: number
  answerText?: string
  note: string
}

export type RecordRow = {
  id: string
  name: string
  phone: string
  score: number
  wrongCount: number
  baseDuration: number
  penaltySeconds: number
  finalDuration: number
  submittedAt: string
}
