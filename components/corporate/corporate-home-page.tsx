import Link from 'next/link';
import {
  ArrowRight,
  Building2,
  ChevronRight,
  CircleCheck,
  FileCheck2,
  Landmark,
  Menu,
  Scale,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from 'lucide-react';

const navigation = [
  { label: '首页', href: '#top' },
  { label: '关于我们', href: '#about' },
  { label: '专业服务', href: '#services' },
  { label: '行业方案', href: '#industries' },
  { label: '专家团队', href: '#team' },
  { label: '财税洞察', href: '#insights' },
];

const services = [
  {
    icon: ShieldCheck,
    title: '税务合规与风险管理',
    description: '从日常涉税事项到重点风险排查，帮助企业建立可持续的合规机制。',
    items: ['税务健康检查', '涉税风险诊断', '内控流程优化'],
  },
  {
    icon: Landmark,
    title: '企业税务顾问',
    description: '围绕经营决策提供前置、长期的专业支持，让税务问题更早被看见。',
    items: ['经营决策咨询', '交易税务分析', '政策适用建议'],
  },
  {
    icon: FileCheck2,
    title: '涉税专业服务',
    description: '以严谨的工作底稿和清晰的沟通机制，协助处理复杂涉税事项。',
    items: ['涉税鉴证服务', '税务争议支持', '专项申报辅导'],
  },
];

const industries = ['制造与供应链', '科技与创新企业', '商贸与新零售', '房地产与建筑', '现代服务业', '家族与高净值客户'];

const insights = [
  { category: '政策解读', title: '企业经营决策中，哪些税务事项需要前置评估？', date: '专业洞察' },
  { category: '合规管理', title: '从“事后补救”到“事前管理”：企业税务风险的治理路径', date: '专业洞察' },
  { category: '经营实践', title: '成长型企业建立财税协同机制的三个关键节点', date: '专业洞察' },
];

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="max-w-2xl">
      <p className="text-sm font-semibold tracking-[0.22em] text-[#c89b4a]">{eyebrow}</p>
      <h2 className="mt-4 font-serif text-3xl font-semibold tracking-[-0.04em] text-[#10233f] sm:text-4xl">{title}</h2>
      <p className="mt-5 text-base leading-8 text-slate-600">{description}</p>
    </div>
  );
}

export function CorporateHomePage() {
  return (
    <main id="top" className="min-h-screen overflow-hidden bg-[#faf9f6] text-slate-900">
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 lg:px-8">
          <Link href="#top" className="flex items-center gap-3 text-white" aria-label="天赋大业税务师事务所首页">
            <span className="grid h-10 w-10 place-items-center border border-[#d6b169] text-lg font-semibold">天</span>
            <span className="leading-tight">
              <span className="block text-base font-semibold tracking-[0.12em]">天赋大业</span>
              <span className="block text-[10px] tracking-[0.18em] text-slate-300">TALENT TAX ADVISORY</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm text-slate-200 lg:flex" aria-label="主导航">
            {navigation.map((item) => <a key={item.label} className="transition hover:text-[#e2bf79]" href={item.href}>{item.label}</a>)}
          </nav>
          <a href="#contact" className="hidden border border-[#d6b169] px-5 py-2.5 text-sm font-medium text-[#f3d797] transition hover:bg-[#d6b169] hover:text-[#10233f] sm:block">预约咨询</a>
          <details className="relative lg:hidden">
            <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center border border-white/30 text-white [&::-webkit-details-marker]:hidden" aria-label="打开导航">
              <Menu className="h-5 w-5" />
            </summary>
            <nav className="absolute right-0 top-12 w-52 bg-white p-3 shadow-2xl" aria-label="移动端主导航">
              {navigation.map((item) => <a key={item.label} className="block border-b border-slate-100 px-3 py-3 text-sm text-slate-700 last:border-0" href={item.href}>{item.label}</a>)}
            </nav>
          </details>
        </div>
      </header>

      <section className="relative isolate bg-[#10233f] pb-20 pt-36 text-white sm:pb-28 sm:pt-44">
        <div className="absolute inset-0 -z-10 opacity-35 [background-image:linear-gradient(rgba(255,255,255,.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.12)_1px,transparent_1px)] [background-size:68px_68px]" />
        <div className="absolute -right-20 top-20 -z-10 h-[32rem] w-[32rem] rounded-full border border-[#d6b169]/25" />
        <div className="absolute -right-6 top-36 -z-10 h-96 w-96 rounded-full border border-[#d6b169]/20" />
        <div className="mx-auto grid max-w-7xl gap-14 px-5 lg:grid-cols-[1.2fr_.8fr] lg:px-8">
          <div className="max-w-3xl">
            <p className="flex items-center gap-2 text-sm tracking-[0.2em] text-[#e0bd78]"><span className="h-px w-8 bg-[#e0bd78]" />专业财税服务</p>
            <h1 className="mt-8 font-serif text-5xl font-semibold leading-[1.14] tracking-[-0.055em] sm:text-6xl lg:text-7xl">让每一次经营决策<br />都更从容。</h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-slate-300">天赋大业税务师事务所以专业、审慎和长期陪伴，为企业与经营者提供面向未来的税务解决方案。</p>
            <div className="mt-10 flex flex-wrap gap-4">
              <a href="#contact" className="inline-flex items-center gap-3 bg-[#d6b169] px-6 py-3.5 text-sm font-semibold text-[#10233f] transition hover:bg-[#edcf8f]">预约专业咨询 <ArrowRight className="h-4 w-4" /></a>
              <a href="#services" className="inline-flex items-center gap-3 border border-white/35 px-6 py-3.5 text-sm font-semibold text-white transition hover:border-white hover:bg-white/10">了解我们的服务 <ChevronRight className="h-4 w-4" /></a>
            </div>
          </div>
          <div className="self-end border-l border-[#d6b169]/50 pl-6 sm:pl-9 lg:mb-4">
            <p className="font-serif text-2xl leading-relaxed text-[#f4e8c9]">“税务，不只是申报与筹划，更是企业经营秩序的一部分。”</p>
            <p className="mt-5 text-sm text-slate-400">以专业判断，守护长期价值</p>
          </div>
        </div>
      </section>

      <section id="about" className="border-b border-slate-200 bg-white py-20 sm:py-28">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 lg:grid-cols-[.95fr_1.05fr] lg:px-8">
          <SectionHeading eyebrow="ABOUT TALENT" title="以专业为根，以信任为桥" description="我们关注的不止是一次问题的解决，更是企业在复杂商业环境中建立清晰、稳健的财税秩序。" />
          <div className="grid gap-px overflow-hidden bg-slate-200 sm:grid-cols-2">
            {[
              ['专业判断', '以法规、事实与业务实质为依据'],
              ['审慎沟通', '让复杂问题被清楚地理解与推进'],
              ['长期陪伴', '在企业发展的关键节点及时响应'],
              ['协同共创', '与客户团队共同建立解决路径'],
            ].map(([title, text]) => <div key={title} className="bg-white p-7"><CircleCheck className="h-5 w-5 text-[#c89b4a]" /><h3 className="mt-8 text-lg font-semibold text-[#10233f]">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{text}</p></div>)}
          </div>
        </div>
      </section>

      <section id="services" className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 lg:px-8"><SectionHeading eyebrow="OUR SERVICES" title="围绕经营全周期的专业支持" description="从风险预防、日常经营到重要交易，我们将税务判断融入企业实际的业务语境。" />
          <div className="mt-12 grid gap-5 lg:grid-cols-3">{services.map(({ icon: Icon, title, description, items }) => <article key={title} className="group bg-white p-7 shadow-[0_12px_35px_rgba(16,35,63,.06)] transition hover:-translate-y-1 hover:shadow-[0_20px_45px_rgba(16,35,63,.12)]"><div className="flex h-11 w-11 items-center justify-center bg-[#10233f] text-[#e0bd78]"><Icon className="h-5 w-5" /></div><h3 className="mt-8 text-xl font-semibold tracking-tight text-[#10233f]">{title}</h3><p className="mt-4 text-sm leading-7 text-slate-600">{description}</p><ul className="mt-7 space-y-3 border-t border-slate-100 pt-6 text-sm text-slate-600">{items.map((item) => <li className="flex items-center gap-2" key={item}><span className="h-1.5 w-1.5 bg-[#c89b4a]" />{item}</li>)}</ul><a href="#contact" className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-[#10233f]">咨询此项服务 <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></a></article>)}</div>
        </div>
      </section>

      <section id="industries" className="bg-[#e9eceb] py-20 sm:py-28"><div className="mx-auto max-w-7xl px-5 lg:px-8"><SectionHeading eyebrow="INDUSTRY FOCUS" title="理解行业，才更理解企业" description="我们从企业所处的交易场景、商业模式与发展阶段出发，形成更具针对性的服务视角。" /><div className="mt-10 grid overflow-hidden border border-slate-300 sm:grid-cols-2 lg:grid-cols-3">{industries.map((industry) => <a className="group flex items-center justify-between border-b border-r border-slate-300 bg-[#eef0ef] p-6 text-[#10233f] transition hover:bg-[#10233f] hover:text-white" href="#contact" key={industry}><span className="font-medium">{industry}</span><ArrowRight className="h-4 w-4 text-[#c89b4a] transition group-hover:translate-x-1" /></a>)}</div></div></section>

      <section id="team" className="bg-white py-20 sm:py-28"><div className="mx-auto grid max-w-7xl gap-12 px-5 lg:grid-cols-[.95fr_1.05fr] lg:px-8"><SectionHeading eyebrow="OUR PEOPLE" title="多元经验，共同解决复杂问题" description="事务所汇集税务、财务、法律与企业经营视角，以协作式服务回应每个客户的真实需求。" /><div className="border-l-2 border-[#d6b169] bg-[#faf9f6] p-8 sm:p-10"><UsersRound className="h-8 w-8 text-[#c89b4a]" /><p className="mt-10 font-serif text-2xl leading-relaxed text-[#10233f]">专业团队的价值，不只在于提供答案，更在于帮助客户看见问题背后的选择与边界。</p><a className="mt-9 inline-flex items-center gap-2 text-sm font-semibold text-[#10233f]" href="#contact">认识我们的专业团队 <ArrowRight className="h-4 w-4" /></a></div></div></section>

      <section id="insights" className="py-20 sm:py-28"><div className="mx-auto max-w-7xl px-5 lg:px-8"><div className="flex flex-wrap items-end justify-between gap-6"><SectionHeading eyebrow="INSIGHTS" title="财税洞察，服务经营判断" description="关注政策变化、风险治理与企业经营实践。" /><a href="#contact" className="inline-flex items-center gap-2 text-sm font-semibold text-[#10233f]">订阅专业洞察 <ArrowRight className="h-4 w-4" /></a></div><div className="mt-12 grid gap-5 lg:grid-cols-3">{insights.map((insight) => <article className="border-t-2 border-[#10233f] bg-white p-7" key={insight.title}><p className="text-xs font-semibold tracking-[.16em] text-[#c89b4a]">{insight.category}</p><h3 className="mt-6 text-xl font-semibold leading-snug tracking-tight text-[#10233f]">{insight.title}</h3><div className="mt-10 flex items-center justify-between text-sm text-slate-500"><span>{insight.date}</span><ArrowRight className="h-4 w-4 text-[#10233f]" /></div></article>)}</div></div></section>

      <section id="contact" className="bg-[#10233f] py-20 text-white sm:py-28"><div className="mx-auto grid max-w-7xl gap-10 px-5 lg:grid-cols-[1.05fr_.95fr] lg:px-8"><div><p className="text-sm font-semibold tracking-[.2em] text-[#e0bd78]">START A CONVERSATION</p><h2 className="mt-5 font-serif text-4xl font-semibold tracking-[-.04em] sm:text-5xl">从一次沟通开始，<br />让专业服务真正发生。</h2><p className="mt-6 max-w-xl leading-8 text-slate-300">欢迎告诉我们您正在面对的业务情境。我们将安排合适的专业人员与您进一步沟通。</p></div><div className="bg-white p-7 text-[#10233f] sm:p-9"><p className="text-sm font-semibold">预约专业咨询</p><p className="mt-2 text-sm leading-6 text-slate-500">点击后将前往现有咨询服务入口。</p><a href="/appointment" className="mt-8 flex items-center justify-between bg-[#d6b169] px-5 py-4 text-sm font-semibold transition hover:bg-[#edcf8f]">进入预约咨询 <ArrowRight className="h-4 w-4" /></a><div className="mt-8 border-t border-slate-200 pt-6 text-sm leading-7 text-slate-500"><p className="font-medium text-[#10233f]">天赋大业税务师事务所</p><p>专业服务将根据具体业务情况进行评估与沟通。</p></div></div></div></section>

      <footer className="bg-[#0b192e] py-8 text-sm text-slate-400"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 px-5 sm:flex-row lg:px-8"><span>© {new Date().getFullYear()} 天赋大业税务师事务所</span><span className="flex items-center gap-2"><Scale className="h-4 w-4 text-[#c89b4a]" />专业 · 审慎 · 长期</span></div></footer>
    </main>
  );
}
