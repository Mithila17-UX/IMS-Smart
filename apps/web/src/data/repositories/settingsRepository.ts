import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "../firebase";
import type { SettingVersion } from "@/domain/settings";

export const settingsRepository = {
  /**
   * Listen to all setting versions for a client in real-time.
   */
  subscribeSettingVersions(
    clientId: string,
    onData: (versions: SettingVersion[]) => void,
    onError?: (err: Error) => void,
  ): Unsubscribe {
    const versionsRef = collection(db, "clients", clientId, "settingVersions");
    const q = query(versionsRef, orderBy("effectiveFrom", "desc"));

    return onSnapshot(
      q,
      (snapshot) => {
        const versions: SettingVersion[] = [];
        snapshot.forEach((d) => {
          const data = d.data();
          versions.push({
            key: data.key as string,
            value: data.value as boolean | number | string,
            effectiveFrom: data.effectiveFrom as string,
            changedBy: data.changedBy as string,
            changeReason: data.changeReason as string | undefined,
          });
        });
        onData(versions);
      },
      (error) => {
        if (onError) onError(error);
      },
    );
  },

  /**
   * Append a new setting version. Never updates in place.
   */
  async saveSettingVersion(clientId: string, version: SettingVersion): Promise<string> {
    const versionsRef = collection(db, "clients", clientId, "settingVersions");
    const docRef = await addDoc(versionsRef, {
      ...version,
      createdAt: new Date().toISOString(),
    });
    return docRef.id;
  },
};
