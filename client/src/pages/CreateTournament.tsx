import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import NavBar from "@/components/NavBar";
import { useLocation } from "wouter";
import { useState } from "react";
import ReactDOM from "react-dom";
import { toast } from "sonner";
import { Plus, Trash2, Coffee, ArrowUp, ArrowDown, Shield, Sparkles, Clock, Users, Eye, Save, FolderOpen, X } from "lucide-react";

type BlindLevel = {
  id: string;
  levelOrder: number;
  isBreak: boolean;
  smallBlind: number | "";
  bigBlind: number | "";
  ante: number | "";
  duration: number | "";
  breakName?: string;
};

const DEFAULT_BLINDS: BlindLevel[] = [
  { id: "1", levelOrder: 1, isBreak: false, smallBlind: 25, bigBlind: 50, ante: "", duration: 15 },
  { id: "2", levelOrder: 2, isBreak: false, smallBlind: 50, bigBlind: 100, ante: "", duration: 15 },
  { id: "3", levelOrder: 3, isBreak: false, smallBlind: 75, bigBlind: 150, ante: "", duration: 15 },
  { id: "4", levelOrder: 4, isBreak: false, smallBlind: 100, bigBlind: 200, ante: 25, duration: 15 },
  { id: "5", levelOrder: 5, isBreak: true, smallBlind: "", bigBlind: "", ante: "", duration: 5, breakName: "Break" },
  { id: "6", levelOrder: 6, isBreak: false, smallBlind: 150, bigBlind: 300, ante: 25, duration: 15 },
  { id: "7", levelOrder: 7, isBreak: false, smallBlind: 200, bigBlind: 400, ante: 50, duration: 15 },
  { id: "8", levelOrder: 8, isBreak: false, smallBlind: 300, bigBlind: 600, ante: 75, duration: 12 },
  { id: "9", levelOrder: 9, isBreak: false, smallBlind: 400, bigBlind: 800, ante: 100, duration: 12 },
  { id: "10", levelOrder: 10, isBreak: true, smallBlind: "", bigBlind: "", ante: "", duration: 5, breakName: "Break" },
  { id: "11", levelOrder: 11, isBreak: false, smallBlind: 500, bigBlind: 1000, ante: 100, duration: 10 },
  { id: "12", levelOrder: 12, isBreak: false, smallBlind: 750, bigBlind: 1500, ante: 150, duration: 10 },
  { id: "13", levelOrder: 13, isBreak: false, smallBlind: 1000, bigBlind: 2000, ante: 200, duration: 10 },
  { id: "14", levelOrder: 14, isBreak: false, smallBlind: 1500, bigBlind: 3000, ante: 300, duration: "" },
];

