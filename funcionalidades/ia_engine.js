// ═══════════════════════════════════════════════════════════════
//  IA_ENGINE.JS — Motor de xadrez IA 100% JavaScript
//  Roda direto no navegador, sem servidor.
//  Algoritmo: Minimax com Alpha-Beta Pruning + tabelas de posição
//
//  Como usar:
//    const ia = new XadrezIA(difficulty); // 1=fácil, 2=médio, 3=difícil
//    const move = ia.melhorJogada(board, color, castlingRights, enPassantTarget);
//    // move = { fromRow, fromCol, row, col, capture, castle?, enPassant?, promotion? }
// ═══════════════════════════════════════════════════════════════

class XadrezIA {

    constructor(difficulty = 2) {
        this.difficulty = difficulty;
        this.nodesVisited = 0;
    }

    // ── Profundidade por dificuldade ────────────────────────────
    get depth() {
        return { 1: 2, 2: 3, 3: 4 }[this.difficulty] ?? 2;
    }

    // ────────────────────────────────────────────────────────────
    //  ENTRADA PRINCIPAL
    // ────────────────────────────────────────────────────────────
    /**
     * Calcula o melhor movimento para `color` no `board` atual.
     * @param {Array}  board          - board[row][col] = {color,type,...} | null
     * @param {string} color          - 'w' ou 'b'
     * @param {object} castlingRights - { wK, wQ, bK, bQ }
     * @param {object} enPassantTarget- { row, col } ou null
     * @returns {object|null} movimento
     */
    melhorJogada(board, color, castlingRights, enPassantTarget) {
        this.nodesVisited = 0;
        this._castling = { ...castlingRights };
        this._ep = enPassantTarget;

        const allMoves = this._getAllMoves(board, color);
        if (allMoves.length === 0) return null;

        // Nível fácil: 30% de chance de mover aleatório
        if (this.difficulty === 1 && Math.random() < 0.3) {
            return allMoves[Math.floor(Math.random() * allMoves.length)];
        }

        let bestMove = null;
        const isMax = (color === 'w');
        let bestScore = isMax ? -Infinity : Infinity;

        // Ordena capturas primeiro para melhorar a poda
        const ordered = this._orderMoves(board, allMoves);

        for (const move of ordered) {
            const sim = this._applyMove(board, move);
            const score = this._alphabeta(
                sim, this.depth - 1,
                -Infinity, Infinity,
                !isMax,
                { ...castlingRights },
                this._epAfterMove(move)
            );
            if (isMax ? score > bestScore : score < bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }

        console.log(`[IA] Nós visitados: ${this.nodesVisited} | Score: ${bestScore}`);
        return bestMove;
    }

    // ────────────────────────────────────────────────────────────
    //  MINIMAX COM ALPHA-BETA
    // ────────────────────────────────────────────────────────────
    _alphabeta(board, depth, alpha, beta, maximizing, castling, ep) {
        this.nodesVisited++;

        if (depth === 0) return this._evaluate(board);

        const color = maximizing ? 'w' : 'b';
        const moves = this._orderMoves(board, this._getAllMoves(board, color));

        if (moves.length === 0) {
            // Xeque-mate ou afogamento
            if (this._isInCheck(board, color)) {
                return maximizing ? -99999 - depth : 99999 + depth;
            }
            return 0; // afogamento = empate
        }

        if (maximizing) {
            let max = -Infinity;
            for (const m of moves) {
                const sim = this._applyMove(board, m);
                const score = this._alphabeta(sim, depth - 1, alpha, beta, false, castling, this._epAfterMove(m));
                if (score > max) max = score;
                if (score > alpha) alpha = score;
                if (beta <= alpha) break; // poda β
            }
            return max;
        } else {
            let min = Infinity;
            for (const m of moves) {
                const sim = this._applyMove(board, m);
                const score = this._alphabeta(sim, depth - 1, alpha, beta, true, castling, this._epAfterMove(m));
                if (score < min) min = score;
                if (score < beta) beta = score;
                if (beta <= alpha) break; // poda α
            }
            return min;
        }
    }

    // ────────────────────────────────────────────────────────────
    //  AVALIAÇÃO DO TABULEIRO
    // ────────────────────────────────────────────────────────────

    // Valores base das peças
    static PIECE_VALUES = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 20000 };

