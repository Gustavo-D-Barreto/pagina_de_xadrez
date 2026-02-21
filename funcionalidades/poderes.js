// ═══════════════════════════════════════════════════
//  PODERES — Lista de 6 poderes disponíveis na loja
//  Cada partida a loja exibe 4 deles aleatoriamente.
//  As funcionalidades serão implementadas futuramente.
// ═══════════════════════════════════════════════════

const TODOS_OS_PODERES = [
    {
        id: 'escudo_divino',
        nome: 'Escudo Divino',
        descricao: 'Protege uma de suas peças de ser capturada por um turno inteiro.',
        icone: '🛡️',
        custo: 3,
        // Funcionalidade: será implementada futuramente
        ativo: false
    },
    {
        id: 'teletransporte',
        nome: 'Teletransporte',
        descricao: 'Move qualquer uma de suas peças para qualquer casa vazia do tabuleiro.',
        icone: '✨',
        custo: 4,
        // Funcionalidade: será implementada futuramente
        ativo: false
    },
    {
        id: 'ressurreicao',
        nome: 'Ressurreição',
        descricao: 'Retorna a ultima peça capturada do seu lado de volta ao tabuleiro.',
        icone: '💫',
        custo: 5,
        // Funcionalidade: será implementada futuramente
        ativo: false
    },
    {
        id: 'congela_peca',
        nome: 'Congelar Peça',
        descricao: 'Congela uma peça inimiga por 2 turnos, impedindo seu movimento.',
        icone: '❄️',
        custo: 4,
        // Funcionalidade: será implementada futuramente
        ativo: false
    },
    {
        id: 'explosao',
        nome: 'Explosão',
        descricao: 'Remove todas as peças inimigas em volta de uma peça sua (raio 1).',
        icone: '💥',
        custo: 6,
        // Funcionalidade: será implementada futuramente
        ativo: false
    },
    {
        id: 'duplicar_movimento',
        nome: 'Duplo Turno',
        descricao: 'Permite que você faça dois movimentos consecutivos neste turno.',
        icone: '⚡',
        custo: 5,
        // Funcionalidade: será implementada futuramente
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
