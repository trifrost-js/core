const KEBAB_REGEX = /[A-Z]/g;
const KEBAB_VENDOR_REGEX = /^(webkit|moz|ms|o)([A-Z])/;

/**
 * Known css functions
 */
const CSS_FUNCTIONS = new Set([
    'blur',
    'brightness',
    'calc',
    'clamp',
    'contrast',
    'counter',
    'counters',
    'drop-shadow',
    'env',
    'fit-content',
    'grayscale',
    'hsl',
    'hsla',
    'invert',
    'max',
    'min',
    'opacity',
    'repeat',
    'rgb',
    'rgba',
    'rotate',
    'saturate',
    'scale',
    'sepia',
    'translate',
    'url',
    'var',
    'attr',
    'image',
    'conic-gradient',
    'repeating-linear-gradient',
]);

/**
 * Known HTML Tags
 */
export const HTML_TAGS = new Set([
    'html',
    'body',
    'div',
    'span',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'hr',
    'p',
    'a',
    'img',
    'ul',
    'ol',
    'li',
    'table',
    'thead',
    'tbody',
    'tfoot',
    'tr',
    'th',
    'td',
    'form',
    'input',
    'button',
    'label',
    'select',
    'option',
    'textarea',
    'section',
    'article',
    'aside',
    'nav',
    'header',
    'footer',
    'main',
    'figure',
    'figcaption',
    'canvas',
    'video',
    'audio',
    'iframe',
    'picture',
    'source',
    'blockquote',
    'code',
    'pre',
    'strong',
    'em',
    'b',
    'i',
    'u',
    'small',
    'sub',
    'sup',
    'mark',
    'cite',
    'q',
    'abbr',
    'address',
    'details',
    'summary',
    'fieldset',
    'legend',
    'meter',
    'progress',
    'time',
    'output',
    'dialog',
    /* SVG */
    'svg',
    'path',
    'g',
    'mask',
    'text',
    'tspan',
    'textPath',
    'line',
    'rect',
    'circle',
    'ellipse',
    'polyline',
    'defs',
    'symbol',
    'use',
    'clipPath',
    'pattern',
    'linearGradient',
    'radialGradient',
    'stop',
    'filter',
    'feBlend',
    'feColorMatrix',
    'feComponentTransfer',
    'feComposite',
    'feConvolveMatrix',
    'feDiffuseLighting',
    'feDisplacementMap',
    'feDropShadow',
    'feFlood',
    'feGaussianBlur',
    'feImage',
    'feMerge',
    'feMergeNode',
    'feMorphology',
    'feOffset',
    'feSpecularLighting',
    'feTile',
    'feTurbulence',
]);

/**
 * Prebuilt camel to kebab lookup table of most-used props
 *
 * @note This lookup table will be checked first, if not there we will use the regex replacer for this
 */
