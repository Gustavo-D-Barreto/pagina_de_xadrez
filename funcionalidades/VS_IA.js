// ═══════════════════════════════════════════════════════════════
//  VS_IA.JS — Módulo cliente para partida contra a IA Python
//  Conecta via Socket.IO ao server.py
//
//  Como usar no seu HTML:
//    <script src="https://cdn.socket.io/4.7.5/socket.io.min.js"></script>
//    <script src="vs_ia.js"></script>
//
//  E no código do jogo:
//    const ia = new XadrezVsIA({ ... });
// ═══════════════════════════════════════════════════════════════

class XadrezVsIA {
    /**
     * @param {object} config
     * @param {string}   config.serverUrl      - URL do servidor Python (default: 'https://localhost:5000')
     * @param {string}   config.playerColor    - 'w' (brancas) ou 'b' (pretas)
     * @param {number}   config.difficulty     - 1=fácil, 2=médio, 3=difícil
     * @param {function} config.onBoardUpdate  - cb(board) chamado após cada jogada
     * @param {function} config.onGameOver     - cb({status, message, board})
     * @param {function} config.onCheck        - cb() chamado quando há xeque
     * @param {function} config.onError        - cb(message) para erros
     * @param {function} config.onAIThinking   - cb(bool) true=IA pensando, false=terminou
     * @param {function} config.onHint         - cb({from, to}) dica de movimento
     * @param {function} config.showToast      - cb(msg) para notificações visuais
     */
    constructor(config = {}) {
        this.serverUrl = config.serverUrl || 'https://localhost:5000';
        this.playerColor = config.playerColor || 'w';
        this.difficulty = config.difficulty || 2;

        // Callbacks
        this.onBoardUpdate = config.onBoardUpdate || (() => { });
        this.onGameOver = config.onGameOver || (() => { });
        this.onCheck = config.onCheck || (() => { });
        this.onError = config.onError || ((msg) => console.error('[IA]', msg));
        this.onAIThinking = config.onAIThinking || (() => { });
        this.onHint = config.onHint || (() => { });
        this.showToast = config.showToast || ((msg) => console.log('[Toast]', msg));

        // Estado local
        this.socket = null;
        this.board = null;
        this.currentTurn = 'w';
        this.gameActive = false;
        this.selectedSquare = null;
        this.legalMoves = [];
        this.lastMove = null;

        this._connect();
    }

    // ─────────────────────────────────────────────────────────
    //  Conexão
    // ─────────────────────────────────────────────────────────

    _connect() {
        if (typeof io === 'undefined') {
            console.error('[XadrezVsIA] Socket.IO não encontrado. Adicione o script no HTML.');
            return;
        }

        this.socket = io(this.serverUrl, { transports: ['websocket', 'polling'] });

        this.socket.on('connect', () => {
            console.log('[IA] Conectado ao servidor.');
        });

        this.socket.on('connected', (data) => {
            console.log('[IA] Sessão:', data.sid);
        });

        this.socket.on('disconnect', () => {
            console.log('[IA] Desconectado.');
            this.gameActive = false;
        });

        this.socket.on('game_started', (data) => {
            console.log('[IA] Partida iniciada:', data);
            this.board = data.board;
            this.currentTurn = data.turn;
            this.gameActive = true;
            this.playerColor = data.player_color;
            this.onBoardUpdate(this.board, { turn: data.turn });
        });

        this.socket.on('legal_moves', (data) => {
            this.legalMoves = data.moves;
            this._highlightLegalMoves(data.moves, data.row, data.col);
        });

        this.socket.on('move_result', (data) => {
            this._handleMoveResult(data);
        });

        this.socket.on('game_over', (data) => {
            this.gameActive = false;
            this.onAIThinking(false);
            this.onGameOver(data);
            this.showToast(data.message);
        });

        this.socket.on('hint', (data) => {
            this.onHint(data);
            // Pisca a peça sugerida
            this._flashSquare(data.from.row, data.from.col, '#00ff88');
            setTimeout(() => this._flashSquare(data.to.row, data.to.col, '#00ff88'), 400);
        });

        this.socket.on('board_state', (data) => {
            this.board = data.board;
            this.currentTurn = data.turn;
            this.onBoardUpdate(this.board, data);
        });

        this.socket.on('error', (data) => {
            this.onError(data.message);
            this.showToast('⚠️ ' + data.message);
        });
    }

    // ─────────────────────────────────────────────────────────
    //  API Pública
    // ─────────────────────────────────────────────────────────

    /** Inicia nova partida */
    startGame(playerColor = null, difficulty = null) {
        if (playerColor) this.playerColor = playerColor;
        if (difficulty) this.difficulty = difficulty;

        this.selectedSquare = null;
        this.legalMoves = [];
        this.lastMove = null;

        this.socket.emit('start_game', {
            player_color: this.playerColor,
            difficulty: this.difficulty,
        });
    }

