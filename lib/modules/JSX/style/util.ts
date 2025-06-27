const KEBAB_REGEX = /[A-Z]/g;
const KEBAB_VENDOR_REGEX = /^(webkit|moz|ms|o)([A-Z])/;

const RGX_FUNCTION =
    /\b(blur|brightness|calc|clamp|contrast|counter|counters|drop-shadow|env|fit-content|grayscale|hsl|hsla|invert|max|min|opacity|repeat|rgb|rgba|rotate|saturate|scale|sepia|translate|url|var)\(/i;

/**
 * Known HTML Tags
 */
export const HTML_TAGS = {
    html: true,
    body: true,
    div: true,
    span: true,
    h1: true,
    h2: true,
    h3: true,
    h4: true,
    h5: true,
    h6: true,
    hr: true,
    p: true,
    a: true,
    img: true,
    ul: true,
    ol: true,
    li: true,
    table: true,
    thead: true,
    tbody: true,
    tfoot: true,
    tr: true,
    th: true,
    td: true,
    form: true,
    input: true,
    button: true,
    label: true,
    select: true,
    option: true,
    textarea: true,
    section: true,
    article: true,
    aside: true,
    nav: true,
    header: true,
    footer: true,
    main: true,
    figure: true,
    figcaption: true,
    canvas: true,
    video: true,
    audio: true,
    iframe: true,
    picture: true,
    source: true,
    blockquote: true,
    code: true,
    pre: true,
    strong: true,
    em: true,
    b: true,
    i: true,
    u: true,
    small: true,
    sub: true,
    sup: true,
    mark: true,
    cite: true,
    q: true,
    abbr: true,
    address: true,
    details: true,
    summary: true,
    fieldset: true,
    legend: true,
    meter: true,
    progress: true,
    time: true,
    output: true,
    svg: true,
    path: true,
    g: true,
    line: true,
    rect: true,
    circle: true,
    ellipse: true,
    polyline: true,
} as const;

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

    /* Normalize vendor prefix (e.g. webkitTransform → -webkit-transform) */
    if (KEBAB_VENDOR_REGEX.test(key)) {
        key = key.replace(KEBAB_VENDOR_REGEX, (_, prefix, first) => '-' + prefix.toLowerCase() + '-' + first.toLowerCase());
    } else if (key[0] === '-' && key[1] === '-') {
        /* Do not kebabe-case variables */
        CAMEL_TO_KEBAB_LUT[key] = key;
        return key;
    }

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
            if ((str[0] === "'" || str[0] === '"') && RGX_FUNCTION.test(str)) str = str.slice(1, -1);

            if (str) style += toKebab(attr) + ':' + str + ';';
        }
    }
    return style ? style.slice(0, -1) : null;
}
