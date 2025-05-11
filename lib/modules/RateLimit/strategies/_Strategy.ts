/**
 * Data Object TriFrost Rate Limiter will store
 */
export type TriFrostRateLimitObject = {
    amt: number;
    reset: number;
}

/**
 * Interface a TriFrost RateLimit strategy should satisfy
 */
export interface TriFrostRateLimitStrategizedStore {

    consume: (key:string, limit:number) => Promise<TriFrostRateLimitObject>;

    stop ():Promise<void>;

}
