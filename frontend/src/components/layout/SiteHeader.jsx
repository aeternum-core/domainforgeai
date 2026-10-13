import { Link, useLocation } from "react-router-dom";
import { Hexagon, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";

export function SiteHeader() {
  const { pathname } = useLocation();
  const onPublic = pathname.startsWith("/a/");
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5" data-testid="nav-logo" aria-label="DomainForge AI home">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Hexagon className="h-5 w-5" strokeWidth={2.5} />
          </span>
          <span className="flex flex-col leading-none">
            <span className="font-heading text-lg font-extrabold tracking-tight">DomainForge</span>
            <span className="hidden text-[11px] font-medium text-muted-foreground sm:block">
              You understand the problem. We help build the agent.
            </span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-1.5 rounded-full border border-indigo-300 bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-900 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-200 sm:inline-flex">
            Demo mode
          </span>
          {!onPublic && (
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <Link to="/" data-testid="nav-dashboard">Dashboard</Link>
            </Button>
          )}
          <ThemeToggle />
          {!onPublic && (
            <Button asChild data-testid="nav-create">
              <Link to="/create">
                <Plus className="h-4 w-4" /> Create agent
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
