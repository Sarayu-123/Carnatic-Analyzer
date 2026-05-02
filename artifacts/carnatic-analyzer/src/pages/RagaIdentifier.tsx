import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ALL_SWARAS,
  SWARA_LABELS,
  SWARA_FULL_NAMES,
  getMatchingRagas,
  type SwaraNote,
} from "@/data/ragas";

const SWARA_GROUPS = [
  { label: "Sa", swaras: ["S"] as SwaraNote[] },
  { label: "Ri", swaras: ["R1", "R2", "R3"] as SwaraNote[] },
  { label: "Ga", swaras: ["G1", "G2", "G3"] as SwaraNote[] },
  { label: "Ma", swaras: ["M1", "M2"] as SwaraNote[] },
  { label: "Pa", swaras: ["P"] as SwaraNote[] },
  { label: "Da", swaras: ["D1", "D2", "D3"] as SwaraNote[] },
  { label: "Ni", swaras: ["N1", "N2", "N3"] as SwaraNote[] },
];

export default function RagaIdentifier() {
  const [selectedSwaras, setSelectedSwaras] = useState<Set<SwaraNote>>(new Set());
  const [expandedRaga, setExpandedRaga] = useState<string | null>(null);

  const toggleSwara = (swara: SwaraNote) => {
    setSelectedSwaras((prev) => {
      const next = new Set(prev);
      if (next.has(swara)) next.delete(swara);
      else next.add(swara);
      return next;
    });
  };

  const clearAll = () => {
    setSelectedSwaras(new Set());
    setExpandedRaga(null);
  };

  const selected = useMemo(() => Array.from(selectedSwaras), [selectedSwaras]);
  const matches = useMemo(() => getMatchingRagas(selected), [selected]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Raga Identifier</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Select swaras to find matching ragas in real time
        </p>
      </div>

      {/* Swara Pad */}
      <div className="bg-card border border-card-border rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
            Swara Pad
          </h2>
          {selectedSwaras.size > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              data-testid="clear-swaras"
              className="text-muted-foreground hover:text-foreground h-7 text-xs gap-1"
            >
              <X className="w-3 h-3" />
              Clear all
            </Button>
          )}
        </div>

        <div className="space-y-3">
          {SWARA_GROUPS.map((group) => (
            <div key={group.label} className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground w-6 text-right">{group.label}</span>
              <div className="flex gap-1.5 flex-wrap">
                {group.swaras.map((swara) => {
                  const isSelected = selectedSwaras.has(swara);
                  const inRaga = matches.length > 0 && matches.some(
                    (m) => m.allSelected && [...m.raga.arohana, ...m.raga.avarohana].includes(swara)
                  );
                  return (
                    <motion.button
                      key={swara}
                      data-testid={`swara-${swara}`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => toggleSwara(swara)}
                      title={SWARA_FULL_NAMES[swara]}
                      className={[
                        "px-3 py-1.5 rounded-lg text-sm font-medium border transition-all duration-150 select-none",
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "bg-background text-foreground border-border hover:border-primary/50 hover:bg-muted",
                      ].join(" ")}
                    >
                      {SWARA_LABELS[swara]}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {selectedSwaras.size > 0 && (
          <div className="pt-2 border-t border-border flex flex-wrap gap-1.5 items-center">
            <span className="text-xs text-muted-foreground">Selected:</span>
            {selected.map((s) => (
              <Badge
                key={s}
                variant="secondary"
                className="text-xs cursor-pointer gap-1"
                onClick={() => toggleSwara(s)}
                data-testid={`selected-badge-${s}`}
              >
                {SWARA_LABELS[s]}
                <X className="w-2.5 h-2.5" />
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Results */}
      <div className="space-y-3">
        {selectedSwaras.size === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Select swaras above to identify matching ragas</p>
            <p className="text-xs mt-1 opacity-70">Tip: Start with Sa, Pa and a few characteristic notes</p>
          </div>
        ) : matches.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">No ragas found. Try different swara combinations.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                Matching Ragas
              </h2>
              <span className="text-xs text-muted-foreground">{matches.length} found</span>
            </div>
            <AnimatePresence initial={false}>
              {matches.map(({ raga, matchPercent, allSelected }, i) => (
                <motion.div
                  key={raga.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ delay: i * 0.03 }}
                  className={[
                    "bg-card border rounded-xl overflow-hidden cursor-pointer transition-colors",
                    allSelected ? "border-primary/40" : "border-card-border",
                    expandedRaga === raga.id ? "shadow-md" : "hover:border-primary/20",
                  ].join(" ")}
                  onClick={() => setExpandedRaga(expandedRaga === raga.id ? null : raga.id)}
                  data-testid={`raga-match-${raga.id}`}
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-foreground">{raga.name}</span>
                          {raga.alternateName && (
                            <span className="text-xs text-muted-foreground">({raga.alternateName})</span>
                          )}
                          {raga.melakartaNumber && (
                            <Badge variant="outline" className="text-xs">
                              #{raga.melakartaNumber}
                            </Badge>
                          )}
                          <Badge
                            variant={raga.type === "melakarta" ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {raga.type === "melakarta" ? "Melakarta" : "Janya"}
                          </Badge>
                          {allSelected && (
                            <Badge className="text-xs bg-emerald-600/90 text-white border-0">
                              Full match
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Progress value={matchPercent} className="h-1.5 flex-1 max-w-32" />
                          <span className="text-xs text-muted-foreground shrink-0">{matchPercent}% match</span>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground shrink-0 text-right">
                        <div>{raga.time}</div>
                        <div className="text-primary/70">{raga.mood.split(",")[0]}</div>
                      </div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {expandedRaga === raga.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-t border-border"
                      >
                        <div className="p-4 space-y-3">
                          <p className="text-sm text-muted-foreground">{raga.description}</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <div className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Arohana</div>
                              <div className="flex flex-wrap gap-1">
                                {raga.arohana.map((s, idx) => (
                                  <span
                                    key={idx}
                                    className={[
                                      "text-xs px-2 py-0.5 rounded font-mono",
                                      selectedSwaras.has(s)
                                        ? "bg-primary/15 text-primary font-semibold"
                                        : "bg-muted text-muted-foreground",
                                    ].join(" ")}
                                  >
                                    {SWARA_LABELS[s]}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Avarohana</div>
                              <div className="flex flex-wrap gap-1">
                                {raga.avarohana.map((s, idx) => (
                                  <span
                                    key={idx}
                                    className={[
                                      "text-xs px-2 py-0.5 rounded font-mono",
                                      selectedSwaras.has(s)
                                        ? "bg-primary/15 text-primary font-semibold"
                                        : "bg-muted text-muted-foreground",
                                    ].join(" ")}
                                  >
                                    {SWARA_LABELS[s]}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                          {(raga.vadiSwara || raga.samvadiSwara) && (
                            <div className="flex gap-4 text-xs">
                              {raga.vadiSwara && (
                                <div>
                                  <span className="text-muted-foreground">Vadi: </span>
                                  <span className="font-medium">{SWARA_LABELS[raga.vadiSwara]}</span>
                                </div>
                              )}
                              {raga.samvadiSwara && (
                                <div>
                                  <span className="text-muted-foreground">Samvadi: </span>
                                  <span className="font-medium">{SWARA_LABELS[raga.samvadiSwara]}</span>
                                </div>
                              )}
                              {raga.parentMelakarta && (
                                <div>
                                  <span className="text-muted-foreground">Parent: </span>
                                  <span className="font-medium">{raga.parentMelakarta}</span>
                                </div>
                              )}
                            </div>
                          )}
                          {raga.characteristicPhrases.length > 0 && (
                            <div>
                              <div className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Characteristic Phrases</div>
                              <div className="flex flex-wrap gap-1.5">
                                {raga.characteristicPhrases.map((p, i) => (
                                  <span key={i} className="text-xs bg-muted px-2 py-0.5 rounded font-mono text-foreground">
                                    {p}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  );
}
