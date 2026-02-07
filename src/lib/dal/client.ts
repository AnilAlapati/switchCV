/**
 * src/lib/dal/client.ts
 *
 * Central Firestore/Auth client exports for API routes.
 * API routes should import from @/lib/dal, not @/lib/firebase-admin.
 */

import { adminDb, adminAuth } from "@/lib/firebase-admin";
import {
  FieldValue as AdminFieldValue,
  Timestamp as AdminTimestamp,
} from "firebase-admin/firestore";
import type * as AdminNamespace from "firebase-admin";

export const db = adminDb;
export const auth = adminAuth;
export const FieldValue = AdminFieldValue;
export const Timestamp = AdminTimestamp;

export type Firestore = AdminNamespace.firestore.Firestore;
export type DocumentReference = AdminNamespace.firestore.DocumentReference;
export type CollectionReference = AdminNamespace.firestore.CollectionReference;
export type Query = AdminNamespace.firestore.Query;
export type DocumentSnapshot = AdminNamespace.firestore.DocumentSnapshot;
export type QuerySnapshot = AdminNamespace.firestore.QuerySnapshot;
export type WriteBatch = AdminNamespace.firestore.WriteBatch;
export type Transaction = AdminNamespace.firestore.Transaction;
export type WhereFilterOp = AdminNamespace.firestore.WhereFilterOp;
export type FieldValueType = AdminNamespace.firestore.FieldValue;
export type TimestampType = AdminNamespace.firestore.Timestamp;
