import { trpc } from "@/lib/trpc";
import NavBar from "@/components/NavBar";
import { Link, useParams } from "wouter";
import { ArrowLeft, Coffee, Clock } from "lucide-react";

export default function TournamentStructure() {
  const { id } = useParams<{ id: string }>();

  const tournamentQuery = trpc.tournament.get.useQuery({ publicId: id! });
  const blindsQuery = trpc.tournament.blindLevels.useQuery({ publicId: id! });

  const t = tournamentQuery.data;
  const levels = blindsQuery.data || [];

  if (tournamentQuery.isLoading || blindsQuery.isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-glow border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!t) {
    return (
      <div className="min-h-screen bg-background">
        <NavBar />
        <div className="pt-24 text-center">
          <p className="text-muted-foreground">Tournament not found</p>
        </div>
      </div>
    );
  }

  // Calculate cumulative time
  let cumulativeMinutes = 0;
  const levelsWithTime = levels.map(l => {
    const startMin = cumulativeMinutes;
    cumulativeMinutes += l.duration;
    return { ...l, startMin, endMin: cumulativeMinutes };
  });

  const totalDuration = cumulativeMinutes;
  let blindLevelCount = 0;

  return (
    <div className="min-h-screen bg-background">
      <NavBar />

      <div className="pt-20 pb-12 px-4">
        <div className="container max-w-3xl mx-auto">
          {/* Back link */}
          <Link href={`/tournaments/${id}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="w-4 h-4" /> Back to Tournament
          </Link>

          <div className="epic-card p-6 mb-6">
            <h1 className="font-['Cinzel'] text-xl sm:text-2xl font-bold text-foreground mb-2">{t.name}</h1>
            <p className="text-sm text-muted-foreground">Blind Structure • {levels.filter(l => !l.isBreak).length} levels • ~{formatDuration(totalDuration)} total</p>
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="epic-card p-3 text-center">
              <p className="text-xs text-muted-foreground">Starting Stack</p>
              <p className="text-lg font-bold text-gold">{t.startingChips.toLocaleString()}</p>
            </div>
            <div className="epic-card p-3 text-center">
              <p className="text-xs text-muted-foreground">Levels</p>
              <p className="text-lg font-bold text-foreground">{levels.filter(l => !l.isBreak).length}</p>
            </div>
            <div className="epic-card p-3 text-center">
              <p className="text-xs text-muted-foreground">Breaks</p>
              <p className="text-lg font-bold text-foreground">{levels.filter(l => l.isBreak).length}</p>
            </div>
            <div className="epic-card p-3 text-center">
              <p className="text-xs text-muted-foreground">Total Time</p>
              <p className="text-lg font-bold text-foreground">{formatDuration(totalDuration)}</p>
            </div>
          </div>

          {/* Blind Schedule Table */}
          <div className="epic-card-ornate overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-[50px_1fr_1fr_1fr_80px_80px] gap-2 px-4 py-3 bg-secondary/30 border-b border-border/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <span>Level</span>
              <span>Small Blind</span>
              <span>Big Blind</span>
              <span>Ante</span>
              <span>Duration</span>
              <span className="text-right">Time</span>
            </div>

            {/* Levels */}
            <div className="divide-y divide-border/30">
              {levelsWithTime.map((level) => {
                if (!level.isBreak) blindLevelCount++;
                return level.isBreak ? (
                  <div key={level.id} className="grid grid-cols-1 gap-2 px-4 py-3 bg-gold/5 border-l-4 border-l-gold/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Coffee className="w-4 h-4 text-gold" />
                        <span className="text-sm font-medium text-gold">{level.breakName || "Break"}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{level.duration} min</span>
                        <span>{formatTime(level.startMin)} - {formatTime(level.endMin)}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div key={level.id} className="grid grid-cols-[50px_1fr_1fr_1fr_80px_80px] gap-2 px-4 py-3 hover:bg-white/[0.02] transition-colors">
                    <span className="text-sm font-medium text-muted-foreground">{blindLevelCount}</span>
                    <span className="text-sm text-foreground font-medium">{level.smallBlind.toLocaleString()}</span>
                    <span className="text-sm text-foreground font-medium">{level.bigBlind.toLocaleString()}</span>
                    <span className="text-sm text-muted-foreground">{level.ante > 0 ? level.ante.toLocaleString() : "—"}</span>
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {level.duration}m
                    </span>
                    <span className="text-sm text-muted-foreground text-right">{formatTime(level.startMin)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Late Registration Info */}
          {t.lateRegistration && (
            <div className="mt-4 epic-card p-4 flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <p className="text-sm text-muted-foreground">
                Late registration open through Level {t.lateRegLevels}
                {levelsWithTime.filter(l => !l.isBreak).length >= (t.lateRegLevels || 0) && (
                  <span className="text-foreground ml-1">
                    (~{formatTime(levelsWithTime.filter(l => !l.isBreak)[(t.lateRegLevels || 1) - 1]?.endMin || 0)})
                  </span>
                )}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}:${mins.toString().padStart(2, "0")}`;
}
