import {describe, it, expect} from 'vitest';
import {toObject} from '../../../lib/utils/Query';

describe('toObject', () => {
    it('should throw when input is not a string', () => {
        for (const el of [null, undefined, 123, {}, [], true, false]) {
            expect(() => toObject(el as any)).toThrowError(/query\/toObject: Value must be a string/);
        }
    });

    it("should return empty object for empty string or '?'", () => {
        expect(toObject('')).toEqual({});
        expect(toObject('?')).toEqual({});
    });

    it('should parse simple key-value pairs', () => {
        expect(toObject('a=1&b=hello')).toEqual({a: 1, b: 'hello'});
    });

    it('should parse booleans correctly', () => {
        expect(toObject('x=true&y=false')).toEqual({x: true, y: false});
        expect(toObject('X=True&Y=FALSE')).toEqual({X: true, Y: false}); // case-insensitive
    });

    it('should parse null correctly', () => {
        expect(toObject('a=null&b=Null&c=NULL')).toEqual({a: null, b: null, c: null});
    });

    it('should parse numbers correctly', () => {
        expect(toObject('age=30&height=180.5')).toEqual({age: 30, height: 180.5});
    });

    it('should not parse numbers with leading zeros', () => {
        expect(toObject('zip=0123&phone=000999')).toEqual({
            zip: '0123',
            phone: '000999',
        });
    });

    it('should parse ISO dates correctly', () => {
        const result = toObject('d=2023-12-31T12:34:56Z');
        expect(result.d).toBeInstanceOf(Date);
        expect((result.d as Date).toISOString()).toBe('2023-12-31T12:34:56.000Z');
    });

    it('should fall back to string for invalid dates', () => {
        expect(toObject('d=2023-99-99T99:99:99Z')).toEqual({
            d: '2023-99-99T99:99:99Z',
        });
    });

    it('should handle multiple values for same key', () => {
        expect(toObject('hobby=reading&hobby=writing')).toEqual({
            hobby: ['reading', 'writing'],
        });
    });

    it('should trim values', () => {
        expect(toObject('a= 42 &b= true ')).toEqual({a: 42, b: true});
    });

    it('should decode percent-encoded values', () => {
        expect(toObject('name=Alice%20Smith&greet=hello%2Cworld')).toEqual({
            name: 'Alice Smith',
            greet: 'hello,world',
        });
    });

    it('should handle empty values', () => {
        expect(toObject('a=&b=')).toEqual({});
    });

    it('should mix multiple types', () => {
        const result = toObject('a=42&b=true&c=null&d=hello&e=2024-02-09T12:00:00Z');
        expect(result.a).toBe(42);
        expect(result.b).toBe(true);
        expect(result.c).toBe(null);
        expect(result.d).toBe('hello');
        expect(result.e).toBeInstanceOf(Date);
    });

    it('should support repeated mixed values for same key', () => {
        const result = toObject('x=1&x=true&x=hello&x=null');
        expect(result.x).toEqual([1, true, 'hello', null]);
    });

    it('should handle case-sensitive keys', () => {
        expect(toObject('Key=value1&key=value2')).toEqual({
            Key: 'value1',
            key: 'value2',
        });
    });

    it('should handle scientific notation', () => {
        expect(toObject('n=1.23e10')).toEqual({n: 1.23e10});
    });

    it("should ignore leading '?'", () => {
        expect(toObject('?foo=bar&baz=123')).toEqual({foo: 'bar', baz: 123});
    });
});
