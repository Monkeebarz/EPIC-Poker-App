import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import NavBar from "@/components/NavBar";
import { Link, useLocation } from "wouter";
import { Trophy, Clock, ChevronRight, Users } from "lucide-react";

export default function MyParticipations() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  const participationsQuery = trpc.tournament.myParticipations.useQuery(undefined, { enabled: isAuthenticated });

  if (!loading && !isAuthenticated) {
    navigate("/login?redirect=/my-participations");
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-glow border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const participations = participationsQuery.data || [];

  return (
    <div className="min-h-screen bg-background">
      <NavBar />

      <div className="pt-20 pb-12 px-4">
        <div className="container max-w-4xl mx-auto">
          <h1 className="font-['Cinzel'] text-2xl font-bold mb-6">
            <span className="epic-gradient-text">My Participations</span>
          </h1>

          {participationsQuery.isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="epic-card p-4 animate-pulse">
                  <div className="h-4 bg-secondary rounded w-1/3 mb-2" />
                  <div className="h-3 bg-secondary rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : participations.length > 0 ? (
            <div className="space-y-3">
              {participations.map((p) => (
                <Link key={p.participant.id} href={`/tournaments/${p.tournament.publicId}`} className="epic-card p-4 epic-card-hover flex items-center justify-between block">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-foreground text-sm truncate">{p.tournament.name}</h3>
                      <StatusBadge status={p.participant.status} />
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(p.participant.registeredAt).toLocaleDateString()}
                      </span>
                      <span>{p.tournament.gameType.toUpperCase()}</span>
                      {p.participant.finishPosition && (
                        <span className="text-gold font-medium">
                          {ordinal(p.participant.finishPosition)} place
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
              <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-4">You haven't joined any tournaments yet.</p>
              <Link href="/dashboard" className="epic-btn-primary px-5 py-2 rounded-lg text-sm inline-block">
                Browse Tournaments
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
    registered: "bg-blue-500/20 text-blue-300",
    playing: "bg-green-500/20 text-green-300",
    eliminated: "bg-red-500/20 text-red-300",
    winner: "bg-gold/20 text-gold",
  };

  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${colors[status] || "bg-gray-500/20 text-gray-300"}`}>
      {status}
    </span>
  );
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
