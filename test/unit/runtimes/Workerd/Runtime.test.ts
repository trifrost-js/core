import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {WorkerdRuntime} from '../../../../lib/runtimes/Workerd/Runtime';
import {ConsoleExporter, JsonExporter} from '../../../../lib/modules/Logger/exporters';
import * as Generic from '../../../../lib/utils/Generic';

describe('Runtimes - Workerd - Runtime', () => {
    let runtime: WorkerdRuntime;
    let logger;

    beforeEach(() => {
        logger = {
            debug: vi.fn(),
            error: vi.fn(),
            spawn: vi.fn().mockReturnValue({
                debug: vi.fn(),
                error: vi.fn(),
            }),
        };
        runtime = new WorkerdRuntime();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('Has correct name and version', () => {
        expect(runtime.name).toBe('Workerd');
        expect(runtime.version).toBeNull();
    });

    it('Returns ConsoleExporter in dev mode', () => {
        vi.spyOn(Generic, 'isDevMode').mockReturnValue(true);
        const exporter = runtime.defaultExporter({});
        expect(exporter).toBeInstanceOf(ConsoleExporter);
    });

    it('Returns JsonExporter in prod mode', () => {
        vi.spyOn(Generic, 'isDevMode').mockReturnValue(false);
        const exporter = runtime.defaultExporter({});
        expect(exporter).toBeInstanceOf(JsonExporter);
    });

    it('boot() sets onIncoming, logger, and config', async () => {
        const handler = vi.fn();
        const cfg = {env: {API_KEY: 'abc'}};

        /* @ts-expect-error Should be good */
        await runtime.boot({logger, cfg, onIncoming: handler});
        expect(logger.debug).toHaveBeenCalledWith('WorkerdRuntime@boot');
    });

    it('shutdown() resets internal state', async () => {
        const handler = vi.fn();

        /* @ts-expect-error Should be good */
        await runtime.boot({logger, cfg: {}, onIncoming: handler});
        await runtime.shutdown();

        expect(logger.debug).toHaveBeenCalledWith('WorkerdRuntime@stop');
    });

    it('Shutdown() does nothing if not booted', async () => {
        await runtime.shutdown();
        expect(logger.debug).not.toHaveBeenCalled();
    });

    it('exports.fetch returns 500 if no onIncoming', async () => {
        const result = await runtime.exports.fetch(new Request('http://x'), {}, {} as any);
        expect(result!.status).toBe(500);
        const text = await result!.text();
        expect(text).toBe('Internal Server Error');
    });

    it('exports.fetch resolves ctx and calls handler', async () => {
        const handler = vi.fn(ctx => {
            ctx.text('ok');
        });

        const env = {FOO: 'BAR'};

        /* @ts-expect-error Should be good */
        await runtime.boot({logger, onIncoming: handler, cfg: {env}});

        const res = await runtime.exports.fetch(
            new Request('https://x/test'),
            {API: '1'},
            /* @ts-expect-error Should be good */
            {
                waitUntil: vi.fn(),
                passThroughOnException: vi.fn(),
            },
        );

        expect(handler).toHaveBeenCalled();
        expect(res!.status).toBe(200);
        expect(await res!.text()).toBe('ok');
    });

    it('Logs error and returns 500 if handler throws', async () => {
        const error = new Error('boom');
        const handler = vi.fn(() => {
            throw error;
        });

        /* @ts-expect-error Should be good */
        await runtime.boot({logger, onIncoming: handler, cfg: {}});

        const res = await runtime.exports.fetch(
            new Request('https://fail'),
            {},
            /* @ts-expect-error Should be good */
            {
                waitUntil: vi.fn(),
                passThroughOnException: vi.fn(),
            },
        );

        expect(res!.status).toBe(500);
        expect(logger.error).toHaveBeenCalledWith(error, expect.anything());
    });

    it('Returns 500 if handler does not set ctx.response', async () => {
        const handler = vi.fn(ctx => (ctx.foo = 'bar'));

        /* @ts-expect-error Should be good */
        await runtime.boot({logger, onIncoming: handler, cfg: {}});

        const res = await runtime.exports.fetch(
            new Request('https://fail'),
            {},
            /* @ts-expect-error Should be good */
            {
                waitUntil: vi.fn(),
                passThroughOnException: vi.fn(),
            },
        );

        expect(res!.status).toBe(500);
        expect(logger.error).toHaveBeenCalled();
    });
});
