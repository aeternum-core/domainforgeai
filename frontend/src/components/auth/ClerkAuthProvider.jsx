import { useEffect, useState, createContext, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { ClerkProvider } from "@clerk/react";

// Brand Clerk here. We keep Clerk's own light card (readable social buttons) and only
// theme the primary colour / radius / font to match DomainForge.
const appearance = {
  variables: {
    colorPrimary: "#0f766e",
    borderRadius: "0.75rem",
    fontFamily: '"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif',
  },
};

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";

export const AuthContext = createContext({
  clerkEnabled: false,
  isLoaded: true,
  isSignedIn: true,
  user: { id: "demo_user", fullName: "Domain Expert", email: "demo@domainforge.ai" }
});

export const useAuthStatus = () => useContext(AuthContext);

export default function ClerkAuthProvider({ children }) {
  const navigate = useNavigate();
  const [config, setConfig] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/clerk/config`);
        const cfg = await res.json();
        if (!cancelled) setConfig(cfg);
      } catch {
        if (!cancelled) setConfig({ enabled: false });
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  if (!config) {
    return (
      <AuthContext.Provider value={{ clerkEnabled: false, isLoaded: true, isSignedIn: true }}>
        {children}
      </AuthContext.Provider>
    );
  }

  if (!config.enabled || !config.publishable_key) {
    return (
      <AuthContext.Provider value={{ clerkEnabled: false, isLoaded: true, isSignedIn: true }}>
        {children}
      </AuthContext.Provider>
    );
  }

  return (
    <AuthContext.Provider value={{ clerkEnabled: true, isLoaded: true, isSignedIn: true }}>
      <ClerkProvider
        publishableKey={config.publishable_key}
        proxyUrl={config.proxy_url || undefined}
        appearance={appearance}
        routerPush={(to) => navigate(to)}
        routerReplace={(to) => navigate(to, { replace: true })}
        signInUrl="/sign-in"
        signUpUrl="/sign-up"
        signInFallbackRedirectUrl="/"
        signUpFallbackRedirectUrl="/"
        afterSignOutUrl="/"
      >
        {children}
      </ClerkProvider>
    </AuthContext.Provider>
  );
}
