import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import NavBar from "@/components/NavBar";
import { useLocation } from "wouter";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { User, Camera, Save } from "lucide-react";

export default function Profile() {
  const { user, isAuthenticated, loading, refresh } = useAuth();
  const [, navigate] = useLocation();
  const [displayName, setDisplayName] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || user.name || "");
    }
  }, [user]);

  const updateMutation = trpc.profile.update.useMutation({
    onSuccess: () => {
      toast.success("Profile updated!");
      refresh();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update profile");
    },
  });

  if (!loading && !isAuthenticated) {
    navigate("/login?redirect=/profile");
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-glow border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const handleSave = () => {
    updateMutation.mutate({ displayName });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload-avatar", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      const { url } = await res.json();
      updateMutation.mutate({ avatarUrl: url });
    } catch (err) {
      toast.error("Failed to upload avatar");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <NavBar />

      <div className="pt-24 pb-12 px-4">
        <div className="container max-w-lg mx-auto">
          <h1 className="font-['Cinzel'] text-2xl font-bold mb-8 text-center">
            <span className="epic-gradient-text">Your Profile</span>
          </h1>

          {/* Avatar */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-secondary border-2 border-border flex items-center justify-center overflow-hidden">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl.includes('cdn.discordapp.com') ? `/api/avatar-proxy?url=${encodeURIComponent(user.avatarUrl)}` : user.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-10 h-10 text-muted-foreground" />
                )}
                {uploading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full">
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center border-2 border-background hover:bg-primary/80 transition-colors"
              >
                <Camera className="w-3.5 h-3.5 text-white" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* Form */}
          <div className="space-y-5">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="epic-input w-full px-4 py-2.5 rounded-lg text-sm"
                placeholder="Your poker name"
                maxLength={50}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
              <input
                type="email"
                value={user?.email || ""}
                disabled
                className="epic-input w-full px-4 py-2.5 rounded-lg text-sm opacity-60"
              />
              <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Subscription Tier</label>
              <div className="epic-card p-3 flex items-center justify-between">
                <span className="text-sm font-medium text-gold capitalize">{user?.subscriptionTier || "free"}</span>
                <a href="/pricing" className="text-xs text-purple-glow hover:underline">Upgrade</a>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">EPIC Chips</label>
              <div className="epic-card p-3">
                <span className="text-lg font-bold text-gold">{user?.epicChips?.toLocaleString() || "10,000"}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Games Played</label>
                <div className="epic-card p-3 text-center">
                  <span className="text-lg font-bold text-foreground">{user?.gamesPlayed || 0}</span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Tournaments Won</label>
                <div className="epic-card p-3 text-center">
                  <span className="text-lg font-bold text-gold">{user?.tournamentsWon || 0}</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="epic-btn-primary w-full py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
