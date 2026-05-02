import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, RotateCcw, ChevronDown, ChevronUp, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  TALAS,
  COMMON_TALAS,
  ANGA_NAMES,
  ANGA_SYMBOLS,
  JAATI_NAMES,
  JAATI_COUNTS,
  type Tala,
  type Jaati,
} from "@/data/talas";

// ── Audio click synthesis ──────────────────────────────────────────────────────

type ClickType = "sam" | "anga" | "beat";

function playClick(ctx: AudioContext, type: ClickType, volume: number): void {
  const now = ctx.currentTime;

  if (type === "sam") {
    // Sam: loud pitched click + short noise burst — unmistakable
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(900, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.06);
    gain.gain.setValueAtTime(volume * 0.8, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.09);

    // Extra body with sine
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(220, now);
    gain2.gain.setValueAtTime(volume * 0.4, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now);
    osc2.stop(now + 0.13);
  } else if (type === "anga") {
    // Anga start: medium wood-block-like click
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.04);
    gain.gain.setValueAtTime(volume * 0.55, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.07);
  } else {
    // Regular beat: soft low click
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(380, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.03);
    gain.gain.setValueAtTime(volume * 0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.05);
  }
}

/** Given the flat beat index and the anga pattern, return the click type. */
function getClickType(globalBeat: number, aksharaPattern: number[]): ClickType {
  if (globalBeat === 0) return "sam";
  let acc = 0;
  for (const count of aksharaPattern) {
    if (globalBeat === acc) return "anga";
    acc += count;
    if (globalBeat < acc) return "beat";
  }
  return "beat";
}

// ── Beat visualizer ────────────────────────────────────────────────────────────

function BeatVisualizer({
  pattern,
  currentBeat,
  isPlaying,
}: {
  pattern: number[];
  currentBeat: number;
  isPlaying: boolean;
}) {
  let globalIdx = 0;
  const cells: { angaIdx: number; beatIdx: number; globalIdx: number }[] = [];
  pattern.forEach((count, angaIdx) => {
    for (let b = 0; b < count; b++) {
      cells.push({ angaIdx, beatIdx: b, globalIdx: globalIdx++ });
    }
  });
  const total = cells.length;

  return (
    <div className="flex flex-wrap gap-1.5" data-testid="beat-visualizer">
      {cells.map((cell) => {
        const isActive = isPlaying && cell.globalIdx === currentBeat % total;
        const isSam = cell.globalIdx === 0;
        const isAngaStart = cell.beatIdx === 0 && cell.angaIdx > 0;
        return (
          <motion.div
            key={cell.globalIdx}
            animate={
              isActive
                ? {
                    scale: isSam ? 1.3 : isAngaStart ? 1.2 : 1.1,
                    backgroundColor: isSam
                      ? "hsl(var(--primary))"
                      : isAngaStart
                      ? "hsl(var(--primary) / 0.75)"
                      : "hsl(var(--primary) / 0.55)",
                  }
                : {
                    scale: 1,
                    backgroundColor: isSam
                      ? "hsl(var(--primary) / 0.18)"
                      : "hsl(var(--muted))",
                  }
            }
            transition={{ duration: 0.07 }}
            className={[
              "w-8 h-8 rounded-md flex items-center justify-center text-xs font-mono font-semibold",
              isSam ? "ring-1 ring-primary/50" : "",
              isAngaStart ? "ml-2" : "",
            ].join(" ")}
            style={{
              color: isActive
                ? "hsl(var(--primary-foreground))"
                : isSam
                ? "hsl(var(--primary))"
                : "hsl(var(--muted-foreground))",
            }}
          >
            {cell.globalIdx + 1}
          </motion.div>
        );
      })}
    </div>
  );
}

// ── Metronome card ─────────────────────────────────────────────────────────────

