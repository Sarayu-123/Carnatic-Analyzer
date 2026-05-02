import type { SwaraNote } from "@/lib/pitch-detection";

export const SWARA_SEMITONES: Record<SwaraNote, number> = {
  S: 0, R1: 1, R2: 2, R3: 3, G1: 2, G2: 3, G3: 4,
  M1: 5, M2: 6, P: 7, D1: 8, D2: 9, D3: 10, N1: 9, N2: 10, N3: 11,
};

export function swaraToFreq(swara: SwaraNote, saFreq: number, octave = 0): number {
  const semitone = SWARA_SEMITONES[swara];
  return saFreq * Math.pow(2, (semitone + octave * 12) / 12);
}

export interface SynthNote {
  id: string;
  swara: SwaraNote;
  octave: number;   // -1, 0, +1
  duration: number; // in beats (0.5 = half, 1 = one, 2 = double)
}

/** Play a single note using a veena-like plucked string timbre. */
export function playNote(
  ctx: AudioContext,
  freq: number,
  startTime: number,
  duration: number, // seconds
  volume = 0.5
): void {
  const attackTime = 0.006;
  const decayTime = duration * 0.3;
  const sustainLevel = 0.55;
  const releaseTime = Math.min(0.12, duration * 0.2);

  // Main oscillator – triangle wave (flute-like, warm)
  const osc1 = ctx.createOscillator();
  osc1.type = "triangle";
  osc1.frequency.setValueAtTime(freq, startTime);
  // Slight vibrato after initial attack
  osc1.frequency.setValueAtTime(freq, startTime + 0.07);
  osc1.frequency.linearRampToValueAtTime(freq * 1.003, startTime + duration * 0.4);
  osc1.frequency.linearRampToValueAtTime(freq, startTime + duration * 0.7);

  // Harmonic overtone – one octave up, quieter (gives a brighter pluck)
  const osc2 = ctx.createOscillator();
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(freq * 2, startTime);

  const gainOsc2 = ctx.createGain();
  gainOsc2.gain.setValueAtTime(0.12 * volume, startTime);
  gainOsc2.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * 0.5);

  // Envelope for main oscillator
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.linearRampToValueAtTime(volume, startTime + attackTime);
  gain.gain.exponentialRampToValueAtTime(sustainLevel * volume, startTime + attackTime + decayTime);
  gain.gain.setValueAtTime(sustainLevel * volume, startTime + duration - releaseTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  // Gentle low-pass filter
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(3200, startTime);
  filter.frequency.exponentialRampToValueAtTime(1800, startTime + duration);
  filter.Q.setValueAtTime(0.8, startTime);

  osc1.connect(gain);
  osc2.connect(gainOsc2);
  gainOsc2.connect(filter);
  gain.connect(filter);
  filter.connect(ctx.destination);

  osc1.start(startTime);
  osc1.stop(startTime + duration + 0.01);
  osc2.start(startTime);
  osc2.stop(startTime + duration + 0.01);
}
