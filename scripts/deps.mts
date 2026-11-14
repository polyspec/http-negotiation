// Clones the checkout of each other polyspec repository whose crate Cargo.lock pins from Git, such as http-media-type,
// into var/deps/<repository> at that commit (make install-binding), from which the binding targets build the packages
// of that repository that they read (T1.7, T1.9). binding itself is a released npm package (AGENTS.md, "Bindings"), so
// its crate polyspec-binding-core is left out. Only this install target downloads: cargo metadata resolves Cargo.lock
// with --locked and fetches what is missing, and every other target reads the clones offline and fails while they are
// missing.

import { execFileSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const metadata = JSON.parse(
  execFileSync('cargo', ['metadata', '--format-version', '1', '--locked', '--manifest-path', join(root, 'Cargo.toml')], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  }),
) as { packages: { name: string; source: string | null; manifest_path: string }[] };
let cloned = 0;
for (const dep of metadata.packages) {
  if (dep.source === null || !dep.source.startsWith('git+') || dep.name === 'polyspec-binding-core') continue;
  const commit = /#([0-9a-f]{40})$/.exec(dep.source)?.[1];
  const name = /\/([^/?#]+?)(?:\.git)?[?#]/.exec(dep.source)?.[1];
  if (commit === undefined || name === undefined) throw new Error(`${dep.name} has no pinned commit: ${dep.source}`);
  // The crate is packages/rust of its repository.
  const from = resolve(dirname(dep.manifest_path), '../..');
  const into = join(root, 'var/deps', name);
  cloned += 1;
  const head = existsSync(join(into, '.git')) ? execFileSync('git', ['-C', into, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim() : '';
  if (head === commit) continue;
  rmSync(into, { recursive: true, force: true });
  execFileSync('git', ['clone', '--quiet', '--no-checkout', from, into], { stdio: 'inherit' });
  execFileSync('git', ['-C', into, '-c', 'advice.detachedHead=false', 'checkout', '--quiet', '--detach', commit], { stdio: 'inherit' });
}
if (cloned === 0) throw new Error('Cargo.lock pins no crate of another repository from Git');
