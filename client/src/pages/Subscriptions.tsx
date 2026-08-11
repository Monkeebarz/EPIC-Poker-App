import { Check, Crown, Gem, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { GlassIcon, PageShell, buttonClass } from "@/components/SiteChrome";
import { trpc } from "@/lib/trpc";

type Tier = {
  id: number;
  name: string;
  price: string;
  description: string | null;
  perks: string[];
  badgeColor: string | null;
  featured: boolean | null;
  sortOrder: number | null;
};

const fallbackTiers: Tier[] = [
  { id: 1, name: "Free", price: "0.00", description: "Start your journey inside the circle.", perks: [], badgeColor: "#8b7bb8", featured: false, sortOrder: 0 },
  { id: 2, name: "Pro", price: "9.69", description: "More control for more serious tables.", perks: [], badgeColor: "#9b5de5", featured: false, sortOrder: 1 },
  { id: 3, name: "Elite", price: "19.69", description: "A sharper edge for the committed player.", perks: [], badgeColor: "#b78cff", featured: false, sortOrder: 2 },
  { id: 4, name: "EPIC", price: "29.69", description: "The complete inner-circle experience.", perks: [], badgeColor: "#D4AF37", featured: true, sortOrder: 3 },
];

function tierIcon(name: string) {
  if (name === "EPIC") return Crown;
  if (name === "Elite") return Gem;
  if (name === "Pro") return Sparkles;
  return Sparkles;
}

export default function Subscriptions() {
  const { data, isLoading } = trpc.subscriptions.list.useQuery();
  const tiers = (data?.length ? data : fallbackTiers) as Tier[];

  return (
    <PageShell className="subscriptions-page">
      <section className="subscriptions-intro page-width">
        <SectionTitle />
        <p className="section-description">Choose the level of access that matches your table. Every tier keeps the game competitive, intentional, and inside the circle.</p>
      </section>

      <section className="tier-grid page-width" aria-label="Subscription tiers">
        {isLoading && !data ? fallbackTiers.map(tier => <TierCard key={tier.id} tier={tier} loading />) : tiers.map(tier => <TierCard key={tier.id} tier={tier} />)}
      </section>

      <div className="subscription-note page-width">
        <span className="note-line" />
        <p>Subscriptions are coming soon. Contact the EPIC circle to learn more.</p>
        <span className="note-line" />
      </div>
      <Link href="/" className="back-link page-width">Return home</Link>
    </PageShell>
  );
}

function SectionTitle() {
  return (
    <div className="section-heading">
      <GlassIcon kind="crown" />
      <p className="section-eyebrow">THE CIRCLE HAS LEVELS</p>
      <h1>Subscriptions</h1>
    </div>
  );
}

function TierCard({ tier, loading = false }: { tier: Tier; loading?: boolean }) {
  const Icon = tierIcon(tier.name);
  const featured = tier.featured || tier.name.toUpperCase() === "EPIC";
  const cardClass = `tier-card tier-${tier.name.toLowerCase()} ${featured ? "tier-featured" : ""}`;
  const badgeStyle = { borderColor: tier.badgeColor || "#D4AF37", color: tier.badgeColor || "#D4AF37" };

  return (
    <article className={cardClass} style={{ "--tier-color": tier.badgeColor || "#D4AF37" } as React.CSSProperties}>
      {featured ? <div className="featured-badge" style={{ backgroundColor: tier.badgeColor || "#D4AF37" }}>BEST VALUE</div> : null}
      <div className="tier-card-top">
        <div className="tier-icon" style={badgeStyle}><Icon size={22} strokeWidth={1.4} /></div>
        <p className="tier-overline">{tier.name === "Free" ? "ENTRY" : tier.name === "EPIC" ? "THE INNER CIRCLE" : "ELEVATED PLAY"}</p>
        <h2>{tier.name}</h2>
        <div className="tier-price"><span>$</span>{Number(tier.price).toFixed(2)}<small>/mo</small></div>
        <p className="tier-description">{tier.description || "A tier built for the way you play."}</p>
      </div>
      <div className="tier-rule" />
      <div className="perks-list">
        {loading ? <span className="empty-perks">Preparing the tier details…</span> : tier.perks.length ? tier.perks.map((perk, index) => <div className="perk-row" key={`${tier.id}-${index}`}><Check size={15} /><span>{perk}</span></div>) : <span className="empty-perks">Perks will be revealed soon.</span>}
      </div>
      <button type="button" className={`${buttonClass} tier-button`} disabled>Coming Soon</button>
    </article>
  );
}
