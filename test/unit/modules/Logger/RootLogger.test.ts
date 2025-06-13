import {describe, it, expect, vi, beforeEach} from 'vitest';
import {TriFrostRootLogger} from '../../../../lib/modules/Logger/RootLogger';
import {
    type TriFrostLoggerExporter,
    type TriFrostLoggerLogPayload,
    type TriFrostLoggerSpanPayload,
} from '../../../../lib/modules/Logger/types';
import {type TriFrostRuntime} from '../../../../lib/runtimes/types';
import {ConsoleExporter} from '../../../../lib/modules/Logger';

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
            const consoleExporterSpy = vi.spyOn(ConsoleExporter.prototype, 'init');

            /* eslint-disable-next-line */
            console.debug = vi.fn();

            const logger = new TriFrostRootLogger({
                runtime: {name: 'test', version: '1.0.0'} as TriFrostRuntime,
                exporters: () => [mockExporter()],
            });

            expect(consoleExporterSpy).toHaveBeenCalledWith({
                'service.name': 'trifrost-root',
                'service.version': '1.0.0',
                'telemetry.sdk.name': 'trifrost',
                'telemetry.sdk.language': 'javascript',
                'runtime.name': 'test',
                'runtime.version': '1.0.0',
            });

            logger.debug('boot');

            /* eslint-disable-next-line */
            expect(console.debug).not.toHaveBeenCalled();
        });

        it('Initializes root exporter and sets runtime attributes', () => {
            const consoleExporterSpy = vi.spyOn(ConsoleExporter.prototype, 'init');

            /* eslint-disable-next-line */
            console.debug = vi.fn();

            const logger = new TriFrostRootLogger({
                runtime: {name: 'foobar', version: null} as TriFrostRuntime,
                exporters: () => [mockExporter()],
            });

            expect(consoleExporterSpy).toHaveBeenCalledWith({
                'service.name': 'trifrost-root',
                'service.version': '1.0.0',
                'telemetry.sdk.name': 'trifrost',
                'telemetry.sdk.language': 'javascript',
                'runtime.name': 'foobar',
            });

            logger.debug('boot');

            /* eslint-disable-next-line */
            expect(console.debug).not.toHaveBeenCalled();
        });

        it('Forwards all other log levels', () => {
            const logger = new TriFrostRootLogger({
                runtime: {name: 'test', version: '1.0.0'} as TriFrostRuntime,
                exporters: () => [mockExporter()],
            });

            /* eslint-disable-next-line */
            console.info = vi.fn();
            console.warn = vi.fn();
            console.error = vi.fn();
            /* eslint-disable-next-line */
            console.log = vi.fn();

            logger.info('info');
            logger.warn('warn');
            logger.error('fail');
            logger.log('hello');

            /* eslint-disable-next-line */
            expect(console.info).toHaveBeenCalled();

            expect(console.warn).toHaveBeenCalled();
            expect(console.error).toHaveBeenCalled();

            /* eslint-disable-next-line */
            expect(console.log).toHaveBeenCalled();
        });
    });

    describe('info/error/debug/warn', () => {
        let rootLogger: TriFrostRootLogger;
        const traceId = 'f'.repeat(32);

        beforeEach(() => {
            rootLogger = new TriFrostRootLogger({
                runtime: {name: 'test', version: '1.0.0'} as TriFrostRuntime,
                exporters: () => [mockExporter()],
            });
        });

        it('Skips .debug when debug=false', () => {
            /* eslint-disable-next-line */
            console.debug = vi.fn();

            rootLogger = new TriFrostRootLogger({
                runtime: {name: 'test', version: '1.0.0'} as TriFrostRuntime,
                exporters: () => [mockExporter()],
            });

            const logger = rootLogger.spawn({env: {TRIFROST_DEBUG: 'false'}, traceId: '78947329'});

            rootLogger.debug('should not log');
            logger.debug('should not log');
            expect(logs).toHaveLength(0);

            /* eslint-disable-next-line */
            expect(console.debug).not.toHaveBeenCalled();
        });

        it('Calls .debug when debug=true', () => {
            /* eslint-disable-next-line */
            console.debug = vi.fn();

            rootLogger = new TriFrostRootLogger({
                runtime: {name: 'test', version: '1.0.0'} as TriFrostRuntime,
                exporters: () => [mockExporter()],
            });

            const logger = rootLogger.spawn({env: {TRIFROST_DEBUG: 'true'}, traceId: '78947329'});

            rootLogger.debug('should not log');
            logger.debug('dbg', {val: 1});
            expect(logs).toHaveLength(1);
            expect(logs[0]).toMatchObject({
                message: 'dbg',
                level: 'debug',
                data: {val: 1},
            });

            /* eslint-disable-next-line */
            expect(console.debug).toHaveBeenCalled();
        });

        it('Calls .info()', () => {
            const consoleExporterSpy = vi.spyOn(ConsoleExporter.prototype, 'pushLog');
            rootLogger.info('inform', {x: true});
            expect(consoleExporterSpy).toHaveBeenCalled();
        });

        it('Calls .warn()', () => {
            const consoleExporterSpy = vi.spyOn(ConsoleExporter.prototype, 'pushLog');
            rootLogger.warn('warning', {y: false});
            expect(consoleExporterSpy).toHaveBeenCalled();
        });

        it('Calls .log()', () => {
            const consoleExporterSpy = vi.spyOn(ConsoleExporter.prototype, 'pushLog');
            rootLogger.log('neutral', {z: 'abc'});
            expect(consoleExporterSpy).toHaveBeenCalled();
        });

        it('Calls .error()', () => {
            const consoleExporterSpy = vi.spyOn(ConsoleExporter.prototype, 'pushLog');
            rootLogger.error('something bad', {code: 500});
            expect(consoleExporterSpy).toHaveBeenCalled();
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
                runtime: {name: 'test', version: '1.0.0'} as TriFrostRuntime,
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
                runtime: {name: 'test', version: '1.0.0'} as TriFrostRuntime,
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
                runtime: {name: 'test', version: '1.0.0'} as TriFrostRuntime,
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
                runtime: {name: 'test', version: '1.0.0'} as TriFrostRuntime,
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
                runtime: {name: 'test', version: '1.0.0'} as TriFrostRuntime,
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
                runtime: {name: 'test', version: '1.0.0'} as TriFrostRuntime,
                exporters: exportersFn,
            });

            rootLogger.spawn({traceId: '1'.repeat(32), env: {}});
            rootLogger.spawn({traceId: '2'.repeat(32), env: {}});

            expect(exportersFn).toHaveBeenCalledOnce();
            expect(initCalledWith).toEqual({
                'service.name': 'trifrost',
                'service.version': '1.0.0',
                'telemetry.sdk.language': 'javascript',
                'telemetry.sdk.name': 'trifrost',
                'runtime.name': 'test',
                'runtime.version': '1.0.0',
            });
        });

        it('Creates child spans with proper parent linkage from spawn logger', async () => {
            const exp = mockExporter();
            const rootLogger = new TriFrostRootLogger({
                runtime: {name: 'test', version: '1.0.0'} as TriFrostRuntime,
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
                runtime: {name: 'test', version: '1.0.0'} as TriFrostRuntime,
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
                runtime: {name: 'test', version: '1.0.0'} as TriFrostRuntime,
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
                runtime: {name: 'test', version: '1.0.0'} as TriFrostRuntime,
                exporters: () => [exp],
            });

            const logger = rootLogger.spawn({traceId: '1'.repeat(32), env: {}});
            expect(typeof logger.info).toBe('function');
            expect(typeof logger.startSpan).toBe('function');
            expect(typeof logger.flush).toBe('function');
        });

        it('Handles exporter resolution returning empty list', () => {
            const rootLogger = new TriFrostRootLogger({
                runtime: {name: 'test', version: '1.0.0'} as TriFrostRuntime,
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
                runtime: {name: 'test', version: '1.0.0'} as TriFrostRuntime,
                exporters: () => [exp],
            });

            const loggerA = rootLogger.spawn({traceId: 'a'.repeat(32), env: {}, context: {req: 1}});
            const loggerB = rootLogger.spawn({traceId: 'b'.repeat(32), env: {}, context: {req: 2}});

            loggerA.info('first');
            loggerB.info('second');

            expect(logs[0].trace_id).toBe('a'.repeat(32));
            expect(logs[0].ctx).toEqual({req: 1});
            expect(logs[1].trace_id).toBe('b'.repeat(32));
            expect(logs[1].ctx).toEqual({req: 2});
        });
    });
});
