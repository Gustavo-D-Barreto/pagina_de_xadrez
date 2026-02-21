// ═══════════════════════════════════════════════════════════════════
//  MALDIÇÃO — Mecânica de maldição por capturas
//  Usado em ingamelocal.html e ingame.html
//
//  Como usar:
//    1. Chame Maldicao.initMaldicao()  ao iniciar/resetar o jogo.
//    2. Chame Maldicao.registrarCaptura(piece, fromRow, fromCol)
//       toda vez que uma peça fizer uma captura (passe o objeto
//       `piece` = {color, type, id} antes de mover).
//    3. Na função render(), verifique piece.cursed para aplicar
//       a classe CSS '.cursed-piece' e renderizar o badge 💀.
//    4. Chame Maldicao.initMaldicao() ao iniciar nova partida.
//    5. Para serialização online: inclua piece.captureCount e
//       piece.cursed no estado de cada peça.
//
//  O módulo NÃO chama render() nem skipTurn() diretamente —
//  cabe ao chamador (HTML) fazê-lo nos callbacks de habilidade.
// ═══════════════════════════════════════════════════════════════════

(function () {
    'use strict';

    // ── Limites de captura para cada tipo de peça ─────────────────
    const CURSE_THRESHOLDS = {
        P: 2,   // Peão    → 2 capturas
        N: 3,   // Cavalo  → 3 capturas
        R: 5,   // Torre   → 5 capturas
        // Bispo, Rainha, Rei → sem maldição por enquanto
    };

    // ── Estado interno ────────────────────────────────────────────
    // Usa um contador por peça via piece.captureCount / piece.cursed
    // (campos adicionados diretamente no objeto de peça do board).
    // Assim, quando o estado online é serializado via JSON.stringify,
    // os dados são automaticamente preservados.

    let _nextId = 1; // ID único por peça (incrementado a cada initBoard)

    // ── API pública ───────────────────────────────────────────────

    function initMaldicao() {
        // Reseta o gerador de IDs; o zeragem de peças
        // acontece naturalmente quando o board é recriado.
        _nextId = 1;
    }

    /**
     * Atribui um ID único à peça se ainda não tiver.
     * Deve ser chamado quando as peças são criadas no initBoard.
     */
    function assignId(piece) {
        if (piece && !piece.id) {
            piece.id = _nextId++;
        }
    }

    /**
     * Atribui IDs a todas as peças de um board 8×8.
     * Chame após freshBoard() / initBoard().
     */
    function assignAllIds(board) {
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (board[r][c]) assignId(board[r][c]);
            }
        }
        // Ajusta _nextId para não colidir se loadState restaurou IDs maiores
        let max = 0;
        for (let r = 0; r < 8; r++)
            for (let c = 0; c < 8; c++)
                if (board[r][c] && board[r][c].id && board[r][c].id > max)
                    max = board[r][c].id;
        if (max >= _nextId) _nextId = max + 1;
    }

    /**
     * Registra uma captura para a peça que capturou.
     * @param {object} piece - objeto da peça no board (com .color, .type, .id)
     * Retorna true se a peça ficou amaldiçoada agora (recém atingiu o limite).
     */
    function registrarCaptura(piece) {
        if (!piece) return false;
        const threshold = CURSE_THRESHOLDS[piece.type];
        if (!threshold) return false; // tipo sem maldição

        piece.captureCount = (piece.captureCount || 0) + 1;

        if (!piece.cursed && piece.captureCount >= threshold) {
            piece.cursed = true;
            return true; // ficou amaldiçoada agora
        }
        return false;
    }

    /**
     * Verifica se uma peça está amaldiçoada e pronta para ativar.
     */
    function isAmaldicaoPronta(piece) {
        return !!(piece && piece.cursed && !piece.curseUsed);
    }

    /**
     * Ativa a habilidade da maldição do Cavalo (N):
     * entra em modo de seleção de peça. Quando o jogador clicar
     * numa outra peça sua, ela e o cavalo trocam de posição.
     *
     * @param {number} cavalRow - linha do cavalo amaldiçoado
     * @param {number} cavalCol - coluna do cavalo amaldiçoado
     * @param {object} piece    - objeto da peça cavalo
     * @param {object} context  - { board, enterPickMode, showToast, onAfterActivation }
     *   - enterPickMode(type, excludedTypes, onPick, onCancel) — função do jogo
     *   - showToast(msg) — função do jogo
     *   - onAfterActivation() — chamado após a troca (jogo deve skipTurn aqui)
     *   - onCancel() — chamado se o jogador cancelar
     */
    function ativarMaldicaoCavalo(cavalRow, cavalCol, piece, context) {
        const { board, enterPickMode, showToast, onAfterActivation, onCancel } = context;

        enterPickMode(
            'piece',
            ['K'],   // não pode trocar com o rei
            (targetRow, targetCol) => {
                // Não pode trocar consigo mesmo
                if (targetRow === cavalRow && targetCol === cavalCol) {
                    showToast('⚠️ Escolha uma peça diferente do cavalo!');
                    // Re-entra no pick mode
                    ativarMaldicaoCavalo(cavalRow, cavalCol, piece, context);
                    return;
                }

                // Troca de posição
                const targetPiece = board[targetRow][targetCol];
                board[targetRow][targetCol] = piece;
                board[cavalRow][cavalCol] = targetPiece || null;

                // Marca que a maldição foi usada
                piece.cursed = false;
                piece.curseUsed = true;

                showToast('💀 Maldição do Cavalo! Posições trocadas!');
                if (onAfterActivation) onAfterActivation();
            },
            () => {
                // Cancelou — não faz nada, não passa a vez
                if (onCancel) onCancel();
            }
        );
    }

    function ativarMaldicaoPeao(row, col, piece, context) {
        const { showToast, onAfterActivation } = context;

        // Marca que a maldição foi usada
        piece.cursed = false;
        piece.curseUsed = true;

        showToast('💀 Maldição do Peão! Pelo resto de sua vida ele moverá como o Rei (capturando normalmente).');
        if (onAfterActivation) onAfterActivation();
    }

    /**
     * Ponto de entrada para ativar qualquer maldição.
     * Detecta o tipo da peça e chama a habilidade correspondente.
     *
     * @param {number} row
     * @param {number} col
     * @param {object} piece   - objeto peça do board
     * @param {object} context - mesmo context de ativarMaldicaoCavalo
     */
    function ativarMaldicao(row, col, piece, context) {
        if (!isAmaldicaoPronta(piece)) return;

        switch (piece.type) {
            case 'N':
                ativarMaldicaoCavalo(row, col, piece, context);
                break;
            case 'P':
                ativarMaldicaoPeao(row, col, piece, context);
                break;
            case 'R':
                context.showToast('⚠️ Habilidade da Torre ainda não implementada!');
                break;
            default:
                context.showToast('⚠️ Habilidade desconhecida para esta peça.');
        }
    }

    // ── Exporta via window.Maldicao ───────────────────────────────
    window.Maldicao = {
        initMaldicao,
        assignId,
        assignAllIds,
        registrarCaptura,
        isAmaldicaoPronta,
        ativarMaldicao,
        CURSE_THRESHOLDS,
    };

})();
