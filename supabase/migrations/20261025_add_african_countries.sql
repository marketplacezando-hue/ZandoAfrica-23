-- Add the requested African markets to the active country catalogue.
INSERT INTO public.countries (id, name, flag_emoji, dial_code, currency, sort_order)
VALUES
  ('TG', 'Togo', '🇹🇬', '+228', 'XOF', 9),
  ('GA', 'Gabon', '🇬🇦', '+241', 'XAF', 10),
  ('TD', 'Tchad', '🇹🇩', '+235', 'XAF', 11),
  ('GN', 'Guinée', '🇬🇳', '+224', 'GNF', 12)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  flag_emoji = EXCLUDED.flag_emoji,
  dial_code = EXCLUDED.dial_code,
  currency = EXCLUDED.currency,
  sort_order = EXCLUDED.sort_order,
  is_active = true;
