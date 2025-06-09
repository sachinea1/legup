import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout/app-layout";
import Dashboard from "@/pages/dashboard";
import Leads from "@/pages/leads";
import Widget from "@/pages/widget";
import NotFound from "@/pages/not-found";

function Router() {
  const [location] = useLocation();
  
  // Routes that should not show the sidebar (customer-facing pages)
  const noSidebarRoutes = ["/widget"];
  const shouldShowSidebar = !noSidebarRoutes.includes(location);

  if (!shouldShowSidebar) {
    return (
      <Switch>
        <Route path="/widget" component={Widget} />
      </Switch>
    );
  }

  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/leads" component={Leads} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
