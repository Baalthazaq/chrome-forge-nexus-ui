
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Charisma from "./pages/Charisma";
import Sending from "./pages/Sending";
import Vault from "./pages/Vault";
import Questseek from "./pages/Questseek";
import Succubus from "./pages/Succubus";
import Doppleganger from "./pages/Doppleganger";
import BeholdR from "./pages/BeholdR";
import Crucible from "./pages/Crucible";
import NexusWire from "./pages/NexusWire";
import Brittlewisp from "./pages/Brittlewisp";
import Wyrmcart from "./pages/Wyrmcart";
import ToMe from "./pages/ToMe";
import Roldex from "./pages/Roldex";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/charisma" element={<Charisma />} />
            <Route path="/sending" element={<Sending />} />
            <Route path="/vault" element={<Vault />} />
            <Route path="/questseek" element={<Questseek />} />
            <Route path="/succubus" element={<Succubus />} />
            <Route path="/doppleganger" element={<Doppleganger />} />
            <Route path="/beholdr" element={<BeholdR />} />
            <Route path="/crucible" element={<Crucible />} />
            <Route path="/nexuswire" element={<NexusWire />} />
            <Route path="/brittlewisp" element={<Brittlewisp />} />
            <Route path="/wyrmcart" element={<Wyrmcart />} />
            <Route path="/tome" element={<ToMe />} />
            <Route path="/roldex" element={<Roldex />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
