import {describe, it, expect} from 'vitest';
import {Style, MARKER} from '../../../../../lib/modules/JSX/style/Style';

describe('Modules - JSX - style - Style', () => {
    it('Exports the correct style marker', () => {
        expect(MARKER).toBe('__TRIFROST_STYLE_MARKER__');
    });

    it('Style() returns the marker string', () => {
        expect(Style()).toBe(MARKER);
    });

    it('Marker is a string and can be replaced in HTML', () => {
        const html = `<head>${Style()}</head>`;
        const rendered = html.replace(MARKER, '<style>.foo{}</style>');
        expect(rendered).toBe('<head><style>.foo{}</style></head>');
    });

    it('Marker can be detected using includes()', () => {
        const html = `<div>${Style()}</div>`;
        expect(html.includes(MARKER)).toBe(true);
    });
});
