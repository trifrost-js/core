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
                    omit: ['user', 'service'],
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
                    message: 'Test message',
                    trace_id: 'trace-123',
                    ctx: {user: '***'},
                    data: {extra: 'info'},
                    global: {service: '***'},
                }));
            });

            it('Scrambles deep values in ctx, data, and global using wildcards', async () => {
                const exporter = new JsonExporter({
                    omit: ['*.token'],
                });
            
                exporter.init({
                    service: 'api',
                    auth: {token: 'top-secret'},
                });
            
                await exporter.pushLog({
                    ...baseLog,
                    level,
                    ctx: {
                        session: {token: 'hidden-token'},
                    },
                    data: {
                        user: {token: 'exposed-token'},
                    },
                });
            
                expect(spies[level]).toHaveBeenCalledWith(JSON.stringify({
                    time: fixedDate.toISOString(),
                    level,
                    message: 'Test message',
                    ctx: {
                        session: {token: '***'},
                    },
                    data: {
                        user: {token: '***'},
                    },
                    global: {
                        service: 'api',
                        auth: {token: '***'},
                    },
                }));
            });

            it('Does not scramble any values if omit is empty array', async () => {
                const exporter = new JsonExporter({
                    omit: [],
                });
            
                exporter.init({
                    service: 'api',
                    token: '123abc',
                });
            
                await exporter.pushLog({
                    ...baseLog,
                    level,
                    ctx: {token: 'abc123'},
                    data: {token: 'xyz789'},
                });
            
                expect(spies[level]).toHaveBeenCalledWith(JSON.stringify({
                    time: fixedDate.toISOString(),
                    level,
                    message: 'Test message',
                    ctx: {token: 'abc123'},
                    data: {token: 'xyz789'},
                    global: {service: 'api', token: '123abc'},
                }));
            });

            it('Only scrambles keys that exactly match (case-sensitive)', async () => {
                const exporter = new JsonExporter({
                    omit: ['token'], // lowercase 'token'
                });
            
                exporter.init({Token: 'ShouldRemain'});
            
                await exporter.pushLog({
                    ...baseLog,
                    level,
                    ctx: {Token: 'ShouldRemain', token: 'ShouldScramble'},
                });
            
                expect(spies[level]).toHaveBeenCalledWith(JSON.stringify({
                    time: fixedDate.toISOString(),
                    level,
                    message: 'Test message',
                    ctx: {
                        Token: 'ShouldRemain',
                        token: '***',
                    },
                    global: {
                        Token: 'ShouldRemain',
                    },
                }));
            });

            it('Sink receives fully scrambled payload according to omit rules', async () => {
                const sink = vi.fn();
                const exporter = new JsonExporter({
                    omit: ['*.password', '*.token', 'secret'],
                    sink,
                });
            
                exporter.init({
                    service: 'auth-service',
                    secret: 'top-level-secret',
                    nested: {token: 'abc'},
                });
            
                await exporter.pushLog({
                    ...baseLog,
                    level,
                    trace_id: 'trace-42',
                    ctx: {
                        user: 'admin',
                        secret: 'ctx-secret',
                    },
                    data: {
                        account: {
                            password: 'p@ssw0rd',
                            token: 'xyz',
                        },
                    },
                });
            
                expect(sink).toHaveBeenCalledWith({
                    time: fixedDate.toISOString(),
                    level,
                    message: 'Test message',
                    trace_id: 'trace-42',
                    ctx: {
                        user: 'admin',
                        secret: '***',
                    },
                    data: {
                        account: {
                            password: '***',
                            token: '***',
                        },
                    },
                    global: {
                        service: 'auth-service',
                        secret: '***',
                        nested: {
                            token: '***',
                        },
                    },
                });
            });
        });
    });

    it('flush() completes silently', async () => {
        const exporter = new JsonExporter();
        await expect(exporter.flush()).resolves.toBeUndefined();
        Object.values(spies).forEach(s => expect(s).not.toHaveBeenCalled());
    });
});
