import { spawnSync } from 'node:child_process';
import { configuredOrigin } from './discoverability.mjs';
process.env.SANKET_PRODUCTION = '1';
configuredOrigin();
const result = spawnSync('npm', ['run', 'build'], { stdio: 'inherit', env: process.env });
process.exit(result.status ?? 1);
