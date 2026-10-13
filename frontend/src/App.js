import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { SiteHeader } from "@/components/layout/SiteHeader";
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

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <div className="App min-h-screen bg-background text-foreground">
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Shell><Dashboard /></Shell>} />
            <Route path="/create" element={<Shell><CreateWizard /></Shell>} />
            <Route path="/agents/:id" element={<Shell><Workspace /></Shell>} />
            <Route path="/a/:slug" element={<Shell><PublicAgent /></Shell>} />
            <Route path="*" element={<Shell><NotFound /></Shell>} />
          </Routes>
        </BrowserRouter>
        <Toaster richColors position="top-right" />
      </div>
    </ThemeProvider>
  );
}

export default App;
