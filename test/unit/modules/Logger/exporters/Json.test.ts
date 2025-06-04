import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {JsonExporter} from '../../../../../lib/modules/Logger/exporters/Json';
import {type TriFrostLoggerLogPayload, type TriFrostLogLevel} from '../../../../../lib/modules/Logger/types';

const levels: TriFrostLogLevel[] = ['log', 'info', 'warn', 'error', 'debug'];

describe('Modules - Logger - Exporters - Json', () => {
    let spies: any;
    const fixedDate = new Date('2025-06-03T12:34:56.789Z');

    const baseLog: Omit<TriFrostLoggerLogPayload, 'level'> = {
        time: fixedDate,
        message: 'Test message',
        ctx: {user: 'test'},
    };

    beforeEach(() => {
        spies = {
            log: vi.spyOn(console, 'log').mockImplementation(() => {}),
            info: vi.spyOn(console, 'info').mockImplementation(() => {}),
            warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
            error: vi.spyOn(console, 'error').mockImplementation(() => {}),
            debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
        };
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    levels.forEach(level => {
        describe(`Level: ${level}`, () => {
            it('Logs basic message to console', async () => {
                const exporter = new JsonExporter();
                exporter.init({service: 'test'});

                await exporter.pushLog({...baseLog, level});

                const expected = {
                    time: fixedDate.toISOString(),
                    level,
                    message: 'Test message',
                    ctx: {user: 'test'},
                    global: {service: 'test'},
                };

                expect(spies[level]).toHaveBeenCalledWith(JSON.stringify(expected));
            });

            it('Logs with meta (trace_id, span_id, parent_span_id, data)', async () => {
                const exporter = new JsonExporter();
                exporter.init({service: 'test'});

                await exporter.pushLog({
                    ...baseLog,
                    level,
                    trace_id: 'trace-123',
                    span_id: 'span-abc',
                    data: {extra: 'info'},
                });

                const expected = {
                    time: fixedDate.toISOString(),
                    level,
                    message: 'Test message',
                    trace_id: 'trace-123',
                    span_id: 'span-abc',
                    ctx: {user: 'test'},
                    data: {extra: 'info'},
                    global: {service: 'test'},
                };

                expect(spies[level]).toHaveBeenCalledWith(JSON.stringify(expected));
            });

            it('Uses sink if provided', async () => {
                const sink = vi.fn();
                const exporter = new JsonExporter({sink});
                exporter.init({service: 'test'});

                await exporter.pushLog({...baseLog, level});

                const expected = {
                    time: fixedDate.toISOString(),
                    level,
                    message: 'Test message',
                    ctx: {user: 'test'},
                    global: {service: 'test'},
                };

                expect(sink).toHaveBeenCalledWith(expected);
                expect(spies[level]).not.toHaveBeenCalled();
            });

            it('Omits specified keys', async () => {
                const exporter = new JsonExporter({
                    omit: ['ctx.user', 'global.service', 'message'],
                });
                exporter.init({service: 'test'});

                await exporter.pushLog({
                    ...baseLog,
                    level,
                    trace_id: 'trace-123',
                    data: {extra: 'info'},
                });

                expect(spies[level]).toHaveBeenCalledWith(JSON.stringify({
                    time: fixedDate.toISOString(),
                    level,
                    trace_id: 'trace-123',
                    ctx: {},
                    data: {extra: 'info'},
                    global: {},
                }));
            });
        });
    });

    it('flush() completes silently', async () => {
        const exporter = new JsonExporter();
        await expect(exporter.flush()).resolves.toBeUndefined();
        Object.values(spies).forEach(s => expect(s).not.toHaveBeenCalled());
    });
});
