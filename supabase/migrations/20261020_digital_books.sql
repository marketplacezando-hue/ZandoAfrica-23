-- Produits digitaux / livres numériques : schéma privé et préliminaire.
--
-- Cette migration est volontairement additive et ne modifie ni ne supprime de
-- données métier existantes. L’intégration Moneroo n’est PAS étendue ici :
-- prepare_moneroo_payment/apply_moneroo_verified_payment sont laissées intactes,
-- car leur clonage exact est nécessaire avant d’ajouter le type book_purchase.
-- En conséquence, le parcours de paiement/livraison d’un livre n’est pas prêt
-- à être exposé par l’application après cette migration seule.
--
-- Les clés R2 ci-dessous sont des clés d’objets privées, jamais des URLs. Les
-- URLs signées et les téléchargements doivent rester derrière un Worker/service
-- côté serveur, après vérification d’un entitlement terminé.

-- Une catégorie existante est conservée telle quelle en cas de ré-exécution ou
-- de déploiement sur une base qui aurait déjà provisionné cet identifiant.
INSERT INTO public.categories (id, name, icon, sort_order)
VALUES ('digital-products', 'Produits digitaux', 'BookOpen', 9)
ON CONFLICT (id) DO NOTHING;

-- Le CHECK inline de la migration cœur s’appelle transactions_type_check.
-- Le remplacer conserve tous les types historiques et ajoute uniquement le
-- nouveau type. Aucun montant ou historique de transaction n’est réécrit.
ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_type_check
  CHECK (type IN ('product_listing', 'banner_ad', 'subscription', 'book_purchase'));

-- Catalogue privé d’un livre. Il n’y a volontairement aucune URL publique,
-- aucun contenu binaire et aucune donnée d’accès client dans cette table.
CREATE TABLE IF NOT EXISTS public.digital_books (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  product_id uuid NOT NULL UNIQUE REFERENCES public.products(id) ON DELETE RESTRICT,
  original_key text NOT NULL,
  preview_key text NOT NULL,
  page_count integer NOT NULL CHECK (page_count > 0),
  byte_size bigint NOT NULL CHECK (byte_size > 0),
  content_hash text NOT NULL,
  status text NOT NULL DEFAULT 'pending_payment'
    CHECK (status IN ('published', 'pending_payment', 'expired', 'suspended', 'trashed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT digital_books_original_key_private_check
    CHECK (length(trim(original_key)) BETWEEN 1 AND 1024 AND original_key !~ '://'),
  CONSTRAINT digital_books_preview_key_private_check
    CHECK (length(trim(preview_key)) BETWEEN 1 AND 1024 AND preview_key !~ '://'),
  CONSTRAINT digital_books_content_hash_check
    CHECK (content_hash ~ '^[0-9A-Fa-f]{64}$')
);

COMMENT ON TABLE public.digital_books IS
  'Catalogue privé de livres numériques; original_key et preview_key sont des clés R2 privées, jamais des URLs.';
COMMENT ON COLUMN public.digital_books.original_key IS
  'Clé R2 privée de l’original; ne jamais exposer directement au navigateur.';
COMMENT ON COLUMN public.digital_books.preview_key IS
  'Clé R2 privée de l’aperçu; les URLs temporaires sont émises côté serveur uniquement.';
COMMENT ON COLUMN public.digital_books.content_hash IS
  'Empreinte SHA-256 hexadécimale du contenu original.';
COMMENT ON COLUMN public.digital_books.status IS
  'Cycle de vie aligné sur les statuts de produits existants; ce n’est pas le statut du paiement.';

DROP TRIGGER IF EXISTS digital_books_set_updated_at ON public.digital_books;
CREATE TRIGGER digital_books_set_updated_at
  BEFORE UPDATE ON public.digital_books
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Un entitlement correspond à une transaction distincte. La référence de cet
-- achat est distincte de transactions.reference, ce qui permet plusieurs
-- achats indépendants du même digital_book_id.
CREATE TABLE IF NOT EXISTS public.digital_book_entitlements (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  reference text NOT NULL UNIQUE
    CHECK (length(trim(reference)) BETWEEN 8 AND 160),
  digital_book_id uuid NOT NULL REFERENCES public.digital_books(id) ON DELETE RESTRICT,
  transaction_id uuid NOT NULL UNIQUE REFERENCES public.transactions(id) ON DELETE RESTRICT,
  customer_email text NOT NULL,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL
    CHECK (upper(trim(currency)) IN ('XAF', 'XOF', 'CDF')),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'failed', 'cancelled', 'refunded')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT digital_book_entitlements_email_check
    CHECK (length(customer_email) <= 254 AND customer_email = lower(trim(customer_email))
      AND customer_email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+[.][A-Z]{2,}$')
);

COMMENT ON TABLE public.digital_book_entitlements IS
  'Achats privés, un par transaction; aucune lecture client directe. Le prix/devise doivent correspondre à la transaction validée côté serveur.';
COMMENT ON COLUMN public.digital_book_entitlements.reference IS
  'Référence publique/technique propre à cet achat, distincte de transactions.reference.';
COMMENT ON COLUMN public.digital_book_entitlements.transaction_id IS
  'Transaction serveur source; UNIQUE garantit un entitlement au plus une fois par transaction.';
COMMENT ON COLUMN public.digital_book_entitlements.amount IS
  'Montant copié après validation serveur contre transactions.amount; jamais fourni comme vérité par le client.';
COMMENT ON COLUMN public.digital_book_entitlements.currency IS
  'Devise copiée après validation serveur; limitée aux devises Moneroo déjà acceptées.';

CREATE INDEX IF NOT EXISTS digital_book_entitlements_book_status_idx
  ON public.digital_book_entitlements (digital_book_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS digital_books_product_idx
  ON public.digital_books (product_id);

DROP TRIGGER IF EXISTS digital_book_entitlements_set_updated_at ON public.digital_book_entitlements;
CREATE TRIGGER digital_book_entitlements_set_updated_at
  BEFORE UPDATE ON public.digital_book_entitlements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Contrôle serveur indépendant des droits SQL : même un insert service_role
-- doit référencer une transaction book_purchase et reprendre son email,
-- montant et devise. La mise à jour ultérieure du statut de transaction reste
-- délibérément de la responsabilité du flux Moneroo, non ajouté ici.
CREATE OR REPLACE FUNCTION public.validate_digital_book_entitlement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_tx public.transactions%ROWTYPE;
BEGIN
  NEW.reference := trim(NEW.reference);
  NEW.customer_email := lower(trim(NEW.customer_email));
  NEW.currency := upper(trim(NEW.currency));

  SELECT t.* INTO v_tx
  FROM public.transactions AS t
  WHERE t.id = NEW.transaction_id
  FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction de livre introuvable';
  END IF;
  IF v_tx.type <> 'book_purchase' OR v_tx.item_id <> NEW.digital_book_id::text THEN
    RAISE EXCEPTION 'Transaction incompatible avec ce livre';
  END IF;
  IF v_tx.customer_email IS NULL
     OR lower(trim(v_tx.customer_email)) <> NEW.customer_email THEN
    RAISE EXCEPTION 'Email d’achat différent de la transaction validée';
  END IF;
  IF v_tx.amount <> NEW.amount
     OR upper(trim(v_tx.currency)) <> NEW.currency THEN
    RAISE EXCEPTION 'Montant ou devise différent de la transaction validée';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_digital_book_entitlement() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS digital_book_entitlements_validate_tx ON public.digital_book_entitlements;
CREATE TRIGGER digital_book_entitlements_validate_tx
  BEFORE INSERT OR UPDATE ON public.digital_book_entitlements
  FOR EACH ROW EXECUTE FUNCTION public.validate_digital_book_entitlement();

-- RLS est activé sans politique anon/authenticated : l’absence de politique
-- interdit toute lecture directe. service_role est le seul rôle de table;
-- les administrateurs passent par les fonctions SECURITY DEFINER ci-dessous.
ALTER TABLE public.digital_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digital_book_entitlements ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.digital_books, public.digital_book_entitlements FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.digital_books, public.digital_book_entitlements TO service_role;

-- Insertion contrôlée côté serveur. Cette fonction ne crée pas la transaction
-- et n’appelle pas Moneroo; elle n’est utile qu’après qu’un service de paiement
-- aura créé/validé la transaction book_purchase. Le flux complet reste donc
-- explicitement non fonctionnel tant que les fonctions Moneroo ne sont pas
-- clonées et étendues avec leurs invariants exacts.
CREATE OR REPLACE FUNCTION public.record_digital_book_entitlement(
  p_reference text,
  p_digital_book_id uuid,
  p_transaction_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_id uuid;
  v_tx public.transactions%ROWTYPE;
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Fonction réservée au service de paiement';
  END IF;

  SELECT t.* INTO v_tx
  FROM public.transactions AS t
  WHERE t.id = p_transaction_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction de livre introuvable';
  END IF;
  IF v_tx.type <> 'book_purchase' OR v_tx.item_id <> p_digital_book_id::text THEN
    RAISE EXCEPTION 'Transaction incompatible avec ce livre';
  END IF;
  IF v_tx.customer_email IS NULL THEN
    RAISE EXCEPTION 'Email client absent de la transaction';
  END IF;

  INSERT INTO public.digital_book_entitlements (
    reference, digital_book_id, transaction_id, customer_email, amount, currency, status
  ) VALUES (
    p_reference, p_digital_book_id, p_transaction_id,
    lower(trim(v_tx.customer_email)), v_tx.amount, upper(trim(v_tx.currency)), v_tx.status
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_digital_book_entitlement(text, uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_digital_book_entitlement(text, uuid, uuid) TO service_role;

-- Vues administratives contrôlées : elles ne donnent aucun droit de table à
-- authenticated. La fonction vérifie l’admin actif à chaque appel et expose les
-- clés uniquement à un administrateur authentifié, jamais à anon.
CREATE OR REPLACE FUNCTION public.admin_get_digital_book(p_book_id uuid)
RETURNS TABLE (
  id uuid,
  product_id uuid,
  original_key text,
  preview_key text,
  page_count integer,
  byte_size bigint,
  content_hash text,
  status text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT b.id, b.product_id, b.original_key, b.preview_key, b.page_count,
         b.byte_size, b.content_hash, b.status, b.created_at, b.updated_at
  FROM public.digital_books AS b
  WHERE b.id = p_book_id AND public.is_zando_admin();
$$;

CREATE OR REPLACE FUNCTION public.admin_list_digital_book_entitlements(p_book_id uuid)
RETURNS TABLE (
  id uuid,
  reference text,
  digital_book_id uuid,
  transaction_id uuid,
  customer_email text,
  amount numeric,
  currency text,
  status text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT e.id, e.reference, e.digital_book_id, e.transaction_id,
         e.customer_email, e.amount, e.currency, e.status,
         e.created_at, e.updated_at
  FROM public.digital_book_entitlements AS e
  WHERE e.digital_book_id = p_book_id AND public.is_zando_admin();
$$;

REVOKE ALL ON FUNCTION public.admin_get_digital_book(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_list_digital_book_entitlements(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_digital_book(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_digital_book_entitlements(uuid) TO authenticated;

-- Risques résiduels à traiter dans une migration/fonction ultérieure :
-- 1) prepare_moneroo_payment n’accepte pas encore book_purchase et ne sait pas
--    déterminer le prix du digital_book de façon atomique;
-- 2) apply_moneroo_verified_payment ne passe pas encore l’entitlement à
--    completed ni ne délivre une URL R2 signée;
-- 3) le Worker R2 doit vérifier status=completed et l’entitlement concerné
--    avant chaque téléchargement, avec expiration et audit côté serveur.
-- Cette migration ne marque donc pas la fonctionnalité comme prête.
