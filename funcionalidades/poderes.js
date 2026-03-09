// ═══════════════════════════════════════════════════
//  PODERES — Lista de poderes disponíveis na loja
//  Cada partida a loja exibe 4 deles aleatoriamente.
// ═══════════════════════════════════════════════════

// Pontos ganhos ao capturar cada tipo de peça
const PIECE_POINT_VALUES = {
    P: 3,   // Peão
    R: 5,   // Torre
    B: 6,   // Bispo
    N: 7,   // Cavalo
    Q: 12,  // Rainha
    K: 0    // Rei (não pode ser capturado)
};

const TODOS_OS_PODERES = [
    {
        id: 'escudo_covarde',
        nome: 'Escudo Covarde',
        descricao: 'Escolha uma peça sua (exceto o rei) para protegê-la de ser capturada uma vez.',
        icone: '🛡️',
        custo: 20,
        ativo: true
    },
    {
        id: 'espelho',
        nome: 'Espelho',
        descricao: 'Duplica uma peça sua (exceto rei e rainha) em uma casa adjacente vazia.',
        icone: '🪞',
        custo: 6,
        ativo: true
    },
    {
        id: 'sonegar_impostos',
        nome: 'Sonegar Impostos',
        descricao: 'Ganhe o dobro de pontos por 6 turnos.',
        icone: '💰',
        custo: 10,
        ativo: true
    },
    {
        id: 'armadilha',
        nome: 'Armadilha',
        descricao: 'Você escolhe uma célula vazia para colocar uma armadilha em formato de cruz que dura 8 turnos, que destrói qualquer peça que cair lá. Todas desarmam se uma for ativada.',
        icone: '💫',
        custo: 7,
        ativo: true
    },
    {
        id: 'caminho_congelante',
        nome: 'Caminho Congelante',
        descricao: 'Congela uma coluna inteira por 4 turnos, impedindo o adversário de mover peças nela.',
        icone: '❄️',
        custo: 12,
        ativo: true
    },
    {
        id: 'corrente',
        nome: 'Corrente',
        descricao: 'voce escolhe uma peça sua , e puxa a peça inimiga mais proxima verticalmente',
        icone: '💥',
        custo: 8,
        ativo: true
    },
    {
        id: 'fantasma_da_noite',
        nome: 'Fantasma da Noite',
        descricao: 'Escolha uma peça sua (menos rei e rainha), esta peça pode atravessar peças aliadas até o final da partida.',
        icone: '👻',
        custo: 20,
        ativo: true
    },
    {
        id: 'inferno',
        nome: 'Inferno',
        descricao: 'Amaldiçoa todas as suas peças imediatamente.',
        icone: '🔥',
        custo: 25,
        ativo: true
    },
    {
        id: 'sangue_puro',
        nome: 'Sangue Puro',
        descricao: 'enquanto ela estiver no seu inventario , cavalos vao poder capturar uma casa nas diagonais',
        icone: '🩸',
        custo: 16,
        ativo: true
    },
    {
        id: 'visao_preguiçosa',
        nome: 'visão preguiçosa',
        descricao: 'enquanto ela estiver no seu inventario , voce pode ver quais casas do tabuleiro estao na mira de uma peça adversaria',
        icone: '👁️',
        custo: 6,
        ativo: true
    }
];

// Embaralha o array e retorna os primeiros N itens
// Cria um gerador de números quase-aleatórios com base em uma string (semente)
function criarGeradorAleatorio(semente) {
    let t = 0;
    for (let i = 0; i < semente.length; i++) {
        t = Math.imul(t ^ semente.charCodeAt(i), 3432918353);
        t = (t << 13) | (t >>> 19);
    }
    return function () {
        t = Math.imul(t ^ (t >>> 16), 2246822507);
        t = Math.imul(t ^ (t >>> 13), 3266489909);
        return ((t ^= t >>> 16) >>> 0) / 4294967296;
    };
}

// Embaralha o array e retorna os primeiros N itens
function embaralharPoderes(lista, quantidade = 4, seedString = null) {
    const copia = [...lista];
    let geradorAleatorio = Math.random;

    if (seedString) {
        geradorAleatorio = criarGeradorAleatorio(seedString);
    }

    for (let i = copia.length - 1; i > 0; i--) {
        const j = Math.floor(geradorAleatorio() * (i + 1));
        [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    return copia.slice(0, quantidade);
}
