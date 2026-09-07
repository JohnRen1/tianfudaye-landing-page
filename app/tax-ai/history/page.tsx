"use client";
import { PageLoadingState } from '@/components/mobile/page-loading-state';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, History, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getChatHistory } from '@/lib/api/ai-chat';
import type { ChatSessionSummary } from '@/lib/ai-history';
import { buildPathWithTracking } from '@/lib/tracking-context';
import { buildHistorySessionPath, getHistoryContext } from '@/lib/chat-navigation';

function HistoryContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [items, setItems] = useState<ChatSessionSummary[]>([]);
  const [page, setPage] = useState(1);
  const [retry, setRetry] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const chatPath = buildPathWithTracking('/tax-ai', params);
  const previous = params.get('returnTo');
  const { backPath, currentSession, returnTo } = getHistoryContext(previous, chatPath);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    void getChatHistory(page).then((result) => {
      if (!active) return;
      setItems((old) => page === 1 ? result.items : [...new Map([...old, ...result.items].map((item) => [item.sessionId, item])).values()]);
      setHasMore(result.hasMore);
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : '历史对话加载失败');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, retry]);

  function openSession(session: string) {
    router.replace(session === currentSession ? backPath : buildHistorySessionPath(chatPath, session, returnTo));
  }

  return <main className="relative mx-auto min-h-screen max-w-[390px] bg-background pb-10">
    <header className="mobile-safe-hero bg-primary px-4 pb-6 pt-4 text-primary-foreground">
      <Button variant="ghost" size="icon" aria-label="返回问答" onClick={() => router.replace(backPath)} className="mb-4 text-white hover:bg-white/10"><ArrowLeft className="h-5 w-5" /></Button>
      <h1 className="flex items-center gap-2 text-2xl font-bold"><History className="h-6 w-6 shrink-0" />历史对话</h1>
      <p className="mt-2 text-sm text-white/80">已保存的对话包含当前对话，继续提问会追加到同一条记录。</p>
    </header>
    <div className="space-y-3 p-4">
      {items.map((item) => <Card key={item.sessionId} className="overflow-hidden border-border/70 py-0 shadow-sm">
        <CardContent className="p-0">
          <button aria-current={item.sessionId === currentSession ? 'true' : undefined} className="w-full space-y-2 p-4 text-left hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-primary aria-[current=true]:bg-primary/5" onClick={() => openSession(item.sessionId)}>
            <span className="flex items-start gap-2 font-semibold"><MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span className="min-w-0 flex-1 line-clamp-2 break-words">{item.title}</span>{item.sessionId === currentSession && <span className="shrink-0 rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">当前对话</span>}</span>
            <span className="line-clamp-2 break-words text-sm text-muted-foreground">{item.preview}</span>
            <span className="flex justify-between text-xs text-muted-foreground"><span>{new Date(item.updatedAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })}</span><span>{item.turns} 轮问答</span></span>
          </button>
        </CardContent>
      </Card>)}
      {loading && <PageLoadingState message="正在加载历史对话…" variant="center" />}
      {error && <div role="alert" className="space-y-3 py-6 text-center"><p className="text-sm text-destructive">{error}</p><Button variant="outline" onClick={() => setRetry((value) => value + 1)}>重新加载</Button></div>}
      {!loading && !error && items.length === 0 && <div className="space-y-3 py-12 text-center"><p>还没有历史对话</p><p className="text-sm text-muted-foreground">完成问答并保存成功后，会自动出现在这里；未发送的草稿不会列入。</p><Button onClick={() => router.replace(backPath)}>返回问答</Button></div>}
      {!loading && !error && hasMore && <Button variant="outline" className="w-full" onClick={() => setPage((value) => value + 1)}>加载更多</Button>}
    </div>
  </main>;
}

export default function ChatHistoryPage() {
  return <Suspense><HistoryContent /></Suspense>;
}