export const CAMEL_TO_KEBAB_LUT: Record<string, string> = {
    /* Layout & Flex/Grid */
    display: 'display',
    position: 'position',
    top: 'top',
    right: 'right',
    bottom: 'bottom',
    left: 'left',
    zIndex: 'z-index',
    overflow: 'overflow',
    overflowX: 'overflow-x',
    overflowY: 'overflow-y',
    visibility: 'visibility',
    boxSizing: 'box-sizing',
    flex: 'flex',
    flexDirection: 'flex-direction',
    flexWrap: 'flex-wrap',
    justifyContent: 'justify-content',
    alignItems: 'align-items',
    alignContent: 'align-content',
    flexGrow: 'flex-grow',
    flexShrink: 'flex-shrink',
    flexBasis: 'flex-basis',
    order: 'order',
    gap: 'gap',
    rowGap: 'row-gap',
    columnGap: 'column-gap',
    grid: 'grid',
    gridTemplateColumns: 'grid-template-columns',
    gridTemplateRows: 'grid-template-rows',
    gridColumn: 'grid-column',
    gridRow: 'grid-row',
    gridArea: 'grid-area',
    /* Box Model */
    margin: 'margin',
    marginTop: 'margin-top',
    marginRight: 'margin-right',
    marginBottom: 'margin-bottom',
    marginLeft: 'margin-left',
    padding: 'padding',
    paddingTop: 'padding-top',
    paddingRight: 'padding-right',
    paddingBottom: 'padding-bottom',
    paddingLeft: 'padding-left',
    border: 'border',
    borderTop: 'border-top',
    borderRight: 'border-right',
    borderBottom: 'border-bottom',
    borderLeft: 'border-left',
    borderRadius: 'border-radius',
    boxShadow: 'box-shadow',
    /* Typography */
    font: 'font',
    fontFamily: 'font-family',
    fontSize: 'font-size',
    fontWeight: 'font-weight',
    fontStyle: 'font-style',
    lineHeight: 'line-height',
    letterSpacing: 'letter-spacing',
    textAlign: 'text-align',
    textDecoration: 'text-decoration',
    textTransform: 'text-transform',
    whiteSpace: 'white-space',
    wordBreak: 'word-break',
    overflowWrap: 'overflow-wrap',
    /* Color & Background */
    color: 'color',
    background: 'background',
    backgroundColor: 'background-color',
    backgroundImage: 'background-image',
    backgroundSize: 'background-size',
    backgroundPosition: 'background-position',
    backgroundRepeat: 'background-repeat',
    backgroundAttachment: 'background-attachment',
    backgroundClip: 'background-clip',
    opacity: 'opacity',
    /* Border Enhancements */
    borderColor: 'border-color',
    borderStyle: 'border-style',
    borderWidth: 'border-width',
    /* Transition & Animation */
    transition: 'transition',
    transitionDuration: 'transition-duration',
    transitionTimingFunction: 'transition-timing-function',
    animation: 'animation',
    animationName: 'animation-name',
    animationDuration: 'animation-duration',
    animationTimingFunction: 'animation-timing-function',
    animationFillMode: 'animation-fill-mode',
    /* Transform & Effects */
    transform: 'transform',
    transformOrigin: 'transform-origin',
    perspective: 'perspective',
    filter: 'filter',
    willChange: 'will-change',
    /* Interactions */
    cursor: 'cursor',
    pointerEvents: 'pointer-events',
    userSelect: 'user-select',
    resize: 'resize',
    /* Scroll & Sticky */
    scrollBehavior: 'scroll-behavior',
    overscrollBehavior: 'overscroll-behavior',
    /* Modern Layout Enhancers */
    aspectRatio: 'aspect-ratio',
    placeItems: 'place-items',
    placeContent: 'place-content',
    placeSelf: 'place-self',
    inset: 'inset',
    insetBlock: 'inset-block',
    insetInline: 'inset-inline',
};

/**
 * Converts a string to kebab case for use in styling
 *
 * @param {string} key - string to convert
 */
export function toKebab(key: string): string {
    if (CAMEL_TO_KEBAB_LUT[key]) return CAMEL_TO_KEBAB_LUT[key];

    /* variables (--xxx) */
    if (key[0] === '-' && key[1] === '-') return key;

    /* Normalize vendor prefix (e.g. webkitTransform → -webkit-transform) */
    if (KEBAB_VENDOR_REGEX.test(key))
        key = key.replace(KEBAB_VENDOR_REGEX, (_, prefix, first) => '-' + prefix.toLowerCase() + '-' + first.toLowerCase());

    /* Convert and add to camel to kebab lookup table */
    const result = key.replace(KEBAB_REGEX, m => '-' + m.toLowerCase());
    CAMEL_TO_KEBAB_LUT[key] = result;
    return result;
}

/**
 * Casts a style object to a string
 *
 * @param {Record<string, unknown>} obj - Props to render
 */
export function styleToString(obj: Record<string, unknown> | null): string | null {
    if (Object.prototype.toString.call(obj) !== '[object Object]') return null;

    let style: string | null = '';
    for (const attr in obj) {
        const attr_val = obj[attr];
        if (attr_val !== undefined && attr_val !== null) {
            let str = typeof attr_val === 'string' ? attr_val : String(attr_val);

            /* If wrapped in quotes and contains a CSS function, unwrap it */
            if (str[0] === "'" || str[0] === '"') {
                const fn_idx = str.indexOf('(');
                if (fn_idx && CSS_FUNCTIONS.has(str.slice(1, fn_idx))) {
                    str = str.slice(1, -1);
                }
            }

            if (str) style += toKebab(attr) + ':' + str + ';';
        }
    }
    return style ? style.slice(0, -1) : null;
}
