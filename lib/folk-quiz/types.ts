export type Question = {
  id: number
  text: string
  options: string[]
  answer: number
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
