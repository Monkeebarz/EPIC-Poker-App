import { useAuth } from "@/_core/hooks/useAuth";
import NavBar from "@/components/NavBar";
import { Link } from "wouter";
import { Check, Crown, Star, Shield, Zap } from "lucide-react";
import { toast } from "sonner";

const tiers = [
  {
    name: "Free",
    price: "$0",
    period: "",
    description: "Get started with EPIC Poker",
    icon: <Shield className="w-6 h-6" />,
    features: [
      "10,000 starting EPIC Chips",
      "Create up to 3 tournaments",
      "Join unlimited public games",
      "Basic blind structure presets",
      "Standard table themes",
    ],
    cta: "Current Plan",
    popular: false,
  },
  {
    name: "Pro",
    price: "$9.99",
    period: "/mo",
    description: "More games. More action.",
    icon: <Star className="w-6 h-6" />,
    features: [
      "50,000 starting EPIC Chips",
      "Create up to 20 tournaments",
      "Custom blind structures",
      "Priority table seating",
      "Tournament history & stats",
      "Pro badge on profile",
    ],
    cta: "Upgrade to Pro",
    popular: false,
  },
  {
    name: "Club",
    price: "$19.99",
    period: "/mo",
    description: "Exclusive events. Bigger wins.",
    icon: <Crown className="w-6 h-6" />,
    features: [
      "200,000 starting EPIC Chips",
      "Unlimited tournaments",
      "Club-exclusive events",
      "Advanced analytics dashboard",
      "Custom table themes",
      "Priority support",
      "Club badge on profile",
    ],
    cta: "Upgrade to Club",
    popular: true,
  },
  {
    name: "Elite",
    price: "$39.69",
    period: "/mo",
    description: "Unlimited access. Zero limits.",
    icon: <EyeIcon />,
    features: [
      "1,000,000 starting EPIC Chips",
      "Unlimited everything",
      "Elite-only high roller events",
      "Private table creation",
      "Full tournament analytics",
      "Custom avatars & themes",
      "Elite badge & gold name",
      "Early access to new features",
    ],
    cta: "Upgrade to Elite",
    popular: false,
  },
];

export default function Pricing() {
  const { user, isAuthenticated } = useAuth();
  const currentTier = user?.subscriptionTier || "free";

  const handleUpgrade = (tierName: string) => {
    if (tierName.toLowerCase() === currentTier) {
      toast.info("You're already on this plan!");
      return;
    }
    toast.info("Stripe integration coming soon! Subscription management will be available shortly.");
  };

  return (
    <div className="min-h-screen bg-background">
      <NavBar />

      <div className="pt-24 pb-16 px-4">
        <div className="container max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="font-['Cinzel'] text-3xl sm:text-4xl font-bold mb-3">
              <span className="epic-gradient-text">Choose Your Tier</span>
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Unlock premium features and dominate the tables. All tiers include free play with EPIC Chips.
            </p>
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
            {tiers.map((tier) => {
              const isActive = tier.name.toLowerCase() === currentTier;
              return (
                <div
                  key={tier.name}
                  className={`relative rounded-xl p-5 flex flex-col ${
                    tier.popular
                      ? "border-2 border-gold shadow-[0_0_30px_rgba(212,175,55,0.15)]"
                      : isActive
                      ? "border-2 border-purple-glow/60"
                      : "border border-border"
                  } bg-card`}
                >
                  {tier.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-gold text-black text-[10px] font-bold rounded-full uppercase tracking-wider">
                      Most Popular
                    </div>
                  )}
                  {isActive && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-primary text-white text-[10px] font-bold rounded-full uppercase tracking-wider">
                      Current
                    </div>
                  )}

                  <div className="text-center mb-4 pt-2">
                    <div className={`w-10 h-10 rounded-full mx-auto mb-3 flex items-center justify-center ${
                      tier.popular ? "text-gold" : "text-purple-glow"
                    }`}>
                      {tier.icon}
                    </div>
                    <h3 className="font-['Cinzel'] text-lg font-bold text-foreground">{tier.name}</h3>
                    <div className="mt-2">
                      <span className="text-2xl font-bold text-foreground">{tier.price}</span>
                      <span className="text-sm text-muted-foreground">{tier.period}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{tier.description}</p>
                  </div>

                  <ul className="space-y-2 flex-1 mb-5">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handleUpgrade(tier.name)}
                    className={`w-full py-2.5 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? "bg-secondary text-muted-foreground cursor-default"
                        : tier.popular
                        ? "epic-btn-gold"
                        : "epic-btn-primary"
                    }`}
                    disabled={isActive}
                  >
                    {isActive ? "Current Plan" : tier.cta}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Footer note */}
          <p className="text-center text-xs text-muted-foreground mt-8">
            All subscriptions are powered by Stripe. EPIC Chips have no monetary value — this is free play only.
          </p>
        </div>
      </div>
    </div>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
      <path d="M12 3L2 9l10 6 10-6-10-6z" />
      <circle cx="12" cy="10" r="2" />
      <path d="M12 16v5" />
    </svg>
  );
}
