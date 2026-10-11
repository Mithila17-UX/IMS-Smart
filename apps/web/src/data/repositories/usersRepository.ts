import {
  collection,
  doc,
  onSnapshot,
  query,
  orderBy,
  updateDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../firebase";
import { UserSchema, type AppUser, type CreateUserInput } from "../schemas/user.schema";

export const usersRepository = {
  /**
   * Listen to users of a client in real-time.
   */
  subscribeUsers(
    clientId: string,
    onData: (users: AppUser[]) => void,
    onError?: (err: Error) => void,
  ): Unsubscribe {
    const usersRef = collection(db, "clients", clientId, "users");
    const q = query(usersRef, orderBy("displayName", "asc"));

    return onSnapshot(
      q,
      (snapshot) => {
        const users: AppUser[] = [];
        snapshot.forEach((d) => {
          const parsed = UserSchema.safeParse({ id: d.id, ...d.data() });
          if (parsed.success) {
            users.push(parsed.data);
          }
        });
        onData(users);
      },
      (error) => {
        if (onError) onError(error);
      },
    );
  },

  /**
   * Create a new user for a client via Cloud Function `createUser`.
   * This creates the Firebase Auth user, sets custom claims, and writes the user document.
   */
  async createUser(clientId: string, input: CreateUserInput): Promise<{ userId: string }> {
    const createFn = httpsCallable<CreateUserInput & { clientId: string }, { userId: string }>(
      functions,
      "createUser",
    );
    const result = await createFn({ ...input, clientId });
    return result.data;
  },

  /**
   * Toggle a user's active status.
   */
  async setUserActive(clientId: string, userId: string, active: boolean): Promise<void> {
    const userDocRef = doc(db, "clients", clientId, "users", userId);
    await updateDoc(userDocRef, { active });
  },

  /**
   * Reset user password via Cloud Function `resetPassword`.
   */
  async resetPassword(clientId: string, userId: string, newPassword?: string): Promise<{ passwordResetLink?: string }> {
    const resetFn = httpsCallable<{ clientId: string; userId: string; newPassword?: string }, { passwordResetLink?: string }>(
      functions,
      "resetPassword",
    );
    const res = await resetFn({ clientId, userId, newPassword });
    return res.data;
  },
};
