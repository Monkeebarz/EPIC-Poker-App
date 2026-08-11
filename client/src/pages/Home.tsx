import { ArrowRight, Layers3, ShieldCheck, Sparkles, Trophy, UsersRound } from "lucide-react";
import { Link } from "wouter";
import { GlassIcon, PageShell, buttonClass } from "@/components/SiteChrome";

const features = [
  { icon: Trophy, title: "Full Tournament Control", text: "Craft blind structures, antes, breaks, late registration, and every detail of your table." },
  { icon: ShieldCheck, title: "Provably Fair", text: "HMAC-SHA256 verified shuffles keep every hand transparent and independently verifiable." },
  { icon: UsersRound, title: "Multi-Table Support", text: "Host serious tournaments with automatic table balancing and seamless transitions." },
  { icon: Sparkles, title: "Instant Setup", text: "Launch a tournament in seconds with presets or build a structure made for your circle." },
  { icon: Layers3, title: "Subscription Tiers", text: "Choose the level of access that matches your table, from Free play to the EPIC tier." },
];

export default function Home() {
  return (
    <PageShell>
      <section className="hero-section">
        <div className="hero-kicker"><span className="kicker-dot" /> Free Play · EPIC Poker</div>
        <h1>THE TABLE<br /><span>AWAITS.</span></h1>
        <p className="hero-lede">A premium tournament platform for serious players. Build your table, sharpen your edge, and prove your skill inside the circle.</p>
        <div className="hero-actions">
          <Link href="/subscriptions" className={buttonClass}>View Subscriptions <ArrowRight size={16} /></Link>
          <Link href="/admin" className="text-link">Admin panel <ArrowRight size={14} /></Link>
        </div>
      </section>

      <section className="feature-section page-width">
        <div className="section-heading compact-heading">
          <GlassIcon kind="sparkles" />
          <p className="section-eyebrow">THE INNER CIRCLE</p>
          <h2>Premium Tournament Platform</h2>
          <p className="section-description">Everything you need to run a professional poker night with your crew.</p>
        </div>
        <div className="feature-grid">
          {features.map(({ icon: Icon, title, text }) => (
            <article className="feature-card" key={title}>
              <div className="feature-icon"><Icon size={18} /></div>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="home-cta page-width">
        <div>
          <p className="section-eyebrow">CHOOSE YOUR LEVEL</p>
          <h2>Ready to enter the circle?</h2>
        </div>
        <Link href="/subscriptions" className={buttonClass}>Explore tiers <ArrowRight size={16} /></Link>
      </section>

      <footer className="site-footer page-width">Free play only · EPIC Poker is a competitive platform for EPIC players.</footer>
    </PageShell>
  );
}
