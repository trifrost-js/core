/**
 * MARK: Symbols
 */

/**
 * Context Method
 */
export const Sym_TriFrostMethod = Symbol('TriFrost.Method');

/**
 * Enum-like tag: "middleware", "handler", "router", etc.
 * Useful for debugging or route inspection tooling.
 */
export const Sym_TriFrostType = Symbol('TriFrost.Type');

/**
 * Label or name for a middleware or handler.
 * Useful for debugging or route inspection tooling and generation.
 */
export const Sym_TriFrostName = Symbol('TriFrost.Name');

/**
 * Description for a middleware or handler.
 * Useful for debugging, route inspection tooling and generation.
 */
export const Sym_TriFrostDescription = Symbol('TriFrost.Description');

/**
 * Path for a handler
 * Useful for debugging, route inspection tooling and generation.
 */
export const Sym_TriFrostPath = Symbol('TriFrost.Path');

/**
 * Unhydrated Params for a handler
 * Useful for debugging, route inspection tooling and generation.
 */
export const Sym_TriFrostParams = Symbol('TriFrost.Params');

/**
 * Tag used for meta information
 * Useful for debugging or route inspection tooling.
 */
export const Sym_TriFrostMeta = Symbol('TriFrost.Meta');

/**
 * Logger meta information (created during route registration)
 * Injected in traces during route logging
 */
export const Sym_TriFrostLoggerMeta = Symbol('TriFrost.LoggerMeta');

/**
 * MARK: Method
 */

export enum HttpMethods {
    GET     = 'GET',
    HEAD    = 'HEAD',
    POST    = 'POST',
    PUT     = 'PUT',
    PATCH   = 'PATCH',
    DELETE  = 'DELETE',
    OPTIONS = 'OPTIONS',
}

export type HttpMethod = `${HttpMethods}`;
export const HttpMethodsSet:Set<HttpMethod> = new Set([...Object.values(HttpMethods)]);

export const HttpMethodToNormal:Record<string, HttpMethod> = {
    /* GET */
    get: 'GET',
    GET: 'GET',
    /* POST */
    post: 'POST',
    POST: 'POST',
    /* PUT */
    put: 'PUT',
    PUT: 'PUT',
    /* PATCH */
    patch: 'PATCH',
    PATCH: 'PATCH',
    /* DELETE */
    delete: 'DELETE',
    DELETE: 'DELETE',
    /* HEAD */
    head: 'HEAD',
    HEAD: 'HEAD',
    /* OPTIONS */
    options: 'OPTIONS',
    OPTIONS: 'OPTIONS',
};

/**
 * MARK: Mime
 */

