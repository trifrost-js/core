// @ts-check
import {rm} from 'fs/promises';
import {join} from 'path';

const args = process.argv.slice(2);
if (args.length === 0) {
    throw new Error('rm.mjs: requires at least one parameter');
}

for (const arg of args) {
    const targetPath = join(process.cwd(), arg);
    console.log(`rm.mjs: deleting path "${targetPath}"`);
    await rm(targetPath, {recursive: true, force: true});
}
