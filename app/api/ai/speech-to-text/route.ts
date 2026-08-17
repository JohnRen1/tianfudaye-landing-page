import { NextRequest } from 'next/server';
import { fail, ok } from '@/lib/api-response';
import { requireUser } from '@/lib/auth';
import { recognizeTencentSpeech } from '@/lib/tencent-asr';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_AUDIO_BYTES = 3 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const userCtx = await requireUser(req);
  if (!userCtx) return fail('AUTH_REQUIRED', '请先登录', 401);

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return fail('VALIDATION_ERROR', '语音上传格式错误', 400);
  }

  const audio = formData.get('audio');
  if (!(audio instanceof File)) {
    return fail('VALIDATION_ERROR', '请上传语音文件', 400);
  }
  if (audio.size <= 0) {
    return fail('VALIDATION_ERROR', '语音内容为空', 400);
  }
  if (audio.size > MAX_AUDIO_BYTES) {
    return fail('VALIDATION_ERROR', '语音太长，请控制在 60 秒以内', 400);
  }

  try {
    const buffer = Buffer.from(await audio.arrayBuffer());
    const result = await recognizeTencentSpeech({
      audio: buffer,
      voiceFormat: 'wav',
    });
    if (!result.text) {
      return fail('ASR_EMPTY_RESULT', '没有识别到清晰语音，请靠近麦克风再试一次', 422);
    }
    return ok({
      text: result.text,
      provider: 'tencent_asr',
      requestId: result.requestId,
      audioDuration: result.audioDuration,
    });
  } catch (error) {
    return fail(
      'ASR_PROVIDER_ERROR',
      '语音识别暂不可用，请稍后重试或改用文字输入',
      502,
      error instanceof Error ? error.message : error,
    );
  }
}