export enum MimeTypes {
    AAC_AUDIO                       = 'audio/aac',
    ABIWORD_DOCUMENT                = 'application/x-abiword',
    ANIMATED_PNG                    = 'image/apng',
    APPLE_PKG_INSTALLER             = 'application/vnd.apple.installer+xml',
    ARCHIVE_DOCUMENT                = 'application/x-freearc',
    AVIF_IMAGE                      = 'image/avif',
    AVI                             = 'video/x-msvideo',
    AMAZON_KINDLE_EBOOK             = 'application/vnd.amazon.ebook',
    BINARY                          = 'application/octet-stream',
    BITMAP                          = 'image/bmp',
    BOURNE_SHELL                    = 'application/x-sh',
    BZIP                            = 'application/x-bzip',
    BZIP_2                          = 'application/x-bzip2',
    CD_AUDIO                        = 'application/x-cdf',
    C_SHELL                         = 'application/x-csh',
    CSS                             = 'text/css',
    CSV                             = 'text/csv',
    EPUB                            = 'application/epub+zip',
    FORM_MULTIPART                  = 'multipart/form-data',
    FORM_URLENCODED                 = 'application/x-www-form-urlencoded',
    GZIP                            = 'application/gzip',
    GIF                             = 'image/gif',
    HTML                            = 'text/html',
    ICAL                            = 'text/calendar',
    JAVA_ARCHIVE                    = 'application/java-archive',
    JPG                             = 'image/jpeg',
    JS                              = 'text/javascript',
    JSON                            = 'application/json',
    JSON_LD                         = 'application/ld+json',
    JSON_ND                         = 'application/x-ndjson',
    JSON_TEXT                       = 'text/json', /* Non-Standard */
    MIDI                            = 'audio/midi',
    MP3_AUDIO                       = 'audio/mpeg',
    MP4_VIDEO                       = 'video/mp4',
    MPEG_TRANSPORT                  = 'video/mp2t',
    MPEG_VIDEO                      = 'video/mpeg',
    MS_EXCEL                        = 'application/vnd.ms-excel',
    MS_EXCEL_XML                    = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    MS_FONT                         = 'application/vnd.ms-fontobject',
    MS_ICON                         = 'image/vnd.microsoft.icon',
    MS_POWERPOINT                   = 'application/vns.ms-powerpoint',
    MS_POWERPOINT_XML               = 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    MS_VISIO                        = 'application/vnd.visio',
    MS_WORD_DOC                     = 'application/msword',
    MS_WORD_DOCX                    = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    OPENDOC_PRESENTATION            = 'application/vnd.oasis.opendocument.presentation',
    OPENDOC_SPREADSHEET             = 'application/vnd.oasis.opendocument.spreadsheet',
    OPENDOC_TEXT                    = 'application/vnd.oasis.opendocument.text',
    OGG                             = 'application/ogg',
    OGG_AUDIO                       = 'audio/ogg',
    OGG_VIDEO                       = 'video/ogg',
    OPUS_AUDIO                      = 'audio/opus',
    OPENTYPE_FONT                   = 'font/otf',
    PNG                             = 'image/png',
    PDF                             = 'application/pdf',
    PHP                             = 'application/x-httpd-php',
    RAR_ARCHIVE                     = 'application/vnd.rar',
    RICH_TEXT                       = 'application/rtf',
    SVG                             = 'image/svg+xml',
    TAPE_ARCHIVE                    = 'application/x-tar',
    TEXT                            = 'text/plain',
    TIFF                            = 'image/tiff',
    TRUETYPE_FONT                   = 'font/ttf',
    WAVE_AUDIO                      = 'audio/wav',
    WEBM_AUDIO                      = 'audio/webm',
    WEBM_VIDEO                      = 'video/webm',
    WEBP                            = 'image/webp',
    WEB_OPEN_FONT                   = 'font/woff',
    WEB_OPEN_FONT_2                 = 'font/woff2',
    XHTML                           = 'application/xhtml+xml',
    XML                             = 'application/xml',
    XML_TEXT                        = 'text/xml',
    XUL                             = 'application/vnd.mozilla.xul+xml',
    ZIP_ARCHIVE                     = 'application/zip',
    ZIP7_ARCHIVE                    = 'application/x-7z-compressed',
}

