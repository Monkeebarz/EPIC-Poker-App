import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import NavBar from "@/components/NavBar";
import { Link, useLocation } from "wouter";
import { Trophy, Clock, Users, ChevronRight, Plus, Shield, Sparkles } from "lucide-react";

export default function MyTournaments() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  const tournamentsQuery = trpc.tournament.myTournaments.useQuery(undefined, { enabled: isAuthenticated });

  if (!loading && !isAuthenticated) {
    navigate("/login?redirect=/my-tournaments");
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-glow border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const tournaments = tournamentsQuery.data || [];

  return (
    <div className="min-h-screen bg-background">
      <NavBar />

      <div className="pt-20 pb-12 px-4">
        <div className="container max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="font-['Cinzel'] text-2xl font-bold">
              <span className="epic-gradient-text">My Tournaments</span>
            </h1>
            <Link href="/tournaments/create" className="epic-btn-gold px-4 py-2 rounded-lg text-sm flex items-center gap-2">
              <Plus className="w-4 h-4" /> Create
            </Link>
          </div>

          {tournamentsQuery.isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="epic-card p-4 animate-pulse">
                  <div className="h-4 bg-secondary rounded w-1/3 mb-2" />
                  <div className="h-3 bg-secondary rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : tournaments.length > 0 ? (
            <div className="space-y-3">
              {tournaments.map((t) => (
                <Link key={t.publicId} href={`/tournaments/${t.publicId}`} className="epic-card p-4 epic-card-hover flex items-center justify-between block">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-foreground text-sm truncate">{t.name}</h3>
                      <StatusBadge status={t.status} />
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {t.gameType.toUpperCase()}
                      </span>
                      <span>{t.tableSize}-max</span>
                      <span>{t.startingChips.toLocaleString()} chips</span>
                      {t.provablyFair ? (
                        <span className="flex items-center gap-1 text-green-400">
                          <Shield className="w-3 h-3" /> Fair
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-purple-glow">
                          <Sparkles className="w-3 h-3" /> Ent.
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </Link>
              ))}
            </div>
          ) : (
            <div className="epic-card p-8 text-center">
              <Trophy className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-4">You haven't created any tournaments yet.</p>
              <Link href="/tournaments/create" className="epic-btn-primary px-5 py-2 rounded-lg text-sm inline-block">
                Create Your First Tournament
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    scheduled: "bg-blue-500/20 text-blue-300",
    registering: "bg-green-500/20 text-green-300",
    running: "bg-yellow-500/20 text-yellow-300",
    completed: "bg-gray-500/20 text-gray-300",
    cancelled: "bg-red-500/20 text-red-300",
    draft: "bg-gray-500/20 text-gray-400",
    paused: "bg-orange-500/20 text-orange-300",
  };

  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${colors[status] || colors.draft}`}>
      {status}
    </span>
  );
}
