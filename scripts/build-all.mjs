// @ts-check
import {spawn} from 'child_process';

const steps = [
    ['npm', ['run', 'lint']],
    ['npm', ['run', 'test']],
    ['npm', ['run', 'build:esm']],
    ['npm', ['run', 'build:cjs']],
    ['npm', ['run', 'build:types']],
    ['npm', ['run', 'build:jsx']],
];

/**
 * @param {string} cmd
 * @param {string[]} args
 * @returns {Promise<void>}
 */
function runStep(cmd, args) {
    return new Promise((resolve, reject) => {
        const proc = spawn(cmd, args, {stdio: 'inherit', shell: true});
        proc.on('close', code => {
            if (code !== 0) reject(new Error(`${cmd} ${args.join(' ')} failed with code ${code}`));
            else resolve();
        });
    });
}

(async () => {
    for (const [cmd, args] of steps) {
        try {
            await runStep(cmd, args);
        } catch (err) {
            console.error(err.message);
            process.exit(1);
        }
    }
})();
