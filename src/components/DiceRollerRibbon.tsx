import React, { useState, useRef, useEffect, useCallback } from 'react';
import Matter from 'matter-js';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'react-router-dom';

const { Engine, World, Bodies, Body, Query } = Matter;

// --- Equation Logic (ported from dice-roller.html) ---
interface DiceTerm {
  sides: number;
  sign: number;
  flavor: 'normal' | 'hope' | 'fear';
}

function parseEquation(str: string): { diceTerms: DiceTerm[]; constant: number } {
  const s = (str || '').replace(/\s+/g, '');
  if (!s) return { diceTerms: [], constant: 0 };
  const eqStr = (s[0] !== '+' && s[0] !== '-') ? '+' + s : s;
  let i = 0;
  const diceTerms: DiceTerm[] = [];
  let constant = 0;
  while (i < eqStr.length) {
    const sign = eqStr[i] === '+' ? 1 : -1;
    i++;
    let numStr = '';
    while (i < eqStr.length && /[0-9]/.test(eqStr[i])) { numStr += eqStr[i++]; }
    const num = numStr ? parseInt(numStr, 10) : null;
    if (i < eqStr.length) {
      const char = eqStr[i];
      if (char === 'd' || char === 'D') {
        i++;
        let sides = 0;
        if (eqStr[i] === '%') { i++; sides = 100; }
        else { let ss = ''; while (i < eqStr.length && /[0-9]/.test(eqStr[i])) ss += eqStr[i++]; sides = parseInt(ss, 10); }
        if (sides > 0) { const count = num ?? 1; for (let k = 0; k < count; k++) diceTerms.push({ sides, sign, flavor: 'normal' }); }
      } else if (char === 'H' || char === 'F') {
        i++;
        const count = num ?? 1;
        const flavor: 'hope' | 'fear' = char === 'H' ? 'hope' : 'fear';
        for (let k = 0; k < count; k++) diceTerms.push({ sides: 12, sign, flavor });
      } else if (num !== null) { constant += sign * num; }
      else { i++; }
    } else if (num !== null) { constant += sign * num; }
  }
  return { diceTerms, constant };
}

