-- ============================================================
--  XADREZINHO — SCHEMA SUPABASE  (idempotente — pode rodar várias vezes)
--  Cole no SQL Editor do Supabase e clique em Run
-- ============================================================
-- ============================================================
--  1. TABELA DE PERFIS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT NOT NULL UNIQUE,
    email TEXT,
    pontos INTEGER NOT NULL DEFAULT 0,
    partidas INTEGER NOT NULL DEFAULT 0,
    vitorias INTEGER NOT NULL DEFAULT 0,
    derrotas INTEGER NOT NULL DEFAULT 0,
    avatar_url TEXT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Adiciona coluna email caso a tabela já exista sem ela
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS email TEXT;
COMMENT ON TABLE public.profiles IS 'Perfil público de cada jogador';
COMMENT ON COLUMN public.profiles.id IS 'Mesmo ID do auth.users';
COMMENT ON COLUMN public.profiles.username IS 'Nome de usuário único (exibido no jogo)';
COMMENT ON COLUMN public.profiles.email IS 'E-mail real do jogador (para recuperação)';
COMMENT ON COLUMN public.profiles.pontos IS 'Moedas acumuladas por capturas e vitórias';
COMMENT ON COLUMN public.profiles.partidas IS 'Total de partidas jogadas';
COMMENT ON COLUMN public.profiles.vitorias IS 'Total de vitórias';
COMMENT ON COLUMN public.profiles.derrotas IS 'Total de derrotas';
-- ============================================================
--  2. TRIGGER — cria perfil automaticamente ao cadastrar
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$ BEGIN
INSERT INTO public.profiles (id, username, email)
VALUES (
        NEW.id,
        COALESCE(
            NEW.raw_user_meta_data->>'username',
            SPLIT_PART(NEW.email, '@', 1)
        ),
        NEW.raw_user_meta_data->>'real_email'
    );
RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER
INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
-- ============================================================
--  3. TRIGGER — atualiza 'atualizado_em' automaticamente
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN NEW.atualizado_em = NOW();
RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at BEFORE
UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
-- ============================================================
--  4. ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
-- Remove policies antigas antes de recriar (evita erro 42710)
DROP POLICY IF EXISTS "Perfis visíveis para todos" ON public.profiles;
DROP POLICY IF EXISTS "Usuário insere o próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Usuário edita o próprio perfil" ON public.profiles;
CREATE POLICY "Perfis visíveis para todos" ON public.profiles FOR
SELECT USING (true);
CREATE POLICY "Usuário insere o próprio perfil" ON public.profiles FOR
INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Usuário edita o próprio perfil" ON public.profiles FOR
UPDATE USING (auth.uid() = id);
-- ============================================================
--  5. TABELA DE PARTIDAS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.partidas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    jogador_branco UUID NOT NULL REFERENCES public.profiles(id) ON DELETE
    SET NULL,
        jogador_preto UUID NOT NULL REFERENCES public.profiles(id) ON DELETE
    SET NULL,
        vencedor_id UUID REFERENCES public.profiles(id) ON DELETE
    SET NULL,
        modo TEXT NOT NULL CHECK (modo IN ('online', 'privado', 'local')),
        codigo_sala TEXT UNIQUE,
        status TEXT NOT NULL DEFAULT 'aguardando' CHECK (
            status IN (
                'aguardando',
                'em_andamento',
                'finalizada',
                'cancelada'
            )
        ),
        iniciada_em TIMESTAMPTZ,
        finalizada_em TIMESTAMPTZ,
        criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.partidas IS 'Histórico e estado das partidas';
COMMENT ON COLUMN public.partidas.codigo_sala IS 'Código de 6 letras para salas privadas';
ALTER TABLE public.partidas ENABLE ROW LEVEL SECURITY;
-- Remove policies antigas
DROP POLICY IF EXISTS "Partidas visíveis para todos" ON public.partidas;
DROP POLICY IF EXISTS "Jogadores atualizam a própria partida" ON public.partidas;
DROP POLICY IF EXISTS "Autenticado cria partida" ON public.partidas;
CREATE POLICY "Partidas visíveis para todos" ON public.partidas FOR
SELECT USING (true);
CREATE POLICY "Jogadores atualizam a própria partida" ON public.partidas FOR
UPDATE USING (
        auth.uid() = jogador_branco
        OR auth.uid() = jogador_preto
    );
CREATE POLICY "Autenticado cria partida" ON public.partidas FOR
INSERT WITH CHECK (auth.role() = 'authenticated');
-- ============================================================
--  6. VIEW — ranking global
-- ============================================================
CREATE OR REPLACE VIEW public.ranking AS
SELECT ROW_NUMBER() OVER (
        ORDER BY pontos DESC
    ) AS posicao,
    username,
    pontos,
    vitorias,
    derrotas,
    partidas
FROM public.profiles
ORDER BY pontos DESC;
COMMENT ON VIEW public.ranking IS 'Ranking global dos jogadores por pontos';
-- ============================================================
--  CONCLUÍDO ✓
--    ✓ profiles  — perfis de jogadores (com email)
--    ✓ partidas  — histórico e salas de partidas
--    ✓ ranking   — view do ranking global
--  Idempotente: seguro de rodar múltiplas vezes
-- ============================================================