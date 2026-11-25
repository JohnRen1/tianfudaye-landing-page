import { fail, ok } from '@/lib/api-response'
import { readQuizEvent, writeQuizEvent } from '@/lib/folk-quiz/server-store'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export async function GET() {
  try {
    const event = await readQuizEvent()
    const response = ok({
      startAt: event?.startAt ?? null,
      endAt: event?.endAt ?? null,
      serverNow: new Date().toISOString(),
    })
    response.headers.set('Cache-Control', 'no-store')
    return response
  } catch (error) {
    const message = error instanceof Error ? error.message : '活动时间读取失败'
    return fail('FOLK_QUIZ_EVENT_READ_FAILED', '活动时间读取失败', 500, message)
  }
}

export async function PUT(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return fail('INVALID_REQUEST_BODY', '请求体格式错误', 400)
  }
  const source = body && typeof body === 'object' ? body as { startAt?: unknown; endAt?: unknown } : {}
  if (typeof source.startAt !== 'string' || typeof source.endAt !== 'string') {
    return fail('FOLK_QUIZ_EVENT_INVALID', '请填写开始和结束时间', 400)
  }
  try {
    const event = await writeQuizEvent(source.startAt, source.endAt)
    const response = ok({ ...event, serverNow: new Date().toISOString() })
    response.headers.set('Cache-Control', 'no-store')
    return response
  } catch (error) {
    const message = error instanceof Error ? error.message : '活动时间没有保存'
    const status = message === '结束时间要晚于开始时间' || message === '活动时长不能超过 24 小时' ? 400 : 500
    return fail('FOLK_QUIZ_EVENT_SAVE_FAILED', status === 400 ? message : '活动时间没有保存', status, message)
  }
}
