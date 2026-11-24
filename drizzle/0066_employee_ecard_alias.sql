ALTER TABLE hero_employees ADD COLUMN IF NOT EXISTS business_card_public_alias text UNIQUE;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION allocate_employee_ecard_alias(employee_id integer) RETURNS text
LANGUAGE plpgsql VOLATILE SET search_path FROM CURRENT AS $$
DECLARE
  existing text;
  employee_name text;
  normalized text;
  parts text[];
  stem text;
  suffix text;
  candidate text;
  attempt integer;
BEGIN
  SELECT business_card_public_alias, name INTO existing, employee_name
  FROM hero_employees WHERE id = employee_id AND business_card_public_enabled AND is_active
    AND employment_status <> 'inactive' FOR UPDATE;
  IF NOT FOUND OR existing IS NOT NULL THEN RETURN existing; END IF;
  normalized := trim(both '-' from regexp_replace(lower(normalize(employee_name, NFKD)), U&'[\0300-\036f]', '', 'g'));
  normalized := trim(both '-' from regexp_replace(normalized, '[^a-z0-9]+', '-', 'g'));
  parts := string_to_array(normalized, '-');
  stem := normalized;
  IF length(stem) > 24 AND cardinality(parts) > 2 THEN
    stem := parts[1] || '-' || parts[cardinality(parts)];
  END IF;
  IF length(stem) > 24 THEN
    stem := trim(trailing '-' from left(stem, 24));
    IF strpos(stem, '-') > 0 AND substring(normalized, 25, 1) <> '-' THEN
      stem := regexp_replace(stem, '-[^-]+$', '');
    END IF;
  END IF;
  IF stem IS NULL OR stem = '' THEN stem := 'ecard'; END IF;
  FOR attempt IN 0..99 LOOP
    suffix := CASE WHEN attempt = 0 THEN '' ELSE '-' || left(md5(employee_id::text || ':' || attempt::text), 5) END;
    candidate := trim(trailing '-' from left(stem, 24 - length(suffix))) || suffix;
    BEGIN
      UPDATE hero_employees SET business_card_public_alias = candidate WHERE id = employee_id;
      RETURN candidate;
    EXCEPTION WHEN unique_violation THEN
      -- Another transaction already allocated the candidate. Try the next suffix.
    END;
  END LOOP;
  RAISE EXCEPTION 'Unable to allocate employee e-card alias';
END;
$$;
--> statement-breakpoint
SELECT allocate_employee_ecard_alias(id) FROM hero_employees
WHERE business_card_public_enabled AND is_active AND employment_status <> 'inactive'
  AND business_card_public_alias IS NULL ORDER BY id;
