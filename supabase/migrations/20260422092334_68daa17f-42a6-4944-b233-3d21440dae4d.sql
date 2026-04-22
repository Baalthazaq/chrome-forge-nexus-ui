
-- Strip "Beast Shape: " prefix from names
UPDATE game_cards
SET name = regexp_replace(name, '^Beast Shape:\s*', '')
WHERE source = 'Beast Shape';

-- Clean superfluous asterisks: convert lines like "**Header: body text**" to "**Header:** body text"
-- Only target lines that begin with ** and end with ** wrapping a single colon-led label.
UPDATE game_cards
SET content = regexp_replace(
  content,
  '\*\*([^*\n:]+):\s*([^\n*][^\n]*?)\*\*',
  E'**\\1:** \\2',
  'g'
)
WHERE source = 'Beast Shape';
