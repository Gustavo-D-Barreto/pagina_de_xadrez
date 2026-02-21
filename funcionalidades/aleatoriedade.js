// ═══════════════════════════════════════════════════
//  ALEATORIEDADE.JS
//  Eventos aleatórios do jogo: Moeda e Meteoro
//  Requer que as variáveis globais do jogo estejam
//  acessíveis (board, pointsW, pointsB, showToast, render)
// ═══════════════════════════════════════════════════

// ───────────────────────────────────────────────────
//  Estado — Moeda
// ───────────────────────────────────────────────────
let moedaTurnCounter = 0;   // Conta turnos desde a última captura
let moedaCell = null;       // { row, col } ou null

// ───────────────────────────────────────────────────
//  Estado — Meteoro
// ───────────────────────────────────────────────────
let meteoroTurnCounter = 0; // Conta turnos desde o último impacto
let meteoroWarning = null;  // { row, col, turnsLeft } ou null
//   row,col = canto superior-esquerdo da zona 2×2

// ───────────────────────────────────────────────────
//  Init — chamado em initBoard()
// ───────────────────────────────────────────────────
function initAleatoriedade() {
    moedaTurnCounter = 0;
    moedaCell = null;
    meteoroTurnCounter = 0;
    meteoroWarning = null;
}

// ───────────────────────────────────────────────────
//  Tick — chamado após cada meio-turno (executeMove)
//  color = cor do jogador que acabou de mover
// ───────────────────────────────────────────────────
function tickEventos(color) {
    // --- Moeda ---
    if (moedaCell === null) {
        moedaTurnCounter++;
        if (moedaTurnCounter >= 5) {
            spawnMoeda();
            moedaTurnCounter = 0;
        }
    }

    // --- Meteoro ---
    meteoroTurnCounter++;

    if (meteoroWarning !== null) {
        // Já existe um aviso: diminui contagem
        meteoroWarning.turnsLeft--;
        if (meteoroWarning.turnsLeft <= 0) {
            triggerMeteoro();
        }
    } else if (meteoroTurnCounter >= 12) {
        // Hora de agendar um meteoro
        scheduleMeteoro();
        meteoroTurnCounter = 0;
    }
}

// ───────────────────────────────────────────────────
//  MOEDA
// ───────────────────────────────────────────────────
function spawnMoeda() {
    // Coleta todas as células vazias
    const emptyCells = [];
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (!board[r][c]) emptyCells.push({ row: r, col: c });
        }
    }
    if (emptyCells.length === 0) return;
    moedaCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
}

/**
 * Deve ser chamado em executeMove() ANTES de mudar o turno,
 * passando a posição de destino e a cor de quem moveu.
 */
function checkMoedaCapture(toRow, toCol, color) {
    if (!moedaCell) return;
    if (moedaCell.row === toRow && moedaCell.col === toCol) {
        // Capturou a moeda!
        if (color === 'w') pointsW += 10;
        else pointsB += 10;
        moedaCell = null;
        moedaTurnCounter = 0; // Reinicia contagem
        showToast('🪙 +10 moedas!');
    }
}

// ───────────────────────────────────────────────────
//  METEORO
// ───────────────────────────────────────────────────
function scheduleMeteoro() {
    // Zona válida: linhas a3–h6 => rows 2 a 5 (0-indexed).
    // A zona 2×2 pode começar em row 2..4 e col 0..6
    const row = 2 + Math.floor(Math.random() * 3); // 2, 3 ou 4
    const col = Math.floor(Math.random() * 7);      // 0 a 6
    meteoroWarning = { row, col, turnsLeft: 3 };
    showToast('☄️ Um meteoro se aproxima!');
}

function triggerMeteoro() {
    if (!meteoroWarning) return;
    const { row, col } = meteoroWarning;
    let hit = 0;

    for (let dr = 0; dr < 2; dr++) {
        for (let dc = 0; dc < 2; dc++) {
            const r = row + dr;
            const c = col + dc;
            if (r >= 0 && r < 8 && c >= 0 && c < 8) {
                if (board[r][c]) {
                    // Remove a peça (sem conceder pontos)
                    board[r][c] = null;
                    // Remove escudo, se houver
                    if (typeof shieldedPieces !== 'undefined') {
                        delete shieldedPieces[`${r},${c}`];
                    }
                    hit++;
                }
            }
        }
    }

    meteoroWarning = null;
    meteoroTurnCounter = 0;

    if (hit > 0) showToast(`☄️ Meteoro atingiu! ${hit} peça(s) destruída(s)!`);
    else showToast('☄️ Meteoro caiu, mas a área estava vazia!');
}

// ───────────────────────────────────────────────────
//  RENDER OVERLAY — Moeda
//  Chame dentro de render() após montar as .sq
// ───────────────────────────────────────────────────
function renderMoedaOverlay() {
    if (!moedaCell) return;
    const grid = document.getElementById('boardGrid');
    const squares = grid.querySelectorAll('.sq');
    squares.forEach(sq => {
        if (+sq.dataset.row === moedaCell.row && +sq.dataset.col === moedaCell.col) {
            const img = document.createElement('img');
            img.src = '../spritesxadrez/sprites/moeda.png';
            img.className = 'coin-img';
            img.alt = 'Moeda';
            sq.appendChild(img);
        }
    });
}

// ───────────────────────────────────────────────────
//  RENDER OVERLAY — Meteoro
//  Chame dentro de render() após montar as .sq
// ───────────────────────────────────────────────────
function renderMeteoroOverlay() {
    if (!meteoroWarning) return;
    const { row, col, turnsLeft } = meteoroWarning;
    const isImminent = turnsLeft <= 1;
    const grid = document.getElementById('boardGrid');
    const squares = grid.querySelectorAll('.sq');

    squares.forEach(sq => {
        const r = +sq.dataset.row;
        const c = +sq.dataset.col;
        if (r >= row && r < row + 2 && c >= col && c < col + 2) {
            sq.classList.add(isImminent ? 'meteor-imminent' : 'meteor-warning');

            // Badge de aviso
            const badge = document.createElement('div');
            badge.className = 'meteor-badge';
            badge.textContent = isImminent ? '☄️' : `☄️${turnsLeft}`;
            sq.appendChild(badge);
        }
    });
}
