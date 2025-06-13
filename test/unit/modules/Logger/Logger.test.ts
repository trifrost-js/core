import {describe, it, expect, vi, beforeEach} from 'vitest';
import {Logger, isValidTraceId} from '../../../../lib/modules/Logger/Logger';
import {
    type TriFrostLoggerExporter,
    type TriFrostLoggerLogPayload,
    type TriFrostLoggerSpanAwareExporter,
    type TriFrostLoggerSpanPayload,
} from '../../../../lib/modules/Logger/types';

describe('Modules - Logger - Logger', () => {
    let logs: TriFrostLoggerLogPayload[] = [];
    let spans: TriFrostLoggerSpanPayload[] = [];
    let flushCalled = false;

    const mockExporter: TriFrostLoggerExporter = {
        init: vi.fn(),
        /* @ts-ignore */
        pushLog: vi.fn(log => logs.push(log)),
        pushSpan: vi.fn(span => spans.push(span)),
        flush: vi.fn(() => {
            flushCalled = true;
            return Promise.resolve();
        }),
    };

    beforeEach(() => {
        logs = [];
        spans = [];
        flushCalled = false;
        vi.clearAllMocks();
    });

    describe('constructor()', () => {
        it('initializes traceId and context', () => {
            const traceId = 'a'.repeat(32);
            const logger = new Logger({
                debug: false,
                traceId,
                context: {user: 'valkyrie'},
                exporters: [mockExporter],
                spanAwareExporters: [],
            });

            expect(logger.traceId).toBe(traceId);
            expect(mockExporter.init).not.toHaveBeenCalled();
        });

        it('generates a fallback traceId if invalid', () => {
            const logger = new Logger({
                debug: false,
                traceId: 'bad-id',
                exporters: [mockExporter],
                spanAwareExporters: [],
            });
            expect(/^[a-f0-9]{32}$/.test(logger.traceId as string)).toBe(true);
        });
    });

    describe('Utils - isValidTraceId', () => {
        it('accepts valid 32-char hex strings', () => {
            expect(isValidTraceId('abcdef0123456789abcdef0123456789')).toBe(true);
        });

        it('rejects short strings', () => {
            expect(isValidTraceId('abcd')).toBe(false);
        });

        it('rejects invalid characters', () => {
            expect(isValidTraceId('xyzxyzxyzxyzxyzxyzxyzxyzxyzxyzxy')).toBe(false);
        });
    });

    describe('setAttribute()', () => {
        it('sets a single attribute', () => {
            const logger = new Logger({debug: true, exporters: [mockExporter], spanAwareExporters: []});
            logger.setAttribute('foo', 'bar').info('test');
            expect(logs[0].ctx).toMatchObject({foo: 'bar'});
        });
    });

    describe('setAttributes()', () => {
        it('sets multiple attributes', () => {
            const logger = new Logger({debug: true, exporters: [mockExporter], spanAwareExporters: []});
            logger.setAttributes({foo: 'bar', env: 'dev'}).info('test');
            expect(logs[0].ctx).toMatchObject({foo: 'bar', env: 'dev'});
        });
    });

    describe('debug()', () => {
        it('emits when debug=true', () => {
            const logger = new Logger({debug: true, exporters: [mockExporter], spanAwareExporters: []});
            logger.debug('hello', {val: 1});
            expect(logs[0].message).toBe('hello');
        });

        it('skips when debug=false', () => {
            const logger = new Logger({debug: false, exporters: [mockExporter], spanAwareExporters: []});
            logger.debug('noop');
            expect(logs.length).toBe(0);
        });
    });

    describe.each([
        ['info'], ['log'], ['warn'],
    ])('%s()', level => {
        it(`pushes a log at ${level} level`, () => {
            const logger = new Logger({debug: true, exporters: [mockExporter], spanAwareExporters: []});
            logger[level]('message', {level});
            expect(logs[0]).toMatchObject({message: 'message', level});
            expect(logs[0].data).toEqual({level});
        });
    });

    describe('error()', () => {
        it('handles Error object', () => {
            const logger = new Logger({debug: true, exporters: [mockExporter], spanAwareExporters: []});
            const err = new Error('fail');
            logger.error(err);
            expect(logs[0].message).toBe('fail');
            expect(logs[0].data?.stack).toContain('Error: fail');
        });

        it('handles string error', () => {
            const logger = new Logger({debug: true, exporters: [mockExporter], spanAwareExporters: []});
            logger.error('something bad', {code: 500});
            expect(logs[0].message).toBe('something bad');
            expect(logs[0].data?.code).toBe(500);
        });

        it('handles unknown error', () => {
            const logger = new Logger({debug: true, exporters: [mockExporter], spanAwareExporters: []});
            logger.error({reason: 'boom'});
            expect(logs[0].message).toBe('Unknown error');
            expect(logs[0].data?.raw).toEqual({reason: 'boom'});
        });
    });

    describe('startSpan()', () => {
        it('pushes span to span-aware exporters', () => {
            const logger = new Logger({
                debug: true,
                traceId: 'a'.repeat(32),
                exporters: [mockExporter],
                spanAwareExporters: [mockExporter] as TriFrostLoggerSpanAwareExporter[],
            });

            const span = logger.startSpan('boot');
            span.setAttribute('init', true);
            span.end();

            expect(spans.length).toBe(1);
            expect(spans[0].name).toBe('boot');
            expect(spans[0].traceId).toBe(logger.traceId);
            expect(/^[a-f0-9]{16}$/.test(spans[0].spanId)).toBe(true);
            expect(spans[0].parentSpanId).toBe(undefined);
            expect(spans[0].ctx.init).toBe(true);
            expect(spans[0].end).toBeGreaterThanOrEqual(spans[0].start);
        });

        it('applies otel.status_code and otel.status_message when wrong', () => {
            const logger = new Logger({
                debug: true,
                traceId: 'c'.repeat(32),
                exporters: [mockExporter],
                spanAwareExporters: [mockExporter] as TriFrostLoggerSpanAwareExporter[],
            });

            const span = logger.startSpan('api-call');
            span.setAttributes({
                'otel.status_code': 'ERROR',
                'otel.status_message': 'Something went wrong',
            });
            span.end();

            expect(spans[0].status).toEqual({code: 2, message: 'Something went wrong'});
        });

        it('applies otel.status_code and otel.status_message when wrong', () => {
            const logger = new Logger({
                debug: true,
                traceId: 'c'.repeat(32),
                exporters: [mockExporter],
                spanAwareExporters: [mockExporter] as TriFrostLoggerSpanAwareExporter[],
            });

            const span = logger.startSpan('api-call');
            span.setAttributes({
                'otel.status_code': 'OK',
            });
            span.end();

            expect(spans[0].status).toEqual({code: 1});
        });

        it('clears active spanId after end()', () => {
            const logger = new Logger({
                debug: true,
                traceId: 'd'.repeat(32),
                exporters: [mockExporter],
                spanAwareExporters: [mockExporter] as TriFrostLoggerSpanAwareExporter[],
            });

            const span = logger.startSpan('transient');
            logger.info('inside-span');
            span.end();

            /* Log after end() should not carry any span_id */
            logger.info('post-span');

            expect(logs[0].span_id).toBe(span.uid());
            expect(logs[1].span_id).toBe(undefined);
        });

        it('creates parent and child spans with proper linkage', async () => {
            const logger = new Logger({
                debug: true,
                traceId: 'b'.repeat(32),
                exporters: [mockExporter],
                spanAwareExporters: [mockExporter] as TriFrostLoggerSpanAwareExporter[],
            });

            await logger.span('parent', async () => {
                logger.info('inside parent');
                await logger.span('child', async () => {
                    logger.info('inside child');
                });
                logger.info('back in parent');
            });

            expect(spans).toHaveLength(2);
            expect(spans[0].name).toBe('child');
            expect(spans[1].name).toBe('parent');
            expect(spans[0].parentSpanId).toBe(spans[1].spanId); /* child has parent span ID */
            expect(spans[1].parentSpanId).toBe(undefined);

            const spanLogs = logs.filter(l => l.span_id === spans[1].spanId);
            expect(spanLogs).toHaveLength(2);
            expect(spanLogs.map(l => l.message)).toEqual(['inside parent', 'back in parent']);
        });

        it('handles nested span structure correctly', () => {
            const logger = new Logger({
                debug: true,
                traceId: 'a'.repeat(32),
                exporters: [mockExporter],
                spanAwareExporters: [mockExporter] as TriFrostLoggerSpanAwareExporter[],
            });

            const outer = logger.startSpan('outer');
            outer.setAttribute('depth', 1);
            const inner = logger.startSpan('inner');
            inner.setAttribute('depth', 2);
            inner.end();
            outer.end();

            expect(spans.length).toBe(2);
            expect(spans[0].name).toBe('inner');
            expect(spans[0].spanId).toBe(inner.uid());
            expect(spans[0].parentSpanId).toBe(outer.uid());
            expect(spans[1].name).toBe('outer');
            expect(spans[1].spanId).toBe(outer.uid());
            expect(spans[1].parentSpanId).toBe(undefined);
        });
    });

    describe('span()', () => {
        it('runs a span block and ends it', async () => {
            const logger = new Logger({
                debug: true,
                traceId: 'trace-id',
                exporters: [mockExporter],
                spanAwareExporters: [mockExporter] as TriFrostLoggerSpanAwareExporter[],
            });

            const result = await logger.span('work', () => Promise.resolve('done'));
            expect(result).toBe('done');
            expect(spans[0].name).toBe('work');
        });
    });

    describe('flush()', () => {
        it('calls flush on all exporters', async () => {
            const logger = new Logger({debug: true, exporters: [mockExporter], spanAwareExporters: []});
            await logger.flush();
            expect(flushCalled).toBe(true);
        });
    });
});
