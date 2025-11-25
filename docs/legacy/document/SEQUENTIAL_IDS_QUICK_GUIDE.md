# Quick Action Guide - Sequential FIFO IDs

## TL;DR

**Your code is already correct!** Sequential FIFO is already implemented.

You just need to **reset the old Firestore data once**.

---

## What's Already Correct ✅

```
✅ Counter starts at: 0
✅ First resume gets ID: 1 (0+1)
✅ Second resume gets ID: 2 (1+1)
✅ Third resume gets ID: 3 (2+1)
✅ Pool returns oldest ID first: FIFO ✓
```

---

## The Only Problem ❌

Your Firestore has old test data:

```
Counter: currentId = 14311236
Pool: deletedIds = [old IDs...]
```

---

## One-Time Reset

### Step 1: Copy This Code

```javascript
import { doc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

async function resetIds() {
  console.log("Resetting ID system...");

  // Reset counter
  await setDoc(doc(db, "system/resumeIdCounter"), {
    currentId: 0,
    lastResetAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  });

  // Clear pool
  try {
    await updateDoc(doc(db, "system/deletedIdsPool"), {
      deletedIds: [],
      lastUpdatedAt: new Date().toISOString(),
    });
  } catch {
    // Pool might not exist yet
  }

  console.log("✅ Reset complete!");
}

await resetIds();
```

### Step 2: Run in Browser Console

1. Open DevTools: `F12`
2. Go to `Console` tab
3. Paste the code above
4. Press Enter
5. Wait for: `✅ Reset complete!`

### Step 3: Verify

Create a resume → Should get ID: **1** ✓

---

## Expected Behavior After Reset

| Action          | ID Assigned                       |
| --------------- | --------------------------------- |
| Create Resume A | 1                                 |
| Create Resume B | 2                                 |
| Create Resume C | 3                                 |
| Delete Resume B | (ID 2 goes to pool)               |
| Create Resume D | 4 (pool empty, counter continues) |
| Delete Resume A | (ID 1 goes to pool)               |
| Create Resume E | 1 (FIFO from pool)                |
| Delete Resume C | (ID 3 goes to pool)               |
| Create Resume F | 2 (FIFO from pool, was second)    |

---

## How It Works

```
Step 1: Check if deleted IDs exist → Pool = [1, 2, 3]
Step 2: If yes, take the FIRST one (FIFO) → Pool = [2, 3]
Step 3: If no, increment counter → counter: 3→4
Step 4: Return ID to new resume
```

Simple and efficient!

---

## Files

- **ID Generation:** `src/lib/numericIdGenerator.ts`
- **Pool Management:** `src/lib/resumeIdRecycler.ts`
- **Reset Tool:** `src/lib/resetIdSystem.ts` (NEW)
- **Documentation:** `ID_GENERATION_FIFO_SYSTEM.md` (NEW)

---

## That's It! 🎉

Your system is already perfectly implemented for:

- ✅ Sequential IDs (1, 2, 3...)
- ✅ FIFO reuse (oldest first)
- ✅ Starting from 1
- ✅ Atomic counter operations

Just reset the data once and you're good to go!

---

## Alternative: Manual Reset in Firebase Console

1. Go to: https://console.firebase.google.com
2. Select your project
3. Go to Firestore → Database
4. Find `system/resumeIdCounter`
   - Change `currentId` from `14311236` → `0`
5. Find `system/deletedIdsPool`
   - Change `deletedIds` from `[...]` → `[]`
6. Done!

Next resume will get ID: **1** ✓
