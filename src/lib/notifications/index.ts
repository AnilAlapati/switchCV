import { NotificationService } from "./service";
import { FirestoreNotificationRepository } from "./repositories/firestoreRepository";
import { MemoryNotificationRepository } from "./repositories/memoryRepository";

// Determine which repository to use based on environment
const useFirestore =
  process.env.NEXT_PUBLIC_USE_FIRESTORE_NOTIFICATIONS === "true" ||
  process.env.NODE_ENV === "production";

const repository = useFirestore
  ? new FirestoreNotificationRepository()
  : new MemoryNotificationRepository();

export const notificationService = new NotificationService(repository);

export * from "./service";
export * from "./repository";
export * from "./repositories/memoryRepository";
export * from "./repositories/firestoreRepository";
