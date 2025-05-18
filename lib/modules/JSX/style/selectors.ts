/**
 * MARK: Pseudo Class
 */
export const HOVER = ':hover';
export const ACTIVE = ':active';
export const FOCUS = ':focus';
export const FOCUS_VISIBLE = ':focus-visible';
export const FOCUS_WITHIN = ':focus-within';
export const DISABLED = ':disabled';
export const CHECKED = ':checked';
export const VISITED = ':visited';
export const FIRST_CHILD = ':first-child';
export const LAST_CHILD = ':last-child';

/**
 * MARK: Pseudo Elem
 */
export const BEFORE = '::before';
export const AFTER = '::after';
export const PLACEHOLDER = '::placeholder';
export const SELECTION = '::selection';

/**
 * MARK: Media Queries
 */

export const MEDIA_MOBILE = '@media (max-width: 600px)';
export const MEDIA_TABLET = '@media (max-width: 1199px)';
export const MEDIA_DESKTOP = '@media (min-width: 1200px)';
export const MEDIA_TABLET_ONLY = '@media (min-width: 601px) and (max-width: 1199px)';
export const MEDIA_REDUCED_MOTION = '@media (prefers-reduced-motion: reduce)';
export const MEDIA_DARK = '@media (prefers-color-scheme: dark)';
export const MEDIA_LIGHT = '@media (prefers-color-scheme: light)';
export const MEDIA_HOVER = '@media (hover: hover)';
export const MEDIA_TOUCH_ONLY = '@media (hover: none)';

/**
 * MARK: Dynamic Selector
 */

export const NTH_CHILD = (i:number|string) => ':nth-child(' + i + ')';
export const NTH_LAST_CHILD = (i:number|string) => ':nth-last-child(' + i + ')';
export const NTH_OF_TYPE = (i:number|string) => ':nth-of-type(' + i + ')';
export const NTH_LAST_OF_TYPE = (i:number|string) => ':nth-last-of-type(' + i + ')';
export const NOT = (selector:string) => ':not(' + selector + ')';
export const IS = (selector:string) => ':is(' + selector + ')';
export const WHERE = (selector:string) => ':where(' + selector + ')';
export const HAS = (selector:string) => ':has(' + selector + ')';
export const DIR = (dir:'ltr' | 'rtl') => ':dir(' + dir + ')';

/**
 * MARK: Groupings
 */

export const PSEUDO = {
    hover: HOVER,
    active: ACTIVE,
    focus: FOCUS,
    focusVisible: FOCUS_VISIBLE,
    focusWithin: FOCUS_WITHIN,
    disabled: DISABLED,
    checked: CHECKED,
    visited: VISITED,
    firstChild: FIRST_CHILD,
    lastChild: LAST_CHILD,
};
  
export const ELEMENTS = {
    before: BEFORE,
    after: AFTER,
    placeholder: PLACEHOLDER,
    selection: SELECTION,
};
  
export const DYNAMIC = {
    nthChild: NTH_CHILD,
    nthLastChild: NTH_LAST_CHILD,
    nthOfType: NTH_OF_TYPE,
    nthLastOfType: NTH_LAST_OF_TYPE,
    not: NOT,
    is: IS,
    where: WHERE,
    has: HAS,
    dir: DIR,
};

export const SELECTOR = {
    ...PSEUDO,
    ...ELEMENTS,
    ...DYNAMIC,
};

export const MEDIA = {
    mobile: MEDIA_MOBILE,
    tablet: MEDIA_TABLET,
    tabletOnly: MEDIA_TABLET_ONLY,
    desktop: MEDIA_DESKTOP,
    reducedMotion: MEDIA_REDUCED_MOTION,
    dark: MEDIA_DARK,
    light: MEDIA_LIGHT,
    hover: MEDIA_HOVER,
    touch: MEDIA_TOUCH_ONLY,
};
