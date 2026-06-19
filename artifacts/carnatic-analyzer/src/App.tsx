import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { Layout } from "@/components/Layout";

import RagaIdentifier from "@/pages/RagaIdentifier";
import RagaBrowser from "@/pages/RagaBrowser";
import TalaReference from "@/pages/TalaReference";
import PitchDetect from "@/pages/PitchDetect";
import Compose from "@/pages/Compose";
import GamakaExplorer from "@/pages/GamakaExplorer";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function AppRoutes() {
  return (
    <Switch>
      <Route path="/login">
        <Redirect to="/" />
      </Route>

      <Route path="/signup">
        <Redirect to="/" />
      </Route>

      <Route>
        <Layout>
          <Switch>
            <Route path="/" component={RagaIdentifier} />
            <Route path="/ragas" component={RagaBrowser} />
            <Route path="/tala" component={TalaReference} />
            <Route path="/detect" component={PitchDetect} />
            <Route path="/compose" component={Compose} />
            <Route path="/gamakas" component={GamakaExplorer} />
            <Route component={NotFound} />
          </Switch>
        </Layout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AppRoutes />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;