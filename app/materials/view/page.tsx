import { Suspense } from 'react';
import { MaterialViewerPage } from '@/components/mobile/material-viewer-page';

export default function Page() {
  return (
    <Suspense
      fallback={(
        <div className="mx-auto flex min-h-screen max-w-[640px] items-center justify-center bg-background px-6 text-sm text-muted-foreground">
          正在加载资料预览…
        </div>
      )}
    >
      <MaterialViewerPage />
    </Suspense>
  );
}