export default function CreateTournament() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [gameType, setGameType] = useState<"nlh" | "plo" | "plo5" | "mixed">("nlh");
  const [tableSize, setTableSize] = useState("8");
  const [startingChips, setStartingChips] = useState<number | "">(1000);
  const [lateRegistration, setLateRegistration] = useState(true);
  const [lateRegLevels, setLateRegLevels] = useState<number | "">(6);
  const [reEntry, setReEntry] = useState(false);
  const [maxReEntries, setMaxReEntries] = useState<number | "">("");
  const [rebuyValues, setRebuyValues] = useState<number[]>([]);
  const [newRebuyValue, setNewRebuyValue] = useState<number | "">("");
  const [provablyFair, setProvablyFair] = useState(true);
  const [useCentsValues, setUseCentsValues] = useState(false);
  const [antesEnabled, setAntesEnabled] = useState(false);
  const [requireCheckIn, setRequireCheckIn] = useState(false);
  const [rabbitHunting, setRabbitHunting] = useState(false);
  const [managers, setManagers] = useState("");
  const [maxPlayers, setMaxPlayers] = useState<number | "">(100);
  const [scheduledStart, setScheduledStart] = useState("");
  const [decisionTime, setDecisionTime] = useState<number | "">(30);
  const [inactiveKickMinutes, setInactiveKickMinutes] = useState<number | "">(10);
  const [blindLevels, setBlindLevels] = useState<BlindLevel[]>(DEFAULT_BLINDS);

  // Saved structures
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadDropdown, setShowLoadDropdown] = useState(false);
  const [structureName, setStructureName] = useState("");
  const structuresQuery = trpc.structures.list.useQuery(undefined, { enabled: isAuthenticated });
  const saveMutation = trpc.structures.save.useMutation({
    onSuccess: () => {
      toast.success("Structure saved!");
      setShowSaveDialog(false);
      setStructureName("");
      structuresQuery.refetch();
    },
    onError: (err) => toast.error(err.message || "Failed to save structure"),
  });
  const deleteMutation = trpc.structures.delete.useMutation({
    onSuccess: () => {
      toast.success("Structure deleted");
      structuresQuery.refetch();
    },
  });

  const gatherSettings = () => ({
    gameType, tableSize, startingChips, lateRegistration, lateRegLevels,
    reEntry, maxReEntries, rebuyValues, provablyFair, useCentsValues,
    antesEnabled, requireCheckIn, rabbitHunting, maxPlayers, decisionTime,
    inactiveKickMinutes, blindLevels,
  });

  const handleSaveStructure = () => {
    if (!structureName.trim()) { toast.error("Please enter a name"); return; }
    const settings = gatherSettings();
    console.log("[SaveStructure] Saving:", structureName.trim(), settings);
    saveMutation.mutate({ name: structureName.trim(), settings });
  };

  const handleLoadStructure = (settings: any) => {
    if (settings.gameType) setGameType(settings.gameType);
    if (settings.tableSize) setTableSize(settings.tableSize);
    if (settings.startingChips != null) setStartingChips(settings.startingChips);
    if (settings.lateRegistration != null) setLateRegistration(settings.lateRegistration);
    if (settings.lateRegLevels != null) setLateRegLevels(settings.lateRegLevels);
    if (settings.reEntry != null) setReEntry(settings.reEntry);
    if (settings.maxReEntries != null) setMaxReEntries(settings.maxReEntries);
    if (settings.rebuyValues) setRebuyValues(settings.rebuyValues);
    if (settings.provablyFair != null) setProvablyFair(settings.provablyFair);
    if (settings.useCentsValues != null) setUseCentsValues(settings.useCentsValues);
    if (settings.antesEnabled != null) setAntesEnabled(settings.antesEnabled);
    if (settings.requireCheckIn != null) setRequireCheckIn(settings.requireCheckIn);
    if (settings.rabbitHunting != null) setRabbitHunting(settings.rabbitHunting);
    if (settings.maxPlayers != null) setMaxPlayers(settings.maxPlayers);
    if (settings.decisionTime != null) setDecisionTime(settings.decisionTime);
    if (settings.inactiveKickMinutes != null) setInactiveKickMinutes(settings.inactiveKickMinutes);
    if (settings.blindLevels) setBlindLevels(settings.blindLevels);
    toast.success("Structure loaded!");
  };

  const createMutation = trpc.tournament.create.useMutation({
    onSuccess: (data) => {
      toast.success("Tournament created!");
      navigate(`/t/${data.slug || data.publicId}`);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create tournament");
    },
  });

  if (!loading && !isAuthenticated) {
    navigate("/login?redirect=/tournaments/create");
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-glow border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Tournament name is required");
      return;
    }
    const playLevels = blindLevels.filter(l => !l.isBreak);
    if (playLevels.length < 3) {
      toast.error("At least 3 blind levels are required");
      return;
    }

    createMutation.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      gameType,
      tableSize: tableSize as any,
      startingChips: startingChips === "" ? 1000 : startingChips,
      lateRegistration,
      lateRegLevels: lateRegLevels === "" ? 6 : lateRegLevels,
      reEntry,
      maxReEntries: maxReEntries === "" ? undefined : maxReEntries,
      rebuyValues: rebuyValues.length > 0 ? rebuyValues : undefined,
      provablyFair,
      useCentsValues,
      antesEnabled,
      requireCheckIn,
      rabbitHunting,
      managers: managers.trim() ? managers.split(",").map(s => s.trim()).filter(Boolean) : undefined,
      maxPlayers: maxPlayers === "" ? 100 : maxPlayers,
      decisionTime: decisionTime === "" ? 30 : decisionTime,
      inactiveKickMinutes: inactiveKickMinutes === "" ? 0 : inactiveKickMinutes,
      scheduledStart: scheduledStart || undefined,
      blindLevels: blindLevels.map((l, i) => ({
        levelOrder: i + 1,
        isBreak: l.isBreak,
        smallBlind: typeof l.smallBlind === "number" ? l.smallBlind : 0,
        bigBlind: typeof l.bigBlind === "number" ? l.bigBlind : 0,
        ante: typeof l.ante === "number" ? l.ante : 0,
        duration: typeof l.duration === "number" ? l.duration : 0, // 0 = infinity
        breakName: l.breakName,
      })),
    });
  };

  const addLevel = () => {
    const lastLevel = blindLevels.filter(l => !l.isBreak).pop();
    const newLevel: BlindLevel = {
      id: Date.now().toString(),
      levelOrder: blindLevels.length + 1,
      isBreak: false,
      smallBlind: "",
      bigBlind: "",
      ante: "",
      duration: "",
    };
    setBlindLevels([...blindLevels, newLevel]);
  };

  const addBreak = () => {
    const newBreak: BlindLevel = {
      id: Date.now().toString(),
      levelOrder: blindLevels.length + 1,
      isBreak: true,
      smallBlind: "",
      bigBlind: "",
      ante: "",
      duration: 5,
      breakName: "Break",
    };
    setBlindLevels([...blindLevels, newBreak]);
  };

  const removeLevel = (id: string) => {
    setBlindLevels(blindLevels.filter(l => l.id !== id));
  };

  const updateLevel = (id: string, field: keyof BlindLevel, value: any) => {
    setBlindLevels(blindLevels.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  const moveLevel = (index: number, direction: "up" | "down") => {
    const newLevels = [...blindLevels];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newLevels.length) return;
    [newLevels[index], newLevels[targetIndex]] = [newLevels[targetIndex], newLevels[index]];
    setBlindLevels(newLevels);
  };

  const addRebuyValue = () => {
    if (newRebuyValue !== "" && newRebuyValue > 0) {
      setRebuyValues([...rebuyValues, newRebuyValue]);
      setNewRebuyValue("");
    }
  };

  const removeRebuyValue = (index: number) => {
    setRebuyValues(rebuyValues.filter((_, i) => i !== index));
  };

  // Determine if a level is the last non-break level
  const isLastPlayLevel = (index: number) => {
    const remaining = blindLevels.slice(index + 1).filter(l => !l.isBreak);
    return !blindLevels[index].isBreak && remaining.length === 0;
  };

  return (
    <div className="min-h-screen bg-background">
      <NavBar />

      <div className="pt-20 pb-12 px-4">
        <div className="container max-w-4xl mx-auto">
          <h1 className="font-['Cinzel'] text-2xl sm:text-3xl font-bold mb-2">
            <span className="epic-gradient-text">Create Tournament</span>
          </h1>
          <p className="text-sm text-muted-foreground mb-8">Configure every detail of your poker tournament.</p>

          {/* Save / Load Structure Controls */}
          <div className="flex flex-wrap gap-3 mb-6">
            <button
              type="button"
              onClick={() => { console.log('[SaveStructure] Opening dialog'); setShowSaveDialog(true); }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/20 border border-primary/30 text-primary text-sm font-medium hover:bg-primary/30 active:scale-95 transition-all"
            >
              <Save className="w-4 h-4" /> Save Structure
            </button>
            {structuresQuery.data && structuresQuery.data.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowLoadDropdown(!showLoadDropdown)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary/50 border border-border text-foreground text-sm font-medium hover:bg-secondary active:scale-95 transition-all"
                >
                  <FolderOpen className="w-4 h-4" /> Load Saved Structure
                </button>
                {showLoadDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowLoadDropdown(false)} />
                    <div className="absolute top-full left-0 mt-1 w-64 bg-card border border-border rounded-lg shadow-xl z-50">
                      <div className="p-2 max-h-60 overflow-y-auto">
                        {structuresQuery.data.map((s: any) => (
                          <div key={s.id} className="flex items-center justify-between gap-2 p-2 rounded hover:bg-secondary/50">
                            <button
                              type="button"
                              onClick={() => { handleLoadStructure(s.settings); setShowLoadDropdown(false); }}
                              className="text-sm text-foreground truncate flex-1 text-left"
                            >
                              {s.name}
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteMutation.mutate({ id: s.id })}
                              className="text-destructive hover:text-destructive/80 p-1"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Save Structure Dialog - rendered via portal to avoid mobile fixed positioning issues */}
          {showSaveDialog && ReactDOM.createPortal(
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4" onClick={(e) => { if (e.target === e.currentTarget) setShowSaveDialog(false); }}>
              <div className="bg-card border border-border rounded-xl p-6 w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground">Save Structure</h3>
                  <button type="button" onClick={() => setShowSaveDialog(false)} className="text-muted-foreground hover:text-foreground">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-sm text-muted-foreground mb-4">Name this structure so you can load it later.</p>
                <input
                  type="text"
                  value={structureName}
                  onChange={(e) => setStructureName(e.target.value)}
                  placeholder="e.g. Friday Night Setup"
                  className="w-full px-4 py-2.5 rounded-lg text-sm mb-4 bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  maxLength={200}
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSaveStructure(); } }}
                />
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowSaveDialog(false)}
                    className="flex-1 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-secondary transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveStructure}
                    disabled={saveMutation.isPending}
                    className="flex-1 epic-btn-gold px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                  >
                    {saveMutation.isPending ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Info */}
            <Section title="Tournament Info">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Tournament Name *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Friday Night Showdown"
                    className="epic-input w-full px-4 py-2.5 rounded-lg text-sm"
                    required
                    maxLength={200}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional tournament description..."
                    className="epic-input w-full px-4 py-2.5 rounded-lg text-sm resize-none h-20"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium text-foreground mb-1.5 block">
                    <Clock className="w-4 h-4 inline mr-1" />
                    Scheduled Start (optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduledStart}
                    onChange={(e) => setScheduledStart(e.target.value)}
                    className="epic-input w-full sm:w-auto px-4 py-2.5 rounded-lg text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Leave blank for manual start</p>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium text-foreground mb-1.5 block">
                    <Users className="w-4 h-4 inline mr-1" />
                    Tournament Managers
                  </label>
                  <input
                    type="text"
                    value={managers}
                    onChange={(e) => setManagers(e.target.value)}
                    placeholder="email1@example.com, email2@example.com"
                    className="epic-input w-full px-4 py-2.5 rounded-lg text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Comma-separated emails or player IDs</p>
                </div>
              </div>
            </Section>

            {/* Game Settings */}
            <Section title="Game Settings">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Poker Variant</label>
                  <select
                    value={gameType}
                    onChange={(e) => setGameType(e.target.value as any)}
                    className="epic-input w-full px-4 py-2.5 rounded-lg text-sm"
                  >
                    <option value="nlh">No Limit Texas Hold'em</option>
                    <option value="plo">Pot Limit Omaha</option>
                    <option value="plo5">PLO-5 Card</option>
                    <option value="mixed">Mixed Games</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Players Per Table</label>
                  <select
                    value={tableSize}
                    onChange={(e) => setTableSize(e.target.value)}
                    className="epic-input w-full px-4 py-2.5 rounded-lg text-sm"
                  >
                    <option value="2">2 (Heads-Up)</option>
                    <option value="3">3-Max</option>
                    <option value="4">4-Max</option>
                    <option value="5">5-Max</option>
                    <option value="6">6-Max</option>
                    <option value="7">7-Max</option>
                    <option value="8">8-Max (Default)</option>
                    <option value="9">9-Max</option>
                    <option value="10">10-Max</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Starting Chips</label>
                  <input
                    type="number"
                    value={startingChips}
                    onChange={(e) => setStartingChips(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="1000"
                    className="epic-input w-full px-4 py-2.5 rounded-lg text-sm"
                    min={100}
                    max={10000000}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Max Players</label>
                  <input
                    type="number"
                    value={maxPlayers}
                    onChange={(e) => setMaxPlayers(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="100"
                    className="epic-input w-full px-4 py-2.5 rounded-lg text-sm"
                    min={2}
                    max={10000}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Decision Time (seconds)</label>
                  <p className="text-xs text-muted-foreground mb-1">How long each player has to act on their turn</p>
                  <input
                    type="number"
                    value={decisionTime}
                    onChange={(e) => setDecisionTime(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="30"
                    className="epic-input w-full px-4 py-2.5 rounded-lg text-sm"
                    min={10}
                    max={120}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Auto-Kick Inactive (minutes)</label>
                  <p className="text-xs text-muted-foreground mb-1">Kick players away from table for this long (0 = disabled)</p>
                  <input
                    type="number"
                    value={inactiveKickMinutes}
                    onChange={(e) => setInactiveKickMinutes(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="10"
                    className="epic-input w-full px-4 py-2.5 rounded-lg text-sm"
                    min={0}
                    max={60}
                  />
                </div>
              </div>
            </Section>

            {/* Toggles Section */}
            <Section title="Options">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Antes</p>
                    <p className="text-xs text-muted-foreground">Enable antes in blind structure</p>
                  </div>
                  <ToggleSwitch checked={antesEnabled} onChange={setAntesEnabled} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Use Cents Values</p>
                    <p className="text-xs text-muted-foreground">Allow decimal chip values (e.g. 0.25/0.50)</p>
                  </div>
                  <ToggleSwitch checked={useCentsValues} onChange={setUseCentsValues} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Participation Check-in</p>
                    <p className="text-xs text-muted-foreground">Require players to check in before start</p>
                  </div>
                  <ToggleSwitch checked={requireCheckIn} onChange={setRequireCheckIn} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground flex items-center gap-1">
                      <Eye className="w-4 h-4" /> Rabbit Hunting
                    </p>
                    <p className="text-xs text-muted-foreground">Allow players to see undealt community cards</p>
                  </div>
                  <ToggleSwitch checked={rabbitHunting} onChange={setRabbitHunting} />
                </div>
              </div>
            </Section>

            {/* Registration Rules */}
            <Section title="Registration & Rebuy">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Late Registration</p>
                    <p className="text-xs text-muted-foreground">Allow players to join after the tournament starts</p>
                  </div>
                  <ToggleSwitch checked={lateRegistration} onChange={setLateRegistration} />
                </div>
                {lateRegistration && (
                  <div className="pl-4 border-l-2 border-border">
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Late Reg Levels</label>
                    <input
                      type="number"
                      value={lateRegLevels}
                      onChange={(e) => setLateRegLevels(e.target.value === "" ? "" : Number(e.target.value))}
                      className="epic-input w-32 px-3 py-2 rounded-lg text-sm"
                      min={1}
                      max={50}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Number of levels late registration stays open</p>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Re-Entry / Rebuy</p>
                    <p className="text-xs text-muted-foreground">Allow eliminated players to re-enter</p>
                  </div>
                  <ToggleSwitch checked={reEntry} onChange={setReEntry} />
                </div>
                {reEntry && (
                  <div className="pl-4 border-l-2 border-border space-y-3">
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1.5 block">Max Rebuy Per Player</label>
                      <input
                        type="number"
                        value={maxReEntries}
                        onChange={(e) => setMaxReEntries(e.target.value === "" ? "" : Number(e.target.value))}
                        placeholder="Blank = no limit"
                        className="epic-input w-48 px-3 py-2 rounded-lg text-sm"
                        min={1}
                        max={99}
                      />
                      <p className="text-xs text-muted-foreground mt-1">Leave blank for unlimited rebuys</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1.5 block">Rebuy Values</label>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {rebuyValues.map((val, i) => (
                          <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-secondary text-sm">
                            {val} chips
                            <button type="button" onClick={() => removeRebuyValue(i)} className="text-muted-foreground hover:text-destructive">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={newRebuyValue}
                          onChange={(e) => setNewRebuyValue(e.target.value === "" ? "" : Number(e.target.value))}
                          placeholder="e.g. 1000"
                          className="epic-input w-32 px-3 py-2 rounded-lg text-sm"
                          min={1}
                        />
                        <button type="button" onClick={addRebuyValue} className="px-3 py-2 rounded-lg text-sm border border-border hover:border-primary transition-colors">
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Section>

            {/* Fairness Mode */}
            <Section title="Fairness Mode">
              <div className="flex items-center justify-between p-4 epic-card">
                <div className="flex items-center gap-3">
                  {provablyFair ? (
                    <Shield className="w-5 h-5 text-green-400" />
                  ) : (
                    <Sparkles className="w-5 h-5 text-purple-glow" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {provablyFair ? "Provably Fair" : "Entertainment Mode"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {provablyFair
                        ? "HMAC-SHA256 verified shuffles — every hand verifiable"
                        : "Standard shuffle — optimized for fun and speed"}
                    </p>
                  </div>
                </div>
                <ToggleSwitch checked={provablyFair} onChange={setProvablyFair} />
              </div>
            </Section>

            {/* Blind Structure */}
            <Section title="Blind Structure">
              <div className="space-y-2">
                {/* Header */}
                <div className="hidden sm:grid grid-cols-[40px_1fr_1fr_1fr_80px_80px] gap-2 px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <span>#</span>
                  <span>SB</span>
                  <span>BB</span>
                  <span>{antesEnabled ? "Ante" : ""}</span>
                  <span>Duration</span>
                  <span></span>
                </div>

                {/* Levels */}
                <div className="space-y-1.5">
                  {blindLevels.map((level, index) => (
                    <div
                      key={level.id}
                      className={`rounded-lg border p-3 ${
                        level.isBreak
                          ? "border-gold/30 bg-[oklch(0.82_0.12_85_/_0.05)]"
                          : "border-border bg-card"
                      }`}
                    >
                      {level.isBreak ? (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Coffee className="w-4 h-4 text-gold" />
                            <input
                              type="text"
                              value={level.breakName || "Break"}
                              onChange={(e) => updateLevel(level.id, "breakName", e.target.value)}
                              className="epic-input px-2 py-1 rounded text-sm w-32"
                            />
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                value={level.duration}
                                onChange={(e) => updateLevel(level.id, "duration", e.target.value === "" ? "" : Number(e.target.value))}
                                placeholder="5"
                                className="epic-input px-2 py-1 rounded text-sm w-16 text-center"
                                min={1}
                                max={60}
                              />
                              <span className="text-xs text-muted-foreground">min</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => moveLevel(index, "up")} className="p-1 text-muted-foreground hover:text-foreground" disabled={index === 0}>
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button type="button" onClick={() => moveLevel(index, "down")} className="p-1 text-muted-foreground hover:text-foreground" disabled={index === blindLevels.length - 1}>
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button type="button" onClick={() => removeLevel(level.id)} className="p-1 text-muted-foreground hover:text-destructive">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                          <span className="text-xs text-muted-foreground w-6 shrink-0 hidden sm:block">
                            {blindLevels.filter((l, i) => i <= index && !l.isBreak).length}
                          </span>
                          <div className={`grid ${antesEnabled ? 'grid-cols-3 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3'} gap-2 flex-1`}>
                            <div>
                              <label className="text-[10px] text-muted-foreground sm:hidden">SB</label>
                              <input
                                type="number"
                                value={level.smallBlind}
                                onChange={(e) => updateLevel(level.id, "smallBlind", e.target.value === "" ? "" : Number(e.target.value))}
                                placeholder="SB"
                                className="epic-input w-full px-2 py-1.5 rounded text-sm text-center"
                                min={0}
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-muted-foreground sm:hidden">BB</label>
                              <input
                                type="number"
                                value={level.bigBlind}
                                onChange={(e) => updateLevel(level.id, "bigBlind", e.target.value === "" ? "" : Number(e.target.value))}
                                placeholder="BB"
                                className="epic-input w-full px-2 py-1.5 rounded text-sm text-center"
                                min={0}
                              />
                            </div>
                            {antesEnabled && (
                              <div>
                                <label className="text-[10px] text-muted-foreground sm:hidden">Ante</label>
                                <input
                                  type="number"
                                  value={level.ante}
                                  onChange={(e) => updateLevel(level.id, "ante", e.target.value === "" ? "" : Number(e.target.value))}
                                  placeholder="Ante"
                                  className="epic-input w-full px-2 py-1.5 rounded text-sm text-center"
                                  min={0}
                                />
                              </div>
                            )}
                            <div className={`${antesEnabled ? 'col-span-3 sm:col-span-1' : 'col-span-2 sm:col-span-1'}`}>
                              <label className="text-[10px] text-muted-foreground sm:hidden">Duration</label>
                              <div className="flex items-center gap-1">
                                {isLastPlayLevel(index) ? (
                                  <div className="epic-input w-full px-2 py-1.5 rounded text-sm text-center text-gold font-bold flex items-center justify-center">
                                    ∞
                                  </div>
                                ) : (
                                  <input
                                    type="number"
                                    value={level.duration}
                                    onChange={(e) => updateLevel(level.id, "duration", e.target.value === "" ? "" : Number(e.target.value))}
                                    placeholder="min"
                                    className="epic-input w-full px-2 py-1.5 rounded text-sm text-center"
                                    min={1}
                                    max={999}
                                  />
                                )}
                                <span className="text-xs text-muted-foreground hidden sm:inline">
                                  {isLastPlayLevel(index) ? "" : "m"}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button type="button" onClick={() => moveLevel(index, "up")} className="p-1 text-muted-foreground hover:text-foreground" disabled={index === 0}>
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button type="button" onClick={() => moveLevel(index, "down")} className="p-1 text-muted-foreground hover:text-foreground" disabled={index === blindLevels.length - 1}>
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button type="button" onClick={() => removeLevel(level.id)} className="p-1 text-muted-foreground hover:text-destructive">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Info about last level */}
                <p className="text-xs text-muted-foreground italic pt-1">
                  The last blind level runs indefinitely (∞) until the tournament ends.
                </p>

                {/* Add buttons */}
                <div className="flex gap-3 pt-3">
                  <button type="button" onClick={addLevel} className="epic-btn-primary px-4 py-2 rounded-lg text-sm flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Add Level
                  </button>
                  <button type="button" onClick={addBreak} className="px-4 py-2 rounded-lg text-sm border border-gold/50 text-gold hover:bg-gold/10 transition-colors flex items-center gap-2">
                    <Coffee className="w-4 h-4" /> Add Break
                  </button>
                </div>
              </div>
            </Section>

            {/* Submit */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="epic-btn-gold w-full py-3 rounded-xl text-base font-semibold disabled:opacity-50"
              >
                {createMutation.isPending ? "Creating Tournament..." : "Create Tournament"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="epic-card p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
        <div className="w-1 h-5 rounded-full bg-primary" />
        {title}
      </h2>
      {children}
    </div>
  );
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-secondary'}`}
    >
      <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  );
}
