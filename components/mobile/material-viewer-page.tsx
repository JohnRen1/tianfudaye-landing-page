"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, FileText, LoaderCircle, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getMaterialViewUrl } from '@/lib/api/materials';
import type { MaterialViewResponseDTO } from '@/lib/contracts/material';

export function MaterialViewerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const materialId = searchParams.get('materialId');
  const [data, setData] = useState<MaterialViewResponseDTO | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!materialId) {
      setErrorMessage('资料编号无效');
      setLoading(false);
      return;
    }

    let active = true;
    void getMaterialViewUrl(materialId)
      .then((result) => {
        if (active) setData(result);
      })
      .catch((error: unknown) => {
        if (active) setErrorMessage(error instanceof Error ? error.message : '资料加载失败');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [materialId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 text-sm text-muted-foreground">
        <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
        正在加载资料…
      </div>
    );
  }

  if (errorMessage || !data) {
    return (
      <div className="min-h-screen bg-background px-4 pt-4">
        <Button variant="ghost" size="icon" aria-label="返回" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Card className="mt-8 border-0 shadow-sm">
          <CardContent className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <TriangleAlert className="h-8 w-8 text-warning" />
            <p className="text-sm text-muted-foreground">{errorMessage ?? '资料加载失败'}</p>
            <Button variant="outline" onClick={() => window.location.reload()}>重新加载</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isPdf = data.format === 'pdf';
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur">
        <Button variant="ghost" size="icon" aria-label="返回资料列表" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{data.name}</p>
          <p className="text-xs text-muted-foreground">{data.format.toUpperCase()} 资料预览</p>
        </div>
      </header>

      {isPdf ? (
        <iframe
          title={`${data.name} PDF 预览`}
          src={data.viewUrl}
          className="h-[calc(100vh-65px)] w-full border-0 bg-white"
        />
      ) : (
        <main className="px-4 py-8">
          <Card className="border-0 shadow-sm">
            <CardContent className="flex flex-col items-center gap-4 px-6 py-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <FileText className="h-7 w-7" />
              </div>
              <div>
                <h1 className="font-semibold text-foreground">该资料暂不支持网页内预览</h1>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {data.format.toUpperCase()} 文件不提供网页预览，请返回资料列表后点击“查看资料”下载并使用本机办公软件打开。
                </p>
              </div>
              <Button className="w-full rounded-xl" onClick={() => router.back()}>返回资料列表</Button>
            </CardContent>
          </Card>
        </main>
      )}
    </div>
  );
}
