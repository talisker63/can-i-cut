import "./admin-init";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import type { VicLgaCuratedRow, VicLgaTreeLocalLawEntry } from "./vic-lga-tree-local-law";
import { getTreeLocalLawForLga } from "./vic-lga-tree-local-law";

const COLLECTION = "curatedCouncilEntries";

function db() {
  return getFirestore();
}

export async function fetchCuratedCouncilOverlay(lgaName: string): Promise<VicLgaCuratedRow | null> {
  const snap = await db().collection(COLLECTION).doc(lgaName).get();
  if (!snap.exists) return null;
  const row = snap.data()?.row;
  if (!row || typeof row !== "object") return null;
  return row as VicLgaCuratedRow;
}

export async function resolveTreeLocalLawWithFirestore(lgaName: string): Promise<VicLgaTreeLocalLawEntry> {
  const overlay = await fetchCuratedCouncilOverlay(lgaName);
  if (overlay) {
    return { lgaName, ...overlay };
  }
  return getTreeLocalLawForLga(lgaName);
}

export async function saveCuratedCouncilEntry(lgaName: string, row: VicLgaCuratedRow, uid: string): Promise<void> {
  await db()
    .collection(COLLECTION)
    .doc(lgaName)
    .set({
      row,
      committedAt: FieldValue.serverTimestamp(),
      committedByUid: uid,
    });
}
