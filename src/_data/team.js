import fs from "node:fs";
import path from "node:path";

// Reads data/team.json verbatim — the same file the old site used.
export default function () {
  const file = path.join(process.cwd(), "data", "team.json");
  const payload = JSON.parse(fs.readFileSync(file, "utf8"));
  return Array.isArray(payload) ? payload : payload.team || [];
}
