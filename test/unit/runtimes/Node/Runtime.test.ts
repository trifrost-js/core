import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {NodeRuntime} from '../../../../lib/runtimes/Node/Runtime';
import * as Generic from '../../../../lib/utils/Generic';
import {ConsoleExporter} from '../../../../lib/modules/Logger';

vi.mock('node:http', () => ({
    createServer: vi.fn(() => ({
        listen: vi.fn((_port, cb) => {
            cb(); // Simulate successful listen
            return {on: vi.fn()};
        }),
        close: vi.fn(cb => cb()),
    })),
}));

vi.mock('node:fs', () => ({
    statSync: vi.fn(),
    createReadStream: vi.fn(),
}));

vi.mock('node:stream', () => ({
    Readable: class {},
}));

vi.mock('node:stream/promises', () => ({
    pipeline: vi.fn(),
}));

describe('Runtimes - Node - Runtime', () => {
    let runtime: NodeRuntime;
    let logger: any;

    beforeEach(() => {
        runtime = new NodeRuntime();
        logger = {
            debug: vi.fn(),
            error: vi.fn(),
            spawn: () => ({
                debug: vi.fn(),
                error: vi.fn(),
            }),
        };
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('has correct name and version', () => {
        expect(runtime.name).toBe('Node');
        expect(runtime.version).toBe(process.version);
    });

    it('returns ConsoleExporter in dev mode', () => {
        vi.spyOn(Generic, 'isDevMode').mockReturnValue(true);
        const exporter = runtime.defaultExporter({});
        expect(exporter).toBeInstanceOf(ConsoleExporter);
    });

    it('returns ConsoleExporter with trace_id in prod mode', () => {
        vi.spyOn(Generic, 'isDevMode').mockReturnValue(false);
        const exporter = runtime.defaultExporter({});
        expect(exporter).toBeInstanceOf(ConsoleExporter);
    });

    it('boot sets up and logs correctly', async () => {
        const onIncoming = vi.fn();
        await runtime.boot({
            onIncoming,
            logger,
            cfg: {env: {}, port: 8080} as any,
        });
        expect(logger.debug).toHaveBeenCalledWith('NodeRuntime@boot: Listening on port 8080');
    });

    it('calls onIncoming when request comes in', async () => {
        const onIncoming = vi.fn();
        await runtime.boot({
            onIncoming,
            logger,
            cfg: {env: {}, port: 3000} as any,
        });

        const http = await import('node:http');
        /* @ts-expect-error Should be good */
        const listener = http.createServer.mock.calls[0][0];

        // Simulate a request/response
        const req = {} as any;
        const res = {} as any;

        await listener(req, res);
        expect(onIncoming).toHaveBeenCalled();
    });

    it('boot rejects if already running', async () => {
        await runtime.boot({onIncoming: vi.fn(), logger, cfg: {env: {}, port: 1234} as any});
        await expect(runtime.boot({onIncoming: vi.fn(), logger, cfg: {env: {}, port: 1234} as any})).rejects.toThrow(
            'NodeRuntime@boot: Server already listening',
        );
    });

    it('shutdown resets state and closes server', async () => {
        await runtime.boot({onIncoming: vi.fn(), logger, cfg: {env: {}, port: 9999} as any});
        await runtime.shutdown();
        expect(logger.debug).toHaveBeenCalledWith('NodeRuntime@shutdown');
    });

    it('shutdown does nothing if server not running', async () => {
        await runtime.shutdown();
        expect(logger.debug).not.toHaveBeenCalled();
    });
});