export const ExtensionToMimeType:Map<string, MimeTypes> = new Map([
    ['aac', MimeTypes.AAC_AUDIO],
    ['abw', MimeTypes.ABIWORD_DOCUMENT],
    ['apng', MimeTypes.ANIMATED_PNG],
    ['arc', MimeTypes.ARCHIVE_DOCUMENT],
    ['avif', MimeTypes.AVIF_IMAGE],
    ['avi', MimeTypes.AVI],
    ['azw', MimeTypes.AMAZON_KINDLE_EBOOK],
    ['bin', MimeTypes.BINARY],
    ['bmp', MimeTypes.BITMAP],
    ['bz', MimeTypes.BZIP],
    ['bz2', MimeTypes.BZIP_2],
    ['cda', MimeTypes.CD_AUDIO],
    ['csh', MimeTypes.C_SHELL],
    ['css', MimeTypes.CSS],
    ['csv', MimeTypes.CSV],
    ['doc', MimeTypes.MS_WORD_DOC],
    ['docx', MimeTypes.MS_WORD_DOCX],
    ['eot', MimeTypes.MS_FONT],
    ['epub', MimeTypes.EPUB],
    ['gz', MimeTypes.GZIP],
    ['gif', MimeTypes.GIF],
    ['htm', MimeTypes.HTML],
    ['html', MimeTypes.HTML],
    ['ico', MimeTypes.MS_ICON],
    ['ics', MimeTypes.ICAL],
    ['jar', MimeTypes.JAVA_ARCHIVE],
    ['jpeg', MimeTypes.JPG],
    ['jpg', MimeTypes.JPG],
    ['js', MimeTypes.JS],
    ['json', MimeTypes.JSON],
    ['jsonld', MimeTypes.JSON_LD],
    ['mid', MimeTypes.MIDI],
    ['midi', MimeTypes.MIDI],
    ['mjs', MimeTypes.JS],
    ['mp3', MimeTypes.MP3_AUDIO],
    ['mp4', MimeTypes.MP4_VIDEO],
    ['mpeg', MimeTypes.MPEG_VIDEO],
    ['mpkg', MimeTypes.APPLE_PKG_INSTALLER],
    ['odp', MimeTypes.OPENDOC_PRESENTATION],
    ['ods', MimeTypes.OPENDOC_SPREADSHEET],
    ['odt', MimeTypes.OPENDOC_TEXT],
    ['oga', MimeTypes.OGG_AUDIO],
    ['ogv', MimeTypes.OGG_VIDEO],
    ['ogx', MimeTypes.OGG],
    ['opus', MimeTypes.OPUS_AUDIO],
    ['otf', MimeTypes.OPENTYPE_FONT],
    ['png', MimeTypes.PNG],
    ['pdf', MimeTypes.PDF],
    ['php', MimeTypes.PHP],
    ['ppt', MimeTypes.MS_POWERPOINT],
    ['pptx', MimeTypes.MS_POWERPOINT_XML],
    ['rar', MimeTypes.RAR_ARCHIVE],
    ['rtf', MimeTypes.RICH_TEXT],
    ['sh', MimeTypes.BOURNE_SHELL],
    ['svg', MimeTypes.SVG],
    ['tar', MimeTypes.TAPE_ARCHIVE],
    ['tif', MimeTypes.TIFF],
    ['tiff', MimeTypes.TIFF],
    ['ts', MimeTypes.MPEG_TRANSPORT],
    ['ttf', MimeTypes.TRUETYPE_FONT],
    ['txt', MimeTypes.TEXT],
    ['vsd', MimeTypes.MS_VISIO],
    ['wav', MimeTypes.WAVE_AUDIO],
    ['weba', MimeTypes.WEBM_AUDIO],
    ['webm', MimeTypes.WEBM_VIDEO],
    ['webp', MimeTypes.WEBP],
    ['woff', MimeTypes.WEB_OPEN_FONT],
    ['woff2', MimeTypes.WEB_OPEN_FONT_2],
    ['xhtml', MimeTypes.XHTML],
    ['xls', MimeTypes.MS_EXCEL],
    ['xlsx', MimeTypes.MS_EXCEL_XML],
    ['xml', MimeTypes.XML],
    ['xul', MimeTypes.XUL],
    ['zip', MimeTypes.ZIP_ARCHIVE],
    ['7z', MimeTypes.ZIP7_ARCHIVE],
]);

export type MimeType = `${MimeTypes}`;
export const MimeTypesSet:Set<MimeType> = new Set([...Object.values(MimeTypes)]);

/**
 * MARK: Status
 */

