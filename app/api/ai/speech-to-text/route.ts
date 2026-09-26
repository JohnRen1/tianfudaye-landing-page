import { NextRequest } from 'next/server';
import { fail, ok } from '@/lib/api-response';
import { requireUser } from '@/lib/auth';
import { recognizeTencentSpeech } from '@/lib/tencent-asr';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_AUDIO_BYTES = 3 * 1024 * 1024;

function resolveVoiceFormat(audio: File): string {
  const fromName = audio.name?.toLowerCase() ?? '';
  const fromMime = audio.type?.toLowerCase() ?? '';
  const ext = fromName.includes('.') ? fromName.split('.').pop() : '';

  const explicitExt = ext && ext.trim().toLowerCase();
  if (explicitExt && ['wav', 'mp3', 'aac', 'amr', 'silk', 'opus', 'ogg', 'pcm', 'raw'].includes(explicitExt)) {
    return explicitExt;
  }

  if (fromMime.includes('wav')) return 'wav';
  if (fromMime === 'audio/mpeg' || fromMime === 'audio/mp3') return 'mp3';
  if (fromMime.includes('mp3')) return 'mp3';
  if (fromMime.includes('aac')) return 'aac';
  if (fromMime.includes('amr')) return 'amr';
  if (fromMime.includes('opus')) return 'opus';
  if (fromMime.includes('ogg')) return 'ogg';
  if (fromMime.includes('pcm')) return 'pcm';

  return 'wav';
}

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const userCtx = await requireUser(req);
  if (!userCtx) return fail('AUTH_REQUIRED', '请先登录', 401, undefined, requestId);

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return fail('VALIDATION_ERROR', '语音上传格式错误', 400, undefined, requestId);
  }

  const audio = formData.get('audio');
  if (!(audio instanceof File)) {
    return fail('VALIDATION_ERROR', '请上传语音文件', 400, undefined, requestId);
  }
  if (audio.size <= 0) {
    return fail('VALIDATION_ERROR', '语音内容为空', 400, undefined, requestId);
  }
  if (audio.size > MAX_AUDIO_BYTES) {
    return fail('VALIDATION_ERROR', '语音太长，请控制在 60 秒以内', 400, undefined, requestId);
  }

  const voiceFormat = resolveVoiceFormat(audio);
  console.log('[speech-to-text] request received', { requestId, voiceFormat, fileName: audio.name, mimeType: audio.type, size: audio.size });

  const formatFallbacks = Array.from(new Set([voiceFormat, 'wav', 'mp3', 'aac', 'amr', 'opus', 'ogg'].filter(Boolean)));
  const fallbackErrors: string[] = [];

  try {
    const buffer = Buffer.from(await audio.arrayBuffer());
    let result: { text: string; requestId: string; audioDuration: number | null } | null = null;
    for (const format of formatFallbacks) {
      try {
        result = await recognizeTencentSpeech({
          audio: buffer,
          voiceFormat: format,
        });
        console.log('[speech-to-text] provider succeeded', { requestId, voiceFormat: format, providerRequestId: result.requestId });
        break;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        fallbackErrors.push(`${format}: ${message}`);
        console.warn('[speech-to-text] provider attempt failed', { requestId, voiceFormat: format, error: message });
      }
    }

    if (!result) {
      throw new Error(fallbackErrors.join(' | '));
    }

    if (!result.text) {
      return fail('ASR_EMPTY_RESULT', '没有识别到清晰语音，请靠近麦克风再试一次', 422, undefined, requestId);
    }
    return ok({
      text: result.text,
      provider: 'tencent_asr',
      requestId: result.requestId,
      audioDuration: result.audioDuration,
    });
  } catch (error) {
    console.error('[speech-to-text] provider failed', {
      requestId,
      voiceFormat,
      fileName: audio.name,
      mimeType: audio.type,
      size: audio.size,
      error: error instanceof Error ? error.message : String(error),
    });
    return fail(
      'ASR_PROVIDER_ERROR',
      '语音识别暂不可用，请稍后重试或改用文字输入',
      502,
      error instanceof Error ? error.message : error,
      requestId,
    );
  }
}
