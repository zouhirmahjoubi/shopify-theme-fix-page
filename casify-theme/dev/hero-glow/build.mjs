import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

await build({
  entryPoints: [resolve(__dirname, "src/entry.jsx")],
  bundle: true,
  minify: true,
  format: "iife",
  target: ["es2019"],
  outfile: resolve(__dirname, "../../assets/cv-hero-glow.js"),
  define: { "process.env.NODE_ENV": '"production"' },
  loader: { ".js": "jsx" },
  legalComments: "none",
  alias: {
    "react": "preact/compat",
    "react-dom": "preact/compat",
    "react-dom/client": "preact/compat/client",
    "react/jsx-runtime": "preact/jsx-runtime",
  },
});

console.log("Built assets/cv-hero-glow.js");
