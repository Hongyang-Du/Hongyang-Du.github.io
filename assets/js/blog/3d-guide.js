/* Explorable figures for the visual guide to 3D vision. Everything is computed in the browser. */
(function () {
    'use strict';
    var V = window.BlogViz;
    if (!V) return;
    var h = V.h, s = V.s;
    var BLUE = '#2a78d6', ORANGE = '#eb6834';

    /* ================= The shape: a bunny built from blended ellipsoids ================= */

    var PR = [
        [0, -0.28, 0, 0.50, 0.42, 0.40],        /* body */
        [0.40, 0.20, 0, 0.29, 0.27, 0.26],      /* head */
        [0.34, 0.68, 0.12, 0.075, 0.30, 0.055], /* ears */
        [0.34, 0.68, -0.12, 0.075, 0.30, 0.055],
        [-0.50, -0.26, 0, 0.15, 0.15, 0.15],    /* tail */
        [0.26, -0.64, 0.20, 0.20, 0.09, 0.11],  /* feet */
        [0.26, -0.64, -0.20, 0.20, 0.09, 0.11],
        [0.64, 0.14, 0, 0.10, 0.08, 0.09]       /* snout */
    ];
    var CY = 0.12; /* vertical center of the model */

    /* Signed distance: negative inside the bunny, positive outside, zero on the surface. */
    function sdf(x, y, z) {
        var d = 1e9;
        for (var i = 0; i < PR.length; i++) {
            var p = PR[i];
            var ax = (x - p[0]) / p[3], ay = (y - p[1]) / p[4], az = (z - p[2]) / p[5];
            var k0 = Math.sqrt(ax * ax + ay * ay + az * az);
            var bx = ax / p[3], by = ay / p[4], bz = az / p[5];
            var k1 = Math.sqrt(bx * bx + by * by + bz * bz);
            var e = k1 > 1e-6 ? k0 * (k0 - 1) / k1 : -Math.min(p[3], p[4], p[5]);
            var hh = Math.max(0.07 - Math.abs(d - e), 0) / 0.07;
            d = Math.min(d, e) - hh * hh * 0.07 * 0.25;
        }
        return d;
    }

    function grad(x, y, z, out) {
        var e = 0.004;
        var gx = sdf(x + e, y, z) - sdf(x - e, y, z);
        var gy = sdf(x, y + e, z) - sdf(x, y - e, z);
        var gz = sdf(x, y, z + e) - sdf(x, y, z - e);
        var l = Math.sqrt(gx * gx + gy * gy + gz * gz) || 1;
        out[0] = gx / l; out[1] = gy / l; out[2] = gz / l;
        return out;
    }

    /* Points on the surface with their normals, computed once and shared by several figures. */
    var samples = null;
    function surfaceSamples() {
        if (samples) return samples;
        var N = 4000, r = V.rng(11), pts = new Float32Array(N * 6), g = [0, 0, 0], n = 0, guard = 0;
        while (n < N && guard < N * 40) {
            guard++;
            var x = -0.75 + r() * 1.6, y = -0.8 + r() * 1.85, z = -0.5 + r();
            for (var it = 0; it < 7; it++) {
                var d = sdf(x, y, z);
                grad(x, y, z, g);
                x -= d * g[0]; y -= d * g[1]; z -= d * g[2];
            }
            if (Math.abs(sdf(x, y, z)) > 0.004) continue;
            grad(x, y, z, g);
            pts.set([x, y, z, g[0], g[1], g[2]], n * 6);
            n++;
        }
        samples = { pts: pts, n: n };
        return samples;
    }

    /* ================= A tiny camera ================= */

    function makeRot(yaw, pitch) {
        return { ca: Math.cos(yaw), sa: Math.sin(yaw), cb: Math.cos(pitch), sb: Math.sin(pitch) };
    }
    /* World to view. View space: x right, y up, z toward the viewer. */
    function toView(R, x, y, z, out) {
        y -= CY;
        var x1 = x * R.ca + z * R.sa, z1 = -x * R.sa + z * R.ca;
        out[0] = x1; out[1] = y * R.cb - z1 * R.sb; out[2] = y * R.sb + z1 * R.cb;
        return out;
    }
    function dirToView(R, x, y, z, out) {
        var x1 = x * R.ca + z * R.sa, z1 = -x * R.sa + z * R.ca;
        out[0] = x1; out[1] = y * R.cb - z1 * R.sb; out[2] = y * R.sb + z1 * R.cb;
        return out;
    }
    function toWorld(R, vx, vy, vz, out) {
        var y = vy * R.cb + vz * R.sb, z1 = -vy * R.sb + vz * R.cb;
        out[0] = vx * R.ca - z1 * R.sa; out[1] = y + CY; out[2] = vx * R.sa + z1 * R.ca;
        return out;
    }
    function dirToWorld(R, vx, vy, vz, out) {
        var y = vy * R.cb + vz * R.sb, z1 = -vy * R.sb + vz * R.cb;
        out[0] = vx * R.ca - z1 * R.sa; out[1] = y; out[2] = vx * R.sa + z1 * R.ca;
        return out;
    }

    var LIGHT = (function () { var l = Math.hypot(0.25, 0.6, 0.76); return [0.25 / l, 0.6 / l, 0.76 / l]; })();
    /* Half-Lambert shading: soft, with no pitch-black side. Returns 0.3 to 1. */
    function lit(nv) { var d = 0.5 + 0.5 * (nv[0] * LIGHT[0] + nv[1] * LIGHT[1] + nv[2] * LIGHT[2]); return 0.3 + 0.7 * d * d; }
    function tone(k, base) {
        base = base || [228, 164, 100];
        var d = 0.28 + 0.9 * k;
        return 'rgb(' + Math.min(255, Math.round(base[0] * d)) + ',' + Math.min(255, Math.round(base[1] * d)) + ',' + Math.min(255, Math.round(base[2] * d)) + ')';
    }

    /* Shoot one parallel ray per pixel and report what each one hits. */
    function raycast(R, W) {
        var depth = new Float32Array(W * W), shade = new Float32Array(W * W), pos = new Float32Array(W * W * 3);
        var o = [0, 0, 0], d = [0, 0, 0], g = [0, 0, 0], nv = [0, 0, 0];
        dirToWorld(R, 0, 0, -1, d);
        var E = 1.08, near = 1e9, far = -1e9;
        for (var j = 0; j < W; j++) {
            for (var i = 0; i < W; i++) {
                var u = ((i + 0.5) / W * 2 - 1) * E, v = (1 - (j + 0.5) / W * 2) * E;
                toWorld(R, u, v, 3, o);
                var t = 1.7, hit = false;
                for (var k = 0; k < 44 && t < 4.4; k++) {
                    var dist = sdf(o[0] + d[0] * t, o[1] + d[1] * t, o[2] + d[2] * t);
                    if (dist < 0.004) { hit = true; break; }
                    t += dist * 0.9;
                }
                var idx = j * W + i;
                if (hit) {
                    var px = o[0] + d[0] * t, py = o[1] + d[1] * t, pz = o[2] + d[2] * t;
                    grad(px, py, pz, g);
                    dirToView(R, g[0], g[1], g[2], nv);
                    depth[idx] = t; shade[idx] = lit(nv);
                    pos[idx * 3] = px; pos[idx * 3 + 1] = py; pos[idx * 3 + 2] = pz;
                    if (t < near) near = t;
                    if (t > far) far = t;
                } else { depth[idx] = 0; }
            }
        }
        return { W: W, depth: depth, shade: shade, pos: pos, near: near, far: far };
    }

    function paintImage(ctx, x, y, size, W, colorAt) {
        var off = document.createElement('canvas');
        off.width = W; off.height = W;
        var octx = off.getContext('2d'), img = octx.createImageData(W, W), c = [0, 0, 0, 255];
        for (var i = 0; i < W * W; i++) {
            colorAt(i, c);
            img.data[i * 4] = c[0]; img.data[i * 4 + 1] = c[1]; img.data[i * 4 + 2] = c[2]; img.data[i * 4 + 3] = c[3];
        }
        octx.putImageData(img, 0, 0);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(off, x, y, size, size);
        ctx.imageSmoothingEnabled = true;
    }

    function colorPixel(rc) {
        return function (i, c) {
            if (rc.depth[i] === 0) { c[0] = 226; c[1] = 236; c[2] = 247; c[3] = 255; return; }
            var k = 0.28 + 0.9 * rc.shade[i];
            c[0] = Math.min(255, 228 * k); c[1] = Math.min(255, 164 * k); c[2] = Math.min(255, 100 * k); c[3] = 255;
        };
    }
    function depthPixel(rc) {
        var span = Math.max(1e-6, rc.far - rc.near);
        return function (i, c) {
            if (rc.depth[i] === 0) { c[0] = 20; c[1] = 24; c[2] = 34; c[3] = 255; return; }
            var k = 1 - (rc.depth[i] - rc.near) / span; /* near is bright */
            c[0] = 40 + 215 * k; c[1] = 70 + 180 * k; c[2] = 120 + 131 * k; c[3] = 255;
        };
    }

    /* ================= 1. One photo is not enough ================= */

    function ambiguity(root) {
        var f = V.figure(root, {
            kicker: 'Depth ambiguity', title: 'One photo loses distance',
            sub: 'Top-down view: slide the red ball farther from camera A while scaling its size.'
        });
        var A = [60, 100], B = [60, 244], TH = 4 * Math.PI / 180, K = 0.075;
        var d = 200, two = false, auto = true, phase = 0;
        var svg = s('svg', { viewBox: '0 0 760 300', role: 'img', 'aria-label': 'Top view of a ball moving along a camera’s line of sight, with the photos each camera takes.' });
        var TILT = 0.45; /* camera B is turned toward the scene */
        function cam(p, label, deg) {
            return s('g', null, [
                s('g', { transform: 'rotate(' + (deg || 0) + ' ' + p[0] + ' ' + p[1] + ')' }, [
                    s('rect', { x: p[0] - 26, y: p[1] - 13, width: 30, height: 26, rx: 5, fill: '#4E3629' }),
                    s('path', { d: 'M' + (p[0] + 4) + ' ' + (p[1] - 7) + ' L' + (p[0] + 15) + ' ' + (p[1] - 12) + ' V' + (p[1] + 12) + ' L' + (p[0] + 4) + ' ' + (p[1] + 7) + ' Z', fill: '#4E3629' })
                ]),
                s('text', { 'class': 'vz-t2', x: p[0] - 8, y: p[1] + 36, 'text-anchor': 'middle', 'font-size': 11.5, text: label })
            ]);
        }
        var coneA = s('path', { fill: BLUE, 'fill-opacity': 0.13, stroke: BLUE, 'stroke-opacity': 0.5, 'stroke-width': 1 });
        var coneB = s('path', { 'class': 'vz-fade-el', fill: ORANGE, 'fill-opacity': 0.13, stroke: ORANGE, 'stroke-opacity': 0.5, 'stroke-width': 1 });
        var ball = s('circle', { fill: '#e34948', stroke: '#fff', 'stroke-width': 2 });
        var camB = cam(B, 'camera B', -TILT * 180 / Math.PI);
        camB.setAttribute('class', 'vz-fade-el');
        svg.appendChild(s('text', { 'class': 'vz-t3', x: 20, y: 24, 'font-size': 11.5, text: 'seen from above' }));
        svg.appendChild(s('clipPath', { id: 'vz-clip-topview' }, [s('rect', { x: 0, y: 0, width: 572, height: 300 })]));
        svg.appendChild(s('g', { 'clip-path': 'url(#vz-clip-topview)' }, [coneA, coneB, ball]));
        svg.appendChild(cam(A, 'camera A')); svg.appendChild(camB);
        function photo(y, label, color) {
            var dot = s('circle', { fill: '#e34948' });
            var clipId = 'vz-clip-' + label.replace(/\W/g, '');
            var g = s('g', { 'class': 'vz-fade-el' }, [
                s('clipPath', { id: clipId }, [s('rect', { x: 590, y: y, width: 152, height: 96, rx: 8 })]),
                s('rect', { x: 590, y: y, width: 152, height: 96, rx: 8, fill: '#fff', stroke: color, 'stroke-width': 2 }),
                s('g', { 'clip-path': 'url(#' + clipId + ')' }, [dot]),
                s('text', { 'class': 'vz-t2', x: 666, y: y - 8, 'text-anchor': 'middle', 'font-size': 11.5, text: label })
            ]);
            svg.appendChild(g);
            return { g: g, dot: dot, cy: y + 48 };
        }
        var pa = photo(42, 'what camera A sees', BLUE), pb = photo(184, 'what camera B sees', ORANGE);
        f.stage.appendChild(svg);

        function cone(c, bx, by, r) {
            var ang = Math.atan2(by - c[1], bx - c[0]), dist = Math.hypot(bx - c[0], by - c[1]);
            var half = Math.asin(Math.min(0.99, r / dist)), L = 560;
            return {
                d: 'M' + c[0] + ' ' + c[1] + ' L' + (c[0] + L * Math.cos(ang - half)).toFixed(1) + ' ' + (c[1] + L * Math.sin(ang - half)).toFixed(1) +
                    ' L' + (c[0] + L * Math.cos(ang + half)).toFixed(1) + ' ' + (c[1] + L * Math.sin(ang + half)).toFixed(1) + ' Z',
                ang: ang, size: r / dist
            };
        }

        function update() {
            var bx = A[0] + d * Math.cos(TH), by = A[1] + d * Math.sin(TH), r = K * d;
            ball.setAttribute('cx', bx); ball.setAttribute('cy', by); ball.setAttribute('r', r);
            coneA.setAttribute('d', cone(A, bx, by, r).d);
            pa.dot.setAttribute('cx', 666); pa.dot.setAttribute('cy', pa.cy); pa.dot.setAttribute('r', 24);
            var cb = cone(B, bx, by, r);
            coneB.setAttribute('d', cb.d);
            pb.dot.setAttribute('cx', 666 + ((cb.ang + TILT) / 0.5) * 76); pb.dot.setAttribute('cy', pb.cy);
            pb.dot.setAttribute('r', 24 * cb.size / K);
            [coneB, camB, pb.g].forEach(function (el) { el.setAttribute('opacity', two ? 1 : 0); });
            f.say(two
                ? 'Camera B sees the scene from a second angle, so the ball shifts position and size as distance changes. Combining two views pins down 3D depth through triangulation.'
                : 'A small nearby ball and a large distant ball fill the exact same viewing cone, so camera A captures the same image either way. Check "Add a second camera" to resolve the depth.');
        }

        var sl = V.slider({
            label: 'Distance of the ball', min: 130, max: 440, value: d,
            format: function (v) { return (v / 100).toFixed(1) + ' m'; },
            oninput: function (v) { auto = false; d = v; update(); }
        });
        var cb2 = V.checkbox('Add a second camera', false, function (on) { two = on; update(); });
        f.controls.appendChild(sl.node);
        f.controls.appendChild(cb2.node);
        update();
        V.loop(root, function (dt) {
            if (!auto || V.reduceMotion) return;
            phase += dt * 0.9;
            d = 285 + 155 * Math.sin(phase);
            sl.set(Math.round(d));
            update();
        });
        ['pointerdown', 'keydown'].forEach(function (ev) { root.addEventListener(ev, function () { auto = false; }, { once: true }); });
    }

    /* ================= 2. Ways to store a shape ================= */

    var voxelCache = {}, meshCache = {};

    function voxels(G) {
        if (voxelCache[G]) return voxelCache[G];
        var c = 1.9 / G, nx = Math.ceil(1.72 / c), ny = G, nz = Math.ceil(1.1 / c);
        var x0 = -0.8, y0 = -0.82, z0 = -nz * c / 2;
        var occ = new Uint8Array(nx * ny * nz), count = 0;
        function at(i, j, k) { return i < 0 || j < 0 || k < 0 || i >= nx || j >= ny || k >= nz ? 0 : occ[(k * ny + j) * nx + i]; }
        for (var k = 0; k < nz; k++) for (var j = 0; j < ny; j++) for (var i = 0; i < nx; i++) {
            if (sdf(x0 + (i + 0.5) * c, y0 + (j + 0.5) * c, z0 + (k + 0.5) * c) < 0) { occ[(k * ny + j) * nx + i] = 1; count++; }
        }
        var DIRS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]], faces = [];
        for (k = 0; k < nz; k++) for (j = 0; j < ny; j++) for (i = 0; i < nx; i++) {
            if (!at(i, j, k)) continue;
            for (var f = 0; f < 6; f++) {
                var dd = DIRS[f];
                if (at(i + dd[0], j + dd[1], k + dd[2])) continue;
                faces.push(x0 + (i + 0.5) * c, y0 + (j + 0.5) * c, z0 + (k + 0.5) * c, f);
            }
        }
        return (voxelCache[G] = { c: c, faces: new Float32Array(faces), total: nx * ny * nz, filled: count, DIRS: DIRS });
    }

    /* Naive surface nets: one vertex per grid cell the surface passes through, one quad per crossed grid edge. */
    function mesh(Rz) {
        if (meshCache[Rz]) return meshCache[Rz];
        var c = 1.9 / Rz, nx = Math.ceil(1.76 / c) + 1, ny = Rz + 1, nz = Math.ceil(1.14 / c) + 1;
        var x0 = -0.82, y0 = -0.84, z0 = -(nz - 1) * c / 2;
        var val = new Float32Array(nx * ny * nz);
        function vi(i, j, k) { return (k * ny + j) * nx + i; }
        for (var k = 0; k < nz; k++) for (var j = 0; j < ny; j++) for (var i = 0; i < nx; i++) val[vi(i, j, k)] = sdf(x0 + i * c, y0 + j * c, z0 + k * c);
        var cx = nx - 1, cyn = ny - 1, cz = nz - 1;
        var cellVert = new Int32Array(cx * cyn * cz).fill(-1), verts = [];
        var EDGES = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
        for (k = 0; k < cz; k++) for (j = 0; j < cyn; j++) for (i = 0; i < cx; i++) {
            var corner = [], inside = 0;
            for (var q = 0; q < 8; q++) {
                var v = val[vi(i + (q & 1), j + ((q >> 1) & 1), k + ((q >> 2) & 1))];
                corner.push(v);
                if (v < 0) inside++;
            }
            if (inside === 0 || inside === 8) continue;
            var sx = 0, sy = 0, sz = 0, cnt = 0;
            for (var e = 0; e < 12; e++) {
                var a = EDGES[e][0], b = EDGES[e][1];
                if ((corner[a] < 0) === (corner[b] < 0)) continue;
                var tt = corner[a] / (corner[a] - corner[b]);
                sx += (a & 1) + tt * ((b & 1) - (a & 1));
                sy += ((a >> 1) & 1) + tt * (((b >> 1) & 1) - ((a >> 1) & 1));
                sz += ((a >> 2) & 1) + tt * (((b >> 2) & 1) - ((a >> 2) & 1));
                cnt++;
            }
            cellVert[(k * cyn + j) * cx + i] = verts.length / 3;
            verts.push(x0 + (i + sx / cnt) * c, y0 + (j + sy / cnt) * c, z0 + (k + sz / cnt) * c);
        }
        function cv(i, j, k) { return i < 0 || j < 0 || k < 0 || i >= cx || j >= cyn || k >= cz ? -1 : cellVert[(k * cyn + j) * cx + i]; }
        var quads = [], g = [0, 0, 0];
        function quad(a, b, cc, dq) {
            if (a < 0 || b < 0 || cc < 0 || dq < 0) return;
            var mx = (verts[a * 3] + verts[b * 3] + verts[cc * 3] + verts[dq * 3]) / 4;
            var my = (verts[a * 3 + 1] + verts[b * 3 + 1] + verts[cc * 3 + 1] + verts[dq * 3 + 1]) / 4;
            var mz = (verts[a * 3 + 2] + verts[b * 3 + 2] + verts[cc * 3 + 2] + verts[dq * 3 + 2]) / 4;
            grad(mx, my, mz, g);
            quads.push(a, b, cc, dq, g[0], g[1], g[2], mx, my, mz);
        }
        for (k = 1; k < nz - 1; k++) for (j = 1; j < ny - 1; j++) for (i = 1; i < nx - 1; i++) {
            var v0 = val[vi(i, j, k)] < 0;
            if (v0 !== (val[vi(i + 1, j, k)] < 0)) quad(cv(i, j - 1, k - 1), cv(i, j, k - 1), cv(i, j, k), cv(i, j - 1, k));
            if (v0 !== (val[vi(i, j + 1, k)] < 0)) quad(cv(i - 1, j, k - 1), cv(i, j, k - 1), cv(i, j, k), cv(i - 1, j, k));
            if (v0 !== (val[vi(i, j, k + 1)] < 0)) quad(cv(i - 1, j - 1, k), cv(i, j - 1, k), cv(i, j, k), cv(i - 1, j, k));
        }
        return (meshCache[Rz] = { verts: new Float32Array(verts), quads: new Float32Array(quads), nv: verts.length / 3, nq: quads.length / 10 });
    }

    var blobSprites = null;
    function sprites() {
        if (blobSprites) return blobSprites;
        blobSprites = [];
        for (var i = 0; i < 10; i++) {
            var c = document.createElement('canvas');
            c.width = c.height = 64;
            var x = c.getContext('2d'), k = 0.28 + 0.9 * (0.3 + 0.7 * i / 9);
            var col = Math.min(255, Math.round(228 * k)) + ',' + Math.min(255, Math.round(164 * k)) + ',' + Math.min(255, Math.round(100 * k));
            var gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
            gr.addColorStop(0, 'rgba(' + col + ',0.96)');
            gr.addColorStop(0.55, 'rgba(' + col + ',0.8)');
            gr.addColorStop(1, 'rgba(' + col + ',0)');
            x.fillStyle = gr;
            x.fillRect(0, 0, 64, 64);
            blobSprites.push(c);
        }
        return blobSprites;
    }

    function fmt(n) { return Math.round(n).toLocaleString('en-US'); }

    function shapes(root) {
        var f = V.figure(root, {
            kicker: '3D representations', title: 'One bunny, six ways to store it',
            sub: 'Switch between common 3D formats and drag the slider to compare surface detail and memory cost.'
        });
        var W = 720, H = 400, cv = V.canvas(W, H), ctx = cv.ctx;
        cv.node.classList.add('vz-grab');
        cv.node.setAttribute('role', 'img');
        cv.node.setAttribute('aria-label', 'A rotating 3D bunny drawn in the selected representation.');
        f.stage.appendChild(cv.node);
        f.stage.appendChild(h('span', { 'class': 'vz-hint', text: 'drag to rotate' }));
        var readout = h('p', { 'class': 'vz-readout' });
        var yaw = -0.55, pitch = 0.28, spin = true, dirty = true, mode = 0, probe = null;
        var v3 = [0, 0, 0], n3 = [0, 0, 0];
        var S = 188, CX = W / 2, CYs = H / 2 + 8, D = 4.2;
        var smp = surfaceSamples();

        function proj(Rm, x, y, z, out) {
            toView(Rm, x, y, z, v3);
            var p = D / (D - v3[2]);
            out[0] = CX + v3[0] * S * p; out[1] = CYs - v3[1] * S * p; out[2] = v3[2]; out[3] = p;
            return out;
        }

        var MODES = [
            {
                name: 'Point cloud', slider: { label: 'Points', min: 150, max: 4000, step: 50, value: 1500 },
                say: 'A list of (x, y, z) surface points, similar to raw LiDAR output. Lightweight and simple, though there are gaps between points and no connected surface.',
                info: function (v) { return [['What is stored', 'an x, y, z position and a color per point'], ['Numbers stored', fmt(v * 6)]]; },
                draw: function (Rm, v) {
                    var n = Math.min(v, smp.n), items = new Array(n), q = [0, 0, 0, 0];
                    for (var i = 0; i < n; i++) {
                        var o = i * 6;
                        proj(Rm, smp.pts[o], smp.pts[o + 1], smp.pts[o + 2], q);
                        dirToView(Rm, smp.pts[o + 3], smp.pts[o + 4], smp.pts[o + 5], n3);
                        items[i] = [q[2], q[0], q[1], q[3], lit(n3)];
                    }
                    items.sort(function (a, b) { return a[0] - b[0]; });
                    var rad = v > 2400 ? 1.7 : v > 900 ? 2.2 : 3;
                    items.forEach(function (it) {
                        ctx.fillStyle = tone(it[4]);
                        ctx.beginPath();
                        ctx.arc(it[1], it[2], rad * it[3], 0, 6.2832);
                        ctx.fill();
                    });
                }
            },
            {
                name: 'Voxels', slider: { label: 'Grid size', min: 6, max: 26, step: 1, value: 14 },
                say: 'A regular 3D grid of cubes marked full or empty, similar to 3D pixels. Easy for neural networks to process, but memory grows cubically with grid size.',
                info: function (v) { var vx = voxels(v); return [['What is stored', 'full or empty, for every cube in the box'], ['Numbers stored', fmt(vx.total) + ' (' + fmt(vx.filled) + ' full)']]; },
                draw: function (Rm, v) {
                    var vx = voxels(v), F = vx.faces, hc = vx.c / 2, items = [], q = [0, 0, 0, 0];
                    var shadeOf = vx.DIRS.map(function (dd) { dirToView(Rm, dd[0], dd[1], dd[2], n3); return n3[2] > 0.02 ? lit(n3) : -1; });
                    for (var i = 0; i < F.length; i += 4) {
                        var fi = F[i + 3], sh = shadeOf[fi];
                        if (sh < 0) continue;
                        var dd = vx.DIRS[fi], ax = dd[0] !== 0 ? 0 : dd[1] !== 0 ? 1 : 2;
                        var cxw = F[i] + dd[0] * hc, cyw = F[i + 1] + dd[1] * hc, czw = F[i + 2] + dd[2] * hc;
                        var poly = [];
                        for (var c = 0; c < 4; c++) {
                            var s1 = (c === 0 || c === 3) ? -hc : hc, s2 = c < 2 ? -hc : hc;
                            var px = cxw, py = cyw, pz = czw;
                            if (ax === 0) { py += s1; pz += s2; } else if (ax === 1) { px += s1; pz += s2; } else { px += s1; py += s2; }
                            proj(Rm, px, py, pz, q);
                            poly.push(q[0], q[1]);
                        }
                        proj(Rm, cxw, cyw, czw, q);
                        items.push([q[2], poly, sh]);
                    }
                    items.sort(function (a, b) { return a[0] - b[0]; });
                    ctx.lineWidth = 0.7;
                    ctx.strokeStyle = 'rgba(70,40,15,0.28)';
                    items.forEach(function (it) {
                        var p = it[1];
                        ctx.fillStyle = tone(it[2]);
                        ctx.beginPath();
                        ctx.moveTo(p[0], p[1]); ctx.lineTo(p[2], p[3]); ctx.lineTo(p[4], p[5]); ctx.lineTo(p[6], p[7]);
                        ctx.closePath(); ctx.fill(); ctx.stroke();
                    });
                }
            },
            {
                name: 'Mesh', slider: { label: 'Mesh detail', min: 8, max: 30, step: 1, value: 16 },
                say: 'Vertices connected into flat polygon faces. Compact and accurate for surfaces, making it the standard in games and films, though irregular graphs are harder for neural networks.',
                info: function (v) { var m = mesh(v); return [['What is stored', 'corner positions, plus which corners form each face'], ['Numbers stored', fmt(m.nv * 3 + m.nq * 4) + ' (' + fmt(m.nq) + ' faces)']]; },
                draw: function (Rm, v) {
                    var m = mesh(v), Q = m.quads, P = m.verts, items = [], q = [0, 0, 0, 0];
                    var sx = new Float32Array(m.nv), sy = new Float32Array(m.nv);
                    for (var i = 0; i < m.nv; i++) { proj(Rm, P[i * 3], P[i * 3 + 1], P[i * 3 + 2], q); sx[i] = q[0]; sy[i] = q[1]; }
                    for (var k = 0; k < Q.length; k += 10) {
                        dirToView(Rm, Q[k + 4], Q[k + 5], Q[k + 6], n3);
                        if (n3[2] < -0.05) continue;
                        toView(Rm, Q[k + 7], Q[k + 8], Q[k + 9], v3);
                        items.push([v3[2], k, lit(n3)]);
                    }
                    items.sort(function (a, b) { return a[0] - b[0]; });
                    ctx.lineWidth = 0.8;
                    ctx.strokeStyle = 'rgba(70,40,15,0.45)';
                    ctx.lineJoin = 'round';
                    items.forEach(function (it) {
                        var k2 = it[1];
                        ctx.fillStyle = tone(it[2]);
                        ctx.beginPath();
                        ctx.moveTo(sx[Q[k2]], sy[Q[k2]]); ctx.lineTo(sx[Q[k2 + 1]], sy[Q[k2 + 1]]);
                        ctx.lineTo(sx[Q[k2 + 2]], sy[Q[k2 + 2]]); ctx.lineTo(sx[Q[k2 + 3]], sy[Q[k2 + 3]]);
                        ctx.closePath(); ctx.fill(); ctx.stroke();
                    });
                }
            },
            {
                name: 'Depth image', slider: { label: 'Resolution', min: 12, max: 72, step: 4, value: 36 },
                say: 'A regular color photo paired with a per-pixel distance map (brighter = closer). Fast to capture, but it only records the visible front surface.',
                info: function (v) { return [['What is stored', 'a color and a distance for every pixel'], ['Numbers stored', fmt(v * v * 4)]]; },
                draw: function (Rm, v) {
                    var rc = raycast(Rm, v), size = 300, y = 52;
                    paintImage(ctx, 46, y, size, v, colorPixel(rc));
                    paintImage(ctx, 374, y, size, v, depthPixel(rc));
                    ctx.fillStyle = '#55524d';
                    ctx.font = '700 13px Lato, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText('color', 46 + size / 2, 36);
                    ctx.fillText('depth', 374 + size / 2, 36);
                }
            },
            {
                name: 'Implicit field', slider: { label: 'Slice position', min: -40, max: 40, step: 1, value: 0, format: function (v) { return (v / 100).toFixed(2); } },
                say: 'Instead of storing explicit geometry, a function (often a neural network, as in NeRF) maps any (x, y, z) coordinate to signed distance or density. Hover over the 2D slice to query values.',
                info: function () { return [['What is stored', 'a function. NeRF uses a small neural network'], ['Numbers stored', 'the network’s weights, no matter how detailed the shape']]; },
                draw: function (Rm, v) {
                    var zs = v / 100, RW = 96, RH = 104, x0 = -0.95, x1 = 0.95, y0 = -0.9, y1 = 1.15;
                    var off = document.createElement('canvas');
                    off.width = RW; off.height = RH;
                    var octx = off.getContext('2d'), img = octx.createImageData(RW, RH);
                    for (var j = 0; j < RH; j++) for (var i = 0; i < RW; i++) {
                        var d = sdf(x0 + (i + 0.5) / RW * (x1 - x0), y1 - (j + 0.5) / RH * (y1 - y0), zs), o = (j * RW + i) * 4, r, g, b;
                        if (d < 0) { var k = Math.min(1, -d / 0.38); r = 205 - 163 * k; g = 226 - 106 * k; b = 251 - 37 * k; }
                        else { var k2 = Math.min(1, d / 0.9), band = (d % 0.15) < 0.012 ? 0.93 : 1; r = (253 - 12 * k2) * band; g = (238 - 20 * k2) * band; b = (220 - 30 * k2) * band; }
                        if (Math.abs(d) < 0.014) { r = 29; g = 27; b = 25; }
                        img.data[o] = r; img.data[o + 1] = g; img.data[o + 2] = b; img.data[o + 3] = 255;
                    }
                    octx.putImageData(img, 0, 0);
                    var SX = 40, SY = 30, SW = 314, SH = 340;
                    ctx.drawImage(off, SX, SY, SW, SH);
                    ctx.strokeStyle = '#c9c5ba'; ctx.lineWidth = 1; ctx.strokeRect(SX + 0.5, SY + 0.5, SW, SH);
                    ctx.fillStyle = '#55524d'; ctx.font = '700 13px Lato, sans-serif'; ctx.textAlign = 'left';
                    ctx.fillText('a slice through the field', SX, SY - 10);
                    if (probe) {
                        var wx = x0 + (probe[0] - SX) / SW * (x1 - x0), wy = y1 - (probe[1] - SY) / SH * (y1 - y0), dv = sdf(wx, wy, zs);
                        ctx.fillStyle = '#fff'; ctx.strokeStyle = '#1d1b19'; ctx.lineWidth = 2;
                        ctx.beginPath(); ctx.arc(probe[0], probe[1], 5, 0, 6.2832); ctx.fill(); ctx.stroke();
                        var msg = 'f = ' + (dv >= 0 ? '+' : '') + dv.toFixed(2) + (dv < 0 ? '  inside' : '  outside');
                        ctx.font = '700 12px Lato, sans-serif';
                        var tw = ctx.measureText(msg).width + 14, tx = Math.min(probe[0] + 10, SX + SW - tw), ty = Math.max(SY + 4, probe[1] - 30);
                        ctx.fillStyle = '#1f1e1c'; ctx.fillRect(tx, ty, tw, 22);
                        ctx.fillStyle = '#fff'; ctx.fillText(msg, tx + 7, ty + 15);
                    }
                    /* A small 3D view on the right shows where the slice cuts. */
                    var q = [0, 0, 0, 0], oldCX = CX, oldS = S;
                    CX = 540; S = 118;
                    var items = [];
                    for (var n = 0; n < 1100; n++) {
                        var p = n * 6;
                        proj(Rm, smp.pts[p], smp.pts[p + 1], smp.pts[p + 2], q);
                        dirToView(Rm, smp.pts[p + 3], smp.pts[p + 4], smp.pts[p + 5], n3);
                        items.push([q[2], q[0], q[1], lit(n3), smp.pts[p + 2] > zs]);
                    }
                    var corners = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(function (c) { proj(Rm, c[0], c[1], zs, q); return [q[0], q[1]]; });
                    function plane() {
                        ctx.fillStyle = 'rgba(42,120,214,0.16)'; ctx.strokeStyle = 'rgba(42,120,214,0.7)'; ctx.lineWidth = 1.2;
                        ctx.beginPath(); corners.forEach(function (c, i) { if (i) ctx.lineTo(c[0], c[1]); else ctx.moveTo(c[0], c[1]); });
                        ctx.closePath(); ctx.fill(); ctx.stroke();
                    }
                    toView(Rm, 0, CY, 1, v3);
                    var frontIsPositive = v3[2] > 0;
                    function dots(side) {
                        items.forEach(function (it) {
                            if (it[4] !== side) return;
                            ctx.fillStyle = tone(it[3]);
                            ctx.beginPath(); ctx.arc(it[1], it[2], 2, 0, 6.2832); ctx.fill();
                        });
                    }
                    dots(!frontIsPositive); plane(); dots(frontIsPositive);
                    CX = oldCX; S = oldS;
                }
            },
            {
                name: '3D Gaussians', slider: { label: 'Blobs', min: 40, max: 900, step: 20, value: 400 },
                say: 'Soft, semi-transparent 3D ellipsoids defined by position, scale, rotation, color, and opacity. They fill surface gaps smoothly and render in real time on GPUs.',
                info: function (v) { return [['What is stored', 'position, size, tilt, color and opacity per blob'], ['Numbers stored', fmt(v * 14)]]; },
                draw: function (Rm, v) {
                    var sp = sprites(), n = Math.min(v, smp.n), items = [], q = [0, 0, 0, 0];
                    var rad = 2.7 * Math.sqrt(4.2 / (n * Math.PI));
                    for (var i = 0; i < n; i++) {
                        var o = i * 6;
                        dirToView(Rm, smp.pts[o + 3], smp.pts[o + 4], smp.pts[o + 5], n3);
                        if (n3[2] < -0.05) continue;
                        proj(Rm, smp.pts[o], smp.pts[o + 1], smp.pts[o + 2], q);
                        items.push([q[2], q[0], q[1], rad * S * q[3], Math.max(0.42, n3[2]), Math.atan2(-n3[1], n3[0]), lit(n3)]);
                    }
                    items.sort(function (a, b) { return a[0] - b[0]; });
                    items.forEach(function (it) {
                        ctx.save();
                        ctx.translate(it[1], it[2]);
                        ctx.rotate(it[5]);
                        ctx.scale(it[3] * it[4], it[3]);
                        ctx.drawImage(sp[Math.round(V.clamp((it[6] - 0.3) / 0.7, 0, 1) * 9)], -1, -1, 2, 2);
                        ctx.restore();
                    });
                }
            }
        ];

        var values = MODES.map(function (m) { return m.slider.value; });
        var sl = V.slider({
            label: 'Detail', min: 0, max: 1, value: 0,
            oninput: function (v) { values[mode] = v; dirty = true; info(); }
        });

        function info() {
            readout.textContent = '';
            MODES[mode].info(values[mode]).forEach(function (pair) {
                readout.appendChild(h('span', null, [pair[0] + ': ', h('b', { text: pair[1] })]));
            });
        }

        function draw() {
            ctx.clearRect(0, 0, W, H);
            MODES[mode].draw(makeRot(yaw, pitch), values[mode]);
        }

        var t = V.tabs(MODES.map(function (m) { return m.name; }), function (i) {
            mode = i;
            probe = null;
            var o = MODES[i].slider;
            sl.configure({ label: o.label, min: o.min, max: o.max, step: o.step, value: values[i], format: o.format || function (v) { return fmt(v); } });
            f.say(MODES[i].say);
            info();
            dirty = true;
        }, 'Representation');
        f.top.appendChild(t.node);
        f.controls.appendChild(sl.node);
        root.insertBefore(readout, f.caption);

        V.drag(cv.node, function (dx, dy) {
            yaw += dx * 0.01;
            pitch = V.clamp(pitch + dy * 0.01, -1.2, 1.2);
            dirty = true;
        }, function () { spin = false; });
        cv.node.addEventListener('pointermove', function (e) {
            if (mode !== 4) return;
            var r = cv.node.getBoundingClientRect();
            var x = (e.clientX - r.left) / r.width * W, y = (e.clientY - r.top) / r.height * H;
            probe = x >= 40 && x <= 354 && y >= 30 && y <= 370 ? [x, y] : null;
            dirty = true;
        });
        cv.node.addEventListener('pointerleave', function () { if (probe) { probe = null; dirty = true; } });

        t.select(0);
        var acc = 0;
        V.loop(root, function (dt) {
            if (spin && !V.reduceMotion) {
                acc += dt;
                var step = mode === 3 ? 0.07 : 0.033; /* the depth view is heavier, so it turns in bigger steps */
                if (acc >= step) { yaw += 0.35 * acc; acc = 0; dirty = true; }
            }
            if (dirty) { dirty = false; draw(); }
        });
    }

    /* ================= 3. Learn by rendering and comparing ================= */

    function fitting(root) {
        var f = V.figure(root, {
            kicker: 'Optimization loop', title: 'Render, compare, and update',
            sub: 'Starting from random colored blobs, we render an image, compare it against the target photo, and update each blob using gradients.'
        });
        var W = 720, H = 292, cv = V.canvas(W, H), ctx = cv.ctx, N = 48, PX = N * N;
        f.stage.appendChild(cv.node);
        cv.node.setAttribute('role', 'img');
        cv.node.setAttribute('aria-label', 'A target photo, the current drawing made of blobs, and a curve of the remaining error.');

        /* The photo to imitate, drawn small. */
        var tc = document.createElement('canvas');
        tc.width = tc.height = N;
        var tx = tc.getContext('2d'), sky = tx.createLinearGradient(0, 0, 0, N);
        sky.addColorStop(0, '#bfdcf8'); sky.addColorStop(1, '#fdf0d8');
        tx.fillStyle = sky; tx.fillRect(0, 0, N, N);
        tx.fillStyle = '#f7b733'; tx.beginPath(); tx.arc(37, 11, 6, 0, 6.2832); tx.fill();
        tx.fillStyle = '#a6d8ab'; tx.beginPath(); tx.ellipse(16, 46, 30, 13, 0, 0, 6.2832); tx.fill();
        tx.fillStyle = '#74c285'; tx.beginPath(); tx.ellipse(34, 50, 30, 10, 0, 0, 6.2832); tx.fill();
        tx.fillStyle = '#f08a3c';
        tx.beginPath(); tx.ellipse(17, 35, 6.5, 7.5, 0, 0, 6.2832); tx.fill();
        tx.beginPath(); tx.arc(17, 25, 5.2, 0, 6.2832); tx.fill();
        tx.beginPath(); tx.moveTo(12.5, 22); tx.lineTo(13.5, 16.5); tx.lineTo(16.5, 20.5); tx.fill();
        tx.beginPath(); tx.moveTo(21.5, 22); tx.lineTo(20.5, 16.5); tx.lineTo(17.5, 20.5); tx.fill();
        tx.fillStyle = '#e34948'; tx.beginPath(); tx.arc(36, 41, 3, 0, 6.2832); tx.fill();
        var td = tx.getImageData(0, 0, N, N).data, T = new Float32Array(PX * 3);
        for (var i = 0; i < PX; i++) { T[i * 3] = td[i * 4] / 255; T[i * 3 + 1] = td[i * 4 + 1] / 255; T[i * 3 + 2] = td[i * 4 + 2] / 255; }

        var K = 28, P, M1, M2, step, losses, running = false, showBlobs = true;
        var I = new Float32Array(PX * 3), G = null;
        var out = document.createElement('canvas');
        out.width = out.height = N;
        var octx = out.getContext('2d'), oimg = octx.createImageData(N, N);

        /* Parameters per blob: x, y, size, red, green, blue. The last three are a background color. */
        function init() {
            var r = V.rng(5 + K);
            P = new Float32Array(K * 6 + 3);
            for (var k = 0; k < K; k++) {
                P[k * 6] = 4 + r() * (N - 8); P[k * 6 + 1] = 4 + r() * (N - 8); P[k * 6 + 2] = 4 + r() * 4;
                P[k * 6 + 3] = (r() - 0.5) * 0.3; P[k * 6 + 4] = (r() - 0.5) * 0.3; P[k * 6 + 5] = (r() - 0.5) * 0.3;
            }
            P[K * 6] = 0.6; P[K * 6 + 1] = 0.6; P[K * 6 + 2] = 0.6;
            M1 = new Float32Array(P.length); M2 = new Float32Array(P.length); G = new Float32Array(P.length);
            step = 0; losses = [];
        }

        function forward(withGrad) {
            var loss = 0;
            if (withGrad) G.fill(0);
            for (var p = 0; p < PX; p++) {
                I[p * 3] = P[K * 6]; I[p * 3 + 1] = P[K * 6 + 1]; I[p * 3 + 2] = P[K * 6 + 2];
            }
            var gk = new Float32Array(K);
            for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) {
                var p2 = (y * N + x) * 3, k;
                for (k = 0; k < K; k++) {
                    var dx = x - P[k * 6], dy = y - P[k * 6 + 1], sg = P[k * 6 + 2];
                    var g = Math.exp(-(dx * dx + dy * dy) / (2 * sg * sg));
                    gk[k] = g;
                    I[p2] += P[k * 6 + 3] * g; I[p2 + 1] += P[k * 6 + 4] * g; I[p2 + 2] += P[k * 6 + 5] * g;
                }
                var er = I[p2] - T[p2], eg = I[p2 + 1] - T[p2 + 1], eb = I[p2 + 2] - T[p2 + 2];
                loss += er * er + eg * eg + eb * eb;
                if (!withGrad) continue;
                G[K * 6] += er; G[K * 6 + 1] += eg; G[K * 6 + 2] += eb;
                for (k = 0; k < K; k++) {
                    var gg = gk[k];
                    if (gg < 1e-4) continue;
                    var ddx = x - P[k * 6], ddy = y - P[k * 6 + 1], s2 = P[k * 6 + 2];
                    var ec = er * P[k * 6 + 3] + eg * P[k * 6 + 4] + eb * P[k * 6 + 5];
                    G[k * 6] += ec * gg * ddx / (s2 * s2);
                    G[k * 6 + 1] += ec * gg * ddy / (s2 * s2);
                    G[k * 6 + 2] += ec * gg * (ddx * ddx + ddy * ddy) / (s2 * s2 * s2);
                    G[k * 6 + 3] += er * gg; G[k * 6 + 4] += eg * gg; G[k * 6 + 5] += eb * gg;
                }
            }
            return loss / (PX * 3);
        }

        var LR = [0.3, 0.3, 0.12, 0.03, 0.03, 0.03];
        function train() {
            var loss = forward(true);
            step++;
            for (var i = 0; i < P.length; i++) {
                var lr = i >= K * 6 ? 0.01 : LR[i % 6];
                M1[i] = 0.9 * M1[i] + 0.1 * G[i];
                M2[i] = 0.999 * M2[i] + 0.001 * G[i] * G[i];
                var m = M1[i] / (1 - Math.pow(0.9, step)), v = M2[i] / (1 - Math.pow(0.999, step));
                P[i] -= lr * m / (Math.sqrt(v) + 1e-8);
            }
            for (var k = 0; k < K; k++) {
                P[k * 6] = V.clamp(P[k * 6], -4, N + 4); P[k * 6 + 1] = V.clamp(P[k * 6 + 1], -4, N + 4);
                P[k * 6 + 2] = V.clamp(P[k * 6 + 2], 1.3, 16);
            }
            losses.push(loss);
        }

        function panel(x, label) {
            ctx.fillStyle = '#55524d'; ctx.font = '700 13px Lato, sans-serif'; ctx.textAlign = 'left';
            ctx.fillText(label, x, 24);
        }

        function draw() {
            var loss = forward(false);
            for (var p = 0; p < PX; p++) {
                oimg.data[p * 4] = V.clamp(I[p * 3], 0, 1) * 255; oimg.data[p * 4 + 1] = V.clamp(I[p * 3 + 1], 0, 1) * 255;
                oimg.data[p * 4 + 2] = V.clamp(I[p * 3 + 2], 0, 1) * 255; oimg.data[p * 4 + 3] = 255;
            }
            octx.putImageData(oimg, 0, 0);
            ctx.clearRect(0, 0, W, H);
            var SZ = 240, X1 = 16, X2 = 276, Y = 36, sc = SZ / N;
            panel(X1, 'the photo'); panel(X2, 'the computer’s drawing'); panel(540, 'how wrong it still is');
            ctx.imageSmoothingEnabled = true;
            ctx.drawImage(tc, X1, Y, SZ, SZ);
            ctx.drawImage(out, X2, Y, SZ, SZ);
            if (showBlobs) {
                ctx.save();
                ctx.beginPath(); ctx.rect(X2, Y, SZ, SZ); ctx.clip();
                ctx.lineWidth = 1.2;
                for (var k = 0; k < K; k++) {
                    var bx = X2 + (P[k * 6] + 0.5) * sc, by = Y + (P[k * 6 + 1] + 0.5) * sc;
                    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
                    ctx.beginPath(); ctx.arc(bx, by, P[k * 6 + 2] * sc, 0, 6.2832); ctx.stroke();
                    ctx.fillStyle = 'rgba(29,27,25,0.8)';
                    ctx.beginPath(); ctx.arc(bx, by, 2, 0, 6.2832); ctx.fill();
                }
                ctx.restore();
            }
            /* Error curve. */
            var CXx = 540, CYy = 36, CW = 164, CH = 150;
            ctx.fillStyle = '#fff'; ctx.strokeStyle = '#e7e4dc'; ctx.lineWidth = 1;
            ctx.fillRect(CXx, CYy, CW, CH); ctx.strokeRect(CXx + 0.5, CYy + 0.5, CW, CH);
            if (losses.length > 1) {
                var hi = Math.log(losses[0] * 1.1), lo = Math.log(Math.max(1e-5, Math.min.apply(null, losses) * 0.8));
                ctx.strokeStyle = ORANGE; ctx.lineWidth = 2; ctx.lineJoin = 'round';
                ctx.beginPath();
                var span = Math.max(200, losses.length - 1);
                for (var s2 = 0; s2 < losses.length; s2 += Math.max(1, Math.floor(losses.length / 160))) {
                    var lx = CXx + 6 + (s2 / span) * (CW - 12), ly = CYy + 8 + (1 - (Math.log(losses[s2]) - lo) / (hi - lo)) * (CH - 16);
                    if (s2) ctx.lineTo(lx, ly); else ctx.moveTo(lx, ly);
                }
                ctx.stroke();
            }
            ctx.fillStyle = '#8c8982'; ctx.font = '12px Lato, sans-serif';
            ctx.fillText('rounds of practice \u2192', CXx, CYy + CH + 18);
            var match = Math.round(V.clamp(1 - Math.sqrt(loss) / 0.33, 0, 1) * 100);
            ctx.fillStyle = '#1d1b19'; ctx.font = '700 26px Lato, sans-serif';
            ctx.fillText(String(step), CXx, CYy + CH + 60);
            ctx.fillText(match + '%', CXx + 92, CYy + CH + 60);
            ctx.fillStyle = '#8c8982'; ctx.font = '12px Lato, sans-serif';
            ctx.fillText('rounds so far', CXx, CYy + CH + 78);
            ctx.fillText('match', CXx + 92, CYy + CH + 78);
            return loss;
        }

        function setRunning(on) {
            running = on;
            play.textContent = on ? 'Pause' : (step ? 'Keep training' : 'Train');
        }
        function explain() {
            f.say(step === 0
                ? 'At step 0, the blobs start at random positions (white circles mark each blob’s center and radius).'
                : step < 120 ? 'Early steps fit coarse colors like the sky and ground as each blob moves along gradients to reduce pixel error.'
                    : step < 500 ? 'Next, blobs refine smaller regions like the sun, cat, and ball using only the pixel difference against the target photo.'
                        : 'Running this same optimization in 3D across photos from multiple angles is the core idea behind 3D Gaussian Splatting.');
        }

        var play = V.button('Train', function () { setRunning(!running); }, true);
        var reset = V.button('Start over', function () { init(); setRunning(false); draw(); explain(); });
        var sl = V.slider({
            label: 'Number of blobs', min: 6, max: 60, step: 2, value: K,
            oninput: function (v) { K = v; init(); draw(); explain(); }
        });
        var chk = V.checkbox('Show the blobs', true, function (on) { showBlobs = on; draw(); });
        f.controls.appendChild(play); f.controls.appendChild(reset); f.controls.appendChild(sl.node); f.controls.appendChild(chk.node);
        init(); draw(); explain();
        V.loop(root, function () {
            if (!running) return;
            train(); train(); train();
            draw(); explain();
            if (step >= 900 && step % 900 < 3) setRunning(false);
        });
        V.onVisible(root, function () { if (!V.reduceMotion && step === 0) setRunning(true); });
    }

    /* ================= 4. Two ways to draw a 3D scene ================= */

    function rendering(root) {
        var f = V.figure(root, {
            kicker: 'Rendering', title: 'Two ways to render a 3D scene',
            sub: 'Top-down view of five colored clouds. Compare how ray marching and splatting compute pixel colors on the sensor.'
        });
        var W = 720, H = 300, cv = V.canvas(W, H), ctx = cv.ctx;
        f.stage.appendChild(cv.node);
        cv.node.setAttribute('role', 'img');
        cv.node.setAttribute('aria-label', 'Rays leave a camera, pass through colored clouds, and fill in a strip of pixels.');
        var CAM = [78, 150], SX = 236, NP = 16, PH = 7, BG = [250, 248, 244];
        var BLOBS = [
            { x: 330, y: 118, s: 30, c: [42, 120, 214] }, { x: 430, y: 208, s: 26, c: [235, 104, 52] },
            { x: 525, y: 132, s: 38, c: [27, 175, 122] }, { x: 615, y: 218, s: 24, c: [232, 123, 164] },
            { x: 300, y: 214, s: 18, c: [237, 161, 0] }
        ];
        BLOBS.forEach(function (b) { b.d = Math.hypot(b.x - CAM[0], b.y - CAM[1]); });
        var ORDER = BLOBS.slice().sort(function (a, b) { return a.d - b.d; });
        var mode = 0, S = 12, time = 0, pixels = [], NEAR = 176, FAR = 650;

        function ray(i) {
            var py = 150 + (i - (NP - 1) / 2) * PH, dx = SX - CAM[0], dy = py - CAM[1], l = Math.hypot(dx, dy);
            return { dx: dx / l, dy: dy / l, py: py };
        }
        function field(x, y) {
            var den = 0, r = 0, g = 0, b = 0;
            BLOBS.forEach(function (bl) {
                var w = Math.exp(-((x - bl.x) * (x - bl.x) + (y - bl.y) * (y - bl.y)) / (2 * bl.s * bl.s));
                den += w; r += w * bl.c[0]; g += w * bl.c[1]; b += w * bl.c[2];
            });
            return den > 1e-6 ? [den, r / den, g / den, b / den] : [0, 0, 0, 0];
        }
        /* March: sample along the ray, front to back, up to a fraction of its length. */
        function march(i, frac) {
            var rr = ray(i), dt = (FAR - NEAR) / S, Tr = 1, c = [0, 0, 0], pts = [];
            for (var k = 0; k < S; k++) {
                if ((k + 1) / S > frac + 1e-6) break;
                var t = NEAR + (k + 0.5) * dt, x = CAM[0] + rr.dx * t, y = CAM[1] + rr.dy * t, fd = field(x, y);
                var a = 1 - Math.exp(-fd[0] * 0.045 * dt);
                c[0] += Tr * a * fd[1]; c[1] += Tr * a * fd[2]; c[2] += Tr * a * fd[3];
                Tr *= 1 - a;
                pts.push([x, y, fd]);
            }
            return { col: [c[0] + Tr * BG[0], c[1] + Tr * BG[1], c[2] + Tr * BG[2]], pts: pts, ray: rr };
        }
        /* Splat: every cloud drops its footprint on the sensor, nearest first. */
        function splat(i, count) {
            var rr = ray(i), Tr = 1, c = [0, 0, 0];
            for (var k = 0; k < count; k++) {
                var b = ORDER[k], vx = b.x - CAM[0], vy = b.y - CAM[1];
                var perp = Math.abs(vx * rr.dy - vy * rr.dx), a = 0.97 * Math.exp(-(perp * perp) / (2 * b.s * b.s));
                c[0] += Tr * a * b.c[0]; c[1] += Tr * a * b.c[1]; c[2] += Tr * a * b.c[2];
                Tr *= 1 - a;
            }
            return [c[0] + Tr * BG[0], c[1] + Tr * BG[1], c[2] + Tr * BG[2]];
        }
        function rgb(c, a) { return 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + (a === undefined ? 1 : a) + ')'; }

        function scene(highlight) {
            ctx.clearRect(0, 0, W, H);
            BLOBS.forEach(function (b) {
                var g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.s * 2.3);
                var on = highlight === undefined || highlight.indexOf(b) !== -1;
                g.addColorStop(0, rgb(b.c, on ? 0.85 : 0.25)); g.addColorStop(0.5, rgb(b.c, on ? 0.4 : 0.1)); g.addColorStop(1, rgb(b.c, 0));
                ctx.fillStyle = g;
                ctx.beginPath(); ctx.arc(b.x, b.y, b.s * 2.3, 0, 6.2832); ctx.fill();
            });
            ctx.fillStyle = '#4E3629';
            ctx.fillRect(CAM[0] - 30, CAM[1] - 13, 30, 26);
            ctx.beginPath(); ctx.moveTo(CAM[0], CAM[1] - 7); ctx.lineTo(CAM[0] + 11, CAM[1] - 12); ctx.lineTo(CAM[0] + 11, CAM[1] + 12); ctx.lineTo(CAM[0], CAM[1] + 7); ctx.fill();
            ctx.fillStyle = '#8c8982'; ctx.font = '12px Lato, sans-serif'; ctx.textAlign = 'center';
            ctx.fillText('camera', CAM[0] - 14, CAM[1] + 32);
            ctx.fillText('sensor', SX, 150 - NP * PH / 2 - 10);
            ctx.fillText('the picture', 30, 30);
        }
        function strip() {
            for (var i = 0; i < NP; i++) {
                var y = 150 + (i - NP / 2) * PH;
                ctx.fillStyle = pixels[i] ? rgb(pixels[i]) : '#fff';
                ctx.fillRect(SX - 4, y, 8, PH - 0.6);
                var by = 44 + i * 13.5;
                ctx.fillRect(18, by, 24, 12.9);
            }
            ctx.strokeStyle = '#c9c5ba'; ctx.lineWidth = 1;
            ctx.strokeRect(SX - 4.5, 150 - NP * PH / 2 - 0.5, 9, NP * PH);
            ctx.strokeRect(17.5, 43.5, 25, NP * 13.5);
        }
        function counter(text) {
            ctx.fillStyle = '#1d1b19'; ctx.font = '700 13px Lato, sans-serif'; ctx.textAlign = 'right';
            ctx.fillText(text, W - 16, 26);
        }

        function frame() {
            pixels = [];
            if (mode === 0) {
                var per = 0.42, total = NP * per + 1.6, tt = V.reduceMotion ? total - 0.01 : time % total, cur = Math.min(NP, Math.floor(tt / per)), frac = cur < NP ? (tt - cur * per) / per : 1;
                scene();
                for (var i = 0; i < cur; i++) pixels[i] = march(i, 1).col;
                if (cur < NP) {
                    var m = march(cur, frac);
                    ctx.strokeStyle = 'rgba(29,27,25,0.55)'; ctx.lineWidth = 1.2;
                    ctx.beginPath(); ctx.moveTo(CAM[0], CAM[1]); ctx.lineTo(CAM[0] + m.ray.dx * (NEAR + (FAR - NEAR) * frac), CAM[1] + m.ray.dy * (NEAR + (FAR - NEAR) * frac)); ctx.stroke();
                    m.pts.forEach(function (p) {
                        var dn = Math.min(1, p[2][0] * 1.3);
                        ctx.fillStyle = dn > 0.04 ? rgb([p[2][1], p[2][2], p[2][3]]) : '#fff';
                        ctx.strokeStyle = '#1d1b19'; ctx.lineWidth = 1;
                        ctx.beginPath(); ctx.arc(p[0], p[1], 2.4 + 4.5 * dn, 0, 6.2832); ctx.fill(); ctx.stroke();
                    });
                    pixels[cur] = m.col;
                }
                strip();
                counter('questions asked: ' + fmt(cur * S + (cur < NP ? Math.floor(frac * S) : 0)) + ' of ' + fmt(NP * S));
            } else {
                var perB = 1.0, totalB = ORDER.length * perB + 1.8, tb = V.reduceMotion ? totalB - 0.01 : time % totalB, done = Math.min(ORDER.length, Math.floor(tb / perB)), fr = done < ORDER.length ? (tb - done * perB) / perB : 1;
                scene(ORDER.slice(0, Math.min(ORDER.length, done + 1)));
                if (done < ORDER.length) {
                    var b = ORDER[done], ang = Math.atan2(b.y - CAM[1], b.x - CAM[0]), nx = -Math.sin(ang), ny = Math.cos(ang), k = V.ease(Math.min(1, fr * 1.4));
                    ctx.fillStyle = rgb(b.c, 0.22); ctx.strokeStyle = rgb(b.c, 0.8); ctx.lineWidth = 1.2;
                    ctx.beginPath();
                    ctx.moveTo(b.x + nx * b.s * 1.6, b.y + ny * b.s * 1.6);
                    ctx.lineTo(V.lerp(b.x + nx * b.s * 1.6, CAM[0], k), V.lerp(b.y + ny * b.s * 1.6, CAM[1], k));
                    ctx.lineTo(V.lerp(b.x - nx * b.s * 1.6, CAM[0], k), V.lerp(b.y - ny * b.s * 1.6, CAM[1], k));
                    ctx.lineTo(b.x - nx * b.s * 1.6, b.y - ny * b.s * 1.6);
                    ctx.closePath(); ctx.fill(); ctx.stroke();
                }
                var shown = done + (done < ORDER.length && fr > 0.7 ? 1 : 0);
                for (var j = 0; j < NP; j++) pixels[j] = splat(j, shown);
                strip();
                counter('clouds drawn: ' + shown + ' of ' + ORDER.length);
            }
        }

        var sl = V.slider({
            label: 'Samples per ray', min: 3, max: 40, value: S,
            oninput: function (v) { S = v; time = 0; explain(); frame(); }
        });
        function explain() {
            f.say(mode === 0
                ? 'Ray marching (NeRF): shoot one ray per pixel, query the network at ' + S + ' sample points (' + fmt(NP * S) + ' queries total for 16 pixels), and blend colors front to back.'
                : 'Splatting (3D Gaussians): project each 3D cloud directly onto the sensor from front to back. Five clouds take five projections, enabling real-time rendering.');
        }
        var t = V.tabs(['Ray marching (NeRF)', 'Splatting (3D Gaussians)'], function (i) {
            mode = i; time = 0;
            sl.node.style.visibility = i === 0 ? 'visible' : 'hidden';
            explain(); frame();
        }, 'Rendering method');
        f.top.appendChild(t.node);
        f.controls.appendChild(sl.node);
        t.select(0);
        V.loop(root, function (dt) {
            if (V.reduceMotion) return;
            time += dt;
            frame();
        });
    }

    /* ================= 5. One backbone, several heads ================= */

    function heads(root) {
        var f = V.figure(root, {
            kicker: 'Feed-forward models', title: 'One shared backbone, multiple output heads', plain: true,
            sub: 'Feed-forward 3D models encode input photos once and predict depth, 3D points, and camera poses in a single forward pass.'
        });
        var RA = makeRot(-0.75, 0.2), RB = makeRot(0.45, 0.2), WN = 56;
        var A = raycast(RA, WN), B = raycast(RB, WN);
        function photo(rc, label) {
            var c = V.canvas(150, 150);
            paintImage(c.ctx, 0, 0, 150, WN, colorPixel(rc));
            c.node.setAttribute('role', 'img');
            c.node.setAttribute('aria-label', label);
            return h('div', null, [c.node, h('p', { 'class': 'vz-side-title', text: label, style: { margin: '0.25rem 0 0', 'text-align': 'center' } })]);
        }
        var grid = h('div', { 'class': 'vz-tokgrid', 'aria-hidden': 'true' });
        for (var i = 0; i < 24; i++) { var cell = h('i'); cell.style.animationDelay = (i % 6 * 0.12 + Math.floor(i / 6) * 0.08) + 's'; grid.appendChild(cell); }
        var OW = 420, OH = 250, oc = V.canvas(OW, OH), ctx = oc.ctx;
        oc.node.setAttribute('role', 'img');
        var mode = 0, yaw = 0.3, dirty = true;
        var q3 = [0, 0, 0], n3 = [0, 0, 0];

        var pts = [];
        [[A, [42, 120, 214]], [B, [235, 104, 52]]].forEach(function (pair) {
            var rc = pair[0];
            for (var j = 0; j < WN; j += 1) for (var i2 = (j % 2); i2 < WN; i2 += 2) {
                var idx = j * WN + i2;
                if (rc.depth[idx] === 0) continue;
                pts.push([rc.pos[idx * 3], rc.pos[idx * 3 + 1], rc.pos[idx * 3 + 2], pair[1], rc.shade[idx]]);
            }
        });
        var top = surfaceSamples();

        var HEADS = [
            {
                name: 'Depth head',
                say: 'Predicts per-pixel distance from the camera for each input photo (brighter = closer).',
                draw: function () {
                    paintImage(ctx, 16, 34, 186, WN, depthPixel(A));
                    paintImage(ctx, 218, 34, 186, WN, depthPixel(B));
                    label('depth of photo A', 109, 22); label('depth of photo B', 311, 22);
                }
            },
            {
                name: 'Point head',
                say: 'Predicts 3D (x, y, z) coordinates per pixel in a single shared frame, so points from photo A (blue) and photo B (orange) align directly.',
                spin: true,
                draw: function () {
                    var Rm = makeRot(yaw, 0.25), items = pts.map(function (p) {
                        toView(Rm, p[0], p[1], p[2], q3);
                        var pp = 4.2 / (4.2 - q3[2]);
                        return [q3[2], OW / 2 + q3[0] * 105 * pp, OH / 2 + 4 - q3[1] * 105 * pp, p[3], p[4]];
                    });
                    items.sort(function (a, b) { return a[0] - b[0]; });
                    items.forEach(function (it) {
                        var k = 0.45 + 0.6 * it[4];
                        ctx.fillStyle = 'rgb(' + Math.min(255, Math.round(it[3][0] * k + 40)) + ',' + Math.min(255, Math.round(it[3][1] * k + 30)) + ',' + Math.min(255, Math.round(it[3][2] * k + 20)) + ')';
                        ctx.beginPath(); ctx.arc(it[1], it[2], 1.9, 0, 6.2832); ctx.fill();
                    });
                }
            },
            {
                name: 'Camera head',
                say: 'Predicts each camera’s 3D position and viewing angle (shown here from above).',
                draw: function () {
                    var cx = OW / 2, cy = OH / 2 - 22, sc = 46;
                    ctx.fillStyle = 'rgba(160,110,60,0.5)';
                    for (var n = 0; n < 1400; n++) { ctx.fillRect(cx + top.pts[n * 6] * sc, cy + top.pts[n * 6 + 2] * sc, 1.6, 1.6); }
                    [[RA, BLUE, 'camera A'], [RB, ORANGE, 'camera B']].forEach(function (c) {
                        toWorld(c[0], 0, 0, 1.9, q3);
                        var px = cx + q3[0] * sc, pz = cy + q3[2] * sc, ang = Math.atan2(cy - pz, cx - px);
                        ctx.fillStyle = c[1]; ctx.globalAlpha = 0.16;
                        ctx.beginPath(); ctx.moveTo(px, pz);
                        ctx.lineTo(px + 135 * Math.cos(ang - 0.33), pz + 135 * Math.sin(ang - 0.33));
                        ctx.lineTo(px + 135 * Math.cos(ang + 0.33), pz + 135 * Math.sin(ang + 0.33));
                        ctx.closePath(); ctx.fill();
                        ctx.globalAlpha = 1;
                        ctx.save(); ctx.translate(px, pz); ctx.rotate(ang);
                        ctx.fillRect(-16, -9, 18, 18);
                        ctx.beginPath(); ctx.moveTo(2, -5); ctx.lineTo(10, -9); ctx.lineTo(10, 9); ctx.lineTo(2, 5); ctx.fill();
                        ctx.restore();
                        ctx.fillStyle = '#1d1b19'; ctx.font = '700 12px Lato, sans-serif'; ctx.textAlign = 'center';
                        ctx.fillText(c[2], px, pz + (pz > cy ? 26 : -18));
                        ctx.fillStyle = '#8c8982'; ctx.font = '11px Lato, sans-serif';
                        ctx.fillText('x ' + q3[0].toFixed(1) + '   z ' + q3[2].toFixed(1) + '   turn ' + Math.round(ang * 180 / Math.PI) + '°', px, pz + (pz > cy ? 40 : -32));
                    });
                    label('seen from above', 70, 22);
                }
            }
        ];
        function label(text, x, y) {
            ctx.fillStyle = '#55524d'; ctx.font = '700 12px Lato, sans-serif'; ctx.textAlign = 'center';
            ctx.fillText(text, x, y);
        }
        var t = V.tabs(HEADS.map(function (d) { return d.name; }), function (i) {
            mode = i; dirty = true;
            oc.node.setAttribute('aria-label', HEADS[i].name + ' output');
            f.say(HEADS[i].say);
        }, 'Head');
        var out = h('div', { 'class': 'vz-out' }, [t.node, h('div', { style: { height: '0.6rem' } }), oc.node]);
        f.stage.appendChild(h('div', { 'class': 'vz-heads' }, [
            h('div', { 'class': 'vz-photos' }, [photo(A, 'photo A'), photo(B, 'photo B')]),
            h('div', { 'class': 'vz-arrow', text: '→', 'aria-hidden': 'true' }),
            h('div', { 'class': 'vz-backbone' }, ['Shared network', grid, h('small', { text: 'turns every photo patch into features' })]),
            h('div', { 'class': 'vz-arrow', text: '→', 'aria-hidden': 'true' }),
            out
        ]));
        t.select(0);
        V.loop(root, function (dt) {
            if (HEADS[mode].spin && !V.reduceMotion) { yaw += dt * 0.6; dirty = true; }
            if (!dirty) return;
            dirty = false;
            ctx.clearRect(0, 0, OW, OH);
            HEADS[mode].draw();
        });
    }

    var FIGURES = { '3d-ambiguity': ambiguity, '3d-shapes': shapes, '3d-fitting': fitting, '3d-rendering': rendering, '3d-heads': heads };
    Object.keys(FIGURES).forEach(function (id) {
        var root = document.getElementById(id);
        if (root) FIGURES[id](root);
    });
})();
