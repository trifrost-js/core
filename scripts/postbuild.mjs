// @ts-check
import {mkdir, copyFile} from 'fs/promises';
import {dirname, join} from 'path';

const root = process.cwd();

/** @type {Array<{src: string, dest: string}>} */
const copies = [
    {src: './lib/modules/JSX/jsx.d.ts', dest: './dist/types/modules/JSX/jsx.d.ts'},
    {src: './lib/modules/JSX/atomic.d.ts', dest: './dist/types/modules/JSX/atomic.d.ts'},
    {src: './lib/jsx-runtime.d.ts', dest: './dist/types/jsx-runtime.d.ts'},
];

for (const {src, dest} of copies) {
    const absSrc = join(root, src);
    const absDest = join(root, dest);
    await mkdir(dirname(absDest), {recursive: true});
    await copyFile(absSrc, absDest);
    // minimal log (no eslint on scripts)
    console.log(`postbuild: copied ${src} -> ${dest}`);
}
