import { Switch, Route, Router as WouterRouter } from "wouter";
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
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={RagaIdentifier} />
        <Route path="/ragas" component={RagaBrowser} />
        <Route path="/tala" component={TalaReference} />
        <Route path="/detect" component={PitchDetect} />
        <Route path="/compose" component={Compose} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
