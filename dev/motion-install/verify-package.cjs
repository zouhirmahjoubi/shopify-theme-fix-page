const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const metadata = JSON.parse(fs.readFileSync(path.join(__dirname, 'metadata.json'), 'utf8').replace(/^\uFEFF/, ''));
const tarball = fs.readFileSync(path.join(__dirname, 'motion-14.2.0.tgz'));
const integrity = 'sha512-' + crypto.createHash('sha512').update(tarball).digest('base64');
if (metadata.version !== '14.2.0' || integrity !== metadata.dist.integrity) throw new Error('Package version/integrity mismatch');
process.stdout.write(JSON.stringify({ version: metadata.version, integrityMatches: true, integrity }, null, 2) + '\n');
