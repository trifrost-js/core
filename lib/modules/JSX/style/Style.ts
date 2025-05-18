import {type JSXElement} from '../types';

export const MARKER = '__TRIFROST_STYLE_MARKER__';

export const Style = ():JSXElement => MARKER as unknown as JSXElement;