import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, RefreshCw, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  detectPitch,
  freqToSwara,
  SA_FREQUENCIES,
  type SwaraNote,
} from "@/lib/pitch-detection";
import { SWARA_LABELS, getMatchingRagas } from "@/data/ragas";

const HISTORY_SIZE = 60; // frames of history to display

interface DetectedNote {
  swara: SwaraNote;
  cents: number;
  freq: number;
  octave: number;
  timestamp: number;
}

function CentsMeter({ cents }: { cents: number }) {
  const clamped = Math.max(-50, Math.min(50, cents));
  const pct = ((clamped + 50) / 100) * 100;
  const inTune = Math.abs(cents) < 10;

  return (
    <div className="space-y-1">
      <div className="relative h-4 bg-muted rounded-full overflow-hidden">
        {/* Center line */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border z-10" />
        {/* In-tune zone */}
        <div className="absolute left-[46%] right-[46%] top-0 bottom-0 bg-primary/10" />
        {/* Needle */}
        <motion.div
          className={[
            "absolute top-1 bottom-1 w-2 rounded-full -translate-x-1/2 transition-colors",
            inTune ? "bg-emerald-500" : "bg-amber-500",
          ].join(" ")}
          animate={{ left: `${pct}%` }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>-50¢</span>
        <span className={inTune ? "text-emerald-600 font-medium" : "text-amber-600"}>
          {cents > 0 ? `+${cents}¢` : `${cents}¢`}
        </span>
        <span>+50¢</span>
      </div>
    </div>
  );
}

function NoteHistory({ history }: { history: DetectedNote[] }) {
  if (history.length === 0) return null;

  // Count recent swara occurrences (last 30 frames)
  const recent = history.slice(-30);
  const counts: Partial<Record<SwaraNote, number>> = {};
  for (const n of recent) {
    counts[n.swara] = (counts[n.swara] ?? 0) + 1;
  }

  const sorted = Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8);

  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Recent swaras
      </div>
      <div className="flex flex-wrap gap-2">
        {sorted.map(([swara, count]) => (
          <div key={swara} className="flex items-center gap-1.5">
            <span className="text-sm font-medium">{SWARA_LABELS[swara as SwaraNote]}</span>
            <div className="flex gap-0.5">
              {Array.from({ length: Math.min(count, 8) }).map((_, i) => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-primary/60" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PitchDetect() {
  const [isListening, setIsListening] = useState(false);
  const [saKey, setSaKey] = useState("C3");
  const [currentNote, setCurrentNote] = useState<DetectedNote | null>(null);
  const [history, setHistory] = useState<DetectedNote[]>([]);
  const [collectedSwaras, setCollectedSwaras] = useState<Set<SwaraNote>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(0);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const bufferRef = useRef<Float32Array | null>(null);

  const saFreq = SA_FREQUENCIES.find((s) => s.label === saKey)?.freq ?? 130.81;

  const stopListening = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    sourceRef.current?.disconnect();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    analyserRef.current = null;
    sourceRef.current = null;
    streamRef.current = null;
    setIsListening(false);
    setCurrentNote(null);
    setVolume(0);
  }, []);

  const startListening = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;

      const ctx = new AudioContext();
      audioCtxRef.current = ctx;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 4096;
      analyser.smoothingTimeConstant = 0.3;
      analyserRef.current = analyser;

      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);
      sourceRef.current = source;

      bufferRef.current = new Float32Array(analyser.fftSize);

      setIsListening(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("denied") || msg.includes("Permission")) {
        setError("Microphone access was denied. Please allow microphone access and try again.");
      } else {
        setError("Could not access microphone: " + msg);
      }
    }
  }, []);

  useEffect(() => {
    if (!isListening) return;

    const tick = () => {
      const analyser = analyserRef.current;
      const buffer = bufferRef.current;
      const ctx = audioCtxRef.current;
      if (!analyser || !buffer || !ctx) return;

      analyser.getFloatTimeDomainData(buffer);

      // RMS volume
      let rms = 0;
      for (let i = 0; i < buffer.length; i++) rms += buffer[i] * buffer[i];
      rms = Math.sqrt(rms / buffer.length);
      setVolume(Math.min(1, rms * 10));

      const freq = detectPitch(buffer, ctx.sampleRate);
      if (freq !== null) {
        const { swara, octave, cents } = freqToSwara(freq, saFreq);
        const note: DetectedNote = { swara, cents, freq: Math.round(freq), octave, timestamp: Date.now() };
        setCurrentNote(note);
        setHistory((prev) => [...prev.slice(-HISTORY_SIZE + 1), note]);
      } else {
        setCurrentNote(null);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isListening, saFreq]);

  useEffect(() => () => stopListening(), [stopListening]);

  const addSwara = (swara: SwaraNote) => {
    setCollectedSwaras((prev) => {
      const next = new Set(prev);
      next.add(swara);
      return next;
    });
  };

  const removeSwara = (swara: SwaraNote) => {
    setCollectedSwaras((prev) => {
      const next = new Set(prev);
      next.delete(swara);
      return next;
    });
  };

  const collected = Array.from(collectedSwaras);
  const ragaMatches = getMatchingRagas(collected).slice(0, 5);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Pitch Detector</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Hum or play a note — the app identifies the swara in real time
        </p>
      </div>

      {/* Controls */}
      <div className="bg-card border border-card-border rounded-xl p-5 space-y-5">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              size="default"
              variant={isListening ? "destructive" : "default"}
              onClick={isListening ? stopListening : startListening}
              data-testid="mic-toggle"
              className="gap-2"
            >
              {isListening ? (
                <><MicOff className="w-4 h-4" /> Stop</>
              ) : (
                <><Mic className="w-4 h-4" /> Start Listening</>
              )}
            </Button>

            {isListening && (
              <div className="flex items-center gap-2">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                  className="w-2 h-2 rounded-full bg-red-500"
                />
                <span className="text-xs text-muted-foreground">Listening...</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground shrink-0">Sa =</span>
            <Select value={saKey} onValueChange={(v) => { setSaKey(v); }}>
              <SelectTrigger className="w-28" data-testid="sa-key-select">
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

        {error && (
          <div className="text-sm text-destructive bg-destructive/10 rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        {/* Volume meter */}
        {isListening && (
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Input level</div>
            <Progress value={volume * 100} className="h-1.5" />
          </div>
        )}

        {/* Current note display */}
        <div className="flex items-center justify-center min-h-36">
          <AnimatePresence mode="wait">
            {!isListening ? (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center text-muted-foreground"
              >
                <Mic className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">Press Start Listening to begin</p>
                <p className="text-xs opacity-60 mt-1">Microphone access required</p>
              </motion.div>
            ) : currentNote ? (
              <motion.div
                key={currentNote.swara + currentNote.octave}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="text-center space-y-3 w-full max-w-xs"
              >
                <div>
                  <div className="text-6xl font-bold tracking-tight text-primary">
                    {SWARA_LABELS[currentNote.swara]}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {currentNote.freq} Hz
                    {currentNote.octave !== 0 && (
                      <span className="ml-1 text-xs">(oct {currentNote.octave > 0 ? `+${currentNote.octave}` : currentNote.octave})</span>
                    )}
                  </div>
                </div>
                <CentsMeter cents={currentNote.cents} />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => addSwara(currentNote.swara)}
                  data-testid="add-swara-btn"
                  className="gap-1.5 text-xs"
                >
                  <Plus className="w-3 h-3" />
                  Add {SWARA_LABELS[currentNote.swara]} to collection
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="silent"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center text-muted-foreground"
              >
                <div className="text-4xl font-bold opacity-20 mb-2">—</div>
                <p className="text-xs">No pitch detected. Hum or play a clear note.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {history.length > 0 && <NoteHistory history={history} />}

        {history.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setHistory([]); setCurrentNote(null); }}
            data-testid="clear-history"
            className="text-xs text-muted-foreground gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            Clear history
          </Button>
        )}
      </div>

      {/* Collected swaras */}
      <div className="bg-card border border-card-border rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground text-sm uppercase tracking-wider">
            Collected Swaras
          </h2>
          {collected.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCollectedSwaras(new Set())}
              data-testid="clear-collected"
              className="text-xs text-muted-foreground gap-1 h-7"
            >
              <Trash2 className="w-3 h-3" />
              Clear
            </Button>
          )}
        </div>

        {collected.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Add detected swaras using the button above while listening
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {collected.map((s) => (
              <button
                key={s}
                data-testid={`collected-swara-${s}`}
                onClick={() => removeSwara(s)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-sm font-medium border border-primary/20 hover:bg-primary/15 transition-colors"
              >
                {SWARA_LABELS[s]}
                <span className="text-primary/50 text-xs">×</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Raga matches from collected swaras */}
      {collected.length >= 2 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
            Possible Ragas
          </h2>
          {ragaMatches.length === 0 ? (
            <p className="text-sm text-muted-foreground">No ragas matched yet. Keep adding swaras.</p>
          ) : (
            ragaMatches.map(({ raga, matchPercent, allSelected }) => (
              <div
                key={raga.id}
                data-testid={`pitch-raga-match-${raga.id}`}
                className={[
                  "bg-card border rounded-xl p-4 flex items-center justify-between gap-3",
                  allSelected ? "border-primary/40" : "border-card-border",
                ].join(" ")}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{raga.name}</span>
                      {raga.melakartaNumber && (
                        <Badge variant="outline" className="text-xs">#{raga.melakartaNumber}</Badge>
                      )}
                      {allSelected && (
                        <Badge className="text-xs bg-emerald-600/90 text-white border-0">Full match</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Progress value={matchPercent} className="h-1 w-24" />
                      <span className="text-xs text-muted-foreground">{matchPercent}%</span>
                    </div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground shrink-0 text-right">
                  <div className="capitalize">{raga.time}</div>
                  <div className="text-primary/70">{raga.mood.split(",")[0]}</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
