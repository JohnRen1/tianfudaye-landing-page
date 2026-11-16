import { createHash } from 'node:crypto'
import { createServiceClient } from '@/lib/supabase'
import { questions } from './questions'
import { NAME_TAKEN_MESSAGE, maskPhone, nameKey, validPhone } from './records'
import type { RecordRow } from './types'

const BUCKET = 'folk-quiz-records'
const FOLDER = 'records'

export class NameTakenError extends Error {
  constructor() {
    super(NAME_TAKEN_MESSAGE)
    this.name = 'NameTakenError'
  }
}

type NewRecord = {
  name: string
  phone: string
  score: number
  wrongCount: number
  baseDuration: number
  penaltySeconds: number
  finalDuration: number
}

let bucketReady: Promise<void> | null = null

function ensureBucket() {
  bucketReady ??= createServiceClient().storage.createBucket(BUCKET, { public: false }).then(({ error }) => {
    if (!error || /already exists/i.test(error.message)) return
    bucketReady = null
    throw new Error(error.message)
  })
  return bucketReady
}

function objectPath(name: string) {
  const hash = createHash('sha256').update(nameKey(name)).digest('hex')
  return `${FOLDER}/${hash}.json`
}

function isDuplicate(error: { message?: string; statusCode?: string | number } | null) {
  if (!error) return false
  return String(error.statusCode) === '409' || /already exists|duplicate/i.test(error.message ?? '')
}

function readRow(value: unknown): RecordRow | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  if (typeof row.id !== 'string' || typeof row.name !== 'string' || typeof row.phone !== 'string') return null
  if (typeof row.score !== 'number' || typeof row.finalDuration !== 'number') return null
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    score: row.score,
    wrongCount: Number(row.wrongCount ?? 0),
    baseDuration: Number(row.baseDuration ?? row.finalDuration),
    penaltySeconds: Number(row.penaltySeconds ?? 0),
    finalDuration: row.finalDuration,
    submittedAt: typeof row.submittedAt === 'string' ? row.submittedAt : '',
  }
}

export function normalizeNewRecord(input: unknown): NewRecord {
  const source = input && typeof input === 'object' ? input as Partial<NewRecord> : {}
  const name = typeof source.name === 'string' ? source.name.trim() : ''
  const phone = typeof source.phone === 'string' ? source.phone.trim() : ''
  const total = questions.length
  const score = source.score
  const wrongCount = source.wrongCount
  const baseDuration = source.baseDuration
  const penaltySeconds = source.penaltySeconds
  const finalDuration = source.finalDuration
  if (!nameKey(name)) throw new Error('请填写姓名')
  if (name.length > 60) throw new Error('姓名过长')
  if (!validPhone(phone)) throw new Error('请输入有效的 11 位手机号')
  if (!Number.isInteger(score) || score == null || score < 0 || score > total) throw new Error('成绩无效')
  if (wrongCount !== total - score) throw new Error('成绩无效')
  if (!Number.isInteger(baseDuration) || baseDuration == null || baseDuration < 0 || baseDuration > 24 * 60 * 60) throw new Error('用时无效')
  if (penaltySeconds !== wrongCount * 10) throw new Error('成绩无效')
  if (finalDuration !== baseDuration + penaltySeconds) throw new Error('成绩无效')
  return { name, phone, score, wrongCount, baseDuration, penaltySeconds, finalDuration }
}

export async function listFolkQuizRecords(): Promise<RecordRow[]> {
  await ensureBucket()
  const client = createServiceClient()
  const paths: string[] = []
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await client.storage.from(BUCKET).list(FOLDER, { limit: 1000, offset })
    if (error) throw new Error(error.message)
    const names = (data ?? []).map((item) => item.name).filter((name) => name.endsWith('.json'))
    paths.push(...names.map((name) => `${FOLDER}/${name}`))
    if ((data ?? []).length < 1000) break
  }
  const rows = await Promise.all(paths.map(async (path) => {
    const { data, error } = await client.storage.from(BUCKET).download(path)
    if (error || !data) return null
    try {
      return readRow(JSON.parse(await data.text()))
    } catch {
      return null
    }
  }))
  return rows.filter((row): row is RecordRow => row != null)
}

export async function createFolkQuizRecord(input: unknown): Promise<RecordRow> {
  const record = normalizeNewRecord(input)
  await ensureBucket()
  const client = createServiceClient()
  const row: RecordRow = {
    id: crypto.randomUUID(),
    name: record.name,
    phone: maskPhone(record.phone),
    score: record.score,
    wrongCount: record.wrongCount,
    baseDuration: record.baseDuration,
    penaltySeconds: record.penaltySeconds,
    finalDuration: record.finalDuration,
    submittedAt: new Date().toLocaleString('zh-CN', { hour12: false, timeZone: 'Asia/Shanghai' }),
  }
  const { error } = await client.storage.from(BUCKET).upload(objectPath(record.name), JSON.stringify(row), {
    contentType: 'application/json',
    upsert: false,
  })
  if (isDuplicate(error)) throw new NameTakenError()
  if (error) throw new Error(error.message)
  return row
}
