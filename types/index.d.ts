/**
 * Multi-region load balancing.
 */
export default class {
    #private;
    /**
     * Initialisation.
     * @param {string} options.prefix Key prefix for region assignment information to be stored in Redis. Defaults to ‘myapp’.
     * @param {string} options.host Redis hostname. Default is "127.0.0.1".
     * @param {number} options.port Redis port. Default is 6379.
     * @param {boolean} options.debug If enabled, debug logs are output. Default is disabled.
     */
    constructor(options: {
        prefix: string;
        host: string;
        port: number;
        debug: boolean;
    });
    /**
     * Get an assignable region.
     * If no allocatable region is found, waits and retries until an allocatable region is freed if the maximum retry option (`options.maxRetry`) is enabled (greater than or equal to 1).
     * If no allocatable regions are found, returns `undefined`.
     * @param {number} options.maxRetry Maximum number of retries if no single assignable region is found. The default is 3. If you do not want to retry, set -1.
     * @param {boolean} options.disconnect When enabled, Redis is disconnected, allowing testing in scenarios where Redis is not available. Default is disabled.
     * @return {Promise<string|undefined>} Assignable region name.
     * @throws {Error} Unable to connect to Redis or unexpected errors occurred.
     */
    consume(options: {
        maxRetry: number;
        disconnect: boolean;
    }): Promise<string | undefined>;
    /**
     * Register a region.
     * @param {string} options.region Region Name. Region name must be unique.
     * @param {number} options.quota Allocatable number of times per duration.
     * @param {number} options.duration Number of seconds before the allocated count is reset.
     * @throws {Error} Duplicate region name. Please use a unique region name.
     */
    register(options: {
        region: string;
        quota: number;
        duration: number;
    }): Promise<void>;
    /**
     * Get milliseconds until next region assignment.
     * @return {Promise<number>} Number of milliseconds that can be allocated next.
     */
    getTimeUntilAllocation(): Promise<number>;
}
