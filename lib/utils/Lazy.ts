export type LazyInitFn <T, Env extends Record<string, any> = Record<string, any>> = ((opts:{env:Env}) => T);
export type LazyInit <T, Env extends Record<string, any> = Record<string, any>> = T | LazyInitFn<T, Env>;

export class Lazy <T, Env extends Record<string, any> = Record<string, any>> {

    #val:T|null = null;

    #fn:LazyInitFn<T, Env>|null = null;

    constructor (val: LazyInit<T, Env>) {
        if (typeof val === 'function') {
            this.#fn = val as LazyInitFn<T, Env>;
        } else {
            this.#val = val;
        }
    }

    get resolved ():T|null {
        return this.#val;
    }

    resolve (opts:{env:Env}):T {
        if (this.#val) return this.#val;
        
        if (!this.#fn) throw new Error('Lazy@resolve: No initializer provided');
        
        this.#val = this.#fn(opts);
        return this.#val;
    }

    clear (): void {
        this.#val = null;
    }

}
