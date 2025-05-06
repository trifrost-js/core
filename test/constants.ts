/* eslint-disable @typescript-eslint/no-array-constructor */

function testFunction ():void {}
const testArrowFunction = ():void => {};
async function testAsync ():Promise<void> {}
const testAsyncArrowFunction = async ():Promise<void> => {};

const IS_NUMERIC:number[]               = [1, 0.000001, 8e10, Math.PI, Number(1.12345), Number(Number.EPSILON)];
const IS_INTEGER:number[]               = [-1, 100, -50, 99999, 20];
const IS_BOOLEAN:boolean[]              = [true, false, Boolean(true), Boolean(false)];
const IS_STRING:string[]                = ['foo', String('foo')];
const IS_REGEXP:RegExp[]                = [/abcdefg/i, new RegExp('\\w+')];
const IS_DATE:Date[]                    = [new Date()];
const IS_ARRAY:number[][]               = [[0, 1, 2], new Array(1, 2, 3), new Array(5)];
const IS_OBJECT:{[key:string]:unknown}[]    = [{bar:'foo'}, new Object(), Object.create(null), Object.create([])];
const IS_FUNCTION:unknown[]                 = [testFunction, testArrowFunction];
const IS_ASYNC_FUNCTION:unknown[]       = [testAsync, testAsyncArrowFunction];
const IS_NULLABLE:unknown[]             = [NaN, undefined, null];

const NOT_ARRAY:unknown[] = [
    ...IS_NUMERIC,
    ...IS_INTEGER,
    ...IS_BOOLEAN,
    ...IS_STRING,
    ...IS_REGEXP,
    ...IS_DATE,
    ...IS_OBJECT,
    ...IS_FUNCTION,
    ...IS_ASYNC_FUNCTION,
    ...IS_NULLABLE,
];
const NOT_NUMERIC:unknown[] = [
    ...IS_BOOLEAN,
    ...IS_STRING,
    ...IS_REGEXP,
    ...IS_DATE,
    ...IS_ARRAY,
    ...IS_OBJECT,
    ...IS_FUNCTION,
    ...IS_ASYNC_FUNCTION,
    ...IS_NULLABLE,
    new Number(1.12345),
    new Number(Number.EPSILON),
];
const NOT_STRING:unknown[] = [
    ...IS_NUMERIC,
    ...IS_INTEGER,
    ...IS_BOOLEAN,
    ...IS_REGEXP,
    ...IS_DATE,
    ...IS_ARRAY,
    ...IS_OBJECT,
    ...IS_FUNCTION,
    ...IS_ASYNC_FUNCTION,
    ...IS_NULLABLE,
];
const NOT_OBJECT:unknown[] = [
    ...IS_NUMERIC,
    ...IS_INTEGER,
    ...IS_BOOLEAN,
    ...IS_STRING,
    ...IS_REGEXP,
    ...IS_DATE,
    ...IS_ARRAY,
    ...IS_FUNCTION,
    ...IS_ASYNC_FUNCTION,
    ...IS_NULLABLE,
];
const NOT_DATE:unknown[] = [
    ...IS_NUMERIC,
    ...IS_INTEGER,
    ...IS_BOOLEAN,
    ...IS_STRING,
    ...IS_REGEXP,
    ...IS_ARRAY,
    ...IS_OBJECT,
    ...IS_FUNCTION,
    ...IS_ASYNC_FUNCTION,
    ...IS_NULLABLE,
];
const NOT_FUNCTION:unknown[] = [
    ...IS_NUMERIC,
    ...IS_INTEGER,
    ...IS_BOOLEAN,
    ...IS_STRING,
    ...IS_REGEXP,
    ...IS_DATE,
    ...IS_ARRAY,
    ...IS_OBJECT,
    ...IS_NULLABLE,
];
const NOT_BOOLEAN:unknown[] = [
    ...IS_NUMERIC,
    ...IS_INTEGER,
    ...IS_STRING,
    ...IS_REGEXP,
    ...IS_DATE,
    ...IS_ARRAY,
    ...IS_OBJECT,
    ...IS_FUNCTION,
    ...IS_ASYNC_FUNCTION,
    ...IS_NULLABLE,
];
const NOT_REGEXP:unknown[] = [
    ...IS_NUMERIC,
    ...IS_INTEGER,
    ...IS_BOOLEAN,
    ...IS_STRING,
    ...IS_DATE,
    ...IS_ARRAY,
    ...IS_OBJECT,
    ...IS_FUNCTION,
    ...IS_ASYNC_FUNCTION,
    ...IS_NULLABLE,
];

