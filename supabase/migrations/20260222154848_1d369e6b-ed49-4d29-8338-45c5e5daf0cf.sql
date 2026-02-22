
-- Update game date to 2626, middle of Stern (day 14, month 2)
UPDATE game_calendar SET current_day = 14, current_month = 2, current_year = 2626, updated_at = now();

-- Delete existing holidays to re-seed with proper data
DELETE FROM calendar_events WHERE is_holiday = true;

-- Re-seed holidays with proper descriptions and multi-day support
-- event_day = 0 means "all month" or "any day" (shown at bottom, no specific day marked)

-- Month 1: Oath - Day of First Promise (1st)
INSERT INTO calendar_events (user_id, title, description, event_day, event_month, event_year, is_holiday, is_recurring)
VALUES (NULL, 'Day of First Promise', 'The first day of the new year. Oaths and promises are made.', 1, 1, NULL, true, true);

-- Month 2: Stern - Days of Confession (All month)
INSERT INTO calendar_events (user_id, title, description, event_day, event_month, event_year, is_holiday, is_recurring)
VALUES (NULL, 'Days of Confession', 'The entire month of Stern is devoted to confession and atonement.', 0, 2, NULL, true, true);

-- Month 3: Engineer - Day of the Mind (28th)
INSERT INTO calendar_events (user_id, title, description, event_day, event_month, event_year, is_holiday, is_recurring)
VALUES (NULL, 'Day of the Mind', 'A celebration of intellect, invention, and engineering.', 28, 3, NULL, true, true);

-- Month 4: Miner - Day of the Body (1st)
INSERT INTO calendar_events (user_id, title, description, event_day, event_month, event_year, is_holiday, is_recurring)
VALUES (NULL, 'Day of the Body', 'Honoring physical labor and the strength of the body.', 1, 4, NULL, true, true);

-- Month 5: Retribution - Day of No Mask (11th)
INSERT INTO calendar_events (user_id, title, description, event_day, event_month, event_year, is_holiday, is_recurring)
VALUES (NULL, 'Day of No Mask', 'A day where all deceptions are forbidden.', 11, 5, NULL, true, true);

-- Month 5: Retribution - Day of Shield and Axe (28th)
INSERT INTO calendar_events (user_id, title, description, event_day, event_month, event_year, is_holiday, is_recurring)
VALUES (NULL, 'Day of Shield and Axe', 'The final day of the Season of the Shield. A day of martial celebration.', 28, 5, NULL, true, true);

-- Month 6: Shackles - Day of Shame (21st)
INSERT INTO calendar_events (user_id, title, description, event_day, event_month, event_year, is_holiday, is_recurring)
VALUES (NULL, 'Day of Shame', 'A day of remembrance for past wrongs.', 21, 6, NULL, true, true);

-- Month 7: Trade - Day of Therin (25th)
INSERT INTO calendar_events (user_id, title, description, event_day, event_month, event_year, is_holiday, is_recurring)
VALUES (NULL, 'Day of Therin', 'Honoring Therin, patron of commerce and fair dealing.', 25, 7, NULL, true, true);

-- Month 8: Frippery - Lie Day (1st)
INSERT INTO calendar_events (user_id, title, description, event_day, event_month, event_year, is_holiday, is_recurring)
VALUES (NULL, 'Lie Day', 'The Day of Frippery. A day of mischief, disguise, and sanctioned deception.', 1, 8, NULL, true, true);

-- Month 9: Light - Truth Day (1st)
INSERT INTO calendar_events (user_id, title, description, event_day, event_month, event_year, is_holiday, is_recurring)
VALUES (NULL, 'Truth Day', 'The day after Lie Day. Truth is paramount.', 1, 9, NULL, true, true);

-- Month 10: Navigator - Finder''s Day (any day - use 0)
INSERT INTO calendar_events (user_id, title, description, event_day, event_month, event_year, is_holiday, is_recurring)
VALUES (NULL, 'Finder''s Day', 'A day for explorers and navigators. Can fall on any day of the month.', 0, 10, NULL, true, true);

-- Month 11: Tryst - Baubledays (unofficial, any day - use 0)
INSERT INTO calendar_events (user_id, title, description, event_day, event_month, event_year, is_holiday, is_recurring)
VALUES (NULL, 'Baubledays', 'Unofficial holiday. Gift-giving and romantic gestures throughout the month.', 0, 11, NULL, true, true);

-- Month 12: Destiny - Days of Ease (All month)
INSERT INTO calendar_events (user_id, title, description, event_day, event_month, event_year, is_holiday, is_recurring)
VALUES (NULL, 'Days of Ease', 'The entire month of Destiny is a time of relaxation and reflection.', 0, 12, NULL, true, true);

-- Month 13: Groveling - Grovellerday (4th)
INSERT INTO calendar_events (user_id, title, description, event_day, event_month, event_year, is_holiday, is_recurring)
VALUES (NULL, 'Grovellerday', 'A day of supplication and humility.', 4, 13, NULL, true, true);

-- Month 14: Negotiation - Therin''s Reckondays (25th-28th) - 4 separate days
INSERT INTO calendar_events (user_id, title, description, event_day, event_month, event_year, is_holiday, is_recurring)
VALUES (NULL, 'Therin''s Reckondays', 'The final four days of the year. Debts are settled and accounts reconciled.', 25, 14, NULL, true, true);
INSERT INTO calendar_events (user_id, title, description, event_day, event_month, event_year, is_holiday, is_recurring)
VALUES (NULL, 'Therin''s Reckondays', 'The final four days of the year. Debts are settled and accounts reconciled.', 26, 14, NULL, true, true);
INSERT INTO calendar_events (user_id, title, description, event_day, event_month, event_year, is_holiday, is_recurring)
VALUES (NULL, 'Therin''s Reckondays', 'The final four days of the year. Debts are settled and accounts reconciled.', 27, 14, NULL, true, true);
INSERT INTO calendar_events (user_id, title, description, event_day, event_month, event_year, is_holiday, is_recurring)
VALUES (NULL, 'Therin''s Reckondays', 'The final four days of the year. Debts are settled and accounts reconciled.', 28, 14, NULL, true, true);
