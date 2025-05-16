import {describe, it, expect, vi} from 'vitest';
import {parseBody} from '../../../../lib/utils/BodyParser/Request';
import {MockContext} from '../../../MockContext';
import CONSTANTS from '../../../constants';

function makeRequest (contentType: string, body: BodyInit): Request {
    return new Request('http://localhost', {
        method: 'POST',
        headers: {'content-type': contentType},
        body,
    });
}

describe('Utils - BodyParser - Request', () => {
    it('Returns empty object for non-request', async () => {
        for (const el of CONSTANTS.NOT_OBJECT_WITH_EMPTY) {
            const ctx = new MockContext({headers: {}});
            const res = await parseBody(ctx, el as unknown as null);
            expect(res).toEqual({});
        }
    });

    it('Falls back to raw buffer on unknown content-type', async () => {
        const ctx = new MockContext({headers: {'content-type': 'application/unknown'}});
        const req = makeRequest('application/unknown', 'hello raw');
        const res = await parseBody(ctx, req);
        expect(res.raw).toBeInstanceOf(ArrayBuffer);
    });

    it('Falls back to raw buffer on invalid content-type', async () => {
        for (const el of CONSTANTS.NOT_STRING) {
            const ctx = new MockContext({headers: {'content-type': el as string}});
            const req = makeRequest('application/unknown', 'hello raw');
            const res = await parseBody(ctx, req);
            expect(res.raw).toBeInstanceOf(ArrayBuffer);
        }
    });

    it('Falls back to raw buffer on missing content-type', async () => {
        const ctx = new MockContext({headers: {}});
        const req = makeRequest('application/unknown', 'hello raw');
        const res = await parseBody(ctx, req);
        expect(res.raw).toBeInstanceOf(ArrayBuffer);
    });

    describe('application/json', () => {
        it('Parses', async () => {
            const ctx = new MockContext({headers: {'content-type': 'application/json'}});
            const req = makeRequest('application/json', JSON.stringify({foo: 'bar'}));
            const res = await parseBody(ctx, req);
            expect(res).toEqual({foo: 'bar'});
        });

        it('Handles content-type with charset', async () => {
            const ctx = new MockContext({headers: {'content-type': 'application/json; charset=utf-8'}});
            const req = makeRequest('application/json; charset=utf-8', JSON.stringify({foo: 'bar'}));
            const res = await parseBody(ctx, req);
            expect(res).toEqual({foo: 'bar'});
        });

        it('Returns empty object on malformed json', async () => {
            const ctx = new MockContext({headers: {'content-type': 'application/json'}});
            ctx.logger.debug = vi.fn();
            const req = makeRequest('application/json', '{bad json');
            const res = await parseBody(ctx, req);
            expect(res).toEqual({});
            
            expect(ctx.logger.debug).toHaveBeenCalledWith(
                'parseBody: Failed to parse',
                expect.objectContaining({
                    type: 'application/json',
                    msg: expect.stringContaining('Expected property name or \'}\' in JSON'),
                })
            );
        });

        it('Handles broken body stream', async () => {
            const req = new Request('http://localhost', {
                method: 'POST',
                headers: {'content-type': 'application/json'},
                body: 'fake',
            });

            Object.defineProperty(req, 'json', {
                value: async () => {
                    throw new Error('stream failure');
                },
            });
    
            const ctx = new MockContext({headers: {'content-type': 'application/json'}});
            ctx.logger.debug = vi.fn();
    
            const res = await parseBody(ctx, req);
            expect(res).toEqual({});
            expect(ctx.logger.debug).toHaveBeenCalledWith('parseBody: Failed to parse', {type: 'application/json', msg: 'stream failure'});
        });
    });

    describe('text/json', () => {
        it('Parses', async () => {
            const ctx = new MockContext({headers: {'content-type': 'text/json'}});
            const req = makeRequest('text/json', JSON.stringify({foo: 'bar'}));
            const res = await parseBody(ctx, req);
            expect(res).toEqual({foo: 'bar'});
        });

        it('Handles content-type with charset', async () => {
            const ctx = new MockContext({headers: {'content-type': 'text/json; charset=utf-8'}});
            const req = makeRequest('text/json; charset=utf-8', JSON.stringify({foo: 'bar'}));
            const res = await parseBody(ctx, req);
            expect(res).toEqual({foo: 'bar'});
        });

        it('Returns empty object on malformed json', async () => {
            const ctx = new MockContext({headers: {'content-type': 'text/json'}});
            ctx.logger.debug = vi.fn();
            const req = makeRequest('text/json', '{bad json');
            const res = await parseBody(ctx, req);
            expect(res).toEqual({});
            expect(ctx.logger.debug).toHaveBeenCalledWith(
                'parseBody: Failed to parse',
                expect.objectContaining({
                    type: 'text/json',
                    msg: expect.stringContaining('Expected property name or \'}\' in JSON'),
                })
            );
        });

        it('Handles broken body stream', async () => {
            const req = new Request('http://localhost', {
                method: 'POST',
                headers: {'content-type': 'text/json'},
                body: 'fake',
            });

            Object.defineProperty(req, 'json', {
                value: async () => {
                    throw new Error('stream failure');
                },
            });
    
            const ctx = new MockContext({headers: {'content-type': 'text/json'}});
            ctx.logger.debug = vi.fn();
    
            const res = await parseBody(ctx, req);
            expect(res).toEqual({});
            expect(ctx.logger.debug).toHaveBeenCalledWith('parseBody: Failed to parse', {type: 'text/json', msg: 'stream failure'});
        });
    });

    describe('application/ld+json', () => {
        it('Parses', async () => {
            const ctx = new MockContext({headers: {'content-type': 'application/ld+json'}});
            const req = makeRequest('application/ld+json', JSON.stringify({foo: 'bar'}));
            const res = await parseBody(ctx, req);
            expect(res).toEqual({foo: 'bar'});
        });

        it('Handles content-type with charset', async () => {
            const ctx = new MockContext({headers: {'content-type': 'application/ld+json; charset=utf-8'}});
            const req = makeRequest('application/ld+json; charset=utf-8', JSON.stringify({foo: 'bar'}));
            const res = await parseBody(ctx, req);
            expect(res).toEqual({foo: 'bar'});
        });

        it('Returns empty object on malformed json', async () => {
            const ctx = new MockContext({headers: {'content-type': 'application/ld+json'}});
            ctx.logger.debug = vi.fn();
            const req = makeRequest('application/ld+json', '{bad json');
            const res = await parseBody(ctx, req);
            expect(res).toEqual({});
            expect(ctx.logger.debug).toHaveBeenCalledWith(
                'parseBody: Failed to parse',
                expect.objectContaining({
                    type: 'application/ld+json',
                    msg: expect.stringContaining('Expected property name or \'}\' in JSON'),
                })
            );
        });

        it('Handles broken body stream', async () => {
            const req = new Request('http://localhost', {
                method: 'POST',
                headers: {'content-type': 'application/ld+json'},
                body: 'fake',
            });

            Object.defineProperty(req, 'json', {
                value: async () => {
                    throw new Error('stream failure');
                },
            });
    
            const ctx = new MockContext({headers: {'content-type': 'application/ld+json'}});
            ctx.logger.debug = vi.fn();
    
            const res = await parseBody(ctx, req);
            expect(res).toEqual({});
            expect(ctx.logger.debug).toHaveBeenCalledWith(
                'parseBody: Failed to parse',
                {type: 'application/ld+json', msg: 'stream failure'}
            );
        });
    });

    describe('application/x-ndjson', () => {
        it('Parses line-delimited JSON correctly', async () => {
            const ndjson = '{"id":1,"name":"Gizmo"}\n{"id":2,"name":"Chip"}';
            const ctx = new MockContext({headers: {'content-type': 'application/x-ndjson'}});
            const req = makeRequest('application/x-ndjson', ndjson);
        
            const res = await parseBody<{raw:{id:number; name:string}[]}>(ctx, req);
        
            expect(Array.isArray(res.raw)).toBe(true);
            expect(res.raw).toHaveLength(2);
            expect(res.raw[0]).toEqual({id: 1, name: 'Gizmo'});
            expect(res.raw[1]).toEqual({id: 2, name: 'Chip'});
        });

        it('Returns {} and logs on malformed NDJSON', async () => {
            const ndjson = '{"id":1,"name":"Gizmo"}\n{id:2 name="Chip"}';
            const ctx = new MockContext({headers: {'content-type': 'application/x-ndjson'}});
            ctx.logger.debug = vi.fn();
            const req = makeRequest('application/x-ndjson', ndjson);
        
            const res = await parseBody(ctx, req);
            expect(res).toEqual({});
            expect(ctx.logger.debug).toHaveBeenCalledWith(
                'parseBody: Failed to parse',
                expect.objectContaining({
                    type: 'application/x-ndjson',
                    msg: expect.stringContaining('Expected property name or \'}\' in JSON'),
                })
            );
        });

        it('Handles stream error on .text()', async () => {
            const req = new Request('http://localhost', {
                method: 'POST',
                headers: {'content-type': 'application/x-ndjson'},
                body: 'fake',
            });
        
            Object.defineProperty(req, 'text', {
                value: async () => {
                    throw new Error('stream failure');
                },
            });
        
            const ctx = new MockContext({headers: {'content-type': 'application/x-ndjson'}});
            ctx.logger.debug = vi.fn();
        
            const res = await parseBody(ctx, req);
            expect(res).toEqual({});
            expect(ctx.logger.debug).toHaveBeenCalledWith('parseBody: Failed to parse', {
                type: 'application/x-ndjson',
                msg: 'stream failure',
            });
        });        
    });

    describe('text/plain', () => {
        it('Parses', async () => {
            const ctx = new MockContext({headers: {'content-type': 'text/plain'}});
            const req = makeRequest('text/plain', 'hello world');
            const res = await parseBody(ctx, req);
            expect(res).toEqual({raw: 'hello world'});
        });

        it('Handles broken body stream', async () => {
            const req = new Request('http://localhost', {
                method: 'POST',
                headers: {'content-type': 'text/plain'},
                body: 'fake',
            });

            Object.defineProperty(req, 'text', {
                value: async () => {
                    throw new Error('stream failure');
                },
            });
    
            const ctx = new MockContext({headers: {'content-type': 'text/plain'}});
            ctx.logger.debug = vi.fn();
    
            const res = await parseBody(ctx, req);
            expect(res).toEqual({});
            expect(ctx.logger.debug).toHaveBeenCalledWith('parseBody: Failed to parse', {type: 'text/plain', msg: 'stream failure'});
        });
    });

    describe('text/html', () => {
        it('Parses', async () => {
            const ctx = new MockContext({headers: {'content-type': 'text/html'}});
            const req = makeRequest('text/html', 'hello world');
            const res = await parseBody(ctx, req);
            expect(res).toEqual({raw: 'hello world'});
        });

        it('Handles stream error on .text()', async () => {
            const req = new Request('http://localhost', {
                method: 'POST',
                headers: {'content-type': 'text/html'},
                body: 'fake',
            });

            Object.defineProperty(req, 'text', {
                value: async () => {
                    throw new Error('broken pipe');
                },
            });
    
            const ctx = new MockContext({headers: {'content-type': 'text/html'}});
            ctx.logger.debug = vi.fn();
    
            const res = await parseBody(ctx, req);
            expect(res).toEqual({});
            expect(ctx.logger.debug).toHaveBeenCalledWith(
                'parseBody: Failed to parse',
                {type: 'text/html', msg: 'broken pipe'}
            );
        });
    });

    describe('text/csv', () => {
        it('Parses', async () => {
            const ctx = new MockContext({headers: {'content-type': 'text/csv'}});
            const req = makeRequest('text/csv', 'hello world');
            const res = await parseBody(ctx, req);
            expect(res).toEqual({raw: 'hello world'});
        });

        it('Handles stream error on .text()', async () => {
            const req = new Request('http://localhost', {
                method: 'POST',
                headers: {'content-type': 'text/csv'},
                body: 'fake',
            });

            Object.defineProperty(req, 'text', {
                value: async () => {
                    throw new Error('cannot decode CSV');
                },
            });
    
            const ctx = new MockContext({headers: {'content-type': 'text/csv'}});
            ctx.logger.debug = vi.fn();
    
            const res = await parseBody(ctx, req);
            expect(res).toEqual({});
            expect(ctx.logger.debug).toHaveBeenCalledWith(
                'parseBody: Failed to parse',
                {type: 'text/csv', msg: 'cannot decode CSV'}
            );
        });
    });

    describe('application/xml', () => {
        it('Parses', async () => {
            const ctx = new MockContext({headers: {'content-type': 'application/xml'}});
            const req = makeRequest('application/xml', 'hello world');
            const res = await parseBody(ctx, req);
            expect(res).toEqual({raw: 'hello world'});
        });

        it('Handles stream error on .text()', async () => {
            const req = new Request('http://localhost', {
                method: 'POST',
                headers: {'content-type': 'application/xml'},
                body: 'fake',
            });

            Object.defineProperty(req, 'text', {
                value: async () => {
                    throw new Error('cannot decode XML');
                },
            });
    
            const ctx = new MockContext({headers: {'content-type': 'application/xml'}});
            ctx.logger.debug = vi.fn();
    
            const res = await parseBody(ctx, req);
            expect(res).toEqual({});
            expect(ctx.logger.debug).toHaveBeenCalledWith(
                'parseBody: Failed to parse',
                {type: 'application/xml', msg: 'cannot decode XML'}
            );
        });
    });

    describe('text/xml', () => {
        it('Parses', async () => {
            const ctx = new MockContext({headers: {'content-type': 'text/xml'}});
            const req = makeRequest('text/xml', 'hello world');
            const res = await parseBody(ctx, req);
            expect(res).toEqual({raw: 'hello world'});
        });

        it('Handles stream error on .text()', async () => {
            const req = new Request('http://localhost', {
                method: 'POST',
                headers: {'content-type': 'text/xml'},
                body: 'fake',
            });

            Object.defineProperty(req, 'text', {
                value: async () => {
                    throw new Error('cannot decode xml');
                },
            });
    
            const ctx = new MockContext({headers: {'content-type': 'text/xml'}});
            ctx.logger.debug = vi.fn();
    
            const res = await parseBody(ctx, req);
            expect(res).toEqual({});
            expect(ctx.logger.debug).toHaveBeenCalledWith(
                'parseBody: Failed to parse',
                {type: 'text/xml', msg: 'cannot decode xml'}
            );
        });
    });

    describe('application/x-www-form-urlencoded', () => {
        it('Parses', async () => {
            const ctx = new MockContext({headers: {'content-type': 'application/x-www-form-urlencoded'}});
            const req = makeRequest('application/x-www-form-urlencoded', 'foo=bar&x=1');
            const res = await parseBody(ctx, req);
            expect(res).toEqual({foo: 'bar', x: 1});
        });

        it('Handles failure of formData()', async () => {
            const req = new Request('http://localhost', {
                method: 'POST',
                headers: {'content-type': 'application/x-www-form-urlencoded'},
                body: 'fake',
            });

            Object.defineProperty(req, 'formData', {
                value: async () => {
                    throw new Error('form decode failure');
                },
            });
    
            const ctx = new MockContext({headers: {'content-type': 'application/x-www-form-urlencoded'}});
            ctx.logger.debug = vi.fn();
    
            const res = await parseBody(ctx, req);
            expect(res).toEqual({});
            expect(ctx.logger.debug).toHaveBeenCalledWith(
                'parseBody: Failed to parse',
                {type: 'application/x-www-form-urlencoded', msg: 'form decode failure'}
            );
        });
    });

    describe('multipart/form-data', () => {
        it('Parses', async () => {
            const form = new FormData();
            form.append('name', 'Gizmo');
            const file = new File(['avatar content'], 'avatar.png', {type: 'image/png'});
            form.append('avatar', file);

            const req = new Request('http://localhost', {
                method: 'POST',
                body: form,
            });

            const ctx = new MockContext({headers: {'content-type': req.headers.get('content-type') || ''}});
            const res = await parseBody<{name:string; avatar: File}>(ctx, req);

            expect(res.name).toBe('Gizmo');
            expect(res.avatar).toBeInstanceOf(File);
            expect((res.avatar as File).name).toBe('avatar.png');
        });

        it('Handles failure of formData()', async () => {
            const req = new Request('http://localhost', {
                method: 'POST',
                headers: {'content-type': 'multipart/form-data'},
                body: 'fake',
            });

            Object.defineProperty(req, 'formData', {
                value: async () => {
                    throw new Error('multipart parse failure');
                },
            });
    
            const ctx = new MockContext({headers: {'content-type': 'multipart/form-data'}});
            ctx.logger.debug = vi.fn();
    
            const res = await parseBody(ctx, req);
            expect(res).toEqual({});
            expect(ctx.logger.debug).toHaveBeenCalledWith(
                'parseBody: Failed to parse',
                {type: 'multipart/form-data', msg: 'multipart parse failure'}
            );
        });
    });
});
