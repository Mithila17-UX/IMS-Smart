import React, { createContext, useContext, useEffect, useState } from "react";
import {
  type User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
} from "firebase/auth";
import { auth } from "@/data/firebase";
import { entitlementsRepository } from "@/data/repositories/entitlementsRepository";
import type { ClientEntitlements } from "@/domain/entitlements";
import type { UserRole } from "@/data/schemas/user.schema";

export interface AuthContextValue {
  user: FirebaseUser | null;
  role: UserRole | null;
  clientId: string | null;
  effectiveClientId: string | null;
  supportClientId: string | null;
  isSupportMode: boolean;
  entitlements: ClientEntitlements | null;
  loading: boolean;
  signIn: (email: string, pass: string) => Promise<void>;
  signOut: () => Promise<void>;
  enterSupportMode: (targetClientId: string) => void;
  exitSupportMode: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [supportClientId, setSupportClientId] = useState<string | null>(() => {
    return sessionStorage.getItem("ims_support_client_id");
  });
  const [entitlements, setEntitlements] = useState<ClientEntitlements | null>(null);
  const [loading, setLoading] = useState(true);

  // Sync auth state
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (fbUser) => {
      void (async () => {
        if (!fbUser) {
          setUser(null);
          setRole(null);
          setClientId(null);
          setEntitlements(null);
          setLoading(false);
          return;
        }

        setUser(fbUser);
        try {
          const tokenResult = await fbUser.getIdTokenResult(true);
          const userRole = (tokenResult.claims.role as UserRole) || null;
          const userClientId = (tokenResult.claims.clientId as string) || null;

          setRole(userRole);
          setClientId(userClientId);
        } catch (err) {
          console.error("Failed to parse auth custom claims", err);
        } finally {
          setLoading(false);
        }
      })();
    });

    return () => unsubAuth();
  }, []);

  const isSupportMode = role === "superadmin" && !!supportClientId;
  const effectiveClientId = isSupportMode ? supportClientId : clientId;

  // Listen to live entitlements for the effective client
  useEffect(() => {
    if (!effectiveClientId) {
      setEntitlements(null);
      return;
    }

    const unsubEntitlements = entitlementsRepository.subscribeEntitlements(
      effectiveClientId,
      (liveEntitlements) => {
        setEntitlements(liveEntitlements);
      },
      (error) => {
        console.error("Failed to load entitlements:", error);
      },
    );

    return () => unsubEntitlements();
  }, [effectiveClientId]);

  const signIn = async (email: string, pass: string) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    sessionStorage.removeItem("ims_support_client_id");
    setSupportClientId(null);
    await fbSignOut(auth);
  };

  const enterSupportMode = (targetClientId: string) => {
    if (role !== "superadmin") return;
    sessionStorage.setItem("ims_support_client_id", targetClientId);
    setSupportClientId(targetClientId);
  };

  const exitSupportMode = () => {
    sessionStorage.removeItem("ims_support_client_id");
    setSupportClientId(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        clientId,
        effectiveClientId,
        supportClientId,
        isSupportMode,
        entitlements,
        loading,
        signIn,
        signOut,
        enterSupportMode,
        exitSupportMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within a SessionProvider");
  }
  return ctx;
}
