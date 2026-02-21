// ============================================================
//  XADREZ ENGINE — motor de regras completo
//  Exporta: XadrezEngine (classe)
// ============================================================

export class XadrezEngine {
    constructor() {
        this.reset();
    }

    reset() {
        // Estado: null = vazio, objeto = peça
        // cor: 'branco' | 'preto'
        // tipo: 'rei' | 'rainha' | 'torre' | 'bispo' | 'cavalo' | 'peao'
        this.tabuleiro = this._estadoInicial();
        this.turno = 'branco'; // branco sempre começa
        this.historico = [];   // lista de jogadas
        this.enPassant = null; // casa en passant disponível {lin, col}
        this.roqueDisp = {
            branco: { lado_rei: true, lado_rainha: true },
            preto: { lado_rei: true, lado_rainha: true }
        };
        this.status = 'em_andamento'; // 'em_andamento' | 'xeque_mate' | 'empate'
        this.vencedor = null;
    }

    _estadoInicial() {
        const t = Array.from({ length: 8 }, () => Array(8).fill(null));
        const ordem = ['torre', 'cavalo', 'bispo', 'rainha', 'rei', 'bispo', 'cavalo', 'torre'];
        for (let c = 0; c < 8; c++) {
            t[0][c] = { tipo: ordem[c], cor: 'preto' };
            t[1][c] = { tipo: 'peao', cor: 'preto' };
            t[6][c] = { tipo: 'peao', cor: 'branco' };
            t[7][c] = { tipo: ordem[c], cor: 'branco' };
        }
        return t;
    }

    // ── Serialização ──────────────────────────────────────────
    serialize() {
        return JSON.stringify({
            tabuleiro: this.tabuleiro,
            turno: this.turno,
            historico: this.historico,
            enPassant: this.enPassant,
            roqueDisp: this.roqueDisp,
            status: this.status,
            vencedor: this.vencedor
        });
    }

    deserialize(json) {
        const s = JSON.parse(json);
        this.tabuleiro = s.tabuleiro;
        this.turno = s.turno;
        this.historico = s.historico;
        this.enPassant = s.enPassant;
        this.roqueDisp = s.roqueDisp;
        this.status = s.status;
        this.vencedor = s.vencedor;
    }

    // ── Notação algébrica ──────────────────────────────────────
    // Converte {lin, col} ↔ "e2"
    static casaStr(lin, col) {
        return String.fromCharCode(97 + col) + (8 - lin);
    }
    static strCasa(str) {
        return { lin: 8 - parseInt(str[1]), col: str.charCodeAt(0) - 97 };
    }

    // ── Movimentos legais ──────────────────────────────────────
    movimentosLegais(lin, col) {
        const peca = this.tabuleiro[lin][col];
        if (!peca || peca.cor !== this.turno) return [];
        const candidatos = this._movimentosBrutos(lin, col);
        // Filtra movimentos que deixam o próprio rei em xeque
        return candidatos.filter(([tl, tc]) => !this._deixaEmXeque(lin, col, tl, tc));
    }

    _movimentosBrutos(lin, col) {
        const peca = this.tabuleiro[lin][col];
        if (!peca) return [];
        switch (peca.tipo) {
            case 'peao': return this._mvPeao(lin, col, peca.cor);
            case 'torre': return this._mvTorre(lin, col);
            case 'cavalo': return this._mvCavalo(lin, col);
            case 'bispo': return this._mvBispo(lin, col);
            case 'rainha': return [...this._mvTorre(lin, col), ...this._mvBispo(lin, col)];
            case 'rei': return this._mvRei(lin, col);
        }
        return [];
    }

    _mvPeao(lin, col, cor) {
        const dir = cor === 'branco' ? -1 : 1;
        const inicio = cor === 'branco' ? 6 : 1;
        const movs = [];
        // Avançar
        if (this._dentro(lin + dir, col) && !this.tabuleiro[lin + dir][col]) {
            movs.push([lin + dir, col]);
            if (lin === inicio && !this.tabuleiro[lin + 2 * dir][col])
                movs.push([lin + 2 * dir, col]);
        }
        // Capturar na diagonal
        for (const dc of [-1, 1]) {
            if (!this._dentro(lin + dir, col + dc)) continue;
            const alvo = this.tabuleiro[lin + dir][col + dc];
            if (alvo && alvo.cor !== cor) movs.push([lin + dir, col + dc]);
            // En passant
            if (this.enPassant && this.enPassant.lin === lin + dir && this.enPassant.col === col + dc)
                movs.push([lin + dir, col + dc]);
        }
        return movs;
    }

