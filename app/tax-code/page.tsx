'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';

type TaxpayerType = 'general' | 'small';

type TaxCodeItem = {
  id: string;
  name: string;
  code: string;
  generalRate: string;
  smallRate: string;
  description: string;
  preference: string;
};

const mockItems: TaxCodeItem[] = [
  { id: 'wheat-starch', name: '小麦淀粉', code: '1030112010100000000', generalRate: '13%', smallRate: '3%', description: '以小麦为原料加工制成的淀粉类产品。', preference: '具体适用政策以当前有效税收政策为准。' },
  { id: 'wheat-flour', name: '小麦粉', code: '1030112010200000000', generalRate: '9%', smallRate: '3%', description: '由小麦加工制成的面粉及相关初级加工产品。', preference: '农产品相关优惠需结合实际业务和采购来源判断。' },
  { id: 'plant-products', name: '其他植物加工业品', code: '1030103990000000000', generalRate: '13%', smallRate: '3%', description: '其他植物类原料经加工形成的产品。', preference: '需结合产品成分、加工工艺及销售用途进一步确认。' },
  { id: 'medical-service', name: '医疗服务', code: '3070202000000000000', generalRate: '6%', smallRate: '3%', description: '提供医学检查、诊断、治疗、康复、预防、保健等方面的服务。', preference: '符合条件的医疗服务可能适用免税政策，具体以政策为准。' },
];

export default function TaxCodePage() {
  const [keyword, setKeyword] = useState('');
  const [taxpayerType, setTaxpayerType] = useState<TaxpayerType>('general');
  const [searched, setSearched] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const results = useMemo(() => {
    if (!searched) return [];
    const normalized = keyword.trim().toLowerCase();
    return mockItems.filter((item) => [item.name, item.code, item.description].some((value) => value.toLowerCase().includes(normalized)));
  }, [keyword, searched]);

  function search() {
    setExpandedId(null);
    setSearched(true);
  }

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-[#182230]">
      <section className="bg-[#0b4f7a] px-5 pb-7 pt-10 text-white sm:px-8">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm text-white/70">天赋大业税务服务</p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">税收分类编码查询</h1>
          <p className="mt-8 text-3xl font-bold sm:text-5xl">查编码，选税率</p>
          <p className="mt-2 text-white/75">让每一次开票都有据可依</p>
          <div className="mt-6 flex gap-3">
            <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-white px-4 py-3 text-[#182230]">
              <Search className="h-5 w-5 shrink-0 text-[#0b4f7a]" />
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && search()}
                placeholder="请输入商品或服务名称"
                className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-slate-400"
              />
            </label>
            <button type="button" onClick={search} className="rounded-xl bg-[#f2a900] px-5 font-semibold text-[#2b2100] transition hover:bg-[#ffc33b]">查询</button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#18364d]">查询结果</h2>
            <p className="mt-1 text-sm text-slate-500">
              {!searched ? '输入商品或服务名称开始查询' : results.length ? `为你找到 ${results.length} 条结果` : '暂未找到匹配结果，请尝试更换关键词'}
            </p>
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald-700">实时</span>
        </div>

        <div className="mt-6 flex border-b border-slate-200">
          {([['general', '一般纳税人'], ['small', '小规模纳税人']] as const).map(([type, label]) => (
            <button key={type} type="button" onClick={() => setTaxpayerType(type)} className={`relative flex-1 pb-3 text-sm font-medium ${taxpayerType === type ? 'text-[#0d6c99]' : 'text-slate-400'}`}>
              {label}
              {taxpayerType === type && <span className="absolute inset-x-1/4 -bottom-px h-1 rounded-full bg-[#0d8ee8]" />}
            </button>
          ))}
        </div>

        {!searched && <EmptyState title="从一个关键词开始" copy="例如：小麦、医疗服务、咨询服务" />}
        {searched && !results.length && <EmptyState title="没有匹配的编码" copy="请检查关键词，或输入更具体的商品名称" />}

        <div className="mt-5 space-y-4">
          {results.map((item) => {
            const expanded = expandedId === item.id;
            const rate = taxpayerType === 'general' ? item.generalRate : item.smallRate;
            return (
              <article key={item.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="text-lg font-bold text-[#18364d]">{item.name}</h3>
                    <span className="rounded-md bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700">{rate}</span>
                  </div>
                  <p className="mt-4 text-sm text-slate-500">税收编码 <span className="ml-2 text-slate-700">{item.code}</span></p>
                  <div className="mt-3 flex justify-between text-xs text-slate-500"><span>适用身份：{taxpayerType === 'general' ? '一般纳税人' : '小规模纳税人'}</span><span>征收率：{rate}</span></div>
                </div>
                <button type="button" onClick={() => setExpandedId(expanded ? null : item.id)} className="flex w-full items-center justify-between border-t border-slate-100 bg-white px-5 py-3 text-sm text-[#0d7cba] hover:bg-sky-50">
                  {expanded ? '收起详情' : '查看详情'}
                  {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {expanded && <div className="space-y-3 bg-sky-50 px-5 pb-5 pt-1 text-sm leading-6 text-slate-600"><p><strong className="mr-2 text-slate-700">说明</strong>{item.description}</p><p><strong className="mr-2 text-slate-700">优惠及简易</strong>{item.preference}</p></div>}
              </article>
            );
          })}
        </div>

        <p className="mt-10 text-center text-xs leading-5 text-slate-400">数据仅供业务判断参考，具体税收政策以现行有效政策及主管税务机关口径为准。</p>
      </section>
    </main>
  );
}

function EmptyState({ title, copy }: { title: string; copy: string }) {
  return <div className="flex flex-col items-center px-5 py-20 text-center"><div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-100 text-xl font-bold text-[#0d6c99]">码</div><h3 className="mt-5 text-lg font-semibold text-slate-700">{title}</h3><p className="mt-2 text-sm text-slate-400">{copy}</p></div>;
}
