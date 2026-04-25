-- Clamp Trinker's over-banked Drug Dealing acceptance to the per-job cost
-- (banked 20h on a 2h/job, 2-available quest before the server-side cap was added)
UPDATE quest_acceptances
SET hours_logged = 2
WHERE id = '49dc2617-46bb-4c67-b889-a4986b8c9b89'
  AND status = 'accepted';