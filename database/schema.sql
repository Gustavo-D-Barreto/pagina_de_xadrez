-- ============================================================
--  XADREZINHO — SCHEMA SUPABASE
--  Cole este código no SQL Editor do Supabase e clique em Run
-- ============================================================
-- ============================================================
--  1. TABELA DE PERFIS
--     Vinculada ao sistema de auth do Supabase (auth.users).
--     Criada automaticamente quando o usuário se registra.
-- ============================================================ 
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT NOT NULL UNIQUE,
    pontos INTEGER NOT NULL DEFAULT 0,
    partidas INTEGER NOT NULL DEFAULT 0,
    vitorias INTEGER NOT NULL DEFAULT 0,
    derrotas INTEGER NOT NULL DEFAULT 0,
    avatar_url TEXT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Comentários de coluna (documentação)
COMMENT ON TABLE public.profiles IS 'Perfil público de cada jogador';
COMMENT ON COLUMN public.profiles.id IS 'Mesmo ID do auth.users';
COMMENT ON COLUMN public.profiles.username IS 'Nome de usuário único (exibido no jogo)';
COMMENT ON COLUMN public.profiles.pontos IS 'Moedas acumuladas por capturas e vitórias';
COMMENT ON COLUMN public.profiles.partidas IS 'Total de partidas jogadas';
COMMENT ON COLUMN public.profiles.vitorias IS 'Total de vitórias';
COMMENT ON COLUMN public.profiles.derrotas IS 'Total de derrotas';
-- ============================================================
--  2. TRIGGER — cria perfil automaticamente ao cadastrar
--     Pega o email / metadata e cria a linha em profiles.
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$ BEGIN
INSERT INTO public.profiles (id, username)
VALUES (
        NEW.id,
        -- usa o username passado nos metadados; se não tiver, usa a parte antes do @ do e-mail
        COALESCE(
            NEW.raw_user_meta_data->>'username',
            SPLIT_PART(NEW.email, '@', 1)
        )
    );
RETURN NEW;
END;
$$;
-- Remove trigger antigo se existir e recria
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
--  4. ROW LEVEL SECURITY (RLS) — SEGURANÇA
--     Cada jogador só pode editar o PRÓPRIO perfil.
--     Qualquer um pode LER perfis (para placar, lobby, etc).
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
-- Leitura: qualquer pessoa autenticada pode ver perfis
CREATE POLICY "Perfis visíveis para todos" ON public.profiles FOR
SELECT USING (true);
-- Inserção: o próprio usuário cria seu perfil (via trigger)
CREATE POLICY "Usuário insere o próprio perfil" ON public.profiles FOR
INSERT WITH CHECK (auth.uid() = id);
-- Atualização: só o dono do perfil pode editar
CREATE POLICY "Usuário edita o próprio perfil" ON public.profiles FOR
UPDATE USING (auth.uid() = id);
-- ============================================================
--  5. TABELA DE PARTIDAS (histórico)
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
        -- código de sala privada (nullable)
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
-- RLS para partidas
ALTER TABLE public.partidas ENABLE ROW LEVEL SECURITY;
-- Todos podem ver partidas (para lobby / status)
CREATE POLICY "Partidas visíveis para todos" ON public.partidas FOR
SELECT USING (true);
-- Somente jogadores da partida podem atualizar
CREATE POLICY "Jogadores atualizam a própria partida" ON public.partidas FOR
UPDATE USING (
        auth.uid() = jogador_branco
        OR auth.uid() = jogador_preto
    );
-- Qualquer autenticado pode criar uma partida
CREATE POLICY "Autenticado cria partida" ON public.partidas FOR
INSERT WITH CHECK (auth.role() = 'authenticated');
-- ============================================================
--  6. VIEW ÚTIL — ranking de jogadores por pontos
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
--  PRONTO! Tabelas criadas:
--    ✓ profiles  — dados do perfil de cada jogador
--    ✓ partidas  — histórico/salas de partidas
--    ✓ ranking   — view do ranking global
--  Triggers:
--    ✓ on_auth_user_created — cria perfil ao registrar
--    ✓ trg_profiles_updated_at — mantém timestamp
-- ============================================================