import type { Metadata } from 'next';
import { CorporateHomePage } from '@/components/corporate/corporate-home-page';

export const metadata: Metadata = {
  title: '天赋大业税务师事务所｜让经营决策更从容',
  description: '天赋大业税务师事务所为企业与经营者提供税务咨询、涉税鉴证、税务合规及财税顾问服务。',
};

export default function CorporatePage() {
  return <CorporateHomePage />;
}
