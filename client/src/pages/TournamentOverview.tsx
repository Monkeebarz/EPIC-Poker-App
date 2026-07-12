import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import NavBar from "@/components/NavBar";
import { Link, useParams } from "wouter";
import { toast } from "sonner";
import { Users, Clock, Shield, Sparkles, Trophy, ArrowLeft, Play, UserPlus, UserMinus, Copy, CheckCircle2, Gamepad2, XCircle, UserCheck, Ban, Trash2 } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

export default function TournamentOverview() {
  const { id } = useParams<{ id: string }>();
  const { user, isAuthenticated } = useAuth();
  const [linkCopied, setLinkCopied] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [, navigate] = useLocation();

  const tournamentQuery = trpc.tournament.get.useQuery({ publicId: id! });
  const participantsQuery = trpc.tournament.participants.useQuery({ publicId: id! });
  const countQuery = trpc.tournament.participantCount.useQuery({ publicId: id! });
  const myStatusQuery = trpc.tournament.myStatus.useQuery(
    { publicId: id! },
    { enabled: isAuthenticated }
  );

  const utils = trpc.useUtils();

  const invalidateAll = () => {
    utils.tournament.participants.invalidate({ publicId: id! });
    utils.tournament.participantCount.invalidate({ publicId: id! });
    utils.tournament.myStatus.invalidate({ publicId: id! });
  };

  const deleteMutation = trpc.tournament.delete.useMutation({
    onSuccess: () => {
      toast.success("Tournament deleted");
      navigate("/dashboard");
    },
    onError: (err) => toast.error(err.message),
  });

  const registerMutation = trpc.tournament.register.useMutation({
    onSuccess: () => {
      toast.success("Participation requested! Waiting for host approval.");
      invalidateAll();
    },
    onError: (err) => toast.error(err.message),
  });

  const unregisterMutation = trpc.tournament.unregister.useMutation({
    onSuccess: () => {
      toast.success("Participation cancelled");
      invalidateAll();
    },
    onError: (err) => toast.error(err.message),
  });

  const acceptMutation = trpc.tournament.acceptPlayer.useMutation({
    onSuccess: () => {
      toast.success("Player accepted!");
      invalidateAll();
    },
    onError: (err) => toast.error(err.message),
  });

  const denyMutation = trpc.tournament.denyPlayer.useMutation({
    onSuccess: () => {
      toast.success("Request denied");
      invalidateAll();
    },
    onError: (err) => toast.error(err.message),
  });

  const removeMutation = trpc.tournament.removePlayer.useMutation({
    onSuccess: () => {
      toast.success("Player removed");
      invalidateAll();
    },
    onError: (err) => toast.error(err.message),
  });

  const t = tournamentQuery.data;
  const participants = participantsQuery.data || [];
  const count = countQuery.data || 0;
  const myStatus = myStatusQuery.data; // null | "pending" | "registered" | "playing" | "eliminated" | "winner"
  const isCreator = t?.creatorId === user?.id;

  const copyShareLink = () => {
    const slug = t?.slug || id;
    const url = `${window.location.origin}/t/${slug}`;
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true);
      toast.success("Tournament link copied to clipboard!");
      setTimeout(() => setLinkCopied(false), 3000);
    });
  };

  if (tournamentQuery.isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-glow border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!t) {
    return (
      <div className="min-h-screen bg-background">
        <NavBar />
        <div className="pt-24 text-center">
          <p className="text-muted-foreground">Tournament not found</p>
        </div>
      </div>
    );
  }

  const gameTypeLabels: Record<string, string> = {
    nlh: "No Limit Texas Hold'em",
    plo: "Pot Limit Omaha",
    plo5: "PLO-5 Card",
    mixed: "Mixed Games",
  };

  const canRequest = isAuthenticated && !myStatus && (t.status === "registering" || t.status === "scheduled");
  const canCancelRequest = isAuthenticated && myStatus === "pending";
  const canCancelParticipation = isAuthenticated && myStatus === "registered" && (t.status === "registering" || t.status === "scheduled");

  // Separate pending and accepted participants
  const pendingPlayers = participants.filter((p) => p.participant.status === "pending");
  const acceptedPlayers = participants.filter((p) => p.participant.status !== "pending");

  return (
    <div className="min-h-screen bg-background">
      <NavBar />

      <div className="pt-20 pb-12 px-4">
        <div className="container max-w-4xl mx-auto">
          {/* Back link */}
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="w-4 h-4" /> Back to Lobby
          </Link>

          {/* Header */}
          <div className="epic-card p-6 mb-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-xl sm:text-2xl font-bold text-foreground">{t.name}</h1>
                    <StatusBadge status={t.status} />
                  </div>
                  {t.description && (
                    <p className="text-sm text-muted-foreground mb-3">{t.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      {gameTypeLabels[t.gameType] || t.gameType}
                    </span>
                    <span>{t.tableSize}-max</span>
                    <span>{t.startingChips.toLocaleString()} chips</span>
                    <span className="flex items-center gap-1.5">
                      <Users className="w-4 h-4" />
                      {count}/{t.maxPlayers} players
                    </span>
                    {t.provablyFair ? (
                      <span className="flex items-center gap-1 text-green-400">
                        <Shield className="w-4 h-4" /> Provably Fair
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-purple-glow">
                        <Sparkles className="w-4 h-4" /> Entertainment
                      </span>
                    )}
                  </div>
                </div>

                {/* Copy Link */}
                <button
                  onClick={copyShareLink}
                  className="px-4 py-2 rounded-lg text-sm border border-border text-foreground hover:bg-secondary transition-colors flex items-center gap-2 shrink-0"
                >
                  {linkCopied ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  {linkCopied ? "Copied!" : "Copy Link"}
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 pt-2 border-t border-border">
                {/* Request Participation */}
                {canRequest && (
                  <button
                    onClick={() => registerMutation.mutate({ publicId: id! })}
                    disabled={registerMutation.isPending}
                    className="epic-btn-gold px-6 py-3 rounded-xl text-base font-semibold flex items-center gap-2 disabled:opacity-50"
                  >
                    <UserPlus className="w-5 h-5" />
                    {registerMutation.isPending ? "Requesting..." : "Request Participation"}
                  </button>
                )}

                {/* Cancel Request (pending) */}
                {canCancelRequest && (
                  <button
                    onClick={() => unregisterMutation.mutate({ publicId: id! })}
                    disabled={unregisterMutation.isPending}
                    className="px-6 py-3 rounded-xl text-base font-semibold border border-orange-500/50 text-orange-400 hover:bg-orange-500/10 transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    <XCircle className="w-5 h-5" />
                    {unregisterMutation.isPending ? "Cancelling..." : "Cancel Request"}
                  </button>
                )}

                {/* Cancel Participation (accepted) */}
                {canCancelParticipation && (
                  <button
                    onClick={() => unregisterMutation.mutate({ publicId: id! })}
                    disabled={unregisterMutation.isPending}
                    className="px-6 py-3 rounded-xl text-base font-semibold border border-destructive/50 text-destructive hover:bg-destructive/10 transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    <UserMinus className="w-5 h-5" />
                    {unregisterMutation.isPending ? "Cancelling..." : "Cancel Participation"}
                  </button>
                )}

                {/* Status indicators */}
                {myStatus === "pending" && (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-orange-500/10 border border-orange-500/30">
                    <Clock className="w-5 h-5 text-orange-400" />
                    <span className="text-sm font-medium text-orange-300">Request pending — awaiting host approval</span>
                  </div>
                )}
                {myStatus === "registered" && (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/30">
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                    <span className="text-sm font-medium text-green-300">You're accepted!</span>
                  </div>
                )}

                {!isAuthenticated && (
                  <Link href={`/login?redirect=/t/${t.slug || id}`} className="epic-btn-gold px-6 py-3 rounded-xl text-base font-semibold flex items-center gap-2">
                    <UserPlus className="w-5 h-5" /> Sign in to Request
                  </Link>
                )}
                <Link href={`/tournaments/${t.publicId}/structure`} className="px-4 py-3 rounded-xl text-sm border border-border text-foreground hover:bg-secondary transition-colors flex items-center gap-2">
                  View Structure
                </Link>
                {isCreator && (t.status === "scheduled" || t.status === "registering") && (
                  <Link href={`/tournaments/${t.publicId}/waiting`} className="epic-btn-primary px-6 py-3 rounded-xl text-base font-semibold flex items-center gap-2">
                    <Play className="w-5 h-5" /> Start Game
                  </Link>
                )}
                {t.status === "running" && (myStatus === "registered" || myStatus === "playing" || isCreator) && (
                  <Link href={`/table/${t.publicId}`} className="epic-btn-gold px-6 py-3 rounded-xl text-base font-semibold flex items-center gap-2">
                    <Gamepad2 className="w-5 h-5" /> Join Table
                  </Link>
                )}
                {isCreator && (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-4 py-3 rounded-xl text-sm border border-red-500/40 text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                )}
              </div>

              {/* Delete Confirmation Dialog */}
              {showDeleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)}>
                  <div className="bg-card border border-border rounded-2xl p-6 max-w-sm mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                    <h3 className="text-lg font-bold text-foreground mb-2">Delete Tournament?</h3>
                    <p className="text-sm text-muted-foreground mb-5">Are you sure you want to delete <strong>"{t.name}"</strong>? This cannot be undone. All participants, blind levels, and audit logs will be permanently removed.</p>
                    <div className="flex gap-3 justify-end">
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        className="px-4 py-2 rounded-lg text-sm border border-border text-foreground hover:bg-secondary transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => deleteMutation.mutate({ publicId: t.publicId })}
                        disabled={deleteMutation.isPending}
                        className="px-4 py-2 rounded-lg text-sm bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors disabled:opacity-50"
                      >
                        {deleteMutation.isPending ? "Deleting..." : "Delete Forever"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Tournament Details Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <InfoCard label="Late Registration" value={t.lateRegistration ? `Yes (${t.lateRegLevels} lvl)` : "No"} />
            <InfoCard label="Re-Entry" value={t.reEntry ? `Yes (max ${t.maxReEntries || "∞"})` : "No"} />
            <InfoCard label="Table Size" value={`${t.tableSize}-max`} />
            <InfoCard label="Starting Stack" value={`${t.startingChips.toLocaleString()}`} />
          </div>

          {/* Host: Pending Requests */}
          {isCreator && pendingPlayers.length > 0 && (
            <div className="epic-card p-5 mb-6 border border-orange-500/30">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-400" />
                Pending Requests ({pendingPlayers.length})
              </h2>
              <div className="space-y-2">
                {pendingPlayers.map((p) => (
                  <div key={p.participant.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 border border-border">
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
                      {p.user.avatarUrl ? (
                        <img src={p.user.avatarUrl.includes('cdn.discordapp.com') ? `/api/avatar-proxy?url=${encodeURIComponent(p.user.avatarUrl)}` : p.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs font-medium text-muted-foreground">
                          {(p.user.displayName || p.user.name || "?").charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-foreground flex-1">{p.user.displayName || p.user.name || "Anonymous"}</span>
                    <button
                      onClick={() => acceptMutation.mutate({ publicId: id!, userId: p.user.id })}
                      disabled={acceptMutation.isPending}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-600 hover:bg-green-500 text-white transition-colors flex items-center gap-1 disabled:opacity-50"
                    >
                      <UserCheck className="w-3.5 h-3.5" /> Accept
                    </button>
                    <button
                      onClick={() => denyMutation.mutate({ publicId: id!, userId: p.user.id })}
                      disabled={denyMutation.isPending}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-500 text-white transition-colors flex items-center gap-1 disabled:opacity-50"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Deny
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Accepted Players */}
          <div className="epic-card p-5">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-glow" />
              Accepted Players ({acceptedPlayers.length})
            </h2>

            {acceptedPlayers.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {acceptedPlayers.map((p) => (
                  <div key={p.participant.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-secondary/50 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
                      {p.user.avatarUrl ? (
                        <img src={p.user.avatarUrl.includes('cdn.discordapp.com') ? `/api/avatar-proxy?url=${encodeURIComponent(p.user.avatarUrl)}` : p.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs font-medium text-muted-foreground">
                          {(p.user.displayName || p.user.name || "?").charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-foreground flex-1">{p.user.displayName || p.user.name || "Anonymous"}</span>
                    {p.user.id === t.creatorId && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gold/20 text-gold font-medium">HOST</span>
                    )}
                    {p.participant.status === "winner" && <Trophy className="w-4 h-4 text-gold" />}
                    {isCreator && p.user.id !== t.creatorId && (t.status === "registering" || t.status === "scheduled") && (
                      <button
                        onClick={() => removeMutation.mutate({ publicId: id!, userId: p.user.id })}
                        disabled={removeMutation.isPending}
                        className="px-2 py-1 rounded text-[10px] font-semibold border border-red-500/50 text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-1 disabled:opacity-50"
                      >
                        <Ban className="w-3 h-3" /> Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">No players accepted yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="epic-card p-3 sm:p-4">
      <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    scheduled: "bg-blue-500/20 text-blue-300",
    registering: "bg-green-500/20 text-green-300",
    running: "bg-yellow-500/20 text-yellow-300",
    completed: "bg-gray-500/20 text-gray-300",
    cancelled: "bg-red-500/20 text-red-300",
    draft: "bg-gray-500/20 text-gray-400",
    paused: "bg-orange-500/20 text-orange-300",
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status] || colors.draft}`}>
      {status}
    </span>
  );
}
