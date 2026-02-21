// ============================================================
//  SONS.JS — versão corrigida para política de autoplay
// ============================================================

let _ctx = null;

// Cria/resume o contexto SEMPRE dentro de um evento de usuário
function ctx() {
    if (!_ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        _ctx = new AudioCtx();
    }
    if (_ctx.state === 'suspended') {
        _ctx.resume();
    }
    return _ctx;
}





// Ativa o contexto em qualquer clique/toque para resolver o autoplay
document.addEventListener('click', () => ctx(), { once: true });
document.addEventListener('keydown', () => ctx(), { once: true });

// ── Utilitário: cria oscilador + gain e conecta ────────────────
function makeOsc(type, freq, gainVal) {
    const c = ctx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, c.currentTime);
    gain.gain.setValueAtTime(gainVal, c.currentTime);
    osc.connect(gain);
    gain.connect(c.destination);
    return { osc, gain, c };
}

// ── Utilitário: noise branco ────────────────────────────────────
function makeNoise(gainVal, dur) {
    const c = ctx();
    const bufSize = c.sampleRate * dur;
    const buf = c.createBuffer(1, bufSize, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buf;
    const gain = c.createGain();
    gain.gain.setValueAtTime(gainVal, c.currentTime);
    src.connect(gain);
    gain.connect(c.destination);
    return { src, gain, c };
}

// ============================================================
//  SONS DO JOGO
// ============================================================

/** Peça se movendo (madeira deslizando + batida suave) */
export function somMovimento() {
    const { c } = makeOsc('sine', 0, 0); // só pra iniciar ctx

    // Batida grave de madeira
    const { osc: o1, gain: g1 } = makeOsc('triangle', 180, 0.25);
    o1.frequency.exponentialRampToValueAtTime(80, c.currentTime + 0.08);
    g1.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.12);
    o1.start(c.currentTime);
    o1.stop(c.currentTime + 0.13);

    // Clique seco de madeira
    const { src: n1, gain: gn1 } = makeNoise(0.06, 0.05);
    gn1.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.05);
    n1.start(c.currentTime);
    n1.stop(c.currentTime + 0.06);
}

/** Peça capturando (impacto + madeira quebrando) */
export function somCaptura() {
    const c = ctx();

    // Impacto grave
    const { osc: o1, gain: g1 } = makeOsc('sawtooth', 220, 0.35);
    o1.frequency.exponentialRampToValueAtTime(50, c.currentTime + 0.25);
    g1.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.3);
    o1.start(c.currentTime);
    o1.stop(c.currentTime + 0.32);

    // Sub-grave
    const { osc: o2, gain: g2 } = makeOsc('square', 90, 0.2);
    o2.frequency.exponentialRampToValueAtTime(30, c.currentTime + 0.2);
    g2.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.22);
    o2.start(c.currentTime);
    o2.stop(c.currentTime + 0.25);

    // Ruído de impacto
    const { src: n, gain: gn } = makeNoise(0.12, 0.15);
    gn.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.15);
    n.start(c.currentTime);
    n.stop(c.currentTime + 0.17);
}

/** Xeque — alerta tenso */
export function somXeque() {
    const c = ctx();

    // Dois tons de alerta rápidos
    const freqs = [660, 880];
    freqs.forEach((freq, i) => {
        const delay = i * 0.12;
        const { osc, gain } = makeOsc('sine', freq, 0.2);
        gain.gain.setValueAtTime(0, c.currentTime + delay);
        gain.gain.linearRampToValueAtTime(0.2, c.currentTime + delay + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + 0.18);
        osc.start(c.currentTime + delay);
        osc.stop(c.currentTime + delay + 0.2);
    });
}

/** Roque — som especial duplo (rei + torre) */
export function somRoque() {
    const c = ctx();

    // Primeiro movimento
    const { osc: o1, gain: g1 } = makeOsc('triangle', 300, 0.18);
    o1.frequency.exponentialRampToValueAtTime(150, c.currentTime + 0.1);
    g1.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.15);
    o1.start(c.currentTime);
    o1.stop(c.currentTime + 0.17);

    // Segundo movimento (torre)
    const { osc: o2, gain: g2 } = makeOsc('triangle', 250, 0.18);
    o2.frequency.exponentialRampToValueAtTime(120, c.currentTime + 0.12);
    g2.gain.setValueAtTime(0, c.currentTime + 0.12);
    g2.gain.linearRampToValueAtTime(0.18, c.currentTime + 0.14);
    g2.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.28);
    o2.start(c.currentTime + 0.12);
    o2.stop(c.currentTime + 0.3);
}

