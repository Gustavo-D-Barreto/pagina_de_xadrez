// ============================================================
//  supabase.js — cliente Supabase centralizado
//  Importado por todas as páginas que precisam do banco
// ============================================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://segetgqdxjwwkyjguzzo.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlZ2V0Z3FkeGp3d2t5amd1enpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2MzIyMjcsImV4cCI6MjA4NzIwODIyN30.4jM7c0mIyiTzpA9wkTOpLjyCWQ6taTab_OjToPx1o10';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

// --------------------------------------------------------
//  Helpers de sessão
// --------------------------------------------------------

/** Retorna o usuário logado, ou null se não tiver sessão */
export async function getSession() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
}

/** Retorna o perfil do usuário logado (da tabela public.profiles) */
export async function getProfile(userId) {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
    if (error) throw error;
    return data;
}

/** Redireciona para login se não tiver sessão ativa */
export async function requireAuth(redirectTo = '../paginas/login.html') {
    const session = await getSession();
    if (!session) {
        window.location.href = redirectTo;
        return null;
    }
    return session;
}

/** Desloga o usuário */
export async function logout() {
    await supabase.auth.signOut();
    window.location.href = '../paginas/login.html';
}