function MetronomeCard({ tala }: { tala: Tala }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(60);
  const [currentBeat, setCurrentBeat] = useState(-1);
  const [muted, setMuted] = useState(false);
  const [selectedJaati, setSelectedJaati] = useState<Jaati>("chatusra");

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const beatRef = useRef(0);
  const mutedRef = useRef(false);
  mutedRef.current = muted;

  const variant = tala.variants.find((v) => v.jaati === selectedJaati)!;
  const total = variant.totalAksharas;

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const getOrCreateAudioCtx = useCallback(() => {
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      audioCtxRef.current = new AudioContext();
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  useEffect(() => {
    if (isPlaying) {
      const ctx = getOrCreateAudioCtx();
      beatRef.current = 0;
      setCurrentBeat(0);

      // Play the first click immediately
      if (!mutedRef.current) {
        playClick(ctx, "sam", 0.8);
      }

      intervalRef.current = setInterval(() => {
        beatRef.current = (beatRef.current + 1) % total;
        const beat = beatRef.current;
        setCurrentBeat(beat);

        if (!mutedRef.current) {
          const freshCtx = getOrCreateAudioCtx();
          const clickType = getClickType(beat, variant.aksharaPattern);
          playClick(freshCtx, clickType, 0.8);
        }
      }, (60 / bpm) * 1000);
    } else {
      clearTimer();
      setCurrentBeat(-1);
    }
    return clearTimer;
  }, [isPlaying, bpm, total, variant.aksharaPattern, clearTimer, getOrCreateAudioCtx]);

  const reset = useCallback(() => {
    clearTimer();
    setIsPlaying(false);
    beatRef.current = 0;
    setCurrentBeat(-1);
  }, [clearTimer]);

  const jaatis: Jaati[] = ["tisra", "chatusra", "khanda", "misra", "sankirna"];

  return (
    <div className="bg-card border border-card-border rounded-xl p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-foreground">{tala.name} Tala</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{tala.description}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {tala.angaStructure.map((a, i) => (
            <span key={i} className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded text-foreground">
              {ANGA_SYMBOLS[a]}
            </span>
          ))}
        </div>
      </div>

      {/* Jaati selector */}
      <div className="flex gap-1.5 flex-wrap">
        {jaatis.map((j) => {
          const v = tala.variants.find((x) => x.jaati === j)!;
          return (
            <button
              key={j}
              data-testid={`jaati-${tala.name}-${j}`}
              onClick={() => { setSelectedJaati(j); reset(); }}
              className={[
                "px-2.5 py-1 rounded-md text-xs font-medium transition-colors border",
                selectedJaati === j
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-primary/30",
              ].join(" ")}
            >
              {JAATI_NAMES[j]} ({v.totalAksharas})
            </button>
          );
        })}
      </div>

      {/* Beat pattern */}
      <div>
        <div className="text-xs text-muted-foreground mb-2 uppercase tracking-wider font-medium">
          Beat Pattern — {variant.totalAksharas} aksharas
        </div>
        <BeatVisualizer
          pattern={variant.aksharaPattern}
          currentBeat={currentBeat}
          isPlaying={isPlaying}
        />
        <div className="flex gap-3 mt-2 flex-wrap">
          {variant.angaSequence.map((a, i) => (
            <div key={i} className="text-xs text-muted-foreground">
              <span className="font-mono">{ANGA_SYMBOLS[a]}</span> = {ANGA_NAMES[a]} ({variant.aksharaPattern[i]})
            </div>
          ))}
        </div>
      </div>

      {/* Click legend */}
      {isPlaying && (
        <div className="flex gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-primary" /> Sam
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-primary/70" /> Anga start
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-primary/50" /> Beat
          </span>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-2 pt-1 flex-wrap">
        <Button
          size="sm"
          variant={isPlaying ? "secondary" : "default"}
          onClick={() => setIsPlaying((p) => !p)}
          data-testid={`play-${tala.name}`}
          className="gap-1.5"
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          {isPlaying ? "Pause" : "Play"}
        </Button>

        <Button
          size="sm"
          variant="ghost"
          onClick={reset}
          data-testid={`reset-${tala.name}`}
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </Button>

        <Button
          size="sm"
          variant="ghost"
          onClick={() => setMuted((m) => !m)}
          data-testid={`mute-${tala.name}`}
          className={muted ? "text-muted-foreground" : "text-foreground"}
          title={muted ? "Unmute" : "Mute"}
        >
          {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
        </Button>

        <div className="flex items-center gap-2 flex-1 min-w-32">
          <span className="text-xs text-muted-foreground shrink-0">{bpm} BPM</span>
          <Slider
            min={30}
            max={200}
            step={5}
            value={[bpm]}
            onValueChange={([v]) => { setBpm(v); reset(); }}
            className="flex-1"
            data-testid={`bpm-${tala.name}`}
          />
        </div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function TalaReference() {
  const [expandedSection, setExpandedSection] = useState<string | null>("common");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Tala Reference</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Interactive metronome for the Suladi Sapta Talas — distinct clicks for Sam, anga starts, and beats
        </p>
      </div>

      {/* Common Talas Quick Reference */}
      <div className="bg-card border border-card-border rounded-xl overflow-hidden">
        <button
          className="w-full flex items-center justify-between p-4 hover:bg-muted/20 transition-colors"
          onClick={() => setExpandedSection(expandedSection === "common" ? null : "common")}
          data-testid="common-talas-toggle"
        >
          <h2 className="font-semibold text-foreground">Common Talas Quick Reference</h2>
          {expandedSection === "common" ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
        <AnimatePresence>
          {expandedSection === "common" && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-border"
            >
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {COMMON_TALAS.map((ct) => (
                  <div
                    key={ct.name}
                    data-testid={`common-tala-${ct.name.replace(/\s+/g, "-").toLowerCase()}`}
                    className="bg-muted/40 rounded-lg p-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm">{ct.name}</span>
                      <Badge variant="outline" className="text-xs font-mono">{ct.beats} beats</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{ct.description}</p>
                    <div className="text-xs text-primary/70 mt-1">{ct.tala} — {JAATI_NAMES[ct.jaati]} jaati</div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Anga Guide */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { sym: "I", name: "Laghu", desc: "Variable length based on jaati. Marked with a finger count." },
          { sym: "O", name: "Drutam", desc: "Always 2 aksharas. Clap + wave." },
          { sym: "U", name: "Anudrutam", desc: "Always 1 akshara. Single clap." },
        ].map((a) => (
          <div key={a.name} className="bg-card border border-card-border rounded-xl p-4 text-center">
            <div className="text-2xl font-mono font-bold text-primary mb-1">{a.sym}</div>
            <div className="text-sm font-semibold">{a.name}</div>
            <div className="text-xs text-muted-foreground mt-1">{a.desc}</div>
          </div>
        ))}
      </div>

      {/* Interactive Tala Cards */}
      <div>
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
          Interactive Tala Metronome
        </h2>
        <div className="space-y-4">
          {TALAS.map((tala) => (
            <MetronomeCard key={tala.name} tala={tala} />
          ))}
        </div>
      </div>

      {/* Jaati reference table */}
      <div className="bg-card border border-card-border rounded-xl p-5">
        <h2 className="font-semibold text-foreground mb-4">Jaati Reference</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="jaati-table">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 pr-4 text-xs text-muted-foreground font-medium uppercase tracking-wider">Jaati</th>
                <th className="text-left py-2 pr-4 text-xs text-muted-foreground font-medium uppercase tracking-wider">Laghu Aksharas</th>
                <th className="text-left py-2 text-xs text-muted-foreground font-medium uppercase tracking-wider">Adi (Triputa Chatusra)</th>
              </tr>
            </thead>
            <tbody>
              {(["tisra", "chatusra", "khanda", "misra", "sankirna"] as Jaati[]).map((j) => (
                <tr key={j} className="border-b border-border/50 last:border-0">
                  <td className="py-2 pr-4 font-medium">{JAATI_NAMES[j]}</td>
                  <td className="py-2 pr-4 font-mono text-muted-foreground">{JAATI_COUNTS[j]}</td>
                  <td className="py-2 text-muted-foreground">{JAATI_COUNTS[j] + 2 + 2} beats</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
