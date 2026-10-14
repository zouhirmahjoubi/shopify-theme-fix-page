import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const resolveInstalled = createRequire('C:/Users/LENOVO/AppData/Roaming/npm/node_modules/@shopify/theme/package.json');
const helper = 'C:/Users/LENOVO/.codex/plugins/cache/openai-curated-remote/shopify/4.1.1/skills/shopify-liquid/scripts/validate.mjs';
const original = await readFile(helper, 'utf8');
let packageIndex = 0;
const adapted = original.replace(/import\{([^}]+)\}from"(@shopify\/[^"\r\n]+)"/g, (_, names, name) => {
  const binding = `installedShopifyPackage${packageIndex++}`;
  const properties = names.replace(/\bas\b/g, ':');
  return `import ${binding} from "${pathToFileURL(resolveInstalled.resolve(name)).href}";const {${properties}}=${binding};`;
});
await writeFile(new URL('./validate-local.mjs', import.meta.url), adapted);
console.log('Prepared the bundled validator with dependencies from the installed official Shopify theme tooling.');
