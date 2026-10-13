import { useEffect, useState } from "react";
import { useAuth } from "@clerk/react";
import { api, setTokenGetter } from "@/lib/api";

/** Registers the Clerk session-token getter so axios attaches it to every request. */
export function AuthBridge() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  useEffect(() => {
    setTokenGetter(() => getToken());
  }, [getToken, isLoaded, isSignedIn]);
  return null;
}

/** Returns the backend's view of the current user: { signed_in, role, user_id, email } or null while loading. */
export function useMe() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [me, setMe] = useState(null);
  useEffect(() => {
    if (!isLoaded) return;
    let active = true;
    (async () => {
      try {
        setTokenGetter(() => getToken());
        const data = await api.me();
        if (active) setMe(data);
      } catch {
        if (active) setMe({ signed_in: false, auth_enabled: true });
      }
    })();
    return () => { active = false; };
  }, [isLoaded, isSignedIn, getToken]);
  return me;
}