function buildEquationString(diceTerms: DiceTerm[], constant: number): string {
  const counts = new Map<number, number>();
  let hCount = 0, fCount = 0;
  for (const t of diceTerms) {
    if (t.flavor === 'hope') { hCount++; continue; }
    if (t.flavor === 'fear') { fCount++; continue; }
    const key = t.sign * t.sides;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const parts: { txt: string; val: number }[] = [];
  if (hCount > 0) parts.push({ txt: hCount > 1 ? `${hCount}H` : 'H', val: 1 });
  if (fCount > 0) parts.push({ txt: fCount > 1 ? `${fCount}F` : 'F', val: 1 });
  const sortedKeys = Array.from(counts.keys()).sort((a, b) => Math.abs(b) - Math.abs(a));
  for (const key of sortedKeys) {
    const count = counts.get(key)!;
    const sides = Math.abs(key);
    const label = sides === 100 ? 'd%' : `d${sides}`;
    const qty = count > 1 ? count : '';
    parts.push({ txt: `${qty}${label}`, val: key < 0 ? -1 : 1 });
  }
  if (constant !== 0) parts.push({ txt: Math.abs(constant).toString(), val: constant });
  let str = '';
  parts.forEach((p, idx) => {
    const op = p.val < 0 ? '-' : idx === 0 ? '' : '+';
    str += op + p.txt;
  });
  return str;
}

function rebuildEquation(currentStr: string, newTerms: DiceTerm[]): string {
  const parsed = parseEquation(currentStr);
  const terms = [...parsed.diceTerms, ...newTerms];
  return buildEquationString(terms, parsed.constant);
}

// --- Die data structure ---
interface DieData {
  sides: number;
  sign: number;
  flavor: 'normal' | 'hope' | 'fear';
  value: number;
  body: Matter.Body;
  size: number;
  isEnlarged: boolean;
  isCrit: boolean;
}

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shapeForSides(sides: number) {
  if (sides === 100) return { kind: 'circle' as const };
  if (sides === 4 || sides === 8 || sides === 10) return { kind: 'poly' as const, verts: 3 };
  if (sides === 12) return { kind: 'poly' as const, verts: 5 };
  if (sides === 20) return { kind: 'poly' as const, verts: 6 };
  return { kind: 'poly' as const, verts: 4 };
}

// --- Gradient helpers ---
function getCritGradient(ctx: CanvasRenderingContext2D, bodyId: number, r: number, timeMs: number) {
  const ang = (timeMs * 0.0012) + (bodyId * 0.37);
  const gx0 = Math.cos(ang) * (r * 0.75), gy0 = Math.sin(ang) * (r * 0.75);
  const grad = ctx.createLinearGradient(gx0, gy0, -gx0, -gy0);
  grad.addColorStop(0.00, '#ffffff');
  grad.addColorStop(0.20, '#ffffff');
  grad.addColorStop(0.25, '#ffd700');
  grad.addColorStop(0.35, '#000000');
  grad.addColorStop(0.65, '#000000');
  grad.addColorStop(0.75, '#ff2a6d');
  grad.addColorStop(0.85, '#7f2aff');
  grad.addColorStop(1.00, '#7f2aff');
  return grad;
}

function getNormalGradient(ctx: CanvasRenderingContext2D, die: DieData, r: number, timeMs: number) {
  const ang = (timeMs * 0.001) + die.body.id;
  const r9 = r * 0.9;
  const gx = Math.cos(ang) * r9, gy = Math.sin(ang) * r9;
  const grad = ctx.createLinearGradient(gx, gy, -gx, -gy);
  if (die.flavor === 'hope' && die.sign === 1) {
    grad.addColorStop(0, '#ffd700'); grad.addColorStop(0.4, '#ffffff'); grad.addColorStop(0.7, '#000000'); grad.addColorStop(1, '#000000');
  } else if (die.flavor === 'fear' && die.sign === 1) {
    grad.addColorStop(0, '#ff2a6d'); grad.addColorStop(0.4, '#7f2aff'); grad.addColorStop(0.7, '#000000'); grad.addColorStop(1, '#000000');
  } else if (die.sign < 0) {
    grad.addColorStop(0, '#ff3b3b'); grad.addColorStop(0.4, '#000000');
  } else {
    grad.addColorStop(0, '#00f5ff'); grad.addColorStop(0.4, '#000000');
  }
  return grad;
}

// --- Component ---
const DiceRollerRibbon: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [equation, setEquation] = useState('');
  const [bonus, setBonus] = useState('0');
  const [totalDisplay, setTotalDisplay] = useState('—');
  const [dualityState, setDualityState] = useState<'none' | 'hope' | 'fear' | 'crit'>('none');
  const [hasDuality, setHasDuality] = useState(false);
  const [customSides, setCustomSides] = useState('7');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const diceRef = useRef<DieData[]>([]);
  const dieByBodyIdRef = useRef<Map<number, DieData>>(new Map());
  const wallsRef = useRef<Matter.Body[]>([]);
  const animFrameRef = useRef<number>(0);
  const lastEdited = useRef<'equation' | 'bonus'>('bonus');
  const equationRef = useRef(equation);

  useEffect(() => { equationRef.current = equation; }, [equation]);

  if (!user || location.pathname === '/auth') return null;

  const makeDie = useCallback((opts: { sides: number; sign?: number; flavor?: 'normal' | 'hope' | 'fear' }) => {
    const engine = engineRef.current;
    if (!engine) return null;
    const { sides, sign = 1, flavor = 'normal' } = opts;
    const size = Math.max(36, Math.min(60, 30 + Math.sqrt(Math.max(1, sides)) * 3.5));
    const W = window.innerWidth;
    const H = window.innerHeight;
    const buf = 150;
    const px = randInt(buf, W - buf);
    const py = randInt(buf, H - buf);
    const physOpts = { friction: 0.05, frictionAir: 0.015, restitution: 0.6, density: 0.002 };
    const shape = shapeForSides(sides);
    let body: Matter.Body;
    if (shape.kind === 'circle') body = Bodies.circle(px, py, size * 0.55, physOpts);
    else body = Bodies.polygon(px, py, shape.verts, size * 0.55, physOpts);
    (body as any).isDie = true;
    const die: DieData = { sides, sign, flavor, value: randInt(1, sides), body, size, isEnlarged: false, isCrit: false };
    dieByBodyIdRef.current.set(body.id, die);
    diceRef.current.push(die);
    World.add(engine.world, body);
    const angle = Math.random() * Math.PI * 2;
    const speed = 12 + Math.random() * 5;
    Body.setVelocity(body, { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed });
    Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.3);
    return die;
  }, []);

  const clearDice = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    for (const d of diceRef.current) {
      World.remove(engine.world, d.body);
      dieByBodyIdRef.current.delete(d.body.id);
    }
    diceRef.current.length = 0;
  }, []);

  const computeAndUpdateHUD = useCallback(() => {
    const parsed = parseEquation(equationRef.current);
    const eqConst = parsed.constant;
    let sum = eqConst;
    let hasHopeD = false, hasFearD = false;
    let maxHopeVal = -1, maxFearVal = -1;
    let critHopeDie: DieData | null = null, critFearDie: DieData | null = null;
    for (const d of diceRef.current) {
      sum += d.value * d.sign;
      if (d.sign === 1) {
        if (d.flavor === 'hope') { hasHopeD = true; if (d.value > maxHopeVal) { maxHopeVal = d.value; critHopeDie = d; } }
        else if (d.flavor === 'fear') { hasFearD = true; if (d.value > maxFearVal) { maxFearVal = d.value; critFearDie = d; } }
      }
    }
    let ds: 'none' | 'hope' | 'fear' | 'crit' = 'none';
    if (hasHopeD && hasFearD) {
      if (maxHopeVal === maxFearVal) ds = 'crit';
      else if (maxHopeVal > maxFearVal) ds = 'hope';
      else ds = 'fear';
    }
    setTotalDisplay(Number.isFinite(sum) ? String(sum) : '—');
    setDualityState(ds);
    setHasDuality(hasHopeD && hasFearD);
    for (const d of diceRef.current) d.isCrit = false;
    if (ds === 'crit' && critHopeDie && critFearDie) {
      critHopeDie.isCrit = true;
      critFearDie.isCrit = true;
    }
    for (const d of diceRef.current) {
      if (d.isCrit && !d.isEnlarged) { Body.scale(d.body, 1.8, 1.8); d.size *= 1.8; d.isEnlarged = true; }
      else if (!d.isCrit && d.isEnlarged) { Body.scale(d.body, 0.555, 0.555); d.size /= 1.8; d.isEnlarged = false; }
    }
  }, []);

  const addTerm = useCallback((sides: number, sign = 1, flavor: 'normal' | 'hope' | 'fear' = 'normal') => {
    const newEq = rebuildEquation(equationRef.current, [{ sides, sign, flavor }]);
    setEquation(newEq);
    equationRef.current = newEq;
    const newBonus = parseEquation(newEq).constant;
    setBonus(String(newBonus));
    makeDie({ sides: (flavor === 'hope' || flavor === 'fear') ? 12 : sides, sign, flavor });
    computeAndUpdateHUD();
  }, [makeDie, computeAndUpdateHUD]);

  const rollFromEquation = useCallback(() => {
    const parsed = parseEquation(equationRef.current);
    const normalizedEq = buildEquationString(parsed.diceTerms, parsed.constant);
    setEquation(normalizedEq);
    equationRef.current = normalizedEq;
    setBonus(String(parsed.constant));
    clearDice();
    for (const t of parsed.diceTerms) {
      makeDie({ sides: t.sides, sign: t.sign, flavor: t.flavor });
    }
    computeAndUpdateHUD();
  }, [clearDice, makeDie, computeAndUpdateHUD]);

  const handleClear = useCallback(() => {
    setEquation('');
    equationRef.current = '';
    setBonus('0');
    lastEdited.current = 'bonus';
    clearDice();
    computeAndUpdateHUD();
  }, [clearDice, computeAndUpdateHUD]);

  const handleEquationChange = useCallback((val: string) => {
    lastEdited.current = 'equation';
    setEquation(val);
    equationRef.current = val;
    const parsed = parseEquation(val);
    setBonus(String(parsed.constant));
    computeAndUpdateHUD();
  }, [computeAndUpdateHUD]);

  const handleBonusChange = useCallback((val: string) => {
    lastEdited.current = 'bonus';
    setBonus(val);
    const parsed = parseEquation(equationRef.current);
    const b = parseInt(val || '0', 10) || 0;
    const newEq = buildEquationString(parsed.diceTerms, b);
    setEquation(newEq);
    equationRef.current = newEq;
    computeAndUpdateHUD();
  }, [computeAndUpdateHUD]);

  const handleDuality = useCallback(() => {
    const newEq = rebuildEquation(equationRef.current, [
      { sides: 12, sign: 1, flavor: 'hope' },
      { sides: 12, sign: 1, flavor: 'fear' },
    ]);
    setEquation(newEq);
    equationRef.current = newEq;
    const newBonus = parseEquation(newEq).constant;
    setBonus(String(newBonus));
    makeDie({ sides: 12, sign: 1, flavor: 'hope' });
    makeDie({ sides: 12, sign: 1, flavor: 'fear' });
    computeAndUpdateHUD();
  }, [makeDie, computeAndUpdateHUD]);

  useEffect(() => {
    if (!isOpen) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (engineRef.current) {
        clearDice();
        World.clear(engineRef.current.world, false);
        Engine.clear(engineRef.current);
        engineRef.current = null;
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true })!;

    const engine = Engine.create();
    engine.gravity.scale = 0;
    engineRef.current = engine;

    const MARGIN = 50, WALL_THICK = 100;

    function setupWalls() {
      const W = window.innerWidth;
      const H = window.innerHeight;
      if (wallsRef.current.length) World.remove(engine.world, wallsRef.current);
      const opts = { isStatic: true, friction: 0.05, restitution: 0.5 };
      wallsRef.current = [
        Bodies.rectangle(MARGIN - WALL_THICK / 2, H / 2, WALL_THICK, H * 2, opts),
        Bodies.rectangle(W - MARGIN + WALL_THICK / 2, H / 2, WALL_THICK, H * 2, opts),
        Bodies.rectangle(W / 2, MARGIN - WALL_THICK / 2, W * 2, WALL_THICK, opts),
        Bodies.rectangle(W / 2, H - MARGIN + WALL_THICK / 2, W * 2, WALL_THICK, opts),
      ];
      World.add(engine.world, wallsRef.current);
    }

    function resize() {
      const W = window.innerWidth;
      const H = window.innerHeight;
      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      setupWalls();
    }

    resize();
    window.addEventListener('resize', resize);

    const handleCanvasClick = (ev: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      const p = { x: ev.clientX - r.left, y: ev.clientY - r.top };
      const hit = Query.point(diceRef.current.map(d => d.body), p)[0];
      if (hit) {
        const die = dieByBodyIdRef.current.get(hit.id);
        if (die) {
          die.value = randInt(1, die.sides);
          const angle = Math.random() * Math.PI * 2;
          Body.setVelocity(die.body, { x: Math.cos(angle) * 10, y: Math.sin(angle) * 10 });
          Body.setAngularVelocity(die.body, (Math.random() - 0.5) * 0.3);
          const parsed = parseEquation(equationRef.current);
          let sum = parsed.constant;
          for (const d of diceRef.current) sum += d.value * d.sign;
          setTotalDisplay(Number.isFinite(sum) ? String(sum) : '—');
        }
      }
    };
    canvas.addEventListener('pointerdown', handleCanvasClick);

    let last = performance.now();
    function tick(now: number) {
      const dt = Math.min(33, now - last);
      last = now;
      Engine.update(engine, dt);

      const W = window.innerWidth;
      const H = window.innerHeight;
      const floorY = H - MARGIN + WALL_THICK / 2 + 20;

      for (const d of diceRef.current) {
        if (d.body.position.y > floorY) {
          Body.setPosition(d.body, { x: W / 2, y: H / 2 });
          Body.setVelocity(d.body, { x: 0, y: 0 });
        }
        if (Math.hypot(d.body.velocity.x, d.body.velocity.y) < 0.1 && Math.abs(d.body.angularVelocity) < 0.05) {
          Body.setVelocity(d.body, { x: 0, y: 0 });
          Body.setAngularVelocity(d.body, 0);
        }
      }

      ctx.clearRect(0, 0, W, H);

      ctx.globalAlpha = 0.04;
      ctx.strokeStyle = '#00f5ff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= W; x += 50) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
      for (let y = 0; y <= H; y += 50) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
      ctx.stroke();
      ctx.globalAlpha = 1;

      for (const d of diceRef.current) {
        const b = d.body;
        const x = b.position.x, y = b.position.y;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(b.angle);
        ctx.beginPath();
        const v = b.vertices;
        ctx.moveTo(v[0].x - x, v[0].y - y);
        for (let i = 1; i < v.length; i++) ctx.lineTo(v[i].x - x, v[i].y - y);
        ctx.closePath();
        ctx.fillStyle = '#070a12';
        ctx.fill();
        ctx.lineWidth = 4;
        if (d.isCrit) {
          ctx.strokeStyle = getCritGradient(ctx, d.body.id, d.size, now);
          ctx.shadowColor = 'rgba(255,215,0,0.75)';
          ctx.shadowBlur = 35;
        } else {
          ctx.strokeStyle = getNormalGradient(ctx, d, d.size, now);
          ctx.shadowBlur = 0;
        }
        ctx.stroke();
        if (!d.isCrit) { ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.stroke(); }
        ctx.rotate(-b.angle);
        ctx.fillStyle = '#fff';
        ctx.font = '700 18px "Orbitron", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 4;
        ctx.fillText((d.sign < 0 ? '-' : '') + d.value, 0, 0);
        ctx.restore();
      }

      animFrameRef.current = requestAnimationFrame(tick);
    }
    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('pointerdown', handleCanvasClick);
      clearDice();
      World.clear(engine.world, false);
      Engine.clear(engine);
      engineRef.current = null;
    };
  }, [isOpen, clearDice]);

  const diceButtons = [
    { sides: 4, label: 'd4' }, { sides: 6, label: 'd6' }, { sides: 8, label: 'd8' },
    { sides: 10, label: 'd10' }, { sides: 12, label: 'd12' }, { sides: 20, label: 'd20' },
  ];
  const negDiceButtons = [
    { sides: 4, label: '-d4' }, { sides: 6, label: '-d6' }, { sides: 8, label: '-d8' },
    { sides: 10, label: '-d10' }, { sides: 12, label: '-d12' }, { sides: 20, label: '-d20' },
  ];

  return (
    <>
      {isOpen && (
        <canvas
          ref={canvasRef}
          className="fixed inset-0 z-[9998]"
          style={{ pointerEvents: 'auto' }}
        />
      )}

      <div
        className={`fixed top-0 right-0 h-full z-[9999] transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ width: 320 }}
      >
        <div className="h-full flex flex-col overflow-y-auto"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0)) , #0a0c12',
            borderLeft: '1px solid #141a2c',
            fontFamily: '"Orbitron", sans-serif',
            color: '#d6d9e6',
            letterSpacing: '1px',
          }}
        >
          <button
            onClick={() => setIsOpen(false)}
            className="absolute top-2 right-2 text-white/60 hover:text-white text-xl z-10"
            style={{ fontFamily: '"Orbitron", sans-serif' }}
          >
            ✕
          </button>

          <div className="p-4 flex flex-col gap-3 pt-10">
            <div className="rounded-xl p-3 flex flex-col gap-1" style={{ background: '#070911', border: '1px solid #141a2c' }}>
              <div className="h-6 flex items-center">
                {hasDuality && (
                  <span
                    className={`font-black text-xs px-1.5 py-0.5 rounded ${
                      dualityState === 'hope' ? 'text-yellow-400' :
                      dualityState === 'fear' ? 'text-pink-500' :
                      dualityState === 'crit' ? 'text-white text-2xl animate-pulse' : ''
                    }`}
                    style={dualityState === 'crit' ? {
                      background: 'linear-gradient(90deg, rgba(255,215,0,0.15), rgba(127,42,255,0.15))',
                      border: '1px solid rgba(255,255,255,0.4)',
                      textShadow: '0 0 10px #fff, 0 0 20px #ffd700, 0 0 30px #ff2a6d',
                    } : undefined}
                  >
                    {dualityState === 'hope' ? 'HOPE' : dualityState === 'fear' ? 'FEAR' : dualityState === 'crit' ? 'CRITICAL' : ''}
                  </span>
                )}
              </div>
              <div className="text-right text-4xl font-black text-white" style={{ textShadow: '0 0 20px rgba(0,245,255,0.2)' }}>
                {totalDisplay}
              </div>
            </div>

            <div className="rounded-xl p-2 flex flex-col gap-2" style={{ background: '#070911', border: '1px solid #141a2c' }}>
              <input
                type="text"
                value={equation}
                onChange={e => handleEquationChange(e.target.value)}
                placeholder="Equation..."
                spellCheck={false}
                autoComplete="off"
                className="bg-transparent border-none text-sm w-full outline-none"
                style={{ color: '#d6d9e6', fontFamily: '"Orbitron", sans-serif' }}
              />
              <div className="flex items-center gap-2 text-xs uppercase" style={{ color: '#8b92b3' }}>
                <label>Bonus</label>
                <input
                  type="number"
                  value={bonus}
                  onChange={e => handleBonusChange(e.target.value)}
                  step={1}
                  className="w-12 text-center rounded-md py-1 text-white outline-none"
                  style={{ background: '#050711', border: '1px solid #141a2c', fontFamily: '"Orbitron", sans-serif' }}
                />
              </div>
              <div className="flex gap-2">
                <button onClick={handleClear} className="flex-1 h-9 rounded-md font-bold text-xs text-white uppercase"
                  style={{ background: '#0d1120', border: '1px solid rgba(255,255,255,0.1)', fontFamily: '"Orbitron", sans-serif' }}>
                  CLR
                </button>
                <button onClick={rollFromEquation} className="flex-1 h-9 rounded-md font-bold text-xs text-white uppercase"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,215,0,0.15), rgba(0,0,0,0.5), rgba(127,42,255,0.15))',
                    border: '1px solid rgba(255,255,255,0.2)',
                    boxShadow: '0 0 10px rgba(255,255,255,0.05)',
                    textShadow: '0 0 5px rgba(255,255,255,0.5)',
                    fontFamily: '"Orbitron", sans-serif',
                  }}>
                  ROLL
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {diceButtons.map(d => (
                <button key={d.label} onClick={() => addTerm(d.sides, 1)}
                  className="h-10 rounded-md text-xs font-bold"
                  style={chipStyle()}>{d.label}</button>
              ))}
              <button onClick={() => addTerm(12, 1, 'hope')} className="h-10 rounded-md text-sm font-black" style={chipStyle('hope')}>H</button>
              <button onClick={() => addTerm(100, 1)} className="h-10 rounded-md text-xs font-bold" style={chipStyle()}>d%</button>
              <button onClick={handleDuality} className="h-10 rounded-md text-xs font-black text-white" style={chipStyle('duality')}>DUALITY</button>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {negDiceButtons.map(d => (
                <button key={d.label} onClick={() => addTerm(d.sides, -1)}
                  className="h-10 rounded-md text-xs font-bold"
                  style={chipStyle('negative')}>{d.label}</button>
              ))}
              <button onClick={() => addTerm(12, 1, 'fear')} className="h-10 rounded-md text-sm font-black" style={chipStyle('fear')}>F</button>
              <button onClick={() => addTerm(100, -1)} className="h-10 rounded-md text-xs font-bold" style={chipStyle('negative')}>-d%</button>
              <div className="flex gap-1">
                <input type="number" value={customSides} onChange={e => setCustomSides(e.target.value)}
                  className="w-10 text-center rounded-md text-white text-xs outline-none"
                  style={{ background: '#050711', border: '1px solid #141a2c', fontFamily: '"Orbitron", sans-serif' }} />
                <button onClick={() => { const v = +customSides; if (v) addTerm(Math.abs(v), v < 0 ? -1 : 1); }}
                  className="flex-1 h-10 rounded-md text-xs font-bold"
                  style={chipStyle()}>Add</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={() => setIsOpen(o => !o)}
        className={`fixed z-[10000] flex items-center justify-center transition-all duration-300 ${
          isOpen ? 'right-[320px]' : 'right-0'
        }`}
        style={{
          top: '50%',
          transform: 'translateY(-50%)',
          width: 40,
          height: 120,
          background: 'linear-gradient(180deg, #0a0c12, #070911)',
          border: '1px solid #141a2c',
          borderRight: isOpen ? '1px solid #141a2c' : 'none',
          borderRadius: '8px 0 0 8px',
          fontFamily: '"Orbitron", sans-serif',
          color: '#d6d9e6',
          writingMode: 'vertical-rl',
          textOrientation: 'mixed',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 2,
          cursor: 'pointer',
          boxShadow: '-4px 0 15px rgba(0,0,0,0.4)',
        }}
      >
        🎲 DICE
      </button>
    </>
  );
};

function chipStyle(variant?: string): React.CSSProperties {
  const base: React.CSSProperties = {
    background: 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(0,0,0,0)), #0b0f1d',
    border: '1px solid rgba(0,245,255,0.3)',
    color: '#d6d9e6',
    cursor: 'pointer',
    fontFamily: '"Orbitron", sans-serif',
    boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
  };
  if (variant === 'negative') return { ...base, color: '#ff8a8a', borderColor: 'rgba(255,59,59,0.4)' };
  if (variant === 'hope') return { ...base, color: '#ffd700', borderColor: 'rgba(255,215,0,0.5)' };
  if (variant === 'fear') return { ...base, color: '#ff2a6d', borderColor: 'rgba(255,42,109,0.5)' };
  if (variant === 'duality') return { ...base, color: '#fff', borderColor: 'rgba(255,255,255,0.4)', background: 'linear-gradient(135deg, rgba(255,215,0,0.1), #0b0f1d, rgba(127,42,255,0.1))' };
  return base;
}

export default DiceRollerRibbon;