    _mvTorre(lin, col) {
        return this._deslizar(lin, col, [[-1, 0], [1, 0], [0, -1], [0, 1]]);
    }

    _mvBispo(lin, col) {
        return this._deslizar(lin, col, [[-1, -1], [-1, 1], [1, -1], [1, 1]]);
    }

    _mvCavalo(lin, col) {
        const movs = [];
        for (const [dl, dc] of [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]]) {
            const [nl, nc] = [lin + dl, col + dc];
            if (!this._dentro(nl, nc)) continue;
            const alvo = this.tabuleiro[nl][nc];
            if (!alvo || alvo.cor !== this.tabuleiro[lin][col].cor) movs.push([nl, nc]);
        }
        return movs;
    }

    _mvRei(lin, col) {
        const peca = this.tabuleiro[lin][col];
        const movs = [];
        for (const [dl, dc] of [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]]) {
            const [nl, nc] = [lin + dl, col + dc];
            if (!this._dentro(nl, nc)) continue;
            const alvo = this.tabuleiro[nl][nc];
            if (!alvo || alvo.cor !== peca.cor) movs.push([nl, nc]);
        }
        // Roque
        if (this.roqueDisp[peca.cor] && !this._emXeque(peca.cor)) {
            const linRei = peca.cor === 'branco' ? 7 : 0;
            if (lin === linRei && col === 4) {
                // Lado do rei (curto)
                if (this.roqueDisp[peca.cor].lado_rei &&
                    !this.tabuleiro[linRei][5] && !this.tabuleiro[linRei][6] &&
                    !this._casaAtacada(linRei, 5, peca.cor) && !this._casaAtacada(linRei, 6, peca.cor))
                    movs.push([linRei, 6]);
                // Lado da rainha (longo)
                if (this.roqueDisp[peca.cor].lado_rainha &&
                    !this.tabuleiro[linRei][3] && !this.tabuleiro[linRei][2] && !this.tabuleiro[linRei][1] &&
                    !this._casaAtacada(linRei, 3, peca.cor) && !this._casaAtacada(linRei, 2, peca.cor))
                    movs.push([linRei, 2]);
            }
        }
        return movs;
    }

    _deslizar(lin, col, dirs) {
        const peca = this.tabuleiro[lin][col];
        const movs = [];
        for (const [dl, dc] of dirs) {
            let [nl, nc] = [lin + dl, col + dc];
            while (this._dentro(nl, nc)) {
                const alvo = this.tabuleiro[nl][nc];
                if (alvo) { if (alvo.cor !== peca.cor) movs.push([nl, nc]); break; }
                movs.push([nl, nc]);
                nl += dl; nc += dc;
            }
        }
        return movs;
    }

    _dentro(lin, col) { return lin >= 0 && lin < 8 && col >= 0 && col < 8; }

    // ── Xeque ─────────────────────────────────────────────────
    _emXeque(cor) {
        let reiLin = -1, reiCol = -1;
        for (let l = 0; l < 8; l++)
            for (let c = 0; c < 8; c++)
                if (this.tabuleiro[l][c]?.tipo === 'rei' && this.tabuleiro[l][c]?.cor === cor) { reiLin = l; reiCol = c; }
        return this._casaAtacada(reiLin, reiCol, cor);
    }

    _casaAtacada(lin, col, corDefensora) {
        const corAtacante = corDefensora === 'branco' ? 'preto' : 'branco';
        const tabSalvo = this.turno;
        this.turno = corAtacante;
        for (let l = 0; l < 8; l++)
            for (let c = 0; c < 8; c++)
                if (this.tabuleiro[l][c]?.cor === corAtacante)
                    if (this._movimentosBrutos(l, c).some(([ml, mc]) => ml === lin && mc === col)) {
                        this.turno = tabSalvo;
                        return true;
                    }
        this.turno = tabSalvo;
        return false;
    }

    _deixaEmXeque(deLin, deCol, paraLin, paraCol) {
        const tabSalvo = JSON.parse(JSON.stringify(this.tabuleiro));
        const cor = this.tabuleiro[deLin][deCol].cor;
        this.tabuleiro[paraLin][paraCol] = this.tabuleiro[deLin][deCol];
        this.tabuleiro[deLin][deCol] = null;
        const emXeque = this._emXeque(cor);
        this.tabuleiro = tabSalvo;
        return emXeque;
    }

    // ── Aplicar jogada ─────────────────────────────────────────
    // Retorna { ok, captura, promocao, xeque, xequeMate, empate }
    mover(deLin, deCol, paraLin, paraCol, promocaoPeca = 'rainha') {
        const legais = this.movimentosLegais(deLin, deCol);
        if (!legais.some(([l, c]) => l === paraLin && c === paraCol))
            return { ok: false };

        const peca = this.tabuleiro[deLin][deCol];
        const captura = this.tabuleiro[paraLin][paraCol];
        let capturaStr = captura ? captura.tipo : null;

        // En passant: captura o peão ao lado
        let enPassantCaptura = false;
        if (peca.tipo === 'peao' && this.enPassant &&
            paraLin === this.enPassant.lin && paraCol === this.enPassant.col) {
            const dirPeao = peca.cor === 'branco' ? 1 : -1;
            this.tabuleiro[paraLin + dirPeao][paraCol] = null;
            capturaStr = 'peao';
            enPassantCaptura = true;
        }

        // Executa o movimento
        this.tabuleiro[paraLin][paraCol] = peca;
        this.tabuleiro[deLin][deCol] = null;

        // Atualiza en passant
        this.enPassant = null;
        if (peca.tipo === 'peao' && Math.abs(paraLin - deLin) === 2)
            this.enPassant = { lin: (deLin + paraLin) / 2, col: deCol };

        // Roque: move a torre junto
        if (peca.tipo === 'rei') {
            this.roqueDisp[peca.cor] = { lado_rei: false, lado_rainha: false };
            if (Math.abs(paraCol - deCol) === 2) {
                if (paraCol === 6) { // curto
                    this.tabuleiro[deLin][5] = this.tabuleiro[deLin][7];
                    this.tabuleiro[deLin][7] = null;
                } else { // longo
                    this.tabuleiro[deLin][3] = this.tabuleiro[deLin][0];
                    this.tabuleiro[deLin][0] = null;
                }
            }
        }
        if (peca.tipo === 'torre') {
            if (deCol === 7) this.roqueDisp[peca.cor].lado_rei = false;
            if (deCol === 0) this.roqueDisp[peca.cor].lado_rainha = false;
        }

        // Promoção de peão
        let promovido = false;
        if (peca.tipo === 'peao' && (paraLin === 0 || paraLin === 7)) {
            this.tabuleiro[paraLin][paraCol] = { tipo: promocaoPeca, cor: peca.cor };
            promovido = true;
        }

        // Alterna turno
        const corAdversario = peca.cor === 'branco' ? 'preto' : 'branco';
        this.turno = corAdversario;

        // Registra no histórico
        const entrada = {
            cor: peca.cor,
            peca: peca.tipo,
            de: XadrezEngine.casaStr(deLin, deCol),
            para: XadrezEngine.casaStr(paraLin, paraCol),
            captura: capturaStr,
            promocao: promovido ? promocaoPeca : null
        };
        this.historico.push(entrada);

        // Checa xeque / xeque-mate / empate
        const adversarioEmXeque = this._emXeque(corAdversario);
        const temMovimentos = this._temMovimentosValidos(corAdversario);
        let xequeMate = false, empate = false;

        if (!temMovimentos) {
            if (adversarioEmXeque) {
                xequeMate = true;
                this.status = 'xeque_mate';
                this.vencedor = peca.cor;
            } else {
                empate = true;
                this.status = 'empate';
            }
        }

        return {
            ok: true,
            captura: capturaStr,
            promocao: promovido ? promocaoPeca : null,
            xeque: adversarioEmXeque && !xequeMate,
            xequeMate,
            empate
        };
    }

    _temMovimentosValidos(cor) {
        const tabSalvo = this.turno;
        this.turno = cor;
        for (let l = 0; l < 8; l++)
            for (let c = 0; c < 8; c++)
                if (this.tabuleiro[l][c]?.cor === cor && this.movimentosLegais(l, c).length > 0) {
                    this.turno = tabSalvo;
                    return true;
                }
        this.turno = tabSalvo;
        return false;
    }
}
