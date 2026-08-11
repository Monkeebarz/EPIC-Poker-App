import { ArrowLeft, Compass } from "lucide-react";
import { Link } from "wouter";
import { GlassIcon, PageShell, buttonClass } from "@/components/SiteChrome";

export default function NotFound() {
  return (
    <PageShell>
      <section className="admin-login-card not-found-card">
        <GlassIcon kind="sparkles" />
        <p className="section-eyebrow">OFF THE TABLE</p>
        <h1>404</h1>
        <p>This page is not part of the current tournament.</p>
        <Link href="/" className={buttonClass}><Compass size={16} /> Return to the table</Link>
        <Link href="/subscriptions" className="back-link"><ArrowLeft size={14} /> View subscriptions</Link>
      </section>
    </PageShell>
  );
}
