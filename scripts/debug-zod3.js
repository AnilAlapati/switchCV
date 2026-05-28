const z = require("zod");

console.log("=== String min/max check _zod ===");
const strMin = z.string().min(1).max(200);
for (const c of strMin._def.checks) {
  console.log("constructor:", c.constructor.name);
  console.log("_zod:", JSON.stringify(c._zod, null, 2));
  // try other properties
  const allProps = Object.getOwnPropertyNames(c);
  for (const p of allProps) {
    try {
      const val = c[p];
      if (typeof val !== "function") {
        console.log(`  prop ${p}:`, JSON.stringify(val));
      }
    } catch { console.log(`  prop ${p}: [error]`); }
  }
}

console.log("\n=== Number min/max check _zod ===");
const numMin = z.number().min(0).max(100);
for (const c of numMin._def.checks) {
  console.log("constructor:", c.constructor.name);
  const allProps = Object.getOwnPropertyNames(c);
  for (const p of allProps) {
    try {
      const val = c[p];
      if (typeof val !== "function") {
        console.log(`  prop ${p}:`, JSON.stringify(val));
      }
    } catch { console.log(`  prop ${p}: [error]`); }
  }
}

console.log("\n=== String length constraint ===");
const strLen = z.string().length(5);
for (const c of strLen._def.checks) {
  console.log("constructor:", c.constructor.name);
  const allProps = Object.getOwnPropertyNames(c);
  for (const p of allProps) {
    try {
      const val = c[p];
      if (typeof val !== "function") {
        console.log(`  prop ${p}:`, JSON.stringify(val));
      }
    } catch { console.log(`  prop ${p}: [error]`); }
  }
}

console.log("\n=== Array min/max ===");
const arr = z.array(z.string()).min(1).max(10);
console.log("array _def keys:", Object.keys(arr._def));
const arrProps = Object.getOwnPropertyNames(arr._def);
for (const p of arrProps) {
  try {
    const val = arr._def[p];
    if (typeof val !== "function" && typeof val !== "object") {
      console.log(`  _def.${p}:`, val);
    }
  } catch {}
}
console.log("array _def.minLength:", arr._def.minLength);
console.log("array _def.element:", arr._def.element?.constructor?.name);
console.log("array checks length:", arr._def.checks?.length);
if (arr._def.checks) {
  for (const c of arr._def.checks) {
    console.log("  arr check constructor:", c.constructor.name);
    const ap = Object.getOwnPropertyNames(c);
    for (const p of ap) {
      try {
        const val = c[p];
        if (typeof val !== "function") console.log(`    prop ${p}:`, JSON.stringify(val));
      } catch {}
    }
  }
}
