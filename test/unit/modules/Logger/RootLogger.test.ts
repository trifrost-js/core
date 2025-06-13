import {describe, it, expect, vi, beforeEach} from 'vitest';
import {TriFrostRootLogger} from '../../../../lib/modules/Logger/RootLogger';
import {
    type TriFrostLoggerExporter,
    type TriFrostLoggerLogPayload,
    type TriFrostLoggerSpanPayload,
} from '../../../../lib/modules/Logger/types';

describe('Modules - Logger - TriFrostRootLogger', () => {
    let logs: TriFrostLoggerLogPayload[] = [];
    let spans: TriFrostLoggerSpanPayload[] = [];
    let initCalledWith: Record<string, unknown> | null = null;

    const mockExporter = (): TriFrostLoggerExporter => ({
        init: vi.fn(ctx => {
            initCalledWith = ctx;
        }),
        /* @ts-ignore */
        pushLog: vi.fn(log => logs.push(log)),
        pushSpan: vi.fn(span => spans.push(span)),
        flush: vi.fn(() => Promise.resolve()),
    });

    beforeEach(() => {
        logs = [];
        spans = [];
        initCalledWith = null;
        vi.clearAllMocks();
    });

    describe('constructor()', () => {
        it('Initializes root exporter and sets trifrost attributes', () => {
            const rootExporter = mockExporter();
            const logger = new TriFrostRootLogger({
                name: 'app',
                version: '1.2.3',
                debug: true,
                rootExporter,
                exporters: () => [mockExporter()],
                trifrost: {env: 'test'},
            });

            expect(initCalledWith).toMatchObject({
                'service.name': 'app',
                'service.version': '1.2.3',
                'telemetry.sdk.name': 'trifrost',
                'telemetry.sdk.language': 'javascript',
                env: 'test',
            });

            logger.debug('boot');
            expect(logs[0].message).toBe('boot');
        });

        it('Skips debug logs if debug=false', () => {
            const rootExporter = mockExporter();
            const logger = new TriFrostRootLogger({
                name: 'silent',
                version: '0.0.1',
                debug: false,
                rootExporter,
                exporters: () => [mockExporter()],
            });

            logger.debug('invisible');
            expect(logs.length).toBe(0);
        });

        it('Forwards all other log levels', () => {
            const rootExporter = mockExporter();
            const logger = new TriFrostRootLogger({
                name: 'demo',
                version: '1.0.0',
                debug: true,
                rootExporter,
                exporters: () => [mockExporter()],
            });

            logger.info('info');
            logger.warn('warn');
            logger.error('fail');
            logger.log('hello');

            expect(logs.map(l => l.message)).toEqual(['info', 'warn', 'fail', 'hello']);
        });
    });

    describe('info/error/debug/warn', () => {
        let rootLogger: TriFrostRootLogger;
        const traceId = 'f'.repeat(32);

        beforeEach(() => {
            rootLogger = new TriFrostRootLogger({
                name: 'logtest',
                version: '0.1.0',
                debug: true,
                rootExporter: mockExporter(),
                exporters: () => [mockExporter()],
            });
        });

        it('Calls .debug only when debug=true', () => {
            rootLogger.debug('dbg', {val: 1});
            expect(logs).toHaveLength(1);
            expect(logs[0]).toMatchObject({
                message: 'dbg',
                level: 'debug',
                data: {val: 1},
            });
        });

        it('Skips .debug when debug=false', () => {
            rootLogger = new TriFrostRootLogger({
                name: 'logtest',
                version: '0.1.0',
                debug: false,
                rootExporter: mockExporter(),
                exporters: () => [mockExporter()],
            });

            rootLogger.debug('should not log');
            expect(logs).toHaveLength(0);
        });

        it('Calls .info()', () => {
            rootLogger.info('inform', {x: true});
            expect(logs[0]).toMatchObject({
                level: 'info',
                message: 'inform',
                data: {x: true},
            });
        });

        it('Calls .warn()', () => {
            rootLogger.warn('warning', {y: false});
            expect(logs[0]).toMatchObject({
                level: 'warn',
                message: 'warning',
                data: {y: false},
            });
        });

        it('Calls .log()', () => {
            rootLogger.log('neutral', {z: 'abc'});
            expect(logs[0]).toMatchObject({
                level: 'log',
                message: 'neutral',
                data: {z: 'abc'},
            });
        });

        it('Calls .error() with string', () => {
            rootLogger.error('something bad', {code: 500});
            expect(logs[0].level).toBe('error');
            expect(logs[0].message).toBe('something bad');
            expect(logs[0].data?.code).toBe(500);
        });

        it('Calls .error() with Error instance', () => {
            const err = new Error('explode!');
            rootLogger.error(err, {route: '/fail'});
            expect(logs[0].level).toBe('error');
            expect(logs[0].message).toBe('explode!');
            expect(logs[0].data?.stack).toContain('Error: explode!');
            expect(logs[0].data?.route).toBe('/fail');
        });

        it('Calls .error() with unknown object', () => {
            rootLogger.error({oops: true});
            expect(logs[0].message).toBe('Unknown error');
            expect(logs[0].data?.raw).toEqual({oops: true});
        });

        it('Includes trace_id and span_id if spawned logger is used', () => {
            const childLogger = rootLogger.spawn({traceId, env: {}, context: {user: 'alice'}});
            childLogger.info('traceable');

            expect(logs[0].trace_id).toBe(traceId);
            expect(logs[0].ctx?.user).toBe('alice');
        });

        it('does not emit spans if exporter lacks pushSpan', () => {
            const nonSpanExporter: TriFrostLoggerExporter = {
                init: vi.fn(),
                /* @ts-ignore */
                pushLog: vi.fn(log => logs.push(log)),
                flush: vi.fn(() => Promise.resolve()),
            };

            const root = new TriFrostRootLogger({
                name: 'no-span-export',
                version: '1.0.0',
                debug: true,
                rootExporter: mockExporter(),
                exporters: () => [nonSpanExporter],
            });

            const logger = root.spawn({
                traceId: 'abc123abc123abc123abc123abc123ab',
                env: {},
            });

            const span = logger.startSpan('spanless');
            span.setAttribute('foo', 'bar');
            span.end();

            expect(spans.length).toBe(0);
            expect(logs.length).toBe(0);
        });

        it('still logs messages even if exporter has no pushSpan', () => {
            const nonSpanExporter: TriFrostLoggerExporter = {
                init: vi.fn(),
                /* @ts-ignore */
                pushLog: vi.fn(log => logs.push(log)),
                flush: vi.fn(() => Promise.resolve()),
            };

            const root = new TriFrostRootLogger({
                name: 'log-only',
                version: '1.0.0',
                debug: true,
                rootExporter: mockExporter(),
                exporters: () => [nonSpanExporter],
            });

            const logger = root.spawn({
                traceId: 'ffffffffffffffffffffffffffffffff',
                env: {},
                context: {mode: 'test'},
            });

            logger.info('hello');
            expect(logs[0].message).toBe('hello');
            expect(logs[0].trace_id).toBe('ffffffffffffffffffffffffffffffff');
            expect(logs[0].ctx).toMatchObject({mode: 'test'});
        });

        it('still logs messages even if root exporter has no pushSpan', () => {
            const nonSpanExporter: TriFrostLoggerExporter = {
                init: vi.fn(),
                /* @ts-ignore */
                pushLog: vi.fn(log => logs.push(log)),
                flush: vi.fn(() => Promise.resolve()),
            };

            const root = new TriFrostRootLogger({
                name: 'log-only',
                version: '1.0.0',
                debug: true,
                rootExporter: nonSpanExporter,
                exporters: () => [nonSpanExporter],
            });

            const logger = root.spawn({
                traceId: 'ffffffffffffffffffffffffffffffff',
                env: {},
                context: {mode: 'test'},
            });

            logger.info('hello');
            expect(logs[0].message).toBe('hello');
            expect(logs[0].trace_id).toBe('ffffffffffffffffffffffffffffffff');
            expect(logs[0].ctx).toMatchObject({mode: 'test'});
        });
    });

    describe('spawn()', () => {
        it('Spawns a new logger with resolved exporters', () => {
            const exp = mockExporter();
            const rootLogger = new TriFrostRootLogger({
                name: 'spawner',
                version: '1.0.0',
                debug: true,
                rootExporter: mockExporter(),
                exporters: () => [exp],
            });

            const logger = rootLogger.spawn({
                traceId: 'a'.repeat(32),
                env: {},
                context: {reqId: '1234'},
            });

            logger.info('spawned');
            expect(logs[0].trace_id).toBe('a'.repeat(32));
            expect(logs[0].ctx).toMatchObject({reqId: '1234'});
        });

        it('Pushes span-aware exporters if pushSpan is defined', () => {
            const exp = mockExporter();
            const rootLogger = new TriFrostRootLogger({
                name: 'spanaware',
                version: '1.0.0',
                debug: true,
                rootExporter: mockExporter(),
                exporters: () => [exp],
            });

            const logger = rootLogger.spawn({
                traceId: 'c'.repeat(32),
                env: {},
            });

            const span = logger.startSpan('db-query');
            span.setAttribute('latency', 12);
            span.end();

            expect(spans).toHaveLength(1);
            expect(spans[0].name).toBe('db-query');
            expect(spans[0].traceId).toBe('c'.repeat(32));
            expect(spans[0].ctx.latency).toBe(12);
        });

        it('Returns noop logger if resolution fails', () => {
            const rootLogger = new TriFrostRootLogger({
                name: 'failcase',
                version: '1.0.0',
                debug: true,
                rootExporter: mockExporter(),
                exporters: () => {
                    throw new Error('Explode');
                },
            });

            console.error = vi.fn();
            const logger = rootLogger.spawn({
                traceId: 'z'.repeat(32),
                env: {},
            });

            logger.info('noop');
            expect(logs).toHaveLength(0);
            expect(console.error).toHaveBeenCalled();
        });

        it('Does not reinit exporters on multiple spawn calls', () => {
            const exp = mockExporter();
            const exportersFn = vi.fn(() => [exp]);

            const rootLogger = new TriFrostRootLogger({
                name: 'cachetest',
                version: '1.0.0',
                debug: true,
                rootExporter: mockExporter(),
                exporters: exportersFn,
            });

            rootLogger.spawn({traceId: '1'.repeat(32), env: {}});
            rootLogger.spawn({traceId: '2'.repeat(32), env: {}});

            expect(exportersFn).toHaveBeenCalledOnce();
            expect(initCalledWith).toEqual({
                'service.name': 'cachetest',
                'service.version': '1.0.0',
                'telemetry.sdk.language': 'javascript',
                'telemetry.sdk.name': 'trifrost',
            });
        });

        it('Creates child spans with proper parent linkage from spawn logger', async () => {
            const exp = mockExporter();
            const rootLogger = new TriFrostRootLogger({
                name: 'tree',
                version: '1.0.0',
                debug: true,
                rootExporter: mockExporter(),
                exporters: () => [exp],
            });

            const logger = rootLogger.spawn({
                traceId: 'f'.repeat(32),
                env: {},
            });

            await logger.span('parent', async () => {
                await logger.span('child', () => Promise.resolve());
            });

            expect(spans).toHaveLength(2);
            expect(spans[0].name).toBe('child');
            expect(spans[1].name).toBe('parent');
            expect(spans[0].parentSpanId).toBe(spans[1].spanId);
        });

        it('Filters out non-span-aware exporters', () => {
            const exp: TriFrostLoggerExporter = {
                init: vi.fn(),
                /* @ts-ignore */
                pushLog: vi.fn(log => logs.push(log)),
                flush: vi.fn(() => Promise.resolve()),
            };

            const rootLogger = new TriFrostRootLogger({
                name: 'nospan',
                version: '1.0.0',
                debug: true,
                rootExporter: mockExporter(),
                exporters: () => [exp],
            });

            const logger = rootLogger.spawn({
                traceId: 'f'.repeat(32),
                env: {},
            });

            const span = logger.startSpan('do-something');
            span.end();

            expect(spans.length).toBe(0);
        });

        it('Handles errors inside exporter init()', () => {
            const badExporter: TriFrostLoggerExporter = {
                init: () => {
                    throw new Error('boom');
                },
                pushLog: vi.fn(),
                pushSpan: vi.fn(),
                flush: vi.fn(() => Promise.resolve()),
            };

            const rootLogger = new TriFrostRootLogger({
                name: 'explode-init',
                version: '1.0.0',
                debug: true,
                rootExporter: mockExporter(),
                exporters: () => [badExporter],
            });

            console.error = vi.fn();
            const logger = rootLogger.spawn({traceId: 'd'.repeat(32), env: {}});
            logger.info('this will not emit');

            expect(logs.length).toBe(0);
            expect(console.error).toHaveBeenCalled();
        });

        it('Spawned logger is a proper TriFrostLogger instance', () => {
            const exp = mockExporter();
            const rootLogger = new TriFrostRootLogger({
                name: 'instance-check',
                version: '1.0.0',
                debug: true,
                rootExporter: mockExporter(),
                exporters: () => [exp],
            });

            const logger = rootLogger.spawn({traceId: '1'.repeat(32), env: {}});
            expect(typeof logger.info).toBe('function');
            expect(typeof logger.startSpan).toBe('function');
            expect(typeof logger.flush).toBe('function');
        });

        it('Handles exporter resolution returning empty list', () => {
            const rootLogger = new TriFrostRootLogger({
                name: 'empty-case',
                version: '1.0.0',
                debug: true,
                rootExporter: mockExporter(),
                exporters: () => [],
            });

            const logger = rootLogger.spawn({
                traceId: 'e'.repeat(32),
                env: {},
            });

            logger.info('ok');
            expect(logs.length).toBe(0);
        });

        it('Reuses resolved context across multiple spawns with diff input', () => {
            const exp = mockExporter();
            const rootLogger = new TriFrostRootLogger({
                name: 'reused-ctx',
                version: '1.0.0',
                debug: true,
                rootExporter: mockExporter(),
                exporters: () => [exp],
            });

            const loggerA = rootLogger.spawn({traceId: 'a'.repeat(32), env: {}, context: {req: 1}});
            const loggerB = rootLogger.spawn({traceId: 'b'.repeat(32), env: {}, context: {req: 2}});

            loggerA.info('first');
            loggerB.info('second');

            expect(logs[0].trace_id).toBe('a'.repeat(32));
            expect(logs[0].ctx).toMatchObject({req: 1});
            expect(logs[1].trace_id).toBe('b'.repeat(32));
            expect(logs[1].ctx).toMatchObject({req: 2});
        });
    });
});
