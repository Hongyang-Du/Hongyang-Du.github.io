/* Explorable figures for the visual guide to vision-language models. */
(function () {
    'use strict';
    var V = window.BlogViz;
    if (!V) return;
    var h = V.h, s = V.s;
    var BLUE = '#2a78d6', ORANGE = '#eb6834', AQUA = '#1baf7a', BAD = '#d03b3b';

    /* A small hand-drawn scene used throughout: a cat on a hill, a ball, the sun. 240 x 240. */
    function sceneDefs(id) {
        return s('defs', null, [
            s('linearGradient', { id: id + '-sky', x1: 0, y1: 0, x2: 0, y2: 1 }, [
                s('stop', { offset: '0', 'stop-color': '#bfdcf8' }),
                s('stop', { offset: '1', 'stop-color': '#fdf0d8' })
            ]),
            s('symbol', { id: id, viewBox: '0 0 240 240' }, [
                s('rect', { width: 240, height: 240, fill: 'url(#' + id + '-sky)' }),
                s('circle', { cx: 186, cy: 54, r: 24, fill: '#f7b733' }),
                s('circle', { cx: 186, cy: 54, r: 33, fill: '#f7b733', opacity: 0.22 }),
                s('path', { d: 'M0 172 Q60 122 130 162 T240 150 V240 H0 Z', fill: '#a6d8ab' }),
                s('path', { d: 'M0 204 Q80 168 160 198 T240 192 V240 H0 Z', fill: '#74c285' }),
                s('path', { d: 'M110 198 Q142 204 137 170', fill: 'none', stroke: '#e97f33', 'stroke-width': 10, 'stroke-linecap': 'round' }),
                s('ellipse', { cx: 84, cy: 178, rx: 31, ry: 35, fill: '#f08a3c' }),
                s('ellipse', { cx: 84, cy: 187, rx: 16, ry: 21, fill: '#fbd6ae' }),
                s('polygon', { points: '63,114 66,88 82,106', fill: '#f08a3c' }),
                s('polygon', { points: '105,114 102,88 86,106', fill: '#f08a3c' }),
                s('circle', { cx: 84, cy: 128, r: 25, fill: '#f08a3c' }),
                s('circle', { cx: 75, cy: 126, r: 3, fill: '#3b2a20' }),
                s('circle', { cx: 93, cy: 126, r: 3, fill: '#3b2a20' }),
                s('path', { d: 'M81 134 L87 134 L84 138 Z', fill: '#c2552a' }),
                s('circle', { cx: 170, cy: 207, r: 13, fill: '#e34948' }),
                s('path', { d: 'M158 203 Q170 196 182 204', fill: 'none', stroke: '#fff', 'stroke-width': 3 })
            ])
        ]);
    }

    function arrowHead(id) {
        return s('marker', { id: id, viewBox: '0 0 8 8', refX: 7, refY: 4, markerWidth: 7, markerHeight: 7, orient: 'auto' }, [
            s('path', { d: 'M0 0 L8 4 L0 8 z', fill: '#b9b5aa' })
        ]);
    }

    /* ---------- 1. Patches ---------- */

    function patchify(root) {
        var f = V.figure(root, {
            kicker: 'Step 1', title: 'Turning an image into a token sequence',
            sub: 'Slice the 2D image into square patches and arrange them row by row.'
        });
        var SIZES = [2, 3, 4, 6, 8];
        var COLS = { 2: 4, 3: 9, 4: 8, 6: 12, 8: 16 };
        var n = 4, cut = false, patches = [];
        var svg = s('svg', { viewBox: '0 0 760 300', role: 'img', 'aria-label': 'A picture is cut into a grid of patches, and the patches are lined up into a sequence.' });
        svg.appendChild(sceneDefs('vz-scene-a'));
        svg.appendChild(s('defs', null, [arrowHead('vz-ah-a')]));
        var layer = s('g');
        var arrow = s('path', { 'class': 'vz-fade-el', d: 'M268 150 H296', stroke: '#b9b5aa', 'stroke-width': 2, fill: 'none', 'marker-end': 'url(#vz-ah-a)', opacity: 0 });
        var labelL = s('text', { 'class': 'vz-t3', x: 140, y: 290, 'text-anchor': 'middle', 'font-size': 12, text: 'the picture' });
        var labelR = s('text', { 'class': 'vz-t3 vz-fade-el', x: 524, y: 290, 'text-anchor': 'middle', 'font-size': 12, text: 'the sequence the model reads, left to right', opacity: 0 });
        var ghost = s('svg', { 'class': 'vz-fade-el', x: 20, y: 26, width: 240, height: 240, viewBox: '0 0 240 240', opacity: 0 }, [s('use', { href: '#vz-scene-a', width: 240, height: 240 })]);
        svg.appendChild(ghost); svg.appendChild(arrow); svg.appendChild(layer); svg.appendChild(labelL); svg.appendChild(labelR);
        f.stage.appendChild(svg);

        function place() {
            var ps = 240 / n, count = n * n;
            var cols = COLS[n], size = Math.floor(432 / cols) - 4, rows = Math.ceil(count / cols);
            var totalH = rows * (size + 4) - 4;
            patches.forEach(function (p) {
                var x, y, k;
                if (cut) {
                    x = 308 + (p.i % cols) * (size + 4);
                    y = 146 - totalH / 2 + Math.floor(p.i / cols) * (size + 4);
                    k = size / ps;
                } else {
                    x = 20 + p.c * ps; y = 26 + p.r * ps; k = 1;
                }
                p.g.style.transitionDelay = (V.reduceMotion ? 0 : Math.round(p.i * (500 / count))) + 'ms';
                p.g.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) scale(' + k.toFixed(4) + ')';
            });
            ghost.setAttribute('opacity', cut ? 0.22 : 0);
            arrow.setAttribute('opacity', cut ? 1 : 0);
            labelR.setAttribute('opacity', cut ? 1 : 0);
            toggle.textContent = cut ? 'Put the picture back' : 'Cut into patches';
            f.say(cut
                ? count + ' patches become ' + count + ' visual tokens, each encoded as a feature vector. Smaller patches keep finer detail at the cost of a longer sequence.'
                : 'A 2D image grid. Click "Cut into patches" to turn it into a 1D sequence of patches.');
        }

        function build() {
            layer.textContent = '';
            patches = [];
            var ps = 240 / n;
            for (var r = 0; r < n; r++) {
                for (var c = 0; c < n; c++) {
                    var g = s('g', { 'class': 'vz-patch' }, [
                        s('svg', { x: 0, y: 0, width: ps, height: ps, viewBox: [c * ps, r * ps, ps, ps].join(' ') }, [s('use', { href: '#vz-scene-a', width: 240, height: 240 })]),
                        s('rect', { x: 0, y: 0, width: ps, height: ps, fill: 'none', stroke: '#fff', 'stroke-width': ps * 0.05 })
                    ]);
                    layer.appendChild(g);
                    patches.push({ g: g, r: r, c: c, i: r * n + c });
                }
            }
            place();
        }

        var toggle = V.button('Cut into patches', function () { cut = !cut; place(); }, true);
        var sl = V.slider({
            label: 'Patches per side', min: 0, max: 4, value: 2,
            format: function (v) { return String(SIZES[v]); },
            oninput: function (v) { n = SIZES[v]; build(); }
        });
        f.controls.appendChild(toggle);
        f.controls.appendChild(sl.node);
        build();
        V.onVisible(root, function () { setTimeout(function () { if (!cut) { cut = true; place(); } }, 700); });
    }

    /* ---------- 2. Contrastive learning ---------- */

    function contrastive(root) {
        var f = V.figure(root, {
            kicker: 'Step 2', title: 'Aligning images and captions in one space',
            sub: 'Contrastive learning pulls matching image-caption pairs closer together and pushes mismatched pairs apart.'
        });
        var ITEMS = [
            { e: '🐱', t: 'a cat', i0: [0.18, 0.80], t0: [0.80, 0.78], c: [0.24, 0.26] },
            { e: '🐶', t: 'a dog', i0: [0.85, 0.22], t0: [0.25, 0.10], c: [0.76, 0.26] },
            { e: '🚗', t: 'a car', i0: [0.50, 0.90], t0: [0.30, 0.62], c: [0.24, 0.76] },
            { e: '🍎', t: 'an apple', i0: [0.12, 0.20], t0: [0.72, 0.38], c: [0.76, 0.76] }
        ];
        var MX = 104, MY = 74, CELL = 50, BX = 400, BY = 44, BW = 330, BH = 236;
        var t = 0, playing = false;
        var svg = s('svg', { viewBox: '0 0 760 310', role: 'img', 'aria-label': 'A similarity table between four pictures and four captions, and the same items as points in an embedding space.' });
        svg.appendChild(s('text', { x: 40, y: 30, 'font-size': 13, 'font-weight': 700, text: 'How similar is each picture to each caption?' }));
        svg.appendChild(s('text', { x: BX, y: 30, 'font-size': 13, 'font-weight': 700, text: 'Where they sit in the shared space' }));
        svg.appendChild(s('rect', { x: BX, y: BY, width: BW, height: BH, rx: 12, fill: '#fff', stroke: '#e7e4dc' }));
        var cells = [], verdicts = [], rings = [];
        ITEMS.forEach(function (it, j) {
            svg.appendChild(s('text', { 'class': 'vz-t2', x: MX + j * CELL + CELL / 2, y: MY - 10, 'text-anchor': 'middle', 'font-size': 11.5, text: it.t }));
        });
        ITEMS.forEach(function (it, i) {
            svg.appendChild(s('text', { x: MX - 24, y: MY + i * CELL + CELL / 2 + 8, 'text-anchor': 'middle', 'font-size': 22, text: it.e }));
            cells.push(ITEMS.map(function (_, j) {
                var rect = s('rect', { x: MX + j * CELL + 1.5, y: MY + i * CELL + 1.5, width: CELL - 3, height: CELL - 3, rx: 7 });
                var txt = s('text', { x: MX + j * CELL + CELL / 2, y: MY + i * CELL + CELL / 2 + 4, 'text-anchor': 'middle', 'font-size': 11.5 });
                svg.appendChild(rect); svg.appendChild(txt);
                return { rect: rect, txt: txt };
            }));
            var ring = s('rect', { width: CELL - 3, height: CELL - 3, rx: 7, fill: 'none', 'stroke-width': 3 });
            var verdict = s('text', { x: MX + 4 * CELL + 20, y: MY + i * CELL + CELL / 2 + 6, 'text-anchor': 'middle', 'font-size': 16, 'font-weight': 700 });
            svg.appendChild(ring); svg.appendChild(verdict);
            rings.push(ring); verdicts.push(verdict);
        });
        var links = [], imgDots = [], txtDots = [];
        ITEMS.forEach(function () { var l = s('line', { stroke: '#b9b5aa', 'stroke-width': 1.5 }); svg.appendChild(l); links.push(l); });
        ITEMS.forEach(function (it) {
            var g = s('g', null, [
                s('circle', { r: 17, fill: '#e9f2fc', stroke: BLUE, 'stroke-width': 2 }),
                s('text', { y: 6, 'text-anchor': 'middle', 'font-size': 17, text: it.e })
            ]);
            var w = it.t.length * 6.4 + 16;
            var tg = s('g', null, [
                s('rect', { x: -w / 2, y: -12, width: w, height: 24, rx: 7, fill: '#fdeee6', stroke: ORANGE, 'stroke-width': 2 }),
                s('text', { y: 4, 'text-anchor': 'middle', 'font-size': 11.5, 'font-weight': 700, text: it.t })
            ]);
            svg.appendChild(tg); svg.appendChild(g);
            imgDots.push(g); txtDots.push(tg);
        });
        f.stage.appendChild(svg);

        function mix(a, b, k) { return [V.lerp(a[0], b[0], k), V.lerp(a[1], b[1], k)]; }
        function shade(v) {
            var k = V.clamp(v, 0, 1);
            return 'rgb(' + Math.round(V.lerp(244, 42, k)) + ',' + Math.round(V.lerp(241, 120, k)) + ',' + Math.round(V.lerp(234, 214, k)) + ')';
        }

        function update() {
            var k = V.ease(t);
            var ip = ITEMS.map(function (it) { return mix(it.i0, [it.c[0] - 0.055, it.c[1] - 0.04], k); });
            var tp = ITEMS.map(function (it) { return mix(it.t0, [it.c[0] + 0.065, it.c[1] + 0.05], k); });
            function px(p) { return [BX + 30 + p[0] * (BW - 60), BY + 26 + p[1] * (BH - 52)]; }
            var right = 0;
            ITEMS.forEach(function (_, i) {
                var a = px(ip[i]), b = px(tp[i]);
                imgDots[i].setAttribute('transform', 'translate(' + a[0].toFixed(1) + ',' + a[1].toFixed(1) + ')');
                txtDots[i].setAttribute('transform', 'translate(' + b[0].toFixed(1) + ',' + b[1].toFixed(1) + ')');
                links[i].setAttribute('x1', a[0]); links[i].setAttribute('y1', a[1]);
                links[i].setAttribute('x2', b[0]); links[i].setAttribute('y2', b[1]);
                links[i].setAttribute('opacity', 0.25 + 0.75 * k);
                var best = 0, bestV = -1;
                ITEMS.forEach(function (_2, j) {
                    var dx = ip[i][0] - tp[j][0], dy = ip[i][1] - tp[j][1];
                    var sim = Math.exp(-(dx * dx + dy * dy) / (2 * 0.22 * 0.22));
                    cells[i][j].rect.setAttribute('fill', shade(sim));
                    cells[i][j].txt.textContent = sim.toFixed(2);
                    cells[i][j].txt.setAttribute('fill', sim > 0.55 ? '#fff' : '#55524d');
                    cells[i][j].txt.style.fill = sim > 0.55 ? '#fff' : '#55524d';
                    if (sim > bestV) { bestV = sim; best = j; }
                });
                var ok = best === i;
                if (ok) right++;
                rings[i].setAttribute('x', MX + best * CELL + 1.5);
                rings[i].setAttribute('y', MY + i * CELL + 1.5);
                rings[i].setAttribute('stroke', ok ? AQUA : BAD);
                verdicts[i].textContent = ok ? '✓' : '✗';
                verdicts[i].style.fill = ok ? AQUA : BAD;
            });
            var lead = t < 0.03 ? 'Before training, image and text embeddings are randomly scattered. '
                : t > 0.97 ? 'After training, each image sits right next to its matching caption. '
                    : 'Training: matching pairs move closer together and diagonal similarity scores rise. ';
            f.say(lead + 'Matching each image to its closest caption gets ' + right + ' of 4 right.' + (t > 0.97 ? ' This enables zero-shot classification in CLIP.' : ''));
        }

        var sl = V.slider({
            label: 'Training', min: 0, max: 100, value: 0,
            format: function (v) { return Math.round(v) + '%'; },
            oninput: function (v) { playing = false; play.textContent = 'Train'; t = v / 100; update(); }
        });
        var play = V.button('Train', function () {
            if (playing) { playing = false; play.textContent = 'Train'; return; }
            if (t >= 0.999) t = 0;
            playing = true; play.textContent = 'Pause';
        }, true);
        f.controls.appendChild(play);
        f.controls.appendChild(sl.node);
        V.loop(root, function (dt) {
            if (!playing) return;
            t = Math.min(1, t + dt / 4);
            sl.set(Math.round(t * 100));
            update();
            if (t >= 1) { playing = false; play.textContent = 'Train again'; }
        });
        update();
        V.onVisible(root, function () { if (!V.reduceMotion && t === 0) { playing = true; play.textContent = 'Pause'; } });
    }

    /* ---------- 3. The pipeline, step by step ---------- */

    function pipeline(root) {
        var f = V.figure(root, {
            kicker: 'Step 3', title: 'Connecting a vision encoder to a language model',
            sub: 'Step through how an image and a question flow through a LLaVA-style architecture.'
        });
        var STEPS = [
            { on: ['photo', 'question'], say: 'Input: an image and a text question.' },
            { on: ['photo', 'encoder'], say: 'The vision encoder converts image patches into visual feature vectors.' },
            { on: ['projector'], say: 'The lightweight projector maps those visual features into the language model’s token embedding space.' },
            { on: ['lane', 'question'], say: 'Visual tokens (blue) and text question tokens (orange) are combined into one sequence.' },
            { on: ['lane', 'llm', 'answer'], say: 'The language model attends to both visual and text tokens to generate the answer word by word.' },
            { on: ['encoder', 'projector', 'llm'], badge: ['❄️', '🔥', '❄️'], say: 'Training stage 1 (alignment): freeze the vision encoder and LLM, and train only the projector on image-caption pairs.' },
            { on: ['encoder', 'projector', 'llm'], badge: ['❄️', '🔥', '🔥'], say: 'Training stage 2 (instruction tuning): fine-tune the projector and LLM together on visual question-answering data.' }
        ];
        var WORDS = ['The', 'cat', 'is', 'sitting', 'on', 'a', 'hill', '.'];
        var step = 0, typed = 0, timer = null, auto = null;
        var svg = s('svg', { viewBox: '0 0 760 336', role: 'img', 'aria-label': 'A photo goes through a vision encoder and a projector, joins the question as tokens, and a language model writes the answer.' });
        svg.appendChild(sceneDefs('vz-scene-b'));
        svg.appendChild(s('defs', null, [arrowHead('vz-ah-b')]));
        function arrow(d) { svg.appendChild(s('path', { d: d, fill: 'none', stroke: '#c9c5ba', 'stroke-width': 1.6, 'marker-end': 'url(#vz-ah-b)' })); }
        arrow('M118 84 H142'); arrow('M252 84 H328');
        arrow('M430 84 C520 84 520 134 400 138 C300 141 220 142 220 168'); arrow('M214 270 C330 270 380 262 380 216');
        arrow('M502 192 H556'); arrow('M652 232 V274');
        var nodes = {};
        function node(key, x, y, w, hgt, label, sub, fill, stroke) {
            var g = s('g', { 'class': 'vz-node' }, [
                s('rect', { x: x, y: y, width: w, height: hgt, rx: 10, fill: fill, stroke: stroke, 'stroke-width': 1.6 }),
                label ? s('text', { x: x + w / 2, y: y + hgt / 2 + (sub ? -2 : 5), 'text-anchor': 'middle', 'font-size': 13.5, 'font-weight': 700, text: label }) : null,
                sub ? s('text', { 'class': 'vz-t3', x: x + w / 2, y: y + hgt / 2 + 15, 'text-anchor': 'middle', 'font-size': 11, text: sub }) : null
            ]);
            svg.appendChild(g);
            nodes[key] = g;
            return g;
        }
        nodes.photo = s('g', { 'class': 'vz-node' }, [
            s('svg', { x: 16, y: 34, width: 100, height: 100, viewBox: '0 0 240 240' }, [s('use', { href: '#vz-scene-b', width: 240, height: 240 })]),
            s('rect', { x: 16, y: 34, width: 100, height: 100, rx: 8, fill: 'none', stroke: '#fff', 'stroke-width': 3 })
        ]);
        svg.appendChild(nodes.photo);
        node('encoder', 146, 44, 104, 80, 'Vision encoder', 'patch features', '#e9f2fc', BLUE);
        node('projector', 332, 44, 96, 80, 'Projector', 'maps to LLM', '#e9f2fc', BLUE);
        node('lane', 140, 172, 360, 40, null, null, '#fff', '#c9c5ba');
        svg.appendChild(s('text', { 'class': 'vz-t3', x: 500, y: 164, 'text-anchor': 'end', 'font-size': 11, text: 'one sequence of tokens' }));
        node('question', 16, 250, 196, 40, 'What is the cat doing?', null, '#fdeee6', ORANGE);
        node('llm', 560, 44, 184, 186, 'Language model', 'generates reply', '#f4f1ea', '#c9c5ba');
        node('answer', 300, 278, 444, 40, null, null, '#f4f1ea', '#e7e4dc');
        var answerText = s('text', { x: 316, y: 303, 'font-size': 14.5, 'font-weight': 700 });
        svg.appendChild(answerText);
        var badges = [[246, 48], [424, 48], [740, 48]].map(function (p) {
            var b = s('text', { 'class': 'vz-badge', x: p[0] - 6, y: p[1] + 12, 'text-anchor': 'end', 'font-size': 16, opacity: 0 });
            svg.appendChild(b);
            return b;
        });
        var vis = [], txt = [];
        for (var i = 0; i < 6; i++) {
            var v = s('rect', { 'class': 'vz-token', width: 16, height: 16, rx: 8, fill: BLUE, stroke: '#fff', 'stroke-width': 1.5 });
            svg.appendChild(v); vis.push(v);
        }
        for (var j = 0; j < 6; j++) {
            var w = s('rect', { 'class': 'vz-token', width: 16, height: 16, rx: 4, fill: ORANGE, stroke: '#fff', 'stroke-width': 1.5 });
            svg.appendChild(w); txt.push(w);
        }
        f.stage.appendChild(svg);

        function put(el, x, y, op) {
            el.style.transform = 'translate(' + x + 'px,' + y + 'px)';
            el.style.opacity = op;
        }

        function render() {
            var st = STEPS[step];
            Object.keys(nodes).forEach(function (k) { nodes[k].classList.toggle('is-dim', st.on.indexOf(k) === -1); });
            vis.forEach(function (el, i) {
                var gx = (i % 3) * 20, gy = Math.floor(i / 3) * 20;
                el.style.transitionDelay = (V.reduceMotion ? 0 : i * 50) + 'ms';
                el.setAttribute('rx', step >= 2 ? 4 : 8);
                el.classList.toggle('is-reading', step === 4);
                if (step === 0) put(el, 58, 76, 0);
                else if (step === 1) put(el, 262 + gx, 66 + gy, 1);
                else if (step === 2) put(el, 440 + gx, 66 + gy, 1);
                else put(el, 152 + i * 24, 184, 1);
            });
            txt.forEach(function (el, j) {
                el.style.transitionDelay = (V.reduceMotion ? 0 : j * 50) + 'ms';
                el.classList.toggle('is-reading', step === 4);
                if (step < 3) put(el, 106, 262, 0);
                else put(el, 312 + j * 24, 184, 1);
            });
            badges.forEach(function (b, i) {
                b.textContent = st.badge ? st.badge[i] : '';
                b.setAttribute('opacity', st.badge ? 1 : 0);
            });
            clearInterval(timer);
            if (step < 4) { typed = 0; }
            else if (step === 4 && !V.reduceMotion) {
                typed = 0;
                timer = setInterval(function () {
                    typed++;
                    answerText.textContent = WORDS.slice(0, typed).join(' ').replace(' .', '.');
                    if (typed >= WORDS.length) clearInterval(timer);
                }, 330);
            } else { typed = WORDS.length; }
            answerText.textContent = WORDS.slice(0, typed).join(' ').replace(' .', '.');
            dots.forEach(function (d, i) { d.classList.toggle('is-on', i === step); });
            back.disabled = step === 0;
            next.textContent = step === STEPS.length - 1 ? 'Start over' : 'Next';
            f.say(st.say);
        }

        function go(n) { step = (n + STEPS.length) % STEPS.length; render(); }
        function stopAuto() { clearInterval(auto); auto = null; playBtn.textContent = 'Play all'; }
        var back = V.button('Back', function () { stopAuto(); go(step - 1); });
        var next = V.button('Next', function () { stopAuto(); go(step + 1); }, true);
        var playBtn = V.button('Play all', function () {
            if (auto) { stopAuto(); return; }
            playBtn.textContent = 'Pause';
            if (step === STEPS.length - 1) go(0);
            auto = setInterval(function () {
                if (step === STEPS.length - 1) { stopAuto(); return; }
                go(step + 1);
            }, 3600);
        });
        var dots = STEPS.map(function () { return h('i'); });
        f.controls.appendChild(back);
        f.controls.appendChild(next);
        f.controls.appendChild(playBtn);
        f.controls.appendChild(h('span', { 'class': 'vz-steps', 'aria-hidden': 'true' }, dots));
        render();
    }

    /* ---------- 4. The output head ---------- */

    function head(root) {
        var f = V.figure(root, {
            kicker: 'Step 4', title: 'How the output head samples each word', plain: true,
            sub: 'The final layer converts the model’s hidden state into next-word probabilities.'
        });
        var GIVEN = ['The', 'cat', 'is', 'sitting', 'on', 'the'];
        var NODES = {
            start: [['hill', 3.2], ['grass', 2.7], ['sofa', 2.0], ['mat', 1.7], ['roof', 0.9], ['moon', -0.4], ['pizza', -1.6]],
            noun: [['.', 2.6], ['and', 1.9], ['under', 1.5], ['watching', 1.4], ['because', 0.6], ['loudly', -1.2]],
            and: [['purring', 2.4], ['watching', 1.8], ['sleeping', 1.7], ['smiling', 0.6], ['flying', -1.5]],
            under: [['the sun', 2.8], ['a tree', 2.0], ['the stars', 1.0], ['the sea', -1.4]],
            watching: [['the ball', 2.9], ['the sun', 1.6], ['birds', 1.5], ['you', 0.4], ['television', -1.0]],
            because: [['it is warm', 2.4], ['it is tired', 1.9], ['it can', 0.8]],
            tail: [['.', 3.4], ['quietly', 1.0], ['happily', 0.9], ['again', -0.5]],
            last: [['.', 4.2], ['today', 0.6]]
        };
        function nextState(state, word) {
            if (word === '.') return null;
            if (state === 'start') return 'noun';
            if (state === 'noun') return NODES[word] ? word : 'tail';
            if (state === 'and') return word === 'watching' ? 'watching' : 'tail';
            if (state === 'tail') return 'last';
            if (state === 'last') return null;
            return 'tail';
        }
        var state = 'start', words = [], temp = 1, busy = false;
        var sentence = h('div', { 'class': 'vz-sentence', 'aria-live': 'polite' });
        var vector = h('span', { 'class': 'vz-vector', 'aria-hidden': 'true' });
        for (var i = 0; i < 14; i++) vector.appendChild(h('i'));
        var flow = h('div', { 'class': 'vz-flow' }, [
            h('span', { 'class': 'vz-box' }, ['hidden state', h('small', null, [vector])]),
            '→',
            h('span', { 'class': 'vz-box' }, ['output head', h('small', { text: 'linear + softmax' })]),
            '→',
            h('span', { text: 'next-word probabilities:' })
        ]);
        var meters = h('div');
        var list = null;
        f.stage.appendChild(sentence);
        f.stage.appendChild(flow);
        f.stage.appendChild(meters);

        function probs() {
            var c = NODES[state];
            var ex = c.map(function (d) { return Math.exp(d[1] / temp); });
            var sum = ex.reduce(function (a, b) { return a + b; }, 0);
            return ex.map(function (e) { return e / sum; });
        }

        function paintVector() {
            var seed = 7 + words.length * 31;
            var r = V.rng(seed);
            Array.prototype.forEach.call(vector.children, function (cell) {
                var v = r();
                cell.style.backgroundColor = 'rgb(' + Math.round(V.lerp(205, 42, v)) + ',' + Math.round(V.lerp(226, 120, v)) + ',' + Math.round(V.lerp(251, 214, v)) + ')';
            });
        }

        function renderSentence(fresh) {
            sentence.textContent = '';
            GIVEN.forEach(function (w) { sentence.appendChild(h('span', { 'class': 'vz-given', text: w })); });
            words.forEach(function (w, i) {
                sentence.appendChild(h('span', { 'class': 'vz-chip' + (fresh && i === words.length - 1 ? ' is-new' : ''), text: w }));
            });
            if (state) sentence.appendChild(h('span', { 'class': 'vz-caret' }));
        }

        function renderMeters(hit) {
            if (!state) { meters.textContent = ''; list = null; return; }
            var c = NODES[state];
            if (!list || list.rows.length !== c.length || list.state !== state) {
                list = V.meterList(c.map(function (d) { return d[0]; }));
                list.state = state;
                meters.textContent = '';
                meters.appendChild(list.node);
                void list.node.offsetWidth;
            }
            list.set(probs(), hit);
        }

        function explain() {
            if (!state) { f.say('Sentence complete. Click "Start over" to sample another sentence.'); return; }
            var mood = temp < 0.6 ? 'Low temperature sharpens the distribution so the highest-scoring word is chosen almost every time.'
                : temp > 1.4 ? 'High temperature flattens the distribution, giving lower-scoring words a higher chance of being sampled.'
                    : 'At each step, the model samples one word from this probability distribution.';
            f.say(mood + ' Drag the temperature slider to see the probabilities change.');
        }

        function pick() {
            if (busy || !state) return;
            var p = probs(), r = Math.random(), k = 0;
            for (var i = 0; i < p.length; i++) { r -= p[i]; if (r <= 0) { k = i; break; } k = i; }
            var word = NODES[state][k][0];
            busy = true;
            renderMeters(k);
            setTimeout(function () {
                words.push(word);
                state = nextState(state, word);
                busy = false;
                renderSentence(true); paintVector(); renderMeters(-1); explain();
                pickBtn.disabled = !state;
            }, V.reduceMotion ? 0 : 520);
        }

        var pickBtn = V.button('Pick the next word', pick, true);
        var reset = V.button('Start over', function () {
            state = 'start'; words = []; busy = false; pickBtn.disabled = false;
            renderSentence(false); paintVector(); renderMeters(-1); explain();
        });
        var sl = V.slider({
            label: 'Temperature', min: 0.2, max: 2, step: 0.1, value: 1,
            format: function (v) { return v.toFixed(1); },
            oninput: function (v) { temp = v; renderMeters(-1); explain(); }
        });
        f.controls.appendChild(pickBtn);
        f.controls.appendChild(reset);
        f.controls.appendChild(sl.node);
        renderSentence(false); paintVector(); renderMeters(-1); explain();
    }

    /* ---------- 5. Attention ---------- */

    function attention(root) {
        var f = V.figure(root, {
            kicker: 'Step 5', title: 'Which image patches does each word attend to?', plain: true,
            sub: 'Click a word in the sentence to inspect its attention weights over the image patches.'
        });
        var WORDS = [['The', 'none'], ['cat', 'cat'], ['watches', 'watch'], ['the', 'none'], ['ball', 'ball'], ['under', 'under'], ['the', 'none'], ['sun', 'sun']];
        var MAPS = {
            none: { base: 1, bumps: [] },
            cat: { base: 0.02, bumps: [[84, 152, 34, 1]] },
            ball: { base: 0.02, bumps: [[170, 206, 20, 1]] },
            sun: { base: 0.02, bumps: [[186, 54, 26, 1]] },
            watch: { base: 0.03, bumps: [[84, 126, 22, 1], [168, 204, 20, 0.8]] },
            under: { base: 0.05, bumps: [[186, 54, 30, 0.6], [120, 214, 60, 0.5]] }
        };
        var SAY = {
            none: 'Function words like “the” do not refer to a specific object, so attention spreads across the whole image.',
            cat: '“cat” focuses its attention weights on the patches containing the cat.',
            ball: '“ball” concentrates attention on the red ball in the bottom-right corner.',
            sun: '“sun” attends to the upper-right patches containing the sun.',
            watch: '“watches” attends to both the cat’s head and the ball to link the subject and object.',
            under: '“under” captures a spatial relation, spreading attention between the sun above and the ground below.'
        };
        var N = 6, CS = 240 / N;
        var svg = s('svg', { viewBox: '0 0 240 240', role: 'img', 'aria-label': 'The picture with a spotlight on the patches the selected word attends to.' });
        svg.style.borderRadius = '10px';
        svg.appendChild(sceneDefs('vz-scene-c'));
        svg.appendChild(s('use', { href: '#vz-scene-c', width: 240, height: 240 }));
        var veil = [];
        for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) {
            var cell = s('rect', { x: c * CS, y: r * CS, width: CS, height: CS, fill: '#17120e', opacity: 0 });
            cell.style.transition = 'opacity 0.35s';
            svg.appendChild(cell);
            veil.push({ el: cell, x: c * CS + CS / 2, y: r * CS + CS / 2 });
        }
        for (var g = 1; g < N; g++) {
            svg.appendChild(s('line', { x1: g * CS, y1: 0, x2: g * CS, y2: 240, stroke: '#fff', 'stroke-opacity': 0.35, 'stroke-width': 0.8 }));
            svg.appendChild(s('line', { x1: 0, y1: g * CS, x2: 240, y2: g * CS, stroke: '#fff', 'stroke-opacity': 0.35, 'stroke-width': 0.8 }));
        }
        var chips = [];
        var chipRow = h('div', { 'class': 'vz-row' });
        var shares = V.meterList(['the cat', 'the ball', 'the sun', 'everything else']);
        var side = h('div', null, [
            h('p', { 'class': 'vz-side-title', text: 'The sentence being written' }), chipRow,
            h('p', { 'class': 'vz-side-title', text: 'Share of attention', style: { 'margin-top': '1rem' } }), shares.node
        ]);
        f.stage.appendChild(h('div', { 'class': 'vz-split' }, [svg, side]));
        var auto = null;

        function region(x, y) {
            var dx = (x - 84) / 46, dy = (y - 154) / 66;
            if (dx * dx + dy * dy < 1) return 0;
            if (Math.hypot(x - 170, y - 206) < 26) return 1;
            if (Math.hypot(x - 186, y - 54) < 36) return 2;
            return 3;
        }

        function show(i) {
            var key = WORDS[i][1], m = MAPS[key];
            var w = veil.map(function (cell) {
                var v = m.base;
                m.bumps.forEach(function (b) {
                    var d2 = (cell.x - b[0]) * (cell.x - b[0]) + (cell.y - b[1]) * (cell.y - b[1]);
                    v += b[3] * Math.exp(-d2 / (2 * b[2] * b[2]));
                });
                return v;
            });
            var sum = w.reduce(function (a, b) { return a + b; }, 0), max = Math.max.apply(null, w);
            var by = [0, 0, 0, 0];
            veil.forEach(function (cell, k) {
                cell.el.setAttribute('opacity', '');
                cell.el.style.opacity = key === 'none' ? 0.35 : (0.74 * (1 - w[k] / max)).toFixed(3);
                by[region(cell.x, cell.y)] += w[k] / sum;
            });
            shares.set(by, by.indexOf(Math.max.apply(null, by)));
            chips.forEach(function (ch, k) { ch.setAttribute('aria-pressed', k === i ? 'true' : 'false'); });
            f.say(SAY[key]);
        }

        function stop() { clearInterval(auto); auto = null; }
        WORDS.forEach(function (wd, i) {
            var ch = h('button', { 'class': 'vz-chip', type: 'button', 'aria-pressed': 'false', text: wd[0], onclick: function () { stop(); show(i); } });
            chips.push(ch);
            chipRow.appendChild(ch);
        });
        show(1);
        V.onVisible(root, function () {
            if (V.reduceMotion) return;
            var order = [1, 4, 7, 2, 5, 0], k = 0;
            auto = setInterval(function () { k = (k + 1) % order.length; show(order[k]); }, 2600);
            ['pointerdown', 'focusin'].forEach(function (ev) { root.addEventListener(ev, stop, { once: true }); });
        });
    }

    /* ---------- 6. Three recipes ---------- */

    function box(x, y, w, hgt, label, sub, kind) {
        var fill = kind === 'vision' ? '#e9f2fc' : kind === 'text' ? '#fdeee6' : kind === 'core' ? '#f4f1ea' : '#fff';
        var stroke = kind === 'vision' ? BLUE : kind === 'text' ? ORANGE : '#c9c5ba';
        var cy = y + hgt / 2;
        return s('g', null, [
            s('rect', { x: x, y: y, width: w, height: hgt, rx: 10, fill: fill, stroke: stroke, 'stroke-width': 1.6 }),
            s('text', { x: x + w / 2, y: sub ? cy - 2 : cy + 4.5, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, text: label }),
            sub ? s('text', { 'class': 'vz-t3', x: x + w / 2, y: cy + 14, 'text-anchor': 'middle', 'font-size': 10.5, text: sub }) : null
        ]);
    }

    function line(id, d) {
        return s('path', { id: id, d: d, fill: 'none', stroke: '#c9c5ba', 'stroke-width': 1.6, 'marker-end': 'url(#vz-ah-r)' });
    }

    function flow(pathId, color, count, dur) {
        var out = [];
        if (V.reduceMotion) return out;
        for (var i = 0; i < count; i++) {
            out.push(s('rect', { x: -4.5, y: -4.5, width: 9, height: 9, rx: 2.5, fill: color, stroke: '#fff', 'stroke-width': 1.5 }, [
                s('animateMotion', { dur: dur + 's', begin: (-(i * dur) / count).toFixed(2) + 's', repeatCount: 'indefinite' }, [s('mpath', { href: '#' + pathId })])
            ]));
        }
        return out;
    }

    function moving(tag, attrs, from, to, dur) {
        var node = s(tag, attrs);
        Object.keys(to).forEach(function (k) {
            if (V.reduceMotion) { node.setAttribute(k, to[k]); return; }
            node.setAttribute(k, from[k]);
            node.appendChild(s('animate', {
                attributeName: k, dur: dur + 's', repeatCount: 'indefinite',
                values: [from[k], to[k], to[k], from[k], from[k]].join(';'), keyTimes: '0;0.35;0.75;0.92;1',
                calcMode: 'spline', keySplines: '0.3 0 0.2 1;0 0 1 1;0.3 0 0.2 1;0 0 1 1'
            }));
        });
        return node;
    }

    function recipeSvg(label, kids) {
        return s('svg', { viewBox: '0 0 720 260', role: 'img', 'aria-label': label }, [s('defs', null, [arrowHead('vz-ah-r')])].concat(kids));
    }

    var RECIPES = [
        {
            label: 'Dual encoders (CLIP)',
            say: 'Separate vision and text encoders trained with contrastive learning to share one embedding space. Fast for retrieval and zero-shot classification, though it cannot generate sentences.',
            draw: function () {
                var pairs = [
                    { i0: [395, 82], i1: [432, 96], t0: [640, 196], t1: [452, 110] },
                    { i0: [565, 70], i1: [590, 126], t0: [372, 204], t1: [610, 140] },
                    { i0: [470, 212], i1: [500, 196], t0: [668, 92], t1: [520, 210] }
                ];
                var kids = [
                    box(16, 34, 96, 64, 'Picture', null, 'vision'), box(150, 34, 130, 64, 'Vision encoder', null, 'vision'),
                    box(16, 162, 96, 64, 'Caption', null, 'text'), box(150, 162, 130, 64, 'Text encoder', null, 'text'),
                    line('vz-r-a1', 'M112 66 H148'), line('vz-r-a2', 'M280 66 H328'), line('vz-r-a3', 'M112 194 H148'), line('vz-r-a4', 'M280 194 H328'),
                    s('rect', { x: 330, y: 20, width: 374, height: 222, rx: 12, fill: '#fff', stroke: '#e7e4dc' }),
                    s('text', { x: 346, y: 42, 'font-size': 12, 'font-weight': 700, text: 'Shared space' })
                ];
                pairs.forEach(function (p) {
                    kids.push(moving('line', { stroke: '#b9b5aa', 'stroke-width': 1.3 },
                        { x1: p.i0[0], y1: p.i0[1], x2: p.t0[0], y2: p.t0[1], 'stroke-opacity': 0.25 },
                        { x1: p.i1[0], y1: p.i1[1], x2: p.t1[0], y2: p.t1[1], 'stroke-opacity': 1 }, 7));
                    kids.push(moving('circle', { r: 7, fill: BLUE, stroke: '#fff', 'stroke-width': 2 }, { cx: p.i0[0], cy: p.i0[1] }, { cx: p.i1[0], cy: p.i1[1] }, 7));
                    kids.push(moving('rect', { width: 13, height: 13, rx: 3, fill: ORANGE, stroke: '#fff', 'stroke-width': 2 },
                        { x: p.t0[0] - 6.5, y: p.t0[1] - 6.5 }, { x: p.t1[0] - 6.5, y: p.t1[1] - 6.5 }, 7));
                });
                return recipeSvg('Two encoders map pictures and captions into one shared space.', kids.concat(flow('vz-r-a2', BLUE, 2, 1.6), flow('vz-r-a4', ORANGE, 2, 1.6)));
            }
        },
        {
            label: 'Encoder + Projector + LLM',
            say: 'The LLaVA-style design: connect a pretrained vision encoder to a pretrained LLM using a small projector. Cheap to train and strong at open-ended visual conversation.',
            draw: function () {
                var kids = [
                    box(16, 34, 96, 64, 'Picture', null, 'vision'), box(150, 34, 130, 64, 'Vision encoder', null, 'vision'),
                    box(318, 34, 110, 64, 'Projector', null, 'vision'),
                    box(16, 162, 96, 64, 'Question', null, 'text'), box(150, 162, 130, 64, 'Text tokens', null, 'text'),
                    box(472, 56, 128, 148, 'Language model', 'already trained', 'core'), box(634, 98, 72, 64, 'Answer', null, 'text'),
                    line('vz-r-b1', 'M112 66 H148'), line('vz-r-b2', 'M280 66 H316'), line('vz-r-b3', 'M428 66 C452 66 446 104 470 104'),
                    line('vz-r-b4', 'M112 194 H148'), line('vz-r-b5', 'M280 194 H420 C452 194 446 156 470 156'), line('vz-r-b6', 'M600 130 H632')
                ];
                return recipeSvg('A vision encoder and projector feed picture tokens into a language model.',
                    kids.concat(flow('vz-r-b2', BLUE, 2, 1.4), flow('vz-r-b3', BLUE, 2, 1.6), flow('vz-r-b5', ORANGE, 3, 2.6), flow('vz-r-b6', ORANGE, 2, 1.4)));
            }
        },
        {
            label: 'Unified token model',
            say: 'Tokenize both images and text into one sequence so a single Transformer predicts the next visual or text token, supporting both image understanding and image generation.',
            draw: function () {
                var strip = [s('rect', { x: 318, y: 100, width: 150, height: 60, rx: 10, fill: '#fff', stroke: '#c9c5ba', 'stroke-width': 1.6 })];
                [BLUE, BLUE, BLUE, BLUE, ORANGE, ORANGE, ORANGE].forEach(function (c, i) {
                    strip.push(s('rect', { x: 329 + i * 18.5, y: 110, width: 14, height: 14, rx: 3.5, fill: c }));
                });
                strip.push(s('text', { 'class': 'vz-t3', x: 393, y: 147, 'text-anchor': 'middle', 'font-size': 10.5, text: 'one sequence' }));
                var kids = [
                    box(16, 34, 96, 64, 'Picture', null, 'vision'), box(150, 34, 130, 64, 'Visual tokenizer', null, 'vision'),
                    box(16, 162, 96, 64, 'Text', null, 'text'), box(150, 162, 130, 64, 'Text tokenizer', null, 'text'),
                    line('vz-r-c1', 'M112 66 H148'), line('vz-r-c2', 'M280 66 C304 66 292 116 316 116'),
                    line('vz-r-c3', 'M112 194 H148'), line('vz-r-c4', 'M280 194 C304 194 292 144 316 144'), line('vz-r-c5', 'M468 130 H496'),
                    box(498, 56, 116, 148, 'One model', 'predicts next token', 'core'),
                    line('vz-r-c6', 'M614 96 H638'), line('vz-r-c7', 'M614 164 H638'),
                    box(640, 70, 68, 52, 'Text', null, 'text'), box(640, 138, 68, 52, 'Picture', null, 'vision')
                ].concat(strip);
                return recipeSvg('Pictures and text become one token sequence, and one model predicts the next token of either kind.',
                    kids.concat(flow('vz-r-c2', BLUE, 2, 1.6), flow('vz-r-c4', ORANGE, 2, 1.6), flow('vz-r-c5', BLUE, 1, 1.2), flow('vz-r-c6', ORANGE, 1, 1.2), flow('vz-r-c7', BLUE, 1, 1.2)));
            }
        }
    ];

    function recipes(root) {
        var f = V.figure(root, {
            kicker: 'Architectures', title: 'Three common VLM designs',
            sub: 'Blue represents visual features/tokens and orange represents text.'
        });
        var t = V.tabs(RECIPES.map(function (r) { return r.label; }), function (i) {
            f.stage.textContent = '';
            f.stage.appendChild(RECIPES[i].draw());
            f.say(RECIPES[i].say);
        }, 'Recipe');
        f.top.appendChild(t.node);
        t.select(1);
    }

    /* ---------- 7. Hallucination ---------- */

    function hallucination(root) {
        var f = V.figure(root, {
            kicker: 'Failure mode', title: 'Hallucination: language priors vs. visual tokens', plain: true,
            sub: 'Slide to adjust how strongly the model weighs visual tokens relative to its text priors.'
        });
        var svg = s('svg', { viewBox: '0 0 240 240', role: 'img', 'aria-label': 'A cat on a hill with a ball and the sun. There is no dog.' });
        svg.style.borderRadius = '10px';
        svg.appendChild(sceneDefs('vz-scene-d'));
        svg.appendChild(s('use', { href: '#vz-scene-d', width: 240, height: 240 }));
        var meters = V.meterList(['says “yes”', 'says “no”']);
        var answer = h('div', { 'class': 'vz-bubble is-answer' });
        var status = h('div', { 'class': 'vz-status' });
        var side = h('div', null, [
            h('div', { 'class': 'vz-bubble', text: 'Is there a dog in the picture?' }),
            h('p', { 'class': 'vz-side-title', text: 'What the model is likely to answer', style: { 'margin-top': '1rem' } }),
            meters.node,
            h('div', { style: { 'margin-top': '0.9rem', 'text-align': 'right' } }, [answer, h('br'), status])
        ]);
        f.stage.appendChild(h('div', { 'class': 'vz-split' }, [svg, side]));

        function update(v) {
            var w = v / 100;
            var pYes = 1 / (1 + Math.exp(-((1 - w) * 2.4 - w * 3.6)));
            meters.set([pYes, 1 - pYes], pYes > 0.5 ? 0 : 1);
            var bad = pYes > 0.5;
            answer.textContent = bad ? 'Yes, there is a dog sitting next to the cat.' : 'No. I can see a cat, a ball and the sun, but no dog.';
            status.className = 'vz-status ' + (bad ? 'is-bad' : 'is-good');
            status.textContent = bad ? '⚠ Hallucination: the picture has no dog' : '✓ Grounded in the picture';
            f.say(bad
                ? 'Because “cat” and “dog” frequently appear together in text corpora, weak visual weight lets text priors dominate, causing a hallucinated answer.'
                : 'With sufficient weight on the visual tokens, the model grounds its answer in what is actually visible in the image.');
        }

        var sl = V.slider({
            label: 'Visual grounding weight', min: 0, max: 100, value: 20,
            format: function (v) { return Math.round(v) + '%'; },
            oninput: update
        });
        f.controls.appendChild(sl.node);
        update(20);
    }

    var FIGURES = {
        'vlm-patches': patchify, 'vlm-contrastive': contrastive, 'vlm-pipeline': pipeline, 'vlm-head': head,
        'vlm-attention': attention, 'vlm-recipes': recipes, 'vlm-hallucination': hallucination
    };
    Object.keys(FIGURES).forEach(function (id) {
        var root = document.getElementById(id);
        if (root) FIGURES[id](root);
    });
})();
