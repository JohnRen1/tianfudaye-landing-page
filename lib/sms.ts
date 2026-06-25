interface SmsSendResult {
  provider: 'dev' | 'juhe';
}

export interface SmsRuntimeInfo {
  provider: 'dev' | 'juhe';
  rawProvider: string | null;
  hasJuheApiKey: boolean;
  hasJuheTplId: boolean;
}

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`MISSING_${name}`);
  }
  return value;
}

export function getSmsProvider(): 'dev' | 'juhe' {
  return process.env.SMS_PROVIDER?.trim().toLowerCase() === 'juhe' ? 'juhe' : 'dev';
}

export function getSmsRuntimeInfo(): SmsRuntimeInfo {
  return {
    provider: getSmsProvider(),
    rawProvider: process.env.SMS_PROVIDER ?? null,
    hasJuheApiKey: Boolean(process.env.JUHE_SMS_API_KEY?.trim()),
    hasJuheTplId: Boolean(process.env.JUHE_SMS_TPL_ID?.trim()),
  };
}

export async function sendJuheSmsCode(params: {
  phone: string;
  code: string;
}): Promise<SmsSendResult> {
  const key = getRequiredEnv('JUHE_SMS_API_KEY');
  const tplId = getRequiredEnv('JUHE_SMS_TPL_ID');

  const form = new URLSearchParams();
  form.set('mobile', params.phone);
  form.set('tpl_id', tplId);
  form.set('key', key);
  form.set('tpl_value', `#code#=${encodeURIComponent(params.code)}`);

  const response = await fetch('http://v.juhe.cn/sms/send', {
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
