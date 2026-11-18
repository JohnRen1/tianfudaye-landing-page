import type { RecordRow } from './types'

const STORAGE_KEY = 'folk-quiz-records'

const mockRows: RecordRow[] = [
  { id: 'm1', name: '梁书宁', phone: '176****1056', score: 50, wrongCount: 0, baseDuration: 333, penaltySeconds: 0, finalDuration: 333, submittedAt: '2026-11-16 14:02' },
  { id: 'm2', name: '陈思远', phone: '136****8810', score: 50, wrongCount: 0, baseDuration: 356, penaltySeconds: 0, finalDuration: 356, submittedAt: '2026-11-16 14:05' },
  { id: 'm3', name: '许知夏', phone: '158****2207', score: 46, wrongCount: 4, baseDuration: 368, penaltySeconds: 40, finalDuration: 408, submittedAt: '2026-11-16 14:11' },
  { id: 'm4', name: '苏晚晴', phone: '137****5521', score: 49, wrongCount: 1, baseDuration: 401, penaltySeconds: 10, finalDuration: 411, submittedAt: '2026-11-16 14:09' },
  { id: 'm5', name: '周明远', phone: '139****7712', score: 47, wrongCount: 3, baseDuration: 392, penaltySeconds: 30, finalDuration: 422, submittedAt: '2026-11-16 14:12' },
  { id: 'm6', name: '何清和', phone: '151****6628', score: 45, wrongCount: 5, baseDuration: 380, penaltySeconds: 50, finalDuration: 430, submittedAt: '2026-11-16 14:15' },
  { id: 'm7', name: '林晓雯', phone: '138****2048', score: 48, wrongCount: 2, baseDuration: 418, penaltySeconds: 20, finalDuration: 438, submittedAt: '2026-11-16 14:08' },
  { id: 'm8', name: '赵一楠', phone: '150****3390', score: 46, wrongCount: 4, baseDuration: 445, penaltySeconds: 40, finalDuration: 485, submittedAt: '2026-11-16 14:18' },
  { id: 'm9', name: '马澄', phone: '187****4483', score: 50, wrongCount: 0, baseDuration: 489, penaltySeconds: 0, finalDuration: 489, submittedAt: '2026-11-16 14:21' },
  { id: 'm10', name: '吴嘉树', phone: '186****9144', score: 48, wrongCount: 2, baseDuration: 502, penaltySeconds: 20, finalDuration: 522, submittedAt: '2026-11-16 14:26' },
]

export const NAME_TAKEN_MESSAGE = '该姓名已参加过'

export function nameKey(name: string) {
  return name.trim().replace(/\s+/g, '').toLowerCase()
}

export function isNameTaken(name: string, rows: Pick<RecordRow, 'name'>[]) {
  const key = nameKey(name)
  return key.length > 0 && rows.some((row) => nameKey(row.name) === key)
}

export function loadStoredRows(): RecordRow[] {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as RecordRow[]) : []
  } catch {
    return []
  }
}

export function sampleRows() {
  return mockRows
}

export function leaderboardFrom(stored: RecordRow[]): RecordRow[] {
  const taken = new Set(stored.map((row) => nameKey(row.name)))
  const samples = mockRows.filter((row) => !taken.has(nameKey(row.name)))
  return [...samples, ...stored].sort((a, b) => a.finalDuration - b.finalDuration || a.submittedAt.localeCompare(b.submittedAt))
}

export function leaderboardRows(): RecordRow[] {
  return leaderboardFrom(loadStoredRows())
}

type StoredRecordResponse = { success: true; data: RecordRow[] } | { success: false; error?: { message?: string } }

export async function fetchRecords(): Promise<RecordRow[]> {
  const response = await fetch('/api/folk-quiz/records', { cache: 'no-store' })
  const body = (await response.json()) as StoredRecordResponse
  if (!response.ok || !body.success) {
    throw new Error(body.success ? '成绩读取失败' : body.error?.message || '成绩读取失败')
  }
  return body.data
}

export async function submitRecord(row: Omit<RecordRow, 'id' | 'phone' | 'submittedAt'> & { phone: string }): Promise<RecordRow> {
  const response = await fetch('/api/folk-quiz/records', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(row),
  })
  const body = (await response.json()) as { success: true; data: RecordRow } | { success: false; error?: { message?: string } }
  if (!response.ok || !body.success) {
    throw new Error(!body.success && body.error?.message ? body.error.message : '成绩没有保存')
  }
  return body.data
}

export function formatSpokenDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const remain = seconds % 60
  if (minutes < 60) return `${minutes}分${remain}秒`
  const hours = Math.floor(minutes / 60)
  return `${hours}小时${minutes % 60}分${remain}秒`
}

export function saveRows(rows: RecordRow[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows))
}

export function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0')
  const remain = (seconds % 60).toString().padStart(2, '0')
  return `${minutes}:${remain}`
}

export function maskPhone(phone: string) {
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
}

export function validPhone(phone: string) {
  return /^1[3-9]\d{9}$/.test(phone)
}
