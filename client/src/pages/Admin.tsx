import { FormEvent, useEffect, useState } from "react";
import { Check, ChevronLeft, Crown, LogOut, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { Link } from "wouter";
import { GlassIcon, PageShell, buttonClass } from "@/components/SiteChrome";
import { trpc } from "@/lib/trpc";

type Tier = {
  id: number;
  name: string;
  price: string;
  description: string | null;
  perks: string[];
  badgeColor: string;
  featured: boolean;
  sortOrder: number;
};

type Draft = Omit<Tier, "id">;

const blankDraft: Draft = {
  name: "",
  price: "0.00",
  description: "",
  perks: [],
  badgeColor: "#D4AF37",
  featured: false,
  sortOrder: 0,
};

export default function Admin() {
  const status = trpc.admin.status.useQuery();
  const login = trpc.admin.login.useMutation({ onSuccess: () => status.refetch() });
  const logout = trpc.admin.logout.useMutation({ onSuccess: () => status.refetch() });
  const [password, setPassword] = useState("");

  if (status.isLoading) {
    return <PageShell><div className="admin-loading page-width">Opening the admin chamber…</div></PageShell>;
  }

  if (!status.data?.authenticated) {
    return (
      <PageShell className="admin-page">
        <section className="admin-login-card">
          <GlassIcon kind="crown" />
          <p className="section-eyebrow">RESTRICTED ACCESS</p>
          <h1>Admin Panel</h1>
          <p>Enter the administrator password to manage the subscription tiers.</p>
          <form className="admin-login-form" onSubmit={(event) => { event.preventDefault(); login.mutate({ password }); }}>
            <label htmlFor="admin-password">Password</label>
            <input id="admin-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" placeholder="Enter password" />
            {login.error ? <p className="form-error">{login.error.message}</p> : null}
            <button type="submit" className={buttonClass} disabled={login.isPending}>{login.isPending ? "Verifying…" : "Enter panel"}</button>
          </form>
          <Link href="/" className="back-link"><ChevronLeft size={14} /> Return home</Link>
        </section>
      </PageShell>
    );
  }

  return <AdminManager onLogout={() => logout.mutate()} loggingOut={logout.isPending} />;
}

function AdminManager({ onLogout, loggingOut }: { onLogout: () => void; loggingOut: boolean }) {
  const tiers = trpc.admin.tiers.useQuery();
  const create = trpc.admin.createTier.useMutation();
  const update = trpc.admin.updateTier.useMutation();
  const remove = trpc.admin.deleteTier.useMutation();
  const utils = trpc.useUtils();
  const [activeTierId, setActiveTierId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft>(blankDraft);
  const [perkInput, setPerkInput] = useState("");
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    if (activeTierId === null) setDraft(blankDraft);
  }, [activeTierId]);

  const refresh = async (message: string) => {
    await Promise.all([utils.admin.tiers.invalidate(), utils.subscriptions.list.invalidate()]);
    setFeedback(message);
  };

  const startEdit = (tier: Tier) => {
    setActiveTierId(tier.id);
    setDraft({ ...tier, perks: Array.isArray(tier.perks) ? tier.perks : [] });
    setFeedback("");
  };

  const startCreate = () => {
    setActiveTierId(null);
    setDraft({ ...blankDraft, sortOrder: tiers.data?.length || 0 });
    setFeedback("");
  };

  const addPerk = () => {
    const value = perkInput.trim();
    if (!value || draft.perks.includes(value)) return;
    setDraft((current) => ({ ...current, perks: [...current.perks, value] }));
    setPerkInput("");
  };

  const removePerk = (perk: string) => setDraft((current) => ({ ...current, perks: current.perks.filter(item => item !== perk) }));

  const saveTier = async (event: FormEvent) => {
    event.preventDefault();
    setFeedback("");
    const payload = { ...draft, description: draft.description || null };
    try {
      if (activeTierId === null) {
        await create.mutateAsync(payload);
        await refresh("Tier created.");
      } else {
        await update.mutateAsync({ id: activeTierId, data: payload });
        await refresh("Tier updated.");
      }
      setActiveTierId(null);
      setDraft(blankDraft);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to save tier.");
    }
  };

  const deleteTier = async (tier: Tier) => {
    if (!window.confirm(`Delete the ${tier.name} tier?`)) return;
    try {
      await remove.mutateAsync({ id: tier.id });
      await refresh("Tier deleted.");
      if (activeTierId === tier.id) startCreate();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to delete tier.");
    }
  };

  return (
    <PageShell className="admin-page">
      <div className="admin-header page-width">
        <div>
          <p className="section-eyebrow">EPIC POKER · ADMIN</p>
          <h1>Subscriptions</h1>
          <p>Manage the tiers shown on the public subscriptions page.</p>
        </div>
        <button type="button" className="quiet-button" onClick={onLogout} disabled={loggingOut}><LogOut size={15} /> {loggingOut ? "Leaving…" : "Sign out"}</button>
      </div>

      <div className="admin-tabs page-width" role="tablist" aria-label="Admin sections">
        <button type="button" className="admin-tab active" role="tab" aria-selected="true">Subscriptions</button>
      </div>

      <div className="admin-layout page-width">
        <section className="admin-list-panel">
          <div className="admin-panel-heading"><div><span className="panel-label">CURRENT TIERS</span><h2>{tiers.data?.length || 0} tiers</h2></div><button type="button" className="icon-button" onClick={startCreate} aria-label="Create new tier"><Plus size={18} /></button></div>
          {tiers.isLoading ? <p className="admin-empty">Loading tiers…</p> : tiers.data?.length ? <div className="admin-tier-list">{tiers.data.map(tier => <AdminTierRow key={tier.id} tier={tier} active={activeTierId === tier.id} onEdit={() => startEdit(tier)} onDelete={() => deleteTier(tier)} />)}</div> : <p className="admin-empty">No tiers yet. Create the first one.</p>}
        </section>

        <section className="admin-editor-panel">
          <div className="admin-panel-heading"><div><span className="panel-label">{activeTierId === null ? "NEW TIER" : "EDIT TIER"}</span><h2>{activeTierId === null ? "Create a tier" : "Update details"}</h2></div><Crown size={20} className="gold-icon" /></div>
          <form className="tier-form" onSubmit={saveTier}>
            <div className="form-grid-two"><label>Tier name<input value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} placeholder="EPIC" required /></label><label>Price / month<input type="text" inputMode="decimal" value={draft.price} onChange={event => setDraft({ ...draft, price: event.target.value })} placeholder="29.69" required /></label></div>
            <label>Description<textarea value={draft.description || ""} onChange={event => setDraft({ ...draft, description: event.target.value })} placeholder="A short line about this tier" rows={3} /></label>
            <div className="perk-editor"><label htmlFor="perk-input">Perks</label><div className="perk-add-row"><input id="perk-input" value={perkInput} onChange={event => setPerkInput(event.target.value)} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); addPerk(); } }} placeholder="Add a perk" /><button type="button" className="icon-button" onClick={addPerk} aria-label="Add perk"><Plus size={17} /></button></div><div className="admin-perks">{draft.perks.length ? draft.perks.map(perk => <span className="admin-perk" key={perk}><Check size={13} />{perk}<button type="button" onClick={() => removePerk(perk)} aria-label={`Remove ${perk}`}><X size={13} /></button></span>) : <span className="admin-empty small">No perks added yet.</span>}</div></div>
            <div className="form-grid-two"><label>Badge color<div className="color-input"><input type="color" value={draft.badgeColor} onChange={event => setDraft({ ...draft, badgeColor: event.target.value })} /><input value={draft.badgeColor} onChange={event => setDraft({ ...draft, badgeColor: event.target.value })} pattern="^#[0-9a-fA-F]{6}$" required /></div></label><label>Display order<input type="number" min="0" value={draft.sortOrder} onChange={event => setDraft({ ...draft, sortOrder: Number(event.target.value) })} /></label></div>
            <label className="toggle-row"><input type="checkbox" checked={draft.featured} onChange={event => setDraft({ ...draft, featured: event.target.checked })} /><span className="toggle-mark" /><span>Featured tier / best value</span></label>
            {feedback ? <p className="form-feedback">{feedback}</p> : null}
            <div className="form-actions"><button type="submit" className={buttonClass} disabled={create.isPending || update.isPending}><Save size={16} /> {create.isPending || update.isPending ? "Saving…" : activeTierId === null ? "Create tier" : "Save changes"}</button>{activeTierId !== null ? <button type="button" className="quiet-button" onClick={startCreate}>Cancel</button> : null}</div>
          </form>
        </section>
      </div>
    </PageShell>
  );
}

function AdminTierRow({ tier, active, onEdit, onDelete }: { tier: Tier; active: boolean; onEdit: () => void; onDelete: () => void }) {
  return <article className={`admin-tier-row ${active ? "active" : ""}`}><div className="admin-tier-swatch" style={{ backgroundColor: tier.badgeColor }} /><div className="admin-tier-info"><strong>{tier.name}</strong><span>${Number(tier.price).toFixed(2)} / mo · {tier.perks?.length || 0} perks</span>{tier.featured ? <em>BEST VALUE</em> : null}</div><div className="admin-row-actions"><button type="button" className="row-action" onClick={onEdit} aria-label={`Edit ${tier.name}`}><Pencil size={14} /></button><button type="button" className="row-action danger" onClick={onDelete} aria-label={`Delete ${tier.name}`}><Trash2 size={14} /></button></div></article>;
}
