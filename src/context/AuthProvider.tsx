import { useEffect, useMemo, useState, type ReactNode } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { getFirebaseAuth, getFirebaseFunctions } from "../lib/firebase";
import { AuthContext } from "./auth-context";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      setReady(true);
      return;
    }
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (!u) {
        setIsAdmin(false);
        setReady(true);
        return;
      }
      setIsAdmin(false);
      try {
        const fns = getFirebaseFunctions();
        if (fns) {
          const sync = httpsCallable(fns, "canICutAuSyncAdminClaim");
          await sync({});
        }
        await u.getIdToken(true);
      } catch {
        try {
          await u.getIdToken(true);
        } catch {
          setIsAdmin(false);
          setReady(true);
          return;
        }
      }
      const r = await u.getIdTokenResult();
      setIsAdmin(r.claims.admin === true);
      setReady(true);
    });
    return () => unsub();
  }, []);

  const value = useMemo(() => ({ user, ready, isAdmin }), [user, ready, isAdmin]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