export enum HttpStatuses {
    Continue                        = '100 Continue',
    SwitchingProtocols              = '101 Switching Protocols',
    Processing                      = '102 Processing',
    EarlyHints                      = '103 Early Hints',
    OK                              = '200 OK',
    Created                         = '201 Created',
    Accepted                        = '202 Accepted',
    NonAuthoritativeInformation     = '203 Non-Authoritative Information',
    NoContent                       = '204 No Content',
    ResetContent                    = '205 Reset Content',
    PartialContent                  = '206 Partial Content',
    MultiStatus                     = '207 Multi-Status',
    AlreadyReported                 = '208 Already Reported',
    IMUsed                          = '226 IM Used',
    MultipleChoice                  = '300 Multiple Choices',
    MovedPermanently                = '301 Moved Permanently',
    Found                           = '302 Found',
    SeeOther                        = '303 See Other',
    NotModified                     = '304 Not Modified',
    UseProxy                        = '305 Use Proxy',
    TemporaryRedirect               = '307 Temporary Redirect',
    PermanentRedirect               = '308 Permanent Redirect',
    BadRequest                      = '400 Bad Request',
    Unauthorized                    = '401 Unauthorized',
    PaymentRequired                 = '402 Payment Required',
    Forbidden                       = '403 Forbidden',
    NotFound                        = '404 Not Found',
    MethodNotAllowed                = '405 Method Not Allowed',
    NotAcceptable                   = '406 Not Acceptable',
    ProxyAuthenticationRequired     = '407 Proxy Authentication Required',
    RequestTimeout                  = '408 Request Timeout',
    Conflict                        = '409 Conflict',
    Gone                            = '410 Gone',
    LengthRequired                  = '411 Length Required',
    PreconditionFailed              = '412 Precondition Failed',
    PayloadTooLarge                 = '413 Payload Too Large',
    URITooLong                      = '414 URI Too Long',
    UnsupportedMediaType            = '415 Unsupported Media Type',
    RangeNotSatisfiable             = '416 Range Not Satisfiable',
    ExpectationFailed               = '417 Expectation Failed',
    IMATeapot                       = '418 I\'m a Teapot',
    MisdirectedRequest              = '421 Misdirected Request',
    UnprocessableEntity             = '422 Unprocessable Entity',
    Locked                          = '423 Locked',
    FailedDependency                = '424 Failed Dependency',
    TooEarly                        = '425 Too Early',
    UpgradeRequired                 = '426 Upgrade Required',
    PreconditionRequired            = '428 Precondition Required',
    TooManyRequests                 = '429 Too Many Requests',
    RequestHeaderFieldsTooLarge     = '431 Request Header Fields Too Large',
    LoginTimeout                    = '440 Login Timeout',
    RetryWith                       = '449 Retry With',
    UnavailableForLegalReasons      = '451 Unavailable For Legal Reasons',
    InternalServerError             = '500 Internal Server Error',
    NotImplemented                  = '501 Not Implemented',
    BadGateway                      = '502 Bad Gateway',
    ServiceUnavailable              = '503 Service Unavailable',
    GatewayTimeout                  = '504 Gateway Timeout',
    HttpVersionNotSupported         = '505 HTTP Version Not Supported',
    VariantAlsoNegotiates           = '506 Variant Also Negotiates',
    InsufficientStorage             = '507 Insufficient Storage',
    LoopDetected                    = '508 Loop Detected',
    NotExtended                     = '510 Not Extended',
    NetworkAuthenticationRequired   = '511 Network Authentication Required',
    NetworkReadTimeout              = '598 Network Read Timeout',
    LuckyRequest                    = '777 Lucky Request',
}

