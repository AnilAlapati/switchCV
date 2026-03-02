const z = require("zod");

function safeStringify(obj) {
  return JSON.stringify(obj, (key, val) => {
    if (typeof val === "object" && val !== null && val._def) return "[schema]";
    if (typeof val === "function") return "[function]";
    return val;
  });
}

console.log("=== Zod Version ===");
try { console.log(require("zod/package.json").version); } catch { console.log("unknown"); }

console.log("\n=== _def structures ===");
console.log("string:", safeStringify(z.string()._def));
console.log("string.min(1).max(200):", safeStringify(z.string().min(1).max(200)._def));
console.log("string.email():", safeStringify(z.string().email()._def));
console.log("number:", safeStringify(z.number()._def));
console.log("number.min(0).max(100):", safeStringify(z.number().min(0).max(100)._def));
console.log("number.int():", safeStringify(z.number().int()._def));
console.log("boolean:", safeStringify(z.boolean()._def));
console.log("enum:", safeStringify(z.enum(["a", "b"])._def));
console.log("array:", safeStringify(z.array(z.string())._def));
console.log("literal:", safeStringify(z.literal("x")._def));

console.log("\n=== Object _def ===");
const obj = z.object({ name: z.string() });
console.log("object _def keys:", Object.keys(obj._def));
console.log("object _def.type:", obj._def.type);
console.log("object _def.shape:", typeof obj._def.shape);
if (typeof obj._def.shape === "function") {
  console.log("object shape():", safeStringify(obj._def.shape()));
} else if (typeof obj._def.shape === "object") {
  console.log("object shape keys:", Object.keys(obj._def.shape));
}

console.log("\n=== Constructor names ===");
console.log("string:", z.string().constructor.name);
console.log("number:", z.number().constructor.name);
console.log("boolean:", z.boolean().constructor.name);
console.log("enum:", z.enum(["a"]).constructor.name);
console.log("array:", z.array(z.string()).constructor.name);
console.log("object:", obj.constructor.name);
console.log("literal:", z.literal("x").constructor.name);
console.log("optional:", z.string().optional().constructor.name);
console.log("nullable:", z.string().nullable().constructor.name);
console.log("default:", z.string().default("").constructor.name);
console.log("record:", z.record(z.string()).constructor.name);
console.log("union:", z.union([z.string(), z.number()]).constructor.name);

console.log("\n=== instanceof tests ===");
console.log("string instanceof z.ZodString:", z.string() instanceof z.ZodString);
console.log("number instanceof z.ZodNumber:", z.number() instanceof z.ZodNumber);

console.log("\n=== Optional/Nullable inner ===");
const opt = z.string().optional();
console.log("optional _def keys:", Object.keys(opt._def));
console.log("optional _def:", safeStringify(opt._def));
const nul = z.string().nullable();
console.log("nullable _def keys:", Object.keys(nul._def));
console.log("nullable _def:", safeStringify(nul._def));
const def = z.string().default("");
console.log("default _def keys:", Object.keys(def._def));
console.log("default _def:", safeStringify(def._def));
