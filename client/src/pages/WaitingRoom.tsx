import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import NavBar from "@/components/NavBar";
import { Link, useParams, useLocation } from "wouter";
import { ArrowLeft, Users, Shield, Sparkles, Play, Clock, Gamepad2 } from "lucide-react";
import { toast } from "sonner";

export default function WaitingRoom() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const tournamentQuery = trpc.tournament.get.useQuery({ publicId: id! });
  const participantsQuery = trpc.tournament.participants.useQuery({ publicId: id! });
  const countQuery = trpc.tournament.participantCount.useQuery({ publicId: id! });

  const utils = trpc.useUtils();
  const startGameMutation = trpc.tournament.startGame.useMutation({
    onSuccess: (data) => {
      toast.success("Game started! Redirecting to table...");
      utils.tournament.get.invalidate({ publicId: id! });
      navigate(`/table/${id}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const t = tournamentQuery.data;
  const participants = participantsQuery.data || [];
  const count = countQuery.data || 0;
  const isCreator = t?.creatorId === user?.id;

  if (tournamentQuery.isLoading) {
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

  const handleStart = () => {
    if (count < 2) {
      toast.error("Need at least 2 players to start");
      return;
    }
    startGameMutation.mutate({ publicId: id! });
  };

  const gameTypeLabels: Record<string, string> = {
    nlh: "No-Limit Hold'em",
    plo: "Pot-Limit Omaha",
    plo5: "PLO-5",
    mixed: "Mixed Games",
  };

  return (
    <div className="min-h-screen bg-background">
      <NavBar />

      <div className="pt-20 pb-12 px-4">
        <div className="container max-w-2xl mx-auto">
          {/* Back link */}
          <Link href={`/tournaments/${id}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="w-4 h-4" /> Back to Overview
          </Link>

          {/* Main Waiting Room Card */}
          <div className="epic-card-ornate p-6 sm:p-8 text-center">
            {/* Animated pulse effect */}
            <div className="relative w-20 h-20 mx-auto mb-6">
              <div className="absolute inset-0 rounded-full epic-gradient-purple opacity-20 animate-ping" />
              <div className="relative w-20 h-20 rounded-full epic-gradient-purple flex items-center justify-center">
                <Play className="w-8 h-8 text-white" />
              </div>
            </div>

            <h1 className="font-['Cinzel'] text-xl sm:text-2xl font-bold text-foreground mb-2">{t.name}</h1>
            <p className="text-sm text-muted-foreground mb-6">
              {t.status === "running" ? "Game in progress" : "Waiting for players..."}
            </p>

            {/* Game Info */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-xs text-muted-foreground">Game</p>
                <p className="text-sm font-medium text-foreground">{gameTypeLabels[t.gameType]}</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-xs text-muted-foreground">Table</p>
                <p className="text-sm font-medium text-foreground">{t.tableSize}-max</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-xs text-muted-foreground">Stack</p>
                <p className="text-sm font-medium text-gold">{t.startingChips.toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-xs text-muted-foreground">Mode</p>
                <p className="text-sm font-medium flex items-center justify-center gap-1">
                  {t.provablyFair ? (
                    <><Shield className="w-3.5 h-3.5 text-green-400" /> Fair</>
                  ) : (
                    <><Sparkles className="w-3.5 h-3.5 text-purple-glow" /> Fun</>
                  )}
                </p>
              </div>
            </div>

            {/* Player Count */}
            <div className="flex items-center justify-center gap-2 mb-6">
              <Users className="w-5 h-5 text-purple-glow" />
              <span className="text-lg font-bold text-foreground">{count}</span>
              <span className="text-sm text-muted-foreground">/ {t.maxPlayers} players</span>
            </div>

            {/* Player Avatars */}
            {participants.length > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
                {participants.slice(0, 12).map((p) => (
                  <div key={p.participant.id} className="w-9 h-9 rounded-full bg-secondary border-2 border-border flex items-center justify-center overflow-hidden" title={p.user.displayName || p.user.name || "Player"}>
                    {p.user.avatarUrl ? (
                      <img src={p.user.avatarUrl.includes('cdn.discordapp.com') ? `/api/avatar-proxy?url=${encodeURIComponent(p.user.avatarUrl)}` : p.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-medium text-muted-foreground">
                        {(p.user.displayName || p.user.name || "?").charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                ))}
                {participants.length > 12 && (
                  <div className="w-9 h-9 rounded-full bg-secondary border-2 border-border flex items-center justify-center">
                    <span className="text-xs text-muted-foreground">+{participants.length - 12}</span>
                  </div>
                )}
              </div>
            )}

            {/* Start Button (Creator only, game not yet running) */}
            {isCreator && t.status !== "running" && (
              <button
                onClick={handleStart}
                disabled={startGameMutation.isPending || count < 2}
                className="epic-btn-gold px-8 py-3 rounded-xl text-base font-semibold disabled:opacity-50 flex items-center gap-2 mx-auto"
              >
                <Play className="w-5 h-5" />
                {startGameMutation.isPending ? "Starting..." : "Start Tournament"}
              </button>
            )}

            {/* Join Table button when game is running */}
            {t.status === "running" && (
              <div className="space-y-4 mt-4">
                <div className="epic-card p-4">
                  <div className="flex items-center justify-center gap-2 text-green-400">
                    <Clock className="w-4 h-4 animate-pulse" />
                    <span className="text-sm font-medium">Tournament is running</span>
                  </div>
                </div>
                <button
                  onClick={() => navigate(`/table/${id}`)}
                  className="epic-btn-gold px-8 py-3 rounded-xl text-base font-semibold flex items-center gap-2 mx-auto"
                >
                  <Gamepad2 className="w-5 h-5" />
                  Join Table
                </button>
              </div>
            )}

            {!isCreator && t.status !== "running" && (
              <p className="text-sm text-muted-foreground">
                Waiting for the host to start the tournament...
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
