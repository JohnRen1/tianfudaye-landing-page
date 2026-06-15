interface SmsSendResult {
  provider: 'dev' | 'juhe';
}

export interface SmsProviderResponse {
  expiresInSeconds: number;
}

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`MISSING_${name}`);
  }
  return value;
}

export function getSmsProvider(): 'dev' | 'juhe' {
  return process.env.SMS_PROVIDER === 'juhe' ? 'juhe' : 'dev';
}

export async function sendJuheSmsCode(params: {
  phone: string;
  code: string;
}): Promise<SmsSendResult> {
  const key = getRequiredEnv('JUHE_SMS_API_KEY');
  const tplId = getRequiredEnv('JUHE_SMS_TPL_ID');
  const sign = process.env.JUHE_SMS_SIGN?.trim() || '';

  const form = new URLSearchParams();
  form.set('mobile', params.phone);
  form.set('tpl_id', tplId);
  form.set('key', key);

  const templateVars: Record<string, string> = sign
    ? { '#code#': params.code, '#sign#': sign }
    : { '#code#': params.code };

  form.set('tpl_value', Object.entries(templateVars).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&'));

  const response = await fetch('https://v.juhe.cn/sms/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form.toString(),
    cache: 'no-store',
  });

  const body = (await response.json()) as Record<string, unknown>;

  if (!response.ok || Number(body.error_code ?? -1) !== 0) {
    throw new Error(`JUHE_SMS_SEND_FAILED:${String(body.reason ?? response.statusText)}`);
  }

  return { provider: 'juhe' };
}
