import {execSync} from 'child_process';
import {RateLimiterRedis} from 'rate-limiter-flexible';
import Redis from 'ioredis';

/**
 * Multi-region load balancing.
 */
export default class {
  /**
   * RateLimiter instance.
   * @type {{[key: string]: typeof import('rate-limiter-flexible').RateLimiterRedis}}
   */
  #limiters: {[key: string]: RateLimiterRedis} = {};

  /**
   * ioredis instance.
   * @type {typeof import('ioredis')}
   */
  #ioredis: Redis;

  /**
   * Key prefix of the region assignment information to be stored in Redis.
   * @type {typeof import('ioredis')}
   */
  #prefix: string;

  /**
   * If enabled, debug logs are output. Default is disabled.
   * @type {typeof boolean}
   */
  #debug: boolean;

  /**
   * Initialisation.
   * @param {string} options.prefix Key prefix for region assignment information to be stored in Redis. Defaults to ‘myapp’.
   * @param {string} options.host Redis hostname. Default is "127.0.0.1".
   * @param {number} options.port Redis port. Default is 6379.
   * @param {boolean} options.debug If enabled, debug logs are output. Default is disabled.
   */
  constructor(options: {prefix: string, host: string, port: number, debug: boolean}) {
    // Initialize options.
    options = Object.assign({
      prefix: 'myapp',
      host: '127.0.0.1',
      port: 6379,
      debug: false,
    }, options);

    // Save Redis key prefix.
    this.#prefix = options.prefix;

    // Save debug mode.
    this.#debug = options.debug;

    // Create an ioredis instance.
    this.#ioredis = new Redis({
      host: options.host,
      port: options.port,
      lazyConnect: true,
      retryStrategy: () => null,// No reconnection when Redis down.
      connectTimeout: 1500,
    });
  }

  /**
   * Get an assignable region.
   * If no allocatable region is found, waits and retries until an allocatable region is freed if the maximum retry option (`options.maxRetry`) is enabled (greater than or equal to 1).
   * If no allocatable regions are found, returns `undefined`.
   * @param {number} options.maxRetry Maximum number of retries if no single assignable region is found. The default is 3. If you do not want to retry, set -1.
   * @param {boolean} options.disconnect When enabled, Redis is disconnected, allowing testing in scenarios where Redis is not available. Default is disabled.
   * @return {Promise<string|undefined>} Assignable region name.
   * @throws {Error} Unable to connect to Redis or unexpected errors occurred.
   */
  async consume(options: {maxRetry: number, disconnect: boolean}): Promise<string|undefined> {
    // Initialize options.
    options = Object.assign({
      maxRetry: 3,
      disconnect: false,
    }, options);
    try {
      let attempt = 0;
      while (options.maxRetry == null || options.maxRetry === -1 || attempt++ < options.maxRetry) {
        if (this.#debug)
          console.log(`Consumption (${attempt}/${options.maxRetry})`);
        // Get candidates for assignable regions.
        const candidateRegion = await this.#getAssignableRegion();
        if (options.disconnect)
          // Intentionally shut down the Redis server.
          execSync('sudo systemctl stop redis');

        // Consumes points in the region with the lowest number of allocations.
        const assigned = await new Promise((resolve, reject) => {
          this.#limiters[candidateRegion.region].consume(candidateRegion.region)
            .then(() => {
              // Allocatable regions found.
              resolve(true);
            })
            .catch(async err => {
              if (err instanceof Error)
                // Unexpected errors occurred, such as not being able to establish a Redis connection.
                reject(err);
              else
                // No assignable regions were found.
                resolve(false);
            });
        });
        if (!assigned) {
          if (!options.maxRetry || options.maxRetry === -1)
            // No retry.
            break;
          else {
            // If no assignable region is found, wait and retry.
            const duration = await this.getTimeUntilAllocation();
            if (this.#debug)
              console.log(`Wait ${duration}ms until next available for allocation`);
            await new Promise(resolve => setTimeout(resolve, duration));
            continue;
          }
        }

        // Returns the name of regions that can be assigned.
        return candidateRegion.region;
      }

      // If no assignable region is found.
      return undefined;
    } catch (err) {
      // If it is not possible to connect to Redis, a random region is obtained and returned.
      throw err;
    } finally {
      if (options.disconnect)
        execSync('sudo systemctl start redis');
    }
  }

  /**
   * Register a region.
   * @param {string} options.region Region Name. Region name must be unique.
   * @param {number} options.quota Allocatable number of times per duration.
   * @param {number} options.duration Number of seconds before the allocated count is reset.
   * @throws {Error} Duplicate region name. Please use a unique region name.
   */
  async register(options: {region: string, quota: number, duration: number}): Promise<void> {
    // Initialize options.
    options = Object.assign({
      region: undefined,
      quota: undefined,
      duration: undefined,
    }, options);
    if (this.#limiters[options.region])
      throw new Error(`The region name for ${options.region} has already been registered.`);
    if (this.#ioredis.status === 'wait')
      // If not connected to the store, connect.
      await this.#ioredis.connect();

    // Create a RateLimiter instance to manage region allocation.
    this.#limiters[options.region] = new RateLimiterRedis({
      storeClient: this.#ioredis,
      keyPrefix: this.#prefix + ':rl',
      points: options.quota,
      duration: options.duration,
      blockDuration: 0,// Do not block if consumed more than points.
    });
  }

  /**
   * Get milliseconds until next region assignment.
   * @return {Promise<number>} Number of milliseconds that can be allocated next.
   */
  async getTimeUntilAllocation(): Promise<number> {
    // Get candidates for assignable regions.
    const candidateRegion = await this.#getAssignableRegion();
    return candidateRegion.duration;
  }

  /**
   * Get candidates for assignable regions.
   * @return {Promise<{region: string, allocationRate: number, duration: number}>} Candidate regions available for assignment.
   */
  async #getAssignableRegion(): Promise<{region: string, allocationRate: number, duration: number}> {
    // Get the number of allocations already made for all regions and the time until the next allocation is available.
    let regions = [];
    for (let [region, limiter] of Object.entries(this.#limiters)) {
      let allocationRate = 0;
      let duration = 0;
      const res = await limiter.get(region);
      if (res) {
        allocationRate = 1 - res.remainingPoints / limiter.points;
        duration = res.msBeforeNext;
      }
      regions.push({region, allocationRate, duration});
    }

    // Find the region with the lowest allocation.
    const minAllocationRate = Math.min(...regions.map(traffic => traffic.allocationRate));
    regions = regions.filter(traffic => traffic.allocationRate === minAllocationRate);
    if (regions.length > 0) {
      // If multiple regions are found, get the region with the shortest time until the next available allocation.
      const minDuration = Math.min(...regions.map(traffic => traffic.duration));
      regions = regions.filter(traffic => traffic.duration === minDuration);
    }

    // Select one at random from the regions found.
    return regions[Math.floor(Math.random() * regions.length)];
  }
}