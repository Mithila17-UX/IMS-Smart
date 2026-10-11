import { doc, getDoc, onSnapshot, type Unsubscribe } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../firebase";
import { EntitlementsSchema } from "../schemas/entitlements.schema";
import type { ClientEntitlements } from "@/domain/entitlements";

export const entitlementsRepository = {
  /**
   * Listen to entitlements for a specific client in real-time.
   */
  subscribeEntitlements(
    clientId: string,
    onData: (entitlements: ClientEntitlements | null) => void,
    onError?: (err: Error) => void,
  ): Unsubscribe {
    const docRef = doc(db, "clients", clientId, "entitlements", "main");
    return onSnapshot(
      docRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          onData(null);
          return;
        }
        const parsed = EntitlementsSchema.safeParse(snapshot.data());
        if (parsed.success) {
          onData(parsed.data as ClientEntitlements);
        } else {
          onData(null);
        }
      },
      (error) => {
        if (onError) onError(error);
      },
    );
  },

  /**
   * Fetch entitlements once.
   */
  async getEntitlements(clientId: string): Promise<ClientEntitlements | null> {
    const docRef = doc(db, "clients", clientId, "entitlements", "main");
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    const parsed = EntitlementsSchema.safeParse(snap.data());
    return parsed.success ? (parsed.data as ClientEntitlements) : null;
  },

  /**
   * Update entitlements via Cloud Function `setEntitlements`.
   */
  async updateEntitlements(clientId: string, entitlements: Partial<ClientEntitlements>): Promise<void> {
    const updateFn = httpsCallable<{ clientId: string; entitlements: Partial<ClientEntitlements> }, void>(
      functions,
      "setEntitlements",
    );
    await updateFn({ clientId, entitlements });
  },
};
