/**
 * src/lib/dal/base-repository.ts
 *
 * Generic Firestore repository helpers.
 */

import {
  db,
  FieldValue,
  Timestamp,
  type Firestore,
  type Query,
  type WriteBatch,
  type Transaction,
  type FieldValueType,
  type TimestampType,
  type CollectionReference,
} from "./client";
import type { CollectionName } from "./collections";
import type { QueryOptions, PaginatedResult } from "./types";

type FirestoreQuery = Query;
type FirestoreWriteBatch = WriteBatch;
type FirestoreTransaction = Transaction;
type FirestoreFieldValue = FieldValueType;
type FirestoreTimestamp = TimestampType;
type FirestoreCollectionReference = CollectionReference;

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

export async function getDoc<T>(
  collection: CollectionName,
  docId: string
): Promise<T | null> {
  const snap = await db.collection(collection).doc(docId).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() } as T;
}

export async function queryDocs<T>(
  collection: CollectionName,
  options: QueryOptions = {}
): Promise<PaginatedResult<T>> {
  let query: FirestoreQuery = db.collection(collection);

  for (const whereClause of options.where ?? []) {
    query = query.where(whereClause.field, whereClause.op, whereClause.value);
  }

  if (options.orderBy) {
    query = query.orderBy(
      options.orderBy.field,
      options.orderBy.direction ?? "asc"
    );
  }

  const limit = Math.min(options.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
  query = query.limit(limit + 1);

  if (options.startAfter) {
    query = query.startAfter(options.startAfter);
  }
  if (options.offset) {
    query = query.offset(options.offset);
  }

  const snapshot = await query.get();
  const docs = snapshot.docs
    .slice(0, limit)
    .map((doc) => ({ id: doc.id, ...doc.data() }) as T);
  const hasMore = snapshot.docs.length > limit;
  const cursor =
    docs.length > 0
      ? (docs[docs.length - 1] as { id?: string }).id
      : undefined;

  return { data: docs, hasMore, cursor };
}

export async function createDoc<T extends Record<string, unknown>>(
  collection: CollectionName,
  data: T,
  docId?: string
): Promise<string> {
  const withTimestamps = {
    ...data,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (docId) {
    await db.collection(collection).doc(docId).set(withTimestamps);
    return docId;
  }

  const ref = await db.collection(collection).add(withTimestamps);
  return ref.id;
}

export async function updateDoc<T extends Record<string, unknown>>(
  collection: CollectionName,
  docId: string,
  data: T
): Promise<void> {
  await db
    .collection(collection)
    .doc(docId)
    .set({ ...data, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
}

export async function deleteDoc(
  collection: CollectionName,
  docId: string
): Promise<void> {
  await db.collection(collection).doc(docId).delete();
}

export async function getSubDoc<T>(
  parentCollection: CollectionName,
  parentId: string,
  subCollection: string,
  docId: string
): Promise<T | null> {
  const snap = await db
    .collection(parentCollection)
    .doc(parentId)
    .collection(subCollection)
    .doc(docId)
    .get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() } as T;
}

export async function querySubDocs<T>(
  parentCollection: CollectionName,
  parentId: string,
  subCollection: string,
  options: QueryOptions = {}
): Promise<PaginatedResult<T>> {
  let query: FirestoreQuery = db
    .collection(parentCollection)
    .doc(parentId)
    .collection(subCollection);

  for (const whereClause of options.where ?? []) {
    query = query.where(whereClause.field, whereClause.op, whereClause.value);
  }

  if (options.orderBy) {
    query = query.orderBy(
      options.orderBy.field,
      options.orderBy.direction ?? "asc"
    );
  }

  const limit = Math.min(options.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
  query = query.limit(limit + 1);

  if (options.startAfter) {
    query = query.startAfter(options.startAfter);
  }
  if (options.offset) {
    query = query.offset(options.offset);
  }

  const snapshot = await query.get();
  const docs = snapshot.docs
    .slice(0, limit)
    .map((doc) => ({ id: doc.id, ...doc.data() }) as T);
  const hasMore = snapshot.docs.length > limit;
  const cursor =
    docs.length > 0
      ? (docs[docs.length - 1] as { id?: string }).id
      : undefined;

  return { data: docs, hasMore, cursor };
}

export function createBatch(): FirestoreWriteBatch {
  return db.batch();
}

export async function runTransaction<T>(
  fn: (transaction: FirestoreTransaction) => Promise<T>
): Promise<T> {
  return db.runTransaction(fn);
}

export function serverTimestamp(): FirestoreFieldValue {
  return FieldValue.serverTimestamp();
}

export function increment(value: number = 1): FirestoreFieldValue {
  return FieldValue.increment(value);
}

export function arrayUnion(...elements: unknown[]): FirestoreFieldValue {
  return FieldValue.arrayUnion(...elements);
}

export function arrayRemove(...elements: unknown[]): FirestoreFieldValue {
  return FieldValue.arrayRemove(...elements);
}

export function timestampFromDate(date: Date): FirestoreTimestamp {
  return Timestamp.fromDate(date);
}

export function deleteField(): FirestoreFieldValue {
  return FieldValue.delete();
}

export function collectionRef(
  collection: CollectionName
): FirestoreCollectionReference {
  return db.collection(collection);
}

export function collectionGroupRef(collectionId: string): FirestoreQuery {
  return db.collectionGroup(collectionId);
}

export function getDb(): Firestore {
  return db;
}
