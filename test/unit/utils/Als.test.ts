import {describe, it, expect} from 'vitest';
import {activateCtx, ctx} from '../../../lib/utils/Als';

describe('Utils - Als', () => {
    const makeContext = (id: string) => ({id}) as any;

    it('Should return undefined when no context is active', () => {
        expect(ctx()).toBeUndefined();
    });

    it('Should return the bound context within activateCtx scope', async () => {
        const fakeCtx = makeContext('test1');

        await activateCtx('uid1', fakeCtx, async () => {
            expect(ctx()).toBe(fakeCtx);
        });

        // Outside the scope, it should be undefined
        expect(ctx()).toBeUndefined();
    });

    it('Should propagate context through async calls', async () => {
        const fakeCtx = makeContext('test2');

        await activateCtx('uid2', fakeCtx, async () => {
            await new Promise<void>(resolve =>
                setTimeout(() => {
                    expect(ctx()).toBe(fakeCtx);
                    resolve();
                }, 10),
            );
        });
    });

    it('Should keep contexts isolated for concurrent calls', async () => {
        const ctxA = makeContext('A');
        const ctxB = makeContext('B');

        let seenA: any;
        let seenB: any;

        await Promise.all([
            activateCtx('uidA', ctxA, async () => {
                await new Promise<void>(resolve =>
                    setTimeout(() => {
                        seenA = ctx();
                        resolve();
                    }, 20),
                );
            }),
            activateCtx('uidB', ctxB, async () => {
                await new Promise<void>(resolve =>
                    setTimeout(() => {
                        seenB = ctx();
                        resolve();
                    }, 10),
                );
            }),
        ]);

        expect(seenA).toBe(ctxA);
        expect(seenB).toBe(ctxB);
    });

    it('Should clean up after execution', async () => {
        const fakeCtx = makeContext('cleanup');

        await activateCtx('uid3', fakeCtx, async () => {
            expect(ctx()).toBe(fakeCtx);
        });

        expect(ctx()).toBeUndefined();
    });

    it('Should allow nested activateCtx calls without leaking outer context', async () => {
        const outerCtx = makeContext('outer');
        const innerCtx = makeContext('inner');

        let seenInsideInner: any;
        let seenBackInOuter: any;

        await activateCtx('outerUID', outerCtx, async () => {
            expect(ctx()).toBe(outerCtx);

            await activateCtx('innerUID', innerCtx, async () => {
                seenInsideInner = ctx();
                expect(seenInsideInner).toBe(innerCtx);
            });

            // After inner finishes, we should be back to the outer context
            seenBackInOuter = ctx();
            expect(seenBackInOuter).toBe(outerCtx);
        });

        // Outside all contexts, should be undefined
        expect(ctx()).toBeUndefined();
    });
});
