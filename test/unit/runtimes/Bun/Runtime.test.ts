import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';

// 👇 mock bun module BEFORE anything else
const stopMock = vi.fn();
const serveMock = vi.fn().mockReturnValue({stop: stopMock});
const fileMock = vi.fn().mockReturnValue({});

vi.mock('bun', () => ({
    serve: serveMock,
    file: fileMock,
}));

import {BunRuntime} from '../../../../lib/runtimes/Bun/Runtime';
import * as Generic from '../../../../lib/utils/Generic';
import {ConsoleExporter} from '../../../../lib/modules/Logger';

describe('Runtimes - Bun - Runtime', () => {
    let runtime: BunRuntime;
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

        // simulate Bun global
        vi.stubGlobal('Bun', {version: '1.2.3'});

        runtime = new BunRuntime();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
        serveMock.mockClear();
        stopMock.mockClear();
        fileMock.mockClear();
    });

    it('Has correct name and version', () => {
        expect(runtime.name).toBe('Bun');
        expect(runtime.version).toBe('1.2.3');
    });

    it('Falls back to null if Bun.version is undefined', () => {
        vi.unstubAllGlobals();
        vi.stubGlobal('Bun', {});

        const localRuntime = new BunRuntime();
        expect(localRuntime.version).toBeNull();
    });

    it('Returns ConsoleExporter in dev mode', () => {
        vi.spyOn(Generic, 'isDevMode').mockReturnValue(true);
        const exporter = runtime.defaultExporter({});
        expect(exporter).toBeInstanceOf(ConsoleExporter);
    });

    it('Returns ConsoleExporter with trace_id in prod', () => {
        vi.spyOn(Generic, 'isDevMode').mockReturnValue(false);
        const exporter = runtime.defaultExporter({});
        expect(exporter).toBeInstanceOf(ConsoleExporter);
    });

    it('boot sets server, logger, config, and serves with handler', async () => {
        const onIncoming = vi.fn(ctx => ctx.text('ok'));

        await runtime.boot({
            onIncoming,
            logger,
            /* @ts-expect-error Should be good */
            cfg: {env: {PORT: '1234'}, port: 3000},
        });

        expect(serveMock).toHaveBeenCalled();
        expect(logger.debug).toHaveBeenCalledWith('BunRuntime@boot: Listening on port 3000');

        // simulate a fetch
        const fetch = serveMock.mock.calls[0][0].fetch;
        const res = await fetch(new Request('http://localhost/'));

        expect(res.status).toBe(200);
        expect(await res.text()).toBe('ok');
        expect(onIncoming).toHaveBeenCalled();
    });

    it('boot throws if already listening', async () => {
        /* @ts-expect-error Should be good */
        await runtime.boot({onIncoming: vi.fn(), logger, cfg: {}});
        /* @ts-expect-error Should be good */
        await expect(runtime.boot({onIncoming: vi.fn(), logger, cfg: {}})).rejects.toThrow('BunRuntime@boot: Server already listening');
    });

    it('boot sets idleTimeout if timeout is valid', async () => {
        await runtime.boot({
            onIncoming: vi.fn(),
            logger,
            /* @ts-expect-error Should be good */
            cfg: {timeout: 200_000},
        });

        const call = serveMock.mock.calls[0][0];
        expect(call.idleTimeout).toBe(200);
    });

    it('boot caps idleTimeout at 255s', async () => {
        await runtime.boot({
            onIncoming: vi.fn(),
            logger,
            /* @ts-expect-error Should be good */
            cfg: {timeout: 999_999},
        });

        const call = serveMock.mock.calls[0][0];
        expect(call.idleTimeout).toBe(255);
    });

    it('boot throws if bun import fails', async () => {
        // Save current mock
        const originalBunMock = {serve: serveMock, file: fileMock};

        // Temporarily override with throwing version
        vi.doMock('bun', () => {
            throw new Error('fail');
        });

        const {BunRuntime: BrokenRuntime} = await vi.importActual<typeof import('../../../../lib/runtimes/Bun/Runtime')>(
            '../../../../lib/runtimes/Bun/Runtime',
        );

        const broken = new BrokenRuntime();

        /* @ts-expect-error Should be good */
        await expect(broken.boot({onIncoming: vi.fn(), logger, cfg: {}})).rejects.toThrow(
            'BunRuntime@boot: Failed to load required modules',
        );

        // Restore original working mock
        vi.doMock('bun', () => originalBunMock);
    });

    it('fetch returns 500 if handler throws', async () => {
        const handler = vi.fn(() => {
            throw new Error('boom');
        });

        /* @ts-expect-error Should be good */
        await runtime.boot({onIncoming: handler, logger, cfg: {}});
        const fetch = serveMock.mock.calls[0][0].fetch;
        const res = await fetch(new Request('http://fail'));

        expect(res.status).toBe(500);
        expect(await res.text()).toContain('Internal Server Error');
        expect(logger.error).toHaveBeenCalled();
    });

    it('fetch returns 500 if no ctx.response', async () => {
        const handler = vi.fn(ctx => {
            ctx.foobar = true;
        });

        /* @ts-expect-error Should be good */
        await runtime.boot({onIncoming: handler, logger, cfg: {}});
        const fetch = serveMock.mock.calls[0][0].fetch;
        const res = await fetch(new Request('http://fail'));

        expect(res.status).toBe(500);
        expect(logger.error).toHaveBeenCalled();
    });

    it('shutdown stops server and clears state', async () => {
        const localStop = vi.fn();
        serveMock.mockReturnValue({stop: localStop});

        /* @ts-expect-error Should be good */
        await runtime.boot({onIncoming: vi.fn(), logger, cfg: {}});
        await runtime.shutdown();

        expect(localStop).toHaveBeenCalled();
        expect(logger.debug).toHaveBeenCalledWith('BunRuntime@shutdown');
    });

    it('shutdown does nothing if not running', async () => {
        await runtime.shutdown();
        expect(stopMock).not.toHaveBeenCalled();
    });
});
