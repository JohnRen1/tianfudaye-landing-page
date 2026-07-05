import { NextRequest } from 'next/server';
import { listLandingMaterials } from '@/lib/db';
import { ok, fail } from '@/lib/api-response';
import { requireUser } from '@/lib/auth';
import type { MaterialLandingQueryDTO, MaterialType } from '@/lib/contracts/material';

export const dynamic = 'force-dynamic';

const MATERIAL_TYPES: MaterialType[] = ['courseware', 'policy', 'checklist', 'case'];

function parsePositiveInteger(value: string | null, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category');

  if (category && !MATERIAL_TYPES.includes(category as MaterialType)) {
    return fail('INVALID_MATERIAL_CATEGORY', '资料分类不合法', 400);
  }

  const userCtx = await requireUser(req);
  const query: MaterialLandingQueryDTO = {
    page: parsePositiveInteger(searchParams.get('page'), 1),
    pageSize: parsePositiveInteger(searchParams.get('pageSize'), 20),
    ...(category ? { category: category as MaterialType } : {}),
  };

  try {
    const result = await listLandingMaterials({
      query,
      userId: userCtx?.userId ?? null,
      isProfileComplete: userCtx?.user?.isProfileComplete ?? false,
    });
    return ok(result);
  } catch (error) {
    return fail('MATERIALS_FETCH_FAILED', '资料列表获取失败', 500, error instanceof Error ? error.message : error);
  }
}
