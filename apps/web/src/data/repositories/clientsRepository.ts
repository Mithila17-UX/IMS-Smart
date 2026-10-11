import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  orderBy,
  type Unsubscribe,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../firebase";
import { ClientSchema, type Client, type CreateClientInput } from "../schemas/client.schema";

export const clientsRepository = {
  /**
   * Listen to all clients in real-time (Super Admin console only).
   */
  subscribeAllClients(onData: (clients: Client[]) => void, onError?: (err: Error) => void): Unsubscribe {
    const clientsRef = collection(db, "clients");
    const q = query(clientsRef, orderBy("name", "asc"));

    return onSnapshot(
      q,
      (snapshot) => {
        const clients: Client[] = [];
        snapshot.forEach((d) => {
          const parsed = ClientSchema.safeParse({ id: d.id, ...d.data() });
          if (parsed.success) {
            clients.push(parsed.data);
          }
        });
        onData(clients);
      },
      (error) => {
        if (onError) onError(error);
      },
    );
  },

  /**
   * Get a single client by ID.
   */
  async getClient(clientId: string): Promise<Client | null> {
    const docRef = doc(db, "clients", clientId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    const parsed = ClientSchema.safeParse({ id: snap.id, ...snap.data() });
    return parsed.success ? parsed.data : null;
  },

  /**
   * Create a new client (Invokes Cloud Function `createClient`).
   * This creates the client doc, entitlements, initial client admin user and auth claims.
   */
  async createClient(input: CreateClientInput): Promise<{ clientId: string }> {
    const createFn = httpsCallable<CreateClientInput, { clientId: string }>(functions, "createClient");
    const result = await createFn(input);
    return result.data;
  },

  /**
   * Update client status (Active, Read-only, Blocked) via Cloud Function `setClientStatus`.
   */
  async setClientStatus(clientId: string, status: "active" | "read_only" | "blocked", reason?: string): Promise<void> {
    const setStatusFn = httpsCallable<{ clientId: string; status: string; reason?: string }, void>(
      functions,
      "setClientStatus",
    );
    await setStatusFn({ clientId, status, reason });
  },

  /**
   * Update client metadata (name, contact, branding, timezone, billing notes).
   */
  async updateClient(clientId: string, updates: Partial<Client>): Promise<void> {
    const updateFn = httpsCallable<{ clientId: string; updates: Partial<Client> }, void>(
      functions,
      "updateClient",
    );
    await updateFn({ clientId, updates });
  },
};
