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
        custo: 5,
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
        id: 'buraco_negro',
        nome: 'Buraco Negro',
        descricao: 'voce escolhe uma celula vazia do tabuleiro para colocar um buraco negro,que destroi qualquer peça que cair la.',
        icone: '💫',
        custo: 5,
        ativo: false
    },
    {
        id: 'caminho_congelante',
        nome: 'Caminho Congelante',
        descricao: 'Congela uma coluna inteira por 3 turnos, impedindo o adversário de mover peças nela.',
        icone: '❄️',
        custo: 10,
        ativo: true
    },
    {
        id: 'corrente',
        nome: 'Corrente',
        descricao: 'voce escolhe uma peça sua , e puxa a peça inimiga mais proxima verticalmente',
        icone: '💥',
        custo: 6,
        ativo: false
    }
];

// Embaralha o array e retorna os primeiros N itens
function embaralharPoderes(lista, quantidade = 4) {
    const copia = [...lista];
    for (let i = copia.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    return copia.slice(0, quantidade);
}