const NOT_EMAIL:unknown[] = [
    ...NOT_STRING,
    '',
    ' ',
    '   ',
    'plainaddress',
    '#@%^%#$@#$@#.com',
    '@domain.com',
    'thisisawaytoolongusernamethatshouldfailvalidationifiamcorrectaboutit@domain.com',
    'peter@thisisawaytoolongusernamethatshouldfailvalidationifiamcorrectaboutitthisisawaytoolongusernamethatshouldfailvalidationifiamcorrectaboutitthisisawaytoolongusernamethatshouldfailvalidationifiamcorrectaboutitthisisawaytoolongusernamethatshouldfailvalidationifiamcorrectaboutitthisisawaytoolongusernamethatshouldfailvalidationifiamcorrectaboutitthisisawaytoolongusernamethatshouldfailvalidationifiamcorrectaboutitthisisawaytoolongusernamethatshouldfailvalidationifiamcorrectaboutitthisisawaytoolongusernamethatshouldfailvalidationifiamcorrectaboutit.com',
    'peter@|thisshouldnotbevalid<|.com',
    'Joe Smith <email@domain.com>',
    'email.domain.com',
    'email@domain@domain.com',
    '.email@domain.com',
    'email.@domain.com',
    'email..email@domain.com',
    'あいうえお@domain.com',
    'joe@あいうえお.com',
    'email@domain.com (Joe Smith)',
    'email@domain',
    'email@-domain.com',
    'email@domain..com',
    'email@domain.a',
];

const NOT_URL:unknown[] = [
    ...NOT_STRING,
    '',
    ' ',
    '    ',
    'http://',
    'http://.',
    'http://..',
    'http://../',
    'http://?',
    'http://??',
    'http://??/',
    'http://#',
    'http://##',
    'http://##/',
    'http://foo.bar?q=Spaces should be encoded',
    '//',
    '//a',
    '///a',
    '///',
    'http:///a',
    'foo.com',
    'rdar://1234',
    'h://test',
    'http:// shouldfail.com',
    ':// should fail',
    'http://foo.bar/foo(bar)baz quux',
    'ftps://foo.bar/',
    'http://-error-.invalid/',
    'http://a.b--c.de/',
    'http://-a.b.co',
    'http://a.b-.co',
    'http://0.0.0.0',
    'http://10.1.1.0',
    'http://10.1.1.255',
    'http://224.1.1.1',
    'http://1.1.1.1.1',
    'http://123.123.123',
    'http://3628126748',
    'http://.www.foo.bar/',
    'http://www.foo.bar./',
    'http://.www.foo.bar./',
    'http://10.1.1.1',
    'http://10.1.1.254',
    'foobar',
    'hello world',
];

const NOT_DATE_STRING:unknown[] = [
    ...NOT_STRING,
    '',
    ' ',
    '   ',
    'abc',
    'foobar',
    '-1000000000000000000000',
    '202a-1b-0c',
    '20221125',
    '20220318',
    'abcdefg',
    '4328492374ewque',
    '_343424823942',
    ' _343424823942',
    '   _343424823942',
    '343424823942_',
    '343424823942_ ',
    '343424823942_   ',
    '2019-20-20T05:10:00+00:00',
];

const CONSTANTS = {
    NOT_ARRAY,
    NOT_ARRAY_WITH_EMPTY: [...NOT_ARRAY, []],
    NOT_BOOLEAN,
    NOT_DATE,
    NOT_DATE_STRING,
    NOT_EMAIL,
    NOT_FUNCTION,
    NOT_GUID: [...NOT_STRING, '', ' ', '  ', 'foo', '448932784723', 'peter', '8644c000|917c|4238|8a6b|9adf413c0ef6'],
    NOT_INTEGER: [...NOT_NUMERIC, -5.2, 4.6, -150.3, Math.PI, new Number(1.12345), new Number(Number.EPSILON)],
    NOT_NUMERIC,
    NOT_OBJECT,
    NOT_OBJECT_WITH_EMPTY: [...NOT_OBJECT, {}],
    NOT_REGEXP,
    NOT_STRING,
    NOT_STRING_WITH_EMPTY: [...NOT_STRING, '', ' ', '  '],
    NOT_URL,
    IS_NUMERIC,
    IS_INTEGER,
    IS_BOOLEAN,
    IS_STRING,
    IS_REGEXP,
    IS_DATE,
    IS_ARRAY,
    IS_OBJECT,
    IS_FUNCTION,
    IS_ASYNC_FUNCTION,
    IS_NULLABLE,
};

export default CONSTANTS;

//  Get Time
export function getTime ():number {
    const hr_time = process.hrtime();
    return ((hr_time[0] * 1000) + hr_time[1])/1000000;
}
