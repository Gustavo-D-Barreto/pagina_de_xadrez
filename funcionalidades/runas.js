// ═══════════════════════════════════════════════════════════
//  RUNAS — Sistema de runas passivas escolhidas no perfil
//  Cada jogador equipa 1 runa que dá um bônus passivo
// ═══════════════════════════════════════════════════════════

const TODAS_RUNAS = [
    {
        id: 'azul',
        nome: 'Runa Azul',
        imagem: '../spritesxadrez/sprites/runaazul.png',
        descricao: 'Receba 40% do dinheiro gasto em poderes de volta.',
        icone: '💙'
    },
    {
        id: 'roxa',
        nome: 'Runa Roxa',
        imagem: '../spritesxadrez/sprites/runaroxa.png',
        descricao: 'Enquanto seus peões estiverem na casa original, eles não atrapalham a movimentação das suas outras peças.',
        icone: '💜'
    },
    {
        id: 'vermelha',
        nome: 'Runa Vermelha',
        imagem: '../spritesxadrez/sprites/runavermelha.png',
        descricao: 'Sua rainha renasce na célula original ao morrer. Se ocupada, aguarda até esvaziar.',
        icone: '❤️'
    }
];

// ─── Helpers ─────────────────────────────────────────────────

/** Retorna o objeto de runa pelo id ('azul' | 'roxa' | 'vermelha' | null) */
function getRunaById(id) {
    if (!id) return null;
    return TODAS_RUNAS.find(r => r.id === id) || null;
}

// ─── localStorage helpers (para uso em partida) ──────────────

/** Salva a runa do jogador branco no localStorage */
function salvarRunaLocal(color, runaId) {
    if (color === 'w') localStorage.setItem('xq_runa_w', runaId || '');
    else localStorage.setItem('xq_runa_b', runaId || '');
}

/** Lê a runa do jogador do localStorage. Retorna 'azul'|'roxa'|'vermelha'|null */
function lerRunaLocal(color) {
    const key = color === 'w' ? 'xq_runa_w' : 'xq_runa_b';
    const val = localStorage.getItem(key);
    return val || null;
}

// ─── Mecânica: Runa Azul ─────────────────────────────────────

/**
 * Calcula o reembolso da Runa Azul.
 * Chame após deduzir o custo do poder.
 * @param {number} custo - custo original do poder
 * @returns {number} - pontos a devolver (floor de 40%)
 */
function calcularReembolsoRunaAzul(custo) {
    return Math.floor(custo * 0.4);
}

// ─── Mecânica: Runa Roxa ─────────────────────────────────────

/**
 * Verifica se um peão na casa original é "transparente" para aliados (Runa Roxa).
 * Peões na casa original do jogador que possui a runa roxa não bloqueiam
 * a movimentação das outras peças aliadas.
 * @param {number} row - linha do peão
 * @param {number} col - coluna do peão
 * @param {object} peca - { type: 'P', color: 'w'|'b', ... }
 * @param {string} runaDonoDosPeoes - runa do jogador dono do peão ('roxa' ou outro)
 * @returns {boolean}
 */
function isPawnTransparentByRunaRoxa(row, col, peca, runaDonoDosPeoes) {
    if (!peca || peca.type !== 'P') return false;
    if (runaDonoDosPeoes !== 'roxa') return false;
    // Casa original: brancas na linha 6, pretas na linha 1
    const originalRow = peca.color === 'w' ? 6 : 1;
    return row === originalRow;
}

// ─── Mecânica: Runa Vermelha ──────────────────────────────────

/**
 * Estado da fila de rainhas aguardando renascer (Runa Vermelha).
 * { w: { lin: number, col: number } | null,
 *   b: { lin: number, col: number } | null }
 * lin/col = posição original da rainha (default: d1/d8)
 */
const RainhaRenascer = {
    w: null,
    b: null,

    /** Registra que a rainha da cor dada morreu e deve renascer */
    registrar(color) {
        // Posição original padrão: brancas = linha 7 col 3 (d1), pretas = linha 0 col 3 (d8)
        const linOriginal = color === 'w' ? 7 : 0;
        const colOriginal = 3;
        this[color] = { lin: linOriginal, col: colOriginal };
    },

    /** Tenta renascer a rainha no tabuleiro. Retorna true se renasceu, false se ainda aguarda. */
    tentarRenascer(color, board) {
        const pendente = this[color];
        if (!pendente) return false;
        const { lin, col } = pendente;
        if (board[lin][col] !== null) return false; // célula ainda ocupada
        board[lin][col] = { color, type: 'Q' };
        this[color] = null;
        return true;
    },

    /** Limpa o estado (nova partida) */
    reset() {
        this.w = null;
        this.b = null;
    },

    /** Verifica se há rainha pendente para uma cor */
    temPendente(color) {
        return this[color] !== null;
    }
};
