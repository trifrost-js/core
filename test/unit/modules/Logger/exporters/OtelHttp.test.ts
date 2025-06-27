import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {OtelHttpExporter} from '../../../../../lib/modules/Logger/exporters/OtelHttp';
import {type TriFrostLoggerLogPayload, type TriFrostLoggerSpanPayload} from '../../../../../lib/modules/Logger/types';

describe('Modules - Logger - Exporters - OtelHttpExporter', () => {
    let fetchSpy: any;
    const fixedDate = new Date('2025-06-03T12:34:56.789Z');
    const fixedTimeNano = fixedDate.getTime() * 1_000_000;

    beforeEach(() => {
        /* @ts-expect-error Should be good */
        fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ok: true});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('Flushes logs with exact payload', async () => {
        const exporter = new OtelHttpExporter({logEndpoint: 'http://mock'});
        exporter.init({service: 'test-service'});

        const log: TriFrostLoggerLogPayload = {
            time: fixedDate,
            level: 'info',
            message: 'Test log',
            trace_id: 'trace-1',
            span_id: 'span-1',
            ctx: {user: 'alice'},
            data: {requestId: 'req-1'},
        };

        await exporter.pushLog(log);
        await exporter.flush();

        expect(fetchSpy).toHaveBeenCalledWith('http://mock', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                resourceLogs: [
                    {
                        resource: {
                            attributes: [{key: 'service', value: {stringValue: 'test-service'}}],
                        },
                        scopeLogs: [
                            {
                                scope: {name: 'trifrost.logger', version: '1.0.0'},
                                logRecords: [
                                    {
                                        timeUnixNano: fixedTimeNano,
                                        severityText: 'INFO',
                                        body: {stringValue: 'Test log'},
                                        attributes: [
                                            {key: 'ctx.user', value: {stringValue: 'alice'}},
                                            {key: 'data.requestId', value: {stringValue: 'req-1'}},
                                            {key: 'trace_id', value: {stringValue: 'trace-1'}},
                                            {key: 'span_id', value: {stringValue: 'span-1'}},
                                        ],
                                    },
                                ],
                            },
                        ],
                    },
                ],
            }),
        });
    });

    it('Flushes spans with exact payload', async () => {
        const exporter = new OtelHttpExporter({logEndpoint: 'http://mock'});
        exporter.init({service: 'test-service'});

        const span: TriFrostLoggerSpanPayload = {
            name: 'span-test',
            traceId: 'trace-2',
            spanId: 'span-2',
            start: fixedDate.getTime(),
            end: fixedDate.getTime() + 500,
            ctx: {operation: 'db-query'},
            parentSpanId: 'parent-2',
            status: {code: 1, message: 'OK'},
        };

        await exporter.pushSpan(span);
        await exporter.flush();

        expect(fetchSpy).toHaveBeenCalledWith('http://mock', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                resourceSpans: [
                    {
                        resource: {
                            attributes: [{key: 'service', value: {stringValue: 'test-service'}}],
                        },
                        scopeSpans: [
                            {
                                scope: {name: 'trifrost.logger', version: '1.0.0'},
                                spans: [
                                    {
                                        name: 'span-test',
                                        traceId: 'trace-2',
                                        spanId: 'span-2',
                                        startTimeUnixNano: fixedTimeNano,
                                        endTimeUnixNano: (fixedDate.getTime() + 500) * 1_000_000,
                                        attributes: [{key: 'operation', value: {stringValue: 'db-query'}}],
                                        parentSpanId: 'parent-2',
                                        status: {code: 1, message: 'OK'},
                                    },
                                ],
                            },
                        ],
                    },
                ],
            }),
        });
    });

    it('Correctly maps string, int, double, and boolean attributes', async () => {
        const exporter = new OtelHttpExporter({logEndpoint: 'http://mock'});
        exporter.init({service: 'test-service'});

        const log: TriFrostLoggerLogPayload = {
            time: fixedDate,
            level: 'info',
            message: 'Type mapping test',
            ctx: {
                stringProp: 'hello',
                intProp: 42,
                doubleProp: 3.14,
                boolProp: true,
            },
            data: {
                anotherString: 'world',
                anotherInt: 100,
                anotherDouble: 2.718,
                anotherBool: false,
                /* These shouldn't be logged */
                hey: undefined,
                nada: null,
                neginf: Number.NEGATIVE_INFINITY,
                posinf: Number.NEGATIVE_INFINITY,
            },
        };

        await exporter.pushLog(log);
        await exporter.flush();

        expect(fetchSpy).toHaveBeenCalledWith('http://mock', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                resourceLogs: [
                    {
                        resource: {
                            attributes: [{key: 'service', value: {stringValue: 'test-service'}}],
                        },
                        scopeLogs: [
                            {
                                scope: {name: 'trifrost.logger', version: '1.0.0'},
                                logRecords: [
                                    {
                                        timeUnixNano: 1748954096789000000,
                                        severityText: 'INFO',
                                        body: {
                                            stringValue: 'Type mapping test',
                                        },
                                        attributes: [
                                            {key: 'ctx.stringProp', value: {stringValue: 'hello'}},
                                            {key: 'ctx.intProp', value: {intValue: 42}},
                                            {key: 'ctx.doubleProp', value: {doubleValue: 3.14}},
                                            {key: 'ctx.boolProp', value: {boolValue: true}},
                                            {key: 'data.anotherString', value: {stringValue: 'world'}},
                                            {key: 'data.anotherInt', value: {intValue: 100}},
                                            {key: 'data.anotherDouble', value: {doubleValue: 2.718}},
                                            {key: 'data.anotherBool', value: {boolValue: false}},
                                        ],
                                    },
                                ],
                            },
                        ],
                    },
                ],
            }),
        });
    });

    it('Serializes nested objects and arrays as stringValue', async () => {
        const exporter = new OtelHttpExporter({logEndpoint: 'http://mock'});
        exporter.init({service: 'test-service'});

        const log: TriFrostLoggerLogPayload = {
            time: fixedDate,
            level: 'info',
            message: 'Nested serialization test',
            ctx: {
                nestedObj: {key1: 'val1', key2: 2},
                arrayProp: [1, 2, 3, 'four'],
            },
            data: {
                deepNested: {inner: {flag: true}},
                mixedArray: [{a: 1}, {b: 2}],
            },
        };

        await exporter.pushLog(log);
        await exporter.flush();

        const sentBody = JSON.parse(fetchSpy.mock.calls[0][1].body);
        const attrs = sentBody.resourceLogs[0].scopeLogs[0].logRecords[0].attributes;

        expect(attrs).toEqual(
            expect.arrayContaining([
                {
                    key: 'ctx.nestedObj',
                    value: {stringValue: JSON.stringify({key1: 'val1', key2: 2})},
                },
                {
                    key: 'ctx.arrayProp',
                    value: {stringValue: JSON.stringify([1, 2, 3, 'four'])},
                },
                {
                    key: 'data.deepNested',
                    value: {stringValue: JSON.stringify({inner: {flag: true}})},
                },
                {
                    key: 'data.mixedArray',
                    value: {stringValue: JSON.stringify([{a: 1}, {b: 2}])},
                },
            ]),
        );
    });

    it('applies omit keys on span payload', async () => {
        const exporter = new OtelHttpExporter({
            logEndpoint: 'http://mock',
            omit: ['internalNote'],
        });
        exporter.init({service: 'test-service'});

        const span: TriFrostLoggerSpanPayload = {
            name: 'omit-span',
            traceId: 'trace-omit',
            spanId: 'span-omit',
            start: fixedDate.getTime(),
            end: fixedDate.getTime() + 1000,
            ctx: {operation: 'query', internalNote: 'omit-me'},
        };

        await exporter.pushSpan(span);
        await exporter.flush();

        const sentBody = JSON.parse(fetchSpy.mock.calls[0][1].body);
        const spanAttrs = sentBody.resourceSpans[0].scopeSpans[0].spans[0].attributes;

        expect(spanAttrs).toEqual(expect.arrayContaining([{key: 'operation', value: {stringValue: 'query'}}]));
        expect(spanAttrs.find(a => a.key === 'internalNote')).toEqual({key: 'internalNote', value: {stringValue: '***'}});
    });

    it('Applies omit keys on log payload', async () => {
        const exporter = new OtelHttpExporter({
            logEndpoint: 'http://mock',
            omit: ['secret', 'sensitiveId'],
        });
        exporter.init({service: 'test-service'});

        const log: TriFrostLoggerLogPayload = {
            time: fixedDate,
            level: 'info',
            message: 'Omit log test',
            ctx: {user: 'bob', secret: 'hidden'},
            data: {safe: 'yes', sensitiveId: 'should-omit'},
        };

        await exporter.pushLog(log);
        await exporter.flush();

        const expectedAttributes = [
            {key: 'ctx.user', value: {stringValue: 'bob'}},
            {key: 'data.safe', value: {stringValue: 'yes'}},
        ];

        const sentBody = JSON.parse(fetchSpy.mock.calls[0][1].body);
        const logAttrs = sentBody.resourceLogs[0].scopeLogs[0].logRecords[0].attributes;

        expect(logAttrs).toEqual(expect.arrayContaining(expectedAttributes));
        expect(logAttrs.find(a => a.key === 'ctx.secret')).toEqual({key: 'ctx.secret', value: {stringValue: '***'}});
        expect(logAttrs.find(a => a.key === 'data.sensitiveId')).toEqual({key: 'data.sensitiveId', value: {stringValue: '***'}});
    });

    it('Applies wildcard omit to nested ctx/data objects', async () => {
        const exporter = new OtelHttpExporter({
            logEndpoint: 'http://mock',
            omit: [{global: 'password'}],
        });

        exporter.init({service: 'test-service'});

        await exporter.pushLog({
            time: fixedDate,
            level: 'info',
            message: 'wildcard omit',
            ctx: {
                user: {name: 'alice', password: '123'},
            },
            data: {
                db: {password: '456', host: 'localhost'},
            },
        });
        await exporter.flush();

        const attrs = JSON.parse(fetchSpy.mock.calls[0][1].body).resourceLogs[0].scopeLogs[0].logRecords[0].attributes;

        expect(attrs).toEqual(
            expect.arrayContaining([
                {key: 'ctx.user', value: {stringValue: JSON.stringify({name: 'alice', password: '***'})}},
                {key: 'data.db', value: {stringValue: JSON.stringify({password: '***', host: 'localhost'})}},
            ]),
        );
    });

    it('Scrambles global init attributes using omit', async () => {
        const exporter = new OtelHttpExporter({
            logEndpoint: 'http://mock',
            omit: ['secret'],
        });

        exporter.init({service: 'logger', secret: 'hidden'});

        await exporter.pushLog({
            time: fixedDate,
            level: 'info',
            message: 'global scramble',
        } as TriFrostLoggerLogPayload);

        await exporter.flush();

        const attrs = JSON.parse(fetchSpy.mock.calls[0][1].body).resourceLogs[0].resource.attributes;

        expect(attrs).toEqual(
            expect.arrayContaining([
                {key: 'service', value: {stringValue: 'logger'}},
                {key: 'secret', value: {stringValue: '***'}},
            ]),
        );
    });

    it('Does not scramble if omit list is empty', async () => {
        const exporter = new OtelHttpExporter({
            logEndpoint: 'http://mock',
            omit: [],
        });

        exporter.init({service: 'logger', secret: 'should-not-scramble'});

        await exporter.pushLog({
            time: fixedDate,
            level: 'info',
            message: 'no scramble',
            ctx: {secret: 'also-raw'},
        });

        await exporter.flush();

        const attrs = JSON.parse(fetchSpy.mock.calls[0][1].body).resourceLogs[0].scopeLogs[0].logRecords[0].attributes;

        expect(attrs.find(a => a.key === 'ctx.secret')?.value.stringValue).toBe('also-raw');
    });

    it('Uses spanEndpoint if provided', async () => {
        const exporter = new OtelHttpExporter({
            logEndpoint: 'http://log-endpoint',
            spanEndpoint: 'http://span-endpoint',
        });
        exporter.init({service: 'test-service'});

        const span: TriFrostLoggerSpanPayload = {
            name: 'span-ep-test',
            traceId: 'trace-ep',
            spanId: 'span-ep',
            start: fixedDate.getTime(),
            end: fixedDate.getTime() + 200,
            ctx: {},
        };

        await exporter.pushSpan(span);
        await exporter.flush();

        const spanCall = fetchSpy.mock.calls.find(c => c[0] === 'http://span-endpoint');
        expect(spanCall).toBeTruthy();
    });

    it('Merges custom headers into fetch', async () => {
        const exporter = new OtelHttpExporter({
            logEndpoint: 'http://mock',
            headers: {Authorization: 'Bearer token'},
        });
        exporter.init({service: 'test-service'});

        const log = {
            time: fixedDate,
            level: 'info',
            message: 'header-merge-test',
        } as TriFrostLoggerLogPayload;

        await exporter.pushLog(log);
        await exporter.flush();

        const headers = fetchSpy.mock.calls[0][1].headers;
        expect(headers).toMatchObject({
            'Content-Type': 'application/json',
            Authorization: 'Bearer token',
        });
    });

    it('flush() with empty buffers does not call fetch', async () => {
        const exporter = new OtelHttpExporter({logEndpoint: 'http://mock'});
        await exporter.flush();
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('retries on fetch failure and respects maxRetries', async () => {
        const errorResponse = {ok: false, status: 500};
        /* @ts-expect-error Should be good */
        const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(errorResponse);

        const exporter = new OtelHttpExporter({
            logEndpoint: 'http://mock',
            maxRetries: 2,
        });
        exporter.init({service: 'test-service'});

        await exporter.pushLog({
            time: fixedDate,
            level: 'error',
            message: 'Retry test',
        } as TriFrostLoggerLogPayload);
        await exporter.flush();

        expect(fetchMock).toHaveBeenCalledTimes(2); /* initial + 1 retry */
    });

    it('automatically flushes logs when hitting maxBatchSize', async () => {
        const exporter = new OtelHttpExporter({
            logEndpoint: 'http://mock',
            maxBatchSize: 2,
        });
        exporter.init({service: 'test-service'});

        await exporter.pushLog({
            time: fixedDate,
            level: 'info',
            message: 'Log 1',
        } as TriFrostLoggerLogPayload);
        expect(fetchSpy).not.toHaveBeenCalled();

        await exporter.pushLog({
            time: fixedDate,
            level: 'info',
            message: 'Log 2',
        } as TriFrostLoggerLogPayload); /* should trigger flush */
        expect(fetchSpy).toHaveBeenCalled();
    });

    it('automatically flushes spans when hitting maxBatchSize', async () => {
        const exporter = new OtelHttpExporter({
            logEndpoint: 'http://mock',
            maxBatchSize: 2,
        });
        exporter.init({service: 'test-service'});

        await exporter.pushSpan({
            name: 'span1',
            traceId: 'trace1',
            spanId: 'span1',
            start: fixedDate.getTime(),
            end: fixedDate.getTime() + 100,
            ctx: {},
        });
        expect(fetchSpy).not.toHaveBeenCalled();

        await exporter.pushSpan({
            name: 'span2',
            traceId: 'trace2',
            spanId: 'span2',
            start: fixedDate.getTime(),
            end: fixedDate.getTime() + 200,
            ctx: {},
        }); /* should trigger flush */
        expect(fetchSpy).toHaveBeenCalled();
    });

    it('Applies wildcard omit to nested span.ctx values', async () => {
        const exporter = new OtelHttpExporter({
            logEndpoint: 'http://mock',
            omit: [{global: 'password'}],
        });

        exporter.init({service: 'tracer'});

        await exporter.pushSpan({
            name: 'span-nested-ctx',
            traceId: 'trace-x',
            spanId: 'span-x',
            start: fixedDate.getTime(),
            end: fixedDate.getTime() + 50,
            ctx: {
                auth: {
                    user: 'bob',
                    password: 'hunter2',
                },
            },
        });

        await exporter.flush();

        const attrs = JSON.parse(fetchSpy.mock.calls[0][1].body).resourceSpans[0].scopeSpans[0].spans[0].attributes;

        expect(attrs).toEqual(
            expect.arrayContaining([
                {
                    key: 'auth',
                    value: {
                        stringValue: JSON.stringify({
                            user: 'bob',
                            password: '***',
                        }),
                    },
                },
            ]),
        );
    });

    it('Scrambles resource attributes during init for spans', async () => {
        const exporter = new OtelHttpExporter({
            logEndpoint: 'http://mock',
            omit: ['secret'],
        });

        exporter.init({service: 'tracing', secret: 'top-secret'});

        await exporter.pushSpan({
            name: 'init-span',
            traceId: 'trace-y',
            spanId: 'span-y',
            start: fixedDate.getTime(),
            end: fixedDate.getTime() + 100,
            ctx: {},
        });

        await exporter.flush();

        const resAttrs = JSON.parse(fetchSpy.mock.calls[0][1].body).resourceSpans[0].resource.attributes;

        expect(resAttrs).toEqual(
            expect.arrayContaining([
                {key: 'service', value: {stringValue: 'tracing'}},
                {key: 'secret', value: {stringValue: '***'}},
            ]),
        );
    });

    it('Does not scramble span.ctx if omit is empty', async () => {
        const exporter = new OtelHttpExporter({
            logEndpoint: 'http://mock',
            omit: [],
        });

        exporter.init({});

        await exporter.pushSpan({
            name: 'unmasked-span',
            traceId: 'trace-z',
            spanId: 'span-z',
            start: fixedDate.getTime(),
            end: fixedDate.getTime() + 100,
            ctx: {
                user: 'alice',
                token: 'visible',
            },
        });

        await exporter.flush();

        const attrs = JSON.parse(fetchSpy.mock.calls[0][1].body).resourceSpans[0].scopeSpans[0].spans[0].attributes;

        expect(attrs).toEqual(
            expect.arrayContaining([
                {key: 'user', value: {stringValue: 'alice'}},
                {key: 'token', value: {stringValue: 'visible'}},
            ]),
        );
    });
});