    /**
     * Chamado quando o jogador clica em uma casa do tabuleiro.
     * Gerencia seleção de peça → mostrar movimentos → executar jogada.
     * @param {number} row
     * @param {number} col
     * @param {string} [promotion='q'] - peça para promoção se necessário
     */
    handleSquareClick(row, col, promotion = 'q') {
        if (!this.gameActive) return;
        if (this.currentTurn !== this.playerColor) return; // Turno da IA

        const piece = this.board && this.board[row] && this.board[row][col];

        // Caso 1: Nenhuma peça selecionada — seleciona se for do jogador
        if (!this.selectedSquare) {
            if (piece && piece.color === this.playerColor) {
                this.selectedSquare = { row, col };
                this.socket.emit('get_legal_moves', { row, col });
            }
            return;
        }

        // Caso 2: Clicou na mesma peça — deseleciona
        if (this.selectedSquare.row === row && this.selectedSquare.col === col) {
            this._clearSelection();
            return;
        }

        // Caso 3: Clicou em outra peça própria — muda seleção
        if (piece && piece.color === this.playerColor) {
            this._clearSelection();
            this.selectedSquare = { row, col };
            this.socket.emit('get_legal_moves', { row, col });
            return;
        }

        // Caso 4: Destino selecionado — verifica se é legal e envia
        const isLegal = this.legalMoves.some(m => m.row === row && m.col === col);
        if (!isLegal) {
            this._clearSelection();
            return;
        }

        // Envia o movimento
        this.socket.emit('player_move', {
            from_row: this.selectedSquare.row,
            from_col: this.selectedSquare.col,
            to_row: row,
            to_col: col,
            promotion: promotion,
        });

        this._clearSelection();
        this.onAIThinking(true);
    }

    /** Solicita dica de movimento à IA */
    requestHint() {
        if (!this.gameActive || this.currentTurn !== this.playerColor) return;
        this.socket.emit('request_hint');
    }

    /** Jogador desiste */
    resign() {
        if (!this.gameActive) return;
        if (!confirm('Deseja realmente desistir?')) return;
        this.socket.emit('resign');
    }

    /** Sincroniza o tabuleiro com o servidor */
    syncBoard() {
        this.socket.emit('get_board');
    }

    /** Desconecta do servidor */
    disconnect() {
        if (this.socket) this.socket.disconnect();
    }

    // ─────────────────────────────────────────────────────────
    //  Handlers internos
    // ─────────────────────────────────────────────────────────

    _handleMoveResult(data) {
        this.board = data.board;
        this.currentTurn = data.turn;
        this.lastMove = { uci: data.move_uci, by: data.moved_by };

        this.onAIThinking(false);

        // Sons e notificações
        if (data.is_checkmate) {
            this.showToast(data.moved_by === 'player' ? '♟️ Xeque-mate! Você venceu!' : '☠️ Xeque-mate! IA venceu!');
        } else if (data.is_stalemate) {
            this.showToast('🤝 Empate por afogamento!');
        } else if (data.is_check) {
            this.showToast('⚠️ Xeque!');
            this.onCheck();
        }

        if (data.is_castling) this.showToast('🏰 Roque!');
        if (data.is_en_passant) this.showToast('🎯 En passant!');
        if (data.captured) this.showToast(`⚔️ Peça capturada: ${this._pieceName(data.captured)}`);
        if (data.promotion) this.showToast(`♛ Promoção para ${this._pieceName(data.promoted_to)}!`);

        this.onBoardUpdate(this.board, {
            turn: data.turn,
            is_check: data.is_check,
            is_checkmate: data.is_checkmate,
            moved_by: data.moved_by,
            last_move: data.move_uci,
        });
    }

    _clearSelection() {
        this.selectedSquare = null;
        this.legalMoves = [];
        document.querySelectorAll('.sq').forEach(sq => {
            sq.classList.remove('selected', 'legal-move', 'legal-capture');
        });
    }

    _highlightLegalMoves(moves, fromRow, fromCol) {
        // Remove highlights antigos
        this._clearSelection();
        this.legalMoves = moves;

        // Destaca a casa selecionada
        const selSq = this._getSquareEl(fromRow, fromCol);
        if (selSq) selSq.classList.add('selected');

        // Destaca destinos legais
        moves.forEach(({ row, col }) => {
            const sq = this._getSquareEl(row, col);
            if (!sq) return;
            const hasPiece = this.board && this.board[row] && this.board[row][col];
            sq.classList.add(hasPiece ? 'legal-capture' : 'legal-move');
        });
    }

    _getSquareEl(row, col) {
        return document.querySelector(`.sq[data-row="${row}"][data-col="${col}"]`);
    }

    _flashSquare(row, col, color) {
        const sq = this._getSquareEl(row, col);
        if (!sq) return;
        const prev = sq.style.outline;
        sq.style.outline = `3px solid ${color}`;
        sq.style.transition = 'outline 0.3s';
        setTimeout(() => { sq.style.outline = prev; }, 800);
    }

    _pieceName(symbol) {
        const names = { P: 'Peão', N: 'Cavalo', B: 'Bispo', R: 'Torre', Q: 'Rainha', K: 'Rei' };
        return names[symbol] || symbol;
    }

    // ─────────────────────────────────────────────────────────
    //  Getters úteis
    // ─────────────────────────────────────────────────────────

    get isMyTurn() { return this.currentTurn === this.playerColor; }
    get isConnected() { return this.socket && this.socket.connected; }
    get isGameActive() { return this.gameActive; }
}

// Exporta globalmente
window.XadrezVsIA = XadrezVsIA;