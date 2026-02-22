
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { AdminProvider } from "@/hooks/useAdmin";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import VaultAdmin from "./pages/VaultAdmin";
import Charisma from "./pages/Charisma";
import Sending from "./pages/Sending";
import Vault from "./pages/Vault";
import Questseek from "./pages/Questseek";
import Succubus from "./pages/Succubus";
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <AdminProvider>
        <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/sending" element={<SendingAdmin />} />
            <Route path="/admin/wyrmcart" element={<WyrmcartAdmin />} />
            <Route path="/admin/@tunes" element={<AtunesAdminPage />} />
            <Route path="/admin/cvnews" element={<CVNewsAdmin />} />
            <Route path="/admin/bholdr" element={<BHoldRAdmin />} />
            <Route path="/admin/app-of-holding" element={<VaultAdmin />} />
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
