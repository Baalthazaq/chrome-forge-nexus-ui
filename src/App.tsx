
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { AdminProvider } from "@/hooks/useAdmin";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import VaultAdmin from "./pages/VaultAdmin";
import Charisma from "./pages/Charisma";
import Sending from "./pages/Sending";
import Vault from "./pages/Vault";
import Questseek from "./pages/Questseek";
import Succubus from "./pages/Succubus";
import SuccubusAdmin from "./pages/SuccubusAdmin";
import Doppleganger from "./pages/Doppleganger";
import BHoldR from "./pages/BHoldR";
import Atunes from "./pages/Atunes";
import NexusWire from "./pages/NexusWire";
import Brittlewisp from "./pages/Brittlewisp";
import Wyrmcart from "./pages/Wyrmcart";
import ToMe from "./pages/ToMe";
import Maze from "./pages/Maze";
import Timestop from "./pages/Timestop";
import TimestopAdmin from "./pages/TimestopAdmin";
import Roldex from "./pages/Roldex";
import RoldexAdmin from "./pages/RoldexAdmin";
import SendingAdmin from "./pages/SendingAdmin";
import WyrmcartAdmin from "./pages/WyrmcartAdmin";
import AtunesAdminPage from "./pages/AtunesAdmin";
import CVNewsAdmin from "./pages/CVNewsAdmin";
import BHoldRAdmin from "./pages/BHoldRAdmin";
import DopplegangerAdmin from "./pages/DopplegangerAdmin";
import Suggestion from "./pages/Suggestion";
import SuggestionAdmin from "./pages/SuggestionAdmin";
import OrganizationsAdmin from "./pages/OrganizationsAdmin";
import MazeAdmin from "./pages/MazeAdmin";
import QuestseekAdmin from "./pages/QuestseekAdmin";
import ToMeAdmin from "./pages/ToMeAdmin";
import FeatureList from "./pages/FeatureList";
import DataExport from "./pages/DataExport";
import { CharacterTokensPage } from "./components/CharacterTokens";
import BestiaryAdmin from "./pages/BestiaryAdmin";
import EnvironmentsAdmin from "./pages/EnvironmentsAdmin";
import EncounterBuilder from "./pages/EncounterBuilder";
import DiceRollerRibbon from "./components/DiceRollerRibbon";
import DiceRoller from "./pages/DiceRoller";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <AdminProvider>
        <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <DiceRollerRibbon />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/sending" element={<SendingAdmin />} />
            <Route path="/admin/wyrmcart" element={<WyrmcartAdmin />} />
            <Route path="/admin/@tunes" element={<AtunesAdminPage />} />
            <Route path="/admin/cvnews" element={<CVNewsAdmin />} />
            <Route path="/admin/bholdr" element={<BHoldRAdmin />} />
            <Route path="/admin/app-of-holding" element={<VaultAdmin />} />
            <Route path="/admin/doppleganger" element={<DopplegangerAdmin />} />
            <Route path="/admin/:app" element={<Admin />} />
            <Route path="/charisma" element={<Charisma />} />
            <Route path="/sending" element={<Sending />} />
            <Route path="/vault" element={<Vault />} />
            <Route path="/admin/financial" element={<Admin />} />
            <Route path="/questseek" element={<Questseek />} />
            <Route path="/succubus" element={<Succubus />} />
            <Route path="/doppleganger" element={<Doppleganger />} />
            <Route path="/bholdr" element={<BHoldR />} />
            <Route path="/atunes" element={<Atunes />} />
            <Route path="/nexuswire" element={<NexusWire />} />
            <Route path="/brittlewisp" element={<Brittlewisp />} />
            <Route path="/wyrmcart" element={<Wyrmcart />} />
            <Route path="/tome" element={<ToMe />} />
            <Route path="/roldex" element={<Roldex />} />
            <Route path="/roldex-admin" element={<RoldexAdmin />} />
            <Route path="/maze" element={<Maze />} />
            <Route path="/timestop" element={<Timestop />} />
            <Route path="/admin/timestop" element={<TimestopAdmin />} />
            <Route path="/suggestion" element={<Suggestion />} />
            <Route path="/admin/suggestion" element={<SuggestionAdmin />} />
            <Route path="/admin/organizations" element={<OrganizationsAdmin />} />
            <Route path="/admin/maze" element={<MazeAdmin />} />
            <Route path="/admin/questseek" element={<QuestseekAdmin />} />
            <Route path="/admin/tome" element={<ToMeAdmin />} />
            <Route path="/admin/tokens" element={<CharacterTokensPage />} />
            <Route path="/admin/succubus" element={<SuccubusAdmin />} />
            <Route path="/features" element={<FeatureList />} />
            <Route path="/admin/data-export" element={<DataExport />} />
            <Route path="/admin/bestiary" element={<BestiaryAdmin />} />
            <Route path="/admin/environments" element={<EnvironmentsAdmin />} />
            <Route path="/admin/encounters" element={<EncounterBuilder />} />
            <Route path="/admin/dice-roller" element={<DiceRoller />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        </TooltipProvider>
      </AdminProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