export const HttpCodeToStatus = {
    100: HttpStatuses.Continue,
    101: HttpStatuses.SwitchingProtocols,
    102: HttpStatuses.Processing,
    103: HttpStatuses.EarlyHints,
    200: HttpStatuses.OK,
    201: HttpStatuses.Created,
    202: HttpStatuses.Accepted,
    203: HttpStatuses.NonAuthoritativeInformation,
    204: HttpStatuses.NoContent,
    205: HttpStatuses.ResetContent,
    206: HttpStatuses.PartialContent,
    207: HttpStatuses.MultiStatus,
    208: HttpStatuses.AlreadyReported,
    226: HttpStatuses.IMUsed,
    300: HttpStatuses.MultipleChoice,
    301: HttpStatuses.MovedPermanently,
    302: HttpStatuses.Found,
    303: HttpStatuses.SeeOther,
    304: HttpStatuses.NotModified,
    305: HttpStatuses.UseProxy,
    307: HttpStatuses.TemporaryRedirect,
    308: HttpStatuses.PermanentRedirect,
    400: HttpStatuses.BadRequest,
    401: HttpStatuses.Unauthorized,
    402: HttpStatuses.PaymentRequired,
    403: HttpStatuses.Forbidden,
    404: HttpStatuses.NotFound,
    405: HttpStatuses.MethodNotAllowed,
    406: HttpStatuses.NotAcceptable,
    407: HttpStatuses.ProxyAuthenticationRequired,
    408: HttpStatuses.RequestTimeout,
    409: HttpStatuses.Conflict,
    410: HttpStatuses.Gone,
    411: HttpStatuses.LengthRequired,
    412: HttpStatuses.PreconditionFailed,
    413: HttpStatuses.PayloadTooLarge,
    414: HttpStatuses.URITooLong,
    415: HttpStatuses.UnsupportedMediaType,
    416: HttpStatuses.RangeNotSatisfiable,
    417: HttpStatuses.ExpectationFailed,
    418: HttpStatuses.IMATeapot,
    421: HttpStatuses.MisdirectedRequest,
    422: HttpStatuses.UnprocessableEntity,
    423: HttpStatuses.Locked,
    424: HttpStatuses.FailedDependency,
    425: HttpStatuses.TooEarly,
    426: HttpStatuses.UpgradeRequired,
    428: HttpStatuses.PreconditionRequired,
    429: HttpStatuses.TooManyRequests,
    431: HttpStatuses.RequestHeaderFieldsTooLarge,
    440: HttpStatuses.LoginTimeout,
    449: HttpStatuses.RetryWith,
    451: HttpStatuses.UnavailableForLegalReasons,
    500: HttpStatuses.InternalServerError,
    501: HttpStatuses.NotImplemented,
    502: HttpStatuses.BadGateway,
    503: HttpStatuses.ServiceUnavailable,
    504: HttpStatuses.GatewayTimeout,
    505: HttpStatuses.HttpVersionNotSupported,
    506: HttpStatuses.VariantAlsoNegotiates,
    507: HttpStatuses.InsufficientStorage,
    508: HttpStatuses.LoopDetected,
    510: HttpStatuses.NotExtended,
    511: HttpStatuses.NetworkAuthenticationRequired,
    598: HttpStatuses.NetworkReadTimeout,
    777: HttpStatuses.LuckyRequest,
} as const;

export type HttpStatus = `${HttpStatuses}`;
export type HttpStatusCode = keyof typeof HttpCodeToStatus;
export const HttpStatusToCode:Map<HttpStatus, HttpStatusCode> = Object.keys(HttpCodeToStatus).reduce((acc, el) => {
    /* @ts-expect-error Should be good */
    acc.set(HttpCodeToStatus[el] as HttpStatus, el);
    return acc;
}, new Map());

export const httpStatuses:Set<HttpStatus> = new Set([...Object.values(HttpStatuses)]);

/**
 * MARK: Redirect
 */

export enum HttpRedirectStatuses {
    MultipleChoide = HttpStatuses.MultipleChoice,
    MovedPermanently = HttpStatuses.MovedPermanently,
    Found = HttpStatuses.Found,
    SeeOther = HttpStatuses.SeeOther,
    NotModified = HttpStatuses.NotModified,
    TemporaryRedirect = HttpStatuses.TemporaryRedirect,
    PermanentRedirect = HttpStatuses.PermanentRedirect,
}

export const HttpRedirectStatusesToCode = {
    300: HttpStatuses.MultipleChoice,
    301: HttpStatuses.MovedPermanently,
    302: HttpStatuses.Found,
    303: HttpStatuses.SeeOther,
    304: HttpStatuses.NotModified,
    307: HttpStatuses.TemporaryRedirect,
    308: HttpStatuses.PermanentRedirect,
} as const;

export type HttpRedirectStatus = `${HttpRedirectStatuses}`;
export type HttpRedirectStatusCode = keyof typeof HttpRedirectStatusesToCode;
export const httpRedirectStatuses:Set<HttpRedirectStatus> = new Set([...Object.values(HttpRedirectStatuses)]);
