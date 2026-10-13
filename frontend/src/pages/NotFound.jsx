import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="font-heading text-6xl font-extrabold text-primary">404</h1>
      <p className="mt-3 text-lg text-muted-foreground">We couldn't find that page.</p>
      <Button asChild className="mt-6"><Link to="/">Back to dashboard</Link></Button>
    </div>
  );
}
