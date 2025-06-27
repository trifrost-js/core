import {describe, it, expect, vi, afterEach} from 'vitest';
import {getRuntime} from '../../../lib/runtimes/Runtime';

describe('Modules - JSX - getRuntime', () => {
    afterEach(() => {
        /* @ts-expect-error Should be good */
        delete globalThis.WorkerGlobalScope;
        /* @ts-expect-error Should be good */
        delete globalThis.Bun;
        vi.restoreAllMocks();
        vi.resetModules();
    });

    it('detects Workerd runtime', async () => {
        /* @ts-expect-error Should be good */
        globalThis.WorkerGlobalScope = {};
        const runtime = await getRuntime();
        expect(runtime.constructor.name).toBe('WorkerdRuntime');
    });

    it('detects Bun runtime', async () => {
        /* @ts-expect-error Should be good */
        delete globalThis.WorkerGlobalScope;
        /* @ts-expect-error Should be good */
        globalThis.Bun = {};

        vi.mock('../../../lib/runtimes/Bun/Runtime.js', () => ({
            BunRuntime: vi.fn().mockImplementation(() => ({name: 'BunRuntime'})),
        }));

        const runtime = await getRuntime();
        expect(runtime.name).toBe('BunRuntime');
    });

    it('detects Node runtime', async () => {
        /* @ts-expect-error Should be good */
        delete globalThis.WorkerGlobalScope;

        /* @ts-expect-error Should be good */
        vi.spyOn(process, 'versions', 'get').mockReturnValue({node: '22.0.0'});

        vi.doMock('../../../lib/runtimes/Node/Runtime.js', () => ({
            NodeRuntime: vi.fn().mockImplementation(() => ({name: 'NodeRuntime'})),
        }));

        const {getRuntime} = await import('../../../lib/runtimes/Runtime');
        const runtime = await getRuntime();
        expect(runtime.name).toBe('NodeRuntime');
    });

    it('throws error when no runtime detected', async () => {
        /* @ts-expect-error Should be good */
        delete globalThis.WorkerGlobalScope;

        /* @ts-expect-error Should be good */
        delete globalThis.Bun;

        /* @ts-expect-error Should be good */
        vi.spyOn(process, 'versions', 'get').mockReturnValue(undefined);

        await expect(getRuntime()).rejects.toThrow('TriFrost: No supported runtime detected');
    });
});
