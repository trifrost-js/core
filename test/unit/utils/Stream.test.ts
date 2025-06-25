import {describe, it, expect} from 'vitest';
import {verifyFileStream} from '../../../lib/utils/Stream';

describe('Utils - Stream', () => {
    describe('verifyFileStream', () => {
        it('accepts a ReadableStream', () => {
            const stream = new ReadableStream();
            expect(() => verifyFileStream(stream)).not.toThrow();
        });

        it('accepts a Uint8Array', () => {
            const buf = new Uint8Array([1, 2, 3]);
            expect(() => verifyFileStream(buf)).not.toThrow();
        });

        it('accepts an ArrayBuffer', () => {
            const buffer = new ArrayBuffer(10);
            expect(() => verifyFileStream(buffer)).not.toThrow();
        });

        it('accepts a Blob if available', () => {
            if (typeof Blob !== 'undefined') {
                const blob = new Blob(['hello'], {type: 'text/plain'});
                expect(() => verifyFileStream(blob)).not.toThrow();
            }
        });

        it('accepts a string', () => {
            expect(() => verifyFileStream('hello world')).not.toThrow();
        });

        it('throws for null', () => {
            expect(() => verifyFileStream(null)).toThrowError(/Unsupported stream type/i);
        });

        it('throws for undefined', () => {
            expect(() => verifyFileStream(undefined)).toThrowError(/Unsupported stream type/i);
        });

        it('throws for number', () => {
            expect(() => verifyFileStream(123)).toThrowError(/Unsupported stream type/i);
        });

        it('throws for object', () => {
            expect(() => verifyFileStream({})).toThrowError(/Unsupported stream type/i);
        });

        it('throws for function', () => {
            expect(() => verifyFileStream(() => {})).toThrowError(/Unsupported stream type/i);
        });

        it('throws for Symbol', () => {
            expect(() => verifyFileStream(Symbol('stream'))).toThrowError(/Unsupported stream type/i);
        });

        it('throws with correct type signature in message', () => {
            try {
                verifyFileStream(123);
            } catch (err) {
                expect(err).toBeInstanceOf(Error);
                expect((err as Error).message).toMatch(/^\s*verifyFileStream: Unsupported stream type \(\[object Number\]\)/);
            }
        });
    });
});
