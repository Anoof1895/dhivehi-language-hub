export declare const THAANA_BASE_CONSONANTS: string[];
export declare const THAANA_PRIMARY_CONSONANTS: string[];
export declare const THAANA_EXTENDED_CONSONANTS: string[];
export declare const THAANA_FILI: string[];

export declare function isThaanaChar(ch: string): boolean;
export declare function hasThaana(text: string): boolean;
export declare function segmentGraphemes(word: string): string[];
export declare function splitGrapheme(grapheme: string): { base: string; fili: string };
export declare function composeSyllable(base: string, fili?: string): string;
export declare function romanizeThaana(text: string): string;
export declare function normalizeLatinQuery(input: string): string;
export declare function latinToThaanaPhonetic(input: string): string;
export declare function stripThaanaPunctuation(token: string): string;
