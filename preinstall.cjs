/**
 * Root preinstall: remove other lockfiles and require pnpm (works on Windows).
 */
const fs = require("fs");
const path = require("path");

const root = process.cwd();

for (const name of ["package-lock.json", "yarn.lock"]) {
  const fp = path.join(root, name);
  try {
    fs.unlinkSync(fp);
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }
}

const ua = process.env.npm_config_user_agent || "";
if (!ua.includes("pnpm/")) {
  console.error("Use pnpm instead");
  process.exit(1);
}
