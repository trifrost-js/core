import {describe, it, expect} from 'vitest';
import {encodeFilename, extractDomainFromHost, extractPartsFromUrl, TRANSLITERATOR} from '../../../lib/utils/Http';
import CONSTANTS from '../../constants';

describe('Utils - Http', () => {
    describe('encodeFilename', () => {
        it('Returns empty strings for non-string input', () => {
            for (const el of CONSTANTS.NOT_STRING) {
                expect(encodeFilename(el as string)).toEqual({ascii: '', encoded: ''});
            }
        });

        it('Preserves basic ASCII chars', () => {
            const input = 'hello.txt';
            const result = encodeFilename(input);
            expect(result.ascii).toBe('hello.txt');
            expect(result.encoded).toBe('hello.txt');
        });

        it('Encodes special UTF-8 chars correctly', () => {
            const input = 'Straße.pdf';
            const result = encodeFilename(input);
            expect(result.ascii).toBe('Strasse.pdf');
            expect(result.encoded).toBe('Stra%C3%9Fe.pdf');
        });

        it('Encodes space and reserved chars', () => {
            const input = 'my file (1).pdf';
            const result = encodeFilename(input);
            expect(result.ascii).toBe('my file (1).pdf');
            expect(result.encoded).toBe('my%20file%20%281%29.pdf');
        });

        it('Encodes * using custom rule (%2A)', () => {
            const result = encodeFilename('file*name.pdf');
            expect(result.ascii).toBe('file*name.pdf');
            expect(result.encoded).toBe('file%2Aname.pdf');
        });

        it('Encodes ( and ) using custom uppercase hex', () => {
            const result = encodeFilename('file(1).pdf');
            expect(result.ascii).toBe('file(1).pdf');
            expect(result.encoded).toBe('file%281%29.pdf');
        });

        it('Encodes single quote using custom rule (%27)', () => {
            const result = encodeFilename("O'Reilly's Guide.pdf");
            expect(result.ascii).toBe('OReillys Guide.pdf');
            expect(result.encoded).toBe('O%27Reilly%27s%20Guide.pdf');
        });

        it('Skips control characters and forbidden characters', () => {
            const input = 'my\nfi\0le.pdf';
            const result = encodeFilename(input);
            expect(result.ascii).toBe('myfile.pdf');
            expect(result.encoded).not.toContain('%0A');
            expect(result.encoded).not.toContain('%00');
        });

        it('Skips quote and backslash characters', () => {
            const input = 'name\\"quote.pdf';
            const result = encodeFilename(input);
            expect(result.ascii).toBe('namequote.pdf');
            expect(result.encoded).toEqual('name%5Cquote.pdf');
        });

        it('Preserves safe punctuation and symbols', () => {
            const input = 'doc-v1.2_final.pdf';
            const result = encodeFilename(input);
            expect(result.ascii).toBe(input);
            expect(result.encoded).toBe(input);
        });

        it('Handles mixed unicode and symbols', () => {
            const input = 'Über_©2024*final!.pdf';
            const result = encodeFilename(input);
            expect(result.ascii).toBe('Uber_(c)2024*final!.pdf');
            expect(result.encoded).toBe('%C3%9Cber_%C2%A92024%2Afinal!.pdf');
        });

        it('Transliterates all mapped characters', () => {
            for (const key in TRANSLITERATOR) {
                expect(encodeFilename(key)).toEqual({
                    ascii: TRANSLITERATOR[key],
                    encoded: encodeURIComponent(key),
                });
            }
        });

        it('Transliterates German characters correctly', () => {
            const input = 'ÄÖÜöß';
            const result = encodeFilename(input);
            expect(result.ascii).toBe('AOUoss');
        });

        it('Transliterates FrenchLatin characters correctly', () => {
            const input = 'àáâäæçéèêëîïôœùûüÿñ';
            const result = encodeFilename(input);
            expect(result.ascii).toBe('aaaaaeceeeeiiooeuuuyn');
        });

        it('Transliterates Nordic characters correctly', () => {
            const input = 'ÅåØøÆ';
            const result = encodeFilename(input);
            expect(result.ascii).toBe('AaOoAe');
        });

        it('Transliterates CEE characters correctly', () => {
            const input = 'ąćęłńśźżĆŁŚŹŻ';
            const result = encodeFilename(input);
            expect(result.ascii).toBe('acelnszzCLSZZ');
        });

        it('Transliterates Cyrillic characters correctly', () => {
            const input = 'ЖжХхЦцЧчШшЩщЮюЯя';
            const result = encodeFilename(input);
            expect(result.ascii).toBe('ZhzhKhkhTstsChchShshShchshchYuyuYaya');
        });

        it('Transliterates Greek characters correctly', () => {
            const input = 'ΘθΧχΨψΩω';
            const result = encodeFilename(input);
            expect(result.ascii).toBe('ThthChchPspsOo');
        });

        it('Transliterates Turkish characters correctly', () => {
            const input = 'ğĞşŞİı';
            const result = encodeFilename(input);
            expect(result.ascii).toBe('gGsSIi');
        });

        it('Transliterates Symbols characters correctly', () => {
            const input = '©®™℠';
            const result = encodeFilename(input);
            expect(result.ascii).toBe('(c)(r)(tm)(sm)');
        });

        it('Handles an issue in encoding correctly by falling back to text encoder', () => {
            const result = encodeFilename('📄');
            expect(result).toEqual({
                ascii: '',
                encoded: '%EF%BF%BD%EF%BF%BD',
            });
        });
    });

    describe('extractPartsFromUrl', () => {
        it('Returns empty path/query for non-string input', () => {
            for (const el of CONSTANTS.NOT_STRING) {
                expect(extractPartsFromUrl(el as string)).toEqual({path: '', query: ''});
            }
        });

        it('Extracts path and query from basic URL', () => {
            const result = extractPartsFromUrl('https://example.com/foo/bar?x=1&y=2');
            expect(result).toEqual({
                path: '/foo/bar',
                query: 'x=1&y=2',
            });
        });

        it('Extracts path with no query', () => {
            const result = extractPartsFromUrl('https://example.com/path/only');
            expect(result).toEqual({
                path: '/path/only',
                query: '',
            });
        });

        it('Returns root path when no path is present', () => {
            const result = extractPartsFromUrl('https://example.com');
            expect(result).toEqual({
                path: '/',
                query: '',
            });
        });

        it('Handles query string without path', () => {
            const result = extractPartsFromUrl('https://example.com/?q=search');
            expect(result).toEqual({
                path: '/',
                query: 'q=search',
            });
        });

        it('Handles URLs with port and subdomain', () => {
            const result = extractPartsFromUrl('https://api.example.com:8080/v1/data?limit=10');
            expect(result).toEqual({
                path: '/v1/data',
                query: 'limit=10',
            });
        });

        it('Returns empty path/query on malformed URL structure', () => {
            const result = extractPartsFromUrl('not-a-url');
            expect(result).toEqual({
                path: '/',
                query: '',
            });
        });

        it('Returns correct path/query even with multiple "?" in query string', () => {
            const result = extractPartsFromUrl('https://example.com/resource?debug=true&url=https://x.com?a=b');
            expect(result).toEqual({
                path: '/resource',
                query: 'debug=true&url=https://x.com?a=b',
            });
        });

        it('Handles paths with encoded characters', () => {
            const result = extractPartsFromUrl('https://example.com/foo%20bar/baz?x=1');
            expect(result).toEqual({
                path: '/foo%20bar/baz',
                query: 'x=1',
            });
        });

        it('Handles URLs with hash fragments (ignores them)', () => {
            const result = extractPartsFromUrl('https://example.com/path#section?x=1');
            expect(result).toEqual({path: '/path', query: ''});
        });

        it('Handles URLs with query but no path (just domain)', () => {
            const result = extractPartsFromUrl('https://example.com?query=1');
            expect(result).toEqual({path: '/', query: 'query=1'});
        });

        it('Handles double slashes in path', () => {
            const result = extractPartsFromUrl('https://example.com//weird//path?x=1');
            expect(result).toEqual({path: '//weird//path', query: 'x=1'});
        });

        it('Handles trailing slashes and no query', () => {
            const result = extractPartsFromUrl('https://example.com/path/');
            expect(result).toEqual({path: '/path/', query: ''});
        });

        it('Handles query-only URLs with "?" right after domain', () => {
            const result = extractPartsFromUrl('https://example.com?x=1');
            expect(result).toEqual({path: '/', query: 'x=1'});
        });

        it('Handles URLs with empty query string', () => {
            const result = extractPartsFromUrl('https://example.com/path?');
            expect(result).toEqual({path: '/path', query: ''});
        });

        it('Handles protocol-relative URLs (e.g. //example.com/path)', () => {
            const result = extractPartsFromUrl('//example.com/path?debug=true');
            expect(result).toEqual({path: '/path', query: 'debug=true'});
        });

        it('Handles URLs with uncommon but valid protocols', () => {
            const result = extractPartsFromUrl('ftp://my.server.com/folder/file.txt?download=true');
            expect(result).toEqual({path: '/folder/file.txt', query: 'download=true'});
        });

        it('Handles deeply nested paths with long queries', () => {
            const result = extractPartsFromUrl('https://example.com/a/b/c/d/e?token=abc123&verbose=true');
            expect(result).toEqual({
                path: '/a/b/c/d/e',
                query: 'token=abc123&verbose=true',
            });
        });
    });

    describe('extractDomainFromHost', () => {
        it('Returns null for non-string input', () => {
            for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                expect(extractDomainFromHost(el as any)).toBeNull();
            }
        });

        it('Returns null for localhost and loopback addresses', () => {
            expect(extractDomainFromHost('localhost')).toBeNull();
            expect(extractDomainFromHost('localhost:3000')).toBeNull();
            expect(extractDomainFromHost('127.0.0.1')).toBeNull();
            expect(extractDomainFromHost('192.168.1.1')).toBeNull();
            expect(extractDomainFromHost('10.0.0.1')).toBeNull();
            expect(extractDomainFromHost('::1')).toBeNull();
            expect(extractDomainFromHost('[::1]')).toBeNull();
        });

        it('Handles plain and www-prefixed domains', () => {
            expect(extractDomainFromHost('example.com')).toBe('example.com');
            expect(extractDomainFromHost('www.example.com')).toBe('example.com');
            expect(extractDomainFromHost('www2.example.com')).toBe('example.com');
        });

        it('Handles domains with ports', () => {
            expect(extractDomainFromHost('sub.example.com:8080')).toBe('example.com');
            expect(extractDomainFromHost('www.example.co.uk:443')).toBe('example.co.uk');
            expect(extractDomainFromHost('https://example.com:1234')).toBe('example.com');
        });

        it('Handles multi-level subdomains', () => {
            expect(extractDomainFromHost('a.b.c.example.com')).toBe('example.com');
            expect(extractDomainFromHost('api.a.b.c.d.example.co.uk')).toBe('example.co.uk');
        });

        it('Handles internationalized domains (IDN)', () => {
            expect(extractDomainFromHost('www.xn--bcher-kva.example')).toBe('xn--bcher-kva.example');
            expect(extractDomainFromHost('xn--exmple-cua.com')).toBe('xn--exmple-cua.com');
        });

        it('Handles uppercase domains', () => {
            expect(extractDomainFromHost('WWW.Example.COM')).toBe('example.com');
            expect(extractDomainFromHost('API.EXAMPLE.CO.UK')).toBe('example.co.uk');
        });

        it('Handles full URLs', () => {
            expect(extractDomainFromHost('https://www.example.com')).toBe('example.com');
            expect(extractDomainFromHost('http://a.b.example.co.uk/foo/bar')).toBe('example.co.uk');
            expect(extractDomainFromHost('https://api.example.org/path?query=1')).toBe('example.org');
        });

        it('Handles trailing dot in domain', () => {
            expect(extractDomainFromHost('www.example.com.')).toBe('example.com');
            expect(extractDomainFromHost('a.b.example.co.uk.')).toBe('example.co.uk');
        });

        it('Handles domains with numbers and hyphens', () => {
            expect(extractDomainFromHost('api-1.example.com')).toBe('example.com');
            expect(extractDomainFromHost('www3.app-2.example.gov.uk')).toBe('example.gov.uk');
        });

        it('Returns null for malformed input', () => {
            expect(extractDomainFromHost('not a domain')).toBeNull();
            expect(extractDomainFromHost('.com')).toBeNull();
            expect(extractDomainFromHost('..example..com')).toBeNull();
            expect(extractDomainFromHost('http:///example.com')).toBeNull();
            expect(extractDomainFromHost('http://')).toBeNull();
            expect(extractDomainFromHost('ftp://example.com')).toBe('example.com');
        });

        it('Handles public suffix and exotic TLDs', () => {
            expect(extractDomainFromHost('sub.example.co.uk')).toBe('example.co.uk');
            expect(extractDomainFromHost('api.shop.example.com.au')).toBe('example.com.au');
            expect(extractDomainFromHost('www.corporate.example.edu.hk')).toBe('example.edu.hk');
            expect(extractDomainFromHost('foo.bar.example.com.cn')).toBe('example.com.cn');
        });

        it('Returns expected root domains for tricky nesting', () => {
            expect(extractDomainFromHost('a.b.c.d.e.f.g.example.net.br')).toBe('example.net.br');
            expect(extractDomainFromHost('a.b.c.d.e.example.com')).toBe('example.com');
            expect(extractDomainFromHost('a.b.c.d.e.example.org')).toBe('example.org');
        });
    });
});
