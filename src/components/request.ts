import * as http from 'http';
import * as request from 'request';
import { IncomingMessage } from 'http';
import { inspect } from 'util';
import { Stream, PassThrough } from 'stream';
const debug = require('debug')('syncsettings:request');
const debugV = require('debug')('syncsettings:request');

/**
 * This is a replacement for request.Response (request module) which does not
 * require a body and additionally allows for a type T to be applied to the
 * body. A body in the response is the most common case, therefore T is not
 * optional. If one does not expect a body, T should be set to null or void.
 */
export interface Response<T> extends http.IncomingMessage {
    // some responses (such as streams and some POST requests) do  not make use
    // of the body field.
    body?: T;
}
export class RequestError extends Error {
    public name = 'RequestError';
    public resourceUri: string;
    public method: string | undefined;
    public body: any;

    public constructor(error: Error, public options: RequestOptions) {
        super(error.message);
        this.resourceUri = (options.uri || options.url) as string;
        this.method = options.method;
        this.body = options.body;
    }
}
export type RequestOptions = request.Options & { url?: string, uri?: string; };
export default function <T = any>(options: RequestOptions) {
    return req<T>({ ...options });
}
export function get<T = any>(options: RequestOptions) {
    return req<T>({ ...options, method: 'GET' });
}
export function put<T = any>(options: RequestOptions) {
    return req<T>({ ...options, method: 'PUT' });
}
export function patch<T = any>(options: RequestOptions) {
    return req<T>({ ...options, method: 'PATCH' });
}
export function post<T = any>(options: RequestOptions) {
    return req<T>({ ...options, method: 'POST' });
}
export function del<T = any>(options: RequestOptions) {
    return req<T>({ ...options, method: 'DELETE' });
}

/**
 * Wrapper for standard request method with extra functionality
 * + Add 307 redirect handler. If 307, reattempt with specified location.
 * + Stringify body contents if JSON object prior to request.
 *
 * Expects JSON format
 * @param method HTTP verb
 * @param url resource location
 * @param options additional request options
 * @param body body of request
 */
function req<T>(options?: RequestOptions | any): Promise<Response<T>> {
    return new Promise<Response<T>>((resolve, reject) => {
        let hasCompleted = false;
        const config: RequestOptions = {
            headers: { 'Content-Type': 'application/json' },
            ...options
        };
        debugV('==================REQUEST==================');
        debugV(JSON.stringify(config, null, 2));

        const requestCallback: request.RequestCallback = (error: any, response: request.Response, body: any) => {
            // Handle error responses
            if (error) {
                debugV(`============REQUEST=ERROR===============`);
                debugV(`${config.method} ${options.uri || options.url}`);
                debugV(JSON.stringify(error, null, 2));
                return reject(new Error(error));
            }

            debugV('==================RESPONSE==================');
            debugV(`${config.method} ${options.uri || options.url} ${response.statusCode}`);
            debugV('headers:', JSON.stringify(response.headers, null, 2));
            debugV('body:', JSON.stringify(body, null, 2));

            // Handle 307 redirects
            if (response.statusCode === 307) {
                if (config.url) {
                    config.url = response.headers['location'];
                }
                else {
                    config.uri = response.headers['location'];
                }
                debugV('==================REDIRECTING==================');
                debugV('location', config.url || config.uri);
                req<T>(config)
                    .then(resolve)
                    .catch(reject);
                return;
            }

            debugV('==================REQUEST=COMPLETE==================');
            const res: Response<T> = response;
            if (body) {
                try {
                    res.body = parseResponseBody<T>(response, body);
                } catch (error) {
                    debug(`Error parsing response:`);
                    debug(inspect(error, true, null));
                    debug('Passing back body as a string');
                    res.body = <any>body;
                }
            }
            if (!hasCompleted) {
                hasCompleted = true;
                return resolve(res);
            }
        };

        request(config, requestCallback)
            .on('error', error => {
                debugV('==================REQUEST=ON-ERROR==================');
                if (!hasCompleted) {
                    hasCompleted = true;
                    return reject(new RequestError(error, options));
                }
            });
    });
}

function parseResponseBody<T>(response: IncomingMessage, body: any): T {
    const responseType: string = response.headers['content-type'] as string;
    const APPLICATION_JSON = /application\/json/;
    const TEXT_HTML = /text\/html/;

    switch (true) {
        case APPLICATION_JSON.test(responseType):
            try {
                return parseJSONTypeResponse(body);
            } catch (e) {
                // Expected JSON but body was probably text. Just return the text.
                return body;
            }
        case TEXT_HTML.test(responseType): return body;
        default: return parseBestGuess(body);
    }
}

function parseJSONTypeResponse(body: any) {
    try {
        if (typeof body === 'string') {
            return JSON.parse(body);
        }
        else if (typeof body === 'object') {
            return body;
        }
        else { throw new Error(`Unknown body response type. Mime type: application/json, typeof body: ${typeof body}`); }
    } catch (e) {
        throw e;
    }
}

function parseBestGuess(body: any) {
    try {
        return JSON.parse(body);
    } catch (e) {
        return body;
    }
}

export function getResponseItem<T>(response: Response<T>): Promise<T> {
    // debugV('getResponseItem', response);
    return Promise.resolve(response.body) as Promise<T>;
}
export function getResponseItems<T>(response: Response<T[]>): Promise<T[]> {
    // debugV('getResponseItem', response);
    return Promise.resolve(response.body) as Promise<T[]>;
}

/**
 * response is null|T because either the body of the request is in stream
 * (in the case of a 200 response) or the response was a 500 and the body is a
 * Status object.
 */
export type StreamResponse<T> = {
    // ecobeeResponse: EcobeeResponse<Status | void>,
    response: Response<T | void>,
    stream: PassThrough
};

/**
 * A drop-in replacement for streams over http requests which specifies a body
 * type.
 * NOTE that response will not contain the body, stream will. The intuition here
 * is that if the HTTP response is successful the response.body will be null and
 * the stream can be passed arund assuming type T. If the request fails we
 * typically need to resolve the body, in which case response.body will be
 * resolved as type T. (See ecobee-client passthrough handler for example)
 * @param options
 */
export function stream<T>(options: RequestOptions) {
    return new Promise<StreamResponse<T>>(resolve => {
        // see request.js (request source) line 130
        // stream is an instance of Stream - Jake
        //
        // repl example
        //
        // > let stream = require('stream').Stream;
        // undefined
        // > let request = require('request')
        // undefined
        // > let x = request('http://google.com', { method: 'GET' })
        // undefined
        // > x instanceof stream.Stream
        // true
        const requestStream = request(options) as Stream;
        // Immediately pipe requestStream into new stream (responseStream) because
        // we read events from requestStream which causes a race condition between
        // reading events and piping from requestStream. Piping to a new stream
        // allows for events to be read from the requestStream independently from
        // information coming through the new stream which is otherwise interefered
        // with by events.
        const responseStream = new PassThrough();
        requestStream.pipe(responseStream);
        requestStream.on('response', (response: Response<T | null>) => resolve({ response, stream: responseStream } as any));
    });
}