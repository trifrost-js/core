/* eslint-disable @typescript-eslint/no-unused-vars */

import {sleep} from '@valkyriestudios/utils/function';
import {isObject} from '@valkyriestudios/utils/object';
import {describe, it, expect, vi} from 'vitest';
import {cache, cacheFn, cacheSkip, cacheSkipped, Sym_TriFrostCached, Sym_TriFrostSkipCache} from '../../../../lib/modules/Cache/util';
import CONSTANTS from '../../../constants';

describe('Modules - Cache - Utils', () => {
    describe('@cache', () => {
        it('Returns original method result if no cache present anywhere', async () => {
            class Example {
                @cache('no-cache')
                async get() {
                    return 'raw';
                }
            }

            const inst = new Example();
            expect(await inst.get()).toBe('raw');
        });

        it('Uses ctx.cache if present and functional', async () => {
            const getFn = vi.fn(() => null);
            const setFn = vi.fn();

            class Example {
                @cache('ctx-key')
                async get(_ctx: any) {
                    return 'fetched';
                }
            }

            const inst = new Example();
            expect(await inst.get({cache: {get: getFn, set: setFn}})).toBe('fetched');
            expect(getFn).toHaveBeenCalledWith('ctx-key');
            expect(setFn).toHaveBeenCalledWith('ctx-key', 'fetched', undefined);
        });

        it('Uses this.cache if ctx is missing', async () => {
            const getFn = vi.fn(() => null);
            const setFn = vi.fn();

            class Example {
                cache = {get: getFn, set: setFn};

                @cache('this-key')
                async get() {
                    return 'hit';
                }
            }

            const inst = new Example();
            expect(await inst.get()).toBe('hit');
            expect(getFn).toHaveBeenCalledWith('this-key');
            expect(setFn).toHaveBeenCalledWith('this-key', 'hit', undefined);
        });

        it('Uses this.ctx.cache if ctx and this.cache are missing', async () => {
            const getFn = vi.fn(() => null);
            const setFn = vi.fn();

            class Example {
                ctx = {cache: {get: getFn, set: setFn}};

                @cache('deep-key')
                async get() {
                    return 'nested';
                }
            }

            const inst = new Example();
            expect(await inst.get()).toBe('nested');
            expect(getFn).toHaveBeenCalledWith('deep-key');
            expect(setFn).toHaveBeenCalledWith('deep-key', 'nested', undefined);
        });

        it('Returns cached value when cache.get returns non-null', async () => {
            const getFn = vi.fn(() => 'from-cache');
            const setFn = vi.fn();

            class Example {
                cache = {get: getFn, set: setFn};

                @cache('exists-key')
                async get() {
                    return 'should-not-run';
                }
            }

            const inst = new Example();
            expect(await inst.get()).toBe('from-cache');
            expect(setFn).not.toHaveBeenCalled();
        });

        it('Respects computed dynamic key function', async () => {
            const getFn = vi.fn(() => null);
            const setFn = vi.fn();
            const keyFn = vi.fn(ctx => `dynamic:${ctx.userId}`);

            class Example {
                @cache(keyFn)
                async get(ctx: any) {
                    return `result-for-${ctx.userId}`;
                }
            }

            const inst = new Example();
            expect(await inst.get({userId: 42, cache: {get: getFn, set: setFn}})).toBe('result-for-42');
            expect(keyFn).toHaveBeenCalled();
            expect(getFn).toHaveBeenCalledWith('dynamic:42');
            expect(setFn).toHaveBeenCalledWith('dynamic:42', 'result-for-42', undefined);
        });

        it('Returns raw result and skips caching if key resolution fails', async () => {
            const getFn = vi.fn();
            const setFn = vi.fn();

            class Example {
                cache = {get: getFn, set: setFn};

                @cache(undefined as any)
                async get() {
                    return 'fallback';
                }
            }

            const inst = new Example();
            expect(await inst.get()).toBe('fallback');
            expect(getFn).not.toHaveBeenCalled();
            expect(setFn).not.toHaveBeenCalled();
        });

        it('Skips caching if result is cacheSkip-wrapped', async () => {
            const getFn = vi.fn(() => null);
            const setFn = vi.fn();

            class Example {
                cache = {get: getFn, set: setFn};

                @cache('skip-key')
                async get() {
                    return cacheSkip('raw-value');
                }
            }

            const inst = new Example();
            expect(await inst.get()).toBe('raw-value');
            expect(setFn).not.toHaveBeenCalled();
        });

        it('Caches null as a valid value', async () => {
            const getFn = vi.fn(() => null);
            const setFn = vi.fn();

            class Example {
                cache = {get: getFn, set: setFn};

                @cache('null-key')
                async get() {
                    return null;
                }
            }

            const inst = new Example();
            expect(await inst.get()).toBe(null);
            expect(setFn).toHaveBeenCalledWith('null-key', null, undefined);
        });

        it('Caches result with TTL if provided', async () => {
            const getFn = vi.fn(() => null);
            const setFn = vi.fn();

            class Example {
                cache = {get: getFn, set: setFn};

                @cache('ttl-key', {ttl: 180})
                async get() {
                    return 'with-ttl';
                }
            }

            const inst = new Example();
            expect(await inst.get()).toBe('with-ttl');
            expect(setFn).toHaveBeenCalledWith('ttl-key', 'with-ttl', {ttl: 180});
        });

        it('Preserves this binding', async () => {
            const getFn = vi.fn(() => null);
            const setFn = vi.fn();

            class Example {
                value = 9;

                cache = {get: getFn, set: setFn};

                @cache('bound-key')
                async get() {
                    return this.value;
                }
            }

            const inst = new Example();
            expect(await inst.get()).toBe(9);
        });

        it('Supports async context methods with delayed values', async () => {
            const getFn = vi.fn(() => null);
            const setFn = vi.fn();

            class Example {
                cache = {get: getFn, set: setFn};

                @cache('delay-key')
                async get() {
                    await sleep(10);
                    return 'async-value';
                }
            }

            const inst = new Example();
            expect(await inst.get()).toBe('async-value');
            expect(setFn).toHaveBeenCalledWith('delay-key', 'async-value', undefined);
        });

        it('Works with functions taking multiple arguments (first is ctx)', async () => {
            const getFn = vi.fn(() => null);
            const setFn = vi.fn();

            class Example {
                @cache('multi-arg')
                async add(_ctx: any, a: number, b: number) {
                    return a + b;
                }
            }

            const inst = new Example();
            expect(await inst.add({cache: {get: getFn, set: setFn}}, 3, 4)).toBe(7);
            expect(getFn).toHaveBeenCalledWith('multi-arg');
            expect(setFn).toHaveBeenCalledWith('multi-arg', 7, undefined);
        });

        it('Handles undefined return as valid result (and does cache)', async () => {
            const getFn = vi.fn(() => null);
            const setFn = vi.fn();

            class Example {
                cache = {get: getFn, set: setFn};

                @cache('undef-key')
                async get() {
                    return undefined;
                }
            }

            const inst = new Example();
            expect(await inst.get()).toBe(undefined);
            expect(setFn).toHaveBeenCalledWith('undef-key', undefined, undefined);
        });

        it('Marks method as wrapped with Sym_TriFrostCached', () => {
            class Example {
                @cache('mark')
                async fetch() {}
            }

            const inst = new Example();
            expect(Reflect.get(inst.fetch, Sym_TriFrostCached)).toBe(true);
        });

        it('Skips re-decoration if already wrapped', async () => {
            const getFn = vi.fn(() => null);
            const setFn = vi.fn();

            class Example {
                cache = {get: getFn, set: setFn};

                @cache('redundant')
                @cache('first')
                async fetch(_ctx?: unknown) {
                    return 'safe';
                }
            }

            const inst = new Example();
            const result = await inst.fetch();

            expect(result).toBe('safe');
            expect(getFn).toHaveBeenCalledWith('first');
            expect(Reflect.get(inst.fetch, Sym_TriFrostCached)).toBe(true);
            expect(getFn).toHaveBeenCalledTimes(1);
            expect(setFn).toHaveBeenCalledTimes(1);
        });
    });

    describe('cacheSkip', () => {
        it('Preserves original value', () => {
            const obj = {user: 1};
            const result = cacheSkip(obj);
            /* @ts-expect-error The return type of cacheSkip is ON PURPOSE the type of the original value */
            expect(result.value).toBe(obj);
        });

        it('Allows passing primitives', () => {
            for (const el of [null, undefined, 1, true, false, 'hello', 0.999]) {
                /* @ts-expect-error The return type of cacheSkip is ON PURPOSE the type of the original value */
                expect(cacheSkip(el).value).toEqual(el);
            }
        });

        it('Attaches Sym_TriFrostSkipCache to result', () => {
            const result = cacheSkip(123);
            /* @ts-expect-error The return type of cacheSkip is ON PURPOSE the type of the original value */
            expect(Reflect.get(result, Sym_TriFrostSkipCache)).toBe(true);
        });

        it('Result remains an object and serializable', () => {
            const result = cacheSkip({x: 1});
            expect(isObject(result)).toBe(true);
            expect(JSON.stringify(result)).toEqual('{"value":{"x":1}}');
        });
    });

    describe('cacheSkipped', () => {
        it('Returns true for value wrapped via cacheSkip', () => {
            const skipped = cacheSkip('hello');
            expect(cacheSkipped(skipped)).toBe(true);
        });

        it('Returns false for regular objects', () => {
            expect(cacheSkipped({value: 'hello'})).toBe(false);
            expect(cacheSkipped({})).toBe(false);
            expect(cacheSkipped(null)).toBe(false);
            expect(cacheSkipped(undefined)).toBe(false);
        });

        it('Returns false for non/empty-object values', () => {
            for (const el of CONSTANTS.NOT_OBJECT_WITH_EMPTY) {
                expect(cacheSkipped(el)).toBe(false);
            }
        });

        it('Detects the actual Symbol even if reassigned internally', () => {
            const result = {value: 'spoofed'};
            Reflect.set(result, Sym_TriFrostSkipCache, true);
            expect(cacheSkipped(result)).toBe(true);
        });

        it('Does not falsely detect when symbol value is falsy', () => {
            const spoofed = {value: 'nope'};
            Reflect.set(spoofed, Sym_TriFrostSkipCache, false);
            expect(cacheSkipped(spoofed)).toBe(false);
        });
    });

    describe('cacheFn', () => {
        it('Returns original function result if no cache present anywhere', async () => {
            const fn = vi.fn(() => 'raw');
            const wrapped = cacheFn('no-cache')(fn);
            expect(await wrapped({})).toBe('raw');
            expect(fn).toHaveBeenCalledOnce();
        });

        it('Uses ctx.cache if available', async () => {
            const getFn = vi.fn(() => null);
            const setFn = vi.fn();
            const fn = vi.fn(() => 'ctx-value');

            const wrapped = cacheFn('ctx-key')(fn);
            expect(await wrapped({cache: {get: getFn, set: setFn}})).toBe('ctx-value');
            expect(getFn).toHaveBeenCalledWith('ctx-key');
            expect(setFn).toHaveBeenCalledWith('ctx-key', 'ctx-value', undefined);
        });

        it('Uses this.cache if ctx is missing', async () => {
            const getFn = vi.fn(() => null);
            const setFn = vi.fn();
            const fn = vi.fn(() => 'this-cache');

            const wrapped = cacheFn('this-key')(fn);
            expect(await wrapped.call({cache: {get: getFn, set: setFn}}, {})).toBe('this-cache');
            expect(getFn).toHaveBeenCalledWith('this-key');
            expect(setFn).toHaveBeenCalledWith('this-key', 'this-cache', undefined);
        });

        it('Uses this.ctx.cache if ctx and this.cache are missing', async () => {
            const getFn = vi.fn(() => null);
            const setFn = vi.fn();
            const fn = vi.fn(() => 'deep-cache');

            const wrapped = cacheFn('deep-key')(fn);
            expect(await wrapped.call({ctx: {cache: {get: getFn, set: setFn}}}, {})).toBe('deep-cache');
            expect(getFn).toHaveBeenCalledWith('deep-key');
            expect(setFn).toHaveBeenCalledWith('deep-key', 'deep-cache', undefined);
        });

        it('Returns cached value if cache hit', async () => {
            const getFn = vi.fn(() => 'cached!');
            const setFn = vi.fn();
            const fn = vi.fn(() => 'nope');

            const wrapped = cacheFn('hit')(fn);
            expect(await wrapped({cache: {get: getFn, set: setFn}})).toBe('cached!');
            expect(fn).not.toHaveBeenCalled();
            expect(setFn).not.toHaveBeenCalled();
        });

        it('Caches result with TTL if provided', async () => {
            const getFn = vi.fn(() => null);
            const setFn = vi.fn();
            const fn = vi.fn(() => 'ttl');

            const wrapped = cacheFn('ttl-key', {ttl: 300})(fn);
            expect(await wrapped({cache: {get: getFn, set: setFn}})).toBe('ttl');
            expect(setFn).toHaveBeenCalledWith('ttl-key', 'ttl', {ttl: 300});
        });

        it('Skips caching if result is wrapped in cacheSkip', async () => {
            const getFn = vi.fn(() => null);
            const setFn = vi.fn();
            const fn = vi.fn(() => cacheSkip('dont-store'));

            const wrapped = cacheFn('skip-key')(fn);
            expect(await wrapped({cache: {get: getFn, set: setFn}})).toBe('dont-store');
            expect(setFn).not.toHaveBeenCalled();
        });

        it('Caches null as valid value', async () => {
            const getFn = vi.fn(() => null);
            const setFn = vi.fn();
            const fn = vi.fn(() => null);

            const wrapped = cacheFn('null-key')(fn);
            expect(await wrapped({cache: {get: getFn, set: setFn}})).toBe(null);
            expect(setFn).toHaveBeenCalledWith('null-key', null, undefined);
        });

        it('Caches undefined as valid value', async () => {
            const getFn = vi.fn(() => null);
            const setFn = vi.fn();
            const fn = vi.fn(() => undefined);

            const wrapped = cacheFn('undef-key')(fn);
            expect(await wrapped({cache: {get: getFn, set: setFn}})).toBe(undefined);
            expect(setFn).toHaveBeenCalledWith('undef-key', undefined, undefined);
        });

        it('Supports dynamic key via function', async () => {
            const getFn = vi.fn(() => null);
            const setFn = vi.fn();
            const fn = vi.fn(() => 'by-user');

            const keyFn = vi.fn(ctx => `user:${ctx.id}`);
            const wrapped = cacheFn(keyFn)(fn);
            expect(await wrapped({id: 7, cache: {get: getFn, set: setFn}})).toBe('by-user');
            expect(getFn).toHaveBeenCalledWith('user:7');
            expect(setFn).toHaveBeenCalledWith('user:7', 'by-user', undefined);
        });

        it('Skips caching if dynamic key resolution fails', async () => {
            const getFn = vi.fn();
            const setFn = vi.fn();
            const fn = vi.fn(() => 'fallback');

            const badKey = () => null;
            const wrapped = cacheFn(badKey as any)(fn);
            expect(await wrapped({cache: {get: getFn, set: setFn}})).toBe('fallback');
            expect(getFn).not.toHaveBeenCalled();
            expect(setFn).not.toHaveBeenCalled();
        });

        it('Preserves `this` binding inside fn', async () => {
            const getFn = vi.fn(() => null);
            const setFn = vi.fn();

            const obj = {
                value: 123,
                cache: {get: getFn, set: setFn},
                fn() {
                    return this.value;
                },
            };

            const wrapped = cacheFn('bound-key')(obj.fn);
            expect(await wrapped.call(obj, {})).toBe(123);
        });

        it('Works with multiple args', async () => {
            const getFn = vi.fn(() => null);
            const setFn = vi.fn();
            const fn = vi.fn((_ctx, a, b) => a + b);

            const wrapped = cacheFn('multi')(fn);
            expect(await wrapped({cache: {get: getFn, set: setFn}}, 2, 3)).toBe(5);
            expect(setFn).toHaveBeenCalledWith('multi', 5, undefined);
        });

        it('Works with async fn + await', async () => {
            const getFn = vi.fn(() => null);
            const setFn = vi.fn();

            const fn = vi.fn(async () => {
                await new Promise(r => setTimeout(r, 5));
                return 'delayed';
            });

            const wrapped = cacheFn('delayed-key')(fn);
            expect(await wrapped({cache: {get: getFn, set: setFn}})).toBe('delayed');
            expect(setFn).toHaveBeenCalledWith('delayed-key', 'delayed', undefined);
        });

        it('Returns from original function if cache methods are invalid', async () => {
            const getFn = vi.fn(() => null);
            const setFn = vi.fn();

            for (const el of CONSTANTS.NOT_FUNCTION) {
                const fn = vi.fn(() => 'fallback');
                const wrapped = cacheFn('invalid')(fn);
                expect(await wrapped({cache: {get: el, set: setFn}})).toBe('fallback');
                expect(fn).toHaveBeenCalledOnce();
            }

            for (const el of CONSTANTS.NOT_FUNCTION) {
                const fn = vi.fn(() => 'fallback');
                const wrapped = cacheFn('invalid')(fn);
                expect(await wrapped({cache: {get: getFn, set: el}})).toBe('fallback');
                expect(fn).toHaveBeenCalledOnce();
            }
        });

        it('Returns raw result and skips caching if key is neither string nor function', async () => {
            const getFn = vi.fn();
            const setFn = vi.fn();
            const fn = vi.fn(() => 'bypass');

            /* @ts-expect-error intentionally passing invalid key type to trigger null branch */
            const wrapped = cacheFn(12345)(fn);

            expect(await wrapped({cache: {get: getFn, set: setFn}})).toBe('bypass');
            expect(fn).toHaveBeenCalledOnce();
            expect(getFn).not.toHaveBeenCalled();
            expect(setFn).not.toHaveBeenCalled();
        });

        it('Skips caching and runs original function when called with no arguments', async () => {
            const getFn = vi.fn();
            const setFn = vi.fn();
            const fn = vi.fn(() => 'no-args');

            const wrapped = cacheFn('no-args-key')(fn);

            // Bind a context with cache, but call with no arguments
            expect(await wrapped.call({cache: {get: getFn, set: setFn}})).toBe('no-args');
            expect(fn).toHaveBeenCalledOnce();
            expect(getFn).toHaveBeenCalledWith('no-args-key');
            expect(setFn).toHaveBeenCalledWith('no-args-key', 'no-args', undefined);
        });

        it('Marks function as wrapped with Sym_TriFrostCached', () => {
            const fn = () => {};
            const wrapped = cacheFn('marker')(fn);
            expect(Reflect.get(wrapped, Sym_TriFrostCached)).toBe(true);
        });

        it('Skips re-wrapping if already wrapped', async () => {
            const getFn = vi.fn(() => null);
            const setFn = vi.fn();

            const inner = cacheFn('once')(() => 'first');
            const double = cacheFn('twice')(inner);

            const ctx = {cache: {get: getFn, set: setFn}};
            const result = await double(ctx);

            expect(result).toBe('first');
            expect(double).toBe(inner);
            expect(Reflect.get(double, Sym_TriFrostCached)).toBe(true);
            expect(getFn).toHaveBeenCalledTimes(1);
            expect(setFn).toHaveBeenCalledTimes(1);
        });
    });
});
