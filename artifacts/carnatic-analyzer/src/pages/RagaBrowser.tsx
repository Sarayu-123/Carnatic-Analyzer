import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ChevronDown, ChevronUp, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RAGAS, SWARA_LABELS, type Raga, type TimeOfDay } from "@/data/ragas";

const TIME_OPTIONS: { value: TimeOfDay | "all"; label: string }[] = [
  { value: "all", label: "All times" },
  { value: "morning", label: "Morning" },
  { value: "afternoon", label: "Afternoon" },
  { value: "evening", label: "Evening" },
  { value: "night", label: "Night" },
  { value: "universal", label: "Universal" },
];

const TYPE_OPTIONS = [
  { value: "all", label: "All types" },
  { value: "melakarta", label: "Melakarta" },
  { value: "janya", label: "Janya" },
];

function RagaCard({ raga }: { raga: Raga }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      layout
      className="bg-card border border-card-border rounded-xl overflow-hidden"
    >
      <button
        className="w-full text-left p-4 hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded((e) => !e)}
        data-testid={`raga-card-${raga.id}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-foreground text-base">{raga.name}</span>
              {raga.alternateName && (
                <span className="text-xs text-muted-foreground">/ {raga.alternateName}</span>
              )}
              {raga.melakartaNumber && (
                <Badge variant="outline" className="text-xs font-mono">
                  #{raga.melakartaNumber}
                </Badge>
              )}
              <Badge
                variant={raga.type === "melakarta" ? "default" : "secondary"}
                className="text-xs"
              >
                {raga.type === "melakarta" ? "Melakarta" : "Janya"}
              </Badge>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {raga.arohana.slice(0, -1).map((s, i) => (
                <span key={i} className="text-xs text-muted-foreground font-mono">
                  {SWARA_LABELS[s]}{i < raga.arohana.length - 2 ? " -" : ""}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="text-right hidden sm:block">
              <div className="text-xs text-muted-foreground capitalize">{raga.time}</div>
              <div className="text-xs text-primary/80">{raga.mood.split(",")[0].trim()}</div>
            </div>
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-border"
          >
            <div className="p-4 space-y-4">
              <p className="text-sm text-muted-foreground">{raga.description}</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Arohana</div>
                  <div className="flex flex-wrap gap-1">
                    {raga.arohana.map((s, i) => (
                      <span key={i} className="text-xs px-2 py-1 bg-primary/8 text-primary rounded font-mono">
                        {SWARA_LABELS[s]}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Avarohana</div>
                  <div className="flex flex-wrap gap-1">
                    {raga.avarohana.map((s, i) => (
                      <span key={i} className="text-xs px-2 py-1 bg-muted text-foreground rounded font-mono">
                        {SWARA_LABELS[s]}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                {raga.vadiSwara && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="text-xs text-muted-foreground mb-0.5">Vadi</div>
                    <div className="font-semibold">{SWARA_LABELS[raga.vadiSwara]}</div>
                  </div>
                )}
                {raga.samvadiSwara && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="text-xs text-muted-foreground mb-0.5">Samvadi</div>
                    <div className="font-semibold">{SWARA_LABELS[raga.samvadiSwara]}</div>
                  </div>
                )}
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="text-xs text-muted-foreground mb-0.5">Time</div>
                  <div className="font-semibold capitalize">{raga.time}</div>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="text-xs text-muted-foreground mb-0.5">Mood</div>
                  <div className="font-semibold text-xs">{raga.mood.split(",")[0].trim()}</div>
                </div>
              </div>

              {raga.parentMelakarta && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Parent melakarta: </span>
                  <span className="font-medium">{raga.parentMelakarta}</span>
                </div>
              )}

              {raga.characteristicPhrases.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Characteristic Phrases</div>
                  <div className="flex flex-wrap gap-2">
                    {raga.characteristicPhrases.map((phrase, i) => (
                      <code key={i} className="text-xs bg-muted px-2 py-1 rounded text-foreground">
                        {phrase}
                      </code>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function RagaBrowser() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState<TimeOfDay | "all">("all");

  const filtered = useMemo(() => {
    return RAGAS.filter((r) => {
      if (search) {
        const q = search.toLowerCase();
        if (
          !r.name.toLowerCase().includes(q) &&
          !r.alternateName?.toLowerCase().includes(q) &&
          !r.mood.toLowerCase().includes(q)
        )
          return false;
      }
      if (typeFilter !== "all" && r.type !== typeFilter) return false;
      if (timeFilter !== "all" && r.time !== timeFilter) return false;
      return true;
    }).sort((a, b) => {
      if (a.melakartaNumber && b.melakartaNumber) return a.melakartaNumber - b.melakartaNumber;
      if (a.melakartaNumber) return -1;
      if (b.melakartaNumber) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [search, typeFilter, timeFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Raga Browser</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Explore {RAGAS.length} ragas with their structure, characteristics, and lineage
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search ragas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="raga-search"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-40" data-testid="type-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={timeFilter} onValueChange={(v) => setTimeFilter(v as TimeOfDay | "all")}>
          <SelectTrigger className="w-full sm:w-40" data-testid="time-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIME_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Filter className="w-3 h-3" />
        <span>
          {filtered.length} raga{filtered.length !== 1 ? "s" : ""}
          {(search || typeFilter !== "all" || timeFilter !== "all") && " matching filters"}
        </span>
      </div>

      {/* Raga Cards */}
      <div className="space-y-3">
        <AnimatePresence initial={false}>
          {filtered.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16 text-muted-foreground"
            >
              <p className="text-sm">No ragas found. Try adjusting your filters.</p>
            </motion.div>
          ) : (
            filtered.map((raga, i) => (
              <motion.div
                key={raga.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.02, 0.3) }}
              >
                <RagaCard raga={raga} />
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
