/* Cosmic Tree — coded by @hack.n.code
   A glowing fractal tree that grows from its roots and blossoms under the stars.
   Pure canvas + vanilla JS. No libraries, no build step. */
(() => {
  'use strict';

  // ---------- setup ----------
  const cvs = document.getElementById('scene');
  const ctx = cvs.getContext('2d');
  const $ = (id) => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const CAPTURE = params.get('capture') === '1';          // frame-by-frame mode for recording videos
  const reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TAU = Math.PI * 2;

  const cleanName = (s) => (s || '').replace(/[<>]/g, '').trim().slice(0, 24);
  const toName = cleanName(params.get('to'));
  const MESSAGE = toName
    ? `${toName}, I grew a little galaxy tree just for you 🌌`
    : 'grown from one recursive function · pure HTML, CSS & JavaScript';
  $('forLine').textContent = toName ? `for ${toName}` : 'Cosmic Tree';

  // seeded random so every "grow again" is a brand-new tree
  let seed = (Number(params.get('seed')) || (Date.now() % 1e9)) >>> 0;
  function rand() {
    seed = (seed + 0x6D2B79F5) >>> 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  const rnd = (a, b) => a + rand() * (b - a);
  const pick = (arr) => arr[(rand() * arr.length) | 0];
  const ease = (t) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
  const easeBack = (t) => { t = Math.min(1, Math.max(0, t)); const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

  let W = 0, H = 0, DPR = 1, S = 1;           // S = scene scale (1 on a phone)
  let baseX = 0, baseY = 0;
  let treeLayer, tctx, skyLayer;
  let segments = [], blooms = [], petals = [], stars = [], flies = [], ripples = [], shooting = [], sparks = [];
  let growStart = 0, bloomDone = 0, now = 0, lastRipple = 0, lastPetal = 0;
  let messageShown = false, typed = 0;

  // ---------- blossom sprites (pre-rendered once, drawn hundreds of times) ----------
  // [hue, saturation, lightness] — mostly pinks with a few cyan/violet "cosmic" blooms
  const BLOOM_PAL = [[330, 95, 66], [318, 92, 62], [342, 95, 72], [300, 85, 66], [188, 95, 62], [270, 85, 72], [350, 90, 80], [196, 90, 74]];
  const bloomSprites = BLOOM_PAL.map(([h, s, l]) => makeBlossom(h, s, l));
  const glowDot = makeGlow();

  function makeBlossom(h, s, l) {
    const N = 128, c = document.createElement('canvas');
    c.width = c.height = N;
    const g = c.getContext('2d');
    g.translate(N / 2, N / 2);
    const halo = g.createRadialGradient(0, 0, 0, 0, 0, N / 2);
    halo.addColorStop(0, `hsla(${h},100%,75%,.6)`);
    halo.addColorStop(.4, `hsla(${h},100%,62%,.18)`);
    halo.addColorStop(1, `hsla(${h},100%,50%,0)`);
    g.fillStyle = halo; g.beginPath(); g.arc(0, 0, N / 2, 0, TAU); g.fill();
    const R = 34;
    for (let i = 0; i < 5; i++) {
      g.save();
      g.rotate(i * TAU / 5);
      const pg = g.createRadialGradient(0, 0, 2, 0, -R * .5, R);
      pg.addColorStop(0, `hsl(${h},${s}%,${Math.min(96, l + 26)}%)`);
      pg.addColorStop(.55, `hsl(${h},${s}%,${l}%)`);
      pg.addColorStop(1, `hsl(${h},${s}%,${l - 14}%)`);
      g.fillStyle = pg;
      g.beginPath();
      g.moveTo(0, 0);
      g.bezierCurveTo(R * .62, -R * .25, R * .62, -R * .92, R * .2, -R);   // right side of the petal
      g.lineTo(0, -R * .86);                                               // the little notch at the tip
      g.lineTo(-R * .2, -R);
      g.bezierCurveTo(-R * .62, -R * .92, -R * .62, -R * .25, 0, 0);
      g.fill();
      g.strokeStyle = `hsla(${h},${s}%,${Math.max(18, l - 30)}%,.75)`;
      g.lineWidth = 1.6; g.stroke();
      g.strokeStyle = `hsla(${h},60%,96%,.45)`;                          // petal vein
      g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(0, -4); g.lineTo(0, -R * .6); g.stroke();
      g.restore();
    }
    // glowing center + stamens
    const core = g.createRadialGradient(0, 0, 0, 0, 0, 10);
    core.addColorStop(0, '#fff8d6'); core.addColorStop(.6, '#ffd36b'); core.addColorStop(1, 'rgba(255,170,60,0)');
    g.fillStyle = core; g.beginPath(); g.arc(0, 0, 10, 0, TAU); g.fill();
    g.fillStyle = '#ffe9a8';
    for (let i = 0; i < 8; i++) {
      const a = i * TAU / 8 + .2;
      g.beginPath(); g.arc(Math.cos(a) * 9, Math.sin(a) * 9, 1.7, 0, TAU); g.fill();
    }
    return c;
  }

  function makeGlow() {
    const N = 64, c = document.createElement('canvas'); c.width = c.height = N;
    const g = c.getContext('2d');
    const r = g.createRadialGradient(N / 2, N / 2, 0, N / 2, N / 2, N / 2);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.2, 'rgba(255,230,180,.8)');
    r.addColorStop(.5, 'rgba(255,160,120,.2)'); r.addColorStop(1, 'rgba(255,120,120,0)');
    g.fillStyle = r; g.fillRect(0, 0, N, N);
    return c;
  }

  // ---------- layout ----------
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    cvs.width = Math.round(W * DPR); cvs.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    S = Math.max(.75, Math.min(1.6, Math.min(W / 390, H / 760)));
    baseX = W / 2; baseY = H * .76;
    treeLayer = document.createElement('canvas');
    treeLayer.width = cvs.width; treeLayer.height = cvs.height;
    tctx = treeLayer.getContext('2d');
    tctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    paintSky();
    makeStars();
    plant();
  }

  function paintSky() {
    skyLayer = document.createElement('canvas');
    skyLayer.width = cvs.width; skyLayer.height = cvs.height;
    const g = skyLayer.getContext('2d');
    g.setTransform(DPR, 0, 0, DPR, 0, 0);
    const bg = g.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#04020d'); bg.addColorStop(.55, '#0b0620'); bg.addColorStop(1, '#130716');
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    const blobs = [[.2, .25, .55, '120,40,200', .22], [.85, .4, .5, '255,40,120', .14], [.5, .78, .6, '255,90,60', .12], [.6, .12, .4, '40,120,255', .12]];
    for (const [x, y, r, c, a] of blobs) {
      const R = r * Math.max(W, H);
      const n = g.createRadialGradient(x * W, y * H, 0, x * W, y * H, R);
      n.addColorStop(0, `rgba(${c},${a})`); n.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = n; g.fillRect(0, 0, W, H);
    }
  }

  function makeStars() {
    stars = [];
    const n = Math.round(Math.min(380, W * H / 2600));
    for (let i = 0; i < n; i++) {
      stars.push({ x: rand() * W, y: rand() * H * .92, r: rand() < .9 ? rnd(.3, 1.1) : rnd(1.2, 1.9),
        p: rand() * TAU, s: rnd(.6, 2.2), hue: pick([210, 260, 320, 40, 0]) });
    }
    flies = [];
    for (let i = 0; i < 26; i++) flies.push({ x: rand() * W, y: rnd(H * .2, H * .85), vx: rnd(-8, 8), vy: rnd(-6, 6), p: rand() * TAU, r: rnd(5, 11) });
  }

  // ---------- the tree ----------
  function plant() {
    segments = []; blooms = []; petals = []; ripples = []; sparks = [];
    tctx.clearRect(0, 0, W, H);
    // grow the tree in its own units (trunk = 100), then fit it to whatever screen this is
    const maxDepth = W * H > 900000 ? 9 : 8;
    branch(0, 0, -Math.PI / 2 + rnd(-.04, .04), 128, 8, 0, maxDepth, 0.15);
    const rootCount = 6;
    for (let i = 0; i < rootCount; i++) {
      const a = Math.PI / 2 + (i - (rootCount - 1) / 2) * .42 + rnd(-.15, .15);
      root(rnd(-3, 3), 0, a, rnd(26, 36), 3.4, 0, rnd(0, .35));
    }
    let maxX = 1, minY = -1, maxY = 1;
    for (const s of segments) {
      if (s.kind === 'b') { maxX = Math.max(maxX, Math.abs(s.x2) + 6); minY = Math.min(minY, s.y2 - 6); }
      else maxY = Math.max(maxY, s.y2);
    }
    for (const r of blooms) { maxX = Math.max(maxX, Math.abs(r.x) + r.size * .7); minY = Math.min(minY, r.y - r.size * .7); }
    const topY = Math.max(H * .25, W > 700 ? 250 : 0);
    const bottomRoom = H - 120 - baseY;
    let k = Math.min((W * .47) / maxX, (baseY - topY) / -minY, bottomRoom > 0 ? bottomRoom / maxY : 9);
    k = Math.min(k, 2.6);
    const tx = (x) => baseX + x * k, ty = (y) => baseY + y * k;
    for (const s of segments) {
      s.x = tx(s.x); s.y = ty(s.y); s.cx = tx(s.cx); s.cy = ty(s.cy); s.x2 = tx(s.x2); s.y2 = ty(s.y2);
      s.w = Math.max(.6, s.w * Math.min(k, 1.5));
    }
    for (const r of blooms) { r.x = tx(r.x); r.y = ty(r.y); r.size *= k; }
    growStart = now;
    let last = 0;
    for (const r of blooms) last = Math.max(last, r.t0 + r.dur);
    bloomDone = last;
    messageShown = false; typed = 0;
    $('message').classList.remove('show');
    $('typeLine').textContent = '';
    $('hint').classList.remove('show');
    ripples.push({ t0: 0, hue: 190 });
  }

  function hueAt(depth, maxDepth) {
    // trunk glows gold, then warms through coral into rose-pink at the tips
    const k = depth / maxDepth;
    return (40 - k * 85 + 360) % 360;
  }

  function addSeg(kind, x, y, ang, len, w, depth, maxDepth, t0, bendAmt) {
    const x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len;
    const bend = rnd(-bendAmt, bendAmt) * len;
    const cx = (x + x2) / 2 + Math.cos(ang + Math.PI / 2) * bend, cy = (y + y2) / 2 + Math.sin(ang + Math.PI / 2) * bend;
    const dur = reduceMotion ? .05 : .28 + len / 260;
    const seg = { kind, x, y, cx, cy, x2, y2, w, depth, maxDepth, t0, dur, baked: false };
    segments.push(seg);
    return seg;
  }

  function branch(x, y, ang, len, w, depth, maxDepth, t0) {
    const seg = addSeg('b', x, y, ang, len, w, depth, maxDepth, t0, .12);
    const t1 = t0 + seg.dur;
    if (depth >= maxDepth || len < 3.5) {
      blooms.push({ x: seg.x2, y: seg.y2, t0: t1 + rnd(.05, .9), dur: rnd(.7, 1.2),
        size: rnd(12, 17) * (rand() < .12 ? 1.35 : 1), sprite: (rand() * bloomSprites.length) | 0, rot: rand() * TAU, baked: false });
      return;
    }
    if (depth >= maxDepth - 4 && depth > 1 && rand() < .42) {          // a few blooms blooming along the inner branches too
      blooms.push({ x: seg.x2, y: seg.y2, t0: t1 + rnd(.4, 1.6), dur: rnd(.8, 1.3), size: rnd(10, 14),
        sprite: (rand() * bloomSprites.length) | 0, rot: rand() * TAU, baked: false });
    }
    const kids = depth < 2 ? 2 : (rand() < .28 ? 3 : 2);
    const spread = depth < 2 ? rnd(.3, .4) : rnd(.24, .36);
    for (let i = 0; i < kids; i++) {
      const off = kids === 2 ? (i ? 1 : -1) * spread : (i - 1) * spread * 1.15;
      // a gentle pull upward keeps the crown round instead of flat
      let a = ang + off + rnd(-.13, .13);
      a += (-Math.PI / 2 - a) * .06;
      branch(seg.x2, seg.y2, a, len * rnd(.76, .86), Math.max(.6, w * .7), depth + 1, maxDepth, t1);
    }
  }

  function root(x, y, ang, len, w, depth, t0) {
    const seg = addSeg('r', x, y, ang, len, w, depth, 5, t0, .25);
    if (depth >= 4) return;
    const kids = rand() < .5 ? 2 : 1;
    for (let i = 0; i < kids; i++) {
      root(seg.x2, seg.y2, ang + rnd(-.5, .5), len * rnd(.62, .78), Math.max(.5, w * .66), depth + 1, t0 + seg.dur);
    }
  }

  function segColor(seg, alpha) {
    if (seg.kind === 'r') return `hsla(${28 + seg.depth * 4},100%,${62 - seg.depth * 4}%,${alpha * (1 - seg.depth * .14)})`;
    const h = hueAt(seg.depth, seg.maxDepth);
    return `hsla(${h},95%,${58 + seg.depth * 2}%,${alpha})`;
  }

  function strokeSeg(g, seg, p, glow) {
    // partial quadratic curve via de Casteljau
    const ax = seg.x + (seg.cx - seg.x) * p, ay = seg.y + (seg.cy - seg.y) * p;
    const bx = seg.cx + (seg.x2 - seg.cx) * p, by = seg.cy + (seg.y2 - seg.cy) * p;
    const ex = ax + (bx - ax) * p, ey = ay + (by - ay) * p;
    g.lineCap = 'round';
    if (glow) {
      const op = g.globalCompositeOperation;
      g.globalCompositeOperation = 'lighter';
      g.strokeStyle = segColor(seg, .16);
      g.lineWidth = seg.w * 2.6;
      g.beginPath(); g.moveTo(seg.x, seg.y); g.quadraticCurveTo(ax, ay, ex, ey); g.stroke();
      g.globalCompositeOperation = op;
    }
    g.strokeStyle = segColor(seg, 1);
    g.lineWidth = seg.w;
    g.beginPath(); g.moveTo(seg.x, seg.y); g.quadraticCurveTo(ax, ay, ex, ey); g.stroke();
    if (seg.w > 1.6) {                                      // bright core line = neon look
      g.strokeStyle = 'rgba(255,248,230,.55)';
      g.lineWidth = seg.w * .28;
      g.beginPath(); g.moveTo(seg.x, seg.y); g.quadraticCurveTo(ax, ay, ex, ey); g.stroke();
    }
    return [ex, ey];
  }

  function drawBloom(g, r, k) {
    const sp = bloomSprites[r.sprite];
    const sz = r.size * easeBack(k) * 2;
    if (sz <= .5) return;
    g.save();
    g.globalAlpha = Math.min(1, k * 1.6);
    g.translate(r.x, r.y);
    g.rotate(r.rot + (1 - k) * 1.4);
    g.drawImage(sp, -sz / 2, -sz / 2, sz, sz);
    g.restore();
  }

  // ---------- effects ----------
  function spawnPetal(x, y, burst) {
    const pal = BLOOM_PAL[(rand() * BLOOM_PAL.length) | 0];
    petals.push({ x, y, vx: burst ? rnd(-90, 90) : rnd(-12, 12), vy: burst ? rnd(-140, -20) : rnd(8, 30), rot: rand() * TAU,
      vr: rnd(-3, 3), s: rnd(3.5, 6.5) * S, h: pal[0], l: pal[2], life: 0, max: rnd(6, 10), wob: rand() * TAU });
  }

  function tapAt(x, y) {
    for (let i = 0; i < 22; i++) spawnPetal(x, y, true);
    for (let i = 0; i < 14; i++) sparks.push({ x, y, vx: rnd(-160, 160), vy: rnd(-160, 160), life: 0, max: rnd(.5, 1.1) });
    if (y > baseY - 80 * S) ripples.push({ t0: now - growStart, hue: pick([190, 300, 45]) });
  }

  // ---------- frame ----------
  function frame(dt) {
    now += dt;
    const t = now - growStart;
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(skyLayer, 0, 0, W, H);

    // stars
    for (const s of stars) {
      const a = .35 + .65 * (.5 + .5 * Math.sin(now * s.s + s.p));
      ctx.fillStyle = `hsla(${s.hue},80%,88%,${a})`;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill();
    }
    // shooting stars
    if (!reduceMotion && rand() < dt * .12) shooting.push({ x: rnd(W * .1, W), y: rnd(0, H * .35), life: 0 });
    for (let i = shooting.length - 1; i >= 0; i--) {
      const s = shooting[i]; s.life += dt;
      const k = s.life / .9, x = s.x - k * 260 * S, y = s.y + k * 120 * S;
      const gr = ctx.createLinearGradient(x, y, x + 70 * S, y - 32 * S);
      gr.addColorStop(0, `rgba(255,255,255,${.9 * (1 - k)})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.strokeStyle = gr; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 70 * S, y - 32 * S); ctx.stroke();
      if (k >= 1) shooting.splice(i, 1);
    }

    // ripple rings at the base of the tree
    if (t - lastRipple > 1.1) { lastRipple = t; ripples.push({ t0: t, hue: ripples.length % 2 ? 300 : 190 }); }
    const ground = ctx.createRadialGradient(baseX, baseY, 0, baseX, baseY, 120 * S);
    ground.addColorStop(0, 'rgba(255,170,90,.45)'); ground.addColorStop(1, 'rgba(255,120,80,0)');
    ctx.fillStyle = ground; ctx.beginPath(); ctx.ellipse(baseX, baseY, 120 * S, 34 * S, 0, 0, TAU); ctx.fill();
    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i], k = (t - r.t0) / 4.2;
      if (k > 1) { ripples.splice(i, 1); continue; }
      if (k < 0) continue;
      const R = 14 * S + k * Math.min(W * .62, 300 * S);
      ctx.strokeStyle = `hsla(${r.hue},100%,65%,${.75 * (1 - k)})`;
      ctx.lineWidth = 1.8 * (1 - k) + .4;
      ctx.beginPath(); ctx.ellipse(baseX, baseY, R, R * .2, 0, 0, TAU); ctx.stroke();
    }

    // tree: finished pieces are baked into a layer once; only growing pieces are drawn live
    const sway = reduceMotion ? 0 : Math.sin(now * .7) * .006 + Math.sin(now * 1.9) * .002;
    let growing = 0;
    ctx.save();
    ctx.translate(baseX, baseY); ctx.rotate(sway); ctx.translate(-baseX, -baseY);
    ctx.drawImage(treeLayer, 0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    for (const seg of segments) {
      if (seg.baked) continue;
      const p = (t - seg.t0) / seg.dur;
      if (p <= 0) continue;
      if (p >= 1) { strokeSeg(tctx, seg, 1, true); seg.baked = true; continue; }
      growing++;
      const [ex, ey] = strokeSeg(ctx, seg, ease(p), true);
      if (seg.depth < 7 || seg.kind === 'r') {
        const gs = (seg.kind === 'r' ? 14 : 18) * S;
        ctx.drawImage(glowDot, ex - gs / 2, ey - gs / 2, gs, gs);
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    for (const r of blooms) {
      if (r.baked) continue;
      const k = (t - r.t0) / r.dur;
      if (k <= 0) continue;
      if (k >= 1) { drawBloom(tctx, r, 1); r.baked = true; continue; }
      drawBloom(ctx, r, k);
    }
    ctx.restore();

    // falling petals once the blossoms are out
    if (t > bloomDone * .55 && t - lastPetal > .16 && petals.length < 70 && blooms.length) {
      lastPetal = t;
      const r = blooms[(rand() * blooms.length) | 0];
      if (r.baked) spawnPetal(r.x, r.y, false);
    }
    for (let i = petals.length - 1; i >= 0; i--) {
      const p = petals[i];
      p.life += dt;
      p.vy += (p.vy < 40 ? 60 : 0) * dt;
      p.vx *= .985;
      p.x += (p.vx + Math.sin(now * 1.6 + p.wob) * 22) * dt;
      p.y += p.vy * dt; p.rot += p.vr * dt;
      const a = Math.min(1, p.life * 2) * Math.min(1, (p.max - p.life) / 1.5);
      if (p.life > p.max || p.y > H + 20) { petals.splice(i, 1); continue; }
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = `hsla(${p.h},90%,${p.l}%,${a})`;
      ctx.beginPath(); ctx.ellipse(0, 0, p.s, p.s * .58, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = `hsla(${p.h},90%,${p.l + 18}%,${a * .7})`;
      ctx.beginPath(); ctx.ellipse(-p.s * .25, -p.s * .12, p.s * .45, p.s * .22, 0, 0, TAU); ctx.fill();
      ctx.restore();
    }

    // fireflies + tap sparks
    ctx.globalCompositeOperation = 'lighter';
    for (const f of flies) {
      f.x += (f.vx + Math.sin(now * .8 + f.p) * 10) * dt; f.y += (f.vy + Math.cos(now * .6 + f.p) * 8) * dt;
      if (f.x < -20) f.x = W + 20; if (f.x > W + 20) f.x = -20; if (f.y < H * .1) f.vy = Math.abs(f.vy); if (f.y > H * .9) f.vy = -Math.abs(f.vy);
      const a = .35 + .65 * Math.max(0, Math.sin(now * 1.3 + f.p));
      ctx.globalAlpha = a;
      ctx.drawImage(glowDot, f.x - f.r, f.y - f.r, f.r * 2, f.r * 2);
    }
    ctx.globalAlpha = 1;
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i]; s.life += dt;
      if (s.life > s.max) { sparks.splice(i, 1); continue; }
      s.x += s.vx * dt; s.y += s.vy * dt; s.vx *= .94; s.vy *= .94;
      const r = 10 * S * (1 - s.life / s.max);
      ctx.drawImage(glowDot, s.x - r, s.y - r, r * 2, r * 2);
    }
    ctx.globalCompositeOperation = 'source-over';

    // the message types itself once most blossoms are open
    if (!messageShown && t > bloomDone * .7) {
      messageShown = true;
      $('message').classList.add('show');
      $('hint').classList.add('show');
      $('controls').classList.add('show');
    }
    if (messageShown && typed < MESSAGE.length) {
      const target = Math.min(MESSAGE.length, Math.floor((t - bloomDone * .7 - .9) * 26));
      if (target > typed) {
        typed = target;
        $('typeLine').innerHTML = '';
        $('typeLine').append(document.createTextNode(MESSAGE.slice(0, typed)));
        const c = document.createElement('span'); c.className = 'caret'; c.textContent = '|';
        $('typeLine').append(c);
      }
    }
  }

  // ---------- loop ----------
  let last = 0;
  function loop(ts) {
    const dt = last ? Math.min(.05, (ts - last) / 1000) : .016;
    last = ts;
    frame(dt);
    requestAnimationFrame(loop);
  }

  // ---------- interactions ----------
  cvs.addEventListener('pointerdown', (e) => { tapAt(e.clientX, e.clientY); });
  $('regrow').addEventListener('click', () => { seed = (seed * 9301 + 49297 + Date.now()) >>> 0; plant(); });

  const sheet = $('sheet');
  $('send').addEventListener('click', () => {
    $('shareOut').textContent = '';
    if (typeof sheet.showModal === 'function') sheet.showModal(); else sheet.setAttribute('open', '');
    setTimeout(() => $('nameInput').focus(), 50);
  });
  $('cancelSheet').addEventListener('click', () => sheet.close ? sheet.close() : sheet.removeAttribute('open'));
  $('sheetForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = cleanName($('nameInput').value);
    const url = new URL(location.href);
    url.search = '';
    if (name) url.searchParams.set('to', name);
    const link = url.toString();
    const text = name ? `${name}, I grew a cosmic tree for you 🌌` : 'Watch this tree grow from its roots 🌌';
    try {
      if (navigator.share) { await navigator.share({ title: 'Cosmic Tree 🌌', text, url: link }); $('shareOut').textContent = 'Sent 💌'; return; }
    } catch (err) { /* share sheet dismissed: fall back to copy */ }
    try { await navigator.clipboard.writeText(link); $('shareOut').textContent = 'Link copied! ' + link; }
    catch (err) { $('shareOut').textContent = link; }
  });

  // gentle ambient music, synthesized live (no audio files)
  let audio = null;
  function startMusic() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    const ac = new AC();
    const master = ac.createGain(); master.gain.value = 0; master.connect(ac.destination);
    master.gain.linearRampToValueAtTime(.22, ac.currentTime + 2);
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400; lp.connect(master);
    const delay = ac.createDelay(); delay.delayTime.value = .38;
    const fb = ac.createGain(); fb.gain.value = .35; delay.connect(fb); fb.connect(delay); delay.connect(lp);
    const chords = [[220, 277.18, 329.63, 415.3], [174.61, 220, 261.63, 329.63], [196, 246.94, 293.66, 369.99], [164.81, 207.65, 246.94, 329.63]];
    const pad = chords[0].map((f) => {
      const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = f;
      const g = ac.createGain(); g.gain.value = .05; o.connect(g); g.connect(lp); o.start(); return o;
    });
    let ci = 0;
    const scale = [440, 493.88, 554.37, 659.25, 739.99, 880, 987.77];
    const chordTimer = setInterval(() => {
      ci = (ci + 1) % chords.length;
      pad.forEach((o, i) => o.frequency.setTargetAtTime(chords[ci][i], ac.currentTime, .8));
    }, 4000);
    const pluckTimer = setInterval(() => {
      if (Math.random() < .3) return;
      const o = ac.createOscillator(); o.type = 'triangle';
      o.frequency.value = scale[(Math.random() * scale.length) | 0];
      const g = ac.createGain(); const t0 = ac.currentTime;
      g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(.09, t0 + .01); g.gain.exponentialRampToValueAtTime(.0005, t0 + 1.6);
      o.connect(g); g.connect(lp); g.connect(delay); o.start(t0); o.stop(t0 + 1.7);
    }, 420);
    return { ac, master, stop() { clearInterval(chordTimer); clearInterval(pluckTimer);
      master.gain.linearRampToValueAtTime(0, ac.currentTime + .4); setTimeout(() => ac.close(), 600); } };
  }
  $('sound').addEventListener('click', () => {
    const on = $('sound').getAttribute('aria-pressed') === 'true';
    if (on) { audio && audio.stop(); audio = null; }
    else { audio = startMusic(); }
    $('sound').setAttribute('aria-pressed', String(!on));
    $('soundLabel').textContent = on ? 'music' : 'music on';
  });

  let rt;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(resize, 200); });

  resize();
  if (CAPTURE) {
    // video capture hook: advance the scene by a fixed step and render, no real-time loop
    window.__step = (dt) => frame(dt);
    window.__tap = (x, y) => tapAt(x, y);
    window.__ready = true;
  } else {
    requestAnimationFrame(loop);
  }
})();
