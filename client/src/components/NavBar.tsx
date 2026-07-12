import { useAuth } from "@/_core/hooks/useAuth";
import { Link, useLocation } from "wouter";
import { Menu, X, Trophy, User, LogOut, Home, Plus, List } from "lucide-react";
import { useState } from "react";

const LOGO_URL = "/epic-logo.png";

export default function NavBar() {
  const { user, isAuthenticated, logout } = useAuth();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 epic-glass border-b border-border">
      <div className="container flex items-center justify-between h-16">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-1.5">
          <img src={LOGO_URL} alt="EPIC Poker" className="h-12 w-12 object-contain" />
          <span className="font-['Cinzel'] text-sm font-bold hidden sm:inline">
            <span className="text-gold">EPIC</span>{" "}
            <span className="text-purple-glow">POKER</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-6">
          {isAuthenticated ? (
            <>
              <Link href="/dashboard" className={`text-sm font-medium transition-colors hover:text-gold ${location === '/dashboard' ? 'text-gold' : 'text-muted-foreground'}`}>
                Dashboard
              </Link>
              <Link href="/tournaments/create" className={`text-sm font-medium transition-colors hover:text-gold ${location === '/tournaments/create' ? 'text-gold' : 'text-muted-foreground'}`}>
                Create
              </Link>
              <Link href="/my-tournaments" className={`text-sm font-medium transition-colors hover:text-gold ${location === '/my-tournaments' ? 'text-gold' : 'text-muted-foreground'}`}>
                My Games
              </Link>
              <Link href="/pricing" className={`text-sm font-medium transition-colors hover:text-gold ${location === '/pricing' ? 'text-gold' : 'text-muted-foreground'}`}>
                Pricing
              </Link>
              <div className="flex items-center gap-3 ml-4 pl-4 border-l border-border">
                <Link href="/profile" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
                    {user?.avatarUrl ? (
                      <img src={user.avatarUrl.includes('cdn.discordapp.com') ? `/api/avatar-proxy?url=${encodeURIComponent(user.avatarUrl)}` : user.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-4 h-4" />
                    )}
                  </div>
                  <span className="max-w-[100px] truncate">{user?.displayName || user?.name || 'Player'}</span>
                </Link>
                <button onClick={() => logout()} className="text-muted-foreground hover:text-destructive transition-colors">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <>
              <Link href="/pricing" className="text-sm font-medium text-muted-foreground hover:text-gold transition-colors">
                Pricing
              </Link>
              <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Sign In
              </Link>
              <Link href="/register" className="epic-btn-gold px-4 py-2 rounded-lg text-sm">
                Get Started
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden text-foreground"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden epic-glass border-t border-border animate-in slide-in-from-top-2 duration-200">
          <div className="container py-4 flex flex-col gap-3">
            {isAuthenticated ? (
              <>
                <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 py-2 text-sm text-foreground">
                  <Home className="w-4 h-4 text-purple-glow" /> Dashboard
                </Link>
                <Link href="/tournaments/create" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 py-2 text-sm text-foreground">
                  <Plus className="w-4 h-4 text-purple-glow" /> Create Tournament
                </Link>
                <Link href="/my-tournaments" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 py-2 text-sm text-foreground">
                  <Trophy className="w-4 h-4 text-purple-glow" /> My Tournaments
                </Link>
                <Link href="/my-participations" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 py-2 text-sm text-foreground">
                  <List className="w-4 h-4 text-purple-glow" /> My Participations
                </Link>
                <Link href="/pricing" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 py-2 text-sm text-foreground">
                  <span className="w-4 h-4 text-gold">$</span> Pricing
                </Link>
                <Link href="/profile" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 py-2 text-sm text-foreground">
                  <User className="w-4 h-4 text-purple-glow" /> Profile
                </Link>
                <button onClick={() => { logout(); setMobileOpen(false); }} className="flex items-center gap-3 py-2 text-sm text-destructive">
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </>
            ) : (
              <>
                <Link href="/pricing" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 py-2 text-sm text-foreground">
                  Pricing
                </Link>
                <Link href="/login" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 py-2 text-sm text-foreground">
                  Sign In
                </Link>
                <Link href="/register" onClick={() => setMobileOpen(false)} className="epic-btn-gold px-4 py-2 rounded-lg text-sm text-center">
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
