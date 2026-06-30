import { createServiceClient } from '../supabase';
import type {
  HomepageSurveyPublicConfigDTO,
  HomepageSurveySubmitDTO,
  HomepageSurveySubmitResponseDTO,
} from '../contracts/homepage-survey';

function required(value: string | undefined, label: string): string {
  const normalized = value?.trim() ?? '';
  if (!normalized) throw new Error(`${label}不能为空`);
  return normalized;
}

function mapTopic(row: Record<string, unknown>, voteCount = 0) {
  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string | null) ?? null,
    sortOrder: Number(row.sort_order ?? 0),
    voteCount,
  };
}

export async function getHomepageSurveyActive(userId?: string): Promise<HomepageSurveyPublicConfigDTO | null> {
  const client = createServiceClient();
  const { data: config, error } = await client
    .from('homepage_survey_configs')
    .select('id,title,description,version')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!config) return null;

  const { data: topics, error: topicsError } = await client
    .from('homepage_survey_topics')
    .select('id,title,description,sort_order')
    .eq('survey_config_id', config.id as string)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (topicsError) throw new Error(topicsError.message);

  const topicRows = (topics ?? []) as Record<string, unknown>[];
  const topicIds = topicRows.map((row) => row.id as string);
  const voteCounts = new Map<string, number>();
  if (topicIds.length > 0) {
    const { data: votes, error: votesError } = await client
      .from('homepage_survey_submission_topics')
      .select('topic_id,homepage_survey_submissions!inner(survey_version)')
      .in('topic_id', topicIds)
      .eq('homepage_survey_submissions.survey_version', config.version as number);
    if (votesError) throw new Error(votesError.message);
    for (const vote of (votes ?? []) as Record<string, unknown>[]) {
      const topicId = vote.topic_id as string;
      voteCounts.set(topicId, (voteCounts.get(topicId) ?? 0) + 1);
    }
  }

  let submittedTopicIds: string[] = [];
  if (userId) {
    const { data: submission, error: submissionError } = await client
      .from('homepage_survey_submissions')
      .select('id')
      .eq('survey_config_id', config.id as string)
      .eq('survey_version', config.version as number)
      .eq('user_id', userId)
      .maybeSingle();
    if (submissionError) throw new Error(submissionError.message);
    if (submission) {
      const { data: selected, error: selectedError } = await client
        .from('homepage_survey_submission_topics')
        .select('topic_id')
        .eq('submission_id', submission.id as string);
      if (selectedError) throw new Error(selectedError.message);
      submittedTopicIds = ((selected ?? []) as Record<string, unknown>[]).map((row) => row.topic_id as string);
    }
  }

  return {
    id: config.id as string,
    title: config.title as string,
    description: (config.description as string | null) ?? null,
    version: Number(config.version ?? 1),
    hasSubmitted: submittedTopicIds.length > 0,
    submittedTopicIds,
    topics: topicRows.map((row) => mapTopic(row, voteCounts.get(row.id as string) ?? 0)),
  };
}

export async function submitHomepageSurvey(userId: string, body: HomepageSurveySubmitDTO): Promise<HomepageSurveySubmitResponseDTO> {
  const client = createServiceClient();
  const topicIds = [...new Set(body.topicIds.filter((id) => typeof id === 'string' && id.trim()).map((id) => id.trim()))];
  if (topicIds.length === 0) throw new Error('请选择至少一个沙龙课题');

  const { data: config, error: configError } = await client
    .from('homepage_survey_configs')
    .select('id,version')
    .eq('id', body.surveyConfigId)
    .maybeSingle();
  if (configError) throw new Error(configError.message);
  if (!config) throw new Error('问卷配置不存在');
  if (Number(config.version) !== body.surveyVersion) throw new Error('问卷版本已更新，请刷新后重试');

  const { data: activeTopics, error: topicsError } = await client
    .from('homepage_survey_topics')
    .select('id')
    .eq('survey_config_id', body.surveyConfigId)
    .eq('is_active', true)
    .in('id', topicIds);
  if (topicsError) throw new Error(topicsError.message);
  if ((activeTopics ?? []).length !== topicIds.length) throw new Error('候选课题不存在或已下架');

  const { data: submission, error } = await client
    .from('homepage_survey_submissions')
    .insert({
      survey_config_id: body.surveyConfigId,
      survey_version: body.surveyVersion,
      user_id: userId,
      name: required(body.name, '姓名'),
      phone: required(body.phone, '手机号'),
      company: required(body.company, '公司名称'),
      industry: required(body.industry, '所属行业'),
      company_size: body.companySize?.trim() || null,
      wechat: body.wechat?.trim() || null,
      contact_time: body.contactTime?.trim() || null,
      note: body.note?.trim() || null,
      source_qr_id: body.sourceQrId?.trim() || null,
    })
    .select('id,created_at')
    .single();
  if (error || !submission) throw new Error(error?.message ?? '问卷提交失败');

  const submissionId = submission.id as string;
  const { error: linkError } = await client
    .from('homepage_survey_submission_topics')
    .insert(topicIds.map((topicId) => ({ submission_id: submissionId, topic_id: topicId })));
  if (linkError) throw new Error(linkError.message);

  await client
    .from('users')
    .update({
      name: body.name.trim(),
      company: body.company.trim(),
      industry: body.industry.trim(),
      size: body.companySize?.trim() || null,
      active_at: new Date().toISOString(),
    })
    .eq('id', userId);

  return {
    id: submissionId,
    surveyConfigId: body.surveyConfigId,
    surveyVersion: body.surveyVersion,
    topicIds,
    submittedAt: submission.created_at as string,
  };
}
