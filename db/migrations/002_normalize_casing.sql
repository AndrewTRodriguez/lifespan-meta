-- Normalize longevity_influence to snake_case for consistency with code enums.
-- Run once. Idempotent if values are already normalized.
UPDATE entries
SET longevity_influence = CASE longevity_influence
  WHEN 'Pro-Longevity' THEN 'pro_longevity'
  WHEN 'Anti-Longevity' THEN 'anti_longevity'
  WHEN 'Unclear' THEN 'unclear'
  WHEN 'Necessary for fitness' THEN 'necessary_for_fitness'
  WHEN 'Unannotated' THEN 'unannotated'
  ELSE longevity_influence
END;

-- Sanity check (uncomment to verify after running):
-- SELECT longevity_influence, COUNT(*) FROM entries GROUP BY 1 ORDER BY 2 DESC;
