import { useEffect, useState } from "react";
import { api, setTokenGetter } from "@/lib/api";
import { useAuthStatus } from "@/components/auth/ClerkAuthProvider";

/** Registers the session token getter when clerk is enabled. */
export function AuthBridge() {
  const auth = useAuthStatus();
  useEffect(() => {
    if (!auth?.clerkEnabled) {
      setTokenGetter(() => Promise.resolve(null));
    }
  }, [auth?.clerkEnabled]);
  return null;
}

/** Returns current user state. In demo mode, defaults immediately to signed-in admin. */
export function useMe() {
  const auth = useAuthStatus();
  const [me, setMe] = useState({
    signed_in: true,
    auth_enabled: false,
    role: "admin",
    user_id: "demo_user",
    email: "demo@domainforge.ai"
  });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await api.me();
        if (active && data) setMe(data);
      } catch {
        if (active) {
          setMe({
            signed_in: true,
            auth_enabled: false,
            role: "admin",
            user_id: "demo_user",
            email: "demo@domainforge.ai"
          });
        }
      }
    })();
    return () => { active = false; };
  }, [auth?.clerkEnabled]);

  return me;
}