/** Promoção de peão — fanfarra épica ascendente */
export function somPromocao() {
    const c = ctx();
    const notas = [523, 659, 784, 1047]; // C5 E5 G5 C6

    notas.forEach((freq, i) => {
        const t = c.currentTime + i * 0.1;
        const { osc, gain } = makeOsc('sine', freq, 0.22);

        // Harmônico
        const { osc: oh, gain: gh } = makeOsc('triangle', freq * 2, 0.06);

        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.22, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

        gh.gain.setValueAtTime(0, t);
        gh.gain.linearRampToValueAtTime(0.06, t + 0.02);
        gh.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

        osc.start(t); osc.stop(t + 0.25);
        oh.start(t); oh.stop(t + 0.22);
    });
}

/** Xeque-mate / Fim de jogo — som dramático descendente */
export function somFimDeJogo(venceu = true) {
    const c = ctx();

    if (venceu) {
        // Vitória — acorde maior ascendente
        const vitNotas = [523, 659, 784, 1047, 1568];
        vitNotas.forEach((freq, i) => {
            const t = c.currentTime + i * 0.08;
            const { osc, gain } = makeOsc('sine', freq, 0.18);
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(0.18, t + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
            osc.start(t); osc.stop(t + 0.38);
        });
    } else {
        // Derrota — acorde menor descendente e pesado
        const derNotas = [392, 349, 311, 261];
        derNotas.forEach((freq, i) => {
            const t = c.currentTime + i * 0.15;
            const { osc: o1, gain: g1 } = makeOsc('sawtooth', freq, 0.15);
            const { osc: o2, gain: g2 } = makeOsc('triangle', freq * 0.5, 0.1);
            g1.gain.setValueAtTime(0, t);
            g1.gain.linearRampToValueAtTime(0.15, t + 0.05);
            g1.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
            g2.gain.setValueAtTime(0, t);
            g2.gain.linearRampToValueAtTime(0.1, t + 0.05);
            g2.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
            o1.start(t); o1.stop(t + 0.6);
            o2.start(t); o2.stop(t + 0.55);
        });
    }
}

/** Empate — tom neutro */
export function somEmpate() {
    const c = ctx();
    const notas = [440, 415, 440];
    notas.forEach((freq, i) => {
        const t = c.currentTime + i * 0.18;
        const { osc, gain } = makeOsc('sine', freq, 0.15);
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.15, t + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        osc.start(t); osc.stop(t + 0.32);
    });
}

// ============================================================
//  SONS DO LOBBY / UI
// ============================================================

/** Clique em botão primário (entrar na fila, criar sala etc.) */
export function somBotaoPrimario() {
    const c = ctx();
    const { osc, gain } = makeOsc('sine', 520, 0.12);
    osc.frequency.exponentialRampToValueAtTime(780, c.currentTime + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.14);
    osc.start(c.currentTime);
    osc.stop(c.currentTime + 0.15);
}

/** Hover em card de modo */
export function somHover() {
    const c = ctx();
    const { osc, gain } = makeOsc('sine', 400, 0.04);
    osc.frequency.exponentialRampToValueAtTime(500, c.currentTime + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.07);
    osc.start(c.currentTime);
    osc.stop(c.currentTime + 0.08);
}

/** Sucesso (sala criada, código copiado etc.) */
export function somSucesso() {
    const c = ctx();
    [[600, 0], [800, 0.1], [1000, 0.18]].forEach(([freq, delay]) => {
        const { osc, gain } = makeOsc('sine', freq, 0.1);
        gain.gain.setValueAtTime(0, c.currentTime + delay);
        gain.gain.linearRampToValueAtTime(0.1, c.currentTime + delay + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + 0.18);
        osc.start(c.currentTime + delay);
        osc.stop(c.currentTime + delay + 0.2);
    });
}

/** Erro / Aviso (sala não encontrada etc.) */
export function somErro() {
    const c = ctx();
    [[200, 0], [160, 0.12]].forEach(([freq, delay]) => {
        const { osc, gain } = makeOsc('sawtooth', freq, 0.1);
        gain.gain.setValueAtTime(0, c.currentTime + delay);
        gain.gain.linearRampToValueAtTime(0.1, c.currentTime + delay + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + 0.2);
        osc.start(c.currentTime + delay);
        osc.stop(c.currentTime + delay + 0.22);
    });
}

/** Cancelar (cancelar fila, cancelar sala) */
export function somCancelar() {
    const c = ctx();
    const { osc, gain } = makeOsc('triangle', 350, 0.1);
    osc.frequency.exponentialRampToValueAtTime(200, c.currentTime + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.2);
    osc.start(c.currentTime);
    osc.stop(c.currentTime + 0.22);
}

// Expõe globalmente para uso em arquivos não-módulo
window.XqSons = {
    somMovimento,
    somCaptura,
    somXeque,
    somRoque,
    somPromocao,
    somFimDeJogo,
    somEmpate,
    somBotaoPrimario,
    somHover,
    somSucesso,
    somErro,
    somCancelar,
};