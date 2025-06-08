import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, TrendingUp, Clock, Lightbulb } from "lucide-react";

interface AISuggestion {
  type: "urgent" | "opportunity" | "follow_up";
  leadId: number;
  message: string;
  action: string;
}

export function AISuggestions() {
  const { data: suggestions = [], isLoading } = useQuery<AISuggestion[]>({
    queryKey: ["/api/suggestions"],
  });

  const getIcon = (type: string) => {
    switch (type) {
      case "urgent":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "opportunity":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "follow_up":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Lightbulb className="h-4 w-4 text-blue-500" />;
    }
  };

  const getBadgeVariant = (type: string) => {
    switch (type) {
      case "urgent":
        return "destructive" as const;
      case "opportunity":
        return "default" as const;
      case "follow_up":
        return "secondary" as const;
      default:
        return "outline" as const;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            AI Suggestions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading suggestions...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5" />
          AI Suggestions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {suggestions.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No suggestions at the moment. Great job staying on top of your leads!
          </div>
        ) : (
          suggestions.map((suggestion, index) => (
            <div
              key={index}
              className="flex items-start justify-between p-3 border rounded-lg"
            >
              <div className="flex items-start gap-3">
                {getIcon(suggestion.type)}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={getBadgeVariant(suggestion.type)}>
                      {suggestion.type.replace("_", " ")}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium">{suggestion.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {suggestion.action}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  // Navigate to lead details or take action
                  window.location.href = `#lead-${suggestion.leadId}`;
                }}
              >
                View Lead
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}