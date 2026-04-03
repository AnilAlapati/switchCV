# Data Access Layer (DAL) — Interview Deep Dive

This document provides a comprehensive overview of the Data Access Layer (DAL) pattern, specifically tailored for modern full-stack applications using Firestore/Firebase.

---

## 🏗️ What is a DAL?

A **Data Access Layer (DAL)** is an architectural layer that resides between the business logic (services/routes) and the persistence mechanism (database). Its primary responsibility is to abstract away the details of the database implementation, providing a clean, typed API for data operations.

In this project, the DAL wraps the `firebase-admin` SDK, ensuring that API routes and server-side logic never interact with the database directly.

## 🚀 Why use a DAL?

1.  **Separation of Concerns**: Your business logic shouldn't care if you're using Firestore, MongoDB, or PostgreSQL. The DAL handles the "how" of data retrieval.
2.  **Type Safety**: Centralizing data access allows for strict TypeScript interfaces across the entire application.
3.  **Governance & Safety**:
    *   **Enforced Limits**: The DAL can mandate limits on queries to prevent accidental OOM (Out of Memory) or high-cost unbounded reads.
    *   **Consistent Metadata**: Automated injection of `createdAt` and `updatedAt` timestamps.
4.  **Testability**: Instead of mocking complex database SDKs (like `firebase-admin`), you can mock the simplified DAL interface, making unit tests faster and more reliable.
5.  **Auditability**: A single place to add logging, performance monitoring, or security checks for every database operation.

## ⚠️ Why NOT use a DAL? (Trade-offs)

1.  **Boilerplate**: It adds an extra layer of code. For very small, simple projects, it might feel like "over-engineering."
2.  **Abstraction Leakage**: Sometimes you need a very complex database-specific feature (e.g., Firestore's `multi-hop` subcollection queries) that the DAL hasn't implemented yet, forcing you to either update the DAL or bypass it.
3.  **Indirection**: New developers have to learn "The DAL way" rather than just looking up the official database documentation.
4.  **Maintenance**: If the underlying SDK updates its API, you must update the DAL to maintain compatibility.

---

## 🎙️ Top 30 Interview Questions & Answers

### 1. Basic Concepts

**Q1: What is the primary purpose of a DAL?**
**A:** To decouple the application's business logic from the database implementation, providing a consistent API for data operations and improving maintainability.

**Q2: How does a DAL improve security?**
**A:** It centralizes access control logic. Instead of checking permissions in every route, you can implement centralized validation or data filtering inside the DAL.

**Q3: Can a DAL be used with multiple databases simultaneously?**
**A:** Yes. A well-designed DAL can abstract multiple data sources (e.g., Firestore for user data and Redis for caching) behind a single unified interface.

**Q4: What is "Repository Pattern" in relation to DAL?**
**A:** The Repository Pattern is a common way to implement a DAL. It treats the database like an in-memory collection, offering methods like `find`, `add`, or `remove`.

**Q5: Is a DAL the same as an ORM (Object-Relational Mapping)?**
**A:** No. An ORM is a tool (like Prisma or TypeORM) that maps database rows to objects. A DAL is an architectural layer that *might use* an ORM internally but provides a higher-level abstraction for the app.

---

### 2. Implementation Details

**Q6: Why is it important to enforce query limits in a DAL?**
**A:** To prevent performance degradation and high costs. Without limits, a query could accidentally pull 100,000 documents, crashing the server or exhausting the database quota.

**Q7: How do you handle database transactions within a DAL?**
**A:** The DAL should provide a wrapper for transactions (e.g., `runTransaction`) that exposes a safe interface for atomic read-write operations, hiding the complexity of the underlying SDK.

**Q8: What is the benefit of using "Server Timestamps" in the DAL?**
**A:** It ensures consistency across a distributed system. Using the database server's time (via `FieldValue.serverTimestamp()`) avoids issues with clock skew on client/application servers.

**Q9: How do you handle pagination in a DAL?**
**A:** By returning a standardized object containing the data, a `hasMore` boolean, and a `cursor` (usually the last document ID) to be used in subsequent requests.

**Q10: What is an "Escape Hatch" in a DAL?**
**A:** A method (like `getDb()`) that returns the raw database instance. It's used for rare, highly complex operations that aren't supported by the standard DAL API.

---

### 3. Testing & Maintenance

**Q11: Why is a DAL easier to mock than a database SDK?**
**A:** SDKs often have complex, chained method calls (e.g., `db.collection().where().limit().get()`). A DAL simplifies this to a single method (e.g., `queryDocs()`), which is trivial to mock with a tool like Jest or Vitest.

**Q12: Should error handling happen in the DAL or the caller?**
**A:** Both. The DAL should handle database-specific errors (e.g., retry on transient network failure) and re-throw meaningful, application-level errors for the caller to handle.

**Q13: How do you version a DAL?**
**A:** By following semantic versioning. If you change a method signature (e.g., adding a mandatory parameter), it's a breaking change. Using DTOs (Data Transfer Objects) can help shield callers from minor schema shifts.

**Q14: What is the risk of "Fat DAL"?**
**A:** When business logic starts creeping into the DAL (e.g., "if user is premium, calculate discount"). The DAL should only handle data movement; logic belongs in Services.

**Q15: How does a DAL help with database migrations?**
**A:** If you decide to switch from Firestore to PostgreSQL, you only have to rewrite the DAL implementation. The rest of your application code remains largely untouched.

---

### 4. Advanced Scenarios

**Q16: How do you implement "Soft Deletes" in a DAL?**
**A:** By overriding the `deleteDoc` method to instead update a `deletedAt` field and filtering all queries to exclude documents where `deletedAt` is present.

**Q17: What is the role of DTOs (Data Transfer Objects) in a DAL?**
**A:** DTOs ensure that the data shape returned to the application is predictable and doesn't expose internal database fields (like sensitive tracking IDs) unintentionally.

**Q18: How do you handle "Collection Groups" in a Firestore DAL?**
**A:** By providing a specific method (e.g., `collectionGroupRef`) that abstracts the search across all subcollections with the same ID, regardless of their parent document.

**Q19: Can you implement caching in the DAL?**
**A:** Yes. The DAL is the perfect place to implement a "Read-Through" cache. Before querying the database, it can check Redis/Memcached.

**Q20: How do you handle Batch Writes?**
**A:** The DAL should expose a `createBatch` method that allows callers to queue multiple operations and commit them atomically, ensuring data integrity.

---

### 5. Architectural Theory

**Q21: Explain the "Dependency Inversion Principle" in the context of DAL.**
**A:** High-level modules (Services) should not depend on low-level modules (Database SDK). Both should depend on abstractions (The DAL interface).

**Q22: What is the difference between a "Generic Repository" and a "Specific Repository"?**
**A:** A Generic Repository provides standard CRUD for any collection. A Specific Repository (e.g., `UserRepository`) contains custom methods like `findVerifiedUsers()`.

**Q23: How would you handle "Partial Updates" in a DAL?**
**A:** Through a method that uses "merge" logic (e.g., `db.doc().set(data, { merge: true })`), allowing callers to update only specific fields without overwriting the whole document.

**Q24: Why is it bad practice to import `firebase-admin` in an API route?**
**A:** It bypasses governance, creates tight coupling, makes testing harder, and leads to inconsistent data handling (e.g., missing timestamps).

**Q25: Describe "Idempotency" in DAL operations.**
**A:** Ensuring that an operation (like creating a user) can be performed multiple times without changing the result beyond the initial application (e.g., using specific IDs instead of random ones).

---

### 6. Realistic Challenges

**Q26: What do you do if a query requires a field the DAL doesn't index?**
**A:** You should update the DAL's types and potentially create the necessary index in the database console, ensuring the DAL remains the source of truth for query capabilities.

**Q27: How do you handle large datasets (millions of records)?**
**A:** By strictly enforcing cursor-based pagination and never allowing unbounded `offset` queries, which become expensive and slow in NoSQL.

**Q28: When should you NOT use the Generic DAL methods?**
**A:** When performance is extremely critical and you need to perform a highly optimized query that the generic wrapper's abstraction overhead might impact (though this is rare).

**Q29: How do you handle schema-less data in a typed DAL?**
**A:** By using Generics (e.g., `getDoc<MyType>`) and potentially using a schema validation library (like Zod) inside the DAL to ensure the data matches expectations.

**Q30: "The DAL is too slow." How do you debug this?**
**A:** Add middleware or logging inside the DAL to track execution time for every query, allowing you to identify slow-running database operations vs. application overhead.

---

## 💡 Summary

A Data Access Layer is not just about "hiding the database"—it's about **establishing a contract**. By using a DAL, you ensure that your application remains scalable, testable, and robust against the ever-changing landscape of backend infrastructure.
