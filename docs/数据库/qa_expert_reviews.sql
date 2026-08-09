create table if not exists public.qa_expert_reviews (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  qa_record_id uuid null references public.qa_records(id) on delete set null,
  question text not null,
  ai_answer text not null,
  expert_answer text not null,
  review_kind text not null check (review_kind in ('incorrect', 'needs_revision')),
  reason text not null,
  status text not null default 'expert_modified' check (status = 'expert_modified'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists qa_expert_reviews_session_idx
  on public.qa_expert_reviews (session_id, created_at desc);
