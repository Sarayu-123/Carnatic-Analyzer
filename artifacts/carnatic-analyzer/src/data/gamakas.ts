export interface GamakaPoint {
  t: number;   // time 0–1 (normalized)
  f: number;   // semitone offset from base note
}

export interface Gamaka {
  id: string;
  name: string;
  tamil?: string;
  englishName: string;
  description: string;
  technicalDescription: string;
  contour: GamakaPoint[];   // pitch contour as semitone offsets over normalized time
  durationMs: number;
  ragaExamples: { raga: string; context: string }[];
  category: "oscillation" | "slide" | "deflection" | "sustained" | "touch";
}

export const GAMAKAS: Gamaka[] = [
  {
    id: "kampita",
    name: "Kampita",
    tamil: "கம்பிதம்",
    englishName: "Oscillation / Shake",
    description:
      "A rapid oscillation around a swara. The pitch shimmers back and forth, creating the characteristic vibrato of Carnatic music. The depth and speed vary by raga.",
    technicalDescription:
      "Rapid back-and-forth movement between the target note and a point below it, typically ~0.5–1 semitone. Rate: 5–8 oscillations per second.",
    contour: (() => {
      const pts: GamakaPoint[] = [{ t: 0, f: 0 }];
      for (let i = 0; i <= 12; i++) {
        pts.push({ t: 0.04 + i * 0.08, f: i % 2 === 0 ? -0.6 : 0 });
      }
      pts.push({ t: 1, f: 0 });
      return pts;
    })(),
    durationMs: 1400,
    ragaExamples: [
      { raga: "Bhairavi", context: "Ga₂ in descent oscillates intensely" },
      { raga: "Thodi", context: "Ga₂ is sung with deep kampita throughout" },
      { raga: "Kharaharapriya", context: "Ni₂ in descent" },
    ],
    category: "oscillation",
  },
  {
    id: "jaru",
    name: "Jaru",
    tamil: "ஜாரு",
    englishName: "Slide / Glide",
    description:
      "A smooth glide from one swara to another without stopping at intermediate notes. Creates a yearning, emotional quality — the hallmark of phrases like 'M G R S'.",
    technicalDescription:
      "Continuous linear pitch movement from a source swara to a target swara. Can be ascending (aarohi jaru) or descending (avarohi jaru).",
    contour: [
      { t: 0, f: 0 },
      { t: 0.15, f: 0 },
      { t: 0.65, f: -3 },
      { t: 1, f: -3 },
    ],
    durationMs: 1200,
    ragaExamples: [
      { raga: "Kambhoji", context: "N D P slide characteristic phrase" },
      { raga: "Mohanam", context: "D G slide in descent" },
      { raga: "Bhairavi", context: "Sliding through M G R S" },
    ],
    category: "slide",
  },
  {
    id: "orikkai",
    name: "Orikkai",
    tamil: "ஒரிக்கை",
    englishName: "Deflection / Cut",
    description:
      "A brief deflection to an adjacent note and an immediate return. Like a quick flick of the finger that 'cuts' through a neighboring swara.",
    technicalDescription:
      "Very brief (~50–80ms) excursion to a neighboring note (usually 1–2 semitones higher), immediately returning to the original note.",
    contour: [
      { t: 0, f: 0 },
      { t: 0.25, f: 0 },
      { t: 0.35, f: 1 },
      { t: 0.45, f: 0 },
      { t: 1, f: 0 },
    ],
    durationMs: 900,
    ragaExamples: [
      { raga: "Shankarabharanam", context: "Pa with a cut to Dha" },
      { raga: "Kalyani", context: "Ga with a quick deflection to Ma₂" },
      { raga: "Harikambhoji", context: "Sa at the end of phrases" },
    ],
    category: "deflection",
  },
  {
    id: "nokku",
    name: "Nokku",
    tamil: "நொக்கு",
    englishName: "Press / Touch from Above",
    description:
      "The note is approached from slightly above and pressed down to its target pitch. Gives a sense of weight and arrival — like gently pressing a string down to pitch.",
    technicalDescription:
      "Start ~1–1.5 semitones above target; quickly resolve downward to the note, often with a slight decay in oscillation.",
    contour: [
      { t: 0, f: 1.5 },
      { t: 0.12, f: 0 },
      { t: 0.3, f: 0 },
      { t: 1, f: 0 },
    ],
    durationMs: 1100,
    ragaExamples: [
      { raga: "Thodi", context: "Ri₁ approached from above" },
      { raga: "Saveri", context: "Da₁ touched from above" },
      { raga: "Varali", context: "Ga₂ with pressing touch" },
    ],
    category: "touch",
  },
  {
    id: "sphurita",
    name: "Sphurita",
    tamil: "ஸ்புரித",
    englishName: "Flicker / Touch from Below",
    description:
      "A quick upward flicker from the note just below to the target. Like a light pluck that springs up to the note — gives a bright, sparkling quality.",
    technicalDescription:
      "A rapid upward excursion from 1–2 semitones below the target note, arriving and settling at the target.",
    contour: [
      { t: 0, f: -1.5 },
      { t: 0.1, f: 0 },
      { t: 0.15, f: 0.3 },
      { t: 0.25, f: 0 },
      { t: 1, f: 0 },
    ],
    durationMs: 1000,
    ragaExamples: [
      { raga: "Mohanam", context: "Ga₃ with a light touch from Ri₂" },
      { raga: "Shankarabharanam", context: "Ni₃ flickered from Da₂" },
      { raga: "Hamsadhwani", context: "Pa lightly flicked from Ga₃" },
    ],
    category: "touch",
  },
  {
    id: "pratyahata",
    name: "Pratyahata",
    tamil: "ப்ரத்யாஹத",
    englishName: "Strike Back / Bounce",
    description:
      "The note strikes the one above and immediately bounces back. Creates a sharp articulation effect — like a brief tap upward before settling.",
    technicalDescription:
      "A rapid two-stage movement: first a brief (~40ms) visit to 1 semitone above, then an immediate return to the base note.",
    contour: [
      { t: 0, f: 0 },
      { t: 0.2, f: 0 },
      { t: 0.28, f: 1 },
      { t: 0.36, f: 0 },
      { t: 0.5, f: 1 },
      { t: 0.58, f: 0 },
      { t: 1, f: 0 },
    ],
    durationMs: 1000,
    ragaExamples: [
      { raga: "Kharaharapriya", context: "Da₂ with bounce to Ni₂" },
      { raga: "Natabhairavi", context: "Sa bounce to Ri₂" },
      { raga: "Charukesi", context: "Pa bounce to Da₁" },
    ],
    category: "touch",
  },
  {
    id: "andolita",
    name: "Andolita",
    tamil: "ஆந்தோளிதம்",
    englishName: "Swinging / Slow Oscillation",
    description:
      "A slow, wide oscillation — like a pendulum swinging between the note and a point below. More languid than kampita, used for emotional, heavy phrases.",
    technicalDescription:
      "Similar to kampita but slower (~2–3 oscillations per second) and wider depth (~1–2 semitones). Characteristic of notes like Ga₂ in heavy Bhairavi.",
    contour: (() => {
      const pts: GamakaPoint[] = [{ t: 0, f: 0 }];
      for (let i = 0; i <= 5; i++) {
        pts.push({ t: 0.05 + i * 0.18, f: i % 2 === 0 ? -1.2 : 0 });
      }
      pts.push({ t: 1, f: 0 });
      return pts;
    })(),
    durationMs: 1800,
    ragaExamples: [
      { raga: "Hindolam", context: "Ga₂ and Da₁ use andolita" },
      { raga: "Bhairavi", context: "Ga₂ with slow, heavy swing" },
      { raga: "Natabhairavi", context: "Ma₁ with slow oscillation" },
    ],
    category: "oscillation",
  },
  {
    id: "ravai",
    name: "Ravai",
    tamil: "ரவை",
    englishName: "Sustain / Held Note",
    description:
      "A long, sustained note with subtle breath-like fluctuations. Not an ornament per se, but the way a note is 'held' and allowed to resonate is itself an art.",
    technicalDescription:
      "Extended sustain of a swara with micro-fluctuations (~0.1 semitone), ending with a gentle fade. Used for meditative or resolutive notes.",
    contour: [
      { t: 0, f: 0 },
      { t: 0.05, f: 0.1 },
      { t: 0.2, f: -0.1 },
      { t: 0.4, f: 0.1 },
      { t: 0.6, f: 0 },
      { t: 0.8, f: -0.08 },
      { t: 1, f: 0 },
    ],
    durationMs: 2200,
    ragaExamples: [
      { raga: "Kalyani", context: "Ma₂ as the vadi is often held" },
      { raga: "Bhairavi", context: "Ga₂ in final phrase" },
      { raga: "Shankarabharanam", context: "Sa in conclusion of alapana" },
    ],
    category: "sustained",
  },
  {
    id: "meend",
    name: "Meend (Irakka Jaru)",
    tamil: "இறக்க ஜாரு",
    englishName: "Long Descending Glide",
    description:
      "A slow, expressive downward glide through multiple swaras — the hallmark of alapana. Gives a feeling of descent through the raga's scale with full emotion.",
    technicalDescription:
      "Continuous slow descent over 3–5 semitones, lingering slightly on passing notes. The characteristic sound of Carnatic alapana.",
    contour: [
      { t: 0, f: 4 },
      { t: 0.15, f: 3.6 },
      { t: 0.3, f: 2.8 },
      { t: 0.45, f: 2 },
      { t: 0.6, f: 1 },
      { t: 0.75, f: 0.2 },
      { t: 1, f: 0 },
    ],
    durationMs: 1800,
    ragaExamples: [
      { raga: "Thodi", context: "Descending through P M G R S" },
      { raga: "Bhairavi", context: "Classic M G R S descent" },
      { raga: "Kharaharapriya", context: "N D P M G R S slow descent" },
    ],
    category: "slide",
  },
];

export const GAMAKA_CATEGORIES = [
  { id: "all", label: "All Gamakas" },
  { id: "oscillation", label: "Oscillation" },
  { id: "slide", label: "Slide" },
  { id: "deflection", label: "Deflection" },
  { id: "touch", label: "Touch" },
  { id: "sustained", label: "Sustained" },
] as const;
