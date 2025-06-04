import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {ConsoleExporter} from '../../../../../lib/modules/Logger/exporters/Console';
import {type TriFrostLoggerLogPayload, type TriFrostLogLevel} from '../../../../../lib/modules/Logger/types';

const levels:TriFrostLogLevel[] = ['log', 'info', 'warn', 'error', 'debug'];

describe('Modules - Logger - Exporters - Console', () => {
    let spies:any;
    const fixedDate = new Date('2025-06-03T12:34:56.789Z');

    const baseLog: Omit<TriFrostLoggerLogPayload, 'level'> = {
        time: fixedDate,
        message: 'Test message',
        ctx: {user: 'test'},
    };

    const customFormat = (log:TriFrostLoggerLogPayload) => `CUSTOM[${log.level.toUpperCase()}]: ${log.message}`;

    beforeEach(() => {
        spies = {
            log: vi.spyOn(console, 'log').mockImplementation(() => {}),
            info: vi.spyOn(console, 'info').mockImplementation(() => {}),
            warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
            error: vi.spyOn(console, 'error').mockImplementation(() => {}),
            debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
            groupCollapsed: vi.spyOn(console, 'groupCollapsed').mockImplementation(() => {}),
            groupEnd: vi.spyOn(console, 'groupEnd').mockImplementation(() => {}),
        };
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    levels.forEach(level => {
        describe(`Level: ${level}`, () => {
            it('Logs basic message and defaults grouped to false', async () => {
                const exporter = new ConsoleExporter();
                exporter.init({service: 'test'});

                await exporter.pushLog({...baseLog, level});

                expect(spies[level]).toHaveBeenCalledWith(`[${fixedDate.toISOString()}] [${level}] Test message`);
            });

            it('Logs with meta (trace_id, span_id, parent_span_id, ctx, global, data) and defaults grouped to false', async () => {
                const exporter = new ConsoleExporter({include: ['span_id', 'trace_id', 'ctx', 'global']});
                exporter.init({service: 'test'});

                await exporter.pushLog({
                    ...baseLog,
                    level,
                    trace_id: 'trace-123',
                    span_id: 'span-abc',
                    data: {extra: 'info'},
                });

                expect(spies[level]).toHaveBeenCalledWith(`[${fixedDate.toISOString()}] [${level}] Test message`, {
                    trace_id: 'trace-123',
                    span_id: 'span-abc',
                    ctx: {user: 'test'},
                    data: {extra: 'info'},
                    global: {service: 'test'},
                });
            });

            it('Logs basic message (grouped: false)', async () => {
                const exporter = new ConsoleExporter({grouped: false});
                exporter.init({service: 'test'});

                await exporter.pushLog({...baseLog, level});

                expect(spies[level]).toHaveBeenCalledWith(`[${fixedDate.toISOString()}] [${level}] Test message`);
            });

            it('Logs with meta (trace_id, span_id, ctx, global, data) with grouped false', async () => {
                const exporter = new ConsoleExporter({grouped: false, include: ['span_id', 'trace_id', 'ctx', 'global']});
                exporter.init({service: 'test'});

                await exporter.pushLog({
                    ...baseLog,
                    level,
                    trace_id: 'trace-123',
                    span_id: 'span-abc',
                    data: {extra: 'info'},
                });

                expect(spies[level]).toHaveBeenCalledWith(`[${fixedDate.toISOString()}] [${level}] Test message`, {
                    trace_id: 'trace-123',
                    span_id: 'span-abc',
                    ctx: {user: 'test'},
                    data: {extra: 'info'},
                    global: {service: 'test'},
                });
            });

            it('Logs ungrouped when grouped=true but no data', async () => {
                const exporter = new ConsoleExporter({grouped: true});
                exporter.init({service: 'test'});

                await exporter.pushLog({
                    ...baseLog,
                    level,
                    span_id: 'span-abc',
                });

                expect(spies[level]).toHaveBeenCalledWith(`[${fixedDate.toISOString()}] [${level}] Test message`);
                expect(spies.groupCollapsed).not.toHaveBeenCalled();
                expect(spies.groupEnd).not.toHaveBeenCalled();
            });

            it('Logs grouped when grouped=true with data', async () => {
                const exporter = new ConsoleExporter({grouped: true});
                exporter.init({service: 'test'});

                await exporter.pushLog({
                    ...baseLog,
                    level,
                    data: {hello: 'world'},
                });

                expect(spies.groupCollapsed).toHaveBeenCalledWith(`[${fixedDate.toISOString()}] [${level}] Test message`);
                expect(spies[level]).toHaveBeenCalledWith({
                    data: {hello: 'world'},
                });
                expect(spies.groupEnd).toHaveBeenCalled();
            });

            it('Logs ungrouped with custom format when no data', async () => {
                const exporter = new ConsoleExporter({
                    grouped: false,
                    format: customFormat,
                });
                exporter.init({service: 'test'});

                await exporter.pushLog({...baseLog, level});

                expect(spies[level]).toHaveBeenCalledWith(`CUSTOM[${level.toUpperCase()}]: ${baseLog.message}`);
            });

            it('Logs grouped with custom format', async () => {
                const exporter = new ConsoleExporter({
                    grouped: true,
                    format: customFormat,
                });
                exporter.init({service: 'test'});

                await exporter.pushLog({...baseLog, level, data: {hello: 'world'}});

                expect(spies.groupCollapsed).toHaveBeenCalledWith(`CUSTOM[${level.toUpperCase()}]: ${baseLog.message}`);
                expect(spies[level]).toHaveBeenCalledWith({
                    data: {hello: 'world'},
                });
                expect(spies.groupEnd).toHaveBeenCalled();
            });

            it('Does not log grouped if no data', async () => {
                const exporter = new ConsoleExporter({
                    grouped: true,
                    format: customFormat,
                });
                exporter.init({service: 'test'});

                await exporter.pushLog({...baseLog, level});

                expect(spies[level]).toHaveBeenCalledWith(`CUSTOM[${level.toUpperCase()}]: ${baseLog.message}`);
                expect(spies.groupCollapsed).not.toHaveBeenCalled();
                expect(spies.groupEnd).not.toHaveBeenCalled();
            });

            it('Omits specified keys from meta', async () => {
                const exporter = new ConsoleExporter({
                    grouped: false,
                    omit: ['ctx.user', 'global.service'],
                });
                exporter.init({service: 'test'});

                await exporter.pushLog({
                    ...baseLog,
                    level,
                    data: {extra: 'info'},
                });

                expect(spies[level]).toHaveBeenCalledWith(`[${fixedDate.toISOString()}] [${level}] Test message`, {
                    data: {extra: 'info'},
                });
            });
        });
    });

    it('flush() completes silently', async () => {
        const exporter = new ConsoleExporter();
        await expect(exporter.flush()).resolves.toBeUndefined();
        Object.values(spies).forEach(s => expect(s).not.toHaveBeenCalled());
    });
});
