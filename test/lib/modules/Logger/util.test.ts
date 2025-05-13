/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable class-methods-use-this */
/* eslint-disable max-classes-per-file */

import {describe, it, expect, vi} from 'vitest';
import {span, spanFn, Sym_TriFrostSpan} from '../../../../lib/modules/Logger/util';
import CONSTANTS from '../../../constants';

describe('Modules - Logger - Utils', () => {
    describe('@span', () => {
        it('Executes the method if no logger is present', () => {
            class Example {

				@span()
                run () {
                    return 'no-span';
                }
			
            }

            const inst = new Example();
            expect(inst.run()).toBe('no-span');
        });

        it('Wraps with ctx.logger.span if first arg has a logger', () => {
            const spy = vi.fn((_name, run) => run());

            class Example {

				@span()
                run (ctx: any) {
                    return 'traced';
                }
			
            }

            const inst = new Example();
            const result = inst.run({logger: {span: spy}});

            expect(result).toBe('traced');
            expect(spy).toHaveBeenCalledWith('run', expect.any(Function));
        });

        it('Wraps with this.logger.span if no ctx but this has logger', () => {
            const spy = vi.fn((_name, run) => run());

            class Example {

                logger = {span: spy};

				@span()
                run () {
                    return 'traced-this';
                }
			
            }

            const inst = new Example();
            const result = inst.run();

            expect(result).toBe('traced-this');
            expect(spy).toHaveBeenCalledWith('run', expect.any(Function));
        });

        it('Uses this.logger if ctx.logger is missing but arguments are available', () => {
            const spy = vi.fn((_name, run) => run());
        
            class Example {

                logger = {span: spy};

				@span('my-happy-path')
                run (_ctx:any) {
                    return 'traced-this';
                }
			
            }
        
            const inst = new Example();
            const result = inst.run({});
            expect(result).toBe('traced-this');
            expect(spy).toHaveBeenCalledWith('my-happy-path', expect.any(Function));
        });

        it('Respects custom span name', () => {
            const spy = vi.fn((_name, run) => run());

            class Example {

                logger = {span: spy};

				@span('custom-name')
                run () {
                    return 'named';
                }
			
            }

            const inst = new Example();
            const result = inst.run();

            expect(result).toBe('named');
            expect(spy).toHaveBeenCalledWith('custom-name', expect.any(Function));
        });

        it('Falls back to method name if provided name is a non/empty string', () => {
            for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                const spy = vi.fn((_name, run) => run());

                class Example {

                    logger = {span: spy};

                    @span(el as string)
                    run () {
                        return 'named';
                    }
                
                }

                const inst = new Example();
                const result = inst.run();

                expect(result).toBe('named');
                expect(spy).toHaveBeenCalledWith('run', expect.any(Function));
            }
        });

        it('Marks method as wrapped with Sym_TriFrostSpan', () => {
            class Example {

				@span()
                run () {}
			
            }

            const inst = new Example();
            expect(Reflect.get(inst.run, Sym_TriFrostSpan)).toBe(true);
        });

        it('Avoids re-decoration if already wrapped', () => {
            const spy = vi.fn((_name, run) => run());

            class Example {

				@span()
				@span('redundant') // <- intentionally double-wrapped
                run (p0?: unknown) {
                    return 'safe';
                }
			
            }

            const inst = new Example();
            const result = inst.run({logger: {span: spy}});

            expect(result).toBe('safe');
            expect(spy).toHaveBeenCalledWith('redundant', expect.any(Function)); // uses first decorator applied
        });
    });

    describe('spanFn', () => {
        it('Wraps and executes a function without span if no logger', async () => {
            const fn = vi.fn(() => 'ok');
            const wrapped = spanFn(fn);

            const result = wrapped();
            expect(result).toBe('ok');
            expect(fn).toHaveBeenCalledOnce();
        });

        it('Wraps and traces with context logger.span', async () => {
            const logspan = vi.fn((_name, run) => run());
            const fn = vi.fn(() => 'ok');

            const wrapped = spanFn('test-span', fn);
			
			/* @ts-ignore This is what we're testing */
            const result = wrapped({logger: {span: logspan}});

            expect(result).toBe('ok');
            expect(logspan).toHaveBeenCalledWith('test-span', expect.any(Function));
            expect(fn).toHaveBeenCalledOnce();
        });

        it('Resolves name from function name if not provided', async () => {
            const logspan = vi.fn((_name, run) => run());

            function doThing () {
                return 'yes'; 
            }
            const wrapped = spanFn(doThing);

			/* @ts-ignore This is what we're testing */
            const result = wrapped({logger: {span: logspan}});

            expect(result).toBe('yes');
            expect(logspan).toHaveBeenCalledWith('doThing', expect.any(Function));
        });

        it('Preserves this binding', async () => {
            const logspan = vi.fn((_name, run) => run());

            const obj = {
                value: 42,
                getValue () {
                    return this.value;
                },
            };

            const wrapped = spanFn('getValue', obj.getValue);

			/* @ts-ignore This is what we're testing */
            const result = wrapped.call(obj, {logger: {span: logspan}});
            expect(result).toBe(42);
        });

        it('Adds Sym_TriFrostSpan to wrapped function', () => {
            const wrapped = spanFn('named', () => {});
            expect(Reflect.get(wrapped, Sym_TriFrostSpan)).toBe(true);
        });

        it('Falls back to function name if non/empty string is passed as name', () => {
            const logspan = vi.fn((_name, run) => run());

            function namedFunction () {
                return 'fallback'; 
            }
            const wrapped = spanFn('  ', namedFunction);

            // @ts-ignore
            const result = wrapped({logger: {span: logspan}});

            expect(result).toBe('fallback');
            expect(logspan).toHaveBeenCalledWith('namedFunction', expect.any(Function));
        });

        it('Falls back to "anonymous" if name and function name are empty', () => {
            const logspan = vi.fn((_name, run) => run());

            const anonFn = Object.defineProperty(() => 'anon', 'name', {value: ''});
            const wrapped = spanFn('', anonFn);

			// @ts-ignore
            const result = wrapped({logger: {span: logspan}});

            expect(result).toBe('anon');
            expect(logspan).toHaveBeenCalledWith('anonymous', expect.any(Function));
        });

        it('Respects provided name even if function has a name', () => {
            const logspan = vi.fn((_name, run) => run());

            function namedThing () {
                return 'thing'; 
            }
            const wrapped = spanFn('explicit', namedThing);

			// @ts-ignore
            const result = wrapped({logger: {span: logspan}});

            expect(result).toBe('thing');
            expect(logspan).toHaveBeenCalledWith('explicit', expect.any(Function));
        });

        it('Does not double-wrap if already wrapped', () => {
            const fn = spanFn('once', () => 'done');
            const doubleWrapped = spanFn('twice', fn);

			// @ts-ignore
            const result = doubleWrapped({logger: {logspan: vi.fn((_n, r) => r())}});

            expect(result).toBe('done');
            expect(Reflect.get(doubleWrapped, Sym_TriFrostSpan)).toBe(true);
            expect(Reflect.get(fn, Sym_TriFrostSpan)).toBe(true);
            expect(doubleWrapped).toBe(fn); // it should return the original, not a new wrapper
        });

        it('Uses this.logger if no ctx.logger is present', () => {
            const logspan = vi.fn((_name, run) => run());

            const obj = {
                logger: {span: logspan},
                run: spanFn('from-this', () => 123),
            };

            const result = obj.run();
            expect(result).toBe(123);
            expect(logspan).toHaveBeenCalledWith('from-this', expect.any(Function));
        });

        it('Uses this.logger if ctx.logger is missing but arguments are available', () => {
            const spy = vi.fn((_name, run) => run());
        
            const obj = {
                logger: {span: spy},
                run: spanFn('test-fallback', (_ctx: any) => 'from-this-fallback'),
            };
        
            const result = obj.run({}); // ctx.logger is undefined here
            expect(result).toBe('from-this-fallback');
            expect(spy).toHaveBeenCalledWith('test-fallback', expect.any(Function));
        });

        it('Falls back to direct call if neither ctx.logger nor this.logger is present', () => {
            const fn = vi.fn(() => 999);
            const wrapped = spanFn('plain', fn);

			/* @ts-ignore No logger test */
            const result = wrapped({});
            expect(result).toBe(999);
            expect(fn).toHaveBeenCalledOnce();
        });
    });
});