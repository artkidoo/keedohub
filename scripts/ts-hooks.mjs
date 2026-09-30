// Node module-resolution hook so the existing `@/…` tsconfig path alias and the
// extension-free relative imports used throughout `src/` resolve under Node's
// native TypeScript type-stripping runner (there is no bundler for `node --test`).
//
// This is a test-only shim. It mirrors tsconfig.json's `"paths": { "@/*": ["./src/*"] }`
// and resolves an extension-free specifier to a real `.ts` file (or its `index.ts`).
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const SRC = fileURLToPath(new URL("../src/", import.meta.url));

function candidate(base) {
  if (existsSync(base + ".ts")) return base + ".ts";
  if (existsSync(base + "/index.ts")) return base + "/index.ts";
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  // Next-only modules are stubbed: the domain tests exercise server code where
  // Next's own runtime (and its module resolution conditions) are absent.
  const STUBS = {
    "next/navigation": "./_stub-next-navigation.mjs",
    "next/cache": "./_stub-next-cache.mjs",
    "next/headers": "./_stub-next-headers.mjs",
  };
  if (STUBS[specifier]) {
    return {
      url: new URL(STUBS[specifier], import.meta.url).href,
      shortCircuit: true,
    };
  }

  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    if (err?.code !== "ERR_MODULE_NOT_FOUND") throw err;

    let base = null;
    if (specifier.startsWith("@/")) {
      base = SRC + specifier.slice(2);
    } else if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
      const parentDir = new URL(".", context.parentURL);
      base = fileURLToPath(parentDir) + specifier;
    }

    if (base) {
      const found = candidate(base.replace(/[\/\\]$/, ""));
      if (found) {
        return { url: pathToFileURL(found).href, shortCircuit: true };
      }
    }
    throw err;
  }
}
