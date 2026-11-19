/* Shared helpers for the explorable figures in blog posts. No dependencies. */
(function () {
    'use strict';

    var SVGNS = 'http://www.w3.org/2000/svg';
    var XLINK = 'http://www.w3.org/1999/xlink';
    var reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    function setAttrs(node, attrs) {
        Object.keys(attrs || {}).forEach(function (k) {
            var v = attrs[k];
            if (v === null || v === undefined || v === false) return;
            if (k === 'text') node.textContent = v;
            else if (k === 'style' && typeof v === 'object') Object.keys(v).forEach(function (p) { node.style.setProperty(p, v[p]); });
            else if (k.slice(0, 2) === 'on') node.addEventListener(k.slice(2), v);
            else if (k === 'href' && node.namespaceURI === SVGNS) { node.setAttribute('href', v); node.setAttributeNS(XLINK, 'xlink:href', v); }
            else node.setAttribute(k, v);
        });
    }

    function append(node, kids) {
        (kids || []).forEach(function (kid) {
            if (kid === null || kid === undefined || kid === false) return;
            node.appendChild(typeof kid === 'string' ? document.createTextNode(kid) : kid);
        });
        return node;
    }

    function h(tag, attrs, kids) {
        var node = document.createElement(tag);
        setAttrs(node, attrs);
        return append(node, kids);
    }

    function s(tag, attrs, kids) {
        var node = document.createElementNS(SVGNS, tag);
        setAttrs(node, attrs);
        return append(node, kids);
    }

    function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
    function lerp(a, b, t) { return a + (b - a) * t; }
    function ease(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

    /* Small seeded random generator, so every visitor sees the same picture. */
    function rng(seed) {
        var a = seed >>> 0;
        return function () {
            a |= 0; a = (a + 0x6D2B79F5) | 0;
            var t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    /* One tooltip for the whole page. Content is built with textContent only. */
    var tip;
    function showTip(target, title, lines) {
        if (!tip) {
            tip = h('div', { 'class': 'vz-tip', role: 'tooltip' });
            document.body.appendChild(tip);
        }
        tip.textContent = '';
        tip.appendChild(h('strong', { text: title }));
        (lines || []).forEach(function (line) { tip.appendChild(h('span', { text: line, style: { display: 'block' } })); });
        var r = target.getBoundingClientRect();
        tip.style.left = '0px';
        tip.style.top = '0px';
        var tw = tip.offsetWidth;
        var th = tip.offsetHeight;
        var left = r.left + r.width / 2 - tw / 2 + window.pageXOffset;
        left = Math.max(window.pageXOffset + 8, Math.min(left, window.pageXOffset + document.documentElement.clientWidth - tw - 8));
        var top = r.top - th - 8 + window.pageYOffset;
        if (r.top - th - 8 < 0) top = r.bottom + 8 + window.pageYOffset;
        tip.style.left = left + 'px';
        tip.style.top = top + 'px';
        tip.classList.add('is-on');
    }

    function hideTip() {
        if (tip) tip.classList.remove('is-on');
    }

    function bindTip(node, content) {
        function on() {
            var c = content();
            showTip(node, c.title, c.lines);
        }
        node.addEventListener('pointerenter', on);
        node.addEventListener('focus', on);
        node.addEventListener('pointerleave', hideTip);
        node.addEventListener('blur', hideTip);
    }

    /* Calls fn once, the first time the node scrolls into view. */
    function onVisible(node, fn) {
        if (!('IntersectionObserver' in window)) { fn(); return; }
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
                if (e.isIntersecting) { io.disconnect(); fn(); }
            });
        }, { threshold: 0.25 });
        io.observe(node);
    }

    /*
     * Animation loop that only runs while the node is on screen and the tab is visible.
     * tick(dt, t) gets seconds. Returns { setEnabled(bool) }.
     */
    function loop(node, tick) {
        var visible = !('IntersectionObserver' in window);
        var enabled = true;
        var running = false;
        var raf = 0;
        var last = 0;
        function frame(ts) {
            if (!running) return;
            var dt = Math.min(0.05, (ts - last) / 1000 || 0);
            last = ts;
            tick(dt, ts / 1000);
            raf = requestAnimationFrame(frame);
        }
        function update() {
            var should = visible && enabled && !document.hidden;
            if (should && !running) { running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
            else if (!should && running) { running = false; cancelAnimationFrame(raf); }
        }
        if ('IntersectionObserver' in window) {
            new IntersectionObserver(function (entries) {
                entries.forEach(function (e) { visible = e.isIntersecting; });
                update();
            }, { threshold: 0.05 }).observe(node);
        }
        document.addEventListener('visibilitychange', update);
        update();
        return { setEnabled: function (b) { enabled = b; update(); } };
    }

    /* Builds the common figure frame and returns its parts. */
    function figure(root, opts) {
        root.classList.add('viz');
        root.textContent = '';
        if (opts.kicker) root.appendChild(h('span', { 'class': 'viz-kicker', text: opts.kicker }));
        if (opts.title) root.appendChild(h('p', { 'class': 'viz-title', text: opts.title }));
        if (opts.sub) root.appendChild(h('p', { 'class': 'viz-sub', text: opts.sub }));
        var top = h('div', { 'class': 'viz-controls' });
        var stage = h('div', { 'class': 'viz-stage' + (opts.plain ? ' is-plain' : '') });
        var controls = h('div', { 'class': 'viz-controls' });
        var caption = h('p', { 'class': 'viz-caption', 'aria-live': 'polite' });
        top.style.margin = '0 0 0.8rem';
        root.appendChild(top);
        root.appendChild(stage);
        root.appendChild(controls);
        root.appendChild(caption);
        var lastText = null;
        return {
            top: top, stage: stage, controls: controls, caption: caption,
            say: function (text) {
                if (text === lastText) return;
                lastText = text;
                caption.textContent = text;
                caption.classList.remove('vz-fade');
                void caption.offsetWidth;
                caption.classList.add('vz-fade');
            }
        };
    }

    function button(label, onclick, primary) {
        return h('button', { 'class': 'vz-btn' + (primary ? ' is-primary' : ''), type: 'button', text: label, onclick: onclick });
    }

    var uid = 0;
    function slider(opts) {
        var id = 'vz-range-' + (++uid);
        var fmt = opts.format || function (v) { return String(v); };
        var out = h('output', { 'for': id, text: fmt(opts.value) });
        var input = h('input', { type: 'range', id: id, min: opts.min, max: opts.max, step: opts.step || 1, value: opts.value });
        input.addEventListener('input', function () {
            var v = parseFloat(input.value);
            out.textContent = fmt(v);
            opts.oninput(v);
        });
        var label = h('label', { 'for': id, text: opts.label });
        var node = h('div', { 'class': 'vz-slider' }, [label, input, out]);
        return {
            node: node, input: input, label: label,
            set: function (v) { input.value = v; out.textContent = fmt(v); },
            configure: function (o) {
                if (o.label) label.textContent = o.label;
                input.min = o.min; input.max = o.max; input.step = o.step || 1; input.value = o.value;
                if (o.format) fmt = o.format;
                out.textContent = fmt(o.value);
            }
        };
    }

    function checkbox(label, checked, onchange) {
        var input = h('input', { type: 'checkbox' });
        input.checked = !!checked;
        input.addEventListener('change', function () { onchange(input.checked); });
        return { node: h('label', { 'class': 'vz-check' }, [input, label]), input: input };
    }

    /* A row of pill buttons where exactly one is selected. */
    function tabs(labels, onChange, ariaLabel) {
        var buttons = [];
        var bar = h('div', { 'class': 'vz-tabs', role: 'tablist', 'aria-label': ariaLabel || 'View' });
        function select(i, silent) {
            buttons.forEach(function (b, j) { b.setAttribute('aria-selected', j === i ? 'true' : 'false'); });
            if (!silent) onChange(i);
        }
        labels.forEach(function (label, i) {
            var b = h('button', { 'class': 'vz-tab', type: 'button', role: 'tab', text: label, onclick: function () { select(i); } });
            buttons.push(b);
            bar.appendChild(b);
        });
        return { node: bar, select: select };
    }

    /* Canvas sized in CSS pixels (w x h logical units) and scaled for sharp displays. */
    function canvas(w, hgt) {
        var dpr = Math.min(2, window.devicePixelRatio || 1);
        var node = h('canvas', { width: Math.round(w * dpr), height: Math.round(hgt * dpr) });
        node.style.aspectRatio = w + ' / ' + hgt;
        var ctx = node.getContext('2d');
        ctx.scale(dpr, dpr);
        return { node: node, ctx: ctx, w: w, h: hgt, dpr: dpr };
    }

    /* Pointer drag. cb(dx, dy) in CSS pixels; start() fires once per gesture. */
    function drag(node, cb, start) {
        var active = false, lx = 0, ly = 0;
        node.addEventListener('pointerdown', function (e) {
            active = true; lx = e.clientX; ly = e.clientY;
            if (node.setPointerCapture) node.setPointerCapture(e.pointerId);
            if (start) start();
        });
        node.addEventListener('pointermove', function (e) {
            if (!active) return;
            cb(e.clientX - lx, e.clientY - ly);
            lx = e.clientX; ly = e.clientY;
        });
        ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) {
            node.addEventListener(ev, function () { active = false; });
        });
    }

    function meterList(names) {
        var rows = names.map(function (name) {
            var fill = h('span', { 'class': 'vz-fill' });
            var val = h('span', { 'class': 'vz-val', text: '' });
            var row = h('div', { 'class': 'vz-meter-row' }, [h('span', { 'class': 'vz-name', text: name }), h('span', { 'class': 'vz-track' }, [fill]), val]);
            return { row: row, fill: fill, val: val };
        });
        var node = h('div', { 'class': 'vz-meter-list' }, rows.map(function (r) { return r.row; }));
        return {
            node: node, rows: rows,
            set: function (values, hit) {
                values.forEach(function (v, i) {
                    rows[i].fill.style.width = (clamp(v, 0, 1) * 100).toFixed(1) + '%';
                    rows[i].val.textContent = Math.round(v * 100) + '%';
                    rows[i].row.classList.toggle('is-hit', i === hit);
                });
            }
        };
    }

    window.BlogViz = {
        h: h, s: s, reduceMotion: reduceMotion, clamp: clamp, lerp: lerp, ease: ease, rng: rng,
        bindTip: bindTip, onVisible: onVisible, loop: loop, figure: figure,
        button: button, slider: slider, checkbox: checkbox, tabs: tabs,
        canvas: canvas, drag: drag, meterList: meterList
    };
})();
