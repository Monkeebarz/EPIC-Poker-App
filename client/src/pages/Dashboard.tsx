import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import NavBar from "@/components/NavBar";
import { Link, useLocation } from "wouter";
import { Plus, Trophy, Users, ChevronRight, Shield, Sparkles, Crown, Star, Eye } from "lucide-react";

export default function Dashboard() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  const tournamentsQuery = trpc.tournament.list.useQuery();
  const myParticipations = trpc.tournament.myParticipations.useQuery(undefined, { enabled: isAuthenticated });

  if (!loading && !isAuthenticated) {
    navigate("/login?redirect=/dashboard");
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-glow border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const activeTournaments = tournamentsQuery.data?.filter(t => t.status === "running") || [];
  const upcomingTournaments = tournamentsQuery.data?.filter(t => t.status === "scheduled" || t.status === "registering") || [];
  const recentActivity = myParticipations.data?.slice(0, 5) || [];
  const tier = user?.subscriptionTier || "free";

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <NavBar />

      <div className="pt-20 pb-8 px-4">
        <div className="container max-w-6xl mx-auto">

          {/* Welcome Banner */}
          <div className="text-center mb-8 pt-4">
            <h1 className="font-['Cinzel'] text-3xl sm:text-4xl md:text-5xl font-bold text-foreground tracking-wide mb-3">
              Welcome Back, <span className="text-gold">{user?.displayName || user?.name || 'Player'}</span>
            </h1>
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-sm text-muted-foreground">
              <span className="capitalize">{tier} Member</span>
              <span className="text-gold/50">•</span>
              <span>{user?.gamesPlayed || 0} tournaments played</span>
              <span className="text-gold/50">•</span>
              <span>{(user?.epicChips || 10000).toLocaleString()} EPIC Chips</span>
            </div>
          </div>

          {/* Quick Action Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <QuickActionCard
              title="Create Tournament"
              icon={<Trophy className="w-8 h-8 text-gold" />}
              buttonText="CREATE TOURNAMENT"
              href="/tournaments/create"
              variant="gold"
            />
            <QuickActionCard
              title="Join Game"
              icon={<Users className="w-8 h-8 text-purple-glow" />}
              buttonText="JOIN GAME"
              href="#lobby"
              variant="purple"
              onClick={() => {
                const el = document.getElementById("lobby-section");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
            />
            <QuickActionCard
              title="Leaderboard"
              icon={<Crown className="w-8 h-8 text-gold" />}
              buttonText="VIEW LEADERBOARD"
              href="/leaderboard"
              variant="outline"
            />
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
            {/* Recent Activity - Left */}
            <div className="lg:col-span-3 epic-card-ornate p-5">
              <div className="flex items-center gap-2 mb-4">
                <Star className="w-4 h-4 text-gold" />
                <h2 className="font-['Cinzel'] text-sm font-bold tracking-widest uppercase text-foreground">Recent Activity</h2>
              </div>

              {recentActivity.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-muted-foreground uppercase tracking-wider border-b border-border/50">
                        <th className="text-left pb-2 pr-4">Tournament</th>
                        <th className="text-left pb-2 pr-4 hidden sm:table-cell">Date</th>
                        <th className="text-left pb-2 pr-4">Place</th>
                        <th className="text-right pb-2">Winnings</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentActivity.map((p, i) => (
                        <tr key={i} className="border-b border-border/20 last:border-0">
                          <td className="py-2.5 pr-4">
                            <div className="flex items-center gap-2">
                              <Trophy className="w-3.5 h-3.5 text-gold/60 shrink-0" />
                              <span className="text-foreground truncate max-w-[140px]">{p.tournament.name}</span>
                            </div>
                          </td>
                          <td className="py-2.5 pr-4 text-muted-foreground hidden sm:table-cell">
                            {new Date(p.participant.registeredAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </td>
                          <td className="py-2.5 pr-4 text-foreground font-medium">
                            {p.participant.finishPosition ? `${ordinal(p.participant.finishPosition)}` : "—"}
                          </td>
                          <td className="py-2.5 text-right font-medium">
                            <span className={p.participant.status === "winner" ? "text-green-400" : "text-muted-foreground"}>
                              {p.participant.status === "winner" ? "+500" : "—"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Trophy className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No recent activity yet.</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Join a tournament to get started!</p>
                </div>
              )}

              {recentActivity.length > 0 && (
                <Link href="/my-participations" className="flex items-center justify-center gap-1 mt-4 text-xs text-gold/80 hover:text-gold transition-colors uppercase tracking-wider">
                  View All Activity <ChevronRight className="w-3 h-3" />
                </Link>
              )}
            </div>

            {/* Right Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Active Tournaments */}
              <div className="epic-card-ornate p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-glow" />
                    <h2 className="font-['Cinzel'] text-sm font-bold tracking-widest uppercase text-foreground">Active Tournaments</h2>
                  </div>
                  {activeTournaments.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/20 text-green-300 border border-green-500/30">
                      {activeTournaments.length} RUNNING
                    </span>
                  )}
                </div>

                {activeTournaments.length > 0 ? (
                  <div className="space-y-2">
                    {activeTournaments.slice(0, 3).map(t => (
                      <Link key={t.publicId} href={`/tournaments/${t.publicId}`} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-white/5 transition-colors">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-purple-glow/20 flex items-center justify-center">
                            <Users className="w-3.5 h-3.5 text-purple-glow" />
                          </div>
                          <span className="text-sm text-foreground truncate max-w-[120px]">{t.name}</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No active games right now</p>
                )}
              </div>

              {/* Upcoming Games */}
              <div className="epic-card-ornate p-5" id="lobby-section">
                <div className="flex items-center gap-2 mb-4">
                  <Eye className="w-4 h-4 text-gold" />
                  <h2 className="font-['Cinzel'] text-sm font-bold tracking-widest uppercase text-foreground">Upcoming Games</h2>
                </div>

                {upcomingTournaments.length > 0 ? (
                  <div className="space-y-2">
                    {upcomingTournaments.slice(0, 4).map(t => (
                      <Link key={t.publicId} href={`/tournaments/${t.publicId}`} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-white/5 transition-colors">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gold/10 flex items-center justify-center">
                            <Trophy className="w-3.5 h-3.5 text-gold" />
                          </div>
                          <span className="text-sm text-foreground truncate max-w-[120px]">{t.name}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {t.status === "registering" ? "Open" : "Soon"}
                        </span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground">No upcoming games</p>
                    <Link href="/tournaments/create" className="text-xs text-gold hover:underline mt-1 inline-block">
                      Create one →
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Subscription Tier Bar */}
          <div className="epic-card-ornate p-4 sm:p-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <TierCard name="Free" tagline="Get started" icon={<Shield className="w-5 h-5" />} active={tier === "free"} />
              <TierCard name="Pro" tagline="More games. More action." icon={<Star className="w-5 h-5" />} active={tier === "pro"} />
              <TierCard name="Club" tagline="Exclusive events. Bigger wins." icon={<Crown className="w-5 h-5" />} active={tier === "club"} />
              <TierCard name="Elite" tagline="Unlimited access. Zero limits." icon={<EyeIcon />} active={tier === "elite"} />
            </div>
            <div className="text-center mt-4 pt-3 border-t border-border/30">
              <p className="text-xs text-muted-foreground">
                {tier === "elite" ? (
                  <span className="text-gold">✦ YOU'RE AT THE TOP. UNLIMITED TOURNAMENTS. ✦</span>
                ) : (
                  <Link href="/pricing" className="text-gold/80 hover:text-gold transition-colors">
                    Upgrade your tier for more features →
                  </Link>
                )}
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function QuickActionCard({ title, icon, buttonText, href, variant, onClick }: {
  title: string;
  icon: React.ReactNode;
  buttonText: string;
  href: string;
  variant: "gold" | "purple" | "outline";
  onClick?: () => void;
}) {
  const btnClass = variant === "gold"
    ? "epic-btn-gold"
    : variant === "purple"
    ? "epic-btn-primary"
    : "border border-gold/50 text-gold hover:bg-gold/10";

  const content = (
    <div className="epic-card-ornate p-5 text-center epic-card-hover h-full flex flex-col items-center justify-center gap-4">
      <div className="w-14 h-14 rounded-full bg-[#1a1a2e] border border-border/50 flex items-center justify-center mx-auto">
        {icon}
      </div>
      <h3 className="font-['Cinzel'] text-base sm:text-lg font-bold text-foreground tracking-wide">{title}</h3>
      <span className={`${btnClass} px-5 py-2 rounded-lg text-xs font-semibold tracking-wider uppercase flex items-center gap-2`}>
        {buttonText} <ChevronRight className="w-3.5 h-3.5" />
      </span>
    </div>
  );

  if (onClick) {
    return <button onClick={onClick} className="text-left">{content}</button>;
  }

  return <Link href={href}>{content}</Link>;
}

function TierCard({ name, tagline, icon, active }: { name: string; tagline: string; icon: React.ReactNode; active: boolean }) {
  return (
    <div className={`relative rounded-xl p-3 sm:p-4 text-center transition-all ${
      active
        ? "bg-gold/10 border-2 border-gold shadow-[0_0_20px_rgba(212,175,55,0.2)]"
        : "bg-[#12121a] border border-border/30"
    }`}>
      <div className={`w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center ${
        active ? "text-gold" : "text-muted-foreground"
      }`}>
        {icon}
      </div>
      <p className={`font-['Cinzel'] text-sm sm:text-base font-bold ${active ? "text-gold" : "text-foreground"}`}>
        {name.toUpperCase()}
      </p>
      <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 hidden sm:block">{tagline}</p>
      {active && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-gold text-black text-[9px] font-bold rounded-full uppercase tracking-wider">
          Current
        </div>
      )}
    </div>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
      <path d="M12 3L2 9l10 6 10-6-10-6z" />
      <circle cx="12" cy="10" r="2" />
      <path d="M12 16v5" />
    </svg>
  );
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
