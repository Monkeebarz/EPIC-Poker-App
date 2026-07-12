import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import CreateTournament from "./pages/CreateTournament";
import TournamentOverview from "./pages/TournamentOverview";
import TournamentStructure from "./pages/TournamentStructure";
import MyTournaments from "./pages/MyTournaments";
import MyParticipations from "./pages/MyParticipations";
import Pricing from "./pages/Pricing";
import WaitingRoom from "./pages/WaitingRoom";
import Leaderboard from "./pages/Leaderboard";
import PokerTable from "./pages/PokerTable";
import PokerTablePreview from "./pages/PokerTablePreview";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/profile" component={Profile} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/tournaments/create" component={CreateTournament} />
      <Route path="/tournaments/:id" component={TournamentOverview} />
      <Route path="/t/:id" component={TournamentOverview} />
      <Route path="/tournaments/:id/structure" component={TournamentStructure} />
      <Route path="/tournaments/:id/waiting" component={WaitingRoom} />
      <Route path="/my-tournaments" component={MyTournaments} />
      <Route path="/my-participations" component={MyParticipations} />
      <Route path="/leaderboard" component={Leaderboard} />
      <Route path="/table/:id" component={PokerTable} />
      <Route path="/table-preview" component={PokerTablePreview} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
