-- Rename existing 'Drug Dealing' quest to 'Bootlegging' and set Medium Risk
UPDATE public.quests
SET title = 'Bootlegging',
    difficulty = 'Medium Risk',
    description = 'Move illicit goods on behalf of a client',
    updated_at = now()
WHERE id = 'c29a6993-c844-484a-97df-d7435831faeb';

-- Insert new High Risk 'Drug Dealing' quest with ~50% more pay
INSERT INTO public.quests (
  title, description, client, difficulty, job_type,
  reward, reward_min, downtime_cost, tags, status, available_quantity
) VALUES (
  'Drug Dealing',
  'Sell illicit materials to a client',
  'The Redcap Gnang',
  'High Risk',
  'commission',
  56, 29, 2,
  ARRAY['Illegal','Ellicit','Streetwise'],
  'active',
  0
);