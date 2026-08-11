import { Crown, Sparkles } from "lucide-react";
import { Link } from "wouter";
import type { CSSProperties, ReactNode } from "react";

const dust = Array.from({ length: 26 }, (_, index) => ({
  left: `${(index * 37) % 100}%`,
  top: `${(index * 61) % 100}%`,
  delay: `${(index % 9) * 0.7}s`,
  duration: `${5 + (index % 6)}s`,
  size: `${index % 3 === 0 ? 3 : 2}px`,
}));

export function DustParticles() {
  return (
    <div className="dust-field" aria-hidden="true">
      {dust.map((particle, index) => (
        <span
          className="dust-particle"
          key={index}
          style={
            {
              left: particle.left,
              top: particle.top,
              width: particle.size,
              height: particle.size,
              animationDelay: particle.delay,
              animationDuration: particle.duration,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

export function GlassIcon({ kind = "crown" }: { kind?: "crown" | "sparkles" }) {
  const Icon = kind === "sparkles" ? Sparkles : Crown;
  return (
    <div className="glass-icon" aria-hidden="true">
      <Icon size={24} strokeWidth={1.6} />
    </div>
  );
}

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/" className="brand-mark" aria-label="EPIC Poker home">
          <span className="brand-crest"><Crown size={15} strokeWidth={1.8} /></span>
          <span>EPIC <strong>POKER</strong></span>
        </Link>
        <nav className="main-nav" aria-label="Main navigation">
          <Link href="/subscriptions" className="nav-link">Subscriptions</Link>
          <Link href="/admin" className="nav-link nav-link-admin">Admin</Link>
        </nav>
      </div>
    </header>
  );
}

export function PageShell({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`gothic-page ${className}`}>
      <DustParticles />
      <SiteHeader />
      <main className="page-content">{children}</main>
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  icon = "crown",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  icon?: "crown" | "sparkles";
}) {
  return (
    <div className="section-heading">
      <GlassIcon kind={icon} />
      {eyebrow ? <p className="section-eyebrow">{eyebrow}</p> : null}
      <h1>{title}</h1>
      {description ? <p className="section-description">{description}</p> : null}
    </div>
  );
}

export const buttonClass = "engraved-button";
