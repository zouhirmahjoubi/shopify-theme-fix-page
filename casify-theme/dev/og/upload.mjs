import { readFileSync } from 'node:fs';

const staged = JSON.parse(readFileSync(new URL('./staged.json', import.meta.url), 'utf8'));
const targets = staged.data.stagedUploadsCreate.stagedTargets;

const results = [];

for (const t of targets) {
  const keyParam = t.parameters.find(p => p.name === 'key').value;
  const filename = keyParam.split('/').pop(); // og-<handle>.jpg
  const handle = filename.replace(/^og-/, '').replace(/\.jpg$/, '');
  const localPath = new URL(`./out/jpg/${handle}.jpg`, import.meta.url);
  const bytes = readFileSync(localPath);

  const form = new FormData();
  for (const p of t.parameters) form.append(p.name, p.value);
  form.append('file', new Blob([bytes], { type: 'image/jpeg' }), filename);

  const res = await fetch(t.url, { method: 'POST', body: form });
  const ok = res.status === 201;
  console.log(handle, '->', res.status, ok ? 'OK' : 'FAIL');
  if (!ok) console.log(await res.text());
  results.push({ handle, resourceUrl: t.resourceUrl, ok });
}

console.log(JSON.stringify(results, null, 2));
