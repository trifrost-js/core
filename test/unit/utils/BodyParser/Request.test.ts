import {describe, it, expect, vi} from 'vitest';
import {parseBody} from '../../../../lib/utils/BodyParser/Request';
import {MockContext} from '../../../MockContext';
import {DEFAULT_BODY_PARSER_OPTIONS} from '../../../../lib/utils/BodyParser/types';
import * as Uint8Parser from '../../../../lib/utils/BodyParser/Uint8Array';

function makeRequest(contentType: string, body: BodyInit): Request {
    return new Request('http://localhost', {
        method: 'POST',
        headers: {'content-type': contentType},
        body,
    });
}

describe('Utils - BodyParser - Request', () => {
    it('Returns empty object for non-request input', async () => {
        const ctx = new MockContext();
        const result = await parseBody(ctx, null as unknown as Request, DEFAULT_BODY_PARSER_OPTIONS);
        expect(result).toEqual({});
    });

    it('Parses the body into Uint8Array and delegates to Uint8 parser', async () => {
        const body = JSON.stringify({foo: 'bar'});
        const req = makeRequest('application/json', body);
        const ctx = new MockContext({headers: {'content-type': 'application/json'}});

        const spy = vi.spyOn(Uint8Parser, 'parseBody').mockResolvedValue({foo: 'bar'});

        const result = await parseBody(ctx, req, DEFAULT_BODY_PARSER_OPTIONS);
        expect(result).toEqual({foo: 'bar'});

        expect(spy).toHaveBeenCalledTimes(1);
        expect(spy.mock.calls[0][0]).toBe(ctx); // ctx
        expect(spy.mock.calls[0][2]).toBe(DEFAULT_BODY_PARSER_OPTIONS); // config

        const passedBuffer = spy.mock.calls[0][1];
        expect(passedBuffer).toBeInstanceOf(Uint8Array);
        expect(new TextDecoder().decode(passedBuffer)).toBe(body);

        spy.mockRestore();
    });

    it('Handles invalid body gracefully', async () => {
        const req = new Request('http://localhost', {
            method: 'POST',
            headers: {'content-type': 'application/json'},
            body: 'invalid',
        });

        Object.defineProperty(req, 'arrayBuffer', {
            value: async () => {
                throw new Error('fail');
            },
        });

        const ctx = new MockContext({headers: {'content-type': 'application/json'}});
        ctx.logger.debug = vi.fn();

        const result = await parseBody(ctx, req, DEFAULT_BODY_PARSER_OPTIONS);
        expect(result).toEqual({});
        expect(ctx.logger.debug).not.toHaveBeenCalled();
    });
});
