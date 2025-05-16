/* eslint-disable max-lines */
/* eslint-disable prefer-template,no-bitwise */

import {describe, it, expect, vi} from 'vitest';
import {parseBody} from '../../../../lib/utils/BodyParser/Uint8Array';
import {MockContext} from '../../../MockContext';
import CONSTANTS from '../../../constants';

const encoder = new TextEncoder();

function toUtf16LE (str:string):Uint8Array {
    const arr = new Uint16Array(str.length);
    for (let i = 0; i < str.length; i++) arr[i] = str.charCodeAt(i);
    return new Uint8Array(arr.buffer);
}

function toUtf16BE (str:string):Uint8Array {
    const buf = new Uint8Array(str.length * 2);
    for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i);
        buf[i * 2] = code >> 8;
        buf[(i * 2) + 1] = code & 0xFF;
    }
    return buf;
}

function createMultipart (
    boundary:string,
    parts:{name:string, value:string|Uint8Array, filename?:string, contentType?:string}[]
):Uint8Array {
    const delimiter = `--${boundary}`;
    const footer = `--${boundary}--\r\n`;
    const body: Uint8Array[] = [];

    for (const part of parts) {
        let headers = `Content-Disposition: form-data; name="${part.name}"`;
        if (part.filename) headers += `; filename="${part.filename}"`;
        if (part.contentType) headers += `\r\nContent-Type: ${part.contentType}`;

        const header = encoder.encode(`${delimiter}\r\n${headers}\r\n\r\n`);
        const content = typeof part.value === 'string' ? encoder.encode(part.value) : part.value;
        const tail = encoder.encode('\r\n');

        body.push(header, content, tail);
    }

    body.push(encoder.encode(footer));
    /* @ts-ignore */
    return new Uint8Array(body.reduce((acc, curr) => acc.concat(Array.from(curr)), []));
}

describe('Utils - BodyParser - Uint8Array', () => {
    it('Returns empty object on non-Uint8Array input', async () => {
        for (const el of CONSTANTS.NOT_ARRAY) {
            const ctx = new MockContext();
            const res = await parseBody(ctx, el as unknown as Uint8Array);
            expect(res).toEqual({});
        }
    });

    it('Skips parsing if content-type is not set', async () => {
        const ctx = new MockContext({headers: {}});
        const buf = encoder.encode(JSON.stringify({foo: 'bar'}));
        const res = await parseBody(ctx, buf);
        expect(res.raw).toEqual(buf);
    });

    it('Skips parsing if content-type is invalid', async () => {
        const ctx = new MockContext({headers: {'content-type': 'foo/bar'}});
        const buf = encoder.encode(JSON.stringify({foo: 'bar'}));
        const res = await parseBody(ctx, buf);
        expect(res.raw).toEqual(buf);
    });

    it('Returns raw Uint8Array on unknown content-type', async () => {
        const ctx = new MockContext({headers:{'content-type': 'application/unknown'}});
        const buf = encoder.encode('raw data');
        const res = await parseBody(ctx, buf);
        expect(res.raw).toEqual(buf);
    });

    describe('application/json', () => {
        it('Parses valid JSON Uint8Array', async () => {
            const ctx = new MockContext({headers: {'content-type': 'application/json'}});
            const buf = encoder.encode(JSON.stringify({foo: 'bar'}));
            const res = await parseBody(ctx, buf);
            expect(res).toEqual({foo: 'bar'});
        });
    
        it('Returns empty object on malformed JSON', async () => {
            const ctx = new MockContext({headers: {'content-type': 'application/json'}});
            ctx.logger.debug = vi.fn();
            const buf = encoder.encode('{bad json');
            const res = await parseBody(ctx, buf);
            expect(res).toEqual({});
            expect(ctx.logger.debug).toHaveBeenCalledWith('parseBody: Failed to parse', {
                type: 'application/json',
                msg: 'Expected property name or \'}\' in JSON at position 1 (line 1 column 2)',
            });
        });
    
        it('Handles content-type with charset', async () => {
            const ctx = new MockContext({headers: {'content-type': 'application/json; charset=utf-8'}});
            const buf = encoder.encode(JSON.stringify({foo: 'bar'}));
            const res = await parseBody(ctx, buf);
            expect(res).toEqual({foo: 'bar'});
        });

        it('Normalizes charset case', async () => {
            const ctx = new MockContext({headers: {'content-type': 'application/json; charset=UTF-8'}});
            const buf = encoder.encode(JSON.stringify({foo: 'bar'}));
            const res = await parseBody(ctx, buf);
            expect(res).toEqual({foo: 'bar'});
        });

        it('Skips unsupported charset', async () => {
            const ctx = new MockContext({headers: {'content-type': 'application/json; charset=foo-bar'}});
            ctx.logger.debug = vi.fn();
            const buf = encoder.encode('ignored');
            const res = await parseBody(ctx, buf);
            expect(res).toEqual({});
            expect(ctx.logger.debug).toHaveBeenCalledWith('parseBody: Failed to parse', {
                type: 'application/json',
                msg: 'The "foo-bar" encoding is not supported',
            });
        });

        it('Parses UTF-16LE encoded correctly', async () => {
            const ctx = new MockContext({headers: {'content-type': 'application/json; charset=utf-16le'}});
            const res = await parseBody(ctx, toUtf16LE('{"foo":"bar"}'));
            expect(res).toEqual({foo: 'bar'});
        });

        it('Parses UTF-16BE encoded JSON correctly', async () => {
            const ctx = new MockContext({headers: {'content-type': 'application/json; charset=utf-16be'}});
            const res = await parseBody(ctx, toUtf16BE('{"foo":"bar"}'));
            expect(res).toEqual({foo: 'bar'});
        });

        it('Parses UTF-8 BOM-prefixed JSON correctly', async () => {
            const ctx = new MockContext({headers: {'content-type': 'application/json'}});
            const json = '{"foo":"bar"}';
            const res = await parseBody(ctx, new Uint8Array([0xEF, 0xBB, 0xBF, ...encoder.encode(json)]));
            expect(res).toEqual({foo: 'bar'});
        });

        it('Returns {} on broken decode', async () => {
            const ctx = new MockContext({headers: {'content-type': 'application/json;'}});
            ctx.logger.debug = vi.fn();
            const broken = new Uint8Array([0xC3, 0x28]);
            const res = await parseBody(ctx, broken);
            expect(res).toEqual({});
            expect(ctx.logger.debug).toHaveBeenCalledWith('parseBody: Failed to parse', {
                type: 'application/json',
                msg: 'The encoded data was not valid for encoding utf-8',
            });
        });
    });

    describe('text/json', () => {
        it('Parses valid JSON Uint8Array', async () => {
            const ctx = new MockContext({headers: {'content-type': 'text/json'}});
            const buf = encoder.encode(JSON.stringify({foo: 'bar'}));
            const res = await parseBody(ctx, buf);
            expect(res).toEqual({foo: 'bar'});
        });
    
        it('Returns empty object on malformed JSON', async () => {
            const ctx = new MockContext({headers: {'content-type': 'text/json'}});
            ctx.logger.debug = vi.fn();
            const buf = encoder.encode('{bad json');
            const res = await parseBody(ctx, buf);
            expect(res).toEqual({});
            expect(ctx.logger.debug).toHaveBeenCalledWith('parseBody: Failed to parse', {
                type: 'text/json',
                msg: 'Expected property name or \'}\' in JSON at position 1 (line 1 column 2)',
            });
        });
    
        it('Handles content-type with charset', async () => {
            const ctx = new MockContext({headers: {'content-type': 'text/json; charset=utf-8'}});
            const buf = encoder.encode(JSON.stringify({foo: 'bar'}));
            const res = await parseBody(ctx, buf);
            expect(res).toEqual({foo: 'bar'});
        });

        it('Normalizes charset case', async () => {
            const ctx = new MockContext({headers: {'content-type': 'text/json; charset=UTF-8'}});
            const buf = encoder.encode(JSON.stringify({foo: 'bar'}));
            const res = await parseBody(ctx, buf);
            expect(res).toEqual({foo: 'bar'});
        });

        it('Skips unsupported charset', async () => {
            const ctx = new MockContext({headers: {'content-type': 'text/json; charset=foo-bar'}});
            ctx.logger.debug = vi.fn();
            const buf = encoder.encode('ignored');
            const res = await parseBody(ctx, buf);
            expect(res).toEqual({});
            expect(ctx.logger.debug).toHaveBeenCalledWith('parseBody: Failed to parse', {
                type: 'text/json',
                msg: 'The "foo-bar" encoding is not supported',
            });
        });

        it('Parses UTF-16LE encoded correctly', async () => {
            const ctx = new MockContext({headers: {'content-type': 'text/json; charset=utf-16le'}});
            const res = await parseBody(ctx, toUtf16LE('{"foo":"bar"}'));
            expect(res).toEqual({foo: 'bar'});
        });

        it('Parses UTF-16BE encoded JSON correctly', async () => {
            const ctx = new MockContext({headers: {'content-type': 'text/json; charset=utf-16be'}});
            const res = await parseBody(ctx, toUtf16BE('{"foo":"bar"}'));
            expect(res).toEqual({foo: 'bar'});
        });

        it('Parses UTF-8 BOM-prefixed JSON correctly', async () => {
            const ctx = new MockContext({headers: {'content-type': 'text/json'}});
            const json = '{"foo":"bar"}';
            const res = await parseBody(ctx, new Uint8Array([0xEF, 0xBB, 0xBF, ...encoder.encode(json)]));
            expect(res).toEqual({foo: 'bar'});
        });

        it('Returns {} on broken decode', async () => {
            const ctx = new MockContext({headers: {'content-type': 'text/json;'}});
            ctx.logger.debug = vi.fn();
            const broken = new Uint8Array([0xC3, 0x28]);
            const res = await parseBody(ctx, broken);
            expect(res).toEqual({});
            expect(ctx.logger.debug).toHaveBeenCalledWith('parseBody: Failed to parse', {
                type: 'text/json',
                msg: 'The encoded data was not valid for encoding utf-8',
            });
        });
    });

    describe('application/ld+json', () => {
        it('Parses valid JSON Uint8Array', async () => {
            const ctx = new MockContext({headers: {'content-type': 'application/ld+json'}});
            const buf = encoder.encode(JSON.stringify({foo: 'bar'}));
            const res = await parseBody(ctx, buf);
            expect(res).toEqual({foo: 'bar'});
        });
    
        it('Returns empty object on malformed JSON', async () => {
            const ctx = new MockContext({headers: {'content-type': 'application/ld+json'}});
            ctx.logger.debug = vi.fn();
            const buf = encoder.encode('{bad json');
            const res = await parseBody(ctx, buf);
            expect(res).toEqual({});
            expect(ctx.logger.debug).toHaveBeenCalledWith('parseBody: Failed to parse', {
                type: 'application/ld+json',
                msg: 'Expected property name or \'}\' in JSON at position 1 (line 1 column 2)',
            });
        });
    
        it('Handles content-type with charset', async () => {
            const ctx = new MockContext({headers: {'content-type': 'application/ld+json; charset=utf-8'}});
            const buf = encoder.encode(JSON.stringify({foo: 'bar'}));
            const res = await parseBody(ctx, buf);
            expect(res).toEqual({foo: 'bar'});
        });

        it('Normalizes charset case', async () => {
            const ctx = new MockContext({headers: {'content-type': 'application/ld+json; charset=UTF-8'}});
            const buf = encoder.encode(JSON.stringify({foo: 'bar'}));
            const res = await parseBody(ctx, buf);
            expect(res).toEqual({foo: 'bar'});
        });

        it('Skips unsupported charset', async () => {
            const ctx = new MockContext({headers: {'content-type': 'application/ld+json; charset=foo-bar'}});
            ctx.logger.debug = vi.fn();
            const buf = encoder.encode('ignored');
            const res = await parseBody(ctx, buf);
            expect(res).toEqual({});
            expect(ctx.logger.debug).toHaveBeenCalledWith('parseBody: Failed to parse', {
                type: 'application/ld+json',
                msg: 'The "foo-bar" encoding is not supported',
            });
        });

        it('Parses UTF-16LE encoded correctly', async () => {
            const ctx = new MockContext({headers: {'content-type': 'application/ld+json; charset=utf-16le'}});
            const res = await parseBody(ctx, toUtf16LE('{"foo":"bar"}'));
            expect(res).toEqual({foo: 'bar'});
        });

        it('Parses UTF-16BE encoded JSON correctly', async () => {
            const ctx = new MockContext({headers: {'content-type': 'application/ld+json; charset=utf-16be'}});
            const res = await parseBody(ctx, toUtf16BE('{"foo":"bar"}'));
            expect(res).toEqual({foo: 'bar'});
        });

        it('Parses UTF-8 BOM-prefixed JSON correctly', async () => {
            const ctx = new MockContext({headers: {'content-type': 'application/ld+json'}});
            const json = '{"foo":"bar"}';
            const res = await parseBody(ctx, new Uint8Array([0xEF, 0xBB, 0xBF, ...encoder.encode(json)]));
            expect(res).toEqual({foo: 'bar'});
        });

        it('Returns {} on broken decode', async () => {
            const ctx = new MockContext({headers: {'content-type': 'application/ld+json;'}});
            ctx.logger.debug = vi.fn();
            const broken = new Uint8Array([0xC3, 0x28]);
            const res = await parseBody(ctx, broken);
            expect(res).toEqual({});
            expect(ctx.logger.debug).toHaveBeenCalledWith('parseBody: Failed to parse', {
                type: 'application/ld+json',
                msg: 'The encoded data was not valid for encoding utf-8',
            });
        });
    });

    describe('application/x-ndjson', () => {
        it('Parses NDJSON as array of objects', async () => {
            const ctx = new MockContext({headers: {'content-type': 'application/x-ndjson'}});
            const lines = [
                JSON.stringify({id: 1}),
                JSON.stringify({id: 2}),
                JSON.stringify({id: 3}),
            ].join('\n');
            const buf = encoder.encode(lines);
            const res = await parseBody(ctx, buf);
            expect(res.raw).toEqual([{id: 1}, {id: 2}, {id: 3}]);
        });
    
        it('Handles content-type with charset', async () => {
            const ctx = new MockContext({headers: {'content-type': 'application/x-ndjson; charset=utf-8'}});
            const lines = [
                JSON.stringify({a: 'x'}),
                JSON.stringify({b: 'y'}),
            ].join('\n');
            const buf = encoder.encode(lines);
            const res = await parseBody(ctx, buf);
            expect(res.raw).toEqual([{a: 'x'}, {b: 'y'}]);
        });
    
        it('Skips unsupported charset', async () => {
            const ctx = new MockContext({headers: {'content-type': 'application/x-ndjson; charset=unsupported'}});
            ctx.logger.debug = vi.fn();
            const buf = encoder.encode('noop');
            const res = await parseBody(ctx, buf);
            expect(res).toEqual({});
            expect(ctx.logger.debug).toHaveBeenCalledWith('parseBody: Failed to parse', {
                type: 'application/x-ndjson',
                msg: 'The "unsupported" encoding is not supported',
            });
        });
    
        it('Parses UTF-16LE encoded NDJSON correctly', async () => {
            const ctx = new MockContext({headers: {'content-type': 'application/x-ndjson; charset=utf-16le'}});
            const lines = '{"x":1}\n{"y":2}';
            const res = await parseBody(ctx, toUtf16LE(lines));
            expect(res.raw).toEqual([{x: 1}, {y: 2}]);
        });
    
        it('Parses UTF-16BE encoded NDJSON correctly', async () => {
            const ctx = new MockContext({headers: {'content-type': 'application/x-ndjson; charset=utf-16be'}});
            const lines = '{"foo":true}\n{"bar":false}';
            const res = await parseBody(ctx, toUtf16BE(lines));
            expect(res.raw).toEqual([{foo: true}, {bar: false}]);
        });
    
        it('Handles BOM-prefixed UTF-8 NDJSON', async () => {
            const ctx = new MockContext({headers: {'content-type': 'application/x-ndjson'}});
            const ndjson = '{"a":1}\n{"b":2}';
            const buf = new Uint8Array([0xEF, 0xBB, 0xBF, ...encoder.encode(ndjson)]);
            const res = await parseBody(ctx, buf);
            expect(res.raw).toEqual([{a: 1}, {b: 2}]);
        });
    
        it('Returns {} on invalid JSON lines', async () => {
            const ctx = new MockContext({headers: {'content-type': 'application/x-ndjson'}});
            ctx.logger.debug = vi.fn();
            const bad = '{"a":1}\ninvalid\n{"b":2}';
            const buf = encoder.encode(bad);
            const res = await parseBody(ctx, buf);
            expect(res).toEqual({});
            expect(ctx.logger.debug).toHaveBeenCalled();
        });
    });

    describe('text/html', () => {
        it('Parses HTML correctly', async () => {
            const ctx = new MockContext({headers: {'content-type': 'text/html'}});
            const buf = encoder.encode('<p>Hello</p>');
            const res = await parseBody(ctx, buf);
            expect(res).toEqual({raw: '<p>Hello</p>'});
        });
      
        it('Handles charset in content-type', async () => {
            const ctx = new MockContext({headers: {'content-type': 'text/html; charset=utf-8'}});
            const buf = encoder.encode('<p>Charset Aware</p>');
            const res = await parseBody(ctx, buf);
            expect(res).toEqual({raw: '<p>Charset Aware</p>'});
        });

        it('Normalizes charset case', async () => {
            const ctx = new MockContext({headers: {'content-type': 'text/html; charset=UTF-8'}});
            const buf = encoder.encode('<b>upper</b>');
            const res = await parseBody(ctx, buf);
            expect(res).toEqual({raw: '<b>upper</b>'});
        });
        
        it('Skips unsupported charset', async () => {
            const ctx = new MockContext({headers: {'content-type': 'text/html; charset=foo-bar'}});
            ctx.logger.debug = vi.fn();
            const buf = encoder.encode('broken');
            const res = await parseBody(ctx, buf);
            expect(res).toEqual({});
            expect(ctx.logger.debug).toHaveBeenCalledWith('parseBody: Failed to parse', {
                type: 'text/html',
                msg: 'The "foo-bar" encoding is not supported',
            });
        });
        
        it('Parses UTF-16LE encoded correctly', async () => {
            const ctx = new MockContext({headers: {'content-type': 'text/html; charset=utf-16le'}});
            const html = '<div>ok</div>';
            const res = await parseBody(ctx, toUtf16LE(html));
            expect(res).toEqual({raw: html});
        });
      
        it('Returns {} on broken HTML decode', async () => {
            const ctx = new MockContext({headers: {'content-type': 'text/html'}});
            ctx.logger.debug = vi.fn();
            const broken = new Uint8Array([0xC3, 0x28]);
            const res = await parseBody(ctx, broken);
            expect(res).toEqual({});
            expect(ctx.logger.debug).toHaveBeenCalledWith('parseBody: Failed to parse', {
                type: 'text/html',
                msg: 'The encoded data was not valid for encoding utf-8',
            });
        });
    });
      
    describe('text/plain', () => {
        it('Parses plain text correctly', async () => {
            const ctx = new MockContext({headers: {'content-type': 'text/plain'}});
            const buf = encoder.encode('Hello, World');
            const res = await parseBody(ctx, buf);
            expect(res).toEqual({raw: 'Hello, World'});
        });
      
        it('Handles charset in content-type', async () => {
            const ctx = new MockContext({headers: {'content-type': 'text/plain; charset=utf-8'}});
            const buf = encoder.encode('Test with charset');
            const res = await parseBody(ctx, buf);
            expect(res).toEqual({raw: 'Test with charset'});
        });

        it('Normalizes charset case', async () => {
            const ctx = new MockContext({headers: {'content-type': 'text/plain; charset=UTF-8'}});
            const buf = encoder.encode('upper UTF');
            const res = await parseBody(ctx, buf);
            expect(res).toEqual({raw: 'upper UTF'});
        });
        
        it('Skips unsupported charset', async () => {
            const ctx = new MockContext({headers: {'content-type': 'text/plain; charset=foo-bar'}});
            ctx.logger.debug = vi.fn();
            const buf = encoder.encode('fail');
            const res = await parseBody(ctx, buf);
            expect(res).toEqual({});
            expect(ctx.logger.debug).toHaveBeenCalledWith('parseBody: Failed to parse', {
                type: 'text/plain',
                msg: 'The "foo-bar" encoding is not supported',
            });
        });
        
        it('Parses UTF-16LE encoded correctly', async () => {
            const ctx = new MockContext({headers: {'content-type': 'text/plain; charset=utf-16le'}});
            const msg = 'TriFrost FTW';
            const res = await parseBody(ctx, toUtf16LE(msg));
            expect(res).toEqual({raw: msg});
        });
      
        it('Returns {} on broken plain text decode', async () => {
            const ctx = new MockContext({headers: {'content-type': 'text/plain'}});
            ctx.logger.debug = vi.fn();
            const broken = new Uint8Array([0xC3, 0x28]);
            const res = await parseBody(ctx, broken);
            expect(res).toEqual({});
            expect(ctx.logger.debug).toHaveBeenCalledWith('parseBody: Failed to parse', {
                type: 'text/plain',
                msg: 'The encoded data was not valid for encoding utf-8',
            });
        });
    });
      
    describe('text/csv', () => {
        it('Parses CSV text correctly', async () => {
            const ctx = new MockContext({headers: {'content-type': 'text/csv'}});
            const buf = encoder.encode('name,age\nPeter,3');
            const res = await parseBody(ctx, buf);
            expect(res).toEqual({raw: 'name,age\nPeter,3'});
        });
      
        it('Handles charset in content-type', async () => {
            const ctx = new MockContext({headers: {'content-type': 'text/csv; charset=utf-8'}});
            const buf = encoder.encode('id,value\n1,100');
            const res = await parseBody(ctx, buf);
            expect(res).toEqual({raw: 'id,value\n1,100'});
        });

        it('Normalizes charset case', async () => {
            const ctx = new MockContext({headers: {'content-type': 'text/csv; charset=UTF-8'}});
            const buf = encoder.encode('a,b\n1,2');
            const res = await parseBody(ctx, buf);
            expect(res).toEqual({raw: 'a,b\n1,2'});
        });
        
        it('Skips unsupported charset', async () => {
            const ctx = new MockContext({headers: {'content-type': 'text/csv; charset=foo-bar'}});
            ctx.logger.debug = vi.fn();
            const buf = encoder.encode('noop');
            const res = await parseBody(ctx, buf);
            expect(res).toEqual({});
            expect(ctx.logger.debug).toHaveBeenCalledWith('parseBody: Failed to parse', {
                type: 'text/csv',
                msg: 'The "foo-bar" encoding is not supported',
            });
        });
        
        it('Parses UTF-16LE encoded correctly', async () => {
            const ctx = new MockContext({headers: {'content-type': 'text/csv; charset=utf-16le'}});
            const csv = 'id,val\n9,42';
            const res = await parseBody(ctx, toUtf16LE(csv));
            expect(res).toEqual({raw: csv});
        });
      
        it('Returns {} on broken CSV decode', async () => {
            const ctx = new MockContext({headers: {'content-type': 'text/csv'}});
            ctx.logger.debug = vi.fn();
            const broken = new Uint8Array([0xC3, 0x28]);
            const res = await parseBody(ctx, broken);
            expect(res).toEqual({});
            expect(ctx.logger.debug).toHaveBeenCalledWith('parseBody: Failed to parse', {
                type: 'text/csv',
                msg: 'The encoded data was not valid for encoding utf-8',
            });
        });
    });
      
    describe('application/xml', () => {
        it('Parses XML correctly', async () => {
            const ctx = new MockContext({headers: {'content-type': 'application/xml'}});
            const buf = encoder.encode('<xml><msg>Hello</msg></xml>');
            const res = await parseBody(ctx, buf);
            expect(res).toEqual({raw: '<xml><msg>Hello</msg></xml>'});
        });
      
        it('Handles charset in content-type', async () => {
            const ctx = new MockContext({headers: {'content-type': 'application/xml; charset=utf-8'}});
            const buf = encoder.encode('<root><id>123</id></root>');
            const res = await parseBody(ctx, buf);
            expect(res).toEqual({raw: '<root><id>123</id></root>'});
        });

        it('Normalizes charset case', async () => {
            const ctx = new MockContext({headers: {'content-type': 'application/xml; charset=UTF-8'}});
            const buf = encoder.encode('<x>yes</x>');
            const res = await parseBody(ctx, buf);
            expect(res).toEqual({raw: '<x>yes</x>'});
        });
        
        it('Skips unsupported charset', async () => {
            const ctx = new MockContext({headers: {'content-type': 'application/xml; charset=foo-bar'}});
            ctx.logger.debug = vi.fn();
            const buf = encoder.encode('noop');
            const res = await parseBody(ctx, buf);
            expect(res).toEqual({});
            expect(ctx.logger.debug).toHaveBeenCalledWith('parseBody: Failed to parse', {
                type: 'application/xml',
                msg: 'The "foo-bar" encoding is not supported',
            });
        });
        
        it('Parses UTF-16LE encoded correctly', async () => {
            const ctx = new MockContext({headers: {'content-type': 'application/xml; charset=utf-16le'}});
            const xml = '<node>✓</node>';
            const res = await parseBody(ctx, toUtf16LE(xml));
            expect(res).toEqual({raw: xml});
        });
      
        it('Returns {} on broken XML decode', async () => {
            const ctx = new MockContext({headers: {'content-type': 'application/xml'}});
            ctx.logger.debug = vi.fn();
            const broken = new Uint8Array([0xC3, 0x28]);
            const res = await parseBody(ctx, broken);
            expect(res).toEqual({});
            expect(ctx.logger.debug).toHaveBeenCalledWith('parseBody: Failed to parse', {
                type: 'application/xml',
                msg: 'The encoded data was not valid for encoding utf-8',
            });
        });
    });
      
    describe('text/xml', () => {
        it('Parses XML correctly', async () => {
            const ctx = new MockContext({headers: {'content-type': 'text/xml'}});
            const buf = encoder.encode('<text><val>ok</val></text>');
            const res = await parseBody(ctx, buf);
            expect(res).toEqual({raw: '<text><val>ok</val></text>'});
        });
      
        it('Handles charset in content-type', async () => {
            const ctx = new MockContext({headers: {'content-type': 'text/xml; charset=utf-8'}});
            const buf = encoder.encode('<x><y>1</y></x>');
            const res = await parseBody(ctx, buf);
            expect(res).toEqual({raw: '<x><y>1</y></x>'});
        });

        it('Normalizes charset case', async () => {
            const ctx = new MockContext({headers: {'content-type': 'text/xml; charset=UTF-8'}});
            const buf = encoder.encode('<x>yes</x>');
            const res = await parseBody(ctx, buf);
            expect(res).toEqual({raw: '<x>yes</x>'});
        });
        
        it('Skips unsupported charset', async () => {
            const ctx = new MockContext({headers: {'content-type': 'text/xml; charset=foo-bar'}});
            ctx.logger.debug = vi.fn();
            const buf = encoder.encode('noop');
            const res = await parseBody(ctx, buf);
            expect(res).toEqual({});
            expect(ctx.logger.debug).toHaveBeenCalledWith('parseBody: Failed to parse', {
                type: 'text/xml',
                msg: 'The "foo-bar" encoding is not supported',
            });
        });
        
        it('Parses UTF-16LE encoded correctly', async () => {
            const ctx = new MockContext({headers: {'content-type': 'text/xml; charset=utf-16le'}});
            const xml = '<node>✓</node>';
            const res = await parseBody(ctx, toUtf16LE(xml));
            expect(res).toEqual({raw: xml});
        });
      
        it('Returns {} on broken XML decode', async () => {
            const ctx = new MockContext({headers: {'content-type': 'text/xml'}});
            ctx.logger.debug = vi.fn();
            const broken = new Uint8Array([0xC3, 0x28]);
            const res = await parseBody(ctx, broken);
            expect(res).toEqual({});
            expect(ctx.logger.debug).toHaveBeenCalledWith('parseBody: Failed to parse', {
                type: 'text/xml',
                msg: 'The encoded data was not valid for encoding utf-8',
            });
        });
    });

    describe('application/x-www-form-urlencoded', () => {
        it('Parses basic form-encoded body', async () => {
            const ctx = new MockContext({headers: {'content-type': 'application/x-www-form-urlencoded'}});
            const buf = encoder.encode('foo=bar&x=1');
            const res = await parseBody(ctx, buf);
            expect(res).toEqual({foo: 'bar', x: 1});
        });
    
        it('Handles content-type with charset', async () => {
            const ctx = new MockContext({headers: {'content-type': 'application/x-www-form-urlencoded; charset=utf-8'}});
            const buf = encoder.encode('a=1&b=2024-02-01T14:30:00.000Z');
            const res = await parseBody(ctx, buf);
            expect(res).toEqual({a: 1, b: new Date('2024-02-01T14:30:00.000Z')});
        });
    
        it('Normalizes charset case', async () => {
            const ctx = new MockContext({headers: {'content-type': 'application/x-www-form-urlencoded; charset=UTF-8'}});
            const buf = encoder.encode('q=TriFrost');
            const res = await parseBody(ctx, buf);
            expect(res).toEqual({q: 'TriFrost'});
        });

        it('Casts typed values correctly using toObject', async () => {
            const ctx = new MockContext({headers: {'content-type': 'application/x-www-form-urlencoded'}});
            const body = [
                'int=42',
                'float=3.14',
                'boolTrue=true',
                'boolFalse=false',
                'date=2024-05-01T12:00:00.000Z',
                'empty=',
                'string=TriFrost',
                'array[]=a',
                'array[]=b',
                'nested[key]=value',
            ].join('&');
        
            const buf = encoder.encode(body);
            const res = await parseBody(ctx, buf);
        
            expect(res).toEqual({
                int: 42,
                float: 3.14,
                boolTrue: true,
                boolFalse: false,
                date: new Date('2024-05-01T12:00:00.000Z'),
                empty: '',
                string: 'TriFrost',
                array: ['a', 'b'],
                nested: {key: 'value'},
            });
        });
    
        it('Skips unsupported charset', async () => {
            const ctx = new MockContext({headers: {'content-type': 'application/x-www-form-urlencoded; charset=foobar'}});
            ctx.logger.debug = vi.fn();
            const buf = encoder.encode('ignored=data');
            const res = await parseBody(ctx, buf);
            expect(res).toEqual({});
            expect(ctx.logger.debug).toHaveBeenCalledWith('parseBody: Failed to parse', {
                type: 'application/x-www-form-urlencoded',
                msg: 'The "foobar" encoding is not supported',
            });
        });
    
        it('Parses UTF-16LE encoded data correctly', async () => {
            const ctx = new MockContext({headers: {'content-type': 'application/x-www-form-urlencoded; charset=utf-16le'}});
            const res = await parseBody(ctx, toUtf16LE('foo=bar&count=10'));
            expect(res).toEqual({foo: 'bar', count: 10});
        });
    
        it('Parses UTF-16BE encoded data correctly', async () => {
            const ctx = new MockContext({headers: {'content-type': 'application/x-www-form-urlencoded; charset=utf-16be'}});
            const res = await parseBody(ctx, toUtf16BE('a=1&b=2'));
            expect(res).toEqual({a: 1, b: 2});
        });
    
        it('Decodes URL-encoded characters properly', async () => {
            const ctx = new MockContext({headers: {'content-type': 'application/x-www-form-urlencoded'}});
            const buf = encoder.encode('name=TriFrost%20Suite&percent=%25');
            const res = await parseBody(ctx, buf);
            expect(res).toEqual({name: 'TriFrost Suite', percent: '%'});
        });
    
        it('Logs decoding errors on bad form encoding', async () => {
            const ctx = new MockContext({headers: {'content-type': 'application/x-www-form-urlencoded'}});
            ctx.logger.debug = vi.fn();
            const buf = encoder.encode('broken=%E0%A4%A');
            const res = await parseBody(ctx, buf);
            expect(res).toEqual({});
            expect(ctx.logger.debug).toHaveBeenCalledWith('parseBody@form: Failed to decode', {
                key: 'broken',
                value: '%E0%A4%A',
            });
        });
    
        it('Returns {} on fatal decode failure', async () => {
            const ctx = new MockContext({headers: {'content-type': 'application/x-www-form-urlencoded'}});
            ctx.logger.debug = vi.fn();
            const broken = new Uint8Array([0xC3, 0x28]);
            const res = await parseBody(ctx, broken);
            expect(res).toEqual({});
            expect(ctx.logger.debug).toHaveBeenCalledWith('parseBody: Failed to parse', {
                type: 'application/x-www-form-urlencoded',
                msg: 'The encoded data was not valid for encoding utf-8',
            });
        });
    });

    describe('multipart/form-data', () => {
        it('Parses fields and files correctly', async () => {
            const boundary = '----TrifrostBoundary';
            const multipart = createMultipart(boundary, [
                {
                    name: 'username',
                    value: 'Peter'},
                {
                    name: 'avatar',
                    value: encoder.encode('file content'),
                    filename: 'avatar.png',
                    contentType: 'image/png',
                },
            ]);
    
            const ctx = new MockContext({headers: {'content-type': `multipart/form-data; boundary=${boundary}`}});
    
            const result = await parseBody<{username:string;avatar:File}>(ctx, multipart);
            expect(result.username).toBe('Peter');
            expect(result.avatar).toBeInstanceOf(File);
            expect(result.avatar.name).toBe('avatar.png');
            expect(result.avatar.type).toBe('image/png');
            expect(await result.avatar.text()).toBe('file content');
        });
    
        it('Handles missing filename as text field', async () => {
            const boundary = '----NoFileBoundary';
            const result = await parseBody<{description:string}>(
                new MockContext({headers: {'content-type': `multipart/form-data; boundary=${boundary}`}}),
                createMultipart(boundary, [
                    {
                        name: 'description',
                        value: 'Just a string',
                        contentType: 'text/plain',
                    },
                ])
            );
            expect(result.description).toBe('Just a string');
        });
    
        it('Skips empty file uploads gracefully', async () => {
            const boundary = '----EmptyFileBoundary';
            const ctx = new MockContext({headers: {'content-type': `multipart/form-data; boundary=${boundary}`}});
            ctx.logger.debug = vi.fn();
    
            const result = await parseBody<{upload?:File}>(
                ctx,
                createMultipart(boundary, [
                    {
                        name: 'upload',
                        value: new Uint8Array(0),
                        filename: 'empty.txt',
                        contentType: 'text/plain',
                    },
                ])
            );
            expect(result.upload).toBe(undefined);
            expect(ctx.logger.debug).toHaveBeenCalledWith(
                'parseBody@multipart: Empty file skipped',
                {name: 'upload', filename: 'empty.txt'}
            );
        });
    
        it('Ignores malformed part without boundary end', async () => {
            const boundary = '----BadBoundary';

            const result = await parseBody(
                new MockContext({headers: {'content-type': `multipart/form-data; boundary=${boundary}`}}),
                encoder.encode(`--${boundary}\r\nContent-Disposition: form-data; name="fail"\r\n\r\nbad`)
            );

            /* @ts-ignore this is what we're testing */
            expect(result.fail).toBe(undefined);
        });
    
        it('Logs on File constructor failure', async () => {
            const boundary = '----FileFailBoundary';
    
            const file = globalThis.File;
            globalThis.File = class {
                
                constructor () {
                    throw new Error('Simulated File failure');
                }

            } as any;
    
            const ctx = new MockContext({headers: {'content-type': `multipart/form-data; boundary=${boundary}`}});
            ctx.logger.debug = vi.fn();
    
            const result = await parseBody(
                ctx,
                createMultipart(boundary, [
                    {
                        name: 'badfile',
                        value: encoder.encode('some'),
                        filename: 'fail.dat',
                        contentType: 'application/octet-stream',
                    },
                ])
            );

            /* @ts-ignore this is what we're testing */
            expect(result.badfile).toBe(undefined);

            expect(ctx.logger.debug).toHaveBeenCalledWith(
                'parseBody@multipart: Failed to create File',
                {
                    msg: 'Simulated File failure',
                    filename: 'fail.dat',
                    type: 'application/octet-stream',
                }
            );

            /* eslint-disable-next-line require-atomic-updates */
            globalThis.File = file;
        });
    
        it('Returns {} on missing boundary', async () => {
            const ctx = new MockContext({headers: {'content-type': 'multipart/form-data'}});
            ctx.logger.debug = vi.fn();
            const result = await parseBody(ctx, encoder.encode('irrelevant'));
            expect(result).toEqual({});
            expect(ctx.logger.debug).toHaveBeenCalledWith('parseBody: Failed to parse', {
                type: 'multipart/form-data',
                msg: 'multipart: Missing boundary',
            });
        });

        it('Parses multipart/form-data with UTF-16LE encoded field', async () => {
            const boundary = 'utf16le-boundary';
            const lines = [
                `--${boundary}`,
                'Content-Disposition: form-data; name="username"',
                'Content-Type: text/plain; charset=utf-16le',
                '',
                // <-- body goes here
                `--${boundary}--`,
                '',
            ];
        
            const head = encoder.encode(lines.slice(0, 4).join('\r\n') + '\r\n');
            const tail = encoder.encode('\r\n' + lines.slice(4).join('\r\n'));
            const content = toUtf16LE('Peter ☃️');
        
            const body = new Uint8Array(head.length + content.length + tail.length);
            body.set(head, 0);
            body.set(content, head.length);
            body.set(tail, head.length + content.length);
        
            const result = await parseBody<{username:string}>(
                new MockContext({headers: {'content-type': `multipart/form-data; boundary=${boundary}`}}),
                body
            );
            expect(result.username).toBe('Peter ☃️');
        });

        it('Parses multipart/form-data with UTF-16BE encoded field', async () => {
            const boundary = 'utf16be-boundary';
            const lines = [
                `--${boundary}`,
                'Content-Disposition: form-data; name="comment"',
                'Content-Type: text/plain; charset=utf-16be',
                '',
                `--${boundary}--`,
                '',
            ];
        
            const head = encoder.encode(lines.slice(0, 4).join('\r\n') + '\r\n');
            const tail = encoder.encode('\r\n' + lines.slice(4).join('\r\n'));
            const content = toUtf16BE('Multilingual 🌍 text');
        
            const body = new Uint8Array(head.length + content.length + tail.length);
            body.set(head, 0);
            body.set(content, head.length);
            body.set(tail, head.length + content.length);
        
            const result = await parseBody<{comment:string}>(
                new MockContext({headers: {'content-type': `multipart/form-data; boundary=${boundary}`}}),
                body
            );
        
            expect(result.comment).toBe('Multilingual 🌍 text');
        });
        
        it('Preserves binary content for UTF-16LE-encoded file', async () => {
            const boundary = 'file-boundary';
            const fileContent = toUtf16LE('🔒 Secure Content');
        
            const multipart = createMultipart(boundary, [
                {
                    name: 'secret',
                    value: fileContent,
                    filename: 'secure.txt',
                    contentType: 'text/plain; charset=utf-16le',
                },
            ]);
        
            const result = await parseBody<{secret: File}>(
                new MockContext({headers: {'content-type': `multipart/form-data; boundary=${boundary}`}}),
                multipart
            );
        
            expect(result.secret).toBeInstanceOf(File);
            expect(result.secret.name).toBe('secure.txt');
            expect(await result.secret.arrayBuffer()).toEqual(fileContent.buffer);
        });

        it('Logs and falls back on unsupported charset in part', async () => {
            const boundary = 'fail-boundary';
            const ctx = new MockContext({headers: {'content-type': `multipart/form-data; boundary=${boundary}`}});
            ctx.logger.debug = vi.fn();
        
            const lines = [
                `--${boundary}`,
                'Content-Disposition: form-data; name="bio"',
                'Content-Type: text/plain; charset=unsupported-enc',
                '',
                `--${boundary}--`,
                '',
            ];
        
            const head = encoder.encode(lines.slice(0, 4).join('\r\n') + '\r\n');
            const tail = encoder.encode('\r\n' + lines.slice(4).join('\r\n'));
            const content = encoder.encode('fallback');
        
            const body = new Uint8Array(head.length + content.length + tail.length);
            body.set(head, 0);
            body.set(content, head.length);
            body.set(tail, head.length + content.length);
        
            const result = await parseBody<{bio:string}>(ctx, body);
            expect(result.bio).toBe(undefined);
            expect(ctx.logger.debug).toHaveBeenCalledWith(
                'parseBody: Failed to parse',
                {
                    msg: 'The "unsupported-enc" encoding is not supported',
                    type: 'multipart/form-data',
                }
            );
        });

        it('Parses multipart with mixed part charsets correctly', async () => {
            const boundary = 'mixed-boundary';
        
            const utf8 = encoder.encode('Normal UTF-8 text');
            const utf16le = toUtf16LE('雪 ❄️ 冷');
            const utf16be = toUtf16BE('Frost🔥');
        
            const parts = [
                {
                    name: 'utf8field',
                    value: utf8,
                    contentType: 'text/plain; charset=utf-8',
                },
                {
                    name: 'utf16lefield',
                    value: utf16le,
                    contentType: 'text/plain; charset=utf-16le',
                },
                {
                    name: 'utf16befield',
                    value: utf16be,
                    contentType: 'text/plain; charset=utf-16be',
                },
            ];
        
            const body = createMultipart(boundary, parts);
        
            const result = await parseBody<any>(
                new MockContext({headers: {'content-type': `multipart/form-data; boundary=${boundary}`}}),
                body
            );
        
            expect(result.utf8field).toBe('Normal UTF-8 text');
            expect(result.utf16lefield).toBe('雪 ❄️ 冷');
            expect(result.utf16befield).toBe('Frost🔥');
        });
        
        it('Parses UTF-8 field with BOM correctly', async () => {
            const boundary = 'bom-le';
            const bomLE = new Uint8Array([0xFF, 0xFE]);
            const content = toUtf16LE('BOM start');
            const full = new Uint8Array(bomLE.length + content.length);
            full.set(bomLE);
            full.set(content, bomLE.length);
        
            const body = createMultipart(boundary, [
                {
                    name: 'field',
                    value: full,
                    contentType: 'text/plain; charset=utf-16le',
                },
            ]);
        
            const result = await parseBody<{field: string}>(
                new MockContext({headers: {'content-type': `multipart/form-data; boundary=${boundary}`}}),
                body
            );
        
            expect(result.field).toBe('BOM start');
        });

        it('Parses UTF-16LE field with BOM correctly', async () => {
            const boundary = 'bom-le';
            const bomLE = new Uint8Array([0xFF, 0xFE]);
            const content = toUtf16LE('BOM start');
            const full = new Uint8Array(bomLE.length + content.length);
            full.set(bomLE);
            full.set(content, bomLE.length);
        
            const body = createMultipart(boundary, [
                {
                    name: 'field',
                    value: full,
                    contentType: 'text/plain; charset=utf-16le',
                },
            ]);
        
            const result = await parseBody<{field: string}>(
                new MockContext({headers: {'content-type': `multipart/form-data; boundary=${boundary}`}}),
                body
            );
        
            expect(result.field).toBe('BOM start');
        });

        it('Parses UTF-16BE field with BOM correctly', async () => {
            const boundary = 'bom-be';
            const bomBE = new Uint8Array([0xFE, 0xFF]);
            const content = toUtf16BE('Big endian 🧠');
            const full = new Uint8Array(bomBE.length + content.length);
            full.set(bomBE);
            full.set(content, bomBE.length);
        
            const body = createMultipart(boundary, [
                {
                    name: 'field',
                    value: full,
                    contentType: 'text/plain; charset=utf-16be',
                },
            ]);
        
            const result = await parseBody<{field: string}>(
                new MockContext({headers: {'content-type': `multipart/form-data; boundary=${boundary}`}}),
                body
            );
        
            expect(result.field).toBe('Big endian 🧠');
        });

        it('Parses UTF-16LE encoded file upload correctly', async () => {
            const boundary = 'utf16le-file';
            const fileContent = toUtf16LE('TriFrost Secret 🌐');
        
            const multipart = createMultipart(boundary, [
                {
                    name: 'doc',
                    value: fileContent,
                    filename: 'secret.txt',
                    contentType: 'text/plain; charset=utf-16le',
                },
            ]);
        
            const result = await parseBody<{doc: File}>(
                new MockContext({headers: {'content-type': `multipart/form-data; boundary=${boundary}`}}),
                multipart
            );
        
            expect(result.doc).toBeInstanceOf(File);
            expect(result.doc.name).toBe('secret.txt');
            const buf = new Uint8Array(await result.doc.arrayBuffer());
            expect(buf).toEqual(fileContent);
        });

        it('Parses UTF-16BE file with emojis correctly', async () => {
            const boundary = 'utf16be-file';
            const fileContent = toUtf16BE('🚀 Launch approved');
        
            const multipart = createMultipart(boundary, [
                {
                    name: 'launchDoc',
                    value: fileContent,
                    filename: 'launch.txt',
                    contentType: 'text/plain; charset=utf-16be',
                },
            ]);
        
            const result = await parseBody<{launchDoc: File}>(
                new MockContext({headers: {'content-type': `multipart/form-data; boundary=${boundary}`}}),
                multipart
            );
        
            expect(result.launchDoc).toBeInstanceOf(File);
            expect(result.launchDoc.name).toBe('launch.txt');
            const buf = new Uint8Array(await result.launchDoc.arrayBuffer());
            expect(buf).toEqual(fileContent);
        });

        it('Skips multipart part without header/content separator', async () => {
            const boundary = 'missing-separator';
            const raw = `--${boundary}\r\nContent-Disposition: form-data; name="oops"\r\nMISSING_SEPARATOR\r\n--${boundary}--\r\n`;
            const ctx = new MockContext({headers: {'content-type': `multipart/form-data; boundary=${boundary}`}});
            const result = await parseBody<{oops?:unknown}>(ctx, encoder.encode(raw));
            expect(result.oops).toBeUndefined();
        });

        it('Returns empty form if boundary not found', async () => {
            const boundary = 'not-found-boundary';
            const raw = encoder.encode('no delimiter here at all');
            const ctx = new MockContext({headers: {'content-type': `multipart/form-data; boundary=${boundary}`}});
            const result = await parseBody(ctx, raw);
            expect(result).toEqual({});
        });

        it('Ignores unknown headers in multipart parts', async () => {
            const boundary = 'unknown-headers';
            const raw = `--${boundary}\r\nX-C-Field: n\r\nContent-Disposition: form-data; name="test"\r\n\r\nvalue\r\n--${boundary}--\r\n`;
            const ctx = new MockContext({headers: {'content-type': `multipart/form-data; boundary=${boundary}`}});
            const result = await parseBody<{test:string}>(ctx, encoder.encode(raw));
            expect(result.test).toBe('value');
        });

        it('Defaults file content-type to application/octet-stream', async () => {
            const boundary = 'default-type';
            const ctx = new MockContext({headers: {'content-type': `multipart/form-data; boundary=${boundary}`}});
            const result = await parseBody<{file: File}>(
                ctx,
                /* eslint-disable-next-line max-len */
                encoder.encode(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="data.bin"\r\n\r\ncontent\r\n--${boundary}--\r\n`)
            );
            expect(result.file.type).toBe('application/octet-stream');
        });

        it('Skips parts without name in Content-Disposition', async () => {
            const boundary = 'missing-name';
            const raw = `--${boundary}\r\nContent-Disposition: form-data\r\n\r\noops\r\n--${boundary}--\r\n`;
            const ctx = new MockContext({headers: {'content-type': `multipart/form-data; boundary=${boundary}`}});
            const result = await parseBody(ctx, encoder.encode(raw));
            expect(Object.keys(result)).toHaveLength(0);
        });

        it('Handles part with Content-Disposition but no Content-Type', async () => {
            const boundary = 'only-disposition';
            const raw = [
                `--${boundary}`,
                'Content-Disposition: form-data; name="simple"',
                'X-Unrelated: ignore-me',
                '',
                'Hello world',
                `--${boundary}--`,
                '',
            ].join('\r\n');
        
            const ctx = new MockContext({headers: {'content-type': `multipart/form-data; boundary=${boundary}`}});
            const result = await parseBody<{simple:string}>(ctx, encoder.encode(raw));
            expect(result.simple).toBe('Hello world');
        });

        it('Skips part with missing Content-Disposition header (covers fallback path)', async () => {
            const boundary = 'no-disposition';
            const raw = [
                `--${boundary}`,
                'X-Custom: Something',
                '',
                'Should be ignored',
                `--${boundary}--`,
                '',
            ].join('\r\n');
        
            const ctx = new MockContext({headers: {'content-type': `multipart/form-data; boundary=${boundary}`}});
            const result = await parseBody(ctx, encoder.encode(raw));
        
            // No key added to the object, because name can't be extracted
            expect(result).toEqual({});
        });
    });
});
