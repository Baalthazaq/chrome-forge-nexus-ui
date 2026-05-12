import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import TransformationsList from "@/components/TransformationsList";

export default function Transformations() {
  const navigate = useNavigate();
  return (
    <div className="dark min-h-screen bg-background text-foreground p-6">
      <div className="max-w-5xl mx-auto space-y-4">
        <header className="space-y-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ml-2">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <h1 className="text-4xl font-bold tracking-tight">Transformations</h1>
          <p className="text-muted-foreground">
            Modifiers that can be layered on top of a creature's lineage — innate or afflicted via a
            carrier. Daggerheart official transformations will be added here as they're catalogued.
          </p>
        </header>
        <TransformationsList />
      </div>
    </div>
  );
}
