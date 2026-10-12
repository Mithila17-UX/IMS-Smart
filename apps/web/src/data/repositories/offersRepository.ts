/**
 * Offers Repository.
 *
 * Real-time subscriptions and CRUD operations for promotional offers & happy hours.
 */

import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/data/firebase";
import type { Offer } from "@/data/schemas/offer.schema";

function offersCol(clientId: string) {
  return collection(db, "clients", clientId, "offers");
}

export const offersRepository = {
  subscribeOffers(
    clientId: string,
    onData: (offers: Offer[]) => void,
    onError?: (err: Error) => void,
  ): Unsubscribe {
    const q = query(offersCol(clientId), where("active", "==", true), orderBy("priority", "desc"));
    return onSnapshot(
      q,
      (snap) => {
        const items: Offer[] = [];
        snap.forEach((d) => items.push({ id: d.id, ...d.data() } as Offer));
        onData(items);
      },
      (err) => onError?.(err),
    );
  },

  subscribeAllOffers(
    clientId: string,
    onData: (offers: Offer[]) => void,
    onError?: (err: Error) => void,
  ): Unsubscribe {
    const q = query(offersCol(clientId), orderBy("priority", "desc"));
    return onSnapshot(
      q,
      (snap) => {
        const items: Offer[] = [];
        snap.forEach((d) => items.push({ id: d.id, ...d.data() } as Offer));
        onData(items);
      },
      (err) => onError?.(err),
    );
  },

  async getOffers(clientId: string): Promise<Offer[]> {
    const q = query(offersCol(clientId), where("active", "==", true), orderBy("priority", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Offer));
  },

  async saveOffer(
    clientId: string,
    offer: Omit<Offer, "id" | "createdAt" | "updatedAt">,
    existingId?: string,
  ): Promise<string> {
    const now = new Date().toISOString();
    if (existingId) {
      const ref = doc(offersCol(clientId), existingId);
      await updateDoc(ref, { ...offer, updatedAt: now });
      return existingId;
    }
    const ref = await addDoc(offersCol(clientId), {
      ...offer,
      createdAt: now,
      updatedAt: now,
    });
    await updateDoc(ref, { id: ref.id });
    return ref.id;
  },
};
