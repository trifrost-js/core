function testFunction ():void {}
const testArrowFunction = ():void => {};
async function testAsync ():Promise<void> {}
const testAsyncArrowFunction = async ():Promise<void> => {};

const IS_NUMERIC:number[] = [0.000001, 8e10];
const IS_INTEGER:number[] = [100, -50];
const IS_BOOLEAN:boolean[] = [true, false];
const IS_STRING:string[] = ["foo"];
const IS_REGEXP:RegExp[] = [/abcdefg/i, new RegExp('\\w+')];
const IS_DATE:Date[] = [new Date()];
const IS_ARRAY:unknown[] = [[0], new Array(1)];
const IS_OBJECT:Record<string, unknown>[] = [{bar: "foo"}, Object.create(null)];
const IS_FUNCTION:unknown[] = [testFunction, testArrowFunction];
const IS_ASYNC_FUNCTION:unknown[] = [testAsync, testAsyncArrowFunction];
const IS_NULLABLE:unknown[] = [NaN, undefined, null];

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

const CONSTANTS = {
    NOT_ARRAY,
    NOT_ARRAY_WITH_EMPTY: [...NOT_ARRAY, []],
    NOT_BOOLEAN,
    NOT_DATE,
    NOT_FUNCTION,
    NOT_INTEGER: [...NOT_NUMERIC, -5.2, 4.6, -150.3, Math.PI, new Number(1.12345), new Number(Number.EPSILON)],
    NOT_NUMERIC,
    NOT_OBJECT,
    NOT_OBJECT_WITH_EMPTY: [...NOT_OBJECT, {}],
    NOT_REGEXP,
    NOT_STRING,
    NOT_STRING_WITH_EMPTY: [...NOT_STRING, '', ' ', '  '],
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