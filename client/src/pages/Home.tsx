import { useAuth } from "@/_core/hooks/useAuth";
import NavBar from "@/components/NavBar";
import { Link } from "wouter";
import { Trophy, Shield, Users, Zap, Star, Crown } from "lucide-react";

export default function Home() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <NavBar />

      {/* Hero Section */}
      <section className="relative pt-24 pb-20 px-4 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-[oklch(0.55_0.25_295_/_0.08)] blur-[100px]" />
          <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] rounded-full bg-[oklch(0.82_0.12_85_/_0.05)] blur-[80px]" />
        </div>

        <div className="relative container max-w-4xl mx-auto text-center">
          {/* Logo with pulsing purple glow */}
          <div className="relative inline-block mx-auto mb-8">
            {/* Pulsing glow layer */}
            <div className="absolute inset-0 rounded-full blur-[60px] bg-[oklch(0.55_0.28_295_/_0.55)] scale-75 animate-[epicGlow_3s_ease-in-out_infinite]" />
            <div className="absolute inset-0 rounded-full blur-[100px] bg-[oklch(0.45_0.22_295_/_0.35)] scale-90 animate-[epicGlow_3s_ease-in-out_infinite_1.5s]" />
            {/* Logo image */}
            <img
              src="/epic-logo.png"
              alt="EPIC Poker"
              className="relative w-64 sm:w-80 md:w-96 lg:w-[28rem] drop-shadow-[0_0_40px_oklch(0.55_0.28_295_/_0.6)]"
            />
          </div>

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border bg-secondary/50 mb-6">
            <Star className="w-3.5 h-3.5 text-gold" />
            <span className="text-xs font-medium text-muted-foreground">Free Play • EPIC Chips</span>
          </div>

          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            The elite poker platform for serious players. Create tournaments with full customization, 
            compete with friends, and prove your skill at the table.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {isAuthenticated ? (
              <Link href="/dashboard" className="epic-btn-gold px-8 py-3.5 rounded-xl text-base font-semibold w-full sm:w-auto text-center">
                Enter Lobby
              </Link>
            ) : (
              <>
                <Link href="/register" className="epic-btn-gold px-8 py-3.5 rounded-xl text-base font-semibold w-full sm:w-auto text-center">
                  Join the Circle
                </Link>
                <Link href="/login" className="epic-btn-primary px-8 py-3.5 rounded-xl text-base font-medium w-full sm:w-auto text-center">
                  Sign In
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4">
        <div className="container max-w-6xl mx-auto">
          <h2 className="font-['Cinzel'] text-2xl sm:text-3xl font-bold text-center mb-4">
            <span className="text-gold">Premium</span> Tournament Platform
          </h2>
          <p className="text-muted-foreground text-center mb-12 max-w-xl mx-auto">
            Everything you need to run professional poker tournaments with your crew.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Trophy className="w-6 h-6 text-gold" />}
              title="Full Tournament Control"
              description="Custom blind structures, antes, breaks, late registration — every detail configurable like PokerNow."
            />
            <FeatureCard
              icon={<Shield className="w-6 h-6 text-purple-glow" />}
              title="Provably Fair"
              description="HMAC-SHA256 verified shuffles. Every hand can be independently verified for complete transparency."
            />
            <FeatureCard
              icon={<Users className="w-6 h-6 text-gold" />}
              title="Multi-Table Support"
              description="Host tournaments up to 888 players with automatic table balancing and seamless transitions."
            />
            <FeatureCard
              icon={<Zap className="w-6 h-6 text-purple-glow" />}
              title="Instant Setup"
              description="Create a tournament in seconds with preset structures or build your own from scratch."
            />
            <FeatureCard
              icon={<Crown className="w-6 h-6 text-gold" />}
              title="Subscription Tiers"
              description="From free play to Elite — unlock larger tournaments, custom themes, and club features."
            />
            <FeatureCard
              icon={<Star className="w-6 h-6 text-purple-glow" />}
              title="EPIC Chips Economy"
              description="Free play with EPIC Chips. No real money, no risk — just pure competitive poker."
            />
          </div>
        </div>
      </section>

      {/* Game Types Section */}
      <section className="py-20 px-4 border-t border-border">
        <div className="container max-w-4xl mx-auto text-center">
          <h2 className="font-['Cinzel'] text-2xl sm:text-3xl font-bold mb-4">
            Multiple <span className="text-purple-glow">Game Types</span>
          </h2>
          <p className="text-muted-foreground mb-10">
            Play the variants you love with full customization.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {["No-Limit Hold'em", "Pot-Limit Omaha", "PLO-5", "Mixed Games"].map((game) => (
              <div key={game} className="epic-card p-4 text-center epic-card-hover">
                <p className="text-sm font-medium text-foreground">{game}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 grid grid-cols-3 gap-4 max-w-md mx-auto">
            {["6-Max", "9-Max", "10-Max"].map((size) => (
              <div key={size} className="epic-card p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">Table Size</p>
                <p className="text-lg font-bold text-gold">{size}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 border-t border-border">
        <div className="container max-w-3xl mx-auto text-center">
          <h2 className="font-['Cinzel'] text-2xl sm:text-3xl font-bold mb-4">
            Ready to <span className="epic-gradient-text">Play</span>?
          </h2>
          <p className="text-muted-foreground mb-8">
            Join the elite circle of poker players. Free to start, premium to dominate.
          </p>
          {!isAuthenticated && (
            <Link href="/register" className="epic-btn-gold px-8 py-3.5 rounded-xl text-base font-semibold inline-block">
              Create Your Account
            </Link>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4">
        <div className="container max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/epic-logo.png" alt="EPIC Poker" className="h-8 w-auto" />
          </div>
          <p className="text-xs text-muted-foreground">
            Free play only • EPIC Chips have no monetary value
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="epic-card p-6 epic-card-hover">
      <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}
