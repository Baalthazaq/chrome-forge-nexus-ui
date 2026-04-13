import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Feature List</h1>
          <Button onClick={() => navigate("/admin")} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Admin
          </Button>
        </div>

        <p className="text-muted-foreground text-sm">
          Complete feature breakdown for all {appFeatures.length} Nexus OS applications.
        </p>

        <div className="space-y-4">
          {appFeatures.map((app) => (
            <Collapsible key={app.name}>
              <Card className={`border-l-4 ${app.color}`}>
                <CollapsibleTrigger className="w-full text-left">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between">
                      <span>{app.name}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs font-normal">
                          {app.features.length} features
                        </Badge>
                        <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 [[data-state=open]_&]:rotate-180" />
                      </div>
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">{app.description}</p>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent>
                    <ul className="space-y-1.5">
                      {app.features.map((feature, i) => (
                        <li key={i} className="text-sm text-foreground/80 flex items-start gap-2">
                          <span className="text-primary mt-1 shrink-0">•</span>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FeatureList;
