import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { Layout } from "@/components/Layout";
import RagaIdentifier from "@/pages/RagaIdentifier";
import RagaBrowser from "@/pages/RagaBrowser";
import TalaReference from "@/pages/TalaReference";
import PitchDetect from "@/pages/PitchDetect";
import Compose from "@/pages/Compose";
import GamakaExplorer from "@/pages/GamakaExplorer";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />

      {!user ? (
        <Route>
          <Redirect to="/login" />
        </Route>
      ) : (
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
      )}
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AuthProvider>
              <AppRoutes />
            </AuthProvider>
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
