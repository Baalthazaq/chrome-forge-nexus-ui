
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Charisma from "./pages/Charisma";
import Sending from "./pages/Sending";
import Vault from "./pages/Vault";
import Questseek from "./pages/Questseek";
import Succubus from "./pages/Succubus";
import Mimic from "./pages/Mimic";
import Crucible from "./pages/Crucible";
import NexusWire from "./pages/NexusWire";
import Brittlewisp from "./pages/Brittlewisp";
import Wyrmcart from "./pages/Wyrmcart";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/charisma" element={<Charisma />} />
          <Route path="/sending" element={<Sending />} />
          <Route path="/vault" element={<Vault />} />
          <Route path="/questseek" element={<Questseek />} />
          <Route path="/succubus" element={<Succubus />} />
          <Route path="/mimic" element={<Mimic />} />
          <Route path="/crucible" element={<Crucible />} />
          <Route path="/nexuswire" element={<NexusWire />} />
          <Route path="/brittlewisp" element={<Brittlewisp />} />
          <Route path="/wyrmcart" element={<Wyrmcart />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
