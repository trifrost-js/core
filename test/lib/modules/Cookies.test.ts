import {describe, it, expect} from 'vitest';
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

        it('Does not delete cookies that were set after construction', () => {
            const cookies = new Cookies(createCtx('foo=bar'), {});
            cookies.set('baz', '123');
            cookies.delAll();
            expect(cookies.outgoing).toEqual([
                'baz=123; Secure',
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
    });
});
