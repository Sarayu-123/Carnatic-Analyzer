import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Square, Music2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SA_FREQUENCIES, type SwaraNote } from "@/lib/pitch-detection";
import { GAMAKAS, GAMAKA_CATEGORIES, type Gamaka } from "@/data/gamakas";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ── Pitch contour SVG ──────────────────────────────────────────────────────────

function PitchContour({ gamaka, isPlaying, progress }: {
  gamaka: Gamaka;
  isPlaying: boolean;
  progress: number; // 0–1
}) {
  const W = 280;
  const H = 72;
  const PAD = { x: 8, y: 12 };
  const innerW = W - PAD.x * 2;
  const innerH = H - PAD.y * 2;

  const allF = gamaka.contour.map((p) => p.f);
  const minF = Math.min(...allF) - 0.3;
  const maxF = Math.max(...allF) + 0.3;
  const range = Math.max(maxF - minF, 1.5);

  const px = (t: number) => PAD.x + t * innerW;
  const py = (f: number) => PAD.y + innerH - ((f - minF) / range) * innerH;

  const pts = gamaka.contour;
  const path = pts
    .map((p, i) => `${i === 0 ? "M" : "L"}${px(p.t).toFixed(1)},${py(p.f).toFixed(1)}`)
    .join(" ");

  // progress needle x
  const needleX = PAD.x + progress * innerW;
  // baseline y (f=0)
  const baseY = py(0);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={W}
      height={H}
      className="w-full"
      style={{ maxWidth: W }}
    >
      {/* Baseline (the target note) */}
      <line
        x1={PAD.x} y1={baseY} x2={W - PAD.x} y2={baseY}
        stroke="hsl(var(--border))" strokeWidth={1} strokeDasharray="3 3"
      />

      {/* Semitone grid lines */}
      {[-2, -1, 1, 2].map((s) => {
        if (s < minF || s > maxF) return null;
        const y = py(s);
        return (
          <line key={s} x1={PAD.x} y1={y} x2={W - PAD.x} y2={y}
            stroke="hsl(var(--border))" strokeWidth={0.5} opacity={0.5} />
        );
      })}

      {/* Filled area under curve */}
      <path
        d={`${path} L${px(1).toFixed(1)},${baseY.toFixed(1)} L${px(0).toFixed(1)},${baseY.toFixed(1)} Z`}
        fill="hsl(var(--primary))"
        fillOpacity={0.08}
      />

      {/* Main pitch curve */}
      <path
        d={path}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Playback needle */}
      {isPlaying && (
        <line
          x1={needleX} y1={PAD.y - 4} x2={needleX} y2={H - PAD.y + 4}
          stroke="hsl(var(--primary))"
          strokeWidth={1.5}
          opacity={0.8}
        />
      )}

      {/* Labels */}
      <text x={PAD.x + 2} y={baseY - 4} fontSize={9} fill="hsl(var(--muted-foreground))" fontFamily="monospace">
        0¢
      </text>
    </svg>
  );
}

// ── Audio synthesis ────────────────────────────────────────────────────────────

function synthesizeGamaka(
  ctx: AudioContext,
  gamaka: Gamaka,
  baseFreq: number,
): void {
  const dur = gamaka.durationMs / 1000;
  const now = ctx.currentTime + 0.02;

  const osc = ctx.createOscillator();
  osc.type = "triangle";

  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(2800, now);

  // Envelope
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(0.5, now + 0.015);
  gain.gain.setValueAtTime(0.45, now + dur - 0.12);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

  // Build frequency automation from contour
  gamaka.contour.forEach((pt) => {
    const t = now + pt.t * dur;
    const freq = baseFreq * Math.pow(2, pt.f / 12);
    if (pt.t === 0) {
      osc.frequency.setValueAtTime(freq, t);
    } else {
      osc.frequency.linearRampToValueAtTime(freq, t);
    }
  });

  // Harmonic overtone
  const osc2 = ctx.createOscillator();
  osc2.type = "sine";
  const gain2 = ctx.createGain();
  gain2.gain.setValueAtTime(0.1, now);
  gain2.gain.exponentialRampToValueAtTime(0.0001, now + dur * 0.6);
  gamaka.contour.forEach((pt) => {
    const t = now + pt.t * dur;
    const freq = baseFreq * 2 * Math.pow(2, pt.f / 12);
    if (pt.t === 0) osc2.frequency.setValueAtTime(freq, t);
    else osc2.frequency.linearRampToValueAtTime(freq, t);
  });

  osc.connect(gain);
  osc2.connect(gain2);
  gain.connect(filter);
  gain2.connect(filter);
  filter.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + dur + 0.05);
  osc2.start(now);
  osc2.stop(now + dur + 0.05);
}

// ── Gamaka Card ────────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<Gamaka["category"], string> = {
  oscillation: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  slide:       "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  deflection:  "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  touch:       "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  sustained:   "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
};

function GamakaCard({
  gamaka,
  saFreq,
  isPlaying,
  onPlay,
  onStop,
  progress,
}: {
  gamaka: Gamaka;
  saFreq: number;
  isPlaying: boolean;
  onPlay: () => void;
  onStop: () => void;
  progress: number;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      layout
      className={[
        "bg-card border rounded-2xl overflow-hidden transition-shadow",
        isPlaying ? "border-primary/50 shadow-md" : "border-card-border",
      ].join(" ")}
    >
      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-lg tracking-tight">{gamaka.name}</h3>
              {gamaka.tamil && (
                <span className="text-sm text-muted-foreground">{gamaka.tamil}</span>
              )}
              <span className={["text-xs px-2 py-0.5 rounded-full font-medium", CATEGORY_COLORS[gamaka.category]].join(" ")}>
                {gamaka.englishName}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              {gamaka.description}
            </p>
          </div>

          {/* Play button */}
          <Button
            size="icon"
            variant={isPlaying ? "default" : "outline"}
            onClick={isPlaying ? onStop : onPlay}
            data-testid={`play-gamaka-${gamaka.id}`}
            className="shrink-0 w-10 h-10 rounded-full"
          >
            {isPlaying ? (
              <Square className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4 ml-0.5" />
            )}
          </Button>
        </div>

        {/* Pitch contour */}
        <div className="bg-muted/30 rounded-xl px-3 py-2">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
            Pitch contour
          </div>
          <PitchContour gamaka={gamaka} isPlaying={isPlaying} progress={progress} />
        </div>

        {/* Technical detail toggle */}
        <button
          className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          onClick={() => setExpanded((e) => !e)}
          data-testid={`expand-gamaka-${gamaka.id}`}
        >
          {expanded ? "Hide details" : "Show technical detail + raga examples"}
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="space-y-3 overflow-hidden"
            >
              {/* Technical */}
              <div className="bg-muted/40 rounded-xl p-3 text-xs text-muted-foreground leading-relaxed">
                <span className="font-semibold text-foreground block mb-0.5">Technical</span>
                {gamaka.technicalDescription}
              </div>

              {/* Raga examples */}
              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Raga examples
                </div>
                <div className="space-y-1.5">
                  {gamaka.ragaExamples.map((ex) => (
                    <div key={ex.raga} className="flex items-start gap-2 text-sm">
                      <Music2 className="w-3.5 h-3.5 text-primary/70 mt-0.5 shrink-0" />
                      <span>
                        <span className="font-medium">{ex.raga}</span>
                        <span className="text-muted-foreground"> — {ex.context}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function GamakaExplorer() {
  const [saKey, setSaKey] = useState("C3");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const progressRafRef = useRef<number | null>(null);
  const playStartRef = useRef<number>(0);
  const playDurRef = useRef<number>(0);
  const stopToRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saFreq = SA_FREQUENCIES.find((s) => s.label === saKey)?.freq ?? 130.81;
  // Use Pa (7 semitones above Sa) as the demo note — most gamakas are shown on a mid-register note
  const demoFreq = saFreq * Math.pow(2, 7 / 12);

  const stopAll = useCallback(() => {
    if (progressRafRef.current) cancelAnimationFrame(progressRafRef.current);
    if (stopToRef.current) clearTimeout(stopToRef.current);
    setPlayingId(null);
    setProgress(0);
  }, []);

  const playGamaka = useCallback((gamaka: Gamaka) => {
    stopAll();

    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      audioCtxRef.current = new AudioContext();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === "suspended") ctx.resume();

    synthesizeGamaka(ctx, gamaka, demoFreq);

    const dur = gamaka.durationMs;
    playStartRef.current = performance.now();
    playDurRef.current = dur;
    setPlayingId(gamaka.id);
    setProgress(0);

    const tick = () => {
      const elapsed = performance.now() - playStartRef.current;
      const p = Math.min(elapsed / playDurRef.current, 1);
      setProgress(p);
      if (p < 1) {
        progressRafRef.current = requestAnimationFrame(tick);
      }
    };
    progressRafRef.current = requestAnimationFrame(tick);

    stopToRef.current = setTimeout(() => {
      setPlayingId(null);
      setProgress(0);
    }, dur + 80);
  }, [demoFreq, stopAll]);

  const filtered = categoryFilter === "all"
    ? GAMAKAS
    : GAMAKAS.filter((g) => g.category === categoryFilter);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Gamaka Explorer</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Interactive audio demonstrations of Carnatic ornaments — each shown on Pa in the selected key
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1.5 flex-wrap flex-1">
          {GAMAKA_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              data-testid={`filter-${cat.id}`}
              onClick={() => setCategoryFilter(cat.id)}
              className={[
                "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                categoryFilter === cat.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-primary/30",
              ].join(" ")}
            >
              {cat.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground shrink-0">Sa =</span>
          <Select value={saKey} onValueChange={(v) => { setSaKey(v); stopAll(); }}>
            <SelectTrigger className="w-28 h-8 text-xs" data-testid="gamaka-sa-key">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SA_FREQUENCIES.map((s) => (
                <SelectItem key={s.label} value={s.label}>
                  {s.label} ({Math.round(s.freq)} Hz)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Intro note */}
      <div className="bg-muted/40 rounded-xl px-4 py-3 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">How to use:</span> Press the play button on any card to hear the ornament performed on Pa. The pitch contour diagram shows exactly how the frequency moves over time. Expand a card to see its technical details and which ragas use it prominently.
      </div>

      {/* Gamaka grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <AnimatePresence initial={false}>
          {filtered.map((gamaka) => (
            <motion.div
              key={gamaka.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97 }}
              layout
            >
              <GamakaCard
                gamaka={gamaka}
                saFreq={saFreq}
                isPlaying={playingId === gamaka.id}
                onPlay={() => playGamaka(gamaka)}
                onStop={stopAll}
                progress={playingId === gamaka.id ? progress : 0}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Reference table */}
      <div className="bg-card border border-card-border rounded-xl p-5">
        <h2 className="font-semibold mb-4">Quick Reference</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="gamaka-reference-table">
            <thead>
              <tr className="border-b border-border text-left">
                {["Name", "Type", "Direction", "Depth"].map((h) => (
                  <th key={h} className="text-xs text-muted-foreground font-medium uppercase tracking-wider pb-2 pr-4">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {GAMAKAS.map((g) => (
                <tr key={g.id} className="border-b border-border/40 last:border-0">
                  <td className="py-2 pr-4 font-medium">{g.name}</td>
                  <td className="py-2 pr-4 capitalize">
                    <span className={["text-xs px-1.5 py-0.5 rounded-full", CATEGORY_COLORS[g.category]].join(" ")}>
                      {g.category}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-muted-foreground text-xs">
                    {g.contour[0].f > 0 ? "Descends to note" :
                     g.contour[0].f < 0 ? "Rises to note" :
                     g.contour.some(p => p.f > 0) ? "Touches above" :
                     g.contour.some(p => p.f < 0) ? "Oscillates below" : "Sustained"}
                  </td>
                  <td className="py-2 text-muted-foreground text-xs font-mono">
                    {Math.max(...g.contour.map(p => Math.abs(p.f))).toFixed(1)} semi
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
