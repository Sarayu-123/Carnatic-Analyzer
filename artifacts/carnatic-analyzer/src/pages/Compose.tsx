import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Square, Trash2, ChevronUp, ChevronDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SA_FREQUENCIES, type SwaraNote } from "@/lib/pitch-detection";
import { playNote, swaraToFreq, type SynthNote } from "@/lib/synth";
import { SWARA_LABELS } from "@/data/ragas";

let idCounter = 0;
function nextId() { return String(++idCounter); }

const SWARA_GROUPS: { label: string; swaras: SwaraNote[] }[] = [
  { label: "Sa", swaras: ["S"] },
  { label: "Ri", swaras: ["R1", "R2", "R3"] },
  { label: "Ga", swaras: ["G1", "G2", "G3"] },
  { label: "Ma", swaras: ["M1", "M2"] },
  { label: "Pa", swaras: ["P"] },
  { label: "Da", swaras: ["D1", "D2", "D3"] },
  { label: "Ni", swaras: ["N1", "N2", "N3"] },
];

const DURATION_OPTIONS = [
  { value: 0.25, label: "¼" },
  { value: 0.5,  label: "½" },
  { value: 1,    label: "1" },
  { value: 1.5,  label: "1½" },
  { value: 2,    label: "2" },
];

function NoteChip({
  note,
  isActive,
  onRemove,
  onOctaveChange,
  onDurationChange,
}: {
  note: SynthNote;
  isActive: boolean;
  onRemove: () => void;
  onOctaveChange: (delta: number) => void;
  onDurationChange: (dur: number) => void;
}) {
  const [open, setOpen] = useState(false);

  const octaveLabel =
    note.octave === 0 ? "" : note.octave > 0 ? `+${note.octave}` : `${note.octave}`;

  return (
    <div className="relative group">
      <motion.div
        animate={
          isActive
            ? { scale: 1.12, boxShadow: "0 0 0 2px hsl(var(--primary))" }
            : { scale: 1, boxShadow: "none" }
        }
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className={[
          "flex flex-col items-center rounded-xl border cursor-pointer select-none transition-colors",
          isActive
            ? "bg-primary text-primary-foreground border-primary"
            : "bg-card text-foreground border-card-border hover:border-primary/40",
        ].join(" ")}
        style={{ minWidth: 52, padding: "6px 8px" }}
        onClick={() => setOpen((o) => !o)}
        data-testid={`note-chip-${note.id}`}
      >
        <span className="text-xs font-bold leading-none">{SWARA_LABELS[note.swara]}</span>
        {octaveLabel && (
          <span className="text-[9px] leading-none mt-0.5 opacity-70">{octaveLabel}</span>
        )}
        <span className={["text-[9px] leading-none mt-0.5", isActive ? "opacity-80" : "opacity-50"].join(" ")}>
          {DURATION_OPTIONS.find((d) => d.value === note.duration)?.label ?? note.duration}
        </span>
      </motion.div>

      {/* Popover controls */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.95 }}
            transition={{ duration: 0.12 }}
            className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-20 bg-popover border border-popover-border rounded-xl shadow-lg p-3 space-y-2 min-w-36"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Octave */}
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Octave</div>
              <div className="flex items-center gap-1">
                <button
                  className="w-6 h-6 rounded flex items-center justify-center bg-muted hover:bg-muted/80 transition-colors"
                  onClick={() => onOctaveChange(-1)}
                  disabled={note.octave <= -1}
                  data-testid={`octave-down-${note.id}`}
                >
                  <ChevronDown className="w-3 h-3" />
                </button>
                <span className="flex-1 text-center text-sm font-medium">
                  {note.octave === 0 ? "Middle" : note.octave > 0 ? `+${note.octave}` : note.octave}
                </span>
                <button
                  className="w-6 h-6 rounded flex items-center justify-center bg-muted hover:bg-muted/80 transition-colors"
                  onClick={() => onOctaveChange(1)}
                  disabled={note.octave >= 1}
                  data-testid={`octave-up-${note.id}`}
                >
                  <ChevronUp className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Duration */}
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Duration (beats)</div>
              <div className="flex gap-1 flex-wrap">
                {DURATION_OPTIONS.map((d) => (
                  <button
                    key={d.value}
                    onClick={() => onDurationChange(d.value)}
                    className={[
                      "px-2 py-1 rounded text-xs font-medium border transition-colors",
                      note.duration === d.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border hover:border-primary/40",
                    ].join(" ")}
                    data-testid={`duration-${d.value}-${note.id}`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => { onRemove(); setOpen(false); }}
              className="w-full flex items-center justify-center gap-1.5 text-xs text-destructive hover:bg-destructive/10 rounded-md py-1 transition-colors"
              data-testid={`remove-note-${note.id}`}
            >
              <Trash2 className="w-3 h-3" />
              Remove
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Compose() {
  const [notes, setNotes] = useState<SynthNote[]>([]);
  const [saKey, setSaKey] = useState("C3");
  const [bpm, setBpm] = useState(80);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const saFreq = SA_FREQUENCIES.find((s) => s.label === saKey)?.freq ?? 130.81;

  const stopPlayback = useCallback(() => {
    for (const t of timeoutsRef.current) clearTimeout(t);
    timeoutsRef.current = [];
    setIsPlaying(false);
    setActiveIndex(null);
  }, []);

  const startPlayback = useCallback(() => {
    if (notes.length === 0) return;
    stopPlayback();

    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      audioCtxRef.current = new AudioContext();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === "suspended") ctx.resume();

    const beatDuration = 60 / bpm; // seconds per beat
    let t = ctx.currentTime + 0.05; // small buffer
    const newTimeouts: ReturnType<typeof setTimeout>[] = [];

    setIsPlaying(true);
    setActiveIndex(0);

    notes.forEach((note, i) => {
      const freq = swaraToFreq(note.swara, saFreq, note.octave);
      const noteDur = beatDuration * note.duration;
      playNote(ctx, freq, t, noteDur * 0.92, 0.55);

      // Schedule the visual highlight
      const msFromNow = (t - ctx.currentTime) * 1000;
      const to1 = setTimeout(() => setActiveIndex(i), msFromNow);
      newTimeouts.push(to1);

      t += noteDur;
    });

    // Schedule end of playback
    const endMs = (t - ctx.currentTime) * 1000;
    const endTo = setTimeout(() => {
      setIsPlaying(false);
      setActiveIndex(null);
    }, endMs);
    newTimeouts.push(endTo);
    timeoutsRef.current = newTimeouts;
  }, [notes, bpm, saFreq, stopPlayback]);

  useEffect(() => () => stopPlayback(), [stopPlayback]);

  const addNote = (swara: SwaraNote) => {
    setNotes((prev) => [...prev, { id: nextId(), swara, octave: 0, duration: 1 }]);
  };

  const removeNote = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    if (isPlaying) stopPlayback();
  };

  const updateNote = (id: string, patch: Partial<SynthNote>) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)));
    if (isPlaying) stopPlayback();
  };

  const clearAll = () => {
    stopPlayback();
    setNotes([]);
  };

  const totalBeats = notes.reduce((s, n) => s + n.duration, 0);
  const totalSeconds = (60 / bpm) * totalBeats;

  // Preset phrases
  const PRESETS: { label: string; notes: Omit<SynthNote, "id">[] }[] = [
    {
      label: "Hamsadhwani arohana",
      notes: [
        { swara: "S", octave: 0, duration: 1 },
        { swara: "R2", octave: 0, duration: 1 },
        { swara: "G3", octave: 0, duration: 1 },
        { swara: "P", octave: 0, duration: 1 },
        { swara: "N3", octave: 0, duration: 1 },
        { swara: "S", octave: 1, duration: 2 },
      ],
    },
    {
      label: "Mohanam arohana",
      notes: [
        { swara: "S", octave: 0, duration: 1 },
        { swara: "R2", octave: 0, duration: 1 },
        { swara: "G3", octave: 0, duration: 1 },
        { swara: "P", octave: 0, duration: 1 },
        { swara: "D2", octave: 0, duration: 1 },
        { swara: "S", octave: 1, duration: 2 },
      ],
    },
    {
      label: "Kalyani phrase",
      notes: [
        { swara: "P", octave: 0, duration: 1 },
        { swara: "M2", octave: 0, duration: 0.5 },
        { swara: "G3", octave: 0, duration: 0.5 },
        { swara: "R2", octave: 0, duration: 1 },
        { swara: "S", octave: 0, duration: 2 },
      ],
    },
    {
      label: "Sa Pa Sa (tonic)",
      notes: [
        { swara: "S", octave: 0, duration: 1 },
        { swara: "P", octave: 0, duration: 1 },
        { swara: "S", octave: 1, duration: 2 },
      ],
    },
  ];

  const loadPreset = (preset: (typeof PRESETS)[0]) => {
    stopPlayback();
    setNotes(preset.notes.map((n) => ({ ...n, id: nextId() })));
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Composition Notebook</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Build a swara sequence and hear it played back with synthesis
        </p>
      </div>

      {/* Swara Input Pad */}
      <div className="bg-card border border-card-border rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Add Swaras</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Sa =</span>
            <Select value={saKey} onValueChange={setSaKey}>
              <SelectTrigger className="w-28 h-7 text-xs" data-testid="compose-sa-key">
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

        <div className="space-y-2">
          {SWARA_GROUPS.map((group) => (
            <div key={group.label} className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground w-6 text-right shrink-0">
                {group.label}
              </span>
              <div className="flex gap-1.5 flex-wrap">
                {group.swaras.map((swara) => (
                  <motion.button
                    key={swara}
                    whileHover={{ scale: 1.06 }}
                    whileTap={{ scale: 0.94 }}
                    onClick={() => addNote(swara)}
                    data-testid={`compose-swara-${swara}`}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium border border-border bg-background hover:border-primary/50 hover:bg-muted transition-all"
                  >
                    {SWARA_LABELS[swara]}
                  </motion.button>
                ))}
                {/* Octave variants visible as small +/- buttons */}
                <button
                  onClick={() => {
                    const last = notes[notes.length - 1];
                    if (last) updateNote(last.id, { octave: Math.min(1, last.octave + 1) });
                  }}
                  title="Raise last note one octave"
                  className="px-2 py-1 text-xs rounded border border-dashed border-border text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="raise-octave-last"
                  style={{ display: group.label === "Ni" ? "block" : "none" }}
                >
                  +8va
                </button>
                <button
                  onClick={() => {
                    const last = notes[notes.length - 1];
                    if (last) updateNote(last.id, { octave: Math.max(-1, last.octave - 1) });
                  }}
                  title="Lower last note one octave"
                  className="px-2 py-1 text-xs rounded border border-dashed border-border text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="lower-octave-last"
                  style={{ display: group.label === "Ni" ? "block" : "none" }}
                >
                  -8va
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Presets */}
        <div className="pt-1 border-t border-border">
          <div className="text-xs text-muted-foreground mb-2">Quick phrases</div>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => loadPreset(p)}
                data-testid={`preset-${p.label.replace(/\s+/g, "-").toLowerCase()}`}
                className="text-xs px-2.5 py-1 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Sequence */}
      <div className="bg-card border border-card-border rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Sequence
            {notes.length > 0 && (
              <span className="ml-2 font-normal normal-case text-muted-foreground">
                {notes.length} notes · {totalBeats.toFixed(1)} beats · {totalSeconds.toFixed(1)}s
              </span>
            )}
          </h2>
          {notes.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              data-testid="clear-sequence"
              className="h-7 text-xs text-muted-foreground gap-1"
            >
              <Trash2 className="w-3 h-3" />
              Clear
            </Button>
          )}
        </div>

        {notes.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <div className="text-3xl mb-2 opacity-20">♩ ♩ ♩</div>
            <p className="text-sm">Click swaras above to build your sequence</p>
            <p className="text-xs opacity-60 mt-1">Or load a quick phrase preset</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 min-h-16">
            {notes.map((note, i) => (
              <NoteChip
                key={note.id}
                note={note}
                isActive={isPlaying && activeIndex === i}
                onRemove={() => removeNote(note.id)}
                onOctaveChange={(delta) =>
                  updateNote(note.id, { octave: Math.max(-1, Math.min(1, note.octave + delta)) })
                }
                onDurationChange={(dur) => updateNote(note.id, { duration: dur })}
              />
            ))}
          </div>
        )}

        {/* Playback controls */}
        <div className="pt-1 border-t border-border flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              size="default"
              variant={isPlaying ? "secondary" : "default"}
              onClick={isPlaying ? stopPlayback : startPlayback}
              disabled={notes.length === 0}
              data-testid="play-sequence"
              className="gap-1.5"
            >
              {isPlaying ? (
                <><Pause className="w-4 h-4" />Pause</>
              ) : (
                <><Play className="w-4 h-4" />Play</>
              )}
            </Button>
            {isPlaying && (
              <Button
                size="default"
                variant="ghost"
                onClick={stopPlayback}
                data-testid="stop-sequence"
              >
                <Square className="w-4 h-4" />
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-xs text-muted-foreground shrink-0 w-14">{bpm} BPM</span>
            <Slider
              min={30}
              max={240}
              step={5}
              value={[bpm]}
              onValueChange={([v]) => { setBpm(v); if (isPlaying) stopPlayback(); }}
              className="flex-1"
              data-testid="bpm-slider"
            />
          </div>
        </div>
      </div>

      {/* Note legend */}
      <div className="bg-card border border-card-border rounded-xl p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">How to use</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1.5 text-sm text-muted-foreground">
          <div><span className="font-medium text-foreground">Click</span> a swara to add it to the sequence</div>
          <div><span className="font-medium text-foreground">Click a note chip</span> to open its options</div>
          <div><span className="font-medium text-foreground">Octave</span> shifts the note up or down an octave</div>
          <div><span className="font-medium text-foreground">Duration</span> sets note length in beats (1 = one beat)</div>
          <div><span className="font-medium text-foreground">+8va / -8va</span> quickly shifts the last note's octave</div>
          <div><span className="font-medium text-foreground">BPM</span> controls playback speed</div>
        </div>
      </div>
    </div>
  );
}
