import {type MimeType} from '../../types/constants';

export type ParsedBody = Record<string, unknown> | {raw?: unknown};

export type TriFrostBodyParserJsonOptions = {
    limit?: number;
};

export type TriFrostBodyParserTextOptions = {
    limit?: number;
};

export type TriFrostBodyParserFormOptions = {
    limit?: number;
    /**
     * Whether or not we should normalize booleans, defaults to true if not set
     */
    normalizeBool?: boolean;
    /**
     * Whether or not we should normalize numbers, defaults to true if not set
     */
    normalizeNumber?: boolean;
    /**
     * Whether or not we should normalize dates, defaults to true if not set
     */
    normalizeDate?: boolean;
    /**
     * Whether or not we should normalize null, defaults to true if not set
     */
    normalizeNull?: boolean;
    /**
     * Array of keys that should not be normalized into number/bool/null/date when seen
     */
    normalizeRaw?: string[];
    /**
     * File constraints — or null to disable file uploads entirely
     */
    files?: null | {
        /**
         * Maximum file size in bytes (default: unlimited)
         */
        maxSize?: number;
        /**
         * Maximum number of files allowed (default: unlimited)
         */
        maxCount?: number;
        /**
         * Allowed mime types
         */
        types?: MimeType[];
    };
};

export type TriFrostBodyParserOptions = {
    /**
     * Limit in Bytes (default = 1MB (1024 * 1024))
     */
    limit?: number;
    /**
     * Json Body Parser Options
     */
    json?: TriFrostBodyParserJsonOptions;
    /**
     * Text Body Parser Options
     */
    text?: TriFrostBodyParserTextOptions;
    /**
     * Form Body Parser Options
     */
    form?: TriFrostBodyParserFormOptions;
};

export const DEFAULT_BODY_PARSER_OPTIONS: TriFrostBodyParserOptions = {
    limit: 4 * 1024 * 1024,
};
