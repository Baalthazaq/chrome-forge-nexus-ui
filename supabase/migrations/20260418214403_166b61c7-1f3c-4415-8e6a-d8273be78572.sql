INSERT INTO public.recurring_payments (to_user_id, from_user_id, amount, description, interval_type, next_send_at, is_active, status, metadata)
SELECT
  CASE WHEN q.posted_by_user_id IS NOT NULL THEN q.posted_by_user_id ELSE qa.user_id END as to_user_id,
  CASE WHEN q.posted_by_user_id IS NOT NULL THEN qa.user_id ELSE NULL END as from_user_id,
  COALESCE(q.reward, 0) as amount,
  q.title || ' (full-time)' as description,
  COALESCE(q.pay_interval, 'daily') as interval_type,
  (now() + interval '1 day') as next_send_at,
  true as is_active,
  'active' as status,
  jsonb_build_object(
    'acceptance_id', qa.id::text,
    'quest_id', q.id::text,
    'item_name', q.title,
    'worker_name', COALESCE((SELECT character_name FROM public.profiles WHERE user_id = qa.user_id), 'Worker'),
    'player_posted', (q.posted_by_user_id IS NOT NULL),
    'pay_interval', COALESCE(q.pay_interval, 'daily'),
    'hours_required', COALESCE(q.downtime_cost, 0),
    'source', 'questseek_full_time',
    'backfilled', true
  ) as metadata
FROM public.quest_acceptances qa
JOIN public.quests q ON q.id = qa.quest_id
WHERE qa.status = 'accepted'
  AND q.job_type = 'full_time'
  AND NOT EXISTS (
    SELECT 1 FROM public.recurring_payments rp
    WHERE rp.metadata->>'acceptance_id' = qa.id::text
  );