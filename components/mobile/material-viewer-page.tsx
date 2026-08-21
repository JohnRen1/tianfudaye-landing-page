"use client";

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, FileText, LoaderCircle, TriangleAlert } from 'lucide-react';
import type { DocumentInitParameters } from 'pdfjs-dist/types/src/display/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getMaterialViewUrl } from '@/lib/api/materials';
import { getClientAuthToken } from '@/lib/client-auth';
import type { MaterialViewResponseDTO } from '@/lib/contracts/material';

function PdfCanvasPreview({ materialId, name }: { materialId: string; name: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    if (!container) return;

    const renderPdf = async () => {
      try {
        const token = getClientAuthToken();
        const source: DocumentInitParameters & { disableWorker: boolean } = {
          url: `/api/materials/${encodeURIComponent(materialId)}/pdf-content`,
          httpHeaders: token ? { Authorization: `Bearer ${token}` } : undefined,
          disableWorker: true,
        };
        const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist/legacy/build/pdf');
        GlobalWorkerOptions.workerSrc = '/api/pdf-worker';
        const loadingTask = getDocument(source);
        const documentProxy = await loadingTask.promise;
        if (cancelled) return;

        container.replaceChildren();
        const renderWidth = Math.max(320, container.clientWidth - 24);
        for (let pageNumber = 1; pageNumber <= documentProxy.numPages; pageNumber += 1) {
          const page = await documentProxy.getPage(pageNumber);
          const baseViewport = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({ scale: renderWidth / baseViewport.width });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          if (!context) throw new Error('当前设备无法创建 PDF 预览画布');
          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          canvas.className = 'mb-3 w-full rounded-sm bg-white shadow-sm last:mb-0';
          container.appendChild(canvas);
          await page.render({ canvasContext: context, viewport }).promise;
          if (cancelled) return;
        }
      } catch (error) {
        if (!cancelled) setErrorMessage(error instanceof Error ? error.message : 'PDF 预览加载失败');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void renderPdf();
    return () => {
      cancelled = true;
    };
  }, [materialId]);

  return (
    <main className="min-h-[calc(100vh-65px)] bg-muted/50 px-3 py-3">
      {loading && (
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
          正在渲染 PDF…
        </div>
      )}
      {errorMessage && (
        <Card className="border-0 shadow-sm">
          <CardContent className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <TriangleAlert className="h-8 w-8 text-warning" />
            <p className="text-sm text-muted-foreground">{errorMessage}</p>
          </CardContent>
        </Card>
      )}
      <div ref={containerRef} aria-label={`${name} PDF 内容`} className={loading || errorMessage ? 'hidden' : ''} />
    </main>
  );
}

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
        <PdfCanvasPreview materialId={materialId ?? ''} name={data.name} />
      ) : (
        <main className="px-4 py-8">
          <Card className="border-0 shadow-sm">
            <CardContent className="flex flex-col items-center gap-4 px-6 py-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <FileText className="h-7 w-7" />
              </div>
              <div>
                <h1 className="font-semibold text-foreground">资料预览</h1>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  该 {data.format.toUpperCase()} 资料已领取。文件内容需使用本机 WPS、Office 等办公软件打开；首次领取时已完成下载。
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
