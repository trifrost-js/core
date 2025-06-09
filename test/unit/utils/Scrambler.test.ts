import {describe, it, expect} from 'vitest';
import {createScrambler, OMIT_PRESETS} from '../../../lib/utils/Scrambler';
import CONSTANTS from '../../constants';

describe('scrambler', () => {
    const baseInput = {
        id: 1,
        user: {
            name: 'Alice',
            password: 'hunter2',
            profile: {
                email: 'alice@example.com',
                note: 'SSN is 123-45-6789',
            },
        },
        metadata: {
            token: 'abc123',
        },
        records: [
            {token: 'x1', secret: 'a'},
            {token: 'x2', secret: 'b'},
        ],
        extra: {
            message: 'Call +1 (800) 123-4567 for help',
        },
    };

    it('Produces consistent output across multiple invocations', () => {
        const s = createScrambler({checks: ['user.password']});
        const input = {user: {password: 'secret', name: 'Bob'}};

        const r1 = s(input);
        const r2 = s(input);

        expect(r1).toEqual(r2);
        expect(r1).not.toBe(r2);
    });

    it('Produces consistent output across multiple invocations with pattern', () => {
        const s = createScrambler({checks: [{valuePattern: /secret/}]});
        const input = {user: {password: 'secret', name: 'Bob'}};

        const r1 = s(input);
        const r2 = s(input);

        expect(r1).toEqual(r2);
        expect(r1).not.toBe(r2);
        expect(input).toEqual({user: {password: 'secret', name: 'Bob'}});
    });

    it('Scrambles different inputs correctly using same scrambler', () => {
        const s = createScrambler({checks: [{global: 'password'}]});

        const a = {account: {password: 'a'}};
        const b = {profile: {password: 'b'}};

        expect(s(a)).toEqual({account: {password: '***'}});
        expect(s(b)).toEqual({profile: {password: '***'}});
    });

    it('Does not crash on frozen objects by cloning them', () => {
        const frozen = Object.freeze({password: 'secret'});
        const input = {account: frozen};

        const s = createScrambler({checks: ['account.password']});
        const r = s(input);

        expect(r.account.password).toBe('***');
    });

    it('works with tuple-like array fields', () => {
        const input = {coords: [100, 200, 'secret']};
        const s = createScrambler({checks: [{valuePattern: /secret/}]});
        const r = s(input);
        expect(r.coords).toEqual([100, 200, '***']);
    });

    it('Returns original object if nothing matches', () => {
        const input = {safe: true};
        const s = createScrambler({checks: ['nonexistent.key']});
        const r = s(input);
        expect(r).toBe(input);
    });

    it('Returns original object when no checks', () => {
        const input = {safe: true};
        const s = createScrambler({checks: []});
        const r = s(input);
        expect(r).toBe(input);
    });

    it('Returns original object when passed a non-array checks', () => {
        for (const el of CONSTANTS.NOT_ARRAY) {
            const input = {safe: true};
            const s = createScrambler({checks: el as any});
            const r = s(input);
            expect(r).toBe(input);
        }
    });

    it('mutates only affected branch', () => {
        const input = {
            user: {name: 'Alice', password: 'secret'},
            meta: {env: 'prod'},
        };
        const s = createScrambler({checks: ['user.password']});
        const r = s(input);

        expect(r.user).not.toBe(input.user);
        expect(r.meta).toBe(input.meta);
    });

    it('Scrambles flat and dotted keys', () => {
        const s = createScrambler({checks: ['id', 'user.password']});
        const r = s(baseInput);
        expect(r.id).toBe('***');
        expect(r.user.password).toBe('***');
    });

    it('Scrambles global (wildcard) keys', () => {
        const s = createScrambler({checks: [{global: 'token'}]});
        const r = s(baseInput);
        expect(r.metadata.token).toBe('***');
        expect(r.records[0].token).toBe('***');
    });

    it('Scrambles deep keys in nested objects', () => {
        const s = createScrambler({checks: ['user.profile.note']});
        const r = s(baseInput);
        expect(r.user.profile.note).toBe('***');
    });

    it('Scrambles matching regex values', () => {
        const s = createScrambler({checks: [{valuePattern: /\d{3}-\d{2}-\d{4}/}]});
        const r = s(baseInput);
        expect(r.user.profile.note).toBe('SSN is ***');
    });

    it('Scrambles phone number via pattern', () => {
        const s = createScrambler({checks: [{valuePattern: /\+1\s?\(\d{3}\)\s?\d{3}-\d{4}/}]});
        const r = s(baseInput);
        expect(r.extra.message).toBe('Call *** for help');
    });

    it('Applies patterns when keys/globals do not match', () => {
        const s = createScrambler({
            checks: [
                'nonexistent.key',
                {global: 'foo'},
                {valuePattern: /\+1\s?\(\d{3}\)\s?\d{3}-\d{4}/},
            ],
        });
        const r = s(baseInput);
        expect(r.extra.message).toBe('Call *** for help');
    });

    it('Replaces all matching substrings using replaceAll', () => {
        const input = {
            message: 'User SSN 123-45-6789 and backup 987-65-4321',
        };
        const s = createScrambler({checks: [{valuePattern: /\d{3}-\d{2}-\d{4}/}]});
        const r = s(input);
        expect(r.message).toBe('User SSN *** and backup ***');
    });

    it('Scrambles both key and pattern separately', () => {
        const input = {
            credentials: {
                password: 'pass123',
                note: 'SSN is 321-54-9876',
            },
        };
        const s = createScrambler({
            checks: ['credentials.password', {valuePattern: /\d{3}-\d{2}-\d{4}/}],
        });
        const r = s(input);
        expect(r.credentials.password).toBe('***');
        expect(r.credentials.note).toBe('SSN is ***');
    });

    it('Ensures key-based scramble takes precedence over pattern', () => {
        const input = {
            profile: {
                username: 'JohnDoe',
                bio: 'JohnDoe is a cool guy',
            },
        };
        const s = createScrambler({
            checks: ['profile.username', {valuePattern: /JohnDoe/}],
        });
        const r = s(input);
        expect(r.profile.username).toBe('***');
        expect(r.profile.bio).toBe('*** is a cool guy');
    });

    it('Scrambles values inside array of objects', () => {
        const input = {
            items: [{id: 1, token: 'a'}, {id: 2, token: 'b'}],
        };
        const s = createScrambler({checks: ['items.token']});
        const r = s(input);
        expect(r.items[0].token).toBe('***');
        expect(r.items[1].token).toBe('***');
    });

    it('Preserves sparse arrays', () => {
        /* eslint-disable-next-line no-sparse-arrays */
        const input = {items: ['a', , 'c']};
        const s = createScrambler({checks: ['items.1']});
        const r = s(input);
        expect(r.items).toHaveLength(3);
        expect(1 in r.items).toBe(false);
    });

    it('Skips non-object elements in array during deep traversal', () => {
        const input = {
            data: {
                list: [
                    {meta: {value: 'a'}},
                    'plain string',
                    {meta: {value: 'b'}},
                ],
            },
        };
        const s = createScrambler({checks: ['data.list.meta.value']});
        const r = s(input);
        /* @ts-ignore */
        expect(r.data.list[0].meta.value).toBe('***');
        expect(r.data.list[1]).toBe('plain string');
        /* @ts-ignore */
        expect(r.data.list[2].meta.value).toBe('***');
    });

    it('Handles deeply nested structures without crashing', () => {
        let deep = {value: 'secret'};
        /* @ts-ignore */
        for (let i = 0; i < 20; i++) deep = {nested: deep};
        /* eslint-disable-next-line max-len */
        const s = createScrambler({checks: ['nested.nested.nested.nested.nested.nested.nested.nested.nested.nested.nested.nested.nested.nested.nested.nested.nested.nested.nested.nested.value']});
        const r = s(deep);
        let cursor = r;
        /* @ts-ignore */
        for (let i = 0; i < 20; i++) cursor = cursor.nested;
        expect(cursor.value).toBe('***');
    });

    it('scrambles a large object using default preset', () => {
        const date = new Date();
        const input = {
            user: {
                id: 42,
                first_name: 'Alice',
                last_name: 'Smith',
                email: 'alice@example.com',
                username: 'asmith',
                password: 'superSecret123',
                session_id: 'abc-123',
                preferences: {
                    theme: 'dark',
                    notifications: true,
                },
            },
            auth: {
                token: 'abc.def.ghi',
                bearer: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
                method: 'oauth',
            },
            meta: {
                phone: '+1 (555) 123-4567',
                ssn: '123-45-6789',
                card: '4111 1111 1111 1111',
                country: 'US',
                ip: '192.168.0.1',
            },
            log: {
                message: 'User alice@example.com logged in with SSN 123-45-6789',
                level: 'info',
                timestamp: date,
            },
        };

        const s = createScrambler({checks: OMIT_PRESETS.default});
        expect(s(input)).toEqual({
            user: {
                id: 42,
                first_name: '***',
                last_name: '***',
                email: '***',
                username: 'asmith',
                password: '***',
                session_id: '***',
                preferences: {
                    theme: 'dark',
                    notifications: true,
                },
            },
            auth: {
                token: '***',
                bearer: '***',
                method: 'oauth',
            },
            meta: {
                phone: '***',
                ssn: '***',
                card: '***',
                country: 'US',
                ip: '192.168.0.1',
            },
            log: {
                message: 'User *** logged in with SSN ***',
                level: 'info',
                timestamp: date,
            },
        });
    });

    it('scrambles a large object using default preset and custom repl', () => {
        const date = new Date();
        const input = {
            user: {
                id: 42,
                first_name: 'Alice',
                last_name: 'Smith',
                email: 'alice@example.com',
                username: 'asmith',
                password: 'superSecret123',
                session_id: 'abc-123',
                preferences: {
                    theme: 'dark',
                    notifications: true,
                },
            },
            auth: {
                token: 'abc.def.ghi',
                bearer: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
                method: 'oauth',
            },
            meta: {
                phone: '+1 (555) 123-4567',
                ssn: '123-45-6789',
                card: '4111 1111 1111 1111',
                country: 'US',
                ip: '192.168.0.1',
            },
            log: {
                message: 'User alice@example.com logged in with SSN 123-45-6789',
                level: 'info',
                timestamp: date,
            },
        };

        const s = createScrambler({replacement: 'WOOPTIEDOO', checks: OMIT_PRESETS.default});
        expect(s(input)).toEqual({
            user: {
                id: 42,
                first_name: 'WOOPTIEDOO',
                last_name: 'WOOPTIEDOO',
                email: 'WOOPTIEDOO',
                username: 'asmith',
                password: 'WOOPTIEDOO',
                session_id: 'WOOPTIEDOO',
                preferences: {
                    theme: 'dark',
                    notifications: true,
                },
            },
            auth: {
                token: 'WOOPTIEDOO',
                bearer: 'WOOPTIEDOO',
                method: 'oauth',
            },
            meta: {
                phone: 'WOOPTIEDOO',
                ssn: 'WOOPTIEDOO',
                card: 'WOOPTIEDOO',
                country: 'US',
                ip: '192.168.0.1',
            },
            log: {
                message: 'User WOOPTIEDOO logged in with SSN WOOPTIEDOO',
                level: 'info',
                timestamp: date,
            },
        });
    });
});
