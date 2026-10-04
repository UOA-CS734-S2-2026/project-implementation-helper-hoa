import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// The server tier reads configuration from two files, in this order:
//
//   1. <server>/.env        -- everything the Express server owns
//   2. <project root>/.env  -- variables shared with the Python tier (MCP_SECRET)
//
// The order is load order, and it is what decides precedence: dotenv never
// overwrites a variable that is already set, so the FIRST file to define a
// variable wins. server/.env is therefore loaded first, giving the precedence
// real environment > server/.env > project-root .env. A variable that is
// genuinely shared is defined exactly once, in the root file, and server/.env
// simply does not mention it.
//
// Both paths are resolved relative to this module (server/src/config/env.ts),
// never to process.cwd(): every npm script runs from server/, but running a
// script from the project root must not change which files are read. That is
// also why `import 'dotenv/config'` is not used -- it would look for
// <cwd>/.env, which is neither of the two files above.
const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const serverDir = path.resolve(moduleDir, '..', '..');
const rootEnvPath = path.resolve(serverDir, '..', '.env');
const serverEnvPath = path.resolve(serverDir, '.env');

dotenv.config({ path: serverEnvPath });
dotenv.config({ path: rootEnvPath });

export const envPath = serverEnvPath;
export const sharedEnvPath = rootEnvPath;

/**
 * Reads a required variable, failing with the paths we looked in.
 */
export function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(
      `${name} is not set, so the server cannot start. ` +
        `Locally, add it to ${serverEnvPath} (or ${rootEnvPath} for variables shared ` +
        'with the Python tier), or export it in the environment. ' +
        'On Render, set it under Environment > Environment Variables. ' +
        `The value comes from Firebase console > Project settings > General > ` +
        'Web API Key, and must belong to the same project as your service account.',
    );
  }

  return value;
}
