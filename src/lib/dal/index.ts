/**
 * src/lib/dal/index.ts
 *
 * Public DAL surface used by API routes.
 */

export {
  getDoc,
  queryDocs,
  createDoc,
  updateDoc,
  deleteDoc,
  getSubDoc,
  querySubDocs,
  createBatch,
  runTransaction,
  serverTimestamp,
  increment,
  arrayUnion,
  arrayRemove,
  timestampFromDate,
  deleteField,
  collectionRef,
  collectionGroupRef,
  getDb,
} from "./base-repository";

export type { QueryOptions, PaginatedResult, WhereClause, OrderByClause } from "./types";

export { COLLECTIONS } from "./collections";
export type { CollectionName } from "./collections";

export {
  verifyIdToken,
  getAuthUser,
  getAuthUserByEmail,
  setCustomClaims,
  generatePasswordResetLink,
  updateAuthUser,
  deleteAuthUser,
  createAuthUser,
} from "./auth";

export type {
  DocumentReference,
  CollectionReference,
  Query,
  DocumentSnapshot,
  QuerySnapshot,
  WriteBatch,
  Transaction,
} from "./client";
