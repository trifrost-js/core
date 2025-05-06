/**
 * These types were taken from:https://github.com/uNetworking/uWebSockets.js/blob/14bb3af6789a263804899d5440223b9e2a5a43e3/docs/index.d.ts
 */

export interface us_socket_context_t {} /* eslint-disable-line */

export type RecognizedString = string
    | ArrayBuffer
    | Uint8Array
    | Int8Array
    | Uint16Array
    | Int16Array
    | Uint32Array
    | Int32Array
    | Float32Array
    | Float64Array;

export interface HttpResponse {

    pause():void;

    resume():void;

    writeStatus(status:RecognizedString):HttpResponse;

    writeHeader(key:RecognizedString, value:RecognizedString):HttpResponse;

    write(chunk:RecognizedString):boolean;

    end(body?:RecognizedString, closeConnection?:boolean):HttpResponse;

    endWithoutBody(reportedContentLength?:number, closeConnection?:boolean):HttpResponse;

    tryEnd(fullBodyOrChunk:RecognizedString, totalSize:number):[boolean, boolean];

    close():HttpResponse;

    getWriteOffset():number;

    onWritable(handler:(offset:number) => boolean):HttpResponse;

    onAborted(handler:() => void):HttpResponse;

    onData(handler:(chunk:ArrayBuffer, isLast:boolean) => void):HttpResponse;

    getRemoteAddress():ArrayBuffer;

    getRemoteAddressAsText():ArrayBuffer;

    getProxiedRemoteAddress():ArrayBuffer;

    getProxiedRemoteAddressAsText():ArrayBuffer;

    cork(callback:() => void):HttpResponse;

    upgrade<UserData>(
        userData:UserData,
        secWebSocketKey:RecognizedString,
        secWebSocketProtocol:RecognizedString,
        secWebSocketExtensions:RecognizedString,
        context:us_socket_context_t
    ):void;

    [key:string]:any;
}

export interface HttpRequest {

    getHeader(lowerCaseKey:RecognizedString):string;

    getParameter(index:number | RecognizedString):string|undefined;

    getUrl():string;

    getMethod():string;

    getCaseSensitiveMethod():string;

    getQuery():string;

    getQuery(key:string):string|undefined;

    forEach(callback:(key:string, value:string) => void):void;

    setYield(_yield:boolean):HttpRequest;
}

export interface MultipartField {
    data:ArrayBuffer;
    name:string;
    type?:string;
    filename?:string;
}
