export type Anga = "L" | "D" | "A"; // Laghu, Drutam, Anudrutam
export type Jaati = "tisra" | "chatusra" | "khanda" | "misra" | "sankirna";
export type TalaName =
  | "Dhruva" | "Matya" | "Rupaka" | "Jhampa" | "Triputa" | "Ata" | "Eka";

export interface TalaVariant {
  jaati: Jaati;
  laghuCount: number; // aksharas per laghu
  totalAksharas: number;
  angaSequence: Anga[]; // the angas in order
  aksharaPattern: number[]; // beats per anga
}

export interface Tala {
  name: TalaName;
  description: string;
  angaStructure: Anga[]; // fixed anga structure
  variants: TalaVariant[];
  commonJaati: Jaati;
  examples: string[]; // famous compositions
}

const laghuCounts: Record<Jaati, number> = {
  tisra: 3,
  chatusra: 4,
  khanda: 5,
  misra: 7,
  sankirna: 9,
};

function buildVariant(tala: { angas: Anga[] }, jaati: Jaati): TalaVariant {
  const l = laghuCounts[jaati];
  const aksharaPattern = tala.angas.map((a) => {
    if (a === "L") return l;
    if (a === "D") return 2;
    return 1; // A = anudrutam
  });
  const totalAksharas = aksharaPattern.reduce((a, b) => a + b, 0);
  return {
    jaati,
    laghuCount: l,
    totalAksharas,
    angaSequence: tala.angas,
    aksharaPattern,
  };
}

const jaatis: Jaati[] = ["tisra", "chatusra", "khanda", "misra", "sankirna"];

const talaAngas: Record<TalaName, Anga[]> = {
  Dhruva: ["L", "D", "L", "L"],
  Matya: ["L", "D", "L"],
  Rupaka: ["D", "L"],
  Jhampa: ["L", "A", "D"],
  Triputa: ["L", "D", "D"],
  Ata: ["L", "L", "D", "D"],
  Eka: ["L"],
};

export const TALAS: Tala[] = [
  {
    name: "Dhruva",
    description:
      "The most complex of the sapta talas with 4 angas. Often used for profound compositions.",
    angaStructure: talaAngas["Dhruva"],
    variants: jaatis.map((j) => buildVariant({ angas: talaAngas["Dhruva"] }, j)),
    commonJaati: "chatusra",
    examples: ["Many krithis in heavy compositions"],
  },
  {
    name: "Matya",
    description:
      "A 3-anga tala with Laghu-Drutam-Laghu. Symmetrical and balanced.",
    angaStructure: talaAngas["Matya"],
    variants: jaatis.map((j) => buildVariant({ angas: talaAngas["Matya"] }, j)),
    commonJaati: "chatusra",
    examples: ["Used in specific compositions"],
  },
  {
    name: "Rupaka",
    description:
      "Drutam-Laghu structure. Chatusra Rupaka (6 beats) is one of the most common talas in Carnatic music.",
    angaStructure: talaAngas["Rupaka"],
    variants: jaatis.map((j) => buildVariant({ angas: talaAngas["Rupaka"] }, j)),
    commonJaati: "chatusra",
    examples: ["Endaro Mahanubhavulu (Thyagaraja)", "Many Devaranamas"],
  },
  {
    name: "Jhampa",
    description:
      "Laghu-Anudrutam-Drutam. The anudrutam (single beat) makes this tala distinctive.",
    angaStructure: talaAngas["Jhampa"],
    variants: jaatis.map((j) => buildVariant({ angas: talaAngas["Jhampa"] }, j)),
    commonJaati: "misra",
    examples: ["Specific rare compositions"],
  },
  {
    name: "Triputa",
    description:
      "Chatusra Triputa with laghu of 4 = Adi tala (8 beats), the most common tala in Carnatic music.",
    angaStructure: talaAngas["Triputa"],
    variants: jaatis.map((j) => buildVariant({ angas: talaAngas["Triputa"] }, j)),
    commonJaati: "chatusra",
    examples: [
      "Adi tala compositions (thousands)",
      "Misra Chapu (7 beats)",
      "Khanda Chapu (5 beats)",
    ],
  },
  {
    name: "Ata",
    description:
      "Two laghus followed by two drutams. Used in some tiruppugazh and older compositions.",
    angaStructure: talaAngas["Ata"],
    variants: jaatis.map((j) => buildVariant({ angas: talaAngas["Ata"] }, j)),
    commonJaati: "khanda",
    examples: ["Tiruppugazh songs"],
  },
  {
    name: "Eka",
    description:
      "The simplest tala — a single laghu. Chatusra Eka has 4 beats.",
    angaStructure: talaAngas["Eka"],
    variants: jaatis.map((j) => buildVariant({ angas: talaAngas["Eka"] }, j)),
    commonJaati: "chatusra",
    examples: ["Simple devotional songs"],
  },
];

export const JAATI_NAMES: Record<Jaati, string> = {
  tisra: "Tisra",
  chatusra: "Chatusra",
  khanda: "Khanda",
  misra: "Misra",
  sankirna: "Sankirna",
};

export const JAATI_COUNTS: Record<Jaati, number> = laghuCounts;

export const ANGA_NAMES: Record<Anga, string> = {
  L: "Laghu",
  D: "Drutam",
  A: "Anudrutam",
};

export const ANGA_SYMBOLS: Record<Anga, string> = {
  L: "I",
  D: "O",
  A: "U",
};

export const COMMON_TALAS = [
  { name: "Adi Tala", tala: "Triputa", jaati: "chatusra" as Jaati, beats: 8, description: "The most common tala. 4+2+2 pattern." },
  { name: "Rupaka Tala", tala: "Rupaka", jaati: "chatusra" as Jaati, beats: 6, description: "Drutam + Chatusra Laghu. 2+4 pattern." },
  { name: "Misra Chapu", tala: "Triputa", jaati: "misra" as Jaati, beats: 7, description: "7 beats: 3+2+2 or 3+4 pattern." },
  { name: "Khanda Chapu", tala: "Triputa", jaati: "khanda" as Jaati, beats: 5, description: "5 beats: 2+3 pattern." },
  { name: "Tisra Triputa", tala: "Triputa", jaati: "tisra" as Jaati, beats: 7, description: "3+2+2 = 7 beats." },
  { name: "Khanda Ata", tala: "Ata", jaati: "khanda" as Jaati, beats: 14, description: "5+5+2+2 = 14 beats." },
];
