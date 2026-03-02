const z = require("zod");

console.log("=== String checks ===");
const strMin = z.string().min(1).max(200);
const checks = strMin._def.checks;
for (const c of checks) {
  console.log("check constructor:", c.constructor.name);
  console.log("check keys:", Object.keys(c));
  console.log("check prototype keys:", Object.getOwnPropertyNames(Object.getPrototypeOf(c)));
  console.log("check props:", Object.getOwnPropertyNames(c));
  if (c.kind) console.log("check.kind:", c.kind);
  if (c.value) console.log("check.value:", c.value);
  // Try to access known properties
  for (const prop of ["kind", "value", "minimum", "maximum", "min", "max", "message", "type", "_def"]) {
    if (c[prop] !== undefined) console.log(`  check.${prop}:`, c[prop]);
  }
}

console.log("\n=== String email check ===");
const strEmail = z.string().email();
const emailChecks = strEmail._def.checks;
for (const c of emailChecks) {
  console.log("email check type:", typeof c);
  console.log("email check constructor:", c.constructor.name);
  console.log("email check keys:", Object.keys(c));
  console.log("email check _def:", c._def);
  if (c._def) console.log("email check _def.type:", c._def.type);
}

console.log("\n=== Number checks ===");
const numMin = z.number().min(0).max(100);
const numChecks = numMin._def.checks;
for (const c of numChecks) {
  console.log("num check constructor:", c.constructor.name);
  console.log("num check keys:", Object.keys(c));
  for (const prop of ["kind", "value", "minimum", "maximum", "min", "max", "inclusive", "type", "_def"]) {
    if (c[prop] !== undefined) console.log(`  num check.${prop}:`, c[prop]);
  }
}

console.log("\n=== Number int check ===");
const numInt = z.number().int();
const intChecks = numInt._def.checks;
for (const c of intChecks) {
  console.log("int check constructor:", c.constructor.name);
  if (c._def) console.log("int check _def:", JSON.stringify(c._def));
}

console.log("\n=== Union internals ===");
const uni = z.union([z.string(), z.number()]);
console.log("union _def keys:", Object.keys(uni._def));
console.log("union _def.type:", uni._def.type);
if (uni._def.options) {
  console.log("union options count:", uni._def.options.length);
} else if (uni._def.members) {
  console.log("union members count:", uni._def.members.length);
}

console.log("\n=== Record internals ===");
const rec = z.record(z.string());
console.log("record _def keys:", Object.keys(rec._def));
console.log("record _def:", JSON.stringify(rec._def, (k, v) => (typeof v === "object" && v !== null && v._def) ? "[schema]" : v));

console.log("\n=== Effects ===");
const eff = z.string().refine(v => v.length > 0, "required");
console.log("refine constructor:", eff.constructor.name);
console.log("refine _def keys:", Object.keys(eff._def));
console.log("refine _def.type:", eff._def.type);

console.log("\n=== NativeEnum ===");
const MyEnum = { A: "a", B: "b" };
const ne = z.nativeEnum(MyEnum);
console.log("nativeEnum constructor:", ne.constructor.name);
console.log("nativeEnum _def:", JSON.stringify(ne._def));
