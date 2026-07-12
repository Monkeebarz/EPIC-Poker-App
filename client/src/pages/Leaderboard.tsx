import NavBar from "@/components/NavBar";
import { Trophy, Crown, Medal } from "lucide-react";

export default function Leaderboard() {
  // Placeholder leaderboard data - will be populated from real tournament results
  const placeholderPlayers = [
    { rank: 1, name: "Coming Soon", wins: 0, chips: 0 },
  ];

  return (
    <div className="min-h-screen bg-background">
      <NavBar />

      <div className="pt-24 pb-12 px-4">
        <div className="container max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="font-['Cinzel'] text-3xl font-bold mb-2">
              <span className="epic-gradient-text">Leaderboard</span>
            </h1>
            <p className="text-muted-foreground text-sm">
              Top EPIC Poker players ranked by tournament performance
            </p>
          </div>

          {/* Leaderboard Table */}
          <div className="epic-card-ornate overflow-hidden">
            <div className="grid grid-cols-[60px_1fr_100px_120px] gap-2 px-5 py-3 bg-secondary/30 border-b border-border/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <span>Rank</span>
              <span>Player</span>
              <span className="text-center">Wins</span>
              <span className="text-right">EPIC Chips</span>
            </div>

            <div className="p-8 text-center">
              <Trophy className="w-12 h-12 text-gold/30 mx-auto mb-4" />
              <h3 className="font-['Cinzel'] text-lg font-bold text-foreground mb-2">No Rankings Yet</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Play tournaments to earn your spot on the leaderboard. Rankings update after each completed tournament.
              </p>
            </div>
          </div>

          {/* Tier Badges */}
          <div className="grid grid-cols-3 gap-4 mt-8">
            <div className="epic-card p-4 text-center">
              <Crown className="w-6 h-6 text-gold mx-auto mb-2" />
              <p className="text-xs font-medium text-gold">1st Place</p>
              <p className="text-[10px] text-muted-foreground mt-1">Gold Crown</p>
            </div>
            <div className="epic-card p-4 text-center">
              <Medal className="w-6 h-6 text-gray-300 mx-auto mb-2" />
              <p className="text-xs font-medium text-gray-300">2nd Place</p>
              <p className="text-[10px] text-muted-foreground mt-1">Silver Medal</p>
            </div>
            <div className="epic-card p-4 text-center">
              <Medal className="w-6 h-6 text-amber-600 mx-auto mb-2" />
              <p className="text-xs font-medium text-amber-600">3rd Place</p>
              <p className="text-[10px] text-muted-foreground mt-1">Bronze Medal</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
