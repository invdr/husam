import { pb } from "@/lib/pocketbase";

export function isPocketbaseAbortError(error) {
  return !!(
    error?.isAbort ||
    /autocancelled|aborted|cancell?ed/i.test(error?.message || "")
  );
}

export async function subscribeToPocketbaseCollections(collectionNames, onChange) {
  const unsubscribers = [];

  try {
    for (const collectionName of collectionNames) {
      const unsubscribe = await pb.collection(collectionName).subscribe("*", onChange);
      unsubscribers.push(unsubscribe);
    }
  } catch (error) {
    unsubscribers.forEach((unsubscribe) => unsubscribe());
    throw error;
  }

  return () => {
    unsubscribers.forEach((unsubscribe) => unsubscribe());
  };
}
