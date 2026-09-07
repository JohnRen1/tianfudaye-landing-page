import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PageLoadingState({ message = '正在读取页面信息…', variant = 'center' }: { message?: string; variant?: 'center' }) {
  return (
    <div role="status" aria-live="polite" className="flex items-center justify-center gap-2 py-5 text-sm text-muted-foreground">
      <Loader2 aria-hidden="true" strokeWidth={1.8} className="h-4 w-4 shrink-0 motion-safe:animate-[spin_1.1s_linear_infinite]" />
      <span>{message}</span>
    </div>
  );
}

export function InitialDataFrame({ title, description, onBack, action }: {
  title: string;
  description: string;
  onBack?: () => void;
  action: string;
}) {
  return <div className="mx-auto min-h-screen max-w-[390px] bg-background pb-28">
    <header className="mobile-safe-hero bg-primary px-4 pb-8 pt-4 text-primary-foreground">
      {onBack && <Button variant="ghost" className="mb-5 text-white hover:bg-white/10" onClick={onBack}>返回</Button>}
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="mt-3 text-sm text-white/80">{description}</p>
    </header>
    <PageLoadingState message={`正在读取${title}…`} />
    <div className="fixed inset-x-0 bottom-0 border-t border-border bg-card/95 p-4">
      <Button disabled className="mx-auto flex h-12 w-full max-w-[358px] rounded-xl">{action}</Button>
    </div>
  </div>;
}
