// Registers the test resolver hook before anything else loads, so `node --test`
// can import the app's `@/…` modules directly. Used by every `node --test` run
// below the src/domains tree.
import { register } from "node:module";
register(new URL("./ts-hooks.mjs", import.meta.url));
