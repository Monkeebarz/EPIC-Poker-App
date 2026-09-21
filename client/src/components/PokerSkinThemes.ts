export type FeltSkin = "cosmic_black" | "casino_green" | "purple_lightning";

export interface SkinStyle {
  id: FeltSkin;
  name: string;
  feltBg: string;
  tableBorder: string;
  innerGlow: string;
  rimTrim: string;
  accentColor: string;
  particlesColor: string;
}

export const SKINS: Record<FeltSkin, SkinStyle> = {
  cosmic_black: {
    id: "cosmic_black",
    name: "Cosmic Black",
    feltBg: "radial-gradient(ellipse at 50% 45%, #181028 0%, #0c0817 48%, #040308 100%)",
    tableBorder: "border-[#d4af37]/70",
    innerGlow: "shadow-[inset_0_0_90px_rgba(106,13,173,0.35)]",
    rimTrim: "linear-gradient(135deg, #ffd700 0%, #b8860b 50%, #4a3500 100%)",
    accentColor: "#ffd700",
    particlesColor: "#a855f7",
  },
  casino_green: {
    id: "casino_green",
    name: "Casino Green",
    feltBg: "radial-gradient(ellipse at 50% 45%, #1e5a2e 0%, #13401e 52%, #08210f 100%)",
    tableBorder: "border-[#d4af37]/70",
    innerGlow: "shadow-[inset_0_0_80px_rgba(0,0,0,0.6)]",
    rimTrim: "linear-gradient(135deg, #ffd700 0%, #b8860b 50%, #3a2800 100%)",
    accentColor: "#4ade80",
    particlesColor: "#eab308",
  },
  purple_lightning: {
    id: "purple_lightning",
    name: "Purple Lightning",
    feltBg: "radial-gradient(ellipse at 50% 45%, #3b1054 0%, #200836 50%, #0c0217 100%)",
    tableBorder: "border-[#d4af37]/80",
    innerGlow: "shadow-[inset_0_0_100px_rgba(216,180,254,0.3)]",
    rimTrim: "linear-gradient(135deg, #facc15 0%, #ca8a04 50%, #581c87 100%)",
    accentColor: "#d8b4fe",
    particlesColor: "#facc15",
  },
};
