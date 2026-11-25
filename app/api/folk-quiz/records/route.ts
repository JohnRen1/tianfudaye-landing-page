import { fail, ok } from '@/lib/api-response'
import { NameTakenError, createFolkQuizRecord, listFolkQuizRecords } from '@/lib/folk-quiz/server-store'
import { NAME_TAKEN_MESSAGE } from '@/lib/folk-quiz/records'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export async function GET() {
  try {
    const response = ok(await listFolkQuizRecords())
    response.headers.set('Cache-Control', 'no-store')
    return response
  } catch (error) {
    const message = error instanceof Error ? error.message : '成绩读取失败'
    return fail('FOLK_QUIZ_READ_FAILED', '成绩读取失败', 500, message)
  }
}

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return fail('INVALID_REQUEST_BODY', '请求体格式错误', 400)
  }
  try {
    const response = ok(await createFolkQuizRecord(body), 201)
    response.headers.set('Cache-Control', 'no-store')
    return response
  } catch (error) {
    if (error instanceof NameTakenError) return fail('FOLK_QUIZ_NAME_TAKEN', NAME_TAKEN_MESSAGE, 409)
    const message = error instanceof Error ? error.message : '成绩没有保存'
    const status = message === '请填写姓名' || message === '姓名过长' || message === '请输入有效的 11 位手机号' || message === '成绩无效' || message === '用时无效' ? 400 : 500
    return fail('FOLK_QUIZ_SAVE_FAILED', status === 400 ? message : '成绩没有保存', status, message)
  }
}
