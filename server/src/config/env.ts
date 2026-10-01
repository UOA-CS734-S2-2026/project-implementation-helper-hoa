import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// The Python tier loads the project-root .env (python/chatbot_server.py), so the
// Node tier resolves the same file. `import 'dotenv/config'` cannot be used here:
// it looks for <cwd>/.env, and every npm script runs from server/, which would
// mean server/.env -- a file that does not exist and never has.
//
// This file lives at server/src/config/env.ts, so the project root is three
// levels up. dotenv never overwrites a variable that is already in the
// environment, so a real exported environment variable still wins over .env.
const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const rootEnvPath = path.resolve(moduleDir, '..', '..', '..', '.env');

dotenv.config({ path: rootEnvPath });

export const envPath = rootEnvPath;

/**
 * Reads a required variable, failing with the path we looked in.
 */
export function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(
      `${name} is not set. Add it to ${rootEnvPath} (the project-root .env) ` +
        'or export it in the environment.',
    );
  }

  return value;
}
