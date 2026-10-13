import "@/App.css";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { SignIn, SignUp } from "@clerk/react";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/layout/SiteHeader";
import ClerkAuthProvider, { useAuthStatus } from "@/components/auth/ClerkAuthProvider";
import { AuthBridge } from "@/hooks/useMe";
import Dashboard from "@/pages/Dashboard";
import CreateWizard from "@/pages/CreateWizard";
import Workspace from "@/pages/Workspace";
import PublicAgent from "@/pages/PublicAgent";
import NotFound from "@/pages/NotFound";

function Shell({ children }) {
  return (
    <>
      <a href="#main" className="skip-link">Skip to main content</a>
      <SiteHeader />
      <main id="main" className="min-h-[calc(100vh-4rem)]">{children}</main>
    </>
  );
}

function AuthScreen({ children }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-primary p-12 text-primary-foreground lg:flex">
        <div className="dot-grid absolute inset-0 opacity-20" aria-hidden="true" />
        <span className="relative font-heading text-xl font-extrabold">DomainForge</span>
        <div className="relative">
          <h2 className="font-heading text-4xl font-extrabold leading-tight">You understand the problem.</h2>
          <p className="mt-2 text-lg opacity-90">We help build the agent. Sign in to create, test and publish your own agents.</p>
        </div>
        <span className="relative text-sm opacity-80">DomainForge · Live Engine</span>
      </div>
      <div className="flex items-center justify-center bg-background p-6">{children}</div>
    </div>
  );
}


function SafeSignIn() {
  const auth = useAuthStatus();
  if (!auth?.clerkEnabled) {
    return (
      <div className="text-center space-y-4">
        <h3 className="text-xl font-bold">Live Engine Active</h3>
        <p className="text-sm text-muted-foreground">You are running the Live Engine with full authoring and execution access. No sign in required.</p>
        <Button asChild><Link to="/">Go to Dashboard</Link></Button>
      </div>
    );
  }
  return <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" withSignUp />;
}

function SafeSignUp() {
  const auth = useAuthStatus();
  if (!auth?.clerkEnabled) {
    return (
      <div className="text-center space-y-4">
        <h3 className="text-xl font-bold">Live Engine Active</h3>
        <p className="text-sm text-muted-foreground">You are running the Live Engine with full authoring and execution access. No sign up required.</p>
        <Button asChild><Link to="/">Go to Dashboard</Link></Button>
      </div>
    );
  }
  return <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" />;
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <div className="App min-h-screen bg-background text-foreground">
        <BrowserRouter>
          <ClerkAuthProvider>
            <AuthBridge />
            <Routes>
              <Route path="/" element={<Shell><Dashboard /></Shell>} />
              <Route path="/create" element={<Shell><CreateWizard /></Shell>} />
              <Route path="/agents/:id" element={<Shell><Workspace /></Shell>} />
              <Route path="/a/:slug" element={<Shell><PublicAgent /></Shell>} />
              <Route path="/p/:slug" element={<Shell><PublicAgent /></Shell>} />
              <Route path="/sign-in/*" element={<AuthScreen><SafeSignIn /></AuthScreen>} />
              <Route path="/sign-up/*" element={<AuthScreen><SafeSignUp /></AuthScreen>} />
              <Route path="*" element={<Shell><NotFound /></Shell>} />
            </Routes>
          </ClerkAuthProvider>
        </BrowserRouter>
        <Toaster richColors position="top-right" />
      </div>
    </ThemeProvider>
  );
}

export default App;