    // Tabelas de posição (do ponto de vista das brancas)
    static TABLES = {
        P: [
            [0, 0, 0, 0, 0, 0, 0, 0],
            [50, 50, 50, 50, 50, 50, 50, 50],
            [10, 10, 20, 30, 30, 20, 10, 10],
            [5, 5, 10, 25, 25, 10, 5, 5],
            [0, 0, 0, 20, 20, 0, 0, 0],
            [5, -5, -10, 0, 0, -10, -5, 5],
            [5, 10, 10, -20, -20, 10, 10, 5],
            [0, 0, 0, 0, 0, 0, 0, 0],
        ],
        N: [
            [-50, -40, -30, -30, -30, -30, -40, -50],
            [-40, -20, 0, 0, 0, 0, -20, -40],
            [-30, 0, 10, 15, 15, 10, 0, -30],
            [-30, 5, 15, 20, 20, 15, 5, -30],
            [-30, 0, 15, 20, 20, 15, 0, -30],
            [-30, 5, 10, 15, 15, 10, 5, -30],
            [-40, -20, 0, 5, 5, 0, -20, -40],
            [-50, -40, -30, -30, -30, -30, -40, -50],
        ],
        B: [
            [-20, -10, -10, -10, -10, -10, -10, -20],
            [-10, 0, 0, 0, 0, 0, 0, -10],
            [-10, 0, 5, 10, 10, 5, 0, -10],
            [-10, 5, 5, 10, 10, 5, 5, -10],
            [-10, 0, 10, 10, 10, 10, 0, -10],
            [-10, 10, 10, 10, 10, 10, 10, -10],
            [-10, 5, 0, 0, 0, 0, 5, -10],
            [-20, -10, -10, -10, -10, -10, -10, -20],
        ],
        R: [
            [0, 0, 0, 0, 0, 0, 0, 0],
            [5, 10, 10, 10, 10, 10, 10, 5],
            [-5, 0, 0, 0, 0, 0, 0, -5],
            [-5, 0, 0, 0, 0, 0, 0, -5],
            [-5, 0, 0, 0, 0, 0, 0, -5],
            [-5, 0, 0, 0, 0, 0, 0, -5],
            [-5, 0, 0, 0, 0, 0, 0, -5],
            [0, 0, 0, 5, 5, 0, 0, 0],
        ],
        Q: [
            [-20, -10, -10, -5, -5, -10, -10, -20],
            [-10, 0, 0, 0, 0, 0, 0, -10],
            [-10, 0, 5, 5, 5, 5, 0, -10],
            [-5, 0, 5, 5, 5, 5, 0, -5],
            [0, 0, 5, 5, 5, 5, 0, -5],
            [-10, 5, 5, 5, 5, 5, 0, -10],
            [-10, 0, 5, 0, 0, 0, 0, -10],
            [-20, -10, -10, -5, -5, -10, -10, -20],
        ],
        K: [
            [-30, -40, -40, -50, -50, -40, -40, -30],
            [-30, -40, -40, -50, -50, -40, -40, -30],
            [-30, -40, -40, -50, -50, -40, -40, -30],
            [-30, -40, -40, -50, -50, -40, -40, -30],
            [-20, -30, -30, -40, -40, -30, -30, -20],
            [-10, -20, -20, -20, -20, -20, -20, -10],
            [20, 20, 0, 0, 0, 0, 20, 20],
            [20, 30, 10, 0, 0, 10, 30, 20],
        ],
    };

    _evaluate(board) {
        let score = 0;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = board[r][c];
                if (!p) continue;

                const base = XadrezIA.PIECE_VALUES[p.type] ?? 0;
                const tbl = XadrezIA.TABLES[p.type];
                // Brancas leem a tabela de cima pra baixo (r=0 é rank8)
                const tRow = p.color === 'w' ? r : 7 - r;
                const bonus = tbl ? tbl[tRow][c] : 0;

                score += p.color === 'w' ? (base + bonus) : -(base + bonus);
            }
        }
        return score;
    }

    // ────────────────────────────────────────────────────────────
    //  ORDENAÇÃO DE MOVIMENTOS (melhora eficiência da poda)
    // ────────────────────────────────────────────────────────────
    _orderMoves(board, moves) {
        return moves.slice().sort((a, b) => {
            const scoreMove = m => {
                let s = 0;
                // Capturas valem mais (MVV-LVA simplificado)
                if (m.capture) {
                    const victim = board[m.row][m.col];
                    const attacker = board[m.fromRow][m.fromCol];
                    const vVal = victim ? (XadrezIA.PIECE_VALUES[victim.type] ?? 0) : 0;
                    const aVal = attacker ? (XadrezIA.PIECE_VALUES[attacker.type] ?? 0) : 999;
                    s += vVal * 10 - aVal;
                }
                if (m.promotion) s += 800;
                if (m.castle) s += 50;
                return s;
            };
            return scoreMove(b) - scoreMove(a);
        });
    }

    // ────────────────────────────────────────────────────────────
    //  GERAÇÃO DE MOVIMENTOS — reutiliza a lógica do ingamelocal
    // ────────────────────────────────────────────────────────────
    _getAllMoves(board, color) {
        const moves = [];
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = board[r][c];
                if (!p || p.color !== color) continue;
                const pseudo = this._pseudoMoves(board, r, c);
                for (const m of pseudo) {
                    // Filtra movimentos que deixam o próprio rei em xeque
                    const sim = this._applyMove(board, m);
                    if (!this._isInCheck(sim, color)) {
                        moves.push(m);
                    }
                }
            }
        }
        return moves;
    }

    _pseudoMoves(board, r, c) {
        const p = board[r][c];
        if (!p) return [];
        const enemy = p.color === 'w' ? 'b' : 'w';
        const moves = [];

        const add = (row, col, extra = {}) => {
            if (!this._inBounds(row, col)) return;
            const target = board[row][col];
            if (!target) {
                moves.push({ fromRow: r, fromCol: c, row, col, capture: false, ...extra });
            } else if (target.color === enemy) {
                moves.push({ fromRow: r, fromCol: c, row, col, capture: true, ...extra });
            }
        };

        const slide = (dr, dc) => {
            let nr = r + dr, nc = c + dc;
            while (this._inBounds(nr, nc)) {
                const t = board[nr][nc];
                if (!t) {
                    moves.push({ fromRow: r, fromCol: c, row: nr, col: nc, capture: false });
                } else {
                    if (t.color === enemy) {
                        moves.push({ fromRow: r, fromCol: c, row: nr, col: nc, capture: true });
                    }
                    // Ghost atravessa aliadas
                    if (!p.isGhost || t.color === p.color) break;
                }
                nr += dr; nc += dc;
            }
        };

        switch (p.type) {
            case 'P': {
                const dir = p.color === 'w' ? -1 : 1;
                const start = p.color === 'w' ? 6 : 1;

                // Movimentos normais ou estilo rei (maldição)
                if (p.curseUsed) {
                    [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]].forEach(([dr, dc]) => {
                        const nr = r + dr, nc = c + dc;
                        if (this._inBounds(nr, nc) && !board[nr][nc])
                            moves.push({ fromRow: r, fromCol: c, row: nr, col: nc, capture: false });
                    });
                } else {
                    if (this._inBounds(r + dir, c) && !board[r + dir][c]) {
                        this._addPawnMove(moves, r, c, r + dir, c, false, p.color);
                        if (r === start && !board[r + 2 * dir][c])
                            moves.push({ fromRow: r, fromCol: c, row: r + 2 * dir, col: c, capture: false });
                    }
                }
                // Capturas diagonais
                for (const dc of [-1, 1]) {
                    const nr = r + dir, nc = c + dc;
                    if (!this._inBounds(nr, nc)) continue;
                    if (board[nr][nc] && board[nr][nc].color === enemy)
                        this._addPawnMove(moves, r, c, nr, nc, true, p.color);
                    // En passant
                    if (this._ep && this._ep.row === nr && this._ep.col === nc)
                        moves.push({ fromRow: r, fromCol: c, row: nr, col: nc, capture: true, enPassant: true });
                }
                break;
            }
            case 'N':
                [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]].forEach(([dr, dc]) => add(r + dr, c + dc));
                break;
            case 'R':
                [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dr, dc]) => slide(dr, dc));
                break;
            case 'B':
                [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([dr, dc]) => slide(dr, dc));
                break;
            case 'Q':
                [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([dr, dc]) => slide(dr, dc));
                break;
            case 'K': {
                [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]].forEach(([dr, dc]) => add(r + dr, c + dc));
                // Roque
                const cr = p.color === 'w' ? 7 : 0;
                if (r === cr && c === 4) {
                    const cr_ = this._castling;
                    if (cr_ && cr_[p.color + 'K'] && !board[cr][5] && !board[cr][6]
                        && !this._sqAttacked(board, cr, 4, enemy)
                        && !this._sqAttacked(board, cr, 5, enemy)
                        && !this._sqAttacked(board, cr, 6, enemy))
                        moves.push({ fromRow: r, fromCol: c, row: cr, col: 6, capture: false, castle: 'K' });
                    if (cr_ && cr_[p.color + 'Q'] && !board[cr][1] && !board[cr][2] && !board[cr][3]
                        && !this._sqAttacked(board, cr, 4, enemy)
                        && !this._sqAttacked(board, cr, 3, enemy)
                        && !this._sqAttacked(board, cr, 2, enemy))
                        moves.push({ fromRow: r, fromCol: c, row: cr, col: 2, capture: false, castle: 'Q' });
                }
                break;
            }
        }
        return moves;
    }

    _addPawnMove(moves, fr, fc, tr, tc, capture, color) {
        const isPromo = (color === 'w' && tr === 0) || (color === 'b' && tr === 7);
        if (isPromo) {
            // Sempre promove para rainha na avaliação
            moves.push({ fromRow: fr, fromCol: fc, row: tr, col: tc, capture, promotion: 'Q' });
        } else {
            moves.push({ fromRow: fr, fromCol: fc, row: tr, col: tc, capture });
        }
    }

    // ────────────────────────────────────────────────────────────
    //  APLICAR MOVIMENTO (não muta o board original)
    // ────────────────────────────────────────────────────────────
    _applyMove(board, move) {
        // Deep copy rasa (suficiente — objetos de peça são imutáveis durante a simulação)
        const sim = board.map(row => row.slice());
        const piece = sim[move.fromRow][move.fromCol];
        if (!piece) return sim;

        sim[move.row][move.col] = piece;
        sim[move.fromRow][move.fromCol] = null;

        // En passant
        if (move.enPassant) {
            const epRow = piece.color === 'w' ? move.row + 1 : move.row - 1;
            sim[epRow][move.col] = null;
        }

        // Roque
        if (move.castle === 'K') {
            sim[move.row][5] = sim[move.row][7];
            sim[move.row][7] = null;
        } else if (move.castle === 'Q') {
            sim[move.row][3] = sim[move.row][0];
            sim[move.row][0] = null;
        }

        // Promoção
        if (move.promotion) {
            sim[move.row][move.col] = { ...piece, type: move.promotion };
        }

        return sim;
    }

    _epAfterMove(move) {
        // Retorna novo en passant target após um avanço de 2 casas de peão
        const piece = null; // simplificado — sem ep em simulações internas
        return null;
    }

    // ────────────────────────────────────────────────────────────
    //  XEQUE
    // ────────────────────────────────────────────────────────────
    _isInCheck(board, color) {
        const enemy = color === 'w' ? 'b' : 'w';
        let kr = -1, kc = -1;
        for (let r = 0; r < 8; r++)
            for (let c = 0; c < 8; c++)
                if (board[r][c]?.type === 'K' && board[r][c]?.color === color) { kr = r; kc = c; }
        if (kr === -1) return false;
        return this._sqAttacked(board, kr, kc, enemy);
    }

    _sqAttacked(board, tr, tc, byColor) {
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = board[r][c];
                if (!p || p.color !== byColor) continue;
                if (this._attacks(board, r, c, tr, tc)) return true;
            }
        }
        return false;
    }

    _attacks(board, r, c, tr, tc) {
        const p = board[r][c];
        if (!p) return false;
        const dr = tr - r, dc = tc - c;
        const dir = p.color === 'w' ? -1 : 1;

        switch (p.type) {
            case 'P': return dr === dir && Math.abs(dc) === 1;
            case 'N': return (Math.abs(dr) === 2 && Math.abs(dc) === 1) || (Math.abs(dr) === 1 && Math.abs(dc) === 2);
            case 'K': return Math.abs(dr) <= 1 && Math.abs(dc) <= 1;
            case 'R': return this._slideAttacks(board, r, c, tr, tc, [[0, 1], [0, -1], [1, 0], [-1, 0]]);
            case 'B': return this._slideAttacks(board, r, c, tr, tc, [[1, 1], [1, -1], [-1, 1], [-1, -1]]);
            case 'Q': return this._slideAttacks(board, r, c, tr, tc, [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]]);
        }
        return false;
    }

    _slideAttacks(board, r, c, tr, tc, dirs) {
        const p = board[r][c];
        for (const [dr, dc] of dirs) {
            let nr = r + dr, nc = c + dc;
            while (this._inBounds(nr, nc)) {
                if (nr === tr && nc === tc) return true;
                const t = board[nr][nc];
                if (t) {
                    if (p.isGhost && t.color === p.color) { nr += dr; nc += dc; continue; }
                    break;
                }
                nr += dr; nc += dc;
            }
        }
        return false;
    }

    _inBounds(r, c) { return r >= 0 && r < 8 && c >= 0 && c < 8; }
}