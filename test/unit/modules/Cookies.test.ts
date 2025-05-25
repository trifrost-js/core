import {describe, it, expect, vi, afterEach} from 'vitest';
import {addUTC} from '@valkyriestudios/utils/date';
import {type TriFrostCookieOptions, Cookies} from '../../../lib/modules/Cookies';
import CONSTANTS from '../../constants';
import {MockContext} from '../../MockContext';

describe('Modules - Cookies', () => {
    const createCtx = (cookie?:string) => new MockContext({headers: cookie === undefined ? {} : {cookie}});

    describe('constructor', () => {
        it('Parses multiple cookies from header', () => {
            const cookies = new Cookies(createCtx('a=1; b=2; c=3'), {});
            expect(cookies.all()).toEqual({
                a: '1',
                b: '2',
                c: '3',
            });
        });

        it('Decodes URI-encoded cookie values', () => {
            const cookies = new Cookies(createCtx('token=a%20b%20c'));
            expect(cookies.get('token')).toBe('a b c');
        });

        it('Trims whitespace around keys and values', () => {
            const cookies = new Cookies(createCtx('  session = trimmed  ;  foo= bar '), {});
            expect(cookies.all()).toEqual({
                session: 'trimmed',
                foo: 'bar',
            });
        });

        it('Ignores malformed cookie header (wrong or empty)', () => {
            for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                /* @ts-ignore */
                const cookies = new Cookies(createCtx(el), {});
                expect(cookies.all()).toEqual({});
            }
        });

        it('Ignores malformed cookies (missing value)', () => {
            const cookies = new Cookies(createCtx('valid=ok; badcookie; another=ok; badcookie2='), {});
            expect(cookies.all()).toEqual({
                valid: 'ok',
                another: 'ok',
            });
        });

        it('Handles completely empty cookie header', () => {
            const cookies = new Cookies(createCtx(''), {});
            expect(cookies.all()).toEqual({});
        });

        it('Handles absence of cookie header gracefully', () => {
            const cookies = new Cookies(createCtx(), {});
            expect(cookies.all()).toEqual({});
        });

        it('Accepts and stores global config', () => {
            const config = {
                path: '/secure',
                domain: 'trifrost.land',
                secure: true,
                httponly: true,
                samesite: 'Strict' as const,
            };
            const cookies = new Cookies(createCtx(), config);
            cookies.set('token', 'abc');
            expect(cookies.outgoing[0].includes('Path=/secure')).toBe(true);
            expect(cookies.outgoing[0].includes('Domain=trifrost.land')).toBe(true);
            expect(cookies.outgoing[0].includes('Secure')).toBe(true);
            expect(cookies.outgoing[0].includes('HttpOnly')).toBe(true);
            expect(cookies.outgoing[0].includes('SameSite=Strict')).toBe(true);
        });

        it('Falls back to proper defaults if passed invalid config', () => {
            for (const el of CONSTANTS.NOT_OBJECT) {
                if (el === undefined) continue;
                const cookies = new Cookies(createCtx(), el as unknown as TriFrostCookieOptions);
                cookies.set('token', 'abc');
                expect(cookies.outgoing).toEqual(['token=abc; Secure']);
            }
        });
    });

    describe('get', () => {
        it('Retrieves existing cookie', () => {
            const cookies = new Cookies(createCtx('foo=bar'), {});
            expect(cookies.get('foo')).toBe('bar');
        });

        it('Returns null for non-existent cookie', () => {
            const cookies = new Cookies(createCtx('foo=bar'), {});
            expect(cookies.get('nope')).toBe(null);
        });

        it('Returns null when passed a non/empty-string', () => {
            const cookies = new Cookies(createCtx('foo=bar'), {});
            for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) expect(cookies.get(el as unknown as string)).toBe(null);
        });

        it('Handles empty cookie header', () => {
            const cookies = new Cookies(createCtx(), {});
            expect(cookies.get('anything')).toBe(null);
        });

        it('Handles malformed cookie string (missing "=")', () => {
            const cookies = new Cookies(createCtx('foo'), {});
            expect(cookies.get('foo')).toBe(null);
        });

        it('Trims whitespace around cookie names', () => {
            const cookies = new Cookies(createCtx(' foo =bar '), {});
            expect(cookies.get('foo')).toBe('bar');
        });

        it('Decodes URI-encoded values correctly', () => {
            const cookies = new Cookies(createCtx('foo=space%20bar'), {});
            expect(cookies.get('foo')).toBe('space bar');
        });

        it('Returns latest value if overwritten via set()', () => {
            const cookies = new Cookies(createCtx('foo=bar'), {});
            cookies.set('foo', 'baz');
            expect(cookies.get('foo')).toBe('baz');
        });

        it('Handles cookies with equal signs in the value', () => {
            const cookies = new Cookies(createCtx('x=1=2=3'), {});
            expect(cookies.get('x')).toBe('1=2=3');
        });
    });

    describe('set', () => {
        it('Sets a valid cookie', () => {
            const cookies = new Cookies(createCtx(), {});
            cookies.set('token', 'abc123', {path: '/', httponly: true});
            expect(cookies.outgoing).toEqual([
                'token=abc123; Path=/; Secure; HttpOnly',
            ]);
        });

        it('Encodes values and appends secure if SameSite=None', () => {
            const cookies = new Cookies(createCtx(), {});
            cookies.set('sess', 'space bar', {secure: false, samesite: 'None'});
            expect(cookies.outgoing).toEqual([
                'sess=space%20bar; SameSite=None; Secure',
            ]);
        });

        it('Rejects cookie with non/empty string name', () => {
            const ctx = createCtx();
            const cookies = new Cookies(ctx, {});
            for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) cookies.set(el as unknown as string, 'hello');
            expect(cookies.outgoing).toEqual([]);
        });

        it('Rejects cookie with invalid value', () => {
            const ctx = createCtx();
            const cookies = new Cookies(ctx, {});
            for (const el of CONSTANTS.NOT_STRING) {
                if (Number.isFinite(el)) continue;
                cookies.set('hello', el as unknown as string);
            }
            expect(cookies.outgoing).toEqual([]);
        });

        it('Rejects cookie with invalid name (contains semicolon)', () => {
            const ctx = createCtx();
            const cookies = new Cookies(ctx, {});
            cookies.set('bad;name', 'val');
            expect(cookies.outgoing).toEqual([]);
        });

        it('Rejects cookie with invalid value (non-ASCII)', () => {
            const ctx = createCtx();
            const cookies = new Cookies(ctx, {});
            cookies.set('validname', '💥');
            expect(cookies.outgoing).toEqual([]);
        });

        it('Sets Max-Age and derives Expires from maxage', () => {
            const cookies = new Cookies(createCtx(), {});
            cookies.set('session', 'val', {maxage: 120});
            expect(cookies.outgoing).toEqual([
                `session=val; Expires=${addUTC(new Date(), 120, 'seconds').toUTCString()}; Max-Age=120; Secure`,
            ]);
        });

        it('Sets Expires and derives Max-Age from expires', () => {
            const expires = addUTC(new Date(), 300, 'seconds');
            const cookies = new Cookies(createCtx(), {});
            cookies.set('session', 'val', {expires});
            expect(cookies.outgoing).toEqual([
                `session=val; Expires=${expires.toUTCString()}; Max-Age=300; Secure`,
            ]);
        });

        it('Prefers expires over maxAge when both provided', () => {
            const expires = addUTC(new Date(), 600, 'seconds');
            const cookies = new Cookies(createCtx(), {});
            cookies.set('token', 'abc', {maxage: 300, expires});
            expect(cookies.outgoing).toEqual([
                `token=abc; Expires=${expires.toUTCString()}; Secure`,
            ]);
        });

        it('Adds Path, Domain, HttpOnly, SameSite options', () => {
            const cookies = new Cookies(createCtx(), {});
            cookies.set('token', 'val', {
                path: '/secure',
                domain: 'example.com',
                httponly: true,
                samesite: 'Lax',
            });
            expect(cookies.outgoing).toEqual([
                'token=val; Path=/secure; Domain=example.com; Secure; HttpOnly; SameSite=Lax',
            ]);
        });

        it('Ignores invalid options passed', () => {
            for (const el of CONSTANTS.NOT_OBJECT) {
                if (el === undefined) continue;
                const cookies = new Cookies(createCtx(), {
                    domain: 'example.com',
                    path: '/secure',
                });
                cookies.set('token', 'val', el as TriFrostCookieOptions);
                expect(cookies.outgoing).toEqual([
                    'token=val; Path=/secure; Domain=example.com; Secure',
                ]);
            }
        });

        it('Forces Secure when SameSite=None and secure=false explicitly', () => {
            const cookies = new Cookies(createCtx(), {});
            cookies.set('unsafe', 'val', {secure: false, samesite: 'None'});
            expect(cookies.outgoing).toEqual([
                'unsafe=val; SameSite=None; Secure',
            ]);
        });

        it('Adds new cookie without overriding previous', () => {
            const cookies = new Cookies(createCtx(), {});
            cookies.set('one', '1');
            cookies.set('two', '2');
            expect(cookies.outgoing).toEqual([
                'one=1; Secure',
                'two=2; Secure',
            ]);
        });

        it('Overwrites previously set cookie of same name', () => {
            const cookies = new Cookies(createCtx(), {});
            cookies.set('dup', 'first');
            cookies.set('dup', 'second');
            expect(cookies.all()).toEqual({dup: 'second'});
            expect(cookies.outgoing).toEqual(['dup=second; Secure']);
        });

        it('Normalizes numeric values via toString', () => {
            const cookies = new Cookies(createCtx(), {});
            cookies.set('n', 123);
            expect(cookies.all()).toEqual({n: '123'});
            expect(cookies.outgoing[0].startsWith('n=123')).toBe(true);
        });

        it('Falls back to global config when no options passed in set()', () => {
            const cookies = new Cookies(createCtx(), {
                path: '/default',
                domain: 'trifrost.land',
                secure: true,
                httponly: true,
                samesite: 'Strict',
            });
            cookies.set('auth', 'ok');
            expect(cookies.outgoing[0].includes('Path=/default')).toBe(true);
            expect(cookies.outgoing[0].includes('Domain=trifrost.land')).toBe(true);
            expect(cookies.outgoing[0].includes('Secure')).toBe(true);
            expect(cookies.outgoing[0].includes('HttpOnly')).toBe(true);
            expect(cookies.outgoing[0].includes('SameSite=Strict')).toBe(true);
        });

        it('Overrides global config with provided options in set()', () => {
            const cookies = new Cookies(createCtx(), {
                path: '/default',
                domain: 'trifrost.land',
                secure: true,
                samesite: 'Lax',
            });
            cookies.set('custom', 'value', {
                path: '/override',
                samesite: 'None',
                secure: false,
            });
            const out = cookies.outgoing[0];
            expect(out.includes('Path=/override')).toBe(true);
            expect(out.includes('SameSite=None')).toBe(true);
            expect(out.includes('Secure')).toBe(true);
            expect(out.includes('Path=/default')).toBe(false);
            expect(out.includes('Domain=trifrost.land')).toBe(true);
        });

        it('Does not add Secure if explicitly disabled and no SameSite=None', () => {
            const cookies = new Cookies(createCtx(), {});
            cookies.set('nonsecure', 'nope', {
                secure: false,
                samesite: 'Lax',
            });
            const out = cookies.outgoing[0];
            expect(out.includes('SameSite=Lax')).toBe(true);
            expect(out.includes('Secure')).toBe(false);
        });

        it('Uses Expires value and ignores maxage when both provided', () => {
            const expires = addUTC(new Date(), 3600, 'seconds');
            const cookies = new Cookies(createCtx(), {});
            cookies.set('session', 'open', {
                maxage: 5,
                expires,
            });
            expect(cookies.outgoing[0].includes(`Expires=${expires.toUTCString()}`)).toBe(true);
            expect(cookies.outgoing[0].includes('Max-Age=5')).toBe(false);
        });
    });

    describe('del', () => {
        it('Deletes a cookie', () => {
            const cookies = new Cookies(createCtx('remove=me; donotremove=me'), {});
            const now = new Date();
            cookies.del('remove', {path: '/'});
            expect(cookies.outgoing).toEqual([
                `remove=; Expires=${addUTC(now, 0, 'seconds').toUTCString()}; Max-Age=0; Path=/; Secure`,
            ]);
            cookies.del('donotremove');
            expect(cookies.outgoing).toEqual([
                `remove=; Expires=${addUTC(now, 0, 'seconds').toUTCString()}; Max-Age=0; Path=/; Secure`,
                `donotremove=; Expires=${addUTC(now, 0, 'seconds').toUTCString()}; Max-Age=0; Secure`,
            ]);
        });

        it('Does nothing if cookie is not in incoming or outgoing', () => {
            const cookies = new Cookies(createCtx(), {});
            cookies.del('ghost');
            expect(cookies.outgoing).toEqual([]);
        });

        it('Does nothing if providing invalid val', () => {
            const cookies = new Cookies(createCtx(), {});
            cookies.set('shouldRemove', 'yup');
            for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                cookies.del(el as unknown as string);
            }
            expect(cookies.outgoing).toEqual([
                'shouldRemove=yup; Secure',
            ]);
        });

        it('Removes cookie from outgoing if previously set', () => {
            const cookies = new Cookies(createCtx(), {});
            cookies.set('shouldRemove', 'yup');
            expect(cookies.outgoing).toEqual([
                'shouldRemove=yup; Secure',
            ]);
            cookies.del('shouldRemove');
            expect(cookies.outgoing).toEqual([]);
            const all = cookies.all();
            expect('shouldRemove' in all).toBe(false);
        });

        it('Removes from combined map after deletion', () => {
            const cookies = new Cookies(createCtx('killme=now'), {});
            expect(cookies.get('killme')).toBe('now');
            cookies.del('killme');
            expect(cookies.get('killme')).toBe(null);
        });

        it('Supports path and domain in deletion options', () => {
            const cookies = new Cookies(createCtx('target=zap'), {});
            const now = new Date();
            cookies.del('target', {path: '/admin', domain: 'foo.com'});
            expect(cookies.outgoing).toEqual([
                `target=; Expires=${addUTC(now, 0, 'seconds').toUTCString()}; Max-Age=0; Path=/admin; Domain=foo.com; Secure`,
            ]);
        });


        it('Gracefully re-deletes a cookie that was already deleted', () => {
            const cookies = new Cookies(createCtx('dup=1'), {});
            const now = new Date();
            cookies.del('dup');
            cookies.del('dup');
            expect(cookies.get('dup')).toBe(null);
            expect(cookies.all()).toEqual({});
            expect(cookies.outgoing).toEqual([
                `dup=; Expires=${addUTC(now, 0, 'seconds').toUTCString()}; Max-Age=0; Secure`,
            ]);
        });

        it('Uses global config if delete options are not passed', () => {
            const cookies = new Cookies(
                createCtx('x=123'),
                {path: '/global', domain: 'global.com'}
            );
            const now = new Date();
            cookies.del('x');
            expect(cookies.outgoing).toEqual([
                `x=; Expires=${addUTC(now, 0, 'seconds').toUTCString()}; Max-Age=0; Path=/global; Domain=global.com; Secure`,
            ]);
        });

        describe('prefix', () => {
            it('Deletes all cookies matching a prefix pattern', () => {
                const cookies = new Cookies(createCtx('user.1=val1; user.2=val2; auth=token'), {});
                const now = new Date();
                cookies.del({prefix: 'user.'});
                expect(cookies.get('user.1')).toBe(null);
                expect(cookies.get('user.2')).toBe(null);
                expect(cookies.get('auth')).toBe('token');
                expect(cookies.outgoing).toEqual([
                    `user.1=; Expires=${addUTC(now, 0, 'seconds').toUTCString()}; Max-Age=0; Secure`,
                    `user.2=; Expires=${addUTC(now, 0, 'seconds').toUTCString()}; Max-Age=0; Secure`,
                ]);
            });
        
            it('Ignores cookies that do not match prefix', () => {
                const cookies = new Cookies(createCtx('foo=1; bar=2'), {});
                cookies.del({prefix: 'baz'});
                expect(cookies.get('foo')).toBe('1');
                expect(cookies.get('bar')).toBe('2');
                expect(cookies.outgoing).toEqual([]);
            });
        
            it('Supports deletion with path/domain options', () => {
                const cookies = new Cookies(createCtx('x.1=foo; x.2=bar'), {});
                const now = new Date();
                cookies.del({prefix: 'x.'}, {path: '/somewhere', domain: 'trifrost.land'});
                expect(cookies.outgoing).toEqual([
                    `x.1=; Expires=${addUTC(now, 0, 'seconds').toUTCString()}; Max-Age=0; Path=/somewhere; Domain=trifrost.land; Secure`,
                    `x.2=; Expires=${addUTC(now, 0, 'seconds').toUTCString()}; Max-Age=0; Path=/somewhere; Domain=trifrost.land; Secure`,
                ]);
            });

            it('Handles prefix that matches nothing without error', () => {
                const cookies = new Cookies(createCtx('a=1; b=2'), {});
                cookies.del({prefix: 'user.'});
                expect(cookies.get('a')).toBe('1');
                expect(cookies.get('b')).toBe('2');
                expect(cookies.outgoing).toEqual([]);
            });

            it('Deletes both incoming and newly set cookies matching prefix', () => {
                const cookies = new Cookies(createCtx('x.1=foo; y.1=bar'), {});
                const now = new Date();
                cookies.set('x.2', 'new');
                cookies.set('z.1', 'keep');
                cookies.del({prefix: 'x.'});
                expect(cookies.get('x.1')).toBe(null);
                expect(cookies.get('x.2')).toBe(null);
                expect(cookies.get('z.1')).toBe('keep');
                expect(cookies.outgoing).toEqual([
                    'z.1=keep; Secure',
                    `x.1=; Expires=${addUTC(now, 0, 'seconds').toUTCString()}; Max-Age=0; Secure`,
                ]);
            });              
        });
    });

    describe('delAll', () => {
        it('Should remove all incoming cookies', () => {
            const cookies = new Cookies(createCtx('a=1; b=2; c=3'), {});
            const now = new Date();
            cookies.delAll({path: '/'});
            expect(cookies.outgoing).toEqual([
                `a=; Expires=${addUTC(now, 0, 'seconds').toUTCString()}; Max-Age=0; Path=/; Secure`,
                `b=; Expires=${addUTC(now, 0, 'seconds').toUTCString()}; Max-Age=0; Path=/; Secure`,
                `c=; Expires=${addUTC(now, 0, 'seconds').toUTCString()}; Max-Age=0; Path=/; Secure`,
            ]);
        });

        it('Does nothing if there are no incoming cookies', () => {
            const cookies = new Cookies(createCtx(), {});
            cookies.delAll();
            expect(cookies.outgoing).toEqual([]);
        });

        it('Also deletes cookies that were set after construction', () => {
            const cookies = new Cookies(createCtx('foo=bar'), {});
            cookies.set('baz', '123');
            cookies.delAll();
            expect(cookies.outgoing).toEqual([
                `foo=; Expires=${addUTC(new Date(), 0, 'seconds').toUTCString()}; Max-Age=0; Secure`,
            ]);
        });

        it('Does not add deletion to outgoing if cookie not incoming or set', () => {
            const cookies = new Cookies(createCtx(), {});
            cookies.del('phantom');
            expect(cookies.outgoing).toEqual([]);
        });

        it('Applies global config if no delAll options provided', () => {
            const cookies = new Cookies(
                createCtx('one=1; two=2'),
                {path: '/default', domain: 'trifrost.land'}
            );
            cookies.delAll();
            expect(cookies.outgoing).toEqual([
                `one=; Expires=${addUTC(new Date(), 0, 'seconds').toUTCString()}; Max-Age=0; Path=/default; Domain=trifrost.land; Secure`,
                `two=; Expires=${addUTC(new Date(), 0, 'seconds').toUTCString()}; Max-Age=0; Path=/default; Domain=trifrost.land; Secure`,
            ]);
        });

        it('Overrides global config with passed options', () => {
            const cookies = new Cookies(
                createCtx('x=1; y=2'),
                {path: '/global', domain: 'default.com'}
            );
            cookies.delAll({path: '/override', domain: 'override.com'});
            expect(cookies.outgoing).toEqual([
                `x=; Expires=${addUTC(new Date(), 0, 'seconds').toUTCString()}; Max-Age=0; Path=/override; Domain=override.com; Secure`,
                `y=; Expires=${addUTC(new Date(), 0, 'seconds').toUTCString()}; Max-Age=0; Path=/override; Domain=override.com; Secure`,
            ]);
        });
    });

    describe('all', () => {
        it('Reflects incoming and outgoing cookies', () => {
            const cookies = new Cookies(createCtx('x=old'), {});
            cookies.set('y', 'new');
            expect(cookies.all()).toEqual({x: 'old', y: 'new'});
        });

        it('Returns empty object when no incoming or outgoing cookies', () => {
            const cookies = new Cookies(createCtx(), {});
            expect(cookies.all()).toEqual({});
        });

        it('Reflects state changes after set and delete', () => {
            const cookies = new Cookies(createCtx('a=1; b=2'), {});
            cookies.set('c', '3');
            cookies.del('a');
            expect(cookies.all()).toEqual({b: '2', c: '3'});
        });

        it('Returns a shallow clone, not internal reference', () => {
            const cookies = new Cookies(createCtx('safe=yes'), {});
            const all = cookies.all();
            /* @ts-ignore */
            all.safe = 'nope';
            expect(cookies.get('safe')).toBe('yes');
        });

        it('Reflects decoded incoming values', () => {
            const cookies = new Cookies(createCtx('fancy=spaced%20out'), {});
            expect(cookies.all()).toEqual({fancy: 'spaced out'});
        });

        it('Overwrites reflected value when same cookie is reset', () => {
            const cookies = new Cookies(createCtx('dup=old'), {});
            cookies.set('dup', 'new');
            expect(cookies.all()).toEqual({dup: 'new'});
        });

        it('Reflects prefix deletions accurately', () => {
            const cookies = new Cookies(createCtx('a.1=val; a.2=val; b=keep'), {});
            cookies.del({prefix: 'a.'});
            expect(cookies.all()).toEqual({b: 'keep'});
        });          
    });

    describe('sign', () => {
        const SECRET = 'supersecretkey';

        afterEach(() => {
            vi.restoreAllMocks();
        });
    
        it('Signs a simple string value', async () => {
            const cookies = new Cookies(createCtx(), {});

            const spy = vi.spyOn(cookies as any, 'generateHMAC');
            
            const signed = await cookies.sign('myValue', SECRET);
            expect(signed).toBe('myValue.ec170e2339b0499348dbf01a1da4986ef4006b9101ac6a3b562938dfa4bd3498');

            expect(spy).toHaveBeenNthCalledWith(1, 'myValue', SECRET, {algorithm: 'SHA-256'});
        });
    
        it('Signs a numeric value', async () => {
            const cookies = new Cookies(createCtx(), {});
            
            const spy = vi.spyOn(cookies as any, 'generateHMAC');

            const signed = await cookies.sign(12345, SECRET);
            expect(signed).toBe('12345.3d853b4a00b52d20adcc177e400d8482200b200c8b80780e46f7eec61313b97e');

            expect(spy).toHaveBeenNthCalledWith(1, '12345', SECRET, {algorithm: 'SHA-256'});
        });
    
        it('Returns empty string when secret is invalid', async () => {
            const cookies = new Cookies(createCtx(), {});
            const spy = vi.spyOn(cookies as any, 'generateHMAC');

            for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {    
                const emptySecret = await cookies.sign('data', el as string);
                expect(emptySecret).toBe('');
            }

            expect(spy).not.toHaveBeenCalled();
        });

        it('Returns empty string when value is not a string or number', async () => {
            const cookies = new Cookies(createCtx(), {});
            const spy = vi.spyOn(cookies as any, 'generateHMAC');

            for (const el of [
                ...CONSTANTS.NOT_STRING,
                ...CONSTANTS.NOT_NUMERIC,
            ]) {
                if (Number.isFinite(el) || typeof el === 'string') continue;
                const emptySecret = await cookies.sign(el as string, SECRET);
                expect(emptySecret).toBe('');
            }
            expect(spy).not.toHaveBeenCalled();
        });
    
        it('Supports different algorithms when signing', async () => {
            const cookies = new Cookies(createCtx(), {});
            
            const spy = vi.spyOn(cookies as any, 'generateHMAC');

            const signed512 = await cookies.sign('sha512data', SECRET, {algorithm: 'SHA-512'});
            // eslint-disable-next-line max-len
            expect(signed512).toBe('sha512data.059a7015a544ce9c6e040cfa49b0ef7d26638c60535fce5388546ba311c0d5a34708e966a5d9e243bc54312ca589afa9b97ca8d2130a0b32fbf11abb3598996d');
    
            const signed384 = await cookies.sign('sha384data', SECRET, {algorithm: 'SHA-384'});
            // eslint-disable-next-line max-len
            expect(signed384).toBe('sha384data.4b8b69328ac5ec9c681678fe772c1259329a532f9d6c0146f4871217176cd39feeb2e6c2b374f858eab2bd0cc39c55ca');

            const signed256 = await cookies.sign('sha256data', SECRET, {algorithm: 'SHA-256'});
            expect(signed256).toBe('sha256data.1542e2c5ed44813da6cd5176b885a5c5deb2baf925f8fbba35cce91121bc47e0');

            expect(spy).toHaveBeenNthCalledWith(1, 'sha512data', SECRET, {algorithm: 'SHA-512'});
            expect(spy).toHaveBeenNthCalledWith(2, 'sha384data', SECRET, {algorithm: 'SHA-384'});
            expect(spy).toHaveBeenNthCalledWith(3, 'sha256data', SECRET, {algorithm: 'SHA-256'});
        });
    
        it('Does not modify outgoing cookies when only signing', async () => {
            const cookies = new Cookies(createCtx(), {});
            await cookies.sign('notsaved', SECRET);
            expect(cookies.outgoing).toEqual([]);
        });

        it('Reuses cached keys to avoid repeated import', async () => {
            const cookies = new Cookies(createCtx(), {});
            const spy = vi.spyOn(crypto.subtle, 'importKey');
            await cookies.sign('value1', SECRET);
            await cookies.sign('value2', SECRET);
            expect(spy).toHaveBeenCalledTimes(1);
        });

        it('Falls back to SHA-256 if invalid algorithm is passed to generateHMAC', async () => {
            const cookies = new Cookies(createCtx(), {});
            const spy = vi.spyOn(cookies as any, 'generateHMAC');
            const spyKey = vi.spyOn(crypto.subtle, 'importKey');
        
            // Pass invalid algo
            const signed = await cookies.sign('fallbackTest', 'secret', {algorithm: 'INVALID' as any});
        
            expect(signed.startsWith('fallbackTest.')).toBe(true);
            expect(spy).toHaveBeenCalledWith('fallbackTest', 'secret', {algorithm: 'INVALID'});
            expect(spyKey).toHaveBeenCalledWith(
                'raw',
                new Uint8Array([115, 101, 99, 114, 101, 116]),
                {
                    hash: {name: 'SHA-256'},
                    name: 'HMAC',
                },
                false,
                ['sign']
            );
        });        
    });

    describe('verify', () => {
        const SECRET = 'supersecretkey';
        const WRONG_SECRET = 'wrongsecret';

        it('Verifies a correctly signed value', async () => {
            const cookies = new Cookies(createCtx(), {});
            const signed = await cookies.sign('secureValue', SECRET);
            const verified = await cookies.verify(signed, SECRET);
            expect(verified).toBe('secureValue');
        });

        it('Fails verification with wrong secret', async () => {
            const cookies = new Cookies(createCtx(), {});
            const signed = await cookies.sign('importantData', SECRET);
            const verified = await cookies.verify(signed, WRONG_SECRET);
            expect(verified).toBe(null);
        });

        it('Fails verification if value is tampered', async () => {
            const cookies = new Cookies(createCtx(), {});
            const signed = await cookies.sign('original', SECRET);
            const tampered = signed.replace('original', 'hacked');
            const spy = vi.spyOn(cookies as any, 'generateHMAC');
            const verified = await cookies.verify(tampered, SECRET);
            expect(verified).toBe(null);
            expect(spy).toHaveBeenNthCalledWith(1, 'hacked', SECRET, {algorithm: 'SHA-256'});
        });

        it('Fails verification if signature is tampered', async () => {
            const cookies = new Cookies(createCtx(), {});
            const signed = await cookies.sign('data', SECRET);
            const tampered = signed.replace(/\.[0-9a-f]+$/, '.badbadbad');
            const spy = vi.spyOn(cookies as any, 'generateHMAC');
            const verified = await cookies.verify(tampered, SECRET);
            expect(verified).toBe(null);
            expect(spy).toHaveBeenNthCalledWith(1, 'data', SECRET, {algorithm: 'SHA-256'});
        });

        it('Supports multi-secret rotation', async () => {
            const cookies = new Cookies(createCtx(), {});
            const signed = await cookies.sign('rotatingValue', SECRET);
            const spy = vi.spyOn(cookies as any, 'generateHMAC');
            const verified = await cookies.verify(signed, [WRONG_SECRET, SECRET]);
            expect(verified).toBe('rotatingValue');
            expect(spy).toHaveBeenNthCalledWith(1, 'rotatingValue', WRONG_SECRET, {algorithm: 'SHA-256'});
            expect(spy).toHaveBeenNthCalledWith(2, 'rotatingValue', SECRET, {algorithm: 'SHA-256'});
        });

        it('Handles invalid input gracefully', async () => {
            const cookies = new Cookies(createCtx(), {});
            const spy = vi.spyOn(cookies as any, 'generateHMAC');
            for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                expect(await cookies.verify(el as string, SECRET)).toBe(null);
            }
            expect(spy).not.toHaveBeenCalled();
        });

        it('Handles malformed secret gracefully', async () => {
            const cookies = new Cookies(createCtx(), {});
            const signed = await cookies.sign('rotatingValue', SECRET);
            const spy = vi.spyOn(cookies as any, 'generateHMAC');
            for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                if (Array.isArray(el)) continue;
                expect(await cookies.verify(signed, el as string)).toBe(null);
            }

            for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                expect(await cookies.verify(signed, [el as string])).toBe(null);
            }
            expect(spy).not.toHaveBeenCalled();
        });

        it('Does not modify outgoing cookies when only verifying', async () => {
            const cookies = new Cookies(createCtx(), {});
            const signed = await cookies.sign('check', SECRET);
            await cookies.verify(signed, SECRET);
            expect(cookies.outgoing).toEqual([]);
        });

        it('Handles very long secrets correctly', async () => {
            const longSecret = 'x'.repeat(1000);
            const cookies = new Cookies(createCtx(), {});
            const signed = await cookies.sign('longtest', longSecret);
            const verified = await cookies.verify(signed, longSecret);
            expect(verified).toBe('longtest');
        });
        
        it('Handles very long values correctly', async () => {
            const longValue = 'data'.repeat(1000);
            const cookies = new Cookies(createCtx(), {});
            const signed = await cookies.sign(longValue, SECRET);
            const verified = await cookies.verify(signed, SECRET);
            expect(verified).toBe(longValue);
        });

        describe('Mixed secret/algorithm array', () => {
            const SECRET_SHA256 = 'secret256';
            const SECRET_SHA512 = 'secret512';
        
            afterEach(() => {
                vi.restoreAllMocks();
            });
        
            it('Verifies against correct secret + algorithm combo', async () => {
                const cookies = new Cookies(createCtx(), {});
                const signed512 = await cookies.sign('secure512', SECRET_SHA512, {algorithm: 'SHA-512'});
                const spy = vi.spyOn(cookies as any, 'generateHMAC');        
                const verified = await cookies.verify(signed512, [
                    {val: WRONG_SECRET, algorithm: 'SHA-512'},
                    {val: SECRET_SHA512, algorithm: 'SHA-512'},
                ]);
                expect(verified).toBe('secure512');
                expect(spy).toHaveBeenNthCalledWith(1, 'secure512', WRONG_SECRET, {algorithm: 'SHA-512'});
                expect(spy).toHaveBeenNthCalledWith(2, 'secure512', SECRET_SHA512, {algorithm: 'SHA-512'});
            });
        
            it('Fails when algorithm is mismatched even if secret matches', async () => {
                const cookies = new Cookies(createCtx(), {});        
                const signed512 = await cookies.sign('secure512', SECRET_SHA512, {algorithm: 'SHA-512'});
                const spy = vi.spyOn(cookies as any, 'generateHMAC');
                const verified = await cookies.verify(signed512, [
                    {val: SECRET_SHA512, algorithm: 'SHA-256'}, /* wrong algo */
                    {val: WRONG_SECRET, algorithm: 'SHA-512'},
                ]);
                expect(verified).toBe(null);
                expect(spy).toHaveBeenNthCalledWith(1, 'secure512', SECRET_SHA512, {algorithm: 'SHA-256'});
                expect(spy).toHaveBeenNthCalledWith(2, 'secure512', WRONG_SECRET, {algorithm: 'SHA-512'});
            });
        
            it('Falls back to plain string secrets with shared options', async () => {
                const cookies = new Cookies(createCtx(), {});
                const signed256 = await cookies.sign('secure256', SECRET_SHA256, {algorithm: 'SHA-256'});
        
                const spy = vi.spyOn(cookies as any, 'generateHMAC');
                const verified = await cookies.verify(signed256, [WRONG_SECRET, SECRET_SHA256], {algorithm: 'SHA-256'});
                expect(verified).toBe('secure256');
                expect(spy).toHaveBeenNthCalledWith(1, 'secure256', WRONG_SECRET, {algorithm: 'SHA-256'});
                expect(spy).toHaveBeenNthCalledWith(2, 'secure256', SECRET_SHA256, {algorithm: 'SHA-256'});
            });
        
            it('Supports mixed array of strings and {val, algo} objects', async () => {
                const cookies = new Cookies(createCtx(), {});        
                const signed512 = await cookies.sign('mixedValue', SECRET_SHA512, {algorithm: 'SHA-512'});
                const spy = vi.spyOn(cookies as any, 'generateHMAC');
                const verified = await cookies.verify(signed512, [
                    WRONG_SECRET,
                    {val: SECRET_SHA512, algorithm: 'SHA-512'},
                ], {algorithm: 'SHA-256'});
        
                expect(verified).toBe('mixedValue');
                expect(spy).toHaveBeenNthCalledWith(1, 'mixedValue', WRONG_SECRET, {algorithm: 'SHA-256'});
                expect(spy).toHaveBeenNthCalledWith(2, 'mixedValue', SECRET_SHA512, {algorithm: 'SHA-512'});
            });
        
            it('Returns null if no matching secret+algo combo is found', async () => {
                const cookies = new Cookies(createCtx(), {});        
                const signed256 = await cookies.sign('noMatch', SECRET_SHA256, {algorithm: 'SHA-256'});
        
                const spy = vi.spyOn(cookies as any, 'generateHMAC');
                const verified = await cookies.verify(signed256, [
                    {val: SECRET_SHA512, algorithm: 'SHA-512'}, /* wrong algo */
                    {val: WRONG_SECRET, algorithm: 'SHA-256'},
                ]);
        
                expect(verified).toBe(null);
                expect(spy).toHaveBeenNthCalledWith(1, 'noMatch', SECRET_SHA512, {algorithm: 'SHA-512'});
                expect(spy).toHaveBeenNthCalledWith(2, 'noMatch', WRONG_SECRET, {algorithm: 'SHA-256'});
            });

            it('Falls back to global verify options if secret object has no algorithm', async () => {
                const cookies = new Cookies(createCtx(), {});
                const signed = await cookies.sign('verifyFallback', 'testsecret', {algorithm: 'SHA-512'});
            
                const spy = vi.spyOn(cookies as any, 'generateHMAC');
                const verified = await cookies.verify(signed, [{val: 'testsecret'} as any], {algorithm: 'SHA-512'});
                expect(verified).toBe('verifyFallback');
                expect(spy).toHaveBeenNthCalledWith(1, 'verifyFallback', 'testsecret', {algorithm: 'SHA-512'});
            });            
        });
    });

    describe('sign + set + verify', () => {
        const SECRET = 'supersecretkey';
    
        it('Signs and sets a cookie, then verifies from combined map', async () => {
            const cookies = new Cookies(createCtx(), {});
            const signed = await cookies.sign('userId42', SECRET);
            cookies.set('session', signed);
    
            expect(cookies.outgoing).toEqual([
                'session=userId42.a17e1fa187e5bef2af6e7c2c455364dfcd46ad8f09523100474125567d58d5b3; Secure',
            ]);
    
            const savedCookie = cookies.get('session');
            const decodedCookie = decodeURIComponent(savedCookie!);
    
            const verified = await cookies.verify(decodedCookie, SECRET);
            expect(verified).toBe('userId42');
        });
    
        it('Properly reflects signed cookie in all() state', async () => {
            const cookies = new Cookies(createCtx(), {});
            const signed = await cookies.sign('mydata', SECRET);
            cookies.set('signedCookie', signed);
            const allCookies = cookies.all();
            expect(allCookies).toEqual({
                signedCookie: 'mydata.eac56be63e1bed8b240035ec47620bcfba2972cf0920e17e6bf264db54b8e9b6',
            });
        });
        
        it('Fails verify if outgoing cookie is tampered before verify', async () => {
            const cookies = new Cookies(createCtx(), {});
            const signed = await cookies.sign('safeData', SECRET);
            cookies.set('secureCookie', signed);
        
            const outgoing = cookies.outgoing[0];
            const tampered = outgoing.replace('safeData', 'hackedData').split('=')[1].split(';')[0];
        
            const verified = await cookies.verify(decodeURIComponent(tampered), SECRET);
            expect(verified).toBe(null);
        });        
    });
});
