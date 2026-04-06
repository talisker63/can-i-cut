import { useEffect, useMemo, useState, type ReactNode } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { getFirebaseAuth } from "../lib/firebase";
import { AuthContext } from "./auth-context";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      setReady(true);
      return;
    }
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setReady(true);
    });
    return () => unsub();
  }, []);
  const value = useMemo(() => ({ user, ready }), [user, ready]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
