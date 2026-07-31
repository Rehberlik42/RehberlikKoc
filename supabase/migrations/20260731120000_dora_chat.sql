-- =============================================================================
-- MINDORA: DORA sohbet asistanı (konuşmalar + mesajlar)
-- Öğrenci kendi konuşmalarını okuyup yazabilir (RLS: student_id = auth.uid()).
-- Anamnez / hassas veri bu tablolarda tutulmaz.
-- =============================================================================

create table if not exists public.dora_conversations (
  id bigserial primary key,
  student_id uuid not null references public.profiles(id) on delete cascade,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dora_messages (
  id bigserial primary key,
  conversation_id bigint not null references public.dora_conversations(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_dora_conversations_student
  on public.dora_conversations(student_id);

create index if not exists idx_dora_messages_conversation
  on public.dora_messages(conversation_id);

alter table public.dora_conversations enable row level security;
alter table public.dora_messages enable row level security;

create policy "dora_conversations_all_own_student"
on public.dora_conversations for all to authenticated
using (student_id = auth.uid())
with check (student_id = auth.uid());

create policy "dora_messages_all_own_student"
on public.dora_messages for all to authenticated
using (
  exists (
    select 1
    from public.dora_conversations c
    where c.id = conversation_id
      and c.student_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.dora_conversations c
    where c.id = conversation_id
      and c.student_id = auth.uid()
  )
);
