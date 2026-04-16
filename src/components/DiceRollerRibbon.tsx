import React, { useState, useRef, useEffect, useCallback } from 'react';
import Matter from 'matter-js';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const { Engine, World, Bodies, Body, Query } = Matter;

// --- Equation Logic ---
interface DiceTerm {
  sides: number;
  sign: number;
  flavor: 'normal' | 'hope' | 'fear';
  color?: string | null;
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
  color: string | null; // custom color, null = default
  index: number; // index in dice array for results bar
}

interface DieResult {
  sides: number;
  sign: number;
  flavor: 'normal' | 'hope' | 'fear';
  value: number;
  color: string | null;
  index: number;
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
    grad.addColorStop(0, '#ffd700'); grad.addColorStop(0.25, '#ffffff'); grad.addColorStop(0.40, '#000000'); grad.addColorStop(0.60, '#000000'); grad.addColorStop(0.75, '#ffffff'); grad.addColorStop(1, '#ffd700');
  } else if (die.flavor === 'fear' && die.sign === 1) {
    grad.addColorStop(0, '#ff2a6d'); grad.addColorStop(0.25, '#7f2aff'); grad.addColorStop(0.40, '#000000'); grad.addColorStop(0.60, '#000000'); grad.addColorStop(0.75, '#7f2aff'); grad.addColorStop(1, '#ff2a6d');
  } else if (die.color) {
    grad.addColorStop(0, die.color); grad.addColorStop(0.30, die.color); grad.addColorStop(0.42, '#000000'); grad.addColorStop(0.58, '#000000'); grad.addColorStop(0.70, die.color); grad.addColorStop(1, die.color);
  } else if (die.sign < 0) {
    grad.addColorStop(0, '#ff3b3b'); grad.addColorStop(0.30, '#ff3b3b'); grad.addColorStop(0.42, '#000000'); grad.addColorStop(0.58, '#000000'); grad.addColorStop(0.70, '#ff3b3b'); grad.addColorStop(1, '#ff3b3b');
  } else {
    grad.addColorStop(0, '#00f5ff'); grad.addColorStop(0.30, '#00f5ff'); grad.addColorStop(0.42, '#000000'); grad.addColorStop(0.58, '#000000'); grad.addColorStop(0.70, '#00f5ff'); grad.addColorStop(1, '#00f5ff');
  }
  return grad;
}

// Color palette options
const COLOR_PALETTE = [
  { value: null, label: 'Default', css: 'linear-gradient(135deg, #00f5ff, #ff3b3b)' },
  { value: '#00f5ff', label: 'Cyan', css: '#00f5ff' },
  { value: '#ff3b3b', label: 'Red', css: '#ff3b3b' },
  { value: '#39ff14', label: 'Green', css: '#39ff14' },
  { value: '#7f2aff', label: 'Purple', css: '#7f2aff' },
  { value: '#ff8c00', label: 'Orange', css: '#ff8c00' },
  { value: '#ffffff', label: 'White', css: '#ffffff' },
];

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
  const [activeColor, setActiveColor] = useState<string | null>(null);
  const [dieResults, setDieResults] = useState<DieResult[]>([]);
  const [lastResult, setLastResult] = useState<{ total: string; duality: 'none' | 'hope' | 'fear' | 'crit' } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const diceRef = useRef<DieData[]>([]);
  const dieByBodyIdRef = useRef<Map<number, DieData>>(new Map());
  const wallsRef = useRef<Matter.Body[]>([]);
  const animFrameRef = useRef<number>(0);
  const lastEdited = useRef<'equation' | 'bonus'>('bonus');
  const equationRef = useRef(equation);
  const dieIndexCounter = useRef(0);

  useEffect(() => { equationRef.current = equation; }, [equation]);

  const shouldHide = !user || location.pathname === '/auth';

  const updateResults = useCallback(() => {
    const results: DieResult[] = diceRef.current.map(d => ({
      sides: d.sides,
      sign: d.sign,
      flavor: d.flavor,
      value: d.value,
      color: d.color,
      index: d.index,
    }));
    setDieResults(results);
  }, []);

  const logRoll = useCallback(async (eq: string, total: number, dice: DieResult[]) => {
    if (!user) return;
    try {
      await supabase.from('dice_roll_log' as any).insert({
        user_id: user.id,
        equation: eq,
        result: total,
        individual_dice: dice.map(d => ({
          sides: d.sides, sign: d.sign, flavor: d.flavor, value: d.value, color: d.color
        })),
      } as any);
    } catch (_) { /* silent */ }
  }, [user]);

  const makeDie = useCallback((opts: { sides: number; sign?: number; flavor?: 'normal' | 'hope' | 'fear'; color?: string | null }) => {
    const engine = engineRef.current;
    const container = canvasContainerRef.current;
    if (!engine || !container) return null;
    const { sides, sign = 1, flavor = 'normal', color = null } = opts;
    const size = Math.max(28, Math.min(48, 24 + Math.sqrt(Math.max(1, sides)) * 3));
    const rect = container.getBoundingClientRect();
    const W = rect.width;
    const H = rect.height;
    const buf = 40;
    const px = randInt(buf, W - buf);
    const py = randInt(buf, H - buf);
    const physOpts = { friction: 0.05, frictionAir: 0.015, restitution: 0.6, density: 0.002 };
    const shape = shapeForSides(sides);
    let body: Matter.Body;
    if (shape.kind === 'circle') body = Bodies.circle(px, py, size * 0.55, physOpts);
    else body = Bodies.polygon(px, py, shape.verts, size * 0.55, physOpts);
    (body as any).isDie = true;
    const idx = dieIndexCounter.current++;
    const die: DieData = { sides, sign, flavor, value: randInt(1, sides), body, size, isEnlarged: false, isCrit: false, color, index: idx };
    dieByBodyIdRef.current.set(body.id, die);
    diceRef.current.push(die);
    World.add(engine.world, body);
    const angle = Math.random() * Math.PI * 2;
    const speed = 8 + Math.random() * 4;
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
    dieIndexCounter.current = 0;
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
    const totalStr = diceRef.current.length > 0 && Number.isFinite(sum) ? String(sum) : '—';
    setTotalDisplay(totalStr);
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
    updateResults();
    if (diceRef.current.length > 0) {
      setLastResult({ total: totalStr, duality: ds });
    }
    return { sum, totalStr, ds };
  }, [updateResults]);

  const addTerm = useCallback((sides: number, sign = 1, flavor: 'normal' | 'hope' | 'fear' = 'normal') => {
    const dieColor = (flavor === 'hope' || flavor === 'fear') ? null : activeColor;
    const newEq = rebuildEquation(equationRef.current, [{ sides, sign, flavor }]);
    setEquation(newEq);
    equationRef.current = newEq;
    const newBonus = parseEquation(newEq).constant;
    setBonus(String(newBonus));
    makeDie({ sides: (flavor === 'hope' || flavor === 'fear') ? 12 : sides, sign, flavor, color: dieColor });
    computeAndUpdateHUD();
  }, [makeDie, computeAndUpdateHUD, activeColor]);

  const rollFromEquation = useCallback(() => {
    const parsed = parseEquation(equationRef.current);
    const normalizedEq = buildEquationString(parsed.diceTerms, parsed.constant);
    setEquation(normalizedEq);
    equationRef.current = normalizedEq;
    setBonus(String(parsed.constant));
    clearDice();
    for (const t of parsed.diceTerms) {
      const dieColor = (t.flavor === 'hope' || t.flavor === 'fear') ? null : activeColor;
      makeDie({ sides: t.sides, sign: t.sign, flavor: t.flavor, color: dieColor });
    }
    const result = computeAndUpdateHUD();
    if (result && diceRef.current.length > 0) {
      const results: DieResult[] = diceRef.current.map(d => ({
        sides: d.sides, sign: d.sign, flavor: d.flavor, value: d.value, color: d.color, index: d.index,
      }));
      logRoll(normalizedEq, result.sum, results);
    }
  }, [clearDice, makeDie, computeAndUpdateHUD, activeColor, logRoll]);

  const handleClear = useCallback(() => {
    setEquation('');
    equationRef.current = '';
    setBonus('0');
    lastEdited.current = 'bonus';
    clearDice();
    setTotalDisplay('—');
    setDualityState('none');
    setHasDuality(false);
    setDieResults([]);
  }, [clearDice]);

  const handleClose = useCallback(() => {
    handleClear();
    setLastResult(null);
    setIsOpen(false);
  }, [handleClear]);

  const handleToggle = useCallback(() => {
    setIsOpen(o => !o);
  }, []);

  const handleEquationChange = useCallback((val: string) => {
    lastEdited.current = 'equation';
    setEquation(val);
    equationRef.current = val;
    const parsed = parseEquation(val);
    setBonus(String(parsed.constant));
  }, []);

  const handleBonusChange = useCallback((val: string) => {
    lastEdited.current = 'bonus';
    setBonus(val);
    const parsed = parseEquation(equationRef.current);
    const b = parseInt(val || '0', 10) || 0;
    const newEq = buildEquationString(parsed.diceTerms, b);
    setEquation(newEq);
    equationRef.current = newEq;
  }, []);

  const handleDuality = useCallback(() => {
    const newEq = rebuildEquation(equationRef.current, [
      { sides: 12, sign: 1, flavor: 'hope' },
      { sides: 12, sign: 1, flavor: 'fear' },
    ]);
    setEquation(newEq);
    equationRef.current = newEq;
    const newBonus = parseEquation(newEq).constant;
    setBonus(String(newBonus));
    makeDie({ sides: 12, sign: 1, flavor: 'hope', color: null });
    makeDie({ sides: 12, sign: 1, flavor: 'fear', color: null });
    computeAndUpdateHUD();
  }, [makeDie, computeAndUpdateHUD]);

  const rerollDie = useCallback((dieIndex: number) => {
    const die = diceRef.current.find(d => d.index === dieIndex);
    if (!die) return;
    die.value = randInt(1, die.sides);
    const angle = Math.random() * Math.PI * 2;
    Body.setVelocity(die.body, { x: Math.cos(angle) * 10, y: Math.sin(angle) * 10 });
    Body.setAngularVelocity(die.body, (Math.random() - 0.5) * 0.3);
    const result = computeAndUpdateHUD();
    if (result) {
      const results: DieResult[] = diceRef.current.map(d => ({
        sides: d.sides, sign: d.sign, flavor: d.flavor, value: d.value, color: d.color, index: d.index,
      }));
      logRoll(equationRef.current, result.sum, results);
    }
  }, [computeAndUpdateHUD, logRoll]);

  // Also log when dice are added via buttons (not just ROLL)
  const addTermAndLog = useCallback((sides: number, sign = 1, flavor: 'normal' | 'hope' | 'fear' = 'normal') => {
    addTerm(sides, sign, flavor);
    // Log after a brief delay to capture updated state
    setTimeout(() => {
      if (diceRef.current.length > 0) {
        const parsed = parseEquation(equationRef.current);
        let sum = parsed.constant;
        for (const d of diceRef.current) sum += d.value * d.sign;
        const results: DieResult[] = diceRef.current.map(d => ({
          sides: d.sides, sign: d.sign, flavor: d.flavor, value: d.value, color: d.color, index: d.index,
        }));
        logRoll(equationRef.current, sum, results);
      }
    }, 50);
  }, [addTerm, logRoll]);

  const handleDualityAndLog = useCallback(() => {
    handleDuality();
    setTimeout(() => {
      if (diceRef.current.length > 0) {
        const parsed = parseEquation(equationRef.current);
        let sum = parsed.constant;
        for (const d of diceRef.current) sum += d.value * d.sign;
        const results: DieResult[] = diceRef.current.map(d => ({
          sides: d.sides, sign: d.sign, flavor: d.flavor, value: d.value, color: d.color, index: d.index,
        }));
        logRoll(equationRef.current, sum, results);
      }
    }, 50);
  }, [handleDuality, logRoll]);

  // Physics engine - embedded in panel canvas
  useEffect(() => {
    if (!isOpen) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (engineRef.current) {
        // Don't clear dice on toggle close - state persists
        World.clear(engineRef.current.world, false);
        Engine.clear(engineRef.current);
        engineRef.current = null;
      }
      return;
    }

    const canvas = canvasRef.current;
    const container = canvasContainerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d', { alpha: true })!;

    const engine = Engine.create();
    engine.gravity.scale = 0;
    engineRef.current = engine;

    const MARGIN = 10, WALL_THICK = 50;

    function setupWalls() {
      const rect = container!.getBoundingClientRect();
      const W = rect.width;
      const H = rect.height;
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
      const rect = container!.getBoundingClientRect();
      const W = rect.width;
      const H = rect.height;
      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      canvas!.width = Math.floor(W * dpr);
      canvas!.height = Math.floor(H * dpr);
      canvas!.style.width = W + 'px';
      canvas!.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      setupWalls();
    }

    resize();
    const resizeObs = new ResizeObserver(resize);
    resizeObs.observe(container);

    const handleCanvasClick = (ev: PointerEvent) => {
      const r = canvas!.getBoundingClientRect();
      const p = { x: ev.clientX - r.left, y: ev.clientY - r.top };
      const hit = Query.point(diceRef.current.map(d => d.body), p)[0];
      if (hit) {
        const die = dieByBodyIdRef.current.get(hit.id);
        if (die) {
          die.value = randInt(1, die.sides);
          const angle = Math.random() * Math.PI * 2;
          Body.setVelocity(die.body, { x: Math.cos(angle) * 10, y: Math.sin(angle) * 10 });
          Body.setAngularVelocity(die.body, (Math.random() - 0.5) * 0.3);
          computeAndUpdateHUD();
        }
      }
    };
    canvas.addEventListener('pointerdown', handleCanvasClick);

    // Re-add existing dice bodies to the new engine
    for (const d of diceRef.current) {
      World.add(engine.world, d.body);
    }

    let last = performance.now();
    function tick(now: number) {
      const dt = Math.min(33, now - last);
      last = now;
      Engine.update(engine, dt);

      const rect = container!.getBoundingClientRect();
      const W = rect.width;
      const H = rect.height;

      for (const d of diceRef.current) {
        if (d.body.position.x < 0 || d.body.position.x > W || d.body.position.y < 0 || d.body.position.y > H) {
          Body.setPosition(d.body, { x: W / 2, y: H / 2 });
          Body.setVelocity(d.body, { x: 0, y: 0 });
        }
        if (Math.hypot(d.body.velocity.x, d.body.velocity.y) < 0.1 && Math.abs(d.body.angularVelocity) < 0.05) {
          Body.setVelocity(d.body, { x: 0, y: 0 });
          Body.setAngularVelocity(d.body, 0);
        }
      }

      ctx.clearRect(0, 0, W, H);

      // Subtle grid
      ctx.globalAlpha = 0.03;
      ctx.strokeStyle = '#00f5ff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= W; x += 40) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
      for (let y = 0; y <= H; y += 40) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
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
        ctx.lineWidth = 3;
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
        ctx.font = '700 14px "Orbitron", sans-serif';
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
      resizeObs.disconnect();
      canvas.removeEventListener('pointerdown', handleCanvasClick);
      // Don't clear dice - persist state
      if (engineRef.current) {
        World.clear(engine.world, false);
        Engine.clear(engine);
        engineRef.current = null;
      }
    };
  }, [isOpen, computeAndUpdateHUD]);

  const diceButtons = [
    { sides: 4, label: 'd4' }, { sides: 6, label: 'd6' }, { sides: 8, label: 'd8' },
    { sides: 10, label: 'd10' }, { sides: 12, label: 'd12' }, { sides: 20, label: 'd20' },
  ];
  const negDiceButtons = [
    { sides: 4, label: '-d4' }, { sides: 6, label: '-d6' }, { sides: 8, label: '-d8' },
    { sides: 10, label: '-d10' }, { sides: 12, label: '-d12' }, { sides: 20, label: '-d20' },
  ];

  if (shouldHide) return null;

  function getDieLabel(d: DieResult): string {
    if (d.flavor === 'hope') return 'H';
    if (d.flavor === 'fear') return 'F';
    const s = d.sides === 100 ? '%' : String(d.sides);
    return `d${s}`;
  }

  function getDieResultColor(d: DieResult): string | undefined {
    if (d.color) return d.color;
    return undefined; // default text color
  }

  return (
    <>
      <div
        className={`fixed top-0 right-0 h-full z-[9999] transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ width: 320 }}
      >
        <div className="h-full flex flex-col"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0)) , #0a0c12',
            borderLeft: '1px solid #141a2c',
            fontFamily: '"Orbitron", sans-serif',
            color: '#d6d9e6',
            letterSpacing: '1px',
          }}
        >
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-2 right-2 text-white/60 hover:text-white text-xl z-10"
            style={{ fontFamily: '"Orbitron", sans-serif' }}
          >
            ✕
          </button>

          {/* Controls section */}
          <div className="p-3 flex flex-col gap-2 pt-8 shrink-0">
            {/* Result display */}
            <div className="rounded-xl p-2 flex flex-col gap-1" style={{ background: '#070911', border: '1px solid #141a2c' }}>
              <div className="h-5 flex items-center">
                {hasDuality && (
                  <span
                    className={`font-black text-xs px-1.5 py-0.5 rounded ${
                      dualityState === 'hope' ? 'text-yellow-400' :
                      dualityState === 'fear' ? 'text-pink-500' :
                      dualityState === 'crit' ? 'text-white text-lg animate-pulse' : ''
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
              <div className="text-right text-3xl font-black text-white" style={{ textShadow: '0 0 20px rgba(0,245,255,0.2)' }}>
                {totalDisplay}
              </div>
            </div>

            {/* Individual dice results bar */}
            {dieResults.length > 0 && (
              <div className="flex flex-wrap gap-1 rounded-lg p-1.5" style={{ background: '#070911', border: '1px solid #141a2c' }}>
                {dieResults.map((d) => (
                  <button
                    key={d.index}
                    onClick={() => rerollDie(d.index)}
                    className="px-1.5 py-0.5 rounded text-xs font-bold hover:brightness-125 transition-all cursor-pointer"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: getDieResultColor(d) || (d.flavor === 'hope' ? '#ffd700' : d.flavor === 'fear' ? '#ff2a6d' : d.sign < 0 ? '#ff8a8a' : '#d6d9e6'),
                      fontFamily: '"Orbitron", sans-serif',
                    }}
                    title={`Click to reroll ${getDieLabel(d)}`}
                  >
                    {getDieLabel(d)}:{d.sign < 0 ? '-' : ''}{d.value}
                  </button>
                ))}
              </div>
            )}

            {/* Equation + bonus */}
            <div className="rounded-xl p-2 flex flex-col gap-1.5" style={{ background: '#070911', border: '1px solid #141a2c' }}>
              <input
                type="text"
                value={equation}
                onChange={e => handleEquationChange(e.target.value)}
                placeholder="Equation..."
                spellCheck={false}
                autoComplete="off"
                className="bg-transparent border-none text-xs w-full outline-none"
                style={{ color: '#d6d9e6', fontFamily: '"Orbitron", sans-serif' }}
              />
              <div className="flex items-center gap-2 text-xs uppercase" style={{ color: '#8b92b3' }}>
                <label className="text-[10px]">Bonus</label>
                <input
                  type="number"
                  value={bonus}
                  onChange={e => handleBonusChange(e.target.value)}
                  step={1}
                  className="w-12 text-center rounded-md py-0.5 text-white outline-none text-xs"
                  style={{ background: '#050711', border: '1px solid #141a2c', fontFamily: '"Orbitron", sans-serif' }}
                />
              </div>
              <div className="flex gap-1.5">
                <button onClick={handleClear} className="flex-1 h-7 rounded-md font-bold text-[10px] text-white uppercase"
                  style={{ background: '#0d1120', border: '1px solid rgba(255,255,255,0.1)', fontFamily: '"Orbitron", sans-serif' }}>
                  CLR
                </button>
                <button onClick={rollFromEquation} className="flex-1 h-7 rounded-md font-bold text-[10px] text-white uppercase"
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

            {/* Color picker */}
            <div className="flex items-center gap-1 px-1">
              <span className="text-[9px] uppercase mr-1" style={{ color: '#8b92b3' }}>Color</span>
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c.label}
                  onClick={() => setActiveColor(c.value)}
                  className="w-5 h-5 rounded-full border-2 transition-all"
                  style={{
                    background: c.css,
                    borderColor: activeColor === c.value ? '#fff' : 'rgba(255,255,255,0.15)',
                    boxShadow: activeColor === c.value ? '0 0 8px rgba(255,255,255,0.4)' : 'none',
                    transform: activeColor === c.value ? 'scale(1.2)' : 'scale(1)',
                  }}
                  title={c.label}
                />
              ))}
            </div>

            {/* Dice buttons - 4 rows */}
            <div className="grid grid-cols-4 gap-1">
              {diceButtons.map(d => (
                <button key={d.label} onClick={() => addTermAndLog(d.sides, 1)}
                  className="h-7 rounded-md text-[9px] font-bold"
                  style={chipStyle(activeColor ? 'custom' : undefined, activeColor)}>{d.label}</button>
              ))}
              {negDiceButtons.map(d => (
                <button key={d.label} onClick={() => addTermAndLog(d.sides, -1)}
                  className="h-7 rounded-md text-[9px] font-bold"
                  style={chipStyle('negative')}>{d.label}</button>
              ))}
              <button onClick={() => addTermAndLog(100, 1)} className="h-7 rounded-md text-[9px] font-bold" style={chipStyle(activeColor ? 'custom' : undefined, activeColor)}>d%</button>
              <button onClick={() => addTermAndLog(100, -1)} className="h-7 rounded-md text-[9px] font-bold" style={chipStyle('negative')}>-d%</button>
              <button onClick={() => addTermAndLog(12, 1, 'hope')} className="h-7 rounded-md text-[9px] font-black" style={chipStyle('hope')}>HOPE</button>
              <button onClick={() => addTermAndLog(12, 1, 'fear')} className="h-7 rounded-md text-[9px] font-black" style={chipStyle('fear')}>FEAR</button>
              <button onClick={handleDualityAndLog} className="h-7 rounded-md text-[9px] font-black text-white col-span-2" style={chipStyle('duality')}>DUAL</button>
              <div className="flex gap-0.5 col-span-2">
                <input type="number" value={customSides} onChange={e => setCustomSides(e.target.value)}
                  className="w-9 text-center rounded-md text-white text-[9px] outline-none"
                  style={{ background: '#050711', border: '1px solid #141a2c', fontFamily: '"Orbitron", sans-serif' }} />
                <button onClick={() => { const v = +customSides; if (v) addTermAndLog(Math.abs(v), v < 0 ? -1 : 1); }}
                  className="flex-1 h-7 rounded-md text-[9px] font-bold"
                  style={chipStyle(activeColor ? 'custom' : undefined, activeColor)}>Add</button>
              </div>
            </div>
          </div>

          {/* Canvas area - fills remaining space */}
          <div ref={canvasContainerRef} className="flex-1 min-h-0 relative" style={{ borderTop: '1px solid #141a2c' }}>
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full"
              style={{ pointerEvents: 'auto' }}
            />
          </div>
        </div>
      </div>

      {/* Tab */}
      <button
        onClick={handleToggle}
        className={`fixed z-[10000] flex flex-col items-center justify-center transition-all duration-300 ${
          isOpen ? 'right-[320px]' : 'right-0'
        }`}
        style={{
          top: '50%',
          transform: 'translateY(-50%)',
          width: 40,
          height: lastResult ? 140 : 120,
          background: 'linear-gradient(180deg, #0a0c12, #070911)',
          border: '1px solid #141a2c',
          borderRight: isOpen ? '1px solid #141a2c' : 'none',
          borderRadius: '8px 0 0 8px',
          fontFamily: '"Orbitron", sans-serif',
          color: '#d6d9e6',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 2,
          cursor: 'pointer',
          boxShadow: '-4px 0 15px rgba(0,0,0,0.4)',
          padding: '8px 0',
        }}
      >
        <span style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>🎲 DICE</span>
        {lastResult && (
          <div className="mt-1 flex flex-col items-center gap-0.5">
            <span className="text-[10px] font-black" style={{
              color: lastResult.duality === 'hope' ? '#ffd700' :
                     lastResult.duality === 'fear' ? '#ff2a6d' :
                     lastResult.duality === 'crit' ? '#fff' : '#00f5ff',
              textShadow: lastResult.duality === 'crit' ? '0 0 6px #ffd700' : 'none',
            }}>
              {lastResult.total}
            </span>
            {lastResult.duality !== 'none' && (
              <span className="text-[8px]" style={{
                color: lastResult.duality === 'hope' ? '#ffd700' :
                       lastResult.duality === 'fear' ? '#ff2a6d' : '#fff',
              }}>
                {lastResult.duality === 'hope' ? 'H' : lastResult.duality === 'fear' ? 'F' : 'C'}
              </span>
            )}
          </div>
        )}
      </button>
    </>
  );
};

function chipStyle(variant?: string, customColor?: string | null): React.CSSProperties {
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
  if (variant === 'custom' && customColor) return { ...base, color: customColor, borderColor: customColor + '80' };
  return base;
}

export default DiceRollerRibbon;
