import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  CommandDirectoryNotFoundError,
  CommandLoadError,
} from '../errors/commands.js';

import type { CommandDefinition } from './command-router.js';

const DEFAULT_EXTENSIONS = ['.js', '.mjs', '.cjs', '.ts', '.mts', '.cts'];
const IGNORED_MARKERS = ['.d.', '.test.', '.spec.'];

export interface LoadCommandsOptions {
  extensions?: string[];
  recursive?: boolean;
  filter?: (command: CommandDefinition, filePath: string) => boolean;
  onFileLoaded?: (filePath: string, commands: CommandDefinition[]) => void;
}

export interface LoadCommandsResult {
  commands: CommandDefinition[];
  files: string[];
}

function isCommandDefinition(value: unknown): value is CommandDefinition {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as CommandDefinition).name === 'string' &&
    typeof (value as CommandDefinition).execute === 'function'
  );
}

function hasIgnoredSuffix(fileName: string): boolean {
  return IGNORED_MARKERS.some((marker) => fileName.includes(marker));
}

async function collectFiles(
  dir: string,
  extensions: string[],
  recursive: boolean,
): Promise<string[]> {
  let entries;

  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;

    if (code === 'ENOENT' || code === 'ENOTDIR') {
      throw new CommandDirectoryNotFoundError(dir);
    }

    throw err;
  }

  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      if (recursive) {
        files.push(...(await collectFiles(fullPath, extensions, recursive)));
      }
      continue;
    }

    if (hasIgnoredSuffix(entry.name)) continue;

    if (extensions.some((ext) => entry.name.endsWith(ext))) {
      files.push(fullPath);
    }
  }

  return files;
}

export async function loadCommandsFromDirectory(
  dir: string,
  options: LoadCommandsOptions = {},
): Promise<LoadCommandsResult> {
  const extensions = options.extensions ?? DEFAULT_EXTENSIONS;
  const recursive = options.recursive ?? true;

  const files = await collectFiles(dir, extensions, recursive);
  const commands: CommandDefinition[] = [];

  for (const filePath of files) {
    let moduleExports: Record<string, unknown>;

    try {
      moduleExports = await import(pathToFileURL(filePath).href);
    } catch (err) {
      throw new CommandLoadError(filePath, { cause: err });
    }

    const foundInFile: CommandDefinition[] = [];

    for (const exported of Object.values(moduleExports)) {
      if (!isCommandDefinition(exported)) continue;

      if (options.filter && !options.filter(exported, filePath)) continue;

      foundInFile.push(exported);
    }

    if (foundInFile.length) {
      options.onFileLoaded?.(filePath, foundInFile);
      commands.push(...foundInFile);
    }
  }

  return { commands, files };
}
