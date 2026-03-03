ALTER TABLE "public"."profiles"
  ALTER COLUMN "tier" SET DEFAULT '씨앗';

UPDATE "public"."profiles"
SET "tier" = CASE "tier"
  WHEN 'Unranked' THEN '씨앗'
  WHEN 'Bronze' THEN '새싹'
  WHEN 'Silver' THEN '묘목'
  WHEN 'Gold' THEN '나무'
  WHEN 'Platinum' THEN '숲'
  WHEN 'Diamond' THEN '거목'
  ELSE "tier"
END
WHERE "tier" IN ('Unranked', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond');
