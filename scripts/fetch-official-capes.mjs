import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const capes = {
  'cherry-blossom.png': 'afd553b39358a24edfe3b8a9a939fa5fa4faa4d9a9c3d6af8eafb377fa05c2bb',
  'founders.png': '99aba02ef05ec6aa4d42db8ee43796d6cd50e4b2954ab29f0caeb85f96bf52a1',
  'anniversary-15.png': 'cd9d82ab17fd92022dbd4a86cde4c382a7540e117fae7b9a2853658505a80625',
  'purple-heart.png': 'cb40a92e32b57fd732a00fc325e7afb00a7ca74936ad50d8e860152e482cfbde',
  'followers.png': '569b7f2a1d00d26f30efe3f9ab9ac817b1e6d35f4f3cfb0324ef2d328223d350',
  'vanilla.png': 'f9a76537647989f9a0b6d001e320dac591c359e9e61a31f4ce11c88f207f0ad4',
  'migrator.png': '2340c0e03dd24a11b15a8b33c2a7e9e32abb2051b2481d0ba7defd635ca7a933'
};

const targetDir = path.resolve('src/assets/capes');
await mkdir(targetDir, { recursive: true });

function validatePng(buffer, name) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (buffer.length < 24 || !buffer.subarray(0, 8).equals(signature)) throw new Error(`${name} is not a valid PNG`);
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  if (width !== 64 || height !== 32) throw new Error(`${name} must be 64x32, got ${width}x${height}`);
}

for (const [name, hash] of Object.entries(capes)) {
  const target = path.join(targetDir, name);
  try {
    const existing = await readFile(target);
    validatePng(existing, name);
    process.stdout.write(`✓ ${name}\n`);
    continue;
  } catch {}

  const response = await fetch('https://textures.minecraft.net/texture/' + hash);
  if (!response.ok) throw new Error(`Could not download ${name}: HTTP ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  validatePng(buffer, name);
  await writeFile(target, buffer);
  process.stdout.write(`↓ ${name}\n`);
}
