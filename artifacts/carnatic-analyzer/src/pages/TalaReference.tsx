import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
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
        const isSam = cell.globalIdx === 0; // sam (first beat)
        return (
          <motion.div
            key={cell.globalIdx}
            animate={
              isActive
                ? { scale: 1.2, backgroundColor: "hsl(var(--primary))" }
                : { scale: 1, backgroundColor: isSam ? "hsl(var(--primary) / 0.2)" : "hsl(var(--muted))" }
            }
            transition={{ duration: 0.08 }}
            className={[
              "w-8 h-8 rounded-md flex items-center justify-center text-xs font-mono font-semibold",
              isSam ? "ring-1 ring-primary/50" : "",
              cell.beatIdx === 0 && cell.angaIdx > 0 ? "ml-2" : "",
            ].join(" ")}
            style={{
              color: isActive ? "hsl(var(--primary-foreground))" : isSam ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
            }}
          >
            {cell.globalIdx + 1}
          </motion.div>
        );
      })}
    </div>
  );
}

function MetronomeCard({ tala, jaatiIdx = 1 }: { tala: Tala; jaatiIdx?: number }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(60);
  const [currentBeat, setCurrentBeat] = useState(-1);
  const [selectedJaati, setSelectedJaati] = useState<Jaati>(
    (["tisra", "chatusra", "khanda", "misra", "sankirna"] as Jaati[])[jaatiIdx]
  );
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const beatRef = useRef(0);

  const variant = tala.variants.find((v) => v.jaati === selectedJaati)!;
  const total = variant.totalAksharas;

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isPlaying) {
      beatRef.current = 0;
      setCurrentBeat(0);
      intervalRef.current = setInterval(() => {
        beatRef.current = (beatRef.current + 1) % total;
        setCurrentBeat(beatRef.current);
      }, (60 / bpm) * 1000);
    } else {
      clearTimer();
      setCurrentBeat(-1);
    }
    return clearTimer;
  }, [isPlaying, bpm, total, clearTimer]);

  const reset = () => {
    clearTimer();
    setIsPlaying(false);
    beatRef.current = 0;
    setCurrentBeat(-1);
  };

  const jaatis: Jaati[] = ["tisra", "chatusra", "khanda", "misra", "sankirna"];

  return (
    <div className="bg-card border border-card-border rounded-xl p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-foreground">{tala.name} Tala</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{tala.description}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
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
        <div className="flex gap-3 mt-2">
          {variant.angaSequence.map((a, i) => (
            <div key={i} className="text-xs text-muted-foreground">
              <span className="font-mono">{ANGA_SYMBOLS[a]}</span> = {ANGA_NAMES[a]} ({variant.aksharaPattern[i]})
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 pt-1">
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
        <div className="flex items-center gap-2 flex-1">
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

export default function TalaReference() {
  const [expandedSection, setExpandedSection] = useState<string | null>("common");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Tala Reference</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Interactive reference for the Suladi Sapta Talas with beat visualizer
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
          {TALAS.map((tala, i) => (
            <MetronomeCard key={tala.name} tala={tala} jaatiIdx={1} />
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
