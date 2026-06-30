const SHANGHAI_TIME_ZONE = 'Asia/Shanghai';

export function formatShanghaiDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);

  return date.toLocaleDateString('en-CA', {
    timeZone: SHANGHAI_TIME_ZONE,
  });
}

export function formatShanghaiTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(11, 16);

  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: SHANGHAI_TIME_ZONE,
  });
}
