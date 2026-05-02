/**
 * Autocorrelation-based pitch detection (YIN-inspired).
 * Returns the fundamental frequency in Hz, or null if no clear pitch found.
 */
export function detectPitch(buffer: Float32Array, sampleRate: number): number | null {
  const SIZE = buffer.length;
  const MAX_SAMPLES = Math.floor(SIZE / 2);
  const MIN_FREQ = 60;   // Hz
  const MAX_FREQ = 1200; // Hz
  const CLARITY_THRESHOLD = 0.9;

  let rms = 0;
  for (let i = 0; i < SIZE; i++) rms += buffer[i] * buffer[i];
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.008) return null; // too quiet

  const correlations = new Float32Array(MAX_SAMPLES);
  for (let lag = 0; lag < MAX_SAMPLES; lag++) {
    let sum = 0;
    for (let i = 0; i < MAX_SAMPLES; i++) {
      sum += buffer[i] * buffer[i + lag];
    }
    correlations[lag] = sum;
  }

  const minLag = Math.floor(sampleRate / MAX_FREQ);
  const maxLag = Math.floor(sampleRate / MIN_FREQ);

  let bestLag = -1;
  let bestCorr = -1;
  let prevCorr = correlations[minLag];
  let goingUp = false;

  for (let lag = minLag + 1; lag <= maxLag; lag++) {
    const curr = correlations[lag];
    if (!goingUp && curr > prevCorr) goingUp = true;
    if (goingUp && curr < prevCorr) {
      // Peak was at lag - 1
      const peakLag = lag - 1;
      const normalized = correlations[peakLag] / correlations[0];
      if (normalized > bestCorr) {
        bestCorr = normalized;
        bestLag = peakLag;
      }
      goingUp = false;
    }
    prevCorr = curr;
  }

  if (bestLag === -1 || bestCorr < CLARITY_THRESHOLD) return null;

  // Parabolic interpolation for sub-sample accuracy
  const y1 = correlations[bestLag - 1] ?? correlations[bestLag];
  const y2 = correlations[bestLag];
  const y3 = correlations[bestLag + 1] ?? correlations[bestLag];
  const denom = 2 * (2 * y2 - y1 - y3);
  const refinedLag = denom === 0 ? bestLag : bestLag - (y3 - y1) / denom;

  return sampleRate / refinedLag;
}

export type SwaraNote =
  | "S" | "R1" | "R2" | "R3" | "G1" | "G2" | "G3"
  | "M1" | "M2" | "P" | "D1" | "D2" | "D3" | "N1" | "N2" | "N3";

/**
 * Semitone positions (0-11) for each Carnatic swara.
 * Some notes share the same semitone (e.g. R2 = G1 at semitone 2).
 */
export const SWARA_SEMITONES: Record<SwaraNote, number> = {
  S:  0,
  R1: 1,
  R2: 2,  G1: 2,
  R3: 3,  G2: 3,
  G3: 4,
  M1: 5,
  M2: 6,
  P:  7,
  D1: 8,
  D2: 9,  N1: 9,
  D3: 10, N2: 10,
  N3: 11,
};

/** Canonical swara for each semitone (0-11) */
export const SEMITONE_TO_SWARA: SwaraNote[] = [
  "S", "R1", "R2", "G2", "G3", "M1", "M2", "P", "D1", "D2", "N2", "N3",
];

/**
 * Convert frequency to the nearest Carnatic swara note given a reference Sa frequency.
 * Returns the swara, octave offset, and cents deviation.
 */
export function freqToSwara(freq: number, saFreq: number): {
  swara: SwaraNote;
  octave: number;
  cents: number;
} {
  const semitones = 12 * Math.log2(freq / saFreq);
  const roundedSemitones = Math.round(semitones);
  const cents = Math.round((semitones - roundedSemitones) * 100);
  const octave = Math.floor(roundedSemitones / 12);
  const semitoneInOctave = ((roundedSemitones % 12) + 12) % 12;
  const swara = SEMITONE_TO_SWARA[semitoneInOctave];
  return { swara, octave, cents };
}

/**
 * Standard Sa frequencies for common keys (Western note names).
 */
export const SA_FREQUENCIES: { label: string; freq: number }[] = [
  { label: "C3",  freq: 130.81 },
  { label: "C#3", freq: 138.59 },
  { label: "D3",  freq: 146.83 },
  { label: "D#3", freq: 155.56 },
  { label: "E3",  freq: 164.81 },
  { label: "F3",  freq: 174.61 },
  { label: "F#3", freq: 185.00 },
  { label: "G3",  freq: 196.00 },
  { label: "G#3", freq: 207.65 },
  { label: "A3",  freq: 220.00 },
  { label: "A#3", freq: 233.08 },
  { label: "B3",  freq: 246.94 },
  { label: "C4",  freq: 261.63 },
  { label: "C#4", freq: 277.18 },
  { label: "D4",  freq: 293.66 },
  { label: "D#4", freq: 311.13 },
];
