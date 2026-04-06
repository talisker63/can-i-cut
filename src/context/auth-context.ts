import { createContext } from "react";
import type { User } from "firebase/auth";

export type AuthValue = {
  user: User | null;
  ready: boolean;
};

export const AuthContext = createContext<AuthValue>({ user: null, ready: false });
