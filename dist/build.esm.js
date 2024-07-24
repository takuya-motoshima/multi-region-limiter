import { execSync } from 'child_process';
import require$$0$1 from 'cluster';
import require$$1 from 'crypto';
import require$$1$3 from 'events';
import require$$0$2 from 'assert';
import require$$1$1 from 'util';
import require$$0$4 from 'url';
import require$$1$2 from 'tty';
import require$$0$3 from 'os';
import require$$0$5 from 'stream';
import require$$0$6 from 'dns';
import require$$0$7 from 'net';
import require$$1$4 from 'tls';
import require$$0$8 from 'buffer';
import require$$1$5 from 'string_decoder';

var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

function getDefaultExportFromCjs (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

var RateLimiterAbstract_1 = class RateLimiterAbstract {
  /**
   *
   * @param opts Object Defaults {
   *   points: 4, // Number of points
   *   duration: 1, // Per seconds
   *   blockDuration: 0, // Block if consumed more than points in current duration for blockDuration seconds
   *   execEvenly: false, // Execute allowed actions evenly over duration
   *   execEvenlyMinDelayMs: duration * 1000 / points, // ms, works with execEvenly=true option
   *   keyPrefix: 'rlflx',
   * }
   */
  constructor(opts = {}) {
    this.points = opts.points;
    this.duration = opts.duration;
    this.blockDuration = opts.blockDuration;
    this.execEvenly = opts.execEvenly;
    this.execEvenlyMinDelayMs = opts.execEvenlyMinDelayMs;
    this.keyPrefix = opts.keyPrefix;
  }

  get points() {
    return this._points;
  }

  set points(value) {
    this._points = value >= 0 ? value : 4;
  }

  get duration() {
    return this._duration;
  }

  set duration(value) {
    this._duration = typeof value === 'undefined' ? 1 : value;
  }

  get msDuration() {
    return this.duration * 1000;
  }

  get blockDuration() {
    return this._blockDuration;
  }

  set blockDuration(value) {
    this._blockDuration = typeof value === 'undefined' ? 0 : value;
  }

  get msBlockDuration() {
    return this.blockDuration * 1000;
  }

  get execEvenly() {
    return this._execEvenly;
  }

  set execEvenly(value) {
    this._execEvenly = typeof value === 'undefined' ? false : Boolean(value);
  }

  get execEvenlyMinDelayMs() {
    return this._execEvenlyMinDelayMs;
  }

  set execEvenlyMinDelayMs(value) {
    this._execEvenlyMinDelayMs = typeof value === 'undefined' ? Math.ceil(this.msDuration / this.points) : value;
  }

  get keyPrefix() {
    return this._keyPrefix;
  }

  set keyPrefix(value) {
    if (typeof value === 'undefined') {
      value = 'rlflx';
    }
    if (typeof value !== 'string') {
      throw new Error('keyPrefix must be string');
    }
    this._keyPrefix = value;
  }

  _getKeySecDuration(options = {}) {
    return options && options.customDuration >= 0
      ? options.customDuration
      : this.duration;
  }

  getKey(key) {
    return this.keyPrefix.length > 0 ? `${this.keyPrefix}:${key}` : key;
  }

  parseKey(rlKey) {
    return rlKey.substring(this.keyPrefix.length);
  }

  consume() {
    throw new Error("You have to implement the method 'consume'!");
  }

  penalty() {
    throw new Error("You have to implement the method 'penalty'!");
  }

  reward() {
    throw new Error("You have to implement the method 'reward'!");
  }

  get() {
    throw new Error("You have to implement the method 'get'!");
  }

  set() {
    throw new Error("You have to implement the method 'set'!");
  }

  block() {
    throw new Error("You have to implement the method 'block'!");
  }

  delete() {
    throw new Error("You have to implement the method 'delete'!");
  }
};

var BlockedKeys_1$1 = class BlockedKeys {
  constructor() {
    this._keys = {}; // {'key': 1526279430331}
    this._addedKeysAmount = 0;
  }

  collectExpired() {
    const now = Date.now();

    Object.keys(this._keys).forEach((key) => {
      if (this._keys[key] <= now) {
        delete this._keys[key];
      }
    });

    this._addedKeysAmount = Object.keys(this._keys).length;
  }

  /**
   * Add new blocked key
   *
   * @param key String
   * @param sec Number
   */
  add(key, sec) {
    this.addMs(key, sec * 1000);
  }

  /**
   * Add new blocked key for ms
   *
   * @param key String
   * @param ms Number
   */
  addMs(key, ms) {
    this._keys[key] = Date.now() + ms;
    this._addedKeysAmount++;
    if (this._addedKeysAmount > 999) {
      this.collectExpired();
    }
  }

  /**
   * 0 means not blocked
   *
   * @param key
   * @returns {number}
   */
  msBeforeExpire(key) {
    const expire = this._keys[key];

    if (expire && expire >= Date.now()) {
      this.collectExpired();
      const now = Date.now();
      return expire >= now ? expire - now : 0;
    }

    return 0;
  }

  /**
   * If key is not given, delete all data in memory
   * 
   * @param {string|undefined} key
   */
  delete(key) {
    if (key) {
      delete this._keys[key];
    } else {
      Object.keys(this._keys).forEach((key) => {
        delete this._keys[key];
      });
    }
  }
};

const BlockedKeys$1 = BlockedKeys_1$1;

var BlockedKeys_1 = BlockedKeys$1;

var RateLimiterRes_1 = class RateLimiterRes {
  constructor(remainingPoints, msBeforeNext, consumedPoints, isFirstInDuration) {
    this.remainingPoints = typeof remainingPoints === 'undefined' ? 0 : remainingPoints; // Remaining points in current duration
    this.msBeforeNext = typeof msBeforeNext === 'undefined' ? 0 : msBeforeNext; // Milliseconds before next action
    this.consumedPoints = typeof consumedPoints === 'undefined' ? 0 : consumedPoints; // Consumed points in current duration
    this.isFirstInDuration = typeof isFirstInDuration === 'undefined' ? false : isFirstInDuration;
  }

  get msBeforeNext() {
    return this._msBeforeNext;
  }

  set msBeforeNext(ms) {
    this._msBeforeNext = ms;
    return this;
  }

  get remainingPoints() {
    return this._remainingPoints;
  }

  set remainingPoints(p) {
    this._remainingPoints = p;
    return this;
  }

  get consumedPoints() {
    return this._consumedPoints;
  }

  set consumedPoints(p) {
    this._consumedPoints = p;
    return this;
  }

  get isFirstInDuration() {
    return this._isFirstInDuration;
  }

  set isFirstInDuration(value) {
    this._isFirstInDuration = Boolean(value);
  }

  _getDecoratedProperties() {
    return {
      remainingPoints: this.remainingPoints,
      msBeforeNext: this.msBeforeNext,
      consumedPoints: this.consumedPoints,
      isFirstInDuration: this.isFirstInDuration,
    };
  }

  [Symbol.for("nodejs.util.inspect.custom")]() {
    return this._getDecoratedProperties();
  }

  toString() {
    return JSON.stringify(this._getDecoratedProperties());
  }

  toJSON() {
    return this._getDecoratedProperties();
  }
};

const RateLimiterAbstract$3 = RateLimiterAbstract_1;
const BlockedKeys = BlockedKeys_1;
const RateLimiterRes$d = RateLimiterRes_1;

var RateLimiterStoreAbstract_1 = class RateLimiterStoreAbstract extends RateLimiterAbstract$3 {
  /**
   *
   * @param opts Object Defaults {
   *   ... see other in RateLimiterAbstract
   *
   *   inMemoryBlockOnConsumed: 40, // Number of points when key is blocked
   *   inMemoryBlockDuration: 10, // Block duration in seconds
   *   insuranceLimiter: RateLimiterAbstract
   * }
   */
  constructor(opts = {}) {
    super(opts);

    this.inMemoryBlockOnConsumed = opts.inMemoryBlockOnConsumed;
    this.inMemoryBlockDuration = opts.inMemoryBlockDuration;
    this.insuranceLimiter = opts.insuranceLimiter;
    this._inMemoryBlockedKeys = new BlockedKeys();
  }

  get client() {
    return this._client;
  }

  set client(value) {
    if (typeof value === 'undefined') {
      throw new Error('storeClient is not set');
    }
    this._client = value;
  }

  /**
   * Have to be launched after consume
   * It blocks key and execute evenly depending on result from store
   *
   * It uses _getRateLimiterRes function to prepare RateLimiterRes from store result
   *
   * @param resolve
   * @param reject
   * @param rlKey
   * @param changedPoints
   * @param storeResult
   * @param {Object} options
   * @private
   */
  _afterConsume(resolve, reject, rlKey, changedPoints, storeResult, options = {}) {
    const res = this._getRateLimiterRes(rlKey, changedPoints, storeResult);

    if (this.inMemoryBlockOnConsumed > 0 && !(this.inMemoryBlockDuration > 0)
      && res.consumedPoints >= this.inMemoryBlockOnConsumed
    ) {
      this._inMemoryBlockedKeys.addMs(rlKey, res.msBeforeNext);
      if (res.consumedPoints > this.points) {
        return reject(res);
      } else {
        return resolve(res)
      }
    } else if (res.consumedPoints > this.points) {
      let blockPromise = Promise.resolve();
      // Block only first time when consumed more than points
      if (this.blockDuration > 0 && res.consumedPoints <= (this.points + changedPoints)) {
        res.msBeforeNext = this.msBlockDuration;
        blockPromise = this._block(rlKey, res.consumedPoints, this.msBlockDuration, options);
      }

      if (this.inMemoryBlockOnConsumed > 0 && res.consumedPoints >= this.inMemoryBlockOnConsumed) {
        // Block key for this.inMemoryBlockDuration seconds
        this._inMemoryBlockedKeys.add(rlKey, this.inMemoryBlockDuration);
        res.msBeforeNext = this.msInMemoryBlockDuration;
      }

      blockPromise
        .then(() => {
          reject(res);
        })
        .catch((err) => {
          reject(err);
        });
    } else if (this.execEvenly && res.msBeforeNext > 0 && !res.isFirstInDuration) {
      let delay = Math.ceil(res.msBeforeNext / (res.remainingPoints + 2));
      if (delay < this.execEvenlyMinDelayMs) {
        delay = res.consumedPoints * this.execEvenlyMinDelayMs;
      }

      setTimeout(resolve, delay, res);
    } else {
      resolve(res);
    }
  }

  _handleError(err, funcName, resolve, reject, key, data = false, options = {}) {
    if (!(this.insuranceLimiter instanceof RateLimiterAbstract$3)) {
      reject(err);
    } else {
      this.insuranceLimiter[funcName](key, data, options)
        .then((res) => {
          resolve(res);
        })
        .catch((res) => {
          reject(res);
        });
    }
  }

  getInMemoryBlockMsBeforeExpire(rlKey) {
    if (this.inMemoryBlockOnConsumed > 0) {
      return this._inMemoryBlockedKeys.msBeforeExpire(rlKey);
    }

    return 0;
  }

  get inMemoryBlockOnConsumed() {
    return this._inMemoryBlockOnConsumed;
  }

  set inMemoryBlockOnConsumed(value) {
    this._inMemoryBlockOnConsumed = value ? parseInt(value) : 0;
    if (this.inMemoryBlockOnConsumed > 0 && this.points > this.inMemoryBlockOnConsumed) {
      throw new Error('inMemoryBlockOnConsumed option must be greater or equal "points" option');
    }
  }

  get inMemoryBlockDuration() {
    return this._inMemoryBlockDuration;
  }

  set inMemoryBlockDuration(value) {
    this._inMemoryBlockDuration = value ? parseInt(value) : 0;
    if (this.inMemoryBlockDuration > 0 && this.inMemoryBlockOnConsumed === 0) {
      throw new Error('inMemoryBlockOnConsumed option must be set up');
    }
  }

  get msInMemoryBlockDuration() {
    return this._inMemoryBlockDuration * 1000;
  }

  get insuranceLimiter() {
    return this._insuranceLimiter;
  }

  set insuranceLimiter(value) {
    if (typeof value !== 'undefined' && !(value instanceof RateLimiterAbstract$3)) {
      throw new Error('insuranceLimiter must be instance of RateLimiterAbstract');
    }
    this._insuranceLimiter = value;
    if (this._insuranceLimiter) {
      this._insuranceLimiter.blockDuration = this.blockDuration;
      this._insuranceLimiter.execEvenly = this.execEvenly;
    }
  }

  /**
   * Block any key for secDuration seconds
   *
   * @param key
   * @param secDuration
   * @param {Object} options
   *
   * @return Promise<RateLimiterRes>
   */
  block(key, secDuration, options = {}) {
    const msDuration = secDuration * 1000;
    return this._block(this.getKey(key), this.points + 1, msDuration, options);
  }

  /**
   * Set points by key for any duration
   *
   * @param key
   * @param points
   * @param secDuration
   * @param {Object} options
   *
   * @return Promise<RateLimiterRes>
   */
  set(key, points, secDuration, options = {}) {
    const msDuration = (secDuration >= 0 ? secDuration : this.duration) * 1000;
    return this._block(this.getKey(key), points, msDuration, options);
  }

  /**
   *
   * @param key
   * @param pointsToConsume
   * @param {Object} options
   * @returns Promise<RateLimiterRes>
   */
  consume(key, pointsToConsume = 1, options = {}) {
    return new Promise((resolve, reject) => {
      const rlKey = this.getKey(key);

      const inMemoryBlockMsBeforeExpire = this.getInMemoryBlockMsBeforeExpire(rlKey);
      if (inMemoryBlockMsBeforeExpire > 0) {
        return reject(new RateLimiterRes$d(0, inMemoryBlockMsBeforeExpire));
      }

      this._upsert(rlKey, pointsToConsume, this._getKeySecDuration(options) * 1000, false, options)
        .then((res) => {
          this._afterConsume(resolve, reject, rlKey, pointsToConsume, res);
        })
        .catch((err) => {
          this._handleError(err, 'consume', resolve, reject, key, pointsToConsume, options);
        });
    });
  }

  /**
   *
   * @param key
   * @param points
   * @param {Object} options
   * @returns Promise<RateLimiterRes>
   */
  penalty(key, points = 1, options = {}) {
    const rlKey = this.getKey(key);
    return new Promise((resolve, reject) => {
      this._upsert(rlKey, points, this._getKeySecDuration(options) * 1000, false, options)
        .then((res) => {
          resolve(this._getRateLimiterRes(rlKey, points, res));
        })
        .catch((err) => {
          this._handleError(err, 'penalty', resolve, reject, key, points, options);
        });
    });
  }

  /**
   *
   * @param key
   * @param points
   * @param {Object} options
   * @returns Promise<RateLimiterRes>
   */
  reward(key, points = 1, options = {}) {
    const rlKey = this.getKey(key);
    return new Promise((resolve, reject) => {
      this._upsert(rlKey, -points, this._getKeySecDuration(options) * 1000, false, options)
        .then((res) => {
          resolve(this._getRateLimiterRes(rlKey, -points, res));
        })
        .catch((err) => {
          this._handleError(err, 'reward', resolve, reject, key, points, options);
        });
    });
  }

  /**
   *
   * @param key
   * @param {Object} options
   * @returns Promise<RateLimiterRes>|null
   */
  get(key, options = {}) {
    const rlKey = this.getKey(key);
    return new Promise((resolve, reject) => {
      this._get(rlKey, options)
        .then((res) => {
          if (res === null || typeof res === 'undefined') {
            resolve(null);
          } else {
            resolve(this._getRateLimiterRes(rlKey, 0, res));
          }
        })
        .catch((err) => {
          this._handleError(err, 'get', resolve, reject, key, options);
        });
    });
  }

  /**
   *
   * @param key
   * @param {Object} options
   * @returns Promise<boolean>
   */
  delete(key, options = {}) {
    const rlKey = this.getKey(key);
    return new Promise((resolve, reject) => {
      this._delete(rlKey, options)
        .then((res) => {
          this._inMemoryBlockedKeys.delete(rlKey);
          resolve(res);
        })
        .catch((err) => {
          this._handleError(err, 'delete', resolve, reject, key, options);
        });
    });
  }

  /**
   * Cleanup keys no-matter expired or not.
   */
  deleteInMemoryBlockedAll() {
    this._inMemoryBlockedKeys.delete();
  }

  /**
   * Get RateLimiterRes object filled depending on storeResult, which specific for exact store
   *
   * @param rlKey
   * @param changedPoints
   * @param storeResult
   * @private
   */
  _getRateLimiterRes(rlKey, changedPoints, storeResult) { // eslint-disable-line no-unused-vars
    throw new Error("You have to implement the method '_getRateLimiterRes'!");
  }

  /**
   * Block key for this.msBlockDuration milliseconds
   * Usually, it just prolongs lifetime of key
   *
   * @param rlKey
   * @param initPoints
   * @param msDuration
   * @param {Object} options
   *
   * @return Promise<any>
   */
  _block(rlKey, initPoints, msDuration, options = {}) {
    return new Promise((resolve, reject) => {
      this._upsert(rlKey, initPoints, msDuration, true, options)
        .then(() => {
          resolve(new RateLimiterRes$d(0, msDuration > 0 ? msDuration : -1, initPoints));
        })
        .catch((err) => {
          this._handleError(err, 'block', resolve, reject, this.parseKey(rlKey), msDuration / 1000, options);
        });
    });
  }

  /**
   * Have to be implemented in every limiter
   * Resolve with raw result from Store OR null if rlKey is not set
   * or Reject with error
   *
   * @param rlKey
   * @param {Object} options
   * @private
   *
   * @return Promise<any>
   */
  _get(rlKey, options = {}) { // eslint-disable-line no-unused-vars
    throw new Error("You have to implement the method '_get'!");
  }

  /**
   * Have to be implemented
   * Resolve with true OR false if rlKey doesn't exist
   * or Reject with error
   *
   * @param rlKey
   * @param {Object} options
   * @private
   *
   * @return Promise<any>
   */
  _delete(rlKey, options = {}) { // eslint-disable-line no-unused-vars
    throw new Error("You have to implement the method '_delete'!");
  }

  /**
   * Have to be implemented
   * Resolve with object used for {@link _getRateLimiterRes} to generate {@link RateLimiterRes}
   *
   * @param {string} rlKey
   * @param {number} points
   * @param {number} msDuration
   * @param {boolean} forceExpire
   * @param {Object} options
   * @abstract
   *
   * @return Promise<Object>
   */
  _upsert(rlKey, points, msDuration, forceExpire = false, options = {}) {
    throw new Error("You have to implement the method '_upsert'!");
  }
};

const RateLimiterStoreAbstract$6 = RateLimiterStoreAbstract_1;
const RateLimiterRes$c = RateLimiterRes_1;

const incrTtlLuaScript = `redis.call('set', KEYS[1], 0, 'EX', ARGV[2], 'NX') \
local consumed = redis.call('incrby', KEYS[1], ARGV[1]) \
local ttl = redis.call('pttl', KEYS[1]) \
if ttl == -1 then \
  redis.call('expire', KEYS[1], ARGV[2]) \
  ttl = 1000 * ARGV[2] \
end \
return {consumed, ttl} \
`;

class RateLimiterRedis$1 extends RateLimiterStoreAbstract$6 {
  /**
   *
   * @param {Object} opts
   * Defaults {
   *   ... see other in RateLimiterStoreAbstract
   *
   *   redis: RedisClient
   *   rejectIfRedisNotReady: boolean = false - reject / invoke insuranceLimiter immediately when redis connection is not "ready"
   * }
   */
  constructor(opts) {
    super(opts);
    this.client = opts.storeClient;

    this._rejectIfRedisNotReady = !!opts.rejectIfRedisNotReady;
    this._incrTtlLuaScript = opts.customIncrTtlLuaScript || incrTtlLuaScript;

    this.useRedisPackage = opts.useRedisPackage || this.client.constructor.name === 'Commander' || false;
    this.useRedis3AndLowerPackage = opts.useRedis3AndLowerPackage;
    if (typeof this.client.defineCommand === 'function') {
      this.client.defineCommand("rlflxIncr", {
        numberOfKeys: 1,
        lua: this._incrTtlLuaScript,
      });
    }
  }

  /**
   * Prevent actual redis call if redis connection is not ready
   * Because of different connection state checks for ioredis and node-redis, only this clients would be actually checked.
   * For any other clients all the requests would be passed directly to redis client
   * @return {boolean}
   * @private
   */
  _isRedisReady() {
    if (!this._rejectIfRedisNotReady) {
      return true;
    }
    // ioredis client
    if (this.client.status && this.client.status !== 'ready') {
      return false;
    }
    // node-redis client
    if (typeof this.client.isReady === 'function' && !this.client.isReady()) {
      return false;
    }
    return true;
  }

  _getRateLimiterRes(rlKey, changedPoints, result) {
    let [consumed, resTtlMs] = result;
    // Support ioredis results format
    if (Array.isArray(consumed)) {
      [, consumed] = consumed;
      [, resTtlMs] = resTtlMs;
    }

    const res = new RateLimiterRes$c();
    res.consumedPoints = parseInt(consumed);
    res.isFirstInDuration = res.consumedPoints === changedPoints;
    res.remainingPoints = Math.max(this.points - res.consumedPoints, 0);
    res.msBeforeNext = resTtlMs;

    return res;
  }

  async _upsert(rlKey, points, msDuration, forceExpire = false) {
    if (!this._isRedisReady()) {
      throw new Error('Redis connection is not ready');
    }

    const secDuration = Math.floor(msDuration / 1000);
    const multi = this.client.multi();

    if (forceExpire) {
      if (secDuration > 0) {
        if(!this.useRedisPackage && !this.useRedis3AndLowerPackage){
          multi.set(rlKey, points, "EX", secDuration);
        }else {
          multi.set(rlKey, points, { EX: secDuration });
        }
      } else {
        multi.set(rlKey, points);
      }

      if(!this.useRedisPackage && !this.useRedis3AndLowerPackage){
        return multi.pttl(rlKey).exec(true);
      }
      return multi.pTTL(rlKey).exec(true);
    }

    if (secDuration > 0) {
      if(!this.useRedisPackage && !this.useRedis3AndLowerPackage){
        return this.client.rlflxIncr(
          [rlKey].concat([String(points), String(secDuration), String(this.points), String(this.duration)]));
      }
      if (this.useRedis3AndLowerPackage) {
        return new Promise((resolve, reject) => {
          const incrCallback = function (err, result) {
            if (err) {
              return reject(err);
            }

            return resolve(result);
          };

          if (typeof this.client.rlflxIncr === 'function') {
            this.client.rlflxIncr(rlKey, points, secDuration, this.points, this.duration, incrCallback);
          } else {
            this.client.eval(this._incrTtlLuaScript, 1, rlKey, points, secDuration, this.points, this.duration, incrCallback);
          }
        });
      } else {
        return this.client.eval(this._incrTtlLuaScript, {
          keys: [rlKey],
          arguments: [String(points), String(secDuration), String(this.points), String(this.duration)],
        });
      }
    } else {
      if(!this.useRedisPackage && !this.useRedis3AndLowerPackage){
        return multi.incrby(rlKey, points).pttl(rlKey).exec(true);
      }

      return multi.incrBy(rlKey, points).pTTL(rlKey).exec(true);
    }
  }

  async _get(rlKey) {
    if (!this._isRedisReady()) {
      throw new Error('Redis connection is not ready');
    }
    if(!this.useRedisPackage && !this.useRedis3AndLowerPackage){
      return this.client
        .multi()
        .get(rlKey)
        .pttl(rlKey)
        .exec()
        .then((result) => {
          const [[,points]] = result;
          if (points === null) return null;
          return result;
        });
    }

    return this.client
      .multi()
      .get(rlKey)
      .pTTL(rlKey)
      .exec(true)
      .then((result) => {
        const [points] = result;
        if (points === null) return null;
        return result;
      });
  }

  _delete(rlKey) {
    return this.client
      .del(rlKey)
      .then(result => result > 0);
  }
}

var RateLimiterRedis_1 = RateLimiterRedis$1;

const RateLimiterStoreAbstract$5 = RateLimiterStoreAbstract_1;
const RateLimiterRes$b = RateLimiterRes_1;

/**
 * Get MongoDB driver version as upsert options differ
 * @params {Object} Client instance
 * @returns {Object} Version Object containing major, feature & minor versions.
 */
function getDriverVersion(client) {
  try {
    const _client = client.client ? client.client : client;

    let _v = [0, 0, 0];
    if (typeof _client.topology === 'undefined') {
      const { version } = _client.options.metadata.driver;
      _v = version.split('|', 1)[0].split('.').map(v => parseInt(v));
    } else {
      const { version } = _client.topology.s.options.metadata.driver;
      _v = version.split('.').map(v => parseInt(v));
    }

    return {
      major: _v[0],
      feature: _v[1],
      patch: _v[2],
    };
  } catch (err) {
    return { major: 0, feature: 0, patch: 0 };
  }
}

class RateLimiterMongo$1 extends RateLimiterStoreAbstract$5 {
  /**
   *
   * @param {Object} opts
   * Defaults {
   *   indexKeyPrefix: {attr1: 1, attr2: 1}
   *   ... see other in RateLimiterStoreAbstract
   *
   *   mongo: MongoClient
   * }
   */
  constructor(opts) {
    super(opts);

    this.dbName = opts.dbName;
    this.tableName = opts.tableName;
    this.indexKeyPrefix = opts.indexKeyPrefix;

    if (opts.mongo) {
      this.client = opts.mongo;
    } else {
      this.client = opts.storeClient;
    }
    if (typeof this.client.then === 'function') {
      // If Promise
      this.client
        .then((conn) => {
          this.client = conn;
          this._initCollection();
          this._driverVersion = getDriverVersion(this.client);
        });
    } else {
      this._initCollection();
      this._driverVersion = getDriverVersion(this.client);
    }
  }

  get dbName() {
    return this._dbName;
  }

  set dbName(value) {
    this._dbName = typeof value === 'undefined' ? RateLimiterMongo$1.getDbName() : value;
  }

  static getDbName() {
    return 'node-rate-limiter-flexible';
  }

  get tableName() {
    return this._tableName;
  }

  set tableName(value) {
    this._tableName = typeof value === 'undefined' ? this.keyPrefix : value;
  }

  get client() {
    return this._client;
  }

  set client(value) {
    if (typeof value === 'undefined') {
      throw new Error('mongo is not set');
    }
    this._client = value;
  }

  get indexKeyPrefix() {
    return this._indexKeyPrefix;
  }

  set indexKeyPrefix(obj) {
    this._indexKeyPrefix = obj || {};
  }

  _initCollection() {
    const db = typeof this.client.db === 'function'
      ? this.client.db(this.dbName)
      : this.client;

    const collection = db.collection(this.tableName);
    collection.createIndex({ expire: -1 }, { expireAfterSeconds: 0 });
    collection.createIndex(Object.assign({}, this.indexKeyPrefix, { key: 1 }), { unique: true });

    this._collection = collection;
  }

  _getRateLimiterRes(rlKey, changedPoints, result) {
    const res = new RateLimiterRes$b();

    let doc;
    if (typeof result.value === 'undefined') {
      doc = result;
    } else {
      doc = result.value;
    }

    res.isFirstInDuration = doc.points === changedPoints;
    res.consumedPoints = doc.points;

    res.remainingPoints = Math.max(this.points - res.consumedPoints, 0);
    res.msBeforeNext = doc.expire !== null
      ? Math.max(new Date(doc.expire).getTime() - Date.now(), 0)
      : -1;

    return res;
  }

  _upsert(key, points, msDuration, forceExpire = false, options = {}) {
    if (!this._collection) {
      return Promise.reject(Error('Mongo connection is not established'));
    }

    const docAttrs = options.attrs || {};

    let where;
    let upsertData;
    if (forceExpire) {
      where = { key };
      where = Object.assign(where, docAttrs);
      upsertData = {
        $set: {
          key,
          points,
          expire: msDuration > 0 ? new Date(Date.now() + msDuration) : null,
        },
      };
      upsertData.$set = Object.assign(upsertData.$set, docAttrs);
    } else {
      where = {
        $or: [
          { expire: { $gt: new Date() } },
          { expire: { $eq: null } },
        ],
        key,
      };
      where = Object.assign(where, docAttrs);
      upsertData = {
        $setOnInsert: {
          key,
          expire: msDuration > 0 ? new Date(Date.now() + msDuration) : null,
        },
        $inc: { points },
      };
      upsertData.$setOnInsert = Object.assign(upsertData.$setOnInsert, docAttrs);
    }

    // Options for collection updates differ between driver versions
    const upsertOptions = {
      upsert: true,
    };
    if ((this._driverVersion.major >= 4) ||
        (this._driverVersion.major === 3 &&
          (this._driverVersion.feature >=7) || 
          (this._driverVersion.feature >= 6 && 
              this._driverVersion.patch >= 7 ))) 
    {
      upsertOptions.returnDocument = 'after';
    } else {
      upsertOptions.returnOriginal = false;
    }

    /*
     * 1. Find actual limit and increment points
     * 2. If limit expired, but Mongo doesn't clean doc by TTL yet, try to replace limit doc completely
     * 3. If 2 or more Mongo threads try to insert the new limit doc, only the first succeed
     * 4. Try to upsert from step 1. Actual limit is created now, points are incremented without problems
     */
    return new Promise((resolve, reject) => {
      this._collection.findOneAndUpdate(
        where,
        upsertData,
        upsertOptions
      ).then((res) => {
        resolve(res);
      }).catch((errUpsert) => {
        if (errUpsert && errUpsert.code === 11000) { // E11000 duplicate key error collection
          const replaceWhere = Object.assign({ // try to replace OLD limit doc
            $or: [
              { expire: { $lte: new Date() } },
              { expire: { $eq: null } },
            ],
            key,
          }, docAttrs);

          const replaceTo = {
            $set: Object.assign({
              key,
              points,
              expire: msDuration > 0 ? new Date(Date.now() + msDuration) : null,
            }, docAttrs)
          };

          this._collection.findOneAndUpdate(
            replaceWhere,
            replaceTo,
            upsertOptions
          ).then((res) => {
            resolve(res);
          }).catch((errReplace) => {
            if (errReplace && errReplace.code === 11000) { // E11000 duplicate key error collection
              this._upsert(key, points, msDuration, forceExpire)
                .then(res => resolve(res))
                .catch(err => reject(err));
            } else {
              reject(errReplace);
            }
          });
        } else {
          reject(errUpsert);
        }
      });
    });
  }

  _get(rlKey, options = {}) {
    if (!this._collection) {
      return Promise.reject(Error('Mongo connection is not established'));
    }

    const docAttrs = options.attrs || {};

    const where = Object.assign({
      key: rlKey,
      $or: [
        { expire: { $gt: new Date() } },
        { expire: { $eq: null } },
      ],
    }, docAttrs);

    return this._collection.findOne(where);
  }

  _delete(rlKey, options = {}) {
    if (!this._collection) {
      return Promise.reject(Error('Mongo connection is not established'));
    }

    const docAttrs = options.attrs || {};
    const where = Object.assign({ key: rlKey }, docAttrs);

    return this._collection.deleteOne(where)
      .then(res => res.deletedCount > 0);
  }
}

var RateLimiterMongo_1 = RateLimiterMongo$1;

const RateLimiterStoreAbstract$4 = RateLimiterStoreAbstract_1;
const RateLimiterRes$a = RateLimiterRes_1;

class RateLimiterMySQL$1 extends RateLimiterStoreAbstract$4 {
  /**
   * @callback callback
   * @param {Object} err
   *
   * @param {Object} opts
   * @param {callback} cb
   * Defaults {
   *   ... see other in RateLimiterStoreAbstract
   *
   *   storeClient: anySqlClient,
   *   storeType: 'knex', // required only for Knex instance
   *   dbName: 'string',
   *   tableName: 'string',
   * }
   */
  constructor(opts, cb = null) {
    super(opts);

    this.client = opts.storeClient;
    this.clientType = opts.storeType;

    this.dbName = opts.dbName;
    this.tableName = opts.tableName;

    this.clearExpiredByTimeout = opts.clearExpiredByTimeout;

    this.tableCreated = opts.tableCreated;
    if (!this.tableCreated) {
      this._createDbAndTable()
        .then(() => {
          this.tableCreated = true;
          if (this.clearExpiredByTimeout) {
            this._clearExpiredHourAgo();
          }
          if (typeof cb === 'function') {
            cb();
          }
        })
        .catch((err) => {
          if (typeof cb === 'function') {
            cb(err);
          } else {
            throw err;
          }
        });
    } else {
      if (this.clearExpiredByTimeout) {
        this._clearExpiredHourAgo();
      }
      if (typeof cb === 'function') {
        cb();
      }
    }
  }

  clearExpired(expire) {
    return new Promise((resolve) => {
      this._getConnection()
        .then((conn) => {
          conn.query(`DELETE FROM ??.?? WHERE expire < ?`, [this.dbName, this.tableName, expire], () => {
            this._releaseConnection(conn);
            resolve();
          });
        })
        .catch(() => {
          resolve();
        });
    });
  }

  _clearExpiredHourAgo() {
    if (this._clearExpiredTimeoutId) {
      clearTimeout(this._clearExpiredTimeoutId);
    }
    this._clearExpiredTimeoutId = setTimeout(() => {
      this.clearExpired(Date.now() - 3600000) // Never rejected
        .then(() => {
          this._clearExpiredHourAgo();
        });
    }, 300000);
    this._clearExpiredTimeoutId.unref();
  }

  /**
   *
   * @return Promise<any>
   * @private
   */
  _getConnection() {
    switch (this.clientType) {
      case 'pool':
        return new Promise((resolve, reject) => {
          this.client.getConnection((errConn, conn) => {
            if (errConn) {
              return reject(errConn);
            }

            resolve(conn);
          });
        });
      case 'sequelize':
        return this.client.connectionManager.getConnection();
      case 'knex':
        return this.client.client.acquireConnection();
      default:
        return Promise.resolve(this.client);
    }
  }

  _releaseConnection(conn) {
    switch (this.clientType) {
      case 'pool':
        return conn.release();
      case 'sequelize':
        return this.client.connectionManager.releaseConnection(conn);
      case 'knex':
        return this.client.client.releaseConnection(conn);
      default:
        return true;
    }
  }

  /**
   *
   * @returns {Promise<any>}
   * @private
   */
  _createDbAndTable() {
    return new Promise((resolve, reject) => {
      this._getConnection()
        .then((conn) => {
          conn.query(`CREATE DATABASE IF NOT EXISTS \`${this.dbName}\`;`, (errDb) => {
            if (errDb) {
              this._releaseConnection(conn);
              return reject(errDb);
            }
            conn.query(this._getCreateTableStmt(), (err) => {
              if (err) {
                this._releaseConnection(conn);
                return reject(err);
              }
              this._releaseConnection(conn);
              resolve();
            });
          });
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  _getCreateTableStmt() {
    return `CREATE TABLE IF NOT EXISTS \`${this.dbName}\`.\`${this.tableName}\` (` +
      '`key` VARCHAR(255) CHARACTER SET utf8 NOT NULL,' +
      '`points` INT(9) NOT NULL default 0,' +
      '`expire` BIGINT UNSIGNED,' +
      'PRIMARY KEY (`key`)' +
      ') ENGINE = INNODB;';
  }

  get clientType() {
    return this._clientType;
  }

  set clientType(value) {
    if (typeof value === 'undefined') {
      if (this.client.constructor.name === 'Connection') {
        value = 'connection';
      } else if (this.client.constructor.name === 'Pool') {
        value = 'pool';
      } else if (this.client.constructor.name === 'Sequelize') {
        value = 'sequelize';
      } else {
        throw new Error('storeType is not defined');
      }
    }
    this._clientType = value.toLowerCase();
  }

  get dbName() {
    return this._dbName;
  }

  set dbName(value) {
    this._dbName = typeof value === 'undefined' ? 'rtlmtrflx' : value;
  }

  get tableName() {
    return this._tableName;
  }

  set tableName(value) {
    this._tableName = typeof value === 'undefined' ? this.keyPrefix : value;
  }

  get tableCreated() {
    return this._tableCreated
  }

  set tableCreated(value) {
    this._tableCreated = typeof value === 'undefined' ? false : !!value;
  }

  get clearExpiredByTimeout() {
    return this._clearExpiredByTimeout;
  }

  set clearExpiredByTimeout(value) {
    this._clearExpiredByTimeout = typeof value === 'undefined' ? true : Boolean(value);
  }

  _getRateLimiterRes(rlKey, changedPoints, result) {
    const res = new RateLimiterRes$a();
    const [row] = result;

    res.isFirstInDuration = changedPoints === row.points;
    res.consumedPoints = res.isFirstInDuration ? changedPoints : row.points;

    res.remainingPoints = Math.max(this.points - res.consumedPoints, 0);
    res.msBeforeNext = row.expire
      ? Math.max(row.expire - Date.now(), 0)
      : -1;

    return res;
  }

  _upsertTransaction(conn, key, points, msDuration, forceExpire) {
    return new Promise((resolve, reject) => {
      conn.query('BEGIN', (errBegin) => {
        if (errBegin) {
          conn.rollback();

          return reject(errBegin);
        }

        const dateNow = Date.now();
        const newExpire = msDuration > 0 ? dateNow + msDuration : null;

        let q;
        let values;
        if (forceExpire) {
          q = `INSERT INTO ??.?? VALUES (?, ?, ?)
          ON DUPLICATE KEY UPDATE 
            points = ?, 
            expire = ?;`;
          values = [
            this.dbName, this.tableName, key, points, newExpire,
            points,
            newExpire,
          ];
        } else {
          q = `INSERT INTO ??.?? VALUES (?, ?, ?)
          ON DUPLICATE KEY UPDATE 
            points = IF(expire <= ?, ?, points + (?)), 
            expire = IF(expire <= ?, ?, expire);`;
          values = [
            this.dbName, this.tableName, key, points, newExpire,
            dateNow, points, points,
            dateNow, newExpire,
          ];
        }

        conn.query(q, values, (errUpsert) => {
          if (errUpsert) {
            conn.rollback();

            return reject(errUpsert);
          }
          conn.query('SELECT points, expire FROM ??.?? WHERE `key` = ?;', [this.dbName, this.tableName, key], (errSelect, res) => {
            if (errSelect) {
              conn.rollback();

              return reject(errSelect);
            }

            conn.query('COMMIT', (err) => {
              if (err) {
                conn.rollback();

                return reject(err);
              }

              resolve(res);
            });
          });
        });
      });
    });
  }

  _upsert(key, points, msDuration, forceExpire = false) {
    if (!this.tableCreated) {
      return Promise.reject(Error('Table is not created yet'));
    }

    return new Promise((resolve, reject) => {
      this._getConnection()
        .then((conn) => {
          this._upsertTransaction(conn, key, points, msDuration, forceExpire)
            .then((res) => {
              resolve(res);
              this._releaseConnection(conn);
            })
            .catch((err) => {
              reject(err);
              this._releaseConnection(conn);
            });
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  _get(rlKey) {
    if (!this.tableCreated) {
      return Promise.reject(Error('Table is not created yet'));
    }

    return new Promise((resolve, reject) => {
      this._getConnection()
        .then((conn) => {
          conn.query(
            'SELECT points, expire FROM ??.?? WHERE `key` = ? AND (`expire` > ? OR `expire` IS NULL)',
            [this.dbName, this.tableName, rlKey, Date.now()],
            (err, res) => {
              if (err) {
                reject(err);
              } else if (res.length === 0) {
                resolve(null);
              } else {
                resolve(res);
              }

              this._releaseConnection(conn);
            } // eslint-disable-line
          );
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  _delete(rlKey) {
    if (!this.tableCreated) {
      return Promise.reject(Error('Table is not created yet'));
    }

    return new Promise((resolve, reject) => {
      this._getConnection()
        .then((conn) => {
          conn.query(
            'DELETE FROM ??.?? WHERE `key` = ?',
            [this.dbName, this.tableName, rlKey],
            (err, res) => {
              if (err) {
                reject(err);
              } else {
                resolve(res.affectedRows > 0);
              }

              this._releaseConnection(conn);
            } // eslint-disable-line
          );
        })
        .catch((err) => {
          reject(err);
        });
    });
  }
}

var RateLimiterMySQL_1 = RateLimiterMySQL$1;

const RateLimiterStoreAbstract$3 = RateLimiterStoreAbstract_1;
const RateLimiterRes$9 = RateLimiterRes_1;

class RateLimiterPostgres$1 extends RateLimiterStoreAbstract$3 {
  /**
   * @callback callback
   * @param {Object} err
   *
   * @param {Object} opts
   * @param {callback} cb
   * Defaults {
   *   ... see other in RateLimiterStoreAbstract
   *
   *   storeClient: postgresClient,
   *   storeType: 'knex', // required only for Knex instance
   *   tableName: 'string',
   *   schemaName: 'string', // optional
   * }
   */
  constructor(opts, cb = null) {
    super(opts);

    this.client = opts.storeClient;
    this.clientType = opts.storeType;

    this.tableName = opts.tableName;
    this.schemaName = opts.schemaName;

    this.clearExpiredByTimeout = opts.clearExpiredByTimeout;

    this.tableCreated = opts.tableCreated;
    if (!this.tableCreated) {
      this._createTable()
        .then(() => {
          this.tableCreated = true;
          if (this.clearExpiredByTimeout) {
            this._clearExpiredHourAgo();
          }
          if (typeof cb === 'function') {
            cb();
          }
        })
        .catch((err) => {
          if (typeof cb === 'function') {
            cb(err);
          } else {
            throw err;
          }
        });
    } else {
      if (this.clearExpiredByTimeout) {
        this._clearExpiredHourAgo();
      }
      if (typeof cb === 'function') {
        cb();
      }
    }
  }

  _getTableIdentifier() {
    return this.schemaName ? `"${this.schemaName}"."${this.tableName}"` : `"${this.tableName}"`;
  }

  clearExpired(expire) {
    return new Promise((resolve) => {
      const q = {
        name: 'rlflx-clear-expired',
        text: `DELETE FROM ${this._getTableIdentifier()} WHERE expire < $1`,
        values: [expire],
      };
      this._query(q)
        .then(() => {
          resolve();
        })
        .catch(() => {
          // Deleting expired query is not critical
          resolve();
        });
    });
  }

  /**
   * Delete all rows expired 1 hour ago once per 5 minutes
   *
   * @private
   */
  _clearExpiredHourAgo() {
    if (this._clearExpiredTimeoutId) {
      clearTimeout(this._clearExpiredTimeoutId);
    }
    this._clearExpiredTimeoutId = setTimeout(() => {
      this.clearExpired(Date.now() - 3600000) // Never rejected
        .then(() => {
          this._clearExpiredHourAgo();
        });
    }, 300000);
    this._clearExpiredTimeoutId.unref();
  }

  /**
   *
   * @return Promise<any>
   * @private
   */
  _getConnection() {
    switch (this.clientType) {
      case 'pool':
        return Promise.resolve(this.client);
      case 'sequelize':
        return this.client.connectionManager.getConnection();
      case 'knex':
        return this.client.client.acquireConnection();
      case 'typeorm':
        return Promise.resolve(this.client.driver.master);
      default:
        return Promise.resolve(this.client);
    }
  }

  _releaseConnection(conn) {
    switch (this.clientType) {
      case 'pool':
        return true;
      case 'sequelize':
        return this.client.connectionManager.releaseConnection(conn);
      case 'knex':
        return this.client.client.releaseConnection(conn);
      case 'typeorm':
        return true;
      default:
        return true;
    }
  }

  /**
   *
   * @returns {Promise<any>}
   * @private
   */
  _createTable() {
    return new Promise((resolve, reject) => {
      this._query({
        text: this._getCreateTableStmt(),
      })
        .then(() => {
          resolve();
        })
        .catch((err) => {
          if (err.code === '23505') {
            // Error: duplicate key value violates unique constraint "pg_type_typname_nsp_index"
            // Postgres doesn't handle concurrent table creation
            // It is supposed, that table is created by another worker
            resolve();
          } else {
            reject(err);
          }
        });
    });
  }

  _getCreateTableStmt() {
    return `CREATE TABLE IF NOT EXISTS ${this._getTableIdentifier()} (
      key varchar(255) PRIMARY KEY,
      points integer NOT NULL DEFAULT 0,
      expire bigint
    );`;
  }

  get clientType() {
    return this._clientType;
  }

  set clientType(value) {
    const constructorName = this.client.constructor.name;

    if (typeof value === 'undefined') {
      if (constructorName === 'Client') {
        value = 'client';
      } else if (
        constructorName === 'Pool' ||
        constructorName === 'BoundPool'
      ) {
        value = 'pool';
      } else if (constructorName === 'Sequelize') {
        value = 'sequelize';
      } else {
        throw new Error('storeType is not defined');
      }
    }

    this._clientType = value.toLowerCase();
  }

  get tableName() {
    return this._tableName;
  }

  set tableName(value) {
    this._tableName = typeof value === 'undefined' ? this.keyPrefix : value;
  }

  get schemaName() {
    return this._schemaName;
  }

  set schemaName(value) {
    this._schemaName = value;
  }

  get tableCreated() {
    return this._tableCreated;
  }

  set tableCreated(value) {
    this._tableCreated = typeof value === 'undefined' ? false : !!value;
  }

  get clearExpiredByTimeout() {
    return this._clearExpiredByTimeout;
  }

  set clearExpiredByTimeout(value) {
    this._clearExpiredByTimeout = typeof value === 'undefined' ? true : Boolean(value);
  }

  _getRateLimiterRes(rlKey, changedPoints, result) {
    const res = new RateLimiterRes$9();
    const row = result.rows[0];

    res.isFirstInDuration = changedPoints === row.points;
    res.consumedPoints = res.isFirstInDuration ? changedPoints : row.points;

    res.remainingPoints = Math.max(this.points - res.consumedPoints, 0);
    res.msBeforeNext = row.expire
      ? Math.max(row.expire - Date.now(), 0)
      : -1;

    return res;
  }

  _query(q) {
    const prefix = this.tableName.toLowerCase();
    const queryObj = { name: `${prefix}:${q.name}`, text: q.text, values: q.values };
    return new Promise((resolve, reject) => {
      this._getConnection()
        .then((conn) => {
          conn.query(queryObj)
            .then((res) => {
              resolve(res);
              this._releaseConnection(conn);
            })
            .catch((err) => {
              reject(err);
              this._releaseConnection(conn);
            });
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  _upsert(key, points, msDuration, forceExpire = false) {
    if (!this.tableCreated) {
      return Promise.reject(Error('Table is not created yet'));
    }

    const newExpire = msDuration > 0 ? Date.now() + msDuration : null;
    const expireQ = forceExpire
      ? ' $3 '
      : ` CASE
             WHEN ${this._getTableIdentifier()}.expire <= $4 THEN $3
             ELSE ${this._getTableIdentifier()}.expire
            END `;

    return this._query({
      name: forceExpire ? 'rlflx-upsert-force' : 'rlflx-upsert',
      text: `
            INSERT INTO ${this._getTableIdentifier()} VALUES ($1, $2, $3)
              ON CONFLICT(key) DO UPDATE SET
                points = CASE
                          WHEN (${this._getTableIdentifier()}.expire <= $4 OR 1=${forceExpire ? 1 : 0}) THEN $2
                          ELSE ${this._getTableIdentifier()}.points + ($2)
                         END,
                expire = ${expireQ}
            RETURNING points, expire;`,
      values: [key, points, newExpire, Date.now()],
    });
  }

  _get(rlKey) {
    if (!this.tableCreated) {
      return Promise.reject(Error('Table is not created yet'));
    }

    return new Promise((resolve, reject) => {
      this._query({
        name: 'rlflx-get',
        text: `
            SELECT points, expire FROM ${this._getTableIdentifier()} WHERE key = $1 AND (expire > $2 OR expire IS NULL);`,
        values: [rlKey, Date.now()],
      })
        .then((res) => {
          if (res.rowCount === 0) {
            res = null;
          }
          resolve(res);
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  _delete(rlKey) {
    if (!this.tableCreated) {
      return Promise.reject(Error('Table is not created yet'));
    }

    return this._query({
      name: 'rlflx-delete',
      text: `DELETE FROM ${this._getTableIdentifier()} WHERE key = $1`,
      values: [rlKey],
    })
      .then(res => res.rowCount > 0);
  }
}

var RateLimiterPostgres_1 = RateLimiterPostgres$1;

var Record_1 = class Record {
  /**
   *
   * @param value int
   * @param expiresAt Date|int
   * @param timeoutId
   */
  constructor(value, expiresAt, timeoutId = null) {
    this.value = value;
    this.expiresAt = expiresAt;
    this.timeoutId = timeoutId;
  }

  get value() {
    return this._value;
  }

  set value(value) {
    this._value = parseInt(value);
  }

  get expiresAt() {
    return this._expiresAt;
  }

  set expiresAt(value) {
    if (!(value instanceof Date) && Number.isInteger(value)) {
      value = new Date(value);
    }
    this._expiresAt = value;
  }

  get timeoutId() {
    return this._timeoutId;
  }

  set timeoutId(value) {
    this._timeoutId = value;
  }
};

const Record = Record_1;
const RateLimiterRes$8 = RateLimiterRes_1;

var MemoryStorage_1 = class MemoryStorage {
  constructor() {
    /**
     * @type {Object.<string, Record>}
     * @private
     */
    this._storage = {};
  }

  incrby(key, value, durationSec) {
    if (this._storage[key]) {
      const msBeforeExpires = this._storage[key].expiresAt
        ? this._storage[key].expiresAt.getTime() - new Date().getTime()
        : -1;
      if (!this._storage[key].expiresAt || msBeforeExpires > 0) {
        // Change value
        this._storage[key].value = this._storage[key].value + value;

        return new RateLimiterRes$8(0, msBeforeExpires, this._storage[key].value, false);
      }

      return this.set(key, value, durationSec);
    }
    return this.set(key, value, durationSec);
  }

  set(key, value, durationSec) {
    const durationMs = durationSec * 1000;

    if (this._storage[key] && this._storage[key].timeoutId) {
      clearTimeout(this._storage[key].timeoutId);
    }

    this._storage[key] = new Record(
      value,
      durationMs > 0 ? new Date(Date.now() + durationMs) : null
    );
    if (durationMs > 0) {
      this._storage[key].timeoutId = setTimeout(() => {
        delete this._storage[key];
      }, durationMs);
      if (this._storage[key].timeoutId.unref) {
        this._storage[key].timeoutId.unref();
      }
    }

    return new RateLimiterRes$8(0, durationMs === 0 ? -1 : durationMs, this._storage[key].value, true);
  }

  /**
   *
   * @param key
   * @returns {*}
   */
  get(key) {
    if (this._storage[key]) {
      const msBeforeExpires = this._storage[key].expiresAt
        ? this._storage[key].expiresAt.getTime() - new Date().getTime()
        : -1;
      return new RateLimiterRes$8(0, msBeforeExpires, this._storage[key].value, false);
    }
    return null;
  }

  /**
   *
   * @param key
   * @returns {boolean}
   */
  delete(key) {
    if (this._storage[key]) {
      if (this._storage[key].timeoutId) {
        clearTimeout(this._storage[key].timeoutId);
      }
      delete this._storage[key];
      return true;
    }
    return false;
  }
};

const RateLimiterAbstract$2 = RateLimiterAbstract_1;
const MemoryStorage = MemoryStorage_1;
const RateLimiterRes$7 = RateLimiterRes_1;

class RateLimiterMemory$2 extends RateLimiterAbstract$2 {
  constructor(opts = {}) {
    super(opts);

    this._memoryStorage = new MemoryStorage();
  }
  /**
   *
   * @param key
   * @param pointsToConsume
   * @param {Object} options
   * @returns {Promise<RateLimiterRes>}
   */
  consume(key, pointsToConsume = 1, options = {}) {
    return new Promise((resolve, reject) => {
      const rlKey = this.getKey(key);
      const secDuration = this._getKeySecDuration(options);
      let res = this._memoryStorage.incrby(rlKey, pointsToConsume, secDuration);
      res.remainingPoints = Math.max(this.points - res.consumedPoints, 0);

      if (res.consumedPoints > this.points) {
        // Block only first time when consumed more than points
        if (this.blockDuration > 0 && res.consumedPoints <= (this.points + pointsToConsume)) {
          // Block key
          res = this._memoryStorage.set(rlKey, res.consumedPoints, this.blockDuration);
        }
        reject(res);
      } else if (this.execEvenly && res.msBeforeNext > 0 && !res.isFirstInDuration) {
        // Execute evenly
        let delay = Math.ceil(res.msBeforeNext / (res.remainingPoints + 2));
        if (delay < this.execEvenlyMinDelayMs) {
          delay = res.consumedPoints * this.execEvenlyMinDelayMs;
        }

        setTimeout(resolve, delay, res);
      } else {
        resolve(res);
      }
    });
  }

  penalty(key, points = 1, options = {}) {
    const rlKey = this.getKey(key);
    return new Promise((resolve) => {
      const secDuration = this._getKeySecDuration(options);
      const res = this._memoryStorage.incrby(rlKey, points, secDuration);
      res.remainingPoints = Math.max(this.points - res.consumedPoints, 0);
      resolve(res);
    });
  }

  reward(key, points = 1, options = {}) {
    const rlKey = this.getKey(key);
    return new Promise((resolve) => {
      const secDuration = this._getKeySecDuration(options);
      const res = this._memoryStorage.incrby(rlKey, -points, secDuration);
      res.remainingPoints = Math.max(this.points - res.consumedPoints, 0);
      resolve(res);
    });
  }

  /**
   * Block any key for secDuration seconds
   *
   * @param key
   * @param secDuration
   */
  block(key, secDuration) {
    const msDuration = secDuration * 1000;
    const initPoints = this.points + 1;

    this._memoryStorage.set(this.getKey(key), initPoints, secDuration);
    return Promise.resolve(
      new RateLimiterRes$7(0, msDuration === 0 ? -1 : msDuration, initPoints)
    );
  }

  set(key, points, secDuration) {
    const msDuration = (secDuration >= 0 ? secDuration : this.duration) * 1000;

    this._memoryStorage.set(this.getKey(key), points, secDuration);
    return Promise.resolve(
      new RateLimiterRes$7(0, msDuration === 0 ? -1 : msDuration, points)
    );
  }

  get(key) {
    const res = this._memoryStorage.get(this.getKey(key));
    if (res !== null) {
      res.remainingPoints = Math.max(this.points - res.consumedPoints, 0);
    }

    return Promise.resolve(res);
  }

  delete(key) {
    return Promise.resolve(this._memoryStorage.delete(this.getKey(key)));
  }
}

var RateLimiterMemory_1 = RateLimiterMemory$2;

/**
 * Implements rate limiting in cluster using built-in IPC
 *
 * Two classes are described here: master and worker
 * Master have to be create in the master process without any options.
 * Any number of rate limiters can be created in workers, but each rate limiter must be with unique keyPrefix
 *
 * Workflow:
 * 1. master rate limiter created in master process
 * 2. worker rate limiter sends 'init' message with necessary options during creating
 * 3. master receives options and adds new rate limiter by keyPrefix if it isn't created yet
 * 4. master sends 'init' back to worker's rate limiter
 * 5. worker can process requests immediately,
 *    but they will be postponed by 'workerWaitInit' until master sends 'init' to worker
 * 6. every request to worker rate limiter creates a promise
 * 7. if master doesn't response for 'timeout', promise is rejected
 * 8. master sends 'resolve' or 'reject' command to worker
 * 9. worker resolves or rejects promise depending on message from master
 *
 */

const cluster$2 = require$$0$1;
const crypto = require$$1;
const RateLimiterAbstract$1 = RateLimiterAbstract_1;
const RateLimiterMemory$1 = RateLimiterMemory_1;
const RateLimiterRes$6 = RateLimiterRes_1;

const channel = 'rate_limiter_flexible';
let masterInstance = null;

const masterSendToWorker = function (worker, msg, type, res) {
  let data;
  if (res === null || res === true || res === false) {
    data = res;
  } else {
    data = {
      remainingPoints: res.remainingPoints,
      msBeforeNext: res.msBeforeNext,
      consumedPoints: res.consumedPoints,
      isFirstInDuration: res.isFirstInDuration,
    };
  }
  worker.send({
    channel,
    keyPrefix: msg.keyPrefix, // which rate limiter exactly
    promiseId: msg.promiseId,
    type,
    data,
  });
};

const workerWaitInit = function (payload) {
  setTimeout(() => {
    if (this._initiated) {
      process.send(payload);
      // Promise will be removed by timeout if too long
    } else if (typeof this._promises[payload.promiseId] !== 'undefined') {
      workerWaitInit.call(this, payload);
    }
  }, 30);
};

const workerSendToMaster = function (func, promiseId, key, arg, opts) {
  const payload = {
    channel,
    keyPrefix: this.keyPrefix,
    func,
    promiseId,
    data: {
      key,
      arg,
      opts,
    },
  };

  if (!this._initiated) {
    // Wait init before sending messages to master
    workerWaitInit.call(this, payload);
  } else {
    process.send(payload);
  }
};

const masterProcessMsg = function (worker, msg) {
  if (!msg || msg.channel !== channel || typeof this._rateLimiters[msg.keyPrefix] === 'undefined') {
    return false;
  }

  let promise;

  switch (msg.func) {
    case 'consume':
      promise = this._rateLimiters[msg.keyPrefix].consume(msg.data.key, msg.data.arg, msg.data.opts);
      break;
    case 'penalty':
      promise = this._rateLimiters[msg.keyPrefix].penalty(msg.data.key, msg.data.arg, msg.data.opts);
      break;
    case 'reward':
      promise = this._rateLimiters[msg.keyPrefix].reward(msg.data.key, msg.data.arg, msg.data.opts);
      break;
    case 'block':
      promise = this._rateLimiters[msg.keyPrefix].block(msg.data.key, msg.data.arg, msg.data.opts);
      break;
    case 'get':
      promise = this._rateLimiters[msg.keyPrefix].get(msg.data.key, msg.data.opts);
      break;
    case 'delete':
      promise = this._rateLimiters[msg.keyPrefix].delete(msg.data.key, msg.data.opts);
      break;
    default:
      return false;
  }

  if (promise) {
    promise
      .then((res) => {
        masterSendToWorker(worker, msg, 'resolve', res);
      })
      .catch((rejRes) => {
        masterSendToWorker(worker, msg, 'reject', rejRes);
      });
  }
};

const workerProcessMsg = function (msg) {
  if (!msg || msg.channel !== channel || msg.keyPrefix !== this.keyPrefix) {
    return false;
  }

  if (this._promises[msg.promiseId]) {
    clearTimeout(this._promises[msg.promiseId].timeoutId);
    let res;
    if (msg.data === null || msg.data === true || msg.data === false) {
      res = msg.data;
    } else {
      res = new RateLimiterRes$6(
        msg.data.remainingPoints,
        msg.data.msBeforeNext,
        msg.data.consumedPoints,
        msg.data.isFirstInDuration // eslint-disable-line comma-dangle
      );
    }

    switch (msg.type) {
      case 'resolve':
        this._promises[msg.promiseId].resolve(res);
        break;
      case 'reject':
        this._promises[msg.promiseId].reject(res);
        break;
      default:
        throw new Error(`RateLimiterCluster: no such message type '${msg.type}'`);
    }

    delete this._promises[msg.promiseId];
  }
};
/**
 * Prepare options to send to master
 * Master will create rate limiter depending on options
 *
 * @returns {{points: *, duration: *, blockDuration: *, execEvenly: *, execEvenlyMinDelayMs: *, keyPrefix: *}}
 */
const getOpts = function () {
  return {
    points: this.points,
    duration: this.duration,
    blockDuration: this.blockDuration,
    execEvenly: this.execEvenly,
    execEvenlyMinDelayMs: this.execEvenlyMinDelayMs,
    keyPrefix: this.keyPrefix,
  };
};

const savePromise = function (resolve, reject) {
  const hrtime = process.hrtime();
  let promiseId = hrtime[0].toString() + hrtime[1].toString();

  if (typeof this._promises[promiseId] !== 'undefined') {
    promiseId += crypto.randomBytes(12).toString('base64');
  }

  this._promises[promiseId] = {
    resolve,
    reject,
    timeoutId: setTimeout(() => {
      delete this._promises[promiseId];
      reject(new Error('RateLimiterCluster timeout: no answer from master in time'));
    }, this.timeoutMs),
  };

  return promiseId;
};

class RateLimiterClusterMaster$1 {
  constructor() {
    if (masterInstance) {
      return masterInstance;
    }

    this._rateLimiters = {};

    cluster$2.setMaxListeners(0);

    cluster$2.on('message', (worker, msg) => {
      if (msg && msg.channel === channel && msg.type === 'init') {
        // If init request, check or create rate limiter by key prefix and send 'init' back to worker
        if (typeof this._rateLimiters[msg.opts.keyPrefix] === 'undefined') {
          this._rateLimiters[msg.opts.keyPrefix] = new RateLimiterMemory$1(msg.opts);
        }

        worker.send({
          channel,
          type: 'init',
          keyPrefix: msg.opts.keyPrefix,
        });
      } else {
        masterProcessMsg.call(this, worker, msg);
      }
    });

    masterInstance = this;
  }
}

class RateLimiterClusterMasterPM2$1 {
  constructor(pm2) {
    if (masterInstance) {
      return masterInstance;
    }

    this._rateLimiters = {};

    pm2.launchBus((err, pm2Bus) => {
      pm2Bus.on('process:msg', (packet) => {
        const msg = packet.raw;
        if (msg && msg.channel === channel && msg.type === 'init') {
          // If init request, check or create rate limiter by key prefix and send 'init' back to worker
          if (typeof this._rateLimiters[msg.opts.keyPrefix] === 'undefined') {
            this._rateLimiters[msg.opts.keyPrefix] = new RateLimiterMemory$1(msg.opts);
          }

          pm2.sendDataToProcessId(packet.process.pm_id, {
            data: {},
            topic: channel,
            channel,
            type: 'init',
            keyPrefix: msg.opts.keyPrefix,
          }, (sendErr, res) => {
            if (sendErr) {
              console.log(sendErr, res);
            }
          });
        } else {
          const worker = {
            send: (msgData) => {
              const pm2Message = msgData;
              pm2Message.topic = channel;
              if (typeof pm2Message.data === 'undefined') {
                pm2Message.data = {};
              }
              pm2.sendDataToProcessId(packet.process.pm_id, pm2Message, (sendErr, res) => {
                if (sendErr) {
                  console.log(sendErr, res);
                }
              });
            },
          };
          masterProcessMsg.call(this, worker, msg);
        }
      });
    });

    masterInstance = this;
  }
}

class RateLimiterClusterWorker extends RateLimiterAbstract$1 {
  get timeoutMs() {
    return this._timeoutMs;
  }

  set timeoutMs(value) {
    this._timeoutMs = typeof value === 'undefined' ? 5000 : Math.abs(parseInt(value));
  }

  constructor(opts = {}) {
    super(opts);

    process.setMaxListeners(0);

    this.timeoutMs = opts.timeoutMs;

    this._initiated = false;

    process.on('message', (msg) => {
      if (msg && msg.channel === channel && msg.type === 'init' && msg.keyPrefix === this.keyPrefix) {
        this._initiated = true;
      } else {
        workerProcessMsg.call(this, msg);
      }
    });

    // Create limiter on master with specific options
    process.send({
      channel,
      type: 'init',
      opts: getOpts.call(this),
    });

    this._promises = {};
  }

  consume(key, pointsToConsume = 1, options = {}) {
    return new Promise((resolve, reject) => {
      const promiseId = savePromise.call(this, resolve, reject);

      workerSendToMaster.call(this, 'consume', promiseId, key, pointsToConsume, options);
    });
  }

  penalty(key, points = 1, options = {}) {
    return new Promise((resolve, reject) => {
      const promiseId = savePromise.call(this, resolve, reject);

      workerSendToMaster.call(this, 'penalty', promiseId, key, points, options);
    });
  }

  reward(key, points = 1, options = {}) {
    return new Promise((resolve, reject) => {
      const promiseId = savePromise.call(this, resolve, reject);

      workerSendToMaster.call(this, 'reward', promiseId, key, points, options);
    });
  }

  block(key, secDuration, options = {}) {
    return new Promise((resolve, reject) => {
      const promiseId = savePromise.call(this, resolve, reject);

      workerSendToMaster.call(this, 'block', promiseId, key, secDuration, options);
    });
  }

  get(key, options = {}) {
    return new Promise((resolve, reject) => {
      const promiseId = savePromise.call(this, resolve, reject);

      workerSendToMaster.call(this, 'get', promiseId, key, options);
    });
  }

  delete(key, options = {}) {
    return new Promise((resolve, reject) => {
      const promiseId = savePromise.call(this, resolve, reject);

      workerSendToMaster.call(this, 'delete', promiseId, key, options);
    });
  }
}

var RateLimiterCluster$1 = {
  RateLimiterClusterMaster: RateLimiterClusterMaster$1,
  RateLimiterClusterMasterPM2: RateLimiterClusterMasterPM2$1,
  RateLimiterCluster: RateLimiterClusterWorker,
};

const RateLimiterStoreAbstract$2 = RateLimiterStoreAbstract_1;
const RateLimiterRes$5 = RateLimiterRes_1;

class RateLimiterMemcache$1 extends RateLimiterStoreAbstract$2 {
  /**
   *
   * @param {Object} opts
   * Defaults {
   *   ... see other in RateLimiterStoreAbstract
   *
   *   storeClient: memcacheClient
   * }
   */
  constructor(opts) {
    super(opts);

    this.client = opts.storeClient;
  }

  _getRateLimiterRes(rlKey, changedPoints, result) {
    const res = new RateLimiterRes$5();
    res.consumedPoints = parseInt(result.consumedPoints);
    res.isFirstInDuration = result.consumedPoints === changedPoints;
    res.remainingPoints = Math.max(this.points - res.consumedPoints, 0);
    res.msBeforeNext = result.msBeforeNext;

    return res;
  }

  _upsert(rlKey, points, msDuration, forceExpire = false, options = {}) {
    return new Promise((resolve, reject) => {
      const nowMs = Date.now();
      const secDuration = Math.floor(msDuration / 1000);

      if (forceExpire) {
        this.client.set(rlKey, points, secDuration, (err) => {
          if (!err) {
            this.client.set(
              `${rlKey}_expire`,
              secDuration > 0 ? nowMs + (secDuration * 1000) : -1,
              secDuration,
              () => {
                const res = {
                  consumedPoints: points,
                  msBeforeNext: secDuration > 0 ? secDuration * 1000 : -1,
                };
                resolve(res);
              }
            );
          } else {
            reject(err);
          }
        });
      } else {
        this.client.incr(rlKey, points, (err, consumedPoints) => {
          if (err || consumedPoints === false) {
            this.client.add(rlKey, points, secDuration, (errAddKey, createdNew) => {
              if (errAddKey || !createdNew) {
                // Try to upsert again in case of race condition
                if (typeof options.attemptNumber === 'undefined' || options.attemptNumber < 3) {
                  const nextOptions = Object.assign({}, options);
                  nextOptions.attemptNumber = nextOptions.attemptNumber ? (nextOptions.attemptNumber + 1) : 1;

                  this._upsert(rlKey, points, msDuration, forceExpire, nextOptions)
                    .then(resUpsert => resolve(resUpsert))
                    .catch(errUpsert => reject(errUpsert));
                } else {
                  reject(new Error('Can not add key'));
                }
              } else {
                this.client.add(
                  `${rlKey}_expire`,
                  secDuration > 0 ? nowMs + (secDuration * 1000) : -1,
                  secDuration,
                  () => {
                    const res = {
                      consumedPoints: points,
                      msBeforeNext: secDuration > 0 ? secDuration * 1000 : -1,
                    };
                    resolve(res);
                  }
                );
              }
            });
          } else {
            this.client.get(`${rlKey}_expire`, (errGetExpire, resGetExpireMs) => {
              if (errGetExpire) {
                reject(errGetExpire);
              } else {
                const expireMs = resGetExpireMs === false ? 0 : resGetExpireMs;
                const res = {
                  consumedPoints,
                  msBeforeNext: expireMs >= 0 ? Math.max(expireMs - nowMs, 0) : -1,
                };
                resolve(res);
              }
            });
          }
        });
      }
    });
  }

  _get(rlKey) {
    return new Promise((resolve, reject) => {
      const nowMs = Date.now();

      this.client.get(rlKey, (err, consumedPoints) => {
        if (!consumedPoints) {
          resolve(null);
        } else {
          this.client.get(`${rlKey}_expire`, (errGetExpire, resGetExpireMs) => {
            if (errGetExpire) {
              reject(errGetExpire);
            } else {
              const expireMs = resGetExpireMs === false ? 0 : resGetExpireMs;
              const res = {
                consumedPoints,
                msBeforeNext: expireMs >= 0 ? Math.max(expireMs - nowMs, 0) : -1,
              };
              resolve(res);
            }
          });
        }
      });
    });
  }

  _delete(rlKey) {
    return new Promise((resolve, reject) => {
      this.client.del(rlKey, (err, res) => {
        if (err) {
          reject(err);
        } else if (res === false) {
          resolve(res);
        } else {
          this.client.del(`${rlKey}_expire`, (errDelExpire) => {
            if (errDelExpire) {
              reject(errDelExpire);
            } else {
              resolve(res);
            }
          });
        }
      });
    });
  }
}

var RateLimiterMemcache_1 = RateLimiterMemcache$1;

const RateLimiterRes$4 = RateLimiterRes_1;

var RLWrapperBlackAndWhite_1 = class RLWrapperBlackAndWhite {
  constructor(opts = {}) {
    this.limiter = opts.limiter;
    this.blackList = opts.blackList;
    this.whiteList = opts.whiteList;
    this.isBlackListed = opts.isBlackListed;
    this.isWhiteListed = opts.isWhiteListed;
    this.runActionAnyway = opts.runActionAnyway;
  }

  get limiter() {
    return this._limiter;
  }

  set limiter(value) {
    if (typeof value === 'undefined') {
      throw new Error('limiter is not set');
    }

    this._limiter = value;
  }

  get runActionAnyway() {
    return this._runActionAnyway;
  }

  set runActionAnyway(value) {
    this._runActionAnyway = typeof value === 'undefined' ? false : value;
  }

  get blackList() {
    return this._blackList;
  }

  set blackList(value) {
    this._blackList = Array.isArray(value) ? value : [];
  }

  get isBlackListed() {
    return this._isBlackListed;
  }

  set isBlackListed(func) {
    if (typeof func === 'undefined') {
      func = () => false;
    }
    if (typeof func !== 'function') {
      throw new Error('isBlackListed must be function');
    }
    this._isBlackListed = func;
  }

  get whiteList() {
    return this._whiteList;
  }

  set whiteList(value) {
    this._whiteList = Array.isArray(value) ? value : [];
  }

  get isWhiteListed() {
    return this._isWhiteListed;
  }

  set isWhiteListed(func) {
    if (typeof func === 'undefined') {
      func = () => false;
    }
    if (typeof func !== 'function') {
      throw new Error('isWhiteListed must be function');
    }
    this._isWhiteListed = func;
  }

  isBlackListedSomewhere(key) {
    return this.blackList.indexOf(key) >= 0 || this.isBlackListed(key);
  }

  isWhiteListedSomewhere(key) {
    return this.whiteList.indexOf(key) >= 0 || this.isWhiteListed(key);
  }

  getBlackRes() {
    return new RateLimiterRes$4(0, Number.MAX_SAFE_INTEGER, 0, false);
  }

  getWhiteRes() {
    return new RateLimiterRes$4(Number.MAX_SAFE_INTEGER, 0, 0, false);
  }

  rejectBlack() {
    return Promise.reject(this.getBlackRes());
  }

  resolveBlack() {
    return Promise.resolve(this.getBlackRes());
  }

  resolveWhite() {
    return Promise.resolve(this.getWhiteRes());
  }

  consume(key, pointsToConsume = 1) {
    let res;
    if (this.isWhiteListedSomewhere(key)) {
      res = this.resolveWhite();
    } else if (this.isBlackListedSomewhere(key)) {
      res = this.rejectBlack();
    }

    if (typeof res === 'undefined') {
      return this.limiter.consume(key, pointsToConsume);
    }

    if (this.runActionAnyway) {
      this.limiter.consume(key, pointsToConsume).catch(() => {});
    }
    return res;
  }

  block(key, secDuration) {
    let res;
    if (this.isWhiteListedSomewhere(key)) {
      res = this.resolveWhite();
    } else if (this.isBlackListedSomewhere(key)) {
      res = this.resolveBlack();
    }

    if (typeof res === 'undefined') {
      return this.limiter.block(key, secDuration);
    }

    if (this.runActionAnyway) {
      this.limiter.block(key, secDuration).catch(() => {});
    }
    return res;
  }

  penalty(key, points) {
    let res;
    if (this.isWhiteListedSomewhere(key)) {
      res = this.resolveWhite();
    } else if (this.isBlackListedSomewhere(key)) {
      res = this.resolveBlack();
    }

    if (typeof res === 'undefined') {
      return this.limiter.penalty(key, points);
    }

    if (this.runActionAnyway) {
      this.limiter.penalty(key, points).catch(() => {});
    }
    return res;
  }

  reward(key, points) {
    let res;
    if (this.isWhiteListedSomewhere(key)) {
      res = this.resolveWhite();
    } else if (this.isBlackListedSomewhere(key)) {
      res = this.resolveBlack();
    }

    if (typeof res === 'undefined') {
      return this.limiter.reward(key, points);
    }

    if (this.runActionAnyway) {
      this.limiter.reward(key, points).catch(() => {});
    }
    return res;
  }

  get(key) {
    let res;
    if (this.isWhiteListedSomewhere(key)) {
      res = this.resolveWhite();
    } else if (this.isBlackListedSomewhere(key)) {
      res = this.resolveBlack();
    }

    if (typeof res === 'undefined' || this.runActionAnyway) {
      return this.limiter.get(key);
    }

    return res;
  }

  delete(key) {
    return this.limiter.delete(key);
  }
};

const RateLimiterAbstract = RateLimiterAbstract_1;

var RateLimiterUnion_1 = class RateLimiterUnion {
  constructor(...limiters) {
    if (limiters.length < 1) {
      throw new Error('RateLimiterUnion: at least one limiter have to be passed');
    }
    limiters.forEach((limiter) => {
      if (!(limiter instanceof RateLimiterAbstract)) {
        throw new Error('RateLimiterUnion: all limiters have to be instance of RateLimiterAbstract');
      }
    });

    this._limiters = limiters;
  }

  consume(key, points = 1) {
    return new Promise((resolve, reject) => {
      const promises = [];
      this._limiters.forEach((limiter) => {
        promises.push(limiter.consume(key, points).catch(rej => ({ rejected: true, rej })));
      });

      Promise.all(promises)
        .then((res) => {
          const resObj = {};
          let rejected = false;

          res.forEach((item) => {
            if (item.rejected === true) {
              rejected = true;
            }
          });

          for (let i = 0; i < res.length; i++) {
            if (rejected && res[i].rejected === true) {
              resObj[this._limiters[i].keyPrefix] = res[i].rej;
            } else if (!rejected) {
              resObj[this._limiters[i].keyPrefix] = res[i];
            }
          }

          if (rejected) {
            reject(resObj);
          } else {
            resolve(resObj);
          }
        });
    });
  }
};

var RateLimiterQueueError_1 = class RateLimiterQueueError extends Error {
  constructor(message, extra) {
    super();
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
    this.name = 'CustomError';
    this.message = message;
    if (extra) {
      this.extra = extra;
    }
  }
};

const RateLimiterQueueError = RateLimiterQueueError_1;
const MAX_QUEUE_SIZE = 4294967295;
const KEY_DEFAULT = 'limiter';

var RateLimiterQueue_1 = class RateLimiterQueue {
  constructor(limiterFlexible, opts = {
    maxQueueSize: MAX_QUEUE_SIZE,
  }) {
    this._queueLimiters = {
      KEY_DEFAULT: new RateLimiterQueueInternal(limiterFlexible, opts)
    };
    this._limiterFlexible = limiterFlexible;
    this._maxQueueSize = opts.maxQueueSize;
  }

  getTokensRemaining(key = KEY_DEFAULT) {
    if (this._queueLimiters[key]) {
      return this._queueLimiters[key].getTokensRemaining()
    } else {
      return Promise.resolve(this._limiterFlexible.points)
    }
  }

  removeTokens(tokens, key = KEY_DEFAULT) {
    if (!this._queueLimiters[key]) {
      this._queueLimiters[key] = new RateLimiterQueueInternal(
        this._limiterFlexible, {
          key,
          maxQueueSize: this._maxQueueSize,
        });
    }

    return this._queueLimiters[key].removeTokens(tokens)
  }
};

class RateLimiterQueueInternal {

  constructor(limiterFlexible, opts = {
    maxQueueSize: MAX_QUEUE_SIZE,
    key: KEY_DEFAULT,
  }) {
    this._key = opts.key;
    this._waitTimeout = null;
    this._queue = [];
    this._limiterFlexible = limiterFlexible;

    this._maxQueueSize = opts.maxQueueSize;
  }

  getTokensRemaining() {
    return this._limiterFlexible.get(this._key)
      .then((rlRes) => {
        return rlRes !== null ? rlRes.remainingPoints : this._limiterFlexible.points;
      })
  }

  removeTokens(tokens) {
    const _this = this;

    return new Promise((resolve, reject) => {
      if (tokens > _this._limiterFlexible.points) {
        reject(new RateLimiterQueueError(`Requested tokens ${tokens} exceeds maximum ${_this._limiterFlexible.points} tokens per interval`));
        return
      }

      if (_this._queue.length > 0) {
        _this._queueRequest.call(_this, resolve, reject, tokens);
      } else {
        _this._limiterFlexible.consume(_this._key, tokens)
          .then((res) => {
            resolve(res.remainingPoints);
          })
          .catch((rej) => {
            if (rej instanceof Error) {
              reject(rej);
            } else {
              _this._queueRequest.call(_this, resolve, reject, tokens);
              if (_this._waitTimeout === null) {
                _this._waitTimeout = setTimeout(_this._processFIFO.bind(_this), rej.msBeforeNext);
              }
            }
          });
      }
    })
  }

  _queueRequest(resolve, reject, tokens) {
    const _this = this;
    if (_this._queue.length < _this._maxQueueSize) {
      _this._queue.push({resolve, reject, tokens});
    } else {
      reject(new RateLimiterQueueError(`Number of requests reached it's maximum ${_this._maxQueueSize}`));
    }
  }

  _processFIFO() {
    const _this = this;

    if (_this._waitTimeout !== null) {
      clearTimeout(_this._waitTimeout);
      _this._waitTimeout = null;
    }

    if (_this._queue.length === 0) {
      return;
    }

    const item = _this._queue.shift();
    _this._limiterFlexible.consume(_this._key, item.tokens)
      .then((res) => {
        item.resolve(res.remainingPoints);
        _this._processFIFO.call(_this);
      })
      .catch((rej) => {
        if (rej instanceof Error) {
          item.reject(rej);
          _this._processFIFO.call(_this);
        } else {
          _this._queue.unshift(item);
          if (_this._waitTimeout === null) {
            _this._waitTimeout = setTimeout(_this._processFIFO.bind(_this), rej.msBeforeNext);
          }
        }
      });
  }
}

const RateLimiterRes$3 = RateLimiterRes_1;

/**
 * Bursty rate limiter exposes only msBeforeNext time and doesn't expose points from bursty limiter by default
 * @type {BurstyRateLimiter}
 */
var BurstyRateLimiter_1 = class BurstyRateLimiter {
  constructor(rateLimiter, burstLimiter) {
    this._rateLimiter = rateLimiter;
    this._burstLimiter = burstLimiter;
  }

  /**
   * Merge rate limiter response objects. Responses can be null
   *
   * @param {RateLimiterRes} [rlRes] Rate limiter response
   * @param {RateLimiterRes} [blRes] Bursty limiter response
   */
  _combineRes(rlRes, blRes) {
    if (!rlRes) {
      return null
    }

    return new RateLimiterRes$3(
      rlRes.remainingPoints,
      Math.min(rlRes.msBeforeNext, blRes ? blRes.msBeforeNext : 0),
      rlRes.consumedPoints,
      rlRes.isFirstInDuration
    )
  }

  /**
   * @param key
   * @param pointsToConsume
   * @param options
   * @returns {Promise<any>}
   */
  consume(key, pointsToConsume = 1, options = {}) {
    return this._rateLimiter.consume(key, pointsToConsume, options)
      .catch((rlRej) => {
        if (rlRej instanceof RateLimiterRes$3) {
          return this._burstLimiter.consume(key, pointsToConsume, options)
            .then((blRes) => {
              return Promise.resolve(this._combineRes(rlRej, blRes))
            })
            .catch((blRej) => {
                if (blRej instanceof RateLimiterRes$3) {
                  return Promise.reject(this._combineRes(rlRej, blRej))
                } else {
                  return Promise.reject(blRej)
                }
              }
            )
        } else {
          return Promise.reject(rlRej)
        }
      })
  }

  /**
   * It doesn't expose available points from burstLimiter
   *
   * @param key
   * @returns {Promise<RateLimiterRes>}
   */
  get(key) {
    return Promise.all([
      this._rateLimiter.get(key),
      this._burstLimiter.get(key),
    ]).then(([rlRes, blRes]) => {
      return this._combineRes(rlRes, blRes);
    });
  }

  get points() {
    return this._rateLimiter.points;
  }
};

const RateLimiterRes$2 = RateLimiterRes_1;
const RateLimiterStoreAbstract$1 = RateLimiterStoreAbstract_1;

class DynamoItem {
  /**
   * Create a DynamoItem.
   * @param {string} rlKey - The key for the rate limiter.
   * @param {number} points - The number of points.
   * @param {number} expire - The expiration time in seconds.
   */
  constructor(rlKey, points, expire) {
    this.key = rlKey;
    this.points = points;
    this.expire = expire;
  }
}

// Free tier DynamoDB provisioned mode params
const DEFAULT_READ_CAPACITY_UNITS = 25;
const DEFAULT_WRITE_CAPACITY_UNITS = 25;

/**
 * Implementation of RateLimiterStoreAbstract using DynamoDB.
 * @class RateLimiterDynamo
 * @extends RateLimiterStoreAbstract
 */
class RateLimiterDynamo$1 extends RateLimiterStoreAbstract$1 {

    /**
     * Constructs a new instance of the class.
     * The storeClient MUST be an instance of AWS.DynamoDB NOT of AWS.DynamoDBClient.
     *
     * @param {Object} opts - The options for the constructor.
     * @param {function} cb - The callback function (optional).
     * @return {void}
     */
    constructor(opts, cb = null) {
        super(opts);

        this.client = opts.storeClient;
        this.tableName = opts.tableName;
        this.tableCreated = opts.tableCreated;
        
        if (!this.tableCreated) {
          this._createTable(opts.dynamoTableOpts)
          .then((data) => {
            this.tableCreated = true;

            this._setTTL()
            .finally(() => {
              // Callback invocation
              if (typeof cb === 'function') {
                cb();
              }
            });
            
          })
          .catch( err => {
            //callback invocation
            if (typeof cb === 'function') {
              cb(err);
            } else {
              throw err;
            }
          });

        } else {

          this._setTTL()
          .finally(() => {
            // Callback invocation
            if (typeof cb === 'function') {
              cb();
            }
          });
        }
    }

    get tableName() {
        return this._tableName;
    }

    set tableName(value) {
        this._tableName = typeof value === 'undefined' ? 'node-rate-limiter-flexible' : value;
    }

    get tableCreated() {
        return this._tableCreated
    }
    
    set tableCreated(value) {
        this._tableCreated = typeof value === 'undefined' ? false : !!value;
    }

    /**
     * Creates a table in the database. Return null if the table already exists.
     * 
     * @param {{readCapacityUnits: number, writeCapacityUnits: number}} tableOpts
     * @return {Promise} A promise that resolves with the result of creating the table.
     */
    async _createTable(tableOpts) {

      const params = {
        TableName: this.tableName,
        AttributeDefinitions: [
          {
            AttributeName: 'key',
            AttributeType: 'S'
          }
        ],
        KeySchema: [
          {
            AttributeName: 'key',
            KeyType: 'HASH'
          }
        ],
        ProvisionedThroughput: {
          ReadCapacityUnits: tableOpts && tableOpts.readCapacityUnits ? tableOpts.readCapacityUnits : DEFAULT_READ_CAPACITY_UNITS,
          WriteCapacityUnits: tableOpts && tableOpts.writeCapacityUnits ? tableOpts.writeCapacityUnits : DEFAULT_WRITE_CAPACITY_UNITS
        }
      };
      
      try {
        const data = await this.client.createTable(params);
        return data;
      } catch(err) {
        if (err.__type && err.__type.includes('ResourceInUseException')) {
          return null;
        } else {
          throw err;
        }
      }
    }

    /**
     * Retrieves an item from the table based on the provided key.
     *
     * @param {string} rlKey - The key used to retrieve the item.
     * @throws {Error} Throws an error if the table is not created yet.
     * @return {DynamoItem|null} - The retrieved item, or null if it doesn't exist.
     */
    async _get(rlKey) {

      if (!this.tableCreated) {
        throw new Error('Table is not created yet');
      }

      const params = {
        TableName: this.tableName,
        Key: {
          key: {S: rlKey}
        }
      };
      
      const data = await this.client.getItem(params);
      if(data.Item) {
        return new DynamoItem(
          data.Item.key.S,
          Number(data.Item.points.N),
          Number(data.Item.expire.N)
        );
      } else {
        return null;
      }
    }

    /**
     * Deletes an item from the table based on the given rlKey.
     *
     * @param {string} rlKey - The rlKey of the item to delete.
     * @throws {Error} Throws an error if the table is not created yet.
     * @return {boolean} Returns true if the item was successfully deleted, otherwise false.
     */
    async _delete(rlKey) {

      if (!this.tableCreated) {
        throw new Error('Table is not created yet');
      }

      const params = {
        TableName: this.tableName,
        Key: {
          key: {S: rlKey}
        },
        ConditionExpression: 'attribute_exists(#k)',
        ExpressionAttributeNames: {
          '#k': 'key'  
        }
      };
      
      try {
        const data = await this._client.deleteItem(params);
        return data.$metadata.httpStatusCode === 200;
      } catch(err) {
        // ConditionalCheckFailed, item does not exist in table
        if (err.__type && err.__type.includes('ConditionalCheckFailedException')) {
          return false;
        } else {
          throw err;
        }
      }

    }

    /**
     * Implemented with DynamoDB Atomic Counters. 3 calls are made to DynamoDB but each call is atomic.
     * From the documentation: "UpdateItem calls are naturally serialized within DynamoDB,
     * so there are no race condition concerns with making multiple simultaneous calls."
     * See: https://aws.amazon.com/it/blogs/database/implement-resource-counters-with-amazon-dynamodb/
     * @param {*} rlKey 
     * @param {*} points 
     * @param {*} msDuration 
     * @param {*} forceExpire 
     * @param {*} options 
     * @returns
     */
    async _upsert(rlKey, points, msDuration, forceExpire = false, options = {}) {

      if (!this.tableCreated) {
        throw new Error('Table is not created yet');
      }

      const dateNow = Date.now();
      const dateNowSec = dateNow / 1000;
      /* -1 means never expire, DynamoDb do not support null values in number fields.
         DynamoDb TTL use unix timestamp in seconds.
      */
      const newExpireSec = msDuration > 0 ? (dateNow + msDuration) / 1000 : -1;

      // Force expire, overwrite points. Create a new entry if not exists
      if (forceExpire) {
        return await this._baseUpsert({
          TableName: this.tableName,
          Key: { key: {S: rlKey} },
          UpdateExpression: 'SET points = :points, expire = :expire',
          ExpressionAttributeValues: {
            ':points': {N: points.toString()},
            ':expire': {N: newExpireSec.toString()}
          },
          ReturnValues: 'ALL_NEW'
        });
      }

      try {        
        // First try update, success if entry NOT exists or IS expired
        return await this._baseUpsert({
          TableName: this.tableName,
          Key: { key: {S: rlKey} },
          UpdateExpression: 'SET points = :new_points, expire = :new_expire',
          ExpressionAttributeValues: {
            ':new_points': {N: points.toString()},
            ':new_expire': {N: newExpireSec.toString()},
            ':where_expire': {N: dateNowSec.toString()}
          },
          ConditionExpression: 'expire <= :where_expire OR attribute_not_exists(points)',
          ReturnValues: 'ALL_NEW'
        });

      } catch (err) {
        // Second try update, success if entry exists and IS NOT expired
        return await this._baseUpsert({
          TableName: this.tableName,
          Key: { key: {S: rlKey} },
          UpdateExpression: 'SET points = points + :new_points',
          ExpressionAttributeValues: {
            ':new_points': {N: points.toString()},
            ':where_expire': {N: dateNowSec.toString()}
          },
          ConditionExpression: 'expire > :where_expire',
          ReturnValues: 'ALL_NEW'
        });
      }
    }
    
    /**
     * Asynchronously upserts data into the table. params is a DynamoDB params object.
     *
     * @param {Object} params - The parameters for the upsert operation.
     * @throws {Error} Throws an error if the table is not created yet.
     * @return {DynamoItem} Returns a DynamoItem object with the updated data.
     */
    async _baseUpsert(params) {

      if (!this.tableCreated) {
        throw new Error('Table is not created yet');
      }
      
      try {
        const data = await this.client.updateItem(params);
        return new DynamoItem(
          data.Attributes.key.S,
          Number(data.Attributes.points.N),
          Number(data.Attributes.expire.N)
        );
      } catch (err) {
        //console.log('_baseUpsert', params, err);
        throw err;
      }
    }

    /**
     * Sets the Time-to-Live (TTL) for the table. TTL use the expire field in the table.
     * See: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/howitworks-ttl.html
     *
     * @return {Promise} A promise that resolves when the TTL is successfully set.
     * @throws {Error} Throws an error if the table is not created yet.
     * @returns {Promise}
     */
    async _setTTL() {

      if (!this.tableCreated) {
        throw new Error('Table is not created yet');
      }

      try {
        
        // Check if the TTL is already set
        const isTTLSet = await this._isTTLSet();
        if (isTTLSet) {
          return;
        }

        const params = {
          TableName: this.tableName,
          TimeToLiveSpecification: {
            AttributeName: 'expire',
            Enabled: true
          }
        };

        const res = await this.client.updateTimeToLive(params);
        return res;

      } catch (err) {
        throw err;
      }

    }

    /**
     * Checks if the Time To Live (TTL) feature is set for the DynamoDB table.
     *
     * @return {boolean} Returns true if the TTL feature is enabled for the table, otherwise false.
     * @throws {Error} Throws an error if the table is not created yet or if there is an error while checking the TTL status.
     */
    async _isTTLSet() {
      
      if (!this.tableCreated) {
        throw new Error('Table is not created yet');
      }

      try {

        const res = await this.client.describeTimeToLive({TableName: this.tableName});
        return (
          res.$metadata.httpStatusCode == 200 
          && res.TimeToLiveDescription.TimeToLiveStatus === 'ENABLED'
          && res.TimeToLiveDescription.AttributeName === 'expire'
        );
        
      } catch (err) {
        throw err;
      }
    }

    /**
     * Generate a RateLimiterRes object based on the provided parameters.
     *
     * @param {string} rlKey - The key for the rate limiter.
     * @param {number} changedPoints - The number of points that have changed.
     * @param {DynamoItem} result - The result object of _get() method.
     * @returns {RateLimiterRes} - The generated RateLimiterRes object.
     */
    _getRateLimiterRes(rlKey, changedPoints, result) {

      const res = new RateLimiterRes$2();
      res.isFirstInDuration = changedPoints === result.points;
      res.consumedPoints = res.isFirstInDuration ? changedPoints : result.points;
      res.remainingPoints = Math.max(this.points - res.consumedPoints, 0);
      // Expire time saved in unix time seconds not ms
      res.msBeforeNext = result.expire != -1 ? Math.max(result.expire * 1000 - Date.now(), 0) : -1;

      return res;
    }

}

var RateLimiterDynamo_1 = RateLimiterDynamo$1;

const RateLimiterStoreAbstract = RateLimiterStoreAbstract_1;
const RateLimiterRes$1 = RateLimiterRes_1;

class RateLimiterPrisma$1 extends RateLimiterStoreAbstract {
  /**
   * Constructor for the rate limiter
   * @param {Object} opts - Options for the rate limiter
   */
  constructor(opts) {
    super(opts);

    this.modelName = opts.tableName || 'RateLimiterFlexible';
    this.prismaClient = opts.storeClient;
    this.clearExpiredByTimeout = opts.clearExpiredByTimeout || true;

    if (!this.prismaClient) {
      throw new Error('Prisma client is not provided');
    }

    if (this.clearExpiredByTimeout) {
      this._clearExpiredHourAgo();
    }
  }

  _getRateLimiterRes(rlKey, changedPoints, result) {
    const res = new RateLimiterRes$1();

    let doc = result;

    res.isFirstInDuration = doc.points === changedPoints;
    res.consumedPoints = doc.points;

    res.remainingPoints = Math.max(this.points - res.consumedPoints, 0);
    res.msBeforeNext = doc.expire !== null
      ? Math.max(new Date(doc.expire).getTime() - Date.now(), 0)
      : -1;

    return res;
  }

  _upsert(key, points, msDuration, forceExpire = false) {
    if (!this.prismaClient) {
      return Promise.reject(new Error('Prisma client is not established'));
    }

    const now = new Date();
    const newExpire = msDuration > 0 ? new Date(now.getTime() + msDuration) : null;

    return this.prismaClient.$transaction(async (prisma) => {
      const existingRecord = await prisma[this.modelName].findFirst({
        where: { key: key },
      });

      if (existingRecord) {
        // Determine if we should update the expire field
        const shouldUpdateExpire = forceExpire || !existingRecord.expire || existingRecord.expire <= now || newExpire === null;

        return prisma[this.modelName].update({
          where: { key: key },
          data: {
            points: !shouldUpdateExpire ? existingRecord.points + points : points,
            ...(shouldUpdateExpire && { expire: newExpire }),
          },
        });
      } else {
        return prisma[this.modelName].create({
          data: {
            key: key,
            points: points,
            expire: newExpire,
          },
        });
      }
    });
  }

  _get(rlKey) {
    if (!this.prismaClient) {
      return Promise.reject(new Error('Prisma client is not established'));
    }

    return this.prismaClient[this.modelName].findFirst({
      where: {
        AND: [
          { key: rlKey },
          {
            OR: [
              { expire: { gt: new Date() } },
              { expire: null },
            ],
          },
        ],
      },
    });
  }

  _delete(rlKey) {
    if (!this.prismaClient) {
      return Promise.reject(new Error('Prisma client is not established'));
    }

    return this.prismaClient[this.modelName].deleteMany({
      where: {
        key: rlKey,
      },
    }).then(res => res.count > 0);
  }

  _clearExpiredHourAgo() {
    if (this._clearExpiredTimeoutId) {
      clearTimeout(this._clearExpiredTimeoutId);
    }
    this._clearExpiredTimeoutId = setTimeout(async () => {
      await this.prismaClient[this.modelName].deleteMany({
        where: {
          expire: {
            lt: new Date(Date.now() - 3600000),
          },
        },
      });
      this._clearExpiredHourAgo();
    }, 300000); // Clear every 5 minutes
  }
}

var RateLimiterPrisma_1 = RateLimiterPrisma$1;

const RateLimiterRedis = RateLimiterRedis_1;
const RateLimiterMongo = RateLimiterMongo_1;
const RateLimiterMySQL = RateLimiterMySQL_1;
const RateLimiterPostgres = RateLimiterPostgres_1;
const {RateLimiterClusterMaster, RateLimiterClusterMasterPM2, RateLimiterCluster} = RateLimiterCluster$1;
const RateLimiterMemory = RateLimiterMemory_1;
const RateLimiterMemcache = RateLimiterMemcache_1;
const RLWrapperBlackAndWhite = RLWrapperBlackAndWhite_1;
const RateLimiterUnion = RateLimiterUnion_1;
const RateLimiterQueue = RateLimiterQueue_1;
const BurstyRateLimiter = BurstyRateLimiter_1;
const RateLimiterRes = RateLimiterRes_1;
const RateLimiterDynamo = RateLimiterDynamo_1;
const RateLimiterPrisma = RateLimiterPrisma_1;

var rateLimiterFlexible = {
  RateLimiterRedis,
  RateLimiterMongo,
  RateLimiterMySQL,
  RateLimiterPostgres,
  RateLimiterMemory,
  RateLimiterMemcache,
  RateLimiterClusterMaster,
  RateLimiterClusterMasterPM2,
  RateLimiterCluster,
  RLWrapperBlackAndWhite,
  RateLimiterUnion,
  RateLimiterQueue,
  BurstyRateLimiter,
  RateLimiterRes,
  RateLimiterDynamo,
  RateLimiterPrisma,
};

var builtExports = {};
var built$2 = {
  get exports(){ return builtExports; },
  set exports(v){ builtExports = v; },
};

var Redis$1 = {};

var built$1 = {};

var acl = {
	arity: -2,
	flags: [
	],
	keyStart: 0,
	keyStop: 0,
	step: 0
};
var append = {
	arity: 3,
	flags: [
		"write",
		"denyoom",
		"fast"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var asking = {
	arity: 1,
	flags: [
		"fast"
	],
	keyStart: 0,
	keyStop: 0,
	step: 0
};
var auth = {
	arity: -2,
	flags: [
		"noscript",
		"loading",
		"stale",
		"fast",
		"no_auth",
		"allow_busy"
	],
	keyStart: 0,
	keyStop: 0,
	step: 0
};
var bgrewriteaof = {
	arity: 1,
	flags: [
		"admin",
		"noscript",
		"no_async_loading"
	],
	keyStart: 0,
	keyStop: 0,
	step: 0
};
var bgsave = {
	arity: -1,
	flags: [
		"admin",
		"noscript",
		"no_async_loading"
	],
	keyStart: 0,
	keyStop: 0,
	step: 0
};
var bitcount = {
	arity: -2,
	flags: [
		"readonly"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var bitfield = {
	arity: -2,
	flags: [
		"write",
		"denyoom"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var bitfield_ro = {
	arity: -2,
	flags: [
		"readonly",
		"fast"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var bitop = {
	arity: -4,
	flags: [
		"write",
		"denyoom"
	],
	keyStart: 2,
	keyStop: -1,
	step: 1
};
var bitpos = {
	arity: -3,
	flags: [
		"readonly"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var blmove = {
	arity: 6,
	flags: [
		"write",
		"denyoom",
		"noscript",
		"blocking"
	],
	keyStart: 1,
	keyStop: 2,
	step: 1
};
var blmpop = {
	arity: -5,
	flags: [
		"write",
		"blocking",
		"movablekeys"
	],
	keyStart: 0,
	keyStop: 0,
	step: 0
};
var blpop = {
	arity: -3,
	flags: [
		"write",
		"noscript",
		"blocking"
	],
	keyStart: 1,
	keyStop: -2,
	step: 1
};
var brpop = {
	arity: -3,
	flags: [
		"write",
		"noscript",
		"blocking"
	],
	keyStart: 1,
	keyStop: -2,
	step: 1
};
var brpoplpush = {
	arity: 4,
	flags: [
		"write",
		"denyoom",
		"noscript",
		"blocking"
	],
	keyStart: 1,
	keyStop: 2,
	step: 1
};
var bzmpop = {
	arity: -5,
	flags: [
		"write",
		"blocking",
		"movablekeys"
	],
	keyStart: 0,
	keyStop: 0,
	step: 0
};
var bzpopmax = {
	arity: -3,
	flags: [
		"write",
		"noscript",
		"blocking",
		"fast"
	],
	keyStart: 1,
	keyStop: -2,
	step: 1
};
var bzpopmin = {
	arity: -3,
	flags: [
		"write",
		"noscript",
		"blocking",
		"fast"
	],
	keyStart: 1,
	keyStop: -2,
	step: 1
};
var client = {
	arity: -2,
	flags: [
	],
	keyStart: 0,
	keyStop: 0,
	step: 0
};
var cluster$1 = {
	arity: -2,
	flags: [
	],
	keyStart: 0,
	keyStop: 0,
	step: 0
};
var command = {
	arity: -1,
	flags: [
		"loading",
		"stale"
	],
	keyStart: 0,
	keyStop: 0,
	step: 0
};
var config = {
	arity: -2,
	flags: [
	],
	keyStart: 0,
	keyStop: 0,
	step: 0
};
var copy = {
	arity: -3,
	flags: [
		"write",
		"denyoom"
	],
	keyStart: 1,
	keyStop: 2,
	step: 1
};
var dbsize = {
	arity: 1,
	flags: [
		"readonly",
		"fast"
	],
	keyStart: 0,
	keyStop: 0,
	step: 0
};
var debug$5 = {
	arity: -2,
	flags: [
		"admin",
		"noscript",
		"loading",
		"stale"
	],
	keyStart: 0,
	keyStop: 0,
	step: 0
};
var decr = {
	arity: 2,
	flags: [
		"write",
		"denyoom",
		"fast"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var decrby = {
	arity: 3,
	flags: [
		"write",
		"denyoom",
		"fast"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var del = {
	arity: -2,
	flags: [
		"write"
	],
	keyStart: 1,
	keyStop: -1,
	step: 1
};
var discard = {
	arity: 1,
	flags: [
		"noscript",
		"loading",
		"stale",
		"fast",
		"allow_busy"
	],
	keyStart: 0,
	keyStop: 0,
	step: 0
};
var dump = {
	arity: 2,
	flags: [
		"readonly"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var echo = {
	arity: 2,
	flags: [
		"fast"
	],
	keyStart: 0,
	keyStop: 0,
	step: 0
};
var eval_ro = {
	arity: -3,
	flags: [
		"readonly",
		"noscript",
		"stale",
		"skip_monitor",
		"no_mandatory_keys",
		"movablekeys"
	],
	keyStart: 0,
	keyStop: 0,
	step: 0
};
var evalsha = {
	arity: -3,
	flags: [
		"noscript",
		"stale",
		"skip_monitor",
		"no_mandatory_keys",
		"movablekeys"
	],
	keyStart: 0,
	keyStop: 0,
	step: 0
};
var evalsha_ro = {
	arity: -3,
	flags: [
		"readonly",
		"noscript",
		"stale",
		"skip_monitor",
		"no_mandatory_keys",
		"movablekeys"
	],
	keyStart: 0,
	keyStop: 0,
	step: 0
};
var exec = {
	arity: 1,
	flags: [
		"noscript",
		"loading",
		"stale",
		"skip_slowlog"
	],
	keyStart: 0,
	keyStop: 0,
	step: 0
};
var exists = {
	arity: -2,
	flags: [
		"readonly",
		"fast"
	],
	keyStart: 1,
	keyStop: -1,
	step: 1
};
var expire = {
	arity: -3,
	flags: [
		"write",
		"fast"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var expireat = {
	arity: -3,
	flags: [
		"write",
		"fast"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var expiretime = {
	arity: 2,
	flags: [
		"readonly",
		"fast"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var failover = {
	arity: -1,
	flags: [
		"admin",
		"noscript",
		"stale"
	],
	keyStart: 0,
	keyStop: 0,
	step: 0
};
var fcall = {
	arity: -3,
	flags: [
		"noscript",
		"stale",
		"skip_monitor",
		"no_mandatory_keys",
		"movablekeys"
	],
	keyStart: 0,
	keyStop: 0,
	step: 0
};
var fcall_ro = {
	arity: -3,
	flags: [
		"readonly",
		"noscript",
		"stale",
		"skip_monitor",
		"no_mandatory_keys",
		"movablekeys"
	],
	keyStart: 0,
	keyStop: 0,
	step: 0
};
var flushall = {
	arity: -1,
	flags: [
		"write"
	],
	keyStart: 0,
	keyStop: 0,
	step: 0
};
var flushdb = {
	arity: -1,
	flags: [
		"write"
	],
	keyStart: 0,
	keyStop: 0,
	step: 0
};
var geoadd = {
	arity: -5,
	flags: [
		"write",
		"denyoom"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var geodist = {
	arity: -4,
	flags: [
		"readonly"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var geohash = {
	arity: -2,
	flags: [
		"readonly"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var geopos = {
	arity: -2,
	flags: [
		"readonly"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var georadius = {
	arity: -6,
	flags: [
		"write",
		"denyoom",
		"movablekeys"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var georadius_ro = {
	arity: -6,
	flags: [
		"readonly"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var georadiusbymember = {
	arity: -5,
	flags: [
		"write",
		"denyoom",
		"movablekeys"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var georadiusbymember_ro = {
	arity: -5,
	flags: [
		"readonly"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var geosearch = {
	arity: -7,
	flags: [
		"readonly"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var geosearchstore = {
	arity: -8,
	flags: [
		"write",
		"denyoom"
	],
	keyStart: 1,
	keyStop: 2,
	step: 1
};
var get = {
	arity: 2,
	flags: [
		"readonly",
		"fast"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var getbit = {
	arity: 3,
	flags: [
		"readonly",
		"fast"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var getdel = {
	arity: 2,
	flags: [
		"write",
		"fast"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var getex = {
	arity: -2,
	flags: [
		"write",
		"fast"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var getrange = {
	arity: 4,
	flags: [
		"readonly"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var getset = {
	arity: 3,
	flags: [
		"write",
		"denyoom",
		"fast"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var hdel = {
	arity: -3,
	flags: [
		"write",
		"fast"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var hello = {
	arity: -1,
	flags: [
		"noscript",
		"loading",
		"stale",
		"fast",
		"no_auth",
		"allow_busy"
	],
	keyStart: 0,
	keyStop: 0,
	step: 0
};
var hexists = {
	arity: 3,
	flags: [
		"readonly",
		"fast"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var hget = {
	arity: 3,
	flags: [
		"readonly",
		"fast"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var hgetall = {
	arity: 2,
	flags: [
		"readonly"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var hincrby = {
	arity: 4,
	flags: [
		"write",
		"denyoom",
		"fast"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var hincrbyfloat = {
	arity: 4,
	flags: [
		"write",
		"denyoom",
		"fast"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var hkeys = {
	arity: 2,
	flags: [
		"readonly"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var hlen = {
	arity: 2,
	flags: [
		"readonly",
		"fast"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var hmget = {
	arity: -3,
	flags: [
		"readonly",
		"fast"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var hmset = {
	arity: -4,
	flags: [
		"write",
		"denyoom",
		"fast"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var hrandfield = {
	arity: -2,
	flags: [
		"readonly"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var hscan = {
	arity: -3,
	flags: [
		"readonly"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var hset = {
	arity: -4,
	flags: [
		"write",
		"denyoom",
		"fast"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var hsetnx = {
	arity: 4,
	flags: [
		"write",
		"denyoom",
		"fast"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var hstrlen = {
	arity: 3,
	flags: [
		"readonly",
		"fast"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var hvals = {
	arity: 2,
	flags: [
		"readonly"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var incr = {
	arity: 2,
	flags: [
		"write",
		"denyoom",
		"fast"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var incrby = {
	arity: 3,
	flags: [
		"write",
		"denyoom",
		"fast"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var incrbyfloat = {
	arity: 3,
	flags: [
		"write",
		"denyoom",
		"fast"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var info = {
	arity: -1,
	flags: [
		"loading",
		"stale"
	],
	keyStart: 0,
	keyStop: 0,
	step: 0
};
var keys = {
	arity: 2,
	flags: [
		"readonly"
	],
	keyStart: 0,
	keyStop: 0,
	step: 0
};
var lastsave = {
	arity: 1,
	flags: [
		"loading",
		"stale",
		"fast"
	],
	keyStart: 0,
	keyStop: 0,
	step: 0
};
var latency = {
	arity: -2,
	flags: [
	],
	keyStart: 0,
	keyStop: 0,
	step: 0
};
var lcs = {
	arity: -3,
	flags: [
		"readonly"
	],
	keyStart: 1,
	keyStop: 2,
	step: 1
};
var lindex = {
	arity: 3,
	flags: [
		"readonly"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var linsert = {
	arity: 5,
	flags: [
		"write",
		"denyoom"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var llen = {
	arity: 2,
	flags: [
		"readonly",
		"fast"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var lmove = {
	arity: 5,
	flags: [
		"write",
		"denyoom"
	],
	keyStart: 1,
	keyStop: 2,
	step: 1
};
var lmpop = {
	arity: -4,
	flags: [
		"write",
		"movablekeys"
	],
	keyStart: 0,
	keyStop: 0,
	step: 0
};
var lolwut = {
	arity: -1,
	flags: [
		"readonly",
		"fast"
	],
	keyStart: 0,
	keyStop: 0,
	step: 0
};
var lpop = {
	arity: -2,
	flags: [
		"write",
		"fast"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var lpos = {
	arity: -3,
	flags: [
		"readonly"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var lpush = {
	arity: -3,
	flags: [
		"write",
		"denyoom",
		"fast"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var lpushx = {
	arity: -3,
	flags: [
		"write",
		"denyoom",
		"fast"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var lrange = {
	arity: 4,
	flags: [
		"readonly"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var lrem = {
	arity: 4,
	flags: [
		"write"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var lset = {
	arity: 4,
	flags: [
		"write",
		"denyoom"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var ltrim = {
	arity: 4,
	flags: [
		"write"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var memory = {
	arity: -2,
	flags: [
	],
	keyStart: 0,
	keyStop: 0,
	step: 0
};
var mget = {
	arity: -2,
	flags: [
		"readonly",
		"fast"
	],
	keyStart: 1,
	keyStop: -1,
	step: 1
};
var migrate = {
	arity: -6,
	flags: [
		"write",
		"movablekeys"
	],
	keyStart: 3,
	keyStop: 3,
	step: 1
};
var module = {
	arity: -2,
	flags: [
	],
	keyStart: 0,
	keyStop: 0,
	step: 0
};
var monitor = {
	arity: 1,
	flags: [
		"admin",
		"noscript",
		"loading",
		"stale"
	],
	keyStart: 0,
	keyStop: 0,
	step: 0
};
var move = {
	arity: 3,
	flags: [
		"write",
		"fast"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var mset = {
	arity: -3,
	flags: [
		"write",
		"denyoom"
	],
	keyStart: 1,
	keyStop: -1,
	step: 2
};
var msetnx = {
	arity: -3,
	flags: [
		"write",
		"denyoom"
	],
	keyStart: 1,
	keyStop: -1,
	step: 2
};
var multi$1 = {
	arity: 1,
	flags: [
		"noscript",
		"loading",
		"stale",
		"fast",
		"allow_busy"
	],
	keyStart: 0,
	keyStop: 0,
	step: 0
};
var object = {
	arity: -2,
	flags: [
	],
	keyStart: 0,
	keyStop: 0,
	step: 0
};
var persist = {
	arity: 2,
	flags: [
		"write",
		"fast"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var pexpire = {
	arity: -3,
	flags: [
		"write",
		"fast"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var pexpireat = {
	arity: -3,
	flags: [
		"write",
		"fast"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var pexpiretime = {
	arity: 2,
	flags: [
		"readonly",
		"fast"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var pfadd = {
	arity: -2,
	flags: [
		"write",
		"denyoom",
		"fast"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var pfcount = {
	arity: -2,
	flags: [
		"readonly"
	],
	keyStart: 1,
	keyStop: -1,
	step: 1
};
var pfdebug = {
	arity: 3,
	flags: [
		"write",
		"denyoom",
		"admin"
	],
	keyStart: 2,
	keyStop: 2,
	step: 1
};
var pfmerge = {
	arity: -2,
	flags: [
		"write",
		"denyoom"
	],
	keyStart: 1,
	keyStop: -1,
	step: 1
};
var pfselftest = {
	arity: 1,
	flags: [
		"admin"
	],
	keyStart: 0,
	keyStop: 0,
	step: 0
};
var ping = {
	arity: -1,
	flags: [
		"fast"
	],
	keyStart: 0,
	keyStop: 0,
	step: 0
};
var psetex = {
	arity: 4,
	flags: [
		"write",
		"denyoom"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var psubscribe = {
	arity: -2,
	flags: [
		"pubsub",
		"noscript",
		"loading",
		"stale"
	],
	keyStart: 0,
	keyStop: 0,
	step: 0
};
var psync = {
	arity: -3,
	flags: [
		"admin",
		"noscript",
		"no_async_loading",
		"no_multi"
	],
	keyStart: 0,
	keyStop: 0,
	step: 0
};
var pttl = {
	arity: 2,
	flags: [
		"readonly",
		"fast"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var publish = {
	arity: 3,
	flags: [
		"pubsub",
		"loading",
		"stale",
		"fast"
	],
	keyStart: 0,
	keyStop: 0,
	step: 0
};
var pubsub = {
	arity: -2,
	flags: [
	],
	keyStart: 0,
	keyStop: 0,
	step: 0
};
var punsubscribe = {
	arity: -1,
	flags: [
		"pubsub",
		"noscript",
		"loading",
		"stale"
	],
	keyStart: 0,
	keyStop: 0,
	step: 0
};
var quit = {
	arity: -1,
	flags: [
		"noscript",
		"loading",
		"stale",
		"fast",
		"no_auth",
		"allow_busy"
	],
	keyStart: 0,
	keyStop: 0,
	step: 0
};
var randomkey = {
	arity: 1,
	flags: [
		"readonly"
	],
	keyStart: 0,
	keyStop: 0,
	step: 0
};
var readonly = {
	arity: 1,
	flags: [
		"loading",
		"stale",
		"fast"
	],
	keyStart: 0,
	keyStop: 0,
	step: 0
};
var readwrite = {
	arity: 1,
	flags: [
		"loading",
		"stale",
		"fast"
	],
	keyStart: 0,
	keyStop: 0,
	step: 0
};
var rename = {
	arity: 3,
	flags: [
		"write"
	],
	keyStart: 1,
	keyStop: 2,
	step: 1
};
var renamenx = {
	arity: 3,
	flags: [
		"write",
		"fast"
	],
	keyStart: 1,
	keyStop: 2,
	step: 1
};
var replconf = {
	arity: -1,
	flags: [
		"admin",
		"noscript",
		"loading",
		"stale",
		"allow_busy"
	],
	keyStart: 0,
	keyStop: 0,
	step: 0
};
var replicaof = {
	arity: 3,
	flags: [
		"admin",
		"noscript",
		"stale",
		"no_async_loading"
	],
	keyStart: 0,
	keyStop: 0,
	step: 0
};
var reset = {
	arity: 1,
	flags: [
		"noscript",
		"loading",
		"stale",
		"fast",
		"no_auth",
		"allow_busy"
	],
	keyStart: 0,
	keyStop: 0,
	step: 0
};
var restore = {
	arity: -4,
	flags: [
		"write",
		"denyoom"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var role = {
	arity: 1,
	flags: [
		"noscript",
		"loading",
		"stale",
		"fast"
	],
	keyStart: 0,
	keyStop: 0,
	step: 0
};
var rpop = {
	arity: -2,
	flags: [
		"write",
		"fast"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var rpoplpush = {
	arity: 3,
	flags: [
		"write",
		"denyoom"
	],
	keyStart: 1,
	keyStop: 2,
	step: 1
};
var rpush = {
	arity: -3,
	flags: [
		"write",
		"denyoom",
		"fast"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var rpushx = {
	arity: -3,
	flags: [
		"write",
		"denyoom",
		"fast"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var sadd = {
	arity: -3,
	flags: [
		"write",
		"denyoom",
		"fast"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var save = {
	arity: 1,
	flags: [
		"admin",
		"noscript",
		"no_async_loading",
		"no_multi"
	],
	keyStart: 0,
	keyStop: 0,
	step: 0
};
var scan = {
	arity: -2,
	flags: [
		"readonly"
	],
	keyStart: 0,
	keyStop: 0,
	step: 0
};
var scard = {
	arity: 2,
	flags: [
		"readonly",
		"fast"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var script = {
	arity: -2,
	flags: [
	],
	keyStart: 0,
	keyStop: 0,
	step: 0
};
var sdiff = {
	arity: -2,
	flags: [
		"readonly"
	],
	keyStart: 1,
	keyStop: -1,
	step: 1
};
var sdiffstore = {
	arity: -3,
	flags: [
		"write",
		"denyoom"
	],
	keyStart: 1,
	keyStop: -1,
	step: 1
};
var select = {
	arity: 2,
	flags: [
		"loading",
		"stale",
		"fast"
	],
	keyStart: 0,
	keyStop: 0,
	step: 0
};
var set = {
	arity: -3,
	flags: [
		"write",
		"denyoom"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var setbit = {
	arity: 4,
	flags: [
		"write",
		"denyoom"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var setex = {
	arity: 4,
	flags: [
		"write",
		"denyoom"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var setnx = {
	arity: 3,
	flags: [
		"write",
		"denyoom",
		"fast"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var setrange = {
	arity: 4,
	flags: [
		"write",
		"denyoom"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var shutdown = {
	arity: -1,
	flags: [
		"admin",
		"noscript",
		"loading",
		"stale",
		"no_multi",
		"allow_busy"
	],
	keyStart: 0,
	keyStop: 0,
	step: 0
};
var sinter = {
	arity: -2,
	flags: [
		"readonly"
	],
	keyStart: 1,
	keyStop: -1,
	step: 1
};
var sintercard = {
	arity: -3,
	flags: [
		"readonly",
		"movablekeys"
	],
	keyStart: 0,
	keyStop: 0,
	step: 0
};
var sinterstore = {
	arity: -3,
	flags: [
		"write",
		"denyoom"
	],
	keyStart: 1,
	keyStop: -1,
	step: 1
};
var sismember = {
	arity: 3,
	flags: [
		"readonly",
		"fast"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var slaveof = {
	arity: 3,
	flags: [
		"admin",
		"noscript",
		"stale",
		"no_async_loading"
	],
	keyStart: 0,
	keyStop: 0,
	step: 0
};
var slowlog = {
	arity: -2,
	flags: [
	],
	keyStart: 0,
	keyStop: 0,
	step: 0
};
var smembers = {
	arity: 2,
	flags: [
		"readonly"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var smismember = {
	arity: -3,
	flags: [
		"readonly",
		"fast"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var smove = {
	arity: 4,
	flags: [
		"write",
		"fast"
	],
	keyStart: 1,
	keyStop: 2,
	step: 1
};
var sort = {
	arity: -2,
	flags: [
		"write",
		"denyoom",
		"movablekeys"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var sort_ro = {
	arity: -2,
	flags: [
		"readonly",
		"movablekeys"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var spop = {
	arity: -2,
	flags: [
		"write",
		"fast"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var spublish = {
	arity: 3,
	flags: [
		"pubsub",
		"loading",
		"stale",
		"fast"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var srandmember = {
	arity: -2,
	flags: [
		"readonly"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var srem = {
	arity: -3,
	flags: [
		"write",
		"fast"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var sscan = {
	arity: -3,
	flags: [
		"readonly"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var ssubscribe = {
	arity: -2,
	flags: [
		"pubsub",
		"noscript",
		"loading",
		"stale"
	],
	keyStart: 1,
	keyStop: -1,
	step: 1
};
var strlen = {
	arity: 2,
	flags: [
		"readonly",
		"fast"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var subscribe = {
	arity: -2,
	flags: [
		"pubsub",
		"noscript",
		"loading",
		"stale"
	],
	keyStart: 0,
	keyStop: 0,
	step: 0
};
var substr = {
	arity: 4,
	flags: [
		"readonly"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var sunion = {
	arity: -2,
	flags: [
		"readonly"
	],
	keyStart: 1,
	keyStop: -1,
	step: 1
};
var sunionstore = {
	arity: -3,
	flags: [
		"write",
		"denyoom"
	],
	keyStart: 1,
	keyStop: -1,
	step: 1
};
var sunsubscribe = {
	arity: -1,
	flags: [
		"pubsub",
		"noscript",
		"loading",
		"stale"
	],
	keyStart: 1,
	keyStop: -1,
	step: 1
};
var swapdb = {
	arity: 3,
	flags: [
		"write",
		"fast"
	],
	keyStart: 0,
	keyStop: 0,
	step: 0
};
var sync = {
	arity: 1,
	flags: [
		"admin",
		"noscript",
		"no_async_loading",
		"no_multi"
	],
	keyStart: 0,
	keyStop: 0,
	step: 0
};
var time = {
	arity: 1,
	flags: [
		"loading",
		"stale",
		"fast"
	],
	keyStart: 0,
	keyStop: 0,
	step: 0
};
var touch = {
	arity: -2,
	flags: [
		"readonly",
		"fast"
	],
	keyStart: 1,
	keyStop: -1,
	step: 1
};
var ttl = {
	arity: 2,
	flags: [
		"readonly",
		"fast"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var type = {
	arity: 2,
	flags: [
		"readonly",
		"fast"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var unlink = {
	arity: -2,
	flags: [
		"write",
		"fast"
	],
	keyStart: 1,
	keyStop: -1,
	step: 1
};
var unsubscribe = {
	arity: -1,
	flags: [
		"pubsub",
		"noscript",
		"loading",
		"stale"
	],
	keyStart: 0,
	keyStop: 0,
	step: 0
};
var unwatch = {
	arity: 1,
	flags: [
		"noscript",
		"loading",
		"stale",
		"fast",
		"allow_busy"
	],
	keyStart: 0,
	keyStop: 0,
	step: 0
};
var wait = {
	arity: 3,
	flags: [
		"noscript"
	],
	keyStart: 0,
	keyStop: 0,
	step: 0
};
var watch = {
	arity: -2,
	flags: [
		"noscript",
		"loading",
		"stale",
		"fast",
		"allow_busy"
	],
	keyStart: 1,
	keyStop: -1,
	step: 1
};
var xack = {
	arity: -4,
	flags: [
		"write",
		"fast"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var xadd = {
	arity: -5,
	flags: [
		"write",
		"denyoom",
		"fast"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var xautoclaim = {
	arity: -6,
	flags: [
		"write",
		"fast"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var xclaim = {
	arity: -6,
	flags: [
		"write",
		"fast"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var xdel = {
	arity: -3,
	flags: [
		"write",
		"fast"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var xgroup = {
	arity: -2,
	flags: [
	],
	keyStart: 0,
	keyStop: 0,
	step: 0
};
var xinfo = {
	arity: -2,
	flags: [
	],
	keyStart: 0,
	keyStop: 0,
	step: 0
};
var xlen = {
	arity: 2,
	flags: [
		"readonly",
		"fast"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var xpending = {
	arity: -3,
	flags: [
		"readonly"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var xrange = {
	arity: -4,
	flags: [
		"readonly"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var xread = {
	arity: -4,
	flags: [
		"readonly",
		"blocking",
		"movablekeys"
	],
	keyStart: 0,
	keyStop: 0,
	step: 0
};
var xreadgroup = {
	arity: -7,
	flags: [
		"write",
		"blocking",
		"movablekeys"
	],
	keyStart: 0,
	keyStop: 0,
	step: 0
};
var xrevrange = {
	arity: -4,
	flags: [
		"readonly"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var xsetid = {
	arity: -3,
	flags: [
		"write",
		"denyoom",
		"fast"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var xtrim = {
	arity: -4,
	flags: [
		"write"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var zadd = {
	arity: -4,
	flags: [
		"write",
		"denyoom",
		"fast"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var zcard = {
	arity: 2,
	flags: [
		"readonly",
		"fast"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var zcount = {
	arity: 4,
	flags: [
		"readonly",
		"fast"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var zdiff = {
	arity: -3,
	flags: [
		"readonly",
		"movablekeys"
	],
	keyStart: 0,
	keyStop: 0,
	step: 0
};
var zdiffstore = {
	arity: -4,
	flags: [
		"write",
		"denyoom",
		"movablekeys"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var zincrby = {
	arity: 4,
	flags: [
		"write",
		"denyoom",
		"fast"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var zinter = {
	arity: -3,
	flags: [
		"readonly",
		"movablekeys"
	],
	keyStart: 0,
	keyStop: 0,
	step: 0
};
var zintercard = {
	arity: -3,
	flags: [
		"readonly",
		"movablekeys"
	],
	keyStart: 0,
	keyStop: 0,
	step: 0
};
var zinterstore = {
	arity: -4,
	flags: [
		"write",
		"denyoom",
		"movablekeys"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var zlexcount = {
	arity: 4,
	flags: [
		"readonly",
		"fast"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var zmpop = {
	arity: -4,
	flags: [
		"write",
		"movablekeys"
	],
	keyStart: 0,
	keyStop: 0,
	step: 0
};
var zmscore = {
	arity: -3,
	flags: [
		"readonly",
		"fast"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var zpopmax = {
	arity: -2,
	flags: [
		"write",
		"fast"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var zpopmin = {
	arity: -2,
	flags: [
		"write",
		"fast"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var zrandmember = {
	arity: -2,
	flags: [
		"readonly"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var zrange = {
	arity: -4,
	flags: [
		"readonly"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var zrangebylex = {
	arity: -4,
	flags: [
		"readonly"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var zrangebyscore = {
	arity: -4,
	flags: [
		"readonly"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var zrangestore = {
	arity: -5,
	flags: [
		"write",
		"denyoom"
	],
	keyStart: 1,
	keyStop: 2,
	step: 1
};
var zrank = {
	arity: 3,
	flags: [
		"readonly",
		"fast"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var zrem = {
	arity: -3,
	flags: [
		"write",
		"fast"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var zremrangebylex = {
	arity: 4,
	flags: [
		"write"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var zremrangebyrank = {
	arity: 4,
	flags: [
		"write"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var zremrangebyscore = {
	arity: 4,
	flags: [
		"write"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var zrevrange = {
	arity: -4,
	flags: [
		"readonly"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var zrevrangebylex = {
	arity: -4,
	flags: [
		"readonly"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var zrevrangebyscore = {
	arity: -4,
	flags: [
		"readonly"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var zrevrank = {
	arity: 3,
	flags: [
		"readonly",
		"fast"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var zscan = {
	arity: -3,
	flags: [
		"readonly"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var zscore = {
	arity: 3,
	flags: [
		"readonly",
		"fast"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var zunion = {
	arity: -3,
	flags: [
		"readonly",
		"movablekeys"
	],
	keyStart: 0,
	keyStop: 0,
	step: 0
};
var zunionstore = {
	arity: -4,
	flags: [
		"write",
		"denyoom",
		"movablekeys"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
};
var require$$0 = {
	acl: acl,
	append: append,
	asking: asking,
	auth: auth,
	bgrewriteaof: bgrewriteaof,
	bgsave: bgsave,
	bitcount: bitcount,
	bitfield: bitfield,
	bitfield_ro: bitfield_ro,
	bitop: bitop,
	bitpos: bitpos,
	blmove: blmove,
	blmpop: blmpop,
	blpop: blpop,
	brpop: brpop,
	brpoplpush: brpoplpush,
	bzmpop: bzmpop,
	bzpopmax: bzpopmax,
	bzpopmin: bzpopmin,
	client: client,
	cluster: cluster$1,
	command: command,
	config: config,
	copy: copy,
	dbsize: dbsize,
	debug: debug$5,
	decr: decr,
	decrby: decrby,
	del: del,
	discard: discard,
	dump: dump,
	echo: echo,
	"eval": {
	arity: -3,
	flags: [
		"noscript",
		"stale",
		"skip_monitor",
		"no_mandatory_keys",
		"movablekeys"
	],
	keyStart: 0,
	keyStop: 0,
	step: 0
},
	eval_ro: eval_ro,
	evalsha: evalsha,
	evalsha_ro: evalsha_ro,
	exec: exec,
	exists: exists,
	expire: expire,
	expireat: expireat,
	expiretime: expiretime,
	failover: failover,
	fcall: fcall,
	fcall_ro: fcall_ro,
	flushall: flushall,
	flushdb: flushdb,
	"function": {
	arity: -2,
	flags: [
	],
	keyStart: 0,
	keyStop: 0,
	step: 0
},
	geoadd: geoadd,
	geodist: geodist,
	geohash: geohash,
	geopos: geopos,
	georadius: georadius,
	georadius_ro: georadius_ro,
	georadiusbymember: georadiusbymember,
	georadiusbymember_ro: georadiusbymember_ro,
	geosearch: geosearch,
	geosearchstore: geosearchstore,
	get: get,
	getbit: getbit,
	getdel: getdel,
	getex: getex,
	getrange: getrange,
	getset: getset,
	hdel: hdel,
	hello: hello,
	hexists: hexists,
	hget: hget,
	hgetall: hgetall,
	hincrby: hincrby,
	hincrbyfloat: hincrbyfloat,
	hkeys: hkeys,
	hlen: hlen,
	hmget: hmget,
	hmset: hmset,
	hrandfield: hrandfield,
	hscan: hscan,
	hset: hset,
	hsetnx: hsetnx,
	hstrlen: hstrlen,
	hvals: hvals,
	incr: incr,
	incrby: incrby,
	incrbyfloat: incrbyfloat,
	info: info,
	keys: keys,
	lastsave: lastsave,
	latency: latency,
	lcs: lcs,
	lindex: lindex,
	linsert: linsert,
	llen: llen,
	lmove: lmove,
	lmpop: lmpop,
	lolwut: lolwut,
	lpop: lpop,
	lpos: lpos,
	lpush: lpush,
	lpushx: lpushx,
	lrange: lrange,
	lrem: lrem,
	lset: lset,
	ltrim: ltrim,
	memory: memory,
	mget: mget,
	migrate: migrate,
	module: module,
	monitor: monitor,
	move: move,
	mset: mset,
	msetnx: msetnx,
	multi: multi$1,
	object: object,
	persist: persist,
	pexpire: pexpire,
	pexpireat: pexpireat,
	pexpiretime: pexpiretime,
	pfadd: pfadd,
	pfcount: pfcount,
	pfdebug: pfdebug,
	pfmerge: pfmerge,
	pfselftest: pfselftest,
	ping: ping,
	psetex: psetex,
	psubscribe: psubscribe,
	psync: psync,
	pttl: pttl,
	publish: publish,
	pubsub: pubsub,
	punsubscribe: punsubscribe,
	quit: quit,
	randomkey: randomkey,
	readonly: readonly,
	readwrite: readwrite,
	rename: rename,
	renamenx: renamenx,
	replconf: replconf,
	replicaof: replicaof,
	reset: reset,
	restore: restore,
	"restore-asking": {
	arity: -4,
	flags: [
		"write",
		"denyoom",
		"asking"
	],
	keyStart: 1,
	keyStop: 1,
	step: 1
},
	role: role,
	rpop: rpop,
	rpoplpush: rpoplpush,
	rpush: rpush,
	rpushx: rpushx,
	sadd: sadd,
	save: save,
	scan: scan,
	scard: scard,
	script: script,
	sdiff: sdiff,
	sdiffstore: sdiffstore,
	select: select,
	set: set,
	setbit: setbit,
	setex: setex,
	setnx: setnx,
	setrange: setrange,
	shutdown: shutdown,
	sinter: sinter,
	sintercard: sintercard,
	sinterstore: sinterstore,
	sismember: sismember,
	slaveof: slaveof,
	slowlog: slowlog,
	smembers: smembers,
	smismember: smismember,
	smove: smove,
	sort: sort,
	sort_ro: sort_ro,
	spop: spop,
	spublish: spublish,
	srandmember: srandmember,
	srem: srem,
	sscan: sscan,
	ssubscribe: ssubscribe,
	strlen: strlen,
	subscribe: subscribe,
	substr: substr,
	sunion: sunion,
	sunionstore: sunionstore,
	sunsubscribe: sunsubscribe,
	swapdb: swapdb,
	sync: sync,
	time: time,
	touch: touch,
	ttl: ttl,
	type: type,
	unlink: unlink,
	unsubscribe: unsubscribe,
	unwatch: unwatch,
	wait: wait,
	watch: watch,
	xack: xack,
	xadd: xadd,
	xautoclaim: xautoclaim,
	xclaim: xclaim,
	xdel: xdel,
	xgroup: xgroup,
	xinfo: xinfo,
	xlen: xlen,
	xpending: xpending,
	xrange: xrange,
	xread: xread,
	xreadgroup: xreadgroup,
	xrevrange: xrevrange,
	xsetid: xsetid,
	xtrim: xtrim,
	zadd: zadd,
	zcard: zcard,
	zcount: zcount,
	zdiff: zdiff,
	zdiffstore: zdiffstore,
	zincrby: zincrby,
	zinter: zinter,
	zintercard: zintercard,
	zinterstore: zinterstore,
	zlexcount: zlexcount,
	zmpop: zmpop,
	zmscore: zmscore,
	zpopmax: zpopmax,
	zpopmin: zpopmin,
	zrandmember: zrandmember,
	zrange: zrange,
	zrangebylex: zrangebylex,
	zrangebyscore: zrangebyscore,
	zrangestore: zrangestore,
	zrank: zrank,
	zrem: zrem,
	zremrangebylex: zremrangebylex,
	zremrangebyrank: zremrangebyrank,
	zremrangebyscore: zremrangebyscore,
	zrevrange: zrevrange,
	zrevrangebylex: zrevrangebylex,
	zrevrangebyscore: zrevrangebyscore,
	zrevrank: zrevrank,
	zscan: zscan,
	zscore: zscore,
	zunion: zunion,
	zunionstore: zunionstore
};

(function (exports) {
	var __importDefault = (commonjsGlobal && commonjsGlobal.__importDefault) || function (mod) {
	    return (mod && mod.__esModule) ? mod : { "default": mod };
	};
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.getKeyIndexes = exports.hasFlag = exports.exists = exports.list = void 0;
	const commands_json_1 = __importDefault(require$$0);
	/**
	 * Redis command list
	 *
	 * All commands are lowercased.
	 */
	exports.list = Object.keys(commands_json_1.default);
	const flags = {};
	exports.list.forEach((commandName) => {
	    flags[commandName] = commands_json_1.default[commandName].flags.reduce(function (flags, flag) {
	        flags[flag] = true;
	        return flags;
	    }, {});
	});
	/**
	 * Check if the command exists
	 */
	function exists(commandName) {
	    return Boolean(commands_json_1.default[commandName]);
	}
	exports.exists = exists;
	/**
	 * Check if the command has the flag
	 *
	 * Some of possible flags: readonly, noscript, loading
	 */
	function hasFlag(commandName, flag) {
	    if (!flags[commandName]) {
	        throw new Error("Unknown command " + commandName);
	    }
	    return Boolean(flags[commandName][flag]);
	}
	exports.hasFlag = hasFlag;
	/**
	 * Get indexes of keys in the command arguments
	 *
	 * @example
	 * ```javascript
	 * getKeyIndexes('set', ['key', 'value']) // [0]
	 * getKeyIndexes('mget', ['key1', 'key2']) // [0, 1]
	 * ```
	 */
	function getKeyIndexes(commandName, args, options) {
	    const command = commands_json_1.default[commandName];
	    if (!command) {
	        throw new Error("Unknown command " + commandName);
	    }
	    if (!Array.isArray(args)) {
	        throw new Error("Expect args to be an array");
	    }
	    const keys = [];
	    const parseExternalKey = Boolean(options && options.parseExternalKey);
	    const takeDynamicKeys = (args, startIndex) => {
	        const keys = [];
	        const keyStop = Number(args[startIndex]);
	        for (let i = 0; i < keyStop; i++) {
	            keys.push(i + startIndex + 1);
	        }
	        return keys;
	    };
	    const takeKeyAfterToken = (args, startIndex, token) => {
	        for (let i = startIndex; i < args.length - 1; i += 1) {
	            if (String(args[i]).toLowerCase() === token.toLowerCase()) {
	                return i + 1;
	            }
	        }
	        return null;
	    };
	    switch (commandName) {
	        case "zunionstore":
	        case "zinterstore":
	        case "zdiffstore":
	            keys.push(0, ...takeDynamicKeys(args, 1));
	            break;
	        case "eval":
	        case "evalsha":
	        case "eval_ro":
	        case "evalsha_ro":
	        case "fcall":
	        case "fcall_ro":
	        case "blmpop":
	        case "bzmpop":
	            keys.push(...takeDynamicKeys(args, 1));
	            break;
	        case "sintercard":
	        case "lmpop":
	        case "zunion":
	        case "zinter":
	        case "zmpop":
	        case "zintercard":
	        case "zdiff": {
	            keys.push(...takeDynamicKeys(args, 0));
	            break;
	        }
	        case "georadius": {
	            keys.push(0);
	            const storeKey = takeKeyAfterToken(args, 5, "STORE");
	            if (storeKey)
	                keys.push(storeKey);
	            const distKey = takeKeyAfterToken(args, 5, "STOREDIST");
	            if (distKey)
	                keys.push(distKey);
	            break;
	        }
	        case "georadiusbymember": {
	            keys.push(0);
	            const storeKey = takeKeyAfterToken(args, 4, "STORE");
	            if (storeKey)
	                keys.push(storeKey);
	            const distKey = takeKeyAfterToken(args, 4, "STOREDIST");
	            if (distKey)
	                keys.push(distKey);
	            break;
	        }
	        case "sort":
	        case "sort_ro":
	            keys.push(0);
	            for (let i = 1; i < args.length - 1; i++) {
	                let arg = args[i];
	                if (typeof arg !== "string") {
	                    continue;
	                }
	                const directive = arg.toUpperCase();
	                if (directive === "GET") {
	                    i += 1;
	                    arg = args[i];
	                    if (arg !== "#") {
	                        if (parseExternalKey) {
	                            keys.push([i, getExternalKeyNameLength(arg)]);
	                        }
	                        else {
	                            keys.push(i);
	                        }
	                    }
	                }
	                else if (directive === "BY") {
	                    i += 1;
	                    if (parseExternalKey) {
	                        keys.push([i, getExternalKeyNameLength(args[i])]);
	                    }
	                    else {
	                        keys.push(i);
	                    }
	                }
	                else if (directive === "STORE") {
	                    i += 1;
	                    keys.push(i);
	                }
	            }
	            break;
	        case "migrate":
	            if (args[2] === "") {
	                for (let i = 5; i < args.length - 1; i++) {
	                    const arg = args[i];
	                    if (typeof arg === "string" && arg.toUpperCase() === "KEYS") {
	                        for (let j = i + 1; j < args.length; j++) {
	                            keys.push(j);
	                        }
	                        break;
	                    }
	                }
	            }
	            else {
	                keys.push(2);
	            }
	            break;
	        case "xreadgroup":
	        case "xread":
	            // Keys are 1st half of the args after STREAMS argument.
	            for (let i = commandName === "xread" ? 0 : 3; i < args.length - 1; i++) {
	                if (String(args[i]).toUpperCase() === "STREAMS") {
	                    for (let j = i + 1; j <= i + (args.length - 1 - i) / 2; j++) {
	                        keys.push(j);
	                    }
	                    break;
	                }
	            }
	            break;
	        default:
	            // Step has to be at least one in this case, otherwise the command does
	            // not contain a key.
	            if (command.step > 0) {
	                const keyStart = command.keyStart - 1;
	                const keyStop = command.keyStop > 0
	                    ? command.keyStop
	                    : args.length + command.keyStop + 1;
	                for (let i = keyStart; i < keyStop; i += command.step) {
	                    keys.push(i);
	                }
	            }
	            break;
	    }
	    return keys;
	}
	exports.getKeyIndexes = getKeyIndexes;
	function getExternalKeyNameLength(key) {
	    if (typeof key !== "string") {
	        key = String(key);
	    }
	    const hashPos = key.indexOf("->");
	    return hashPos === -1 ? key.length : hashPos;
	}
} (built$1));

var built = {};

var utils$1 = {};

(function (exports) {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.tryCatch = exports.errorObj = void 0;
	//Try catch is not supported in optimizing
	//compiler, so it is isolated
	exports.errorObj = { e: {} };
	let tryCatchTarget;
	function tryCatcher(err, val) {
	    try {
	        const target = tryCatchTarget;
	        tryCatchTarget = null;
	        return target.apply(this, arguments);
	    }
	    catch (e) {
	        exports.errorObj.e = e;
	        return exports.errorObj;
	    }
	}
	function tryCatch(fn) {
	    tryCatchTarget = fn;
	    return tryCatcher;
	}
	exports.tryCatch = tryCatch;
} (utils$1));

Object.defineProperty(built, "__esModule", { value: true });
const utils_1$9 = utils$1;
function throwLater(e) {
    setTimeout(function () {
        throw e;
    }, 0);
}
function asCallback(promise, nodeback, options) {
    if (typeof nodeback === "function") {
        promise.then((val) => {
            let ret;
            if (options !== undefined &&
                Object(options).spread &&
                Array.isArray(val)) {
                ret = utils_1$9.tryCatch(nodeback).apply(undefined, [null].concat(val));
            }
            else {
                ret =
                    val === undefined
                        ? utils_1$9.tryCatch(nodeback)(null)
                        : utils_1$9.tryCatch(nodeback)(null, val);
            }
            if (ret === utils_1$9.errorObj) {
                throwLater(ret.e);
            }
        }, (cause) => {
            if (!cause) {
                const newReason = new Error(cause + "");
                Object.assign(newReason, { cause });
                cause = newReason;
            }
            const ret = utils_1$9.tryCatch(nodeback)(cause);
            if (ret === utils_1$9.errorObj) {
                throwLater(ret.e);
            }
        });
    }
    return promise;
}
built.default = asCallback;

var cluster = {};

var old;
var hasRequiredOld;

function requireOld () {
	if (hasRequiredOld) return old;
	hasRequiredOld = 1;

	const assert = require$$0$2;
	const util = require$$1$1;

	// RedisError

	function RedisError (message) {
	  Object.defineProperty(this, 'message', {
	    value: message || '',
	    configurable: true,
	    writable: true
	  });
	  Error.captureStackTrace(this, this.constructor);
	}

	util.inherits(RedisError, Error);

	Object.defineProperty(RedisError.prototype, 'name', {
	  value: 'RedisError',
	  configurable: true,
	  writable: true
	});

	// ParserError

	function ParserError (message, buffer, offset) {
	  assert(buffer);
	  assert.strictEqual(typeof offset, 'number');

	  Object.defineProperty(this, 'message', {
	    value: message || '',
	    configurable: true,
	    writable: true
	  });

	  const tmp = Error.stackTraceLimit;
	  Error.stackTraceLimit = 2;
	  Error.captureStackTrace(this, this.constructor);
	  Error.stackTraceLimit = tmp;
	  this.offset = offset;
	  this.buffer = buffer;
	}

	util.inherits(ParserError, RedisError);

	Object.defineProperty(ParserError.prototype, 'name', {
	  value: 'ParserError',
	  configurable: true,
	  writable: true
	});

	// ReplyError

	function ReplyError (message) {
	  Object.defineProperty(this, 'message', {
	    value: message || '',
	    configurable: true,
	    writable: true
	  });
	  const tmp = Error.stackTraceLimit;
	  Error.stackTraceLimit = 2;
	  Error.captureStackTrace(this, this.constructor);
	  Error.stackTraceLimit = tmp;
	}

	util.inherits(ReplyError, RedisError);

	Object.defineProperty(ReplyError.prototype, 'name', {
	  value: 'ReplyError',
	  configurable: true,
	  writable: true
	});

	// AbortError

	function AbortError (message) {
	  Object.defineProperty(this, 'message', {
	    value: message || '',
	    configurable: true,
	    writable: true
	  });
	  Error.captureStackTrace(this, this.constructor);
	}

	util.inherits(AbortError, RedisError);

	Object.defineProperty(AbortError.prototype, 'name', {
	  value: 'AbortError',
	  configurable: true,
	  writable: true
	});

	// InterruptError

	function InterruptError (message) {
	  Object.defineProperty(this, 'message', {
	    value: message || '',
	    configurable: true,
	    writable: true
	  });
	  Error.captureStackTrace(this, this.constructor);
	}

	util.inherits(InterruptError, AbortError);

	Object.defineProperty(InterruptError.prototype, 'name', {
	  value: 'InterruptError',
	  configurable: true,
	  writable: true
	});

	old = {
	  RedisError,
	  ParserError,
	  ReplyError,
	  AbortError,
	  InterruptError
	};
	return old;
}

var modern;
var hasRequiredModern;

function requireModern () {
	if (hasRequiredModern) return modern;
	hasRequiredModern = 1;

	const assert = require$$0$2;

	class RedisError extends Error {
	  get name () {
	    return this.constructor.name
	  }
	}

	class ParserError extends RedisError {
	  constructor (message, buffer, offset) {
	    assert(buffer);
	    assert.strictEqual(typeof offset, 'number');

	    const tmp = Error.stackTraceLimit;
	    Error.stackTraceLimit = 2;
	    super(message);
	    Error.stackTraceLimit = tmp;
	    this.offset = offset;
	    this.buffer = buffer;
	  }

	  get name () {
	    return this.constructor.name
	  }
	}

	class ReplyError extends RedisError {
	  constructor (message) {
	    const tmp = Error.stackTraceLimit;
	    Error.stackTraceLimit = 2;
	    super(message);
	    Error.stackTraceLimit = tmp;
	  }
	  get name () {
	    return this.constructor.name
	  }
	}

	class AbortError extends RedisError {
	  get name () {
	    return this.constructor.name
	  }
	}

	class InterruptError extends AbortError {
	  get name () {
	    return this.constructor.name
	  }
	}

	modern = {
	  RedisError,
	  ParserError,
	  ReplyError,
	  AbortError,
	  InterruptError
	};
	return modern;
}

const Errors = process.version.charCodeAt(1) < 55 && process.version.charCodeAt(2) === 46
  ? requireOld() // Node.js < 7
  : requireModern();

var redisErrors = Errors;

var Command$1 = {};

var libExports = {};
var lib = {
  get exports(){ return libExports; },
  set exports(v){ libExports = v; },
};

/*
 * Copyright 2001-2010 Georges Menie (www.menie.org)
 * Copyright 2010 Salvatore Sanfilippo (adapted to Redis coding style)
 * Copyright 2015 Zihua Li (http://zihua.li) (ported to JavaScript)
 * Copyright 2016 Mike Diarmid (http://github.com/salakar) (re-write for performance, ~700% perf inc)
 * All rights reserved.
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 *     * Redistributions of source code must retain the above copyright
 *       notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above copyright
 *       notice, this list of conditions and the following disclaimer in the
 *       documentation and/or other materials provided with the distribution.
 *     * Neither the name of the University of California, Berkeley nor the
 *       names of its contributors may be used to endorse or promote products
 *       derived from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE REGENTS AND CONTRIBUTORS ``AS IS'' AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE REGENTS AND CONTRIBUTORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/* CRC16 implementation according to CCITT standards.
 *
 * Note by @antirez: this is actually the XMODEM CRC 16 algorithm, using the
 * following parameters:
 *
 * Name                       : "XMODEM", also known as "ZMODEM", "CRC-16/ACORN"
 * Width                      : 16 bit
 * Poly                       : 1021 (That is actually x^16 + x^12 + x^5 + 1)
 * Initialization             : 0000
 * Reflect Input byte         : False
 * Reflect Output CRC         : False
 * Xor constant to output CRC : 0000
 * Output for "123456789"     : 31C3
 */

var lookup = [
  0x0000, 0x1021, 0x2042, 0x3063, 0x4084, 0x50a5, 0x60c6, 0x70e7,
  0x8108, 0x9129, 0xa14a, 0xb16b, 0xc18c, 0xd1ad, 0xe1ce, 0xf1ef,
  0x1231, 0x0210, 0x3273, 0x2252, 0x52b5, 0x4294, 0x72f7, 0x62d6,
  0x9339, 0x8318, 0xb37b, 0xa35a, 0xd3bd, 0xc39c, 0xf3ff, 0xe3de,
  0x2462, 0x3443, 0x0420, 0x1401, 0x64e6, 0x74c7, 0x44a4, 0x5485,
  0xa56a, 0xb54b, 0x8528, 0x9509, 0xe5ee, 0xf5cf, 0xc5ac, 0xd58d,
  0x3653, 0x2672, 0x1611, 0x0630, 0x76d7, 0x66f6, 0x5695, 0x46b4,
  0xb75b, 0xa77a, 0x9719, 0x8738, 0xf7df, 0xe7fe, 0xd79d, 0xc7bc,
  0x48c4, 0x58e5, 0x6886, 0x78a7, 0x0840, 0x1861, 0x2802, 0x3823,
  0xc9cc, 0xd9ed, 0xe98e, 0xf9af, 0x8948, 0x9969, 0xa90a, 0xb92b,
  0x5af5, 0x4ad4, 0x7ab7, 0x6a96, 0x1a71, 0x0a50, 0x3a33, 0x2a12,
  0xdbfd, 0xcbdc, 0xfbbf, 0xeb9e, 0x9b79, 0x8b58, 0xbb3b, 0xab1a,
  0x6ca6, 0x7c87, 0x4ce4, 0x5cc5, 0x2c22, 0x3c03, 0x0c60, 0x1c41,
  0xedae, 0xfd8f, 0xcdec, 0xddcd, 0xad2a, 0xbd0b, 0x8d68, 0x9d49,
  0x7e97, 0x6eb6, 0x5ed5, 0x4ef4, 0x3e13, 0x2e32, 0x1e51, 0x0e70,
  0xff9f, 0xefbe, 0xdfdd, 0xcffc, 0xbf1b, 0xaf3a, 0x9f59, 0x8f78,
  0x9188, 0x81a9, 0xb1ca, 0xa1eb, 0xd10c, 0xc12d, 0xf14e, 0xe16f,
  0x1080, 0x00a1, 0x30c2, 0x20e3, 0x5004, 0x4025, 0x7046, 0x6067,
  0x83b9, 0x9398, 0xa3fb, 0xb3da, 0xc33d, 0xd31c, 0xe37f, 0xf35e,
  0x02b1, 0x1290, 0x22f3, 0x32d2, 0x4235, 0x5214, 0x6277, 0x7256,
  0xb5ea, 0xa5cb, 0x95a8, 0x8589, 0xf56e, 0xe54f, 0xd52c, 0xc50d,
  0x34e2, 0x24c3, 0x14a0, 0x0481, 0x7466, 0x6447, 0x5424, 0x4405,
  0xa7db, 0xb7fa, 0x8799, 0x97b8, 0xe75f, 0xf77e, 0xc71d, 0xd73c,
  0x26d3, 0x36f2, 0x0691, 0x16b0, 0x6657, 0x7676, 0x4615, 0x5634,
  0xd94c, 0xc96d, 0xf90e, 0xe92f, 0x99c8, 0x89e9, 0xb98a, 0xa9ab,
  0x5844, 0x4865, 0x7806, 0x6827, 0x18c0, 0x08e1, 0x3882, 0x28a3,
  0xcb7d, 0xdb5c, 0xeb3f, 0xfb1e, 0x8bf9, 0x9bd8, 0xabbb, 0xbb9a,
  0x4a75, 0x5a54, 0x6a37, 0x7a16, 0x0af1, 0x1ad0, 0x2ab3, 0x3a92,
  0xfd2e, 0xed0f, 0xdd6c, 0xcd4d, 0xbdaa, 0xad8b, 0x9de8, 0x8dc9,
  0x7c26, 0x6c07, 0x5c64, 0x4c45, 0x3ca2, 0x2c83, 0x1ce0, 0x0cc1,
  0xef1f, 0xff3e, 0xcf5d, 0xdf7c, 0xaf9b, 0xbfba, 0x8fd9, 0x9ff8,
  0x6e17, 0x7e36, 0x4e55, 0x5e74, 0x2e93, 0x3eb2, 0x0ed1, 0x1ef0
];

/**
 * Convert a string to a UTF8 array - faster than via buffer
 * @param str
 * @returns {Array}
 */
var toUTF8Array = function toUTF8Array(str) {
  var char;
  var i = 0;
  var p = 0;
  var utf8 = [];
  var len = str.length;

  for (; i < len; i++) {
    char = str.charCodeAt(i);
    if (char < 128) {
      utf8[p++] = char;
    } else if (char < 2048) {
      utf8[p++] = (char >> 6) | 192;
      utf8[p++] = (char & 63) | 128;
    } else if (
        ((char & 0xFC00) === 0xD800) && (i + 1) < str.length &&
        ((str.charCodeAt(i + 1) & 0xFC00) === 0xDC00)) {
      char = 0x10000 + ((char & 0x03FF) << 10) + (str.charCodeAt(++i) & 0x03FF);
      utf8[p++] = (char >> 18) | 240;
      utf8[p++] = ((char >> 12) & 63) | 128;
      utf8[p++] = ((char >> 6) & 63) | 128;
      utf8[p++] = (char & 63) | 128;
    } else {
      utf8[p++] = (char >> 12) | 224;
      utf8[p++] = ((char >> 6) & 63) | 128;
      utf8[p++] = (char & 63) | 128;
    }
  }

  return utf8;
};

/**
 * Convert a string into a redis slot hash.
 * @param str
 * @returns {number}
 */
var generate = lib.exports = function generate(str) {
  var char;
  var i = 0;
  var start = -1;
  var result = 0;
  var resultHash = 0;
  var utf8 = typeof str === 'string' ? toUTF8Array(str) : str;
  var len = utf8.length;

  while (i < len) {
    char = utf8[i++];
    if (start === -1) {
      if (char === 0x7B) {
        start = i;
      }
    } else if (char !== 0x7D) {
      resultHash = lookup[(char ^ (resultHash >> 8)) & 0xFF] ^ (resultHash << 8);
    } else if (i - 1 !== start) {
      return resultHash & 0x3FFF;
    }

    result = lookup[(char ^ (result >> 8)) & 0xFF] ^ (result << 8);
  }

  return result & 0x3FFF;
};

/**
 * Convert an array of multiple strings into a redis slot hash.
 * Returns -1 if one of the keys is not for the same slot as the others
 * @param keys
 * @returns {number}
 */
libExports.generateMulti = function generateMulti(keys) {
  var i = 1;
  var len = keys.length;
  var base = generate(keys[0]);

  while (i < len) {
    if (generate(keys[i++]) !== base) return -1;
  }

  return base;
};

var utils = {};

var lodash = {};

/**
 * lodash (Custom Build) <https://lodash.com/>
 * Build: `lodash modularize exports="npm" -o ./`
 * Copyright jQuery Foundation and other contributors <https://jquery.org/>
 * Released under MIT license <https://lodash.com/license>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 */

/** Used as references for various `Number` constants. */
var MAX_SAFE_INTEGER$1 = 9007199254740991;

/** `Object#toString` result references. */
var argsTag$1 = '[object Arguments]',
    funcTag$1 = '[object Function]',
    genTag$1 = '[object GeneratorFunction]';

/** Used to detect unsigned integer values. */
var reIsUint = /^(?:0|[1-9]\d*)$/;

/**
 * A faster alternative to `Function#apply`, this function invokes `func`
 * with the `this` binding of `thisArg` and the arguments of `args`.
 *
 * @private
 * @param {Function} func The function to invoke.
 * @param {*} thisArg The `this` binding of `func`.
 * @param {Array} args The arguments to invoke `func` with.
 * @returns {*} Returns the result of `func`.
 */
function apply(func, thisArg, args) {
  switch (args.length) {
    case 0: return func.call(thisArg);
    case 1: return func.call(thisArg, args[0]);
    case 2: return func.call(thisArg, args[0], args[1]);
    case 3: return func.call(thisArg, args[0], args[1], args[2]);
  }
  return func.apply(thisArg, args);
}

/**
 * The base implementation of `_.times` without support for iteratee shorthands
 * or max array length checks.
 *
 * @private
 * @param {number} n The number of times to invoke `iteratee`.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Array} Returns the array of results.
 */
function baseTimes(n, iteratee) {
  var index = -1,
      result = Array(n);

  while (++index < n) {
    result[index] = iteratee(index);
  }
  return result;
}

/** Used for built-in method references. */
var objectProto$1 = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty$1 = objectProto$1.hasOwnProperty;

/**
 * Used to resolve the
 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
 * of values.
 */
var objectToString$1 = objectProto$1.toString;

/** Built-in value references. */
var propertyIsEnumerable$1 = objectProto$1.propertyIsEnumerable;

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeMax = Math.max;

/**
 * Creates an array of the enumerable property names of the array-like `value`.
 *
 * @private
 * @param {*} value The value to query.
 * @param {boolean} inherited Specify returning inherited property names.
 * @returns {Array} Returns the array of property names.
 */
function arrayLikeKeys(value, inherited) {
  // Safari 8.1 makes `arguments.callee` enumerable in strict mode.
  // Safari 9 makes `arguments.length` enumerable in strict mode.
  var result = (isArray(value) || isArguments$2(value))
    ? baseTimes(value.length, String)
    : [];

  var length = result.length,
      skipIndexes = !!length;

  for (var key in value) {
    if ((inherited || hasOwnProperty$1.call(value, key)) &&
        !(skipIndexes && (key == 'length' || isIndex(key, length)))) {
      result.push(key);
    }
  }
  return result;
}

/**
 * Used by `_.defaults` to customize its `_.assignIn` use.
 *
 * @private
 * @param {*} objValue The destination value.
 * @param {*} srcValue The source value.
 * @param {string} key The key of the property to assign.
 * @param {Object} object The parent object of `objValue`.
 * @returns {*} Returns the value to assign.
 */
function assignInDefaults(objValue, srcValue, key, object) {
  if (objValue === undefined ||
      (eq(objValue, objectProto$1[key]) && !hasOwnProperty$1.call(object, key))) {
    return srcValue;
  }
  return objValue;
}

/**
 * Assigns `value` to `key` of `object` if the existing value is not equivalent
 * using [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
 * for equality comparisons.
 *
 * @private
 * @param {Object} object The object to modify.
 * @param {string} key The key of the property to assign.
 * @param {*} value The value to assign.
 */
function assignValue(object, key, value) {
  var objValue = object[key];
  if (!(hasOwnProperty$1.call(object, key) && eq(objValue, value)) ||
      (value === undefined && !(key in object))) {
    object[key] = value;
  }
}

/**
 * The base implementation of `_.keysIn` which doesn't treat sparse arrays as dense.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 */
function baseKeysIn(object) {
  if (!isObject$1(object)) {
    return nativeKeysIn(object);
  }
  var isProto = isPrototype(object),
      result = [];

  for (var key in object) {
    if (!(key == 'constructor' && (isProto || !hasOwnProperty$1.call(object, key)))) {
      result.push(key);
    }
  }
  return result;
}

/**
 * The base implementation of `_.rest` which doesn't validate or coerce arguments.
 *
 * @private
 * @param {Function} func The function to apply a rest parameter to.
 * @param {number} [start=func.length-1] The start position of the rest parameter.
 * @returns {Function} Returns the new function.
 */
function baseRest(func, start) {
  start = nativeMax(start === undefined ? (func.length - 1) : start, 0);
  return function() {
    var args = arguments,
        index = -1,
        length = nativeMax(args.length - start, 0),
        array = Array(length);

    while (++index < length) {
      array[index] = args[start + index];
    }
    index = -1;
    var otherArgs = Array(start + 1);
    while (++index < start) {
      otherArgs[index] = args[index];
    }
    otherArgs[start] = array;
    return apply(func, this, otherArgs);
  };
}

/**
 * Copies properties of `source` to `object`.
 *
 * @private
 * @param {Object} source The object to copy properties from.
 * @param {Array} props The property identifiers to copy.
 * @param {Object} [object={}] The object to copy properties to.
 * @param {Function} [customizer] The function to customize copied values.
 * @returns {Object} Returns `object`.
 */
function copyObject(source, props, object, customizer) {
  object || (object = {});

  var index = -1,
      length = props.length;

  while (++index < length) {
    var key = props[index];

    var newValue = customizer
      ? customizer(object[key], source[key], key, object, source)
      : undefined;

    assignValue(object, key, newValue === undefined ? source[key] : newValue);
  }
  return object;
}

/**
 * Creates a function like `_.assign`.
 *
 * @private
 * @param {Function} assigner The function to assign values.
 * @returns {Function} Returns the new assigner function.
 */
function createAssigner(assigner) {
  return baseRest(function(object, sources) {
    var index = -1,
        length = sources.length,
        customizer = length > 1 ? sources[length - 1] : undefined,
        guard = length > 2 ? sources[2] : undefined;

    customizer = (assigner.length > 3 && typeof customizer == 'function')
      ? (length--, customizer)
      : undefined;

    if (guard && isIterateeCall(sources[0], sources[1], guard)) {
      customizer = length < 3 ? undefined : customizer;
      length = 1;
    }
    object = Object(object);
    while (++index < length) {
      var source = sources[index];
      if (source) {
        assigner(object, source, index, customizer);
      }
    }
    return object;
  });
}

/**
 * Checks if `value` is a valid array-like index.
 *
 * @private
 * @param {*} value The value to check.
 * @param {number} [length=MAX_SAFE_INTEGER] The upper bounds of a valid index.
 * @returns {boolean} Returns `true` if `value` is a valid index, else `false`.
 */
function isIndex(value, length) {
  length = length == null ? MAX_SAFE_INTEGER$1 : length;
  return !!length &&
    (typeof value == 'number' || reIsUint.test(value)) &&
    (value > -1 && value % 1 == 0 && value < length);
}

/**
 * Checks if the given arguments are from an iteratee call.
 *
 * @private
 * @param {*} value The potential iteratee value argument.
 * @param {*} index The potential iteratee index or key argument.
 * @param {*} object The potential iteratee object argument.
 * @returns {boolean} Returns `true` if the arguments are from an iteratee call,
 *  else `false`.
 */
function isIterateeCall(value, index, object) {
  if (!isObject$1(object)) {
    return false;
  }
  var type = typeof index;
  if (type == 'number'
        ? (isArrayLike$1(object) && isIndex(index, object.length))
        : (type == 'string' && index in object)
      ) {
    return eq(object[index], value);
  }
  return false;
}

/**
 * Checks if `value` is likely a prototype object.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a prototype, else `false`.
 */
function isPrototype(value) {
  var Ctor = value && value.constructor,
      proto = (typeof Ctor == 'function' && Ctor.prototype) || objectProto$1;

  return value === proto;
}

/**
 * This function is like
 * [`Object.keys`](http://ecma-international.org/ecma-262/7.0/#sec-object.keys)
 * except that it includes inherited enumerable properties.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 */
function nativeKeysIn(object) {
  var result = [];
  if (object != null) {
    for (var key in Object(object)) {
      result.push(key);
    }
  }
  return result;
}

/**
 * Performs a
 * [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
 * comparison between two values to determine if they are equivalent.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to compare.
 * @param {*} other The other value to compare.
 * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
 * @example
 *
 * var object = { 'a': 1 };
 * var other = { 'a': 1 };
 *
 * _.eq(object, object);
 * // => true
 *
 * _.eq(object, other);
 * // => false
 *
 * _.eq('a', 'a');
 * // => true
 *
 * _.eq('a', Object('a'));
 * // => false
 *
 * _.eq(NaN, NaN);
 * // => true
 */
function eq(value, other) {
  return value === other || (value !== value && other !== other);
}

/**
 * Checks if `value` is likely an `arguments` object.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an `arguments` object,
 *  else `false`.
 * @example
 *
 * _.isArguments(function() { return arguments; }());
 * // => true
 *
 * _.isArguments([1, 2, 3]);
 * // => false
 */
function isArguments$2(value) {
  // Safari 8.1 makes `arguments.callee` enumerable in strict mode.
  return isArrayLikeObject$1(value) && hasOwnProperty$1.call(value, 'callee') &&
    (!propertyIsEnumerable$1.call(value, 'callee') || objectToString$1.call(value) == argsTag$1);
}

/**
 * Checks if `value` is classified as an `Array` object.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an array, else `false`.
 * @example
 *
 * _.isArray([1, 2, 3]);
 * // => true
 *
 * _.isArray(document.body.children);
 * // => false
 *
 * _.isArray('abc');
 * // => false
 *
 * _.isArray(_.noop);
 * // => false
 */
var isArray = Array.isArray;

/**
 * Checks if `value` is array-like. A value is considered array-like if it's
 * not a function and has a `value.length` that's an integer greater than or
 * equal to `0` and less than or equal to `Number.MAX_SAFE_INTEGER`.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is array-like, else `false`.
 * @example
 *
 * _.isArrayLike([1, 2, 3]);
 * // => true
 *
 * _.isArrayLike(document.body.children);
 * // => true
 *
 * _.isArrayLike('abc');
 * // => true
 *
 * _.isArrayLike(_.noop);
 * // => false
 */
function isArrayLike$1(value) {
  return value != null && isLength$1(value.length) && !isFunction$1(value);
}

/**
 * This method is like `_.isArrayLike` except that it also checks if `value`
 * is an object.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an array-like object,
 *  else `false`.
 * @example
 *
 * _.isArrayLikeObject([1, 2, 3]);
 * // => true
 *
 * _.isArrayLikeObject(document.body.children);
 * // => true
 *
 * _.isArrayLikeObject('abc');
 * // => false
 *
 * _.isArrayLikeObject(_.noop);
 * // => false
 */
function isArrayLikeObject$1(value) {
  return isObjectLike$1(value) && isArrayLike$1(value);
}

/**
 * Checks if `value` is classified as a `Function` object.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a function, else `false`.
 * @example
 *
 * _.isFunction(_);
 * // => true
 *
 * _.isFunction(/abc/);
 * // => false
 */
function isFunction$1(value) {
  // The use of `Object#toString` avoids issues with the `typeof` operator
  // in Safari 8-9 which returns 'object' for typed array and other constructors.
  var tag = isObject$1(value) ? objectToString$1.call(value) : '';
  return tag == funcTag$1 || tag == genTag$1;
}

/**
 * Checks if `value` is a valid array-like length.
 *
 * **Note:** This method is loosely based on
 * [`ToLength`](http://ecma-international.org/ecma-262/7.0/#sec-tolength).
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
 * @example
 *
 * _.isLength(3);
 * // => true
 *
 * _.isLength(Number.MIN_VALUE);
 * // => false
 *
 * _.isLength(Infinity);
 * // => false
 *
 * _.isLength('3');
 * // => false
 */
function isLength$1(value) {
  return typeof value == 'number' &&
    value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER$1;
}

/**
 * Checks if `value` is the
 * [language type](http://www.ecma-international.org/ecma-262/7.0/#sec-ecmascript-language-types)
 * of `Object`. (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(_.noop);
 * // => true
 *
 * _.isObject(null);
 * // => false
 */
function isObject$1(value) {
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

/**
 * Checks if `value` is object-like. A value is object-like if it's not `null`
 * and has a `typeof` result of "object".
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 * @example
 *
 * _.isObjectLike({});
 * // => true
 *
 * _.isObjectLike([1, 2, 3]);
 * // => true
 *
 * _.isObjectLike(_.noop);
 * // => false
 *
 * _.isObjectLike(null);
 * // => false
 */
function isObjectLike$1(value) {
  return !!value && typeof value == 'object';
}

/**
 * This method is like `_.assignIn` except that it accepts `customizer`
 * which is invoked to produce the assigned values. If `customizer` returns
 * `undefined`, assignment is handled by the method instead. The `customizer`
 * is invoked with five arguments: (objValue, srcValue, key, object, source).
 *
 * **Note:** This method mutates `object`.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @alias extendWith
 * @category Object
 * @param {Object} object The destination object.
 * @param {...Object} sources The source objects.
 * @param {Function} [customizer] The function to customize assigned values.
 * @returns {Object} Returns `object`.
 * @see _.assignWith
 * @example
 *
 * function customizer(objValue, srcValue) {
 *   return _.isUndefined(objValue) ? srcValue : objValue;
 * }
 *
 * var defaults = _.partialRight(_.assignInWith, customizer);
 *
 * defaults({ 'a': 1 }, { 'b': 2 }, { 'a': 3 });
 * // => { 'a': 1, 'b': 2 }
 */
var assignInWith = createAssigner(function(object, source, srcIndex, customizer) {
  copyObject(source, keysIn(source), object, customizer);
});

/**
 * Assigns own and inherited enumerable string keyed properties of source
 * objects to the destination object for all destination properties that
 * resolve to `undefined`. Source objects are applied from left to right.
 * Once a property is set, additional values of the same property are ignored.
 *
 * **Note:** This method mutates `object`.
 *
 * @static
 * @since 0.1.0
 * @memberOf _
 * @category Object
 * @param {Object} object The destination object.
 * @param {...Object} [sources] The source objects.
 * @returns {Object} Returns `object`.
 * @see _.defaultsDeep
 * @example
 *
 * _.defaults({ 'a': 1 }, { 'b': 2 }, { 'a': 3 });
 * // => { 'a': 1, 'b': 2 }
 */
var defaults$1 = baseRest(function(args) {
  args.push(undefined, assignInDefaults);
  return apply(assignInWith, undefined, args);
});

/**
 * Creates an array of the own and inherited enumerable property names of `object`.
 *
 * **Note:** Non-object values are coerced to objects.
 *
 * @static
 * @memberOf _
 * @since 3.0.0
 * @category Object
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 * @example
 *
 * function Foo() {
 *   this.a = 1;
 *   this.b = 2;
 * }
 *
 * Foo.prototype.c = 3;
 *
 * _.keysIn(new Foo);
 * // => ['a', 'b', 'c'] (iteration order is not guaranteed)
 */
function keysIn(object) {
  return isArrayLike$1(object) ? arrayLikeKeys(object, true) : baseKeysIn(object);
}

var lodash_defaults = defaults$1;

/**
 * lodash (Custom Build) <https://lodash.com/>
 * Build: `lodash modularize exports="npm" -o ./`
 * Copyright jQuery Foundation and other contributors <https://jquery.org/>
 * Released under MIT license <https://lodash.com/license>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 */

/** Used as references for various `Number` constants. */
var MAX_SAFE_INTEGER = 9007199254740991;

/** `Object#toString` result references. */
var argsTag = '[object Arguments]',
    funcTag = '[object Function]',
    genTag = '[object GeneratorFunction]';

/** Used for built-in method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Used to resolve the
 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
 * of values.
 */
var objectToString = objectProto.toString;

/** Built-in value references. */
var propertyIsEnumerable = objectProto.propertyIsEnumerable;

/**
 * Checks if `value` is likely an `arguments` object.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an `arguments` object,
 *  else `false`.
 * @example
 *
 * _.isArguments(function() { return arguments; }());
 * // => true
 *
 * _.isArguments([1, 2, 3]);
 * // => false
 */
function isArguments$1(value) {
  // Safari 8.1 makes `arguments.callee` enumerable in strict mode.
  return isArrayLikeObject(value) && hasOwnProperty.call(value, 'callee') &&
    (!propertyIsEnumerable.call(value, 'callee') || objectToString.call(value) == argsTag);
}

/**
 * Checks if `value` is array-like. A value is considered array-like if it's
 * not a function and has a `value.length` that's an integer greater than or
 * equal to `0` and less than or equal to `Number.MAX_SAFE_INTEGER`.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is array-like, else `false`.
 * @example
 *
 * _.isArrayLike([1, 2, 3]);
 * // => true
 *
 * _.isArrayLike(document.body.children);
 * // => true
 *
 * _.isArrayLike('abc');
 * // => true
 *
 * _.isArrayLike(_.noop);
 * // => false
 */
function isArrayLike(value) {
  return value != null && isLength(value.length) && !isFunction(value);
}

/**
 * This method is like `_.isArrayLike` except that it also checks if `value`
 * is an object.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an array-like object,
 *  else `false`.
 * @example
 *
 * _.isArrayLikeObject([1, 2, 3]);
 * // => true
 *
 * _.isArrayLikeObject(document.body.children);
 * // => true
 *
 * _.isArrayLikeObject('abc');
 * // => false
 *
 * _.isArrayLikeObject(_.noop);
 * // => false
 */
function isArrayLikeObject(value) {
  return isObjectLike(value) && isArrayLike(value);
}

/**
 * Checks if `value` is classified as a `Function` object.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a function, else `false`.
 * @example
 *
 * _.isFunction(_);
 * // => true
 *
 * _.isFunction(/abc/);
 * // => false
 */
function isFunction(value) {
  // The use of `Object#toString` avoids issues with the `typeof` operator
  // in Safari 8-9 which returns 'object' for typed array and other constructors.
  var tag = isObject(value) ? objectToString.call(value) : '';
  return tag == funcTag || tag == genTag;
}

/**
 * Checks if `value` is a valid array-like length.
 *
 * **Note:** This method is loosely based on
 * [`ToLength`](http://ecma-international.org/ecma-262/7.0/#sec-tolength).
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
 * @example
 *
 * _.isLength(3);
 * // => true
 *
 * _.isLength(Number.MIN_VALUE);
 * // => false
 *
 * _.isLength(Infinity);
 * // => false
 *
 * _.isLength('3');
 * // => false
 */
function isLength(value) {
  return typeof value == 'number' &&
    value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
}

/**
 * Checks if `value` is the
 * [language type](http://www.ecma-international.org/ecma-262/7.0/#sec-ecmascript-language-types)
 * of `Object`. (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(_.noop);
 * // => true
 *
 * _.isObject(null);
 * // => false
 */
function isObject(value) {
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

/**
 * Checks if `value` is object-like. A value is object-like if it's not `null`
 * and has a `typeof` result of "object".
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 * @example
 *
 * _.isObjectLike({});
 * // => true
 *
 * _.isObjectLike([1, 2, 3]);
 * // => true
 *
 * _.isObjectLike(_.noop);
 * // => false
 *
 * _.isObjectLike(null);
 * // => false
 */
function isObjectLike(value) {
  return !!value && typeof value == 'object';
}

var lodash_isarguments = isArguments$1;

Object.defineProperty(lodash, "__esModule", { value: true });
lodash.isArguments = lodash.defaults = lodash.noop = void 0;
const defaults = lodash_defaults;
lodash.defaults = defaults;
const isArguments = lodash_isarguments;
lodash.isArguments = isArguments;
function noop() { }
lodash.noop = noop;

var debug$4 = {};

var srcExports = {};
var src = {
  get exports(){ return srcExports; },
  set exports(v){ srcExports = v; },
};

var browserExports = {};
var browser = {
  get exports(){ return browserExports; },
  set exports(v){ browserExports = v; },
};

/**
 * Helpers.
 */

var ms;
var hasRequiredMs;

function requireMs () {
	if (hasRequiredMs) return ms;
	hasRequiredMs = 1;
	var s = 1000;
	var m = s * 60;
	var h = m * 60;
	var d = h * 24;
	var w = d * 7;
	var y = d * 365.25;

	/**
	 * Parse or format the given `val`.
	 *
	 * Options:
	 *
	 *  - `long` verbose formatting [false]
	 *
	 * @param {String|Number} val
	 * @param {Object} [options]
	 * @throws {Error} throw an error if val is not a non-empty string or a number
	 * @return {String|Number}
	 * @api public
	 */

	ms = function(val, options) {
	  options = options || {};
	  var type = typeof val;
	  if (type === 'string' && val.length > 0) {
	    return parse(val);
	  } else if (type === 'number' && isFinite(val)) {
	    return options.long ? fmtLong(val) : fmtShort(val);
	  }
	  throw new Error(
	    'val is not a non-empty string or a valid number. val=' +
	      JSON.stringify(val)
	  );
	};

	/**
	 * Parse the given `str` and return milliseconds.
	 *
	 * @param {String} str
	 * @return {Number}
	 * @api private
	 */

	function parse(str) {
	  str = String(str);
	  if (str.length > 100) {
	    return;
	  }
	  var match = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(
	    str
	  );
	  if (!match) {
	    return;
	  }
	  var n = parseFloat(match[1]);
	  var type = (match[2] || 'ms').toLowerCase();
	  switch (type) {
	    case 'years':
	    case 'year':
	    case 'yrs':
	    case 'yr':
	    case 'y':
	      return n * y;
	    case 'weeks':
	    case 'week':
	    case 'w':
	      return n * w;
	    case 'days':
	    case 'day':
	    case 'd':
	      return n * d;
	    case 'hours':
	    case 'hour':
	    case 'hrs':
	    case 'hr':
	    case 'h':
	      return n * h;
	    case 'minutes':
	    case 'minute':
	    case 'mins':
	    case 'min':
	    case 'm':
	      return n * m;
	    case 'seconds':
	    case 'second':
	    case 'secs':
	    case 'sec':
	    case 's':
	      return n * s;
	    case 'milliseconds':
	    case 'millisecond':
	    case 'msecs':
	    case 'msec':
	    case 'ms':
	      return n;
	    default:
	      return undefined;
	  }
	}

	/**
	 * Short format for `ms`.
	 *
	 * @param {Number} ms
	 * @return {String}
	 * @api private
	 */

	function fmtShort(ms) {
	  var msAbs = Math.abs(ms);
	  if (msAbs >= d) {
	    return Math.round(ms / d) + 'd';
	  }
	  if (msAbs >= h) {
	    return Math.round(ms / h) + 'h';
	  }
	  if (msAbs >= m) {
	    return Math.round(ms / m) + 'm';
	  }
	  if (msAbs >= s) {
	    return Math.round(ms / s) + 's';
	  }
	  return ms + 'ms';
	}

	/**
	 * Long format for `ms`.
	 *
	 * @param {Number} ms
	 * @return {String}
	 * @api private
	 */

	function fmtLong(ms) {
	  var msAbs = Math.abs(ms);
	  if (msAbs >= d) {
	    return plural(ms, msAbs, d, 'day');
	  }
	  if (msAbs >= h) {
	    return plural(ms, msAbs, h, 'hour');
	  }
	  if (msAbs >= m) {
	    return plural(ms, msAbs, m, 'minute');
	  }
	  if (msAbs >= s) {
	    return plural(ms, msAbs, s, 'second');
	  }
	  return ms + ' ms';
	}

	/**
	 * Pluralization helper.
	 */

	function plural(ms, msAbs, n, name) {
	  var isPlural = msAbs >= n * 1.5;
	  return Math.round(ms / n) + ' ' + name + (isPlural ? 's' : '');
	}
	return ms;
}

var common;
var hasRequiredCommon;

function requireCommon () {
	if (hasRequiredCommon) return common;
	hasRequiredCommon = 1;
	/**
	 * This is the common logic for both the Node.js and web browser
	 * implementations of `debug()`.
	 */

	function setup(env) {
		createDebug.debug = createDebug;
		createDebug.default = createDebug;
		createDebug.coerce = coerce;
		createDebug.disable = disable;
		createDebug.enable = enable;
		createDebug.enabled = enabled;
		createDebug.humanize = requireMs();
		createDebug.destroy = destroy;

		Object.keys(env).forEach(key => {
			createDebug[key] = env[key];
		});

		/**
		* The currently active debug mode names, and names to skip.
		*/

		createDebug.names = [];
		createDebug.skips = [];

		/**
		* Map of special "%n" handling functions, for the debug "format" argument.
		*
		* Valid key names are a single, lower or upper-case letter, i.e. "n" and "N".
		*/
		createDebug.formatters = {};

		/**
		* Selects a color for a debug namespace
		* @param {String} namespace The namespace string for the debug instance to be colored
		* @return {Number|String} An ANSI color code for the given namespace
		* @api private
		*/
		function selectColor(namespace) {
			let hash = 0;

			for (let i = 0; i < namespace.length; i++) {
				hash = ((hash << 5) - hash) + namespace.charCodeAt(i);
				hash |= 0; // Convert to 32bit integer
			}

			return createDebug.colors[Math.abs(hash) % createDebug.colors.length];
		}
		createDebug.selectColor = selectColor;

		/**
		* Create a debugger with the given `namespace`.
		*
		* @param {String} namespace
		* @return {Function}
		* @api public
		*/
		function createDebug(namespace) {
			let prevTime;
			let enableOverride = null;
			let namespacesCache;
			let enabledCache;

			function debug(...args) {
				// Disabled?
				if (!debug.enabled) {
					return;
				}

				const self = debug;

				// Set `diff` timestamp
				const curr = Number(new Date());
				const ms = curr - (prevTime || curr);
				self.diff = ms;
				self.prev = prevTime;
				self.curr = curr;
				prevTime = curr;

				args[0] = createDebug.coerce(args[0]);

				if (typeof args[0] !== 'string') {
					// Anything else let's inspect with %O
					args.unshift('%O');
				}

				// Apply any `formatters` transformations
				let index = 0;
				args[0] = args[0].replace(/%([a-zA-Z%])/g, (match, format) => {
					// If we encounter an escaped % then don't increase the array index
					if (match === '%%') {
						return '%';
					}
					index++;
					const formatter = createDebug.formatters[format];
					if (typeof formatter === 'function') {
						const val = args[index];
						match = formatter.call(self, val);

						// Now we need to remove `args[index]` since it's inlined in the `format`
						args.splice(index, 1);
						index--;
					}
					return match;
				});

				// Apply env-specific formatting (colors, etc.)
				createDebug.formatArgs.call(self, args);

				const logFn = self.log || createDebug.log;
				logFn.apply(self, args);
			}

			debug.namespace = namespace;
			debug.useColors = createDebug.useColors();
			debug.color = createDebug.selectColor(namespace);
			debug.extend = extend;
			debug.destroy = createDebug.destroy; // XXX Temporary. Will be removed in the next major release.

			Object.defineProperty(debug, 'enabled', {
				enumerable: true,
				configurable: false,
				get: () => {
					if (enableOverride !== null) {
						return enableOverride;
					}
					if (namespacesCache !== createDebug.namespaces) {
						namespacesCache = createDebug.namespaces;
						enabledCache = createDebug.enabled(namespace);
					}

					return enabledCache;
				},
				set: v => {
					enableOverride = v;
				}
			});

			// Env-specific initialization logic for debug instances
			if (typeof createDebug.init === 'function') {
				createDebug.init(debug);
			}

			return debug;
		}

		function extend(namespace, delimiter) {
			const newDebug = createDebug(this.namespace + (typeof delimiter === 'undefined' ? ':' : delimiter) + namespace);
			newDebug.log = this.log;
			return newDebug;
		}

		/**
		* Enables a debug mode by namespaces. This can include modes
		* separated by a colon and wildcards.
		*
		* @param {String} namespaces
		* @api public
		*/
		function enable(namespaces) {
			createDebug.save(namespaces);
			createDebug.namespaces = namespaces;

			createDebug.names = [];
			createDebug.skips = [];

			let i;
			const split = (typeof namespaces === 'string' ? namespaces : '').split(/[\s,]+/);
			const len = split.length;

			for (i = 0; i < len; i++) {
				if (!split[i]) {
					// ignore empty strings
					continue;
				}

				namespaces = split[i].replace(/\*/g, '.*?');

				if (namespaces[0] === '-') {
					createDebug.skips.push(new RegExp('^' + namespaces.slice(1) + '$'));
				} else {
					createDebug.names.push(new RegExp('^' + namespaces + '$'));
				}
			}
		}

		/**
		* Disable debug output.
		*
		* @return {String} namespaces
		* @api public
		*/
		function disable() {
			const namespaces = [
				...createDebug.names.map(toNamespace),
				...createDebug.skips.map(toNamespace).map(namespace => '-' + namespace)
			].join(',');
			createDebug.enable('');
			return namespaces;
		}

		/**
		* Returns true if the given mode name is enabled, false otherwise.
		*
		* @param {String} name
		* @return {Boolean}
		* @api public
		*/
		function enabled(name) {
			if (name[name.length - 1] === '*') {
				return true;
			}

			let i;
			let len;

			for (i = 0, len = createDebug.skips.length; i < len; i++) {
				if (createDebug.skips[i].test(name)) {
					return false;
				}
			}

			for (i = 0, len = createDebug.names.length; i < len; i++) {
				if (createDebug.names[i].test(name)) {
					return true;
				}
			}

			return false;
		}

		/**
		* Convert regexp to namespace
		*
		* @param {RegExp} regxep
		* @return {String} namespace
		* @api private
		*/
		function toNamespace(regexp) {
			return regexp.toString()
				.substring(2, regexp.toString().length - 2)
				.replace(/\.\*\?$/, '*');
		}

		/**
		* Coerce `val`.
		*
		* @param {Mixed} val
		* @return {Mixed}
		* @api private
		*/
		function coerce(val) {
			if (val instanceof Error) {
				return val.stack || val.message;
			}
			return val;
		}

		/**
		* XXX DO NOT USE. This is a temporary stub function.
		* XXX It WILL be removed in the next major release.
		*/
		function destroy() {
			console.warn('Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.');
		}

		createDebug.enable(createDebug.load());

		return createDebug;
	}

	common = setup;
	return common;
}

/* eslint-env browser */

var hasRequiredBrowser;

function requireBrowser () {
	if (hasRequiredBrowser) return browserExports;
	hasRequiredBrowser = 1;
	(function (module, exports) {
		/**
		 * This is the web browser implementation of `debug()`.
		 */

		exports.formatArgs = formatArgs;
		exports.save = save;
		exports.load = load;
		exports.useColors = useColors;
		exports.storage = localstorage();
		exports.destroy = (() => {
			let warned = false;

			return () => {
				if (!warned) {
					warned = true;
					console.warn('Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.');
				}
			};
		})();

		/**
		 * Colors.
		 */

		exports.colors = [
			'#0000CC',
			'#0000FF',
			'#0033CC',
			'#0033FF',
			'#0066CC',
			'#0066FF',
			'#0099CC',
			'#0099FF',
			'#00CC00',
			'#00CC33',
			'#00CC66',
			'#00CC99',
			'#00CCCC',
			'#00CCFF',
			'#3300CC',
			'#3300FF',
			'#3333CC',
			'#3333FF',
			'#3366CC',
			'#3366FF',
			'#3399CC',
			'#3399FF',
			'#33CC00',
			'#33CC33',
			'#33CC66',
			'#33CC99',
			'#33CCCC',
			'#33CCFF',
			'#6600CC',
			'#6600FF',
			'#6633CC',
			'#6633FF',
			'#66CC00',
			'#66CC33',
			'#9900CC',
			'#9900FF',
			'#9933CC',
			'#9933FF',
			'#99CC00',
			'#99CC33',
			'#CC0000',
			'#CC0033',
			'#CC0066',
			'#CC0099',
			'#CC00CC',
			'#CC00FF',
			'#CC3300',
			'#CC3333',
			'#CC3366',
			'#CC3399',
			'#CC33CC',
			'#CC33FF',
			'#CC6600',
			'#CC6633',
			'#CC9900',
			'#CC9933',
			'#CCCC00',
			'#CCCC33',
			'#FF0000',
			'#FF0033',
			'#FF0066',
			'#FF0099',
			'#FF00CC',
			'#FF00FF',
			'#FF3300',
			'#FF3333',
			'#FF3366',
			'#FF3399',
			'#FF33CC',
			'#FF33FF',
			'#FF6600',
			'#FF6633',
			'#FF9900',
			'#FF9933',
			'#FFCC00',
			'#FFCC33'
		];

		/**
		 * Currently only WebKit-based Web Inspectors, Firefox >= v31,
		 * and the Firebug extension (any Firefox version) are known
		 * to support "%c" CSS customizations.
		 *
		 * TODO: add a `localStorage` variable to explicitly enable/disable colors
		 */

		// eslint-disable-next-line complexity
		function useColors() {
			// NB: In an Electron preload script, document will be defined but not fully
			// initialized. Since we know we're in Chrome, we'll just detect this case
			// explicitly
			if (typeof window !== 'undefined' && window.process && (window.process.type === 'renderer' || window.process.__nwjs)) {
				return true;
			}

			// Internet Explorer and Edge do not support colors.
			if (typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/)) {
				return false;
			}

			// Is webkit? http://stackoverflow.com/a/16459606/376773
			// document is undefined in react-native: https://github.com/facebook/react-native/pull/1632
			return (typeof document !== 'undefined' && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance) ||
				// Is firebug? http://stackoverflow.com/a/398120/376773
				(typeof window !== 'undefined' && window.console && (window.console.firebug || (window.console.exception && window.console.table))) ||
				// Is firefox >= v31?
				// https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
				(typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31) ||
				// Double check webkit in userAgent just in case we are in a worker
				(typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/));
		}

		/**
		 * Colorize log arguments if enabled.
		 *
		 * @api public
		 */

		function formatArgs(args) {
			args[0] = (this.useColors ? '%c' : '') +
				this.namespace +
				(this.useColors ? ' %c' : ' ') +
				args[0] +
				(this.useColors ? '%c ' : ' ') +
				'+' + module.exports.humanize(this.diff);

			if (!this.useColors) {
				return;
			}

			const c = 'color: ' + this.color;
			args.splice(1, 0, c, 'color: inherit');

			// The final "%c" is somewhat tricky, because there could be other
			// arguments passed either before or after the %c, so we need to
			// figure out the correct index to insert the CSS into
			let index = 0;
			let lastC = 0;
			args[0].replace(/%[a-zA-Z%]/g, match => {
				if (match === '%%') {
					return;
				}
				index++;
				if (match === '%c') {
					// We only are interested in the *last* %c
					// (the user may have provided their own)
					lastC = index;
				}
			});

			args.splice(lastC, 0, c);
		}

		/**
		 * Invokes `console.debug()` when available.
		 * No-op when `console.debug` is not a "function".
		 * If `console.debug` is not available, falls back
		 * to `console.log`.
		 *
		 * @api public
		 */
		exports.log = console.debug || console.log || (() => {});

		/**
		 * Save `namespaces`.
		 *
		 * @param {String} namespaces
		 * @api private
		 */
		function save(namespaces) {
			try {
				if (namespaces) {
					exports.storage.setItem('debug', namespaces);
				} else {
					exports.storage.removeItem('debug');
				}
			} catch (error) {
				// Swallow
				// XXX (@Qix-) should we be logging these?
			}
		}

		/**
		 * Load `namespaces`.
		 *
		 * @return {String} returns the previously persisted debug modes
		 * @api private
		 */
		function load() {
			let r;
			try {
				r = exports.storage.getItem('debug');
			} catch (error) {
				// Swallow
				// XXX (@Qix-) should we be logging these?
			}

			// If debug isn't set in LS, and we're in Electron, try to load $DEBUG
			if (!r && typeof process !== 'undefined' && 'env' in process) {
				r = process.env.DEBUG;
			}

			return r;
		}

		/**
		 * Localstorage attempts to return the localstorage.
		 *
		 * This is necessary because safari throws
		 * when a user disables cookies/localstorage
		 * and you attempt to access it.
		 *
		 * @return {LocalStorage}
		 * @api private
		 */

		function localstorage() {
			try {
				// TVMLKit (Apple TV JS Runtime) does not have a window object, just localStorage in the global context
				// The Browser also has localStorage in the global context.
				return localStorage;
			} catch (error) {
				// Swallow
				// XXX (@Qix-) should we be logging these?
			}
		}

		module.exports = requireCommon()(exports);

		const {formatters} = module.exports;

		/**
		 * Map %j to `JSON.stringify()`, since no Web Inspectors do that by default.
		 */

		formatters.j = function (v) {
			try {
				return JSON.stringify(v);
			} catch (error) {
				return '[UnexpectedJSONParseError]: ' + error.message;
			}
		};
} (browser, browserExports));
	return browserExports;
}

var nodeExports = {};
var node = {
  get exports(){ return nodeExports; },
  set exports(v){ nodeExports = v; },
};

var hasFlag;
var hasRequiredHasFlag;

function requireHasFlag () {
	if (hasRequiredHasFlag) return hasFlag;
	hasRequiredHasFlag = 1;

	hasFlag = (flag, argv = process.argv) => {
		const prefix = flag.startsWith('-') ? '' : (flag.length === 1 ? '-' : '--');
		const position = argv.indexOf(prefix + flag);
		const terminatorPosition = argv.indexOf('--');
		return position !== -1 && (terminatorPosition === -1 || position < terminatorPosition);
	};
	return hasFlag;
}

var supportsColor_1;
var hasRequiredSupportsColor;

function requireSupportsColor () {
	if (hasRequiredSupportsColor) return supportsColor_1;
	hasRequiredSupportsColor = 1;
	const os = require$$0$3;
	const tty = require$$1$2;
	const hasFlag = requireHasFlag();

	const {env} = process;

	let forceColor;
	if (hasFlag('no-color') ||
		hasFlag('no-colors') ||
		hasFlag('color=false') ||
		hasFlag('color=never')) {
		forceColor = 0;
	} else if (hasFlag('color') ||
		hasFlag('colors') ||
		hasFlag('color=true') ||
		hasFlag('color=always')) {
		forceColor = 1;
	}

	if ('FORCE_COLOR' in env) {
		if (env.FORCE_COLOR === 'true') {
			forceColor = 1;
		} else if (env.FORCE_COLOR === 'false') {
			forceColor = 0;
		} else {
			forceColor = env.FORCE_COLOR.length === 0 ? 1 : Math.min(parseInt(env.FORCE_COLOR, 10), 3);
		}
	}

	function translateLevel(level) {
		if (level === 0) {
			return false;
		}

		return {
			level,
			hasBasic: true,
			has256: level >= 2,
			has16m: level >= 3
		};
	}

	function supportsColor(haveStream, streamIsTTY) {
		if (forceColor === 0) {
			return 0;
		}

		if (hasFlag('color=16m') ||
			hasFlag('color=full') ||
			hasFlag('color=truecolor')) {
			return 3;
		}

		if (hasFlag('color=256')) {
			return 2;
		}

		if (haveStream && !streamIsTTY && forceColor === undefined) {
			return 0;
		}

		const min = forceColor || 0;

		if (env.TERM === 'dumb') {
			return min;
		}

		if (process.platform === 'win32') {
			// Windows 10 build 10586 is the first Windows release that supports 256 colors.
			// Windows 10 build 14931 is the first release that supports 16m/TrueColor.
			const osRelease = os.release().split('.');
			if (
				Number(osRelease[0]) >= 10 &&
				Number(osRelease[2]) >= 10586
			) {
				return Number(osRelease[2]) >= 14931 ? 3 : 2;
			}

			return 1;
		}

		if ('CI' in env) {
			if (['TRAVIS', 'CIRCLECI', 'APPVEYOR', 'GITLAB_CI', 'GITHUB_ACTIONS', 'BUILDKITE'].some(sign => sign in env) || env.CI_NAME === 'codeship') {
				return 1;
			}

			return min;
		}

		if ('TEAMCITY_VERSION' in env) {
			return /^(9\.(0*[1-9]\d*)\.|\d{2,}\.)/.test(env.TEAMCITY_VERSION) ? 1 : 0;
		}

		if (env.COLORTERM === 'truecolor') {
			return 3;
		}

		if ('TERM_PROGRAM' in env) {
			const version = parseInt((env.TERM_PROGRAM_VERSION || '').split('.')[0], 10);

			switch (env.TERM_PROGRAM) {
				case 'iTerm.app':
					return version >= 3 ? 3 : 2;
				case 'Apple_Terminal':
					return 2;
				// No default
			}
		}

		if (/-256(color)?$/i.test(env.TERM)) {
			return 2;
		}

		if (/^screen|^xterm|^vt100|^vt220|^rxvt|color|ansi|cygwin|linux/i.test(env.TERM)) {
			return 1;
		}

		if ('COLORTERM' in env) {
			return 1;
		}

		return min;
	}

	function getSupportLevel(stream) {
		const level = supportsColor(stream, stream && stream.isTTY);
		return translateLevel(level);
	}

	supportsColor_1 = {
		supportsColor: getSupportLevel,
		stdout: translateLevel(supportsColor(true, tty.isatty(1))),
		stderr: translateLevel(supportsColor(true, tty.isatty(2)))
	};
	return supportsColor_1;
}

/**
 * Module dependencies.
 */

var hasRequiredNode;

function requireNode () {
	if (hasRequiredNode) return nodeExports;
	hasRequiredNode = 1;
	(function (module, exports) {
		const tty = require$$1$2;
		const util = require$$1$1;

		/**
		 * This is the Node.js implementation of `debug()`.
		 */

		exports.init = init;
		exports.log = log;
		exports.formatArgs = formatArgs;
		exports.save = save;
		exports.load = load;
		exports.useColors = useColors;
		exports.destroy = util.deprecate(
			() => {},
			'Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.'
		);

		/**
		 * Colors.
		 */

		exports.colors = [6, 2, 3, 4, 5, 1];

		try {
			// Optional dependency (as in, doesn't need to be installed, NOT like optionalDependencies in package.json)
			// eslint-disable-next-line import/no-extraneous-dependencies
			const supportsColor = requireSupportsColor();

			if (supportsColor && (supportsColor.stderr || supportsColor).level >= 2) {
				exports.colors = [
					20,
					21,
					26,
					27,
					32,
					33,
					38,
					39,
					40,
					41,
					42,
					43,
					44,
					45,
					56,
					57,
					62,
					63,
					68,
					69,
					74,
					75,
					76,
					77,
					78,
					79,
					80,
					81,
					92,
					93,
					98,
					99,
					112,
					113,
					128,
					129,
					134,
					135,
					148,
					149,
					160,
					161,
					162,
					163,
					164,
					165,
					166,
					167,
					168,
					169,
					170,
					171,
					172,
					173,
					178,
					179,
					184,
					185,
					196,
					197,
					198,
					199,
					200,
					201,
					202,
					203,
					204,
					205,
					206,
					207,
					208,
					209,
					214,
					215,
					220,
					221
				];
			}
		} catch (error) {
			// Swallow - we only care if `supports-color` is available; it doesn't have to be.
		}

		/**
		 * Build up the default `inspectOpts` object from the environment variables.
		 *
		 *   $ DEBUG_COLORS=no DEBUG_DEPTH=10 DEBUG_SHOW_HIDDEN=enabled node script.js
		 */

		exports.inspectOpts = Object.keys(process.env).filter(key => {
			return /^debug_/i.test(key);
		}).reduce((obj, key) => {
			// Camel-case
			const prop = key
				.substring(6)
				.toLowerCase()
				.replace(/_([a-z])/g, (_, k) => {
					return k.toUpperCase();
				});

			// Coerce string value into JS value
			let val = process.env[key];
			if (/^(yes|on|true|enabled)$/i.test(val)) {
				val = true;
			} else if (/^(no|off|false|disabled)$/i.test(val)) {
				val = false;
			} else if (val === 'null') {
				val = null;
			} else {
				val = Number(val);
			}

			obj[prop] = val;
			return obj;
		}, {});

		/**
		 * Is stdout a TTY? Colored output is enabled when `true`.
		 */

		function useColors() {
			return 'colors' in exports.inspectOpts ?
				Boolean(exports.inspectOpts.colors) :
				tty.isatty(process.stderr.fd);
		}

		/**
		 * Adds ANSI color escape codes if enabled.
		 *
		 * @api public
		 */

		function formatArgs(args) {
			const {namespace: name, useColors} = this;

			if (useColors) {
				const c = this.color;
				const colorCode = '\u001B[3' + (c < 8 ? c : '8;5;' + c);
				const prefix = `  ${colorCode};1m${name} \u001B[0m`;

				args[0] = prefix + args[0].split('\n').join('\n' + prefix);
				args.push(colorCode + 'm+' + module.exports.humanize(this.diff) + '\u001B[0m');
			} else {
				args[0] = getDate() + name + ' ' + args[0];
			}
		}

		function getDate() {
			if (exports.inspectOpts.hideDate) {
				return '';
			}
			return new Date().toISOString() + ' ';
		}

		/**
		 * Invokes `util.formatWithOptions()` with the specified arguments and writes to stderr.
		 */

		function log(...args) {
			return process.stderr.write(util.formatWithOptions(exports.inspectOpts, ...args) + '\n');
		}

		/**
		 * Save `namespaces`.
		 *
		 * @param {String} namespaces
		 * @api private
		 */
		function save(namespaces) {
			if (namespaces) {
				process.env.DEBUG = namespaces;
			} else {
				// If you set a process.env field to null or undefined, it gets cast to the
				// string 'null' or 'undefined'. Just delete instead.
				delete process.env.DEBUG;
			}
		}

		/**
		 * Load `namespaces`.
		 *
		 * @return {String} returns the previously persisted debug modes
		 * @api private
		 */

		function load() {
			return process.env.DEBUG;
		}

		/**
		 * Init logic for `debug` instances.
		 *
		 * Create a new `inspectOpts` object in case `useColors` is set
		 * differently for a particular `debug` instance.
		 */

		function init(debug) {
			debug.inspectOpts = {};

			const keys = Object.keys(exports.inspectOpts);
			for (let i = 0; i < keys.length; i++) {
				debug.inspectOpts[keys[i]] = exports.inspectOpts[keys[i]];
			}
		}

		module.exports = requireCommon()(exports);

		const {formatters} = module.exports;

		/**
		 * Map %o to `util.inspect()`, all on a single line.
		 */

		formatters.o = function (v) {
			this.inspectOpts.colors = this.useColors;
			return util.inspect(v, this.inspectOpts)
				.split('\n')
				.map(str => str.trim())
				.join(' ');
		};

		/**
		 * Map %O to `util.inspect()`, allowing multiple lines if needed.
		 */

		formatters.O = function (v) {
			this.inspectOpts.colors = this.useColors;
			return util.inspect(v, this.inspectOpts);
		};
} (node, nodeExports));
	return nodeExports;
}

/**
 * Detect Electron renderer / nwjs process, which is node, but we should
 * treat as a browser.
 */

(function (module) {
	if (typeof process === 'undefined' || process.type === 'renderer' || process.browser === true || process.__nwjs) {
		module.exports = requireBrowser();
	} else {
		module.exports = requireNode();
	}
} (src));

Object.defineProperty(debug$4, "__esModule", { value: true });
debug$4.genRedactedString = debug$4.getStringValue = debug$4.MAX_ARGUMENT_LENGTH = void 0;
const debug_1 = srcExports;
const MAX_ARGUMENT_LENGTH = 200;
debug$4.MAX_ARGUMENT_LENGTH = MAX_ARGUMENT_LENGTH;
const NAMESPACE_PREFIX = "ioredis";
/**
 * helper function that tried to get a string value for
 * arbitrary "debug" arg
 */
function getStringValue(v) {
    if (v === null) {
        return;
    }
    switch (typeof v) {
        case "boolean":
            return;
        case "number":
            return;
        case "object":
            if (Buffer.isBuffer(v)) {
                return v.toString("hex");
            }
            if (Array.isArray(v)) {
                return v.join(",");
            }
            try {
                return JSON.stringify(v);
            }
            catch (e) {
                return;
            }
        case "string":
            return v;
    }
}
debug$4.getStringValue = getStringValue;
/**
 * helper function that redacts a string representation of a "debug" arg
 */
function genRedactedString(str, maxLen) {
    const { length } = str;
    return length <= maxLen
        ? str
        : str.slice(0, maxLen) + ' ... <REDACTED full-length="' + length + '">';
}
debug$4.genRedactedString = genRedactedString;
/**
 * a wrapper for the `debug` module, used to generate
 * "debug functions" that trim the values in their output
 */
function genDebugFunction(namespace) {
    const fn = (0, debug_1.default)(`${NAMESPACE_PREFIX}:${namespace}`);
    function wrappedDebug(...args) {
        if (!fn.enabled) {
            return; // no-op
        }
        // we skip the first arg because that is the message
        for (let i = 1; i < args.length; i++) {
            const str = getStringValue(args[i]);
            if (typeof str === "string" && str.length > MAX_ARGUMENT_LENGTH) {
                args[i] = genRedactedString(str, MAX_ARGUMENT_LENGTH);
            }
        }
        return fn.apply(null, args);
    }
    Object.defineProperties(wrappedDebug, {
        namespace: {
            get() {
                return fn.namespace;
            },
        },
        enabled: {
            get() {
                return fn.enabled;
            },
        },
        destroy: {
            get() {
                return fn.destroy;
            },
        },
        log: {
            get() {
                return fn.log;
            },
            set(l) {
                fn.log = l;
            },
        },
    });
    return wrappedDebug;
}
debug$4.default = genDebugFunction;

var TLSProfiles$1 = {};

Object.defineProperty(TLSProfiles$1, "__esModule", { value: true });
/**
 * TLS settings for Redis Cloud. Updated on 2022-08-19.
 */
const RedisCloudCA = `-----BEGIN CERTIFICATE-----
MIIDTzCCAjegAwIBAgIJAKSVpiDswLcwMA0GCSqGSIb3DQEBBQUAMD4xFjAUBgNV
BAoMDUdhcmFudGlhIERhdGExJDAiBgNVBAMMG1NTTCBDZXJ0aWZpY2F0aW9uIEF1
dGhvcml0eTAeFw0xMzEwMDExMjE0NTVaFw0yMzA5MjkxMjE0NTVaMD4xFjAUBgNV
BAoMDUdhcmFudGlhIERhdGExJDAiBgNVBAMMG1NTTCBDZXJ0aWZpY2F0aW9uIEF1
dGhvcml0eTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBALZqkh/DczWP
JnxnHLQ7QL0T4B4CDKWBKCcisriGbA6ZePWVNo4hfKQC6JrzfR+081NeD6VcWUiz
rmd+jtPhIY4c+WVQYm5PKaN6DT1imYdxQw7aqO5j2KUCEh/cznpLxeSHoTxlR34E
QwF28Wl3eg2vc5ct8LjU3eozWVk3gb7alx9mSA2SgmuX5lEQawl++rSjsBStemY2
BDwOpAMXIrdEyP/cVn8mkvi/BDs5M5G+09j0gfhyCzRWMQ7Hn71u1eolRxwVxgi3
TMn+/vTaFSqxKjgck6zuAYjBRPaHe7qLxHNr1So/Mc9nPy+3wHebFwbIcnUojwbp
4nctkWbjb2cCAwEAAaNQME4wHQYDVR0OBBYEFP1whtcrydmW3ZJeuSoKZIKjze3w
MB8GA1UdIwQYMBaAFP1whtcrydmW3ZJeuSoKZIKjze3wMAwGA1UdEwQFMAMBAf8w
DQYJKoZIhvcNAQEFBQADggEBAG2erXhwRAa7+ZOBs0B6X57Hwyd1R4kfmXcs0rta
lbPpvgULSiB+TCbf3EbhJnHGyvdCY1tvlffLjdA7HJ0PCOn+YYLBA0pTU/dyvrN6
Su8NuS5yubnt9mb13nDGYo1rnt0YRfxN+8DM3fXIVr038A30UlPX2Ou1ExFJT0MZ
uFKY6ZvLdI6/1cbgmguMlAhM+DhKyV6Sr5699LM3zqeI816pZmlREETYkGr91q7k
BpXJu/dtHaGxg1ZGu6w/PCsYGUcECWENYD4VQPd8N32JjOfu6vEgoEAwfPP+3oGp
Z4m3ewACcWOAenqflb+cQYC4PsF7qbXDmRaWrbKntOlZ3n0=
-----END CERTIFICATE-----
-----BEGIN CERTIFICATE-----
MIIGMTCCBBmgAwIBAgICEAAwDQYJKoZIhvcNAQELBQAwajELMAkGA1UEBhMCVVMx
CzAJBgNVBAgMAkNBMQswCQYDVQQHDAJDQTESMBAGA1UECgwJUmVkaXNMYWJzMS0w
KwYDVQQDDCRSZWRpc0xhYnMgUm9vdCBDZXJ0aWZpY2F0ZSBBdXRob3JpdHkwHhcN
MTgwMjI1MTUzNzM3WhcNMjgwMjIzMTUzNzM3WjBfMQswCQYDVQQGEwJVUzELMAkG
A1UECAwCQ0ExEjAQBgNVBAoMCVJlZGlzTGFiczEvMC0GA1UEAwwmUkNQIEludGVy
bWVkaWF0ZSBDZXJ0aWZpY2F0ZSBBdXRob3JpdHkwggIiMA0GCSqGSIb3DQEBAQUA
A4ICDwAwggIKAoICAQDf9dqbxc8Bq7Ctq9rWcxrGNKKHivqLAFpPq02yLPx6fsOv
Tq7GsDChAYBBc4v7Y2Ap9RD5Vs3dIhEANcnolf27QwrG9RMnnvzk8pCvp1o6zSU4
VuOE1W66/O1/7e2rVxyrnTcP7UgK43zNIXu7+tiAqWsO92uSnuMoGPGpeaUm1jym
hjWKtkAwDFSqvHY+XL5qDVBEjeUe+WHkYUg40cAXjusAqgm2hZt29c2wnVrxW25W
P0meNlzHGFdA2AC5z54iRiqj57dTfBTkHoBczQxcyw6hhzxZQ4e5I5zOKjXXEhZN
r0tA3YC14CTabKRus/JmZieyZzRgEy2oti64tmLYTqSlAD78pRL40VNoaSYetXLw
hhNsXCHgWaY6d5bLOc/aIQMAV5oLvZQKvuXAF1IDmhPA+bZbpWipp0zagf1P1H3s
UzsMdn2KM0ejzgotbtNlj5TcrVwpmvE3ktvUAuA+hi3FkVx1US+2Gsp5x4YOzJ7u
P1WPk6ShF0JgnJH2ILdj6kttTWwFzH17keSFICWDfH/+kM+k7Y1v3EXMQXE7y0T9
MjvJskz6d/nv+sQhY04xt64xFMGTnZjlJMzfQNi7zWFLTZnDD0lPowq7l3YiPoTT
t5Xky83lu0KZsZBo0WlWaDG00gLVdtRgVbcuSWxpi5BdLb1kRab66JptWjxwXQID
AQABo4HrMIHoMDoGA1UdHwQzMDEwL6AtoCuGKWh0dHBzOi8vcmwtY2Etc2VydmVy
LnJlZGlzbGFicy5jb20vdjEvY3JsMEYGCCsGAQUFBwEBBDowODA2BggrBgEFBQcw
AYYqaHR0cHM6Ly9ybC1jYS1zZXJ2ZXIucmVkaXNsYWJzLmNvbS92MS9vY3NwMB0G
A1UdDgQWBBQHar5OKvQUpP2qWt6mckzToeCOHDAfBgNVHSMEGDAWgBQi42wH6hM4
L2sujEvLM0/u8lRXTzASBgNVHRMBAf8ECDAGAQH/AgEAMA4GA1UdDwEB/wQEAwIB
hjANBgkqhkiG9w0BAQsFAAOCAgEAirEn/iTsAKyhd+pu2W3Z5NjCko4NPU0EYUbr
AP7+POK2rzjIrJO3nFYQ/LLuC7KCXG+2qwan2SAOGmqWst13Y+WHp44Kae0kaChW
vcYLXXSoGQGC8QuFSNUdaeg3RbMDYFT04dOkqufeWVccoHVxyTSg9eD8LZuHn5jw
7QDLiEECBmIJHk5Eeo2TAZrx4Yx6ufSUX5HeVjlAzqwtAqdt99uCJ/EL8bgpWbe+
XoSpvUv0SEC1I1dCAhCKAvRlIOA6VBcmzg5Am12KzkqTul12/VEFIgzqu0Zy2Jbc
AUPrYVu/+tOGXQaijy7YgwH8P8n3s7ZeUa1VABJHcxrxYduDDJBLZi+MjheUDaZ1
jQRHYevI2tlqeSBqdPKG4zBY5lS0GiAlmuze5oENt0P3XboHoZPHiqcK3VECgTVh
/BkJcuudETSJcZDmQ8YfoKfBzRQNg2sv/hwvUv73Ss51Sco8GEt2lD8uEdib1Q6z
zDT5lXJowSzOD5ZA9OGDjnSRL+2riNtKWKEqvtEG3VBJoBzu9GoxbAc7wIZLxmli
iF5a/Zf5X+UXD3s4TMmy6C4QZJpAA2egsSQCnraWO2ULhh7iXMysSkF/nzVfZn43
iqpaB8++9a37hWq14ZmOv0TJIDz//b2+KC4VFXWQ5W5QC6whsjT+OlG4p5ZYG0jo
616pxqo=
-----END CERTIFICATE-----
-----BEGIN CERTIFICATE-----
MIIFujCCA6KgAwIBAgIJAJ1aTT1lu2ScMA0GCSqGSIb3DQEBCwUAMGoxCzAJBgNV
BAYTAlVTMQswCQYDVQQIDAJDQTELMAkGA1UEBwwCQ0ExEjAQBgNVBAoMCVJlZGlz
TGFiczEtMCsGA1UEAwwkUmVkaXNMYWJzIFJvb3QgQ2VydGlmaWNhdGUgQXV0aG9y
aXR5MB4XDTE4MDIyNTE1MjA0MloXDTM4MDIyMDE1MjA0MlowajELMAkGA1UEBhMC
VVMxCzAJBgNVBAgMAkNBMQswCQYDVQQHDAJDQTESMBAGA1UECgwJUmVkaXNMYWJz
MS0wKwYDVQQDDCRSZWRpc0xhYnMgUm9vdCBDZXJ0aWZpY2F0ZSBBdXRob3JpdHkw
ggIiMA0GCSqGSIb3DQEBAQUAA4ICDwAwggIKAoICAQDLEjXy7YrbN5Waau5cd6g1
G5C2tMmeTpZ0duFAPxNU4oE3RHS5gGiok346fUXuUxbZ6QkuzeN2/2Z+RmRcJhQY
Dm0ZgdG4x59An1TJfnzKKoWj8ISmoHS/TGNBdFzXV7FYNLBuqZouqePI6ReC6Qhl
pp45huV32Q3a6IDrrvx7Wo5ZczEQeFNbCeCOQYNDdTmCyEkHqc2AGo8eoIlSTutT
ULOC7R5gzJVTS0e1hesQ7jmqHjbO+VQS1NAL4/5K6cuTEqUl+XhVhPdLWBXJQ5ag
54qhX4v+ojLzeU1R/Vc6NjMvVtptWY6JihpgplprN0Yh2556ewcXMeturcKgXfGJ
xeYzsjzXerEjrVocX5V8BNrg64NlifzTMKNOOv4fVZszq1SIHR8F9ROrqiOdh8iC
JpUbLpXH9hWCSEO6VRMB2xJoKu3cgl63kF30s77x7wLFMEHiwsQRKxooE1UhgS9K
2sO4TlQ1eWUvFvHSTVDQDlGQ6zu4qjbOpb3Q8bQwoK+ai2alkXVR4Ltxe9QlgYK3
StsnPhruzZGA0wbXdpw0bnM+YdlEm5ffSTpNIfgHeaa7Dtb801FtA71ZlH7A6TaI
SIQuUST9EKmv7xrJyx0W1pGoPOLw5T029aTjnICSLdtV9bLwysrLhIYG5bnPq78B
cS+jZHFGzD7PUVGQD01nOQIDAQABo2MwYTAdBgNVHQ4EFgQUIuNsB+oTOC9rLoxL
yzNP7vJUV08wHwYDVR0jBBgwFoAUIuNsB+oTOC9rLoxLyzNP7vJUV08wDwYDVR0T
AQH/BAUwAwEB/zAOBgNVHQ8BAf8EBAMCAYYwDQYJKoZIhvcNAQELBQADggIBAHfg
z5pMNUAKdMzK1aS1EDdK9yKz4qicILz5czSLj1mC7HKDRy8cVADUxEICis++CsCu
rYOvyCVergHQLREcxPq4rc5Nq1uj6J6649NEeh4WazOOjL4ZfQ1jVznMbGy+fJm3
3Hoelv6jWRG9iqeJZja7/1s6YC6bWymI/OY1e4wUKeNHAo+Vger7MlHV+RuabaX+
hSJ8bJAM59NCM7AgMTQpJCncrcdLeceYniGy5Q/qt2b5mJkQVkIdy4TPGGB+AXDJ
D0q3I/JDRkDUFNFdeW0js7fHdsvCR7O3tJy5zIgEV/o/BCkmJVtuwPYOrw/yOlKj
TY/U7ATAx9VFF6/vYEOMYSmrZlFX+98L6nJtwDqfLB5VTltqZ4H/KBxGE3IRSt9l
FXy40U+LnXzhhW+7VBAvyYX8GEXhHkKU8Gqk1xitrqfBXY74xKgyUSTolFSfFVgj
mcM/X4K45bka+qpkj7Kfv/8D4j6aZekwhN2ly6hhC1SmQ8qjMjpG/mrWOSSHZFmf
ybu9iD2AYHeIOkshIl6xYIa++Q/00/vs46IzAbQyriOi0XxlSMMVtPx0Q3isp+ji
n8Mq9eOuxYOEQ4of8twUkUDd528iwGtEdwf0Q01UyT84S62N8AySl1ZBKXJz6W4F
UhWfa/HQYOAPDdEjNgnVwLI23b8t0TozyCWw7q8h
-----END CERTIFICATE-----

-----BEGIN CERTIFICATE-----
MIIEjzCCA3egAwIBAgIQe55B/ALCKJDZtdNT8kD6hTANBgkqhkiG9w0BAQsFADBM
MSAwHgYDVQQLExdHbG9iYWxTaWduIFJvb3QgQ0EgLSBSMzETMBEGA1UEChMKR2xv
YmFsU2lnbjETMBEGA1UEAxMKR2xvYmFsU2lnbjAeFw0yMjAxMjYxMjAwMDBaFw0y
NTAxMjYwMDAwMDBaMFgxCzAJBgNVBAYTAkJFMRkwFwYDVQQKExBHbG9iYWxTaWdu
IG52LXNhMS4wLAYDVQQDEyVHbG9iYWxTaWduIEF0bGFzIFIzIE9WIFRMUyBDQSAy
MDIyIFEyMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAmGmg1LW9b7Lf
8zDD83yBDTEkt+FOxKJZqF4veWc5KZsQj9HfnUS2e5nj/E+JImlGPsQuoiosLuXD
BVBNAMcUFa11buFMGMeEMwiTmCXoXRrXQmH0qjpOfKgYc5gHG3BsRGaRrf7VR4eg
ofNMG9wUBw4/g/TT7+bQJdA4NfE7Y4d5gEryZiBGB/swaX6Jp/8MF4TgUmOWmalK
dZCKyb4sPGQFRTtElk67F7vU+wdGcrcOx1tDcIB0ncjLPMnaFicagl+daWGsKqTh
counQb6QJtYHa91KvCfKWocMxQ7OIbB5UARLPmC4CJ1/f8YFm35ebfzAeULYdGXu
jE9CLor0OwIDAQABo4IBXzCCAVswDgYDVR0PAQH/BAQDAgGGMB0GA1UdJQQWMBQG
CCsGAQUFBwMBBggrBgEFBQcDAjASBgNVHRMBAf8ECDAGAQH/AgEAMB0GA1UdDgQW
BBSH5Zq7a7B/t95GfJWkDBpA8HHqdjAfBgNVHSMEGDAWgBSP8Et/qC5FJK5NUPpj
move4t0bvDB7BggrBgEFBQcBAQRvMG0wLgYIKwYBBQUHMAGGImh0dHA6Ly9vY3Nw
Mi5nbG9iYWxzaWduLmNvbS9yb290cjMwOwYIKwYBBQUHMAKGL2h0dHA6Ly9zZWN1
cmUuZ2xvYmFsc2lnbi5jb20vY2FjZXJ0L3Jvb3QtcjMuY3J0MDYGA1UdHwQvMC0w
K6ApoCeGJWh0dHA6Ly9jcmwuZ2xvYmFsc2lnbi5jb20vcm9vdC1yMy5jcmwwIQYD
VR0gBBowGDAIBgZngQwBAgIwDAYKKwYBBAGgMgoBAjANBgkqhkiG9w0BAQsFAAOC
AQEAKRic9/f+nmhQU/wz04APZLjgG5OgsuUOyUEZjKVhNGDwxGTvKhyXGGAMW2B/
3bRi+aElpXwoxu3pL6fkElbX3B0BeS5LoDtxkyiVEBMZ8m+sXbocwlPyxrPbX6mY
0rVIvnuUeBH8X0L5IwfpNVvKnBIilTbcebfHyXkPezGwz7E1yhUULjJFm2bt0SdX
y+4X/WeiiYIv+fTVgZZgl+/2MKIsu/qdBJc3f3TvJ8nz+Eax1zgZmww+RSQWeOj3
15Iw6Z5FX+NwzY/Ab+9PosR5UosSeq+9HhtaxZttXG1nVh+avYPGYddWmiMT90J5
ZgKnO/Fx2hBgTxhOTMYaD312kg==
-----END CERTIFICATE-----

-----BEGIN CERTIFICATE-----
MIIDXzCCAkegAwIBAgILBAAAAAABIVhTCKIwDQYJKoZIhvcNAQELBQAwTDEgMB4G
A1UECxMXR2xvYmFsU2lnbiBSb290IENBIC0gUjMxEzARBgNVBAoTCkdsb2JhbFNp
Z24xEzARBgNVBAMTCkdsb2JhbFNpZ24wHhcNMDkwMzE4MTAwMDAwWhcNMjkwMzE4
MTAwMDAwWjBMMSAwHgYDVQQLExdHbG9iYWxTaWduIFJvb3QgQ0EgLSBSMzETMBEG
A1UEChMKR2xvYmFsU2lnbjETMBEGA1UEAxMKR2xvYmFsU2lnbjCCASIwDQYJKoZI
hvcNAQEBBQADggEPADCCAQoCggEBAMwldpB5BngiFvXAg7aEyiie/QV2EcWtiHL8
RgJDx7KKnQRfJMsuS+FggkbhUqsMgUdwbN1k0ev1LKMPgj0MK66X17YUhhB5uzsT
gHeMCOFJ0mpiLx9e+pZo34knlTifBtc+ycsmWQ1z3rDI6SYOgxXG71uL0gRgykmm
KPZpO/bLyCiR5Z2KYVc3rHQU3HTgOu5yLy6c+9C7v/U9AOEGM+iCK65TpjoWc4zd
QQ4gOsC0p6Hpsk+QLjJg6VfLuQSSaGjlOCZgdbKfd/+RFO+uIEn8rUAVSNECMWEZ
XriX7613t2Saer9fwRPvm2L7DWzgVGkWqQPabumDk3F2xmmFghcCAwEAAaNCMEAw
DgYDVR0PAQH/BAQDAgEGMA8GA1UdEwEB/wQFMAMBAf8wHQYDVR0OBBYEFI/wS3+o
LkUkrk1Q+mOai97i3Ru8MA0GCSqGSIb3DQEBCwUAA4IBAQBLQNvAUKr+yAzv95ZU
RUm7lgAJQayzE4aGKAczymvmdLm6AC2upArT9fHxD4q/c2dKg8dEe3jgr25sbwMp
jjM5RcOO5LlXbKr8EpbsU8Yt5CRsuZRj+9xTaGdWPoO4zzUhw8lo/s7awlOqzJCK
6fBdRoyV3XpYKBovHd7NADdBj+1EbddTKJd+82cEHhXXipa0095MJ6RMG3NzdvQX
mcIfeg7jLQitChws/zyrVQ4PkX4268NXSb7hLi18YIvDQVETI53O9zJrlAGomecs
Mx86OyXShkDOOyyGeMlhLxS67ttVb9+E7gUJTb0o2HLO02JQZR7rkpeDMdmztcpH
WD9f
-----END CERTIFICATE-----`;
const TLSProfiles = {
    RedisCloudFixed: { ca: RedisCloudCA },
    RedisCloudFlexible: { ca: RedisCloudCA },
};
TLSProfiles$1.default = TLSProfiles;

(function (exports) {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.noop = exports.defaults = exports.Debug = exports.zipMap = exports.CONNECTION_CLOSED_ERROR_MSG = exports.shuffle = exports.sample = exports.resolveTLSProfile = exports.parseURL = exports.optimizeErrorStack = exports.toArg = exports.convertMapToArray = exports.convertObjectToArray = exports.timeout = exports.packObject = exports.isInt = exports.wrapMultiResult = exports.convertBufferToString = void 0;
	const url_1 = require$$0$4;
	const lodash_1 = lodash;
	Object.defineProperty(exports, "defaults", { enumerable: true, get: function () { return lodash_1.defaults; } });
	Object.defineProperty(exports, "noop", { enumerable: true, get: function () { return lodash_1.noop; } });
	const debug_1 = debug$4;
	exports.Debug = debug_1.default;
	const TLSProfiles_1 = TLSProfiles$1;
	/**
	 * Convert a buffer to string, supports buffer array
	 *
	 * @example
	 * ```js
	 * const input = [Buffer.from('foo'), [Buffer.from('bar')]]
	 * const res = convertBufferToString(input, 'utf8')
	 * expect(res).to.eql(['foo', ['bar']])
	 * ```
	 */
	function convertBufferToString(value, encoding) {
	    if (value instanceof Buffer) {
	        return value.toString(encoding);
	    }
	    if (Array.isArray(value)) {
	        const length = value.length;
	        const res = Array(length);
	        for (let i = 0; i < length; ++i) {
	            res[i] =
	                value[i] instanceof Buffer && encoding === "utf8"
	                    ? value[i].toString()
	                    : convertBufferToString(value[i], encoding);
	        }
	        return res;
	    }
	    return value;
	}
	exports.convertBufferToString = convertBufferToString;
	/**
	 * Convert a list of results to node-style
	 *
	 * @example
	 * ```js
	 * const input = ['a', 'b', new Error('c'), 'd']
	 * const output = exports.wrapMultiResult(input)
	 * expect(output).to.eql([[null, 'a'], [null, 'b'], [new Error('c')], [null, 'd'])
	 * ```
	 */
	function wrapMultiResult(arr) {
	    // When using WATCH/EXEC transactions, the EXEC will return
	    // a null instead of an array
	    if (!arr) {
	        return null;
	    }
	    const result = [];
	    const length = arr.length;
	    for (let i = 0; i < length; ++i) {
	        const item = arr[i];
	        if (item instanceof Error) {
	            result.push([item]);
	        }
	        else {
	            result.push([null, item]);
	        }
	    }
	    return result;
	}
	exports.wrapMultiResult = wrapMultiResult;
	/**
	 * Detect if the argument is a int
	 * @example
	 * ```js
	 * > isInt('123')
	 * true
	 * > isInt('123.3')
	 * false
	 * > isInt('1x')
	 * false
	 * > isInt(123)
	 * true
	 * > isInt(true)
	 * false
	 * ```
	 */
	function isInt(value) {
	    const x = parseFloat(value);
	    return !isNaN(value) && (x | 0) === x;
	}
	exports.isInt = isInt;
	/**
	 * Pack an array to an Object
	 *
	 * @example
	 * ```js
	 * > packObject(['a', 'b', 'c', 'd'])
	 * { a: 'b', c: 'd' }
	 * ```
	 */
	function packObject(array) {
	    const result = {};
	    const length = array.length;
	    for (let i = 1; i < length; i += 2) {
	        result[array[i - 1]] = array[i];
	    }
	    return result;
	}
	exports.packObject = packObject;
	/**
	 * Return a callback with timeout
	 */
	function timeout(callback, timeout) {
	    let timer = null;
	    const run = function () {
	        if (timer) {
	            clearTimeout(timer);
	            timer = null;
	            callback.apply(this, arguments);
	        }
	    };
	    timer = setTimeout(run, timeout, new Error("timeout"));
	    return run;
	}
	exports.timeout = timeout;
	/**
	 * Convert an object to an array
	 * @example
	 * ```js
	 * > convertObjectToArray({ a: '1' })
	 * ['a', '1']
	 * ```
	 */
	function convertObjectToArray(obj) {
	    const result = [];
	    const keys = Object.keys(obj); // Object.entries requires node 7+
	    for (let i = 0, l = keys.length; i < l; i++) {
	        result.push(keys[i], obj[keys[i]]);
	    }
	    return result;
	}
	exports.convertObjectToArray = convertObjectToArray;
	/**
	 * Convert a map to an array
	 * @example
	 * ```js
	 * > convertMapToArray(new Map([[1, '2']]))
	 * [1, '2']
	 * ```
	 */
	function convertMapToArray(map) {
	    const result = [];
	    let pos = 0;
	    map.forEach(function (value, key) {
	        result[pos] = key;
	        result[pos + 1] = value;
	        pos += 2;
	    });
	    return result;
	}
	exports.convertMapToArray = convertMapToArray;
	/**
	 * Convert a non-string arg to a string
	 */
	function toArg(arg) {
	    if (arg === null || typeof arg === "undefined") {
	        return "";
	    }
	    return String(arg);
	}
	exports.toArg = toArg;
	/**
	 * Optimize error stack
	 *
	 * @param error actually error
	 * @param friendlyStack the stack that more meaningful
	 * @param filterPath only show stacks with the specified path
	 */
	function optimizeErrorStack(error, friendlyStack, filterPath) {
	    const stacks = friendlyStack.split("\n");
	    let lines = "";
	    let i;
	    for (i = 1; i < stacks.length; ++i) {
	        if (stacks[i].indexOf(filterPath) === -1) {
	            break;
	        }
	    }
	    for (let j = i; j < stacks.length; ++j) {
	        lines += "\n" + stacks[j];
	    }
	    if (error.stack) {
	        const pos = error.stack.indexOf("\n");
	        error.stack = error.stack.slice(0, pos) + lines;
	    }
	    return error;
	}
	exports.optimizeErrorStack = optimizeErrorStack;
	/**
	 * Parse the redis protocol url
	 */
	function parseURL(url) {
	    if (isInt(url)) {
	        return { port: url };
	    }
	    let parsed = (0, url_1.parse)(url, true, true);
	    if (!parsed.slashes && url[0] !== "/") {
	        url = "//" + url;
	        parsed = (0, url_1.parse)(url, true, true);
	    }
	    const options = parsed.query || {};
	    const result = {};
	    if (parsed.auth) {
	        const index = parsed.auth.indexOf(":");
	        result.username = index === -1 ? parsed.auth : parsed.auth.slice(0, index);
	        result.password = index === -1 ? "" : parsed.auth.slice(index + 1);
	    }
	    if (parsed.pathname) {
	        if (parsed.protocol === "redis:" || parsed.protocol === "rediss:") {
	            if (parsed.pathname.length > 1) {
	                result.db = parsed.pathname.slice(1);
	            }
	        }
	        else {
	            result.path = parsed.pathname;
	        }
	    }
	    if (parsed.host) {
	        result.host = parsed.hostname;
	    }
	    if (parsed.port) {
	        result.port = parsed.port;
	    }
	    if (typeof options.family === "string") {
	        const intFamily = Number.parseInt(options.family, 10);
	        if (!Number.isNaN(intFamily)) {
	            result.family = intFamily;
	        }
	    }
	    (0, lodash_1.defaults)(result, options);
	    return result;
	}
	exports.parseURL = parseURL;
	/**
	 * Resolve TLS profile shortcut in connection options
	 */
	function resolveTLSProfile(options) {
	    let tls = options === null || options === void 0 ? void 0 : options.tls;
	    if (typeof tls === "string")
	        tls = { profile: tls };
	    const profile = TLSProfiles_1.default[tls === null || tls === void 0 ? void 0 : tls.profile];
	    if (profile) {
	        tls = Object.assign({}, profile, tls);
	        delete tls.profile;
	        options = Object.assign({}, options, { tls });
	    }
	    return options;
	}
	exports.resolveTLSProfile = resolveTLSProfile;
	/**
	 * Get a random element from `array`
	 */
	function sample(array, from = 0) {
	    const length = array.length;
	    if (from >= length) {
	        return null;
	    }
	    return array[from + Math.floor(Math.random() * (length - from))];
	}
	exports.sample = sample;
	/**
	 * Shuffle the array using the Fisher-Yates Shuffle.
	 * This method will mutate the original array.
	 */
	function shuffle(array) {
	    let counter = array.length;
	    // While there are elements in the array
	    while (counter > 0) {
	        // Pick a random index
	        const index = Math.floor(Math.random() * counter);
	        // Decrease counter by 1
	        counter--;
	        // And swap the last element with it
	        [array[counter], array[index]] = [array[index], array[counter]];
	    }
	    return array;
	}
	exports.shuffle = shuffle;
	/**
	 * Error message for connection being disconnected
	 */
	exports.CONNECTION_CLOSED_ERROR_MSG = "Connection is closed.";
	function zipMap(keys, values) {
	    const map = new Map();
	    keys.forEach((key, index) => {
	        map.set(key, values[index]);
	    });
	    return map;
	}
	exports.zipMap = zipMap;
} (utils));

Object.defineProperty(Command$1, "__esModule", { value: true });
const commands_1$2 = built$1;
const calculateSlot$1 = libExports;
const standard_as_callback_1$3 = built;
const utils_1$8 = utils;
/**
 * Command instance
 *
 * It's rare that you need to create a Command instance yourself.
 *
 * ```js
 * var infoCommand = new Command('info', null, function (err, result) {
 *   console.log('result', result);
 * });
 *
 * redis.sendCommand(infoCommand);
 *
 * // When no callback provided, Command instance will have a `promise` property,
 * // which will resolve/reject with the result of the command.
 * var getCommand = new Command('get', ['foo']);
 * getCommand.promise.then(function (result) {
 *   console.log('result', result);
 * });
 * ```
 */
class Command {
    /**
     * Creates an instance of Command.
     * @param name Command name
     * @param args An array of command arguments
     * @param options
     * @param callback The callback that handles the response.
     * If omit, the response will be handled via Promise
     */
    constructor(name, args = [], options = {}, callback) {
        this.name = name;
        this.inTransaction = false;
        this.isResolved = false;
        this.transformed = false;
        this.replyEncoding = options.replyEncoding;
        this.errorStack = options.errorStack;
        this.args = args.flat();
        this.callback = callback;
        this.initPromise();
        if (options.keyPrefix) {
            // @ts-expect-error
            const isBufferKeyPrefix = options.keyPrefix instanceof Buffer;
            // @ts-expect-error
            let keyPrefixBuffer = isBufferKeyPrefix
                ? options.keyPrefix
                : null;
            this._iterateKeys((key) => {
                if (key instanceof Buffer) {
                    if (keyPrefixBuffer === null) {
                        keyPrefixBuffer = Buffer.from(options.keyPrefix);
                    }
                    return Buffer.concat([keyPrefixBuffer, key]);
                }
                else if (isBufferKeyPrefix) {
                    // @ts-expect-error
                    return Buffer.concat([options.keyPrefix, Buffer.from(String(key))]);
                }
                return options.keyPrefix + key;
            });
        }
        if (options.readOnly) {
            this.isReadOnly = true;
        }
    }
    /**
     * Check whether the command has the flag
     */
    static checkFlag(flagName, commandName) {
        return !!this.getFlagMap()[flagName][commandName];
    }
    static setArgumentTransformer(name, func) {
        this._transformer.argument[name] = func;
    }
    static setReplyTransformer(name, func) {
        this._transformer.reply[name] = func;
    }
    static getFlagMap() {
        if (!this.flagMap) {
            this.flagMap = Object.keys(Command.FLAGS).reduce((map, flagName) => {
                map[flagName] = {};
                Command.FLAGS[flagName].forEach((commandName) => {
                    map[flagName][commandName] = true;
                });
                return map;
            }, {});
        }
        return this.flagMap;
    }
    getSlot() {
        if (typeof this.slot === "undefined") {
            const key = this.getKeys()[0];
            this.slot = key == null ? null : calculateSlot$1(key);
        }
        return this.slot;
    }
    getKeys() {
        return this._iterateKeys();
    }
    /**
     * Convert command to writable buffer or string
     */
    toWritable(_socket) {
        let result;
        const commandStr = "*" +
            (this.args.length + 1) +
            "\r\n$" +
            Buffer.byteLength(this.name) +
            "\r\n" +
            this.name +
            "\r\n";
        if (this.bufferMode) {
            const buffers = new MixedBuffers();
            buffers.push(commandStr);
            for (let i = 0; i < this.args.length; ++i) {
                const arg = this.args[i];
                if (arg instanceof Buffer) {
                    if (arg.length === 0) {
                        buffers.push("$0\r\n\r\n");
                    }
                    else {
                        buffers.push("$" + arg.length + "\r\n");
                        buffers.push(arg);
                        buffers.push("\r\n");
                    }
                }
                else {
                    buffers.push("$" +
                        Buffer.byteLength(arg) +
                        "\r\n" +
                        arg +
                        "\r\n");
                }
            }
            result = buffers.toBuffer();
        }
        else {
            result = commandStr;
            for (let i = 0; i < this.args.length; ++i) {
                const arg = this.args[i];
                result +=
                    "$" +
                        Buffer.byteLength(arg) +
                        "\r\n" +
                        arg +
                        "\r\n";
            }
        }
        return result;
    }
    stringifyArguments() {
        for (let i = 0; i < this.args.length; ++i) {
            const arg = this.args[i];
            if (typeof arg === "string") ;
            else if (arg instanceof Buffer) {
                this.bufferMode = true;
            }
            else {
                this.args[i] = (0, utils_1$8.toArg)(arg);
            }
        }
    }
    /**
     * Convert buffer/buffer[] to string/string[],
     * and apply reply transformer.
     */
    transformReply(result) {
        if (this.replyEncoding) {
            result = (0, utils_1$8.convertBufferToString)(result, this.replyEncoding);
        }
        const transformer = Command._transformer.reply[this.name];
        if (transformer) {
            result = transformer(result);
        }
        return result;
    }
    /**
     * Set the wait time before terminating the attempt to execute a command
     * and generating an error.
     */
    setTimeout(ms) {
        if (!this._commandTimeoutTimer) {
            this._commandTimeoutTimer = setTimeout(() => {
                if (!this.isResolved) {
                    this.reject(new Error("Command timed out"));
                }
            }, ms);
        }
    }
    initPromise() {
        const promise = new Promise((resolve, reject) => {
            if (!this.transformed) {
                this.transformed = true;
                const transformer = Command._transformer.argument[this.name];
                if (transformer) {
                    this.args = transformer(this.args);
                }
                this.stringifyArguments();
            }
            this.resolve = this._convertValue(resolve);
            if (this.errorStack) {
                this.reject = (err) => {
                    reject((0, utils_1$8.optimizeErrorStack)(err, this.errorStack.stack, __dirname));
                };
            }
            else {
                this.reject = reject;
            }
        });
        this.promise = (0, standard_as_callback_1$3.default)(promise, this.callback);
    }
    /**
     * Iterate through the command arguments that are considered keys.
     */
    _iterateKeys(transform = (key) => key) {
        if (typeof this.keys === "undefined") {
            this.keys = [];
            if ((0, commands_1$2.exists)(this.name)) {
                // @ts-expect-error
                const keyIndexes = (0, commands_1$2.getKeyIndexes)(this.name, this.args);
                for (const index of keyIndexes) {
                    this.args[index] = transform(this.args[index]);
                    this.keys.push(this.args[index]);
                }
            }
        }
        return this.keys;
    }
    /**
     * Convert the value from buffer to the target encoding.
     */
    _convertValue(resolve) {
        return (value) => {
            try {
                const existingTimer = this._commandTimeoutTimer;
                if (existingTimer) {
                    clearTimeout(existingTimer);
                    delete this._commandTimeoutTimer;
                }
                resolve(this.transformReply(value));
                this.isResolved = true;
            }
            catch (err) {
                this.reject(err);
            }
            return this.promise;
        };
    }
}
Command$1.default = Command;
Command.FLAGS = {
    VALID_IN_SUBSCRIBER_MODE: [
        "subscribe",
        "psubscribe",
        "unsubscribe",
        "punsubscribe",
        "ssubscribe",
        "sunsubscribe",
        "ping",
        "quit",
    ],
    VALID_IN_MONITOR_MODE: ["monitor", "auth"],
    ENTER_SUBSCRIBER_MODE: ["subscribe", "psubscribe", "ssubscribe"],
    EXIT_SUBSCRIBER_MODE: ["unsubscribe", "punsubscribe", "sunsubscribe"],
    WILL_DISCONNECT: ["quit"],
};
Command._transformer = {
    argument: {},
    reply: {},
};
const msetArgumentTransformer = function (args) {
    if (args.length === 1) {
        if (args[0] instanceof Map) {
            return (0, utils_1$8.convertMapToArray)(args[0]);
        }
        if (typeof args[0] === "object" && args[0] !== null) {
            return (0, utils_1$8.convertObjectToArray)(args[0]);
        }
    }
    return args;
};
const hsetArgumentTransformer = function (args) {
    if (args.length === 2) {
        if (args[1] instanceof Map) {
            return [args[0]].concat((0, utils_1$8.convertMapToArray)(args[1]));
        }
        if (typeof args[1] === "object" && args[1] !== null) {
            return [args[0]].concat((0, utils_1$8.convertObjectToArray)(args[1]));
        }
    }
    return args;
};
Command.setArgumentTransformer("mset", msetArgumentTransformer);
Command.setArgumentTransformer("msetnx", msetArgumentTransformer);
Command.setArgumentTransformer("hset", hsetArgumentTransformer);
Command.setArgumentTransformer("hmset", hsetArgumentTransformer);
Command.setReplyTransformer("hgetall", function (result) {
    if (Array.isArray(result)) {
        const obj = {};
        for (let i = 0; i < result.length; i += 2) {
            const key = result[i];
            const value = result[i + 1];
            if (key in obj) {
                // can only be truthy if the property is special somehow, like '__proto__' or 'constructor'
                // https://github.com/luin/ioredis/issues/1267
                Object.defineProperty(obj, key, {
                    value,
                    configurable: true,
                    enumerable: true,
                    writable: true,
                });
            }
            else {
                obj[key] = value;
            }
        }
        return obj;
    }
    return result;
});
class MixedBuffers {
    constructor() {
        this.length = 0;
        this.items = [];
    }
    push(x) {
        this.length += Buffer.byteLength(x);
        this.items.push(x);
    }
    toBuffer() {
        const result = Buffer.allocUnsafe(this.length);
        let offset = 0;
        for (const item of this.items) {
            const length = Buffer.byteLength(item);
            Buffer.isBuffer(item)
                ? item.copy(result, offset)
                : result.write(item, offset, length);
            offset += length;
        }
        return result;
    }
}

var ClusterAllFailedError$1 = {};

Object.defineProperty(ClusterAllFailedError$1, "__esModule", { value: true });
const redis_errors_1$1 = redisErrors;
class ClusterAllFailedError extends redis_errors_1$1.RedisError {
    constructor(message, lastNodeError) {
        super(message);
        this.lastNodeError = lastNodeError;
        Error.captureStackTrace(this, this.constructor);
    }
    get name() {
        return this.constructor.name;
    }
}
ClusterAllFailedError$1.default = ClusterAllFailedError;
ClusterAllFailedError.defaultMessage = "Failed to refresh slots cache.";

var ScanStream$1 = {};

Object.defineProperty(ScanStream$1, "__esModule", { value: true });
const stream_1 = require$$0$5;
/**
 * Convenient class to convert the process of scanning keys to a readable stream.
 */
class ScanStream extends stream_1.Readable {
    constructor(opt) {
        super(opt);
        this.opt = opt;
        this._redisCursor = "0";
        this._redisDrained = false;
    }
    _read() {
        if (this._redisDrained) {
            this.push(null);
            return;
        }
        const args = [this._redisCursor];
        if (this.opt.key) {
            args.unshift(this.opt.key);
        }
        if (this.opt.match) {
            args.push("MATCH", this.opt.match);
        }
        if (this.opt.type) {
            args.push("TYPE", this.opt.type);
        }
        if (this.opt.count) {
            args.push("COUNT", String(this.opt.count));
        }
        this.opt.redis[this.opt.command](args, (err, res) => {
            if (err) {
                this.emit("error", err);
                return;
            }
            this._redisCursor = res[0] instanceof Buffer ? res[0].toString() : res[0];
            if (this._redisCursor === "0") {
                this._redisDrained = true;
            }
            this.push(res[1]);
        });
    }
    close() {
        this._redisDrained = true;
    }
}
ScanStream$1.default = ScanStream;

var transaction = {};

var Pipeline$1 = {};

var Commander$1 = {};

var autoPipelining = {};

(function (exports) {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.executeWithAutoPipelining = exports.getFirstValueInFlattenedArray = exports.shouldUseAutoPipelining = exports.notAllowedAutoPipelineCommands = exports.kCallbacks = exports.kExec = void 0;
	const lodash_1 = lodash;
	const calculateSlot = libExports;
	const standard_as_callback_1 = built;
	exports.kExec = Symbol("exec");
	exports.kCallbacks = Symbol("callbacks");
	exports.notAllowedAutoPipelineCommands = [
	    "auth",
	    "info",
	    "script",
	    "quit",
	    "cluster",
	    "pipeline",
	    "multi",
	    "subscribe",
	    "psubscribe",
	    "unsubscribe",
	    "unpsubscribe",
	    "select",
	];
	function executeAutoPipeline(client, slotKey) {
	    /*
	      If a pipeline is already executing, keep queueing up commands
	      since ioredis won't serve two pipelines at the same time
	    */
	    if (client._runningAutoPipelines.has(slotKey)) {
	        return;
	    }
	    if (!client._autoPipelines.has(slotKey)) {
	        /*
	          Rare edge case. Somehow, something has deleted this running autopipeline in an immediate
	          call to executeAutoPipeline.
	         
	          Maybe the callback in the pipeline.exec is sometimes called in the same tick,
	          e.g. if redis is disconnected?
	        */
	        return;
	    }
	    client._runningAutoPipelines.add(slotKey);
	    // Get the pipeline and immediately delete it so that new commands are queued on a new pipeline
	    const pipeline = client._autoPipelines.get(slotKey);
	    client._autoPipelines.delete(slotKey);
	    const callbacks = pipeline[exports.kCallbacks];
	    // Stop keeping a reference to callbacks immediately after the callbacks stop being used.
	    // This allows the GC to reclaim objects referenced by callbacks, especially with 16384 slots
	    // in Redis.Cluster
	    pipeline[exports.kCallbacks] = null;
	    // Perform the call
	    pipeline.exec(function (err, results) {
	        client._runningAutoPipelines.delete(slotKey);
	        /*
	          Invoke all callback in nextTick so the stack is cleared
	          and callbacks can throw errors without affecting other callbacks.
	        */
	        if (err) {
	            for (let i = 0; i < callbacks.length; i++) {
	                process.nextTick(callbacks[i], err);
	            }
	        }
	        else {
	            for (let i = 0; i < callbacks.length; i++) {
	                process.nextTick(callbacks[i], ...results[i]);
	            }
	        }
	        // If there is another pipeline on the same node, immediately execute it without waiting for nextTick
	        if (client._autoPipelines.has(slotKey)) {
	            executeAutoPipeline(client, slotKey);
	        }
	    });
	}
	function shouldUseAutoPipelining(client, functionName, commandName) {
	    return (functionName &&
	        client.options.enableAutoPipelining &&
	        !client.isPipeline &&
	        !exports.notAllowedAutoPipelineCommands.includes(commandName) &&
	        !client.options.autoPipeliningIgnoredCommands.includes(commandName));
	}
	exports.shouldUseAutoPipelining = shouldUseAutoPipelining;
	function getFirstValueInFlattenedArray(args) {
	    for (let i = 0; i < args.length; i++) {
	        const arg = args[i];
	        if (typeof arg === "string") {
	            return arg;
	        }
	        else if (Array.isArray(arg) || (0, lodash_1.isArguments)(arg)) {
	            if (arg.length === 0) {
	                continue;
	            }
	            return arg[0];
	        }
	        const flattened = [arg].flat();
	        if (flattened.length > 0) {
	            return flattened[0];
	        }
	    }
	    return undefined;
	}
	exports.getFirstValueInFlattenedArray = getFirstValueInFlattenedArray;
	function executeWithAutoPipelining(client, functionName, commandName, args, callback) {
	    // On cluster mode let's wait for slots to be available
	    if (client.isCluster && !client.slots.length) {
	        if (client.status === "wait")
	            client.connect().catch(lodash_1.noop);
	        return (0, standard_as_callback_1.default)(new Promise(function (resolve, reject) {
	            client.delayUntilReady((err) => {
	                if (err) {
	                    reject(err);
	                    return;
	                }
	                executeWithAutoPipelining(client, functionName, commandName, args, null).then(resolve, reject);
	            });
	        }), callback);
	    }
	    // If we have slot information, we can improve routing by grouping slots served by the same subset of nodes
	    // Note that the first value in args may be a (possibly empty) array.
	    // ioredis will only flatten one level of the array, in the Command constructor.
	    const prefix = client.options.keyPrefix || "";
	    const slotKey = client.isCluster
	        ? client.slots[calculateSlot(`${prefix}${getFirstValueInFlattenedArray(args)}`)].join(",")
	        : "main";
	    if (!client._autoPipelines.has(slotKey)) {
	        const pipeline = client.pipeline();
	        pipeline[exports.kExec] = false;
	        pipeline[exports.kCallbacks] = [];
	        client._autoPipelines.set(slotKey, pipeline);
	    }
	    const pipeline = client._autoPipelines.get(slotKey);
	    /*
	      Mark the pipeline as scheduled.
	      The symbol will make sure that the pipeline is only scheduled once per tick.
	      New commands are appended to an already scheduled pipeline.
	    */
	    if (!pipeline[exports.kExec]) {
	        pipeline[exports.kExec] = true;
	        /*
	          Deferring with setImmediate so we have a chance to capture multiple
	          commands that can be scheduled by I/O events already in the event loop queue.
	        */
	        setImmediate(executeAutoPipeline, client, slotKey);
	    }
	    // Create the promise which will execute the command in the pipeline.
	    const autoPipelinePromise = new Promise(function (resolve, reject) {
	        pipeline[exports.kCallbacks].push(function (err, value) {
	            if (err) {
	                reject(err);
	                return;
	            }
	            resolve(value);
	        });
	        if (functionName === "call") {
	            args.unshift(commandName);
	        }
	        pipeline[functionName](...args);
	    });
	    return (0, standard_as_callback_1.default)(autoPipelinePromise, callback);
	}
	exports.executeWithAutoPipelining = executeWithAutoPipelining;
} (autoPipelining));

var Script$1 = {};

Object.defineProperty(Script$1, "__esModule", { value: true });
const crypto_1 = require$$1;
const Command_1$3 = Command$1;
const standard_as_callback_1$2 = built;
class Script {
    constructor(lua, numberOfKeys = null, keyPrefix = "", readOnly = false) {
        this.lua = lua;
        this.numberOfKeys = numberOfKeys;
        this.keyPrefix = keyPrefix;
        this.readOnly = readOnly;
        this.sha = (0, crypto_1.createHash)("sha1").update(lua).digest("hex");
        const sha = this.sha;
        const socketHasScriptLoaded = new WeakSet();
        this.Command = class CustomScriptCommand extends Command_1$3.default {
            toWritable(socket) {
                const origReject = this.reject;
                this.reject = (err) => {
                    if (err.message.indexOf("NOSCRIPT") !== -1) {
                        socketHasScriptLoaded.delete(socket);
                    }
                    origReject.call(this, err);
                };
                if (!socketHasScriptLoaded.has(socket)) {
                    socketHasScriptLoaded.add(socket);
                    this.name = "eval";
                    this.args[0] = lua;
                }
                else if (this.name === "eval") {
                    this.name = "evalsha";
                    this.args[0] = sha;
                }
                return super.toWritable(socket);
            }
        };
    }
    execute(container, args, options, callback) {
        if (typeof this.numberOfKeys === "number") {
            args.unshift(this.numberOfKeys);
        }
        if (this.keyPrefix) {
            options.keyPrefix = this.keyPrefix;
        }
        if (this.readOnly) {
            options.readOnly = true;
        }
        const evalsha = new this.Command("evalsha", [this.sha, ...args], options);
        evalsha.promise = evalsha.promise.catch((err) => {
            if (err.message.indexOf("NOSCRIPT") === -1) {
                throw err;
            }
            // Resend the same custom evalsha command that gets transformed
            // to an eval in case it's not loaded yet on the connection.
            const resend = new this.Command("evalsha", [this.sha, ...args], options);
            const client = container.isPipeline ? container.redis : container;
            return client.sendCommand(resend);
        });
        (0, standard_as_callback_1$2.default)(evalsha.promise, callback);
        return container.sendCommand(evalsha);
    }
}
Script$1.default = Script;

Object.defineProperty(Commander$1, "__esModule", { value: true });
const commands_1$1 = built$1;
const autoPipelining_1 = autoPipelining;
const Command_1$2 = Command$1;
const Script_1 = Script$1;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
class Commander {
    constructor() {
        this.options = {};
        /**
         * @ignore
         */
        this.scriptsSet = {};
        /**
         * @ignore
         */
        this.addedBuiltinSet = new Set();
    }
    /**
     * Return supported builtin commands
     */
    getBuiltinCommands() {
        return commands.slice(0);
    }
    /**
     * Create a builtin command
     */
    createBuiltinCommand(commandName) {
        return {
            string: generateFunction(null, commandName, "utf8"),
            buffer: generateFunction(null, commandName, null),
        };
    }
    /**
     * Create add builtin command
     */
    addBuiltinCommand(commandName) {
        this.addedBuiltinSet.add(commandName);
        this[commandName] = generateFunction(commandName, commandName, "utf8");
        this[commandName + "Buffer"] = generateFunction(commandName + "Buffer", commandName, null);
    }
    /**
     * Define a custom command using lua script
     */
    defineCommand(name, definition) {
        const script = new Script_1.default(definition.lua, definition.numberOfKeys, this.options.keyPrefix, definition.readOnly);
        this.scriptsSet[name] = script;
        this[name] = generateScriptingFunction(name, name, script, "utf8");
        this[name + "Buffer"] = generateScriptingFunction(name + "Buffer", name, script, null);
    }
    /**
     * @ignore
     */
    sendCommand(command, stream, node) {
        throw new Error('"sendCommand" is not implemented');
    }
}
const commands = commands_1$1.list.filter((command) => command !== "monitor");
commands.push("sentinel");
commands.forEach(function (commandName) {
    Commander.prototype[commandName] = generateFunction(commandName, commandName, "utf8");
    Commander.prototype[commandName + "Buffer"] = generateFunction(commandName + "Buffer", commandName, null);
});
Commander.prototype.call = generateFunction("call", "utf8");
Commander.prototype.callBuffer = generateFunction("callBuffer", null);
// @ts-expect-error
Commander.prototype.send_command = Commander.prototype.call;
function generateFunction(functionName, _commandName, _encoding) {
    if (typeof _encoding === "undefined") {
        _encoding = _commandName;
        _commandName = null;
    }
    return function (...args) {
        const commandName = (_commandName || args.shift());
        let callback = args[args.length - 1];
        if (typeof callback === "function") {
            args.pop();
        }
        else {
            callback = undefined;
        }
        const options = {
            errorStack: this.options.showFriendlyErrorStack ? new Error() : undefined,
            keyPrefix: this.options.keyPrefix,
            replyEncoding: _encoding,
        };
        // No auto pipeline, use regular command sending
        if (!(0, autoPipelining_1.shouldUseAutoPipelining)(this, functionName, commandName)) {
            return this.sendCommand(
            // @ts-expect-error
            new Command_1$2.default(commandName, args, options, callback));
        }
        // Create a new pipeline and make sure it's scheduled
        return (0, autoPipelining_1.executeWithAutoPipelining)(this, functionName, commandName, 
        // @ts-expect-error
        args, callback);
    };
}
function generateScriptingFunction(functionName, commandName, script, encoding) {
    return function (...args) {
        const callback = typeof args[args.length - 1] === "function" ? args.pop() : undefined;
        const options = {
            replyEncoding: encoding,
        };
        if (this.options.showFriendlyErrorStack) {
            options.errorStack = new Error();
        }
        // No auto pipeline, use regular command sending
        if (!(0, autoPipelining_1.shouldUseAutoPipelining)(this, functionName, commandName)) {
            return script.execute(this, args, options, callback);
        }
        // Create a new pipeline and make sure it's scheduled
        return (0, autoPipelining_1.executeWithAutoPipelining)(this, functionName, commandName, args, callback);
    };
}
Commander$1.default = Commander;

Object.defineProperty(Pipeline$1, "__esModule", { value: true });
const calculateSlot = libExports;
const commands_1 = built$1;
const standard_as_callback_1$1 = built;
const util_1 = require$$1$1;
const Command_1$1 = Command$1;
const utils_1$7 = utils;
const Commander_1 = Commander$1;
/*
  This function derives from the cluster-key-slot implementation.
  Instead of checking that all keys have the same slot, it checks that all slots are served by the same set of nodes.
  If this is satisfied, it returns the first key's slot.
*/
function generateMultiWithNodes(redis, keys) {
    const slot = calculateSlot(keys[0]);
    const target = redis._groupsBySlot[slot];
    for (let i = 1; i < keys.length; i++) {
        if (redis._groupsBySlot[calculateSlot(keys[i])] !== target) {
            return -1;
        }
    }
    return slot;
}
class Pipeline extends Commander_1.default {
    constructor(redis) {
        super();
        this.redis = redis;
        this.isPipeline = true;
        this.replyPending = 0;
        this._queue = [];
        this._result = [];
        this._transactions = 0;
        this._shaToScript = {};
        this.isCluster =
            this.redis.constructor.name === "Cluster" || this.redis.isCluster;
        this.options = redis.options;
        Object.keys(redis.scriptsSet).forEach((name) => {
            const script = redis.scriptsSet[name];
            this._shaToScript[script.sha] = script;
            this[name] = redis[name];
            this[name + "Buffer"] = redis[name + "Buffer"];
        });
        redis.addedBuiltinSet.forEach((name) => {
            this[name] = redis[name];
            this[name + "Buffer"] = redis[name + "Buffer"];
        });
        this.promise = new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
        });
        const _this = this;
        Object.defineProperty(this, "length", {
            get: function () {
                return _this._queue.length;
            },
        });
    }
    fillResult(value, position) {
        if (this._queue[position].name === "exec" && Array.isArray(value[1])) {
            const execLength = value[1].length;
            for (let i = 0; i < execLength; i++) {
                if (value[1][i] instanceof Error) {
                    continue;
                }
                const cmd = this._queue[position - (execLength - i)];
                try {
                    value[1][i] = cmd.transformReply(value[1][i]);
                }
                catch (err) {
                    value[1][i] = err;
                }
            }
        }
        this._result[position] = value;
        if (--this.replyPending) {
            return;
        }
        if (this.isCluster) {
            let retriable = true;
            let commonError;
            for (let i = 0; i < this._result.length; ++i) {
                const error = this._result[i][0];
                const command = this._queue[i];
                if (error) {
                    if (command.name === "exec" &&
                        error.message ===
                            "EXECABORT Transaction discarded because of previous errors.") {
                        continue;
                    }
                    if (!commonError) {
                        commonError = {
                            name: error.name,
                            message: error.message,
                        };
                    }
                    else if (commonError.name !== error.name ||
                        commonError.message !== error.message) {
                        retriable = false;
                        break;
                    }
                }
                else if (!command.inTransaction) {
                    const isReadOnly = (0, commands_1.exists)(command.name) && (0, commands_1.hasFlag)(command.name, "readonly");
                    if (!isReadOnly) {
                        retriable = false;
                        break;
                    }
                }
            }
            if (commonError && retriable) {
                const _this = this;
                const errv = commonError.message.split(" ");
                const queue = this._queue;
                let inTransaction = false;
                this._queue = [];
                for (let i = 0; i < queue.length; ++i) {
                    if (errv[0] === "ASK" &&
                        !inTransaction &&
                        queue[i].name !== "asking" &&
                        (!queue[i - 1] || queue[i - 1].name !== "asking")) {
                        const asking = new Command_1$1.default("asking");
                        asking.ignore = true;
                        this.sendCommand(asking);
                    }
                    queue[i].initPromise();
                    this.sendCommand(queue[i]);
                    inTransaction = queue[i].inTransaction;
                }
                let matched = true;
                if (typeof this.leftRedirections === "undefined") {
                    this.leftRedirections = {};
                }
                const exec = function () {
                    _this.exec();
                };
                const cluster = this.redis;
                cluster.handleError(commonError, this.leftRedirections, {
                    moved: function (_slot, key) {
                        _this.preferKey = key;
                        cluster.slots[errv[1]] = [key];
                        cluster._groupsBySlot[errv[1]] =
                            cluster._groupsIds[cluster.slots[errv[1]].join(";")];
                        cluster.refreshSlotsCache();
                        _this.exec();
                    },
                    ask: function (_slot, key) {
                        _this.preferKey = key;
                        _this.exec();
                    },
                    tryagain: exec,
                    clusterDown: exec,
                    connectionClosed: exec,
                    maxRedirections: () => {
                        matched = false;
                    },
                    defaults: () => {
                        matched = false;
                    },
                });
                if (matched) {
                    return;
                }
            }
        }
        let ignoredCount = 0;
        for (let i = 0; i < this._queue.length - ignoredCount; ++i) {
            if (this._queue[i + ignoredCount].ignore) {
                ignoredCount += 1;
            }
            this._result[i] = this._result[i + ignoredCount];
        }
        this.resolve(this._result.slice(0, this._result.length - ignoredCount));
    }
    sendCommand(command) {
        if (this._transactions > 0) {
            command.inTransaction = true;
        }
        const position = this._queue.length;
        command.pipelineIndex = position;
        command.promise
            .then((result) => {
            this.fillResult([null, result], position);
        })
            .catch((error) => {
            this.fillResult([error], position);
        });
        this._queue.push(command);
        return this;
    }
    addBatch(commands) {
        let command, commandName, args;
        for (let i = 0; i < commands.length; ++i) {
            command = commands[i];
            commandName = command[0];
            args = command.slice(1);
            this[commandName].apply(this, args);
        }
        return this;
    }
}
Pipeline$1.default = Pipeline;
// @ts-expect-error
const multi = Pipeline.prototype.multi;
// @ts-expect-error
Pipeline.prototype.multi = function () {
    this._transactions += 1;
    return multi.apply(this, arguments);
};
// @ts-expect-error
const execBuffer = Pipeline.prototype.execBuffer;
// @ts-expect-error
Pipeline.prototype.execBuffer = (0, util_1.deprecate)(function () {
    if (this._transactions > 0) {
        this._transactions -= 1;
    }
    return execBuffer.apply(this, arguments);
}, "Pipeline#execBuffer: Use Pipeline#exec instead");
// NOTE: To avoid an unhandled promise rejection, this will unconditionally always return this.promise,
// which always has the rejection handled by standard-as-callback
// adding the provided rejection callback.
//
// If a different promise instance were returned, that promise would cause its own unhandled promise rejection
// errors, even if that promise unconditionally resolved to **the resolved value of** this.promise.
Pipeline.prototype.exec = function (callback) {
    // Wait for the cluster to be connected, since we need nodes information before continuing
    if (this.isCluster && !this.redis.slots.length) {
        if (this.redis.status === "wait")
            this.redis.connect().catch(utils_1$7.noop);
        if (callback && !this.nodeifiedPromise) {
            this.nodeifiedPromise = true;
            (0, standard_as_callback_1$1.default)(this.promise, callback);
        }
        this.redis.delayUntilReady((err) => {
            if (err) {
                this.reject(err);
                return;
            }
            this.exec(callback);
        });
        return this.promise;
    }
    if (this._transactions > 0) {
        this._transactions -= 1;
        return execBuffer.apply(this, arguments);
    }
    if (!this.nodeifiedPromise) {
        this.nodeifiedPromise = true;
        (0, standard_as_callback_1$1.default)(this.promise, callback);
    }
    if (!this._queue.length) {
        this.resolve([]);
    }
    let pipelineSlot;
    if (this.isCluster) {
        // List of the first key for each command
        const sampleKeys = [];
        for (let i = 0; i < this._queue.length; i++) {
            const keys = this._queue[i].getKeys();
            if (keys.length) {
                sampleKeys.push(keys[0]);
            }
            // For each command, check that the keys belong to the same slot
            if (keys.length && calculateSlot.generateMulti(keys) < 0) {
                this.reject(new Error("All the keys in a pipeline command should belong to the same slot"));
                return this.promise;
            }
        }
        if (sampleKeys.length) {
            pipelineSlot = generateMultiWithNodes(this.redis, sampleKeys);
            if (pipelineSlot < 0) {
                this.reject(new Error("All keys in the pipeline should belong to the same slots allocation group"));
                return this.promise;
            }
        }
        else {
            // Send the pipeline to a random node
            pipelineSlot = (Math.random() * 16384) | 0;
        }
    }
    const _this = this;
    execPipeline();
    return this.promise;
    function execPipeline() {
        let writePending = (_this.replyPending = _this._queue.length);
        let node;
        if (_this.isCluster) {
            node = {
                slot: pipelineSlot,
                redis: _this.redis.connectionPool.nodes.all[_this.preferKey],
            };
        }
        let data = "";
        let buffers;
        const stream = {
            isPipeline: true,
            destination: _this.isCluster ? node : { redis: _this.redis },
            write(writable) {
                if (typeof writable !== "string") {
                    if (!buffers) {
                        buffers = [];
                    }
                    if (data) {
                        buffers.push(Buffer.from(data, "utf8"));
                        data = "";
                    }
                    buffers.push(writable);
                }
                else {
                    data += writable;
                }
                if (!--writePending) {
                    if (buffers) {
                        if (data) {
                            buffers.push(Buffer.from(data, "utf8"));
                        }
                        stream.destination.redis.stream.write(Buffer.concat(buffers));
                    }
                    else {
                        stream.destination.redis.stream.write(data);
                    }
                    // Reset writePending for resending
                    writePending = _this._queue.length;
                    data = "";
                    buffers = undefined;
                }
            },
        };
        for (let i = 0; i < _this._queue.length; ++i) {
            _this.redis.sendCommand(_this._queue[i], stream, node);
        }
        return _this.promise;
    }
};

Object.defineProperty(transaction, "__esModule", { value: true });
transaction.addTransactionSupport = void 0;
const utils_1$6 = utils;
const standard_as_callback_1 = built;
const Pipeline_1 = Pipeline$1;
function addTransactionSupport(redis) {
    redis.pipeline = function (commands) {
        const pipeline = new Pipeline_1.default(this);
        if (Array.isArray(commands)) {
            pipeline.addBatch(commands);
        }
        return pipeline;
    };
    const { multi } = redis;
    redis.multi = function (commands, options) {
        if (typeof options === "undefined" && !Array.isArray(commands)) {
            options = commands;
            commands = null;
        }
        if (options && options.pipeline === false) {
            return multi.call(this);
        }
        const pipeline = new Pipeline_1.default(this);
        // @ts-expect-error
        pipeline.multi();
        if (Array.isArray(commands)) {
            pipeline.addBatch(commands);
        }
        const exec = pipeline.exec;
        pipeline.exec = function (callback) {
            // Wait for the cluster to be connected, since we need nodes information before continuing
            if (this.isCluster && !this.redis.slots.length) {
                if (this.redis.status === "wait")
                    this.redis.connect().catch(utils_1$6.noop);
                return (0, standard_as_callback_1.default)(new Promise((resolve, reject) => {
                    this.redis.delayUntilReady((err) => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        this.exec(pipeline).then(resolve, reject);
                    });
                }), callback);
            }
            if (this._transactions > 0) {
                exec.call(pipeline);
            }
            // Returns directly when the pipeline
            // has been called multiple times (retries).
            if (this.nodeifiedPromise) {
                return exec.call(pipeline);
            }
            const promise = exec.call(pipeline);
            return (0, standard_as_callback_1.default)(promise.then(function (result) {
                const execResult = result[result.length - 1];
                if (typeof execResult === "undefined") {
                    throw new Error("Pipeline cannot be used to send any commands when the `exec()` has been called on it.");
                }
                if (execResult[0]) {
                    execResult[0].previousErrors = [];
                    for (let i = 0; i < result.length - 1; ++i) {
                        if (result[i][0]) {
                            execResult[0].previousErrors.push(result[i][0]);
                        }
                    }
                    throw execResult[0];
                }
                return (0, utils_1$6.wrapMultiResult)(execResult[1]);
            }), callback);
        };
        // @ts-expect-error
        const { execBuffer } = pipeline;
        // @ts-expect-error
        pipeline.execBuffer = function (callback) {
            if (this._transactions > 0) {
                execBuffer.call(pipeline);
            }
            return pipeline.exec(callback);
        };
        return pipeline;
    };
    const { exec } = redis;
    redis.exec = function (callback) {
        return (0, standard_as_callback_1.default)(exec.call(this).then(function (results) {
            if (Array.isArray(results)) {
                results = (0, utils_1$6.wrapMultiResult)(results);
            }
            return results;
        }), callback);
    };
}
transaction.addTransactionSupport = addTransactionSupport;

var applyMixin$1 = {};

Object.defineProperty(applyMixin$1, "__esModule", { value: true });
function applyMixin(derivedConstructor, mixinConstructor) {
    Object.getOwnPropertyNames(mixinConstructor.prototype).forEach((name) => {
        Object.defineProperty(derivedConstructor.prototype, name, Object.getOwnPropertyDescriptor(mixinConstructor.prototype, name));
    });
}
applyMixin$1.default = applyMixin;

var ClusterOptions = {};

Object.defineProperty(ClusterOptions, "__esModule", { value: true });
ClusterOptions.DEFAULT_CLUSTER_OPTIONS = void 0;
const dns_1 = require$$0$6;
ClusterOptions.DEFAULT_CLUSTER_OPTIONS = {
    clusterRetryStrategy: (times) => Math.min(100 + times * 2, 2000),
    enableOfflineQueue: true,
    enableReadyCheck: true,
    scaleReads: "master",
    maxRedirections: 16,
    retryDelayOnMoved: 0,
    retryDelayOnFailover: 100,
    retryDelayOnClusterDown: 100,
    retryDelayOnTryAgain: 100,
    slotsRefreshTimeout: 1000,
    useSRVRecords: false,
    resolveSrv: dns_1.resolveSrv,
    dnsLookup: dns_1.lookup,
    enableAutoPipelining: false,
    autoPipeliningIgnoredCommands: [],
};

var ClusterSubscriber = {};

var util = {};

Object.defineProperty(util, "__esModule", { value: true });
util.getConnectionName = util.weightSrvRecords = util.groupSrvRecords = util.getUniqueHostnamesFromOptions = util.normalizeNodeOptions = util.nodeKeyToRedisOptions = util.getNodeKey = void 0;
const utils_1$5 = utils;
const net_1$1 = require$$0$7;
function getNodeKey(node) {
    node.port = node.port || 6379;
    node.host = node.host || "127.0.0.1";
    return node.host + ":" + node.port;
}
util.getNodeKey = getNodeKey;
function nodeKeyToRedisOptions(nodeKey) {
    const portIndex = nodeKey.lastIndexOf(":");
    if (portIndex === -1) {
        throw new Error(`Invalid node key ${nodeKey}`);
    }
    return {
        host: nodeKey.slice(0, portIndex),
        port: Number(nodeKey.slice(portIndex + 1)),
    };
}
util.nodeKeyToRedisOptions = nodeKeyToRedisOptions;
function normalizeNodeOptions(nodes) {
    return nodes.map((node) => {
        const options = {};
        if (typeof node === "object") {
            Object.assign(options, node);
        }
        else if (typeof node === "string") {
            Object.assign(options, (0, utils_1$5.parseURL)(node));
        }
        else if (typeof node === "number") {
            options.port = node;
        }
        else {
            throw new Error("Invalid argument " + node);
        }
        if (typeof options.port === "string") {
            options.port = parseInt(options.port, 10);
        }
        // Cluster mode only support db 0
        delete options.db;
        if (!options.port) {
            options.port = 6379;
        }
        if (!options.host) {
            options.host = "127.0.0.1";
        }
        return (0, utils_1$5.resolveTLSProfile)(options);
    });
}
util.normalizeNodeOptions = normalizeNodeOptions;
function getUniqueHostnamesFromOptions(nodes) {
    const uniqueHostsMap = {};
    nodes.forEach((node) => {
        uniqueHostsMap[node.host] = true;
    });
    return Object.keys(uniqueHostsMap).filter((host) => !(0, net_1$1.isIP)(host));
}
util.getUniqueHostnamesFromOptions = getUniqueHostnamesFromOptions;
function groupSrvRecords(records) {
    const recordsByPriority = {};
    for (const record of records) {
        if (!recordsByPriority.hasOwnProperty(record.priority)) {
            recordsByPriority[record.priority] = {
                totalWeight: record.weight,
                records: [record],
            };
        }
        else {
            recordsByPriority[record.priority].totalWeight += record.weight;
            recordsByPriority[record.priority].records.push(record);
        }
    }
    return recordsByPriority;
}
util.groupSrvRecords = groupSrvRecords;
function weightSrvRecords(recordsGroup) {
    if (recordsGroup.records.length === 1) {
        recordsGroup.totalWeight = 0;
        return recordsGroup.records.shift();
    }
    // + `recordsGroup.records.length` to support `weight` 0
    const random = Math.floor(Math.random() * (recordsGroup.totalWeight + recordsGroup.records.length));
    let total = 0;
    for (const [i, record] of recordsGroup.records.entries()) {
        total += 1 + record.weight;
        if (total > random) {
            recordsGroup.totalWeight -= record.weight;
            recordsGroup.records.splice(i, 1);
            return record;
        }
    }
}
util.weightSrvRecords = weightSrvRecords;
function getConnectionName(component, nodeConnectionName) {
    const prefix = `ioredis-cluster(${component})`;
    return nodeConnectionName ? `${prefix}:${nodeConnectionName}` : prefix;
}
util.getConnectionName = getConnectionName;

var hasRequiredClusterSubscriber;

function requireClusterSubscriber () {
	if (hasRequiredClusterSubscriber) return ClusterSubscriber;
	hasRequiredClusterSubscriber = 1;
	Object.defineProperty(ClusterSubscriber, "__esModule", { value: true });
	const util_1 = util;
	const utils_1 = utils;
	const Redis_1 = requireRedis();
	const debug = (0, utils_1.Debug)("cluster:subscriber");
	class ClusterSubscriber$1 {
	    constructor(connectionPool, emitter) {
	        this.connectionPool = connectionPool;
	        this.emitter = emitter;
	        this.started = false;
	        this.subscriber = null;
	        this.onSubscriberEnd = () => {
	            if (!this.started) {
	                debug("subscriber has disconnected, but ClusterSubscriber is not started, so not reconnecting.");
	                return;
	            }
	            // If the subscriber closes whilst it's still the active connection,
	            // we might as well try to connecting to a new node if possible to
	            // minimise the number of missed publishes.
	            debug("subscriber has disconnected, selecting a new one...");
	            this.selectSubscriber();
	        };
	        // If the current node we're using as the subscriber disappears
	        // from the node pool for some reason, we will select a new one
	        // to connect to.
	        // Note that this event is only triggered if the connection to
	        // the node has been used; cluster subscriptions are setup with
	        // lazyConnect = true. It's possible for the subscriber node to
	        // disappear without this method being called!
	        // See https://github.com/luin/ioredis/pull/1589
	        this.connectionPool.on("-node", (_, key) => {
	            if (!this.started || !this.subscriber) {
	                return;
	            }
	            if ((0, util_1.getNodeKey)(this.subscriber.options) === key) {
	                debug("subscriber has left, selecting a new one...");
	                this.selectSubscriber();
	            }
	        });
	        this.connectionPool.on("+node", () => {
	            if (!this.started || this.subscriber) {
	                return;
	            }
	            debug("a new node is discovered and there is no subscriber, selecting a new one...");
	            this.selectSubscriber();
	        });
	    }
	    getInstance() {
	        return this.subscriber;
	    }
	    start() {
	        this.started = true;
	        this.selectSubscriber();
	        debug("started");
	    }
	    stop() {
	        this.started = false;
	        if (this.subscriber) {
	            this.subscriber.disconnect();
	            this.subscriber = null;
	        }
	        debug("stopped");
	    }
	    selectSubscriber() {
	        const lastActiveSubscriber = this.lastActiveSubscriber;
	        // Disconnect the previous subscriber even if there
	        // will not be a new one.
	        if (lastActiveSubscriber) {
	            lastActiveSubscriber.off("end", this.onSubscriberEnd);
	            lastActiveSubscriber.disconnect();
	        }
	        if (this.subscriber) {
	            this.subscriber.off("end", this.onSubscriberEnd);
	            this.subscriber.disconnect();
	        }
	        const sampleNode = (0, utils_1.sample)(this.connectionPool.getNodes());
	        if (!sampleNode) {
	            debug("selecting subscriber failed since there is no node discovered in the cluster yet");
	            this.subscriber = null;
	            return;
	        }
	        const { options } = sampleNode;
	        debug("selected a subscriber %s:%s", options.host, options.port);
	        /*
	         * Create a specialized Redis connection for the subscription.
	         * Note that auto reconnection is enabled here.
	         *
	         * `enableReadyCheck` is also enabled because although subscription is allowed
	         * while redis is loading data from the disk, we can check if the password
	         * provided for the subscriber is correct, and if not, the current subscriber
	         * will be disconnected and a new subscriber will be selected.
	         */
	        this.subscriber = new Redis_1.default({
	            port: options.port,
	            host: options.host,
	            username: options.username,
	            password: options.password,
	            enableReadyCheck: true,
	            connectionName: (0, util_1.getConnectionName)("subscriber", options.connectionName),
	            lazyConnect: true,
	            tls: options.tls,
	            // Don't try to reconnect the subscriber connection. If the connection fails
	            // we will get an end event (handled below), at which point we'll pick a new
	            // node from the pool and try to connect to that as the subscriber connection.
	            retryStrategy: null,
	        });
	        // Ignore the errors since they're handled in the connection pool.
	        this.subscriber.on("error", utils_1.noop);
	        // The node we lost connection to may not come back up in a
	        // reasonable amount of time (e.g. a slave that's taken down
	        // for maintainence), we could potentially miss many published
	        // messages so we should reconnect as quickly as possible, to
	        // a different node if needed.
	        this.subscriber.once("end", this.onSubscriberEnd);
	        // Re-subscribe previous channels
	        const previousChannels = { subscribe: [], psubscribe: [], ssubscribe: [] };
	        if (lastActiveSubscriber) {
	            const condition = lastActiveSubscriber.condition || lastActiveSubscriber.prevCondition;
	            if (condition && condition.subscriber) {
	                previousChannels.subscribe = condition.subscriber.channels("subscribe");
	                previousChannels.psubscribe =
	                    condition.subscriber.channels("psubscribe");
	                previousChannels.ssubscribe =
	                    condition.subscriber.channels("ssubscribe");
	            }
	        }
	        if (previousChannels.subscribe.length ||
	            previousChannels.psubscribe.length ||
	            previousChannels.ssubscribe.length) {
	            let pending = 0;
	            for (const type of ["subscribe", "psubscribe", "ssubscribe"]) {
	                const channels = previousChannels[type];
	                if (channels.length) {
	                    pending += 1;
	                    debug("%s %d channels", type, channels.length);
	                    this.subscriber[type](channels)
	                        .then(() => {
	                        if (!--pending) {
	                            this.lastActiveSubscriber = this.subscriber;
	                        }
	                    })
	                        .catch(() => {
	                        // TODO: should probably disconnect the subscriber and try again.
	                        debug("failed to %s %d channels", type, channels.length);
	                    });
	                }
	            }
	        }
	        else {
	            this.lastActiveSubscriber = this.subscriber;
	        }
	        for (const event of [
	            "message",
	            "messageBuffer",
	            "smessage",
	            "smessageBuffer",
	        ]) {
	            this.subscriber.on(event, (arg1, arg2) => {
	                this.emitter.emit(event, arg1, arg2);
	            });
	        }
	        for (const event of ["pmessage", "pmessageBuffer"]) {
	            this.subscriber.on(event, (arg1, arg2, arg3) => {
	                this.emitter.emit(event, arg1, arg2, arg3);
	            });
	        }
	    }
	}
	ClusterSubscriber.default = ClusterSubscriber$1;
	return ClusterSubscriber;
}

var ConnectionPool = {};

var hasRequiredConnectionPool;

function requireConnectionPool () {
	if (hasRequiredConnectionPool) return ConnectionPool;
	hasRequiredConnectionPool = 1;
	Object.defineProperty(ConnectionPool, "__esModule", { value: true });
	const events_1 = require$$1$3;
	const utils_1 = utils;
	const util_1 = util;
	const Redis_1 = requireRedis();
	const debug = (0, utils_1.Debug)("cluster:connectionPool");
	class ConnectionPool$1 extends events_1.EventEmitter {
	    constructor(redisOptions) {
	        super();
	        this.redisOptions = redisOptions;
	        // master + slave = all
	        this.nodes = {
	            all: {},
	            master: {},
	            slave: {},
	        };
	        this.specifiedOptions = {};
	    }
	    getNodes(role = "all") {
	        const nodes = this.nodes[role];
	        return Object.keys(nodes).map((key) => nodes[key]);
	    }
	    getInstanceByKey(key) {
	        return this.nodes.all[key];
	    }
	    getSampleInstance(role) {
	        const keys = Object.keys(this.nodes[role]);
	        const sampleKey = (0, utils_1.sample)(keys);
	        return this.nodes[role][sampleKey];
	    }
	    /**
	     * Find or create a connection to the node
	     */
	    findOrCreate(node, readOnly = false) {
	        const key = (0, util_1.getNodeKey)(node);
	        readOnly = Boolean(readOnly);
	        if (this.specifiedOptions[key]) {
	            Object.assign(node, this.specifiedOptions[key]);
	        }
	        else {
	            this.specifiedOptions[key] = node;
	        }
	        let redis;
	        if (this.nodes.all[key]) {
	            redis = this.nodes.all[key];
	            if (redis.options.readOnly !== readOnly) {
	                redis.options.readOnly = readOnly;
	                debug("Change role of %s to %s", key, readOnly ? "slave" : "master");
	                redis[readOnly ? "readonly" : "readwrite"]().catch(utils_1.noop);
	                if (readOnly) {
	                    delete this.nodes.master[key];
	                    this.nodes.slave[key] = redis;
	                }
	                else {
	                    delete this.nodes.slave[key];
	                    this.nodes.master[key] = redis;
	                }
	            }
	        }
	        else {
	            debug("Connecting to %s as %s", key, readOnly ? "slave" : "master");
	            redis = new Redis_1.default((0, utils_1.defaults)({
	                // Never try to reconnect when a node is lose,
	                // instead, waiting for a `MOVED` error and
	                // fetch the slots again.
	                retryStrategy: null,
	                // Offline queue should be enabled so that
	                // we don't need to wait for the `ready` event
	                // before sending commands to the node.
	                enableOfflineQueue: true,
	                readOnly: readOnly,
	            }, node, this.redisOptions, { lazyConnect: true }));
	            this.nodes.all[key] = redis;
	            this.nodes[readOnly ? "slave" : "master"][key] = redis;
	            redis.once("end", () => {
	                this.removeNode(key);
	                this.emit("-node", redis, key);
	                if (!Object.keys(this.nodes.all).length) {
	                    this.emit("drain");
	                }
	            });
	            this.emit("+node", redis, key);
	            redis.on("error", function (error) {
	                this.emit("nodeError", error, key);
	            });
	        }
	        return redis;
	    }
	    /**
	     * Reset the pool with a set of nodes.
	     * The old node will be removed.
	     */
	    reset(nodes) {
	        debug("Reset with %O", nodes);
	        const newNodes = {};
	        nodes.forEach((node) => {
	            const key = (0, util_1.getNodeKey)(node);
	            // Don't override the existing (master) node
	            // when the current one is slave.
	            if (!(node.readOnly && newNodes[key])) {
	                newNodes[key] = node;
	            }
	        });
	        Object.keys(this.nodes.all).forEach((key) => {
	            if (!newNodes[key]) {
	                debug("Disconnect %s because the node does not hold any slot", key);
	                this.nodes.all[key].disconnect();
	                this.removeNode(key);
	            }
	        });
	        Object.keys(newNodes).forEach((key) => {
	            const node = newNodes[key];
	            this.findOrCreate(node, node.readOnly);
	        });
	    }
	    /**
	     * Remove a node from the pool.
	     */
	    removeNode(key) {
	        const { nodes } = this;
	        if (nodes.all[key]) {
	            debug("Remove %s from the pool", key);
	            delete nodes.all[key];
	        }
	        delete nodes.master[key];
	        delete nodes.slave[key];
	    }
	}
	ConnectionPool.default = ConnectionPool$1;
	return ConnectionPool;
}

var DelayQueue$1 = {};

/**
 * Custom implementation of a double ended queue.
 */
function Denque(array, options) {
  var options = options || {};
  this._capacity = options.capacity;

  this._head = 0;
  this._tail = 0;

  if (Array.isArray(array)) {
    this._fromArray(array);
  } else {
    this._capacityMask = 0x3;
    this._list = new Array(4);
  }
}

/**
 * --------------
 *  PUBLIC API
 * -------------
 */

/**
 * Returns the item at the specified index from the list.
 * 0 is the first element, 1 is the second, and so on...
 * Elements at negative values are that many from the end: -1 is one before the end
 * (the last element), -2 is two before the end (one before last), etc.
 * @param index
 * @returns {*}
 */
Denque.prototype.peekAt = function peekAt(index) {
  var i = index;
  // expect a number or return undefined
  if ((i !== (i | 0))) {
    return void 0;
  }
  var len = this.size();
  if (i >= len || i < -len) return undefined;
  if (i < 0) i += len;
  i = (this._head + i) & this._capacityMask;
  return this._list[i];
};

/**
 * Alias for peekAt()
 * @param i
 * @returns {*}
 */
Denque.prototype.get = function get(i) {
  return this.peekAt(i);
};

/**
 * Returns the first item in the list without removing it.
 * @returns {*}
 */
Denque.prototype.peek = function peek() {
  if (this._head === this._tail) return undefined;
  return this._list[this._head];
};

/**
 * Alias for peek()
 * @returns {*}
 */
Denque.prototype.peekFront = function peekFront() {
  return this.peek();
};

/**
 * Returns the item that is at the back of the queue without removing it.
 * Uses peekAt(-1)
 */
Denque.prototype.peekBack = function peekBack() {
  return this.peekAt(-1);
};

/**
 * Returns the current length of the queue
 * @return {Number}
 */
Object.defineProperty(Denque.prototype, 'length', {
  get: function length() {
    return this.size();
  }
});

/**
 * Return the number of items on the list, or 0 if empty.
 * @returns {number}
 */
Denque.prototype.size = function size() {
  if (this._head === this._tail) return 0;
  if (this._head < this._tail) return this._tail - this._head;
  else return this._capacityMask + 1 - (this._head - this._tail);
};

/**
 * Add an item at the beginning of the list.
 * @param item
 */
Denque.prototype.unshift = function unshift(item) {
  if (arguments.length === 0) return this.size();
  var len = this._list.length;
  this._head = (this._head - 1 + len) & this._capacityMask;
  this._list[this._head] = item;
  if (this._tail === this._head) this._growArray();
  if (this._capacity && this.size() > this._capacity) this.pop();
  if (this._head < this._tail) return this._tail - this._head;
  else return this._capacityMask + 1 - (this._head - this._tail);
};

/**
 * Remove and return the first item on the list,
 * Returns undefined if the list is empty.
 * @returns {*}
 */
Denque.prototype.shift = function shift() {
  var head = this._head;
  if (head === this._tail) return undefined;
  var item = this._list[head];
  this._list[head] = undefined;
  this._head = (head + 1) & this._capacityMask;
  if (head < 2 && this._tail > 10000 && this._tail <= this._list.length >>> 2) this._shrinkArray();
  return item;
};

/**
 * Add an item to the bottom of the list.
 * @param item
 */
Denque.prototype.push = function push(item) {
  if (arguments.length === 0) return this.size();
  var tail = this._tail;
  this._list[tail] = item;
  this._tail = (tail + 1) & this._capacityMask;
  if (this._tail === this._head) {
    this._growArray();
  }
  if (this._capacity && this.size() > this._capacity) {
    this.shift();
  }
  if (this._head < this._tail) return this._tail - this._head;
  else return this._capacityMask + 1 - (this._head - this._tail);
};

/**
 * Remove and return the last item on the list.
 * Returns undefined if the list is empty.
 * @returns {*}
 */
Denque.prototype.pop = function pop() {
  var tail = this._tail;
  if (tail === this._head) return undefined;
  var len = this._list.length;
  this._tail = (tail - 1 + len) & this._capacityMask;
  var item = this._list[this._tail];
  this._list[this._tail] = undefined;
  if (this._head < 2 && tail > 10000 && tail <= len >>> 2) this._shrinkArray();
  return item;
};

/**
 * Remove and return the item at the specified index from the list.
 * Returns undefined if the list is empty.
 * @param index
 * @returns {*}
 */
Denque.prototype.removeOne = function removeOne(index) {
  var i = index;
  // expect a number or return undefined
  if ((i !== (i | 0))) {
    return void 0;
  }
  if (this._head === this._tail) return void 0;
  var size = this.size();
  var len = this._list.length;
  if (i >= size || i < -size) return void 0;
  if (i < 0) i += size;
  i = (this._head + i) & this._capacityMask;
  var item = this._list[i];
  var k;
  if (index < size / 2) {
    for (k = index; k > 0; k--) {
      this._list[i] = this._list[i = (i - 1 + len) & this._capacityMask];
    }
    this._list[i] = void 0;
    this._head = (this._head + 1 + len) & this._capacityMask;
  } else {
    for (k = size - 1 - index; k > 0; k--) {
      this._list[i] = this._list[i = (i + 1 + len) & this._capacityMask];
    }
    this._list[i] = void 0;
    this._tail = (this._tail - 1 + len) & this._capacityMask;
  }
  return item;
};

/**
 * Remove number of items from the specified index from the list.
 * Returns array of removed items.
 * Returns undefined if the list is empty.
 * @param index
 * @param count
 * @returns {array}
 */
Denque.prototype.remove = function remove(index, count) {
  var i = index;
  var removed;
  var del_count = count;
  // expect a number or return undefined
  if ((i !== (i | 0))) {
    return void 0;
  }
  if (this._head === this._tail) return void 0;
  var size = this.size();
  var len = this._list.length;
  if (i >= size || i < -size || count < 1) return void 0;
  if (i < 0) i += size;
  if (count === 1 || !count) {
    removed = new Array(1);
    removed[0] = this.removeOne(i);
    return removed;
  }
  if (i === 0 && i + count >= size) {
    removed = this.toArray();
    this.clear();
    return removed;
  }
  if (i + count > size) count = size - i;
  var k;
  removed = new Array(count);
  for (k = 0; k < count; k++) {
    removed[k] = this._list[(this._head + i + k) & this._capacityMask];
  }
  i = (this._head + i) & this._capacityMask;
  if (index + count === size) {
    this._tail = (this._tail - count + len) & this._capacityMask;
    for (k = count; k > 0; k--) {
      this._list[i = (i + 1 + len) & this._capacityMask] = void 0;
    }
    return removed;
  }
  if (index === 0) {
    this._head = (this._head + count + len) & this._capacityMask;
    for (k = count - 1; k > 0; k--) {
      this._list[i = (i + 1 + len) & this._capacityMask] = void 0;
    }
    return removed;
  }
  if (i < size / 2) {
    this._head = (this._head + index + count + len) & this._capacityMask;
    for (k = index; k > 0; k--) {
      this.unshift(this._list[i = (i - 1 + len) & this._capacityMask]);
    }
    i = (this._head - 1 + len) & this._capacityMask;
    while (del_count > 0) {
      this._list[i = (i - 1 + len) & this._capacityMask] = void 0;
      del_count--;
    }
    if (index < 0) this._tail = i;
  } else {
    this._tail = i;
    i = (i + count + len) & this._capacityMask;
    for (k = size - (count + index); k > 0; k--) {
      this.push(this._list[i++]);
    }
    i = this._tail;
    while (del_count > 0) {
      this._list[i = (i + 1 + len) & this._capacityMask] = void 0;
      del_count--;
    }
  }
  if (this._head < 2 && this._tail > 10000 && this._tail <= len >>> 2) this._shrinkArray();
  return removed;
};

/**
 * Native splice implementation.
 * Remove number of items from the specified index from the list and/or add new elements.
 * Returns array of removed items or empty array if count == 0.
 * Returns undefined if the list is empty.
 *
 * @param index
 * @param count
 * @param {...*} [elements]
 * @returns {array}
 */
Denque.prototype.splice = function splice(index, count) {
  var i = index;
  // expect a number or return undefined
  if ((i !== (i | 0))) {
    return void 0;
  }
  var size = this.size();
  if (i < 0) i += size;
  if (i > size) return void 0;
  if (arguments.length > 2) {
    var k;
    var temp;
    var removed;
    var arg_len = arguments.length;
    var len = this._list.length;
    var arguments_index = 2;
    if (!size || i < size / 2) {
      temp = new Array(i);
      for (k = 0; k < i; k++) {
        temp[k] = this._list[(this._head + k) & this._capacityMask];
      }
      if (count === 0) {
        removed = [];
        if (i > 0) {
          this._head = (this._head + i + len) & this._capacityMask;
        }
      } else {
        removed = this.remove(i, count);
        this._head = (this._head + i + len) & this._capacityMask;
      }
      while (arg_len > arguments_index) {
        this.unshift(arguments[--arg_len]);
      }
      for (k = i; k > 0; k--) {
        this.unshift(temp[k - 1]);
      }
    } else {
      temp = new Array(size - (i + count));
      var leng = temp.length;
      for (k = 0; k < leng; k++) {
        temp[k] = this._list[(this._head + i + count + k) & this._capacityMask];
      }
      if (count === 0) {
        removed = [];
        if (i != size) {
          this._tail = (this._head + i + len) & this._capacityMask;
        }
      } else {
        removed = this.remove(i, count);
        this._tail = (this._tail - leng + len) & this._capacityMask;
      }
      while (arguments_index < arg_len) {
        this.push(arguments[arguments_index++]);
      }
      for (k = 0; k < leng; k++) {
        this.push(temp[k]);
      }
    }
    return removed;
  } else {
    return this.remove(i, count);
  }
};

/**
 * Soft clear - does not reset capacity.
 */
Denque.prototype.clear = function clear() {
  this._list = new Array(this._list.length);
  this._head = 0;
  this._tail = 0;
};

/**
 * Returns true or false whether the list is empty.
 * @returns {boolean}
 */
Denque.prototype.isEmpty = function isEmpty() {
  return this._head === this._tail;
};

/**
 * Returns an array of all queue items.
 * @returns {Array}
 */
Denque.prototype.toArray = function toArray() {
  return this._copyArray(false);
};

/**
 * -------------
 *   INTERNALS
 * -------------
 */

/**
 * Fills the queue with items from an array
 * For use in the constructor
 * @param array
 * @private
 */
Denque.prototype._fromArray = function _fromArray(array) {
  var length = array.length;
  var capacity = this._nextPowerOf2(length);

  this._list = new Array(capacity);
  this._capacityMask = capacity - 1;
  this._tail = length;

  for (var i = 0; i < length; i++) this._list[i] = array[i];
};

/**
 *
 * @param fullCopy
 * @param size Initialize the array with a specific size. Will default to the current list size
 * @returns {Array}
 * @private
 */
Denque.prototype._copyArray = function _copyArray(fullCopy, size) {
  var src = this._list;
  var capacity = src.length;
  var length = this.length;
  size = size | length;

  // No prealloc requested and the buffer is contiguous
  if (size == length && this._head < this._tail) {
    // Simply do a fast slice copy
    return this._list.slice(this._head, this._tail);
  }

  var dest = new Array(size);

  var k = 0;
  var i;
  if (fullCopy || this._head > this._tail) {
    for (i = this._head; i < capacity; i++) dest[k++] = src[i];
    for (i = 0; i < this._tail; i++) dest[k++] = src[i];
  } else {
    for (i = this._head; i < this._tail; i++) dest[k++] = src[i];
  }

  return dest;
};

/**
 * Grows the internal list array.
 * @private
 */
Denque.prototype._growArray = function _growArray() {
  if (this._head != 0) {
    // double array size and copy existing data, head to end, then beginning to tail.
    var newList = this._copyArray(true, this._list.length << 1);

    this._tail = this._list.length;
    this._head = 0;

    this._list = newList;
  } else {
    this._tail = this._list.length;
    this._list.length <<= 1;
  }

  this._capacityMask = (this._capacityMask << 1) | 1;
};

/**
 * Shrinks the internal list array.
 * @private
 */
Denque.prototype._shrinkArray = function _shrinkArray() {
  this._list.length >>>= 1;
  this._capacityMask >>>= 1;
};

/**
 * Find the next power of 2, at least 4
 * @private
 * @param {number} num 
 * @returns {number}
 */
Denque.prototype._nextPowerOf2 = function _nextPowerOf2(num) {
  var log2 = Math.log(num) / Math.log(2);
  var nextPow2 = 1 << (log2 + 1);

  return Math.max(nextPow2, 4);
};

var denque = Denque;

Object.defineProperty(DelayQueue$1, "__esModule", { value: true });
const utils_1$4 = utils;
const Deque = denque;
const debug$3 = (0, utils_1$4.Debug)("delayqueue");
/**
 * Queue that runs items after specified duration
 */
class DelayQueue {
    constructor() {
        this.queues = {};
        this.timeouts = {};
    }
    /**
     * Add a new item to the queue
     *
     * @param bucket bucket name
     * @param item function that will run later
     * @param options
     */
    push(bucket, item, options) {
        const callback = options.callback || process.nextTick;
        if (!this.queues[bucket]) {
            this.queues[bucket] = new Deque();
        }
        const queue = this.queues[bucket];
        queue.push(item);
        if (!this.timeouts[bucket]) {
            this.timeouts[bucket] = setTimeout(() => {
                callback(() => {
                    this.timeouts[bucket] = null;
                    this.execute(bucket);
                });
            }, options.timeout);
        }
    }
    execute(bucket) {
        const queue = this.queues[bucket];
        if (!queue) {
            return;
        }
        const { length } = queue;
        if (!length) {
            return;
        }
        debug$3("send %d commands in %s queue", length, bucket);
        this.queues[bucket] = null;
        while (queue.length > 0) {
            queue.shift()();
        }
    }
}
DelayQueue$1.default = DelayQueue;

var hasRequiredCluster;

function requireCluster () {
	if (hasRequiredCluster) return cluster;
	hasRequiredCluster = 1;
	Object.defineProperty(cluster, "__esModule", { value: true });
	const commands_1 = built$1;
	const events_1 = require$$1$3;
	const redis_errors_1 = redisErrors;
	const standard_as_callback_1 = built;
	const Command_1 = Command$1;
	const ClusterAllFailedError_1 = ClusterAllFailedError$1;
	const Redis_1 = requireRedis();
	const ScanStream_1 = ScanStream$1;
	const transaction_1 = transaction;
	const utils_1 = utils;
	const applyMixin_1 = applyMixin$1;
	const Commander_1 = Commander$1;
	const ClusterOptions_1 = ClusterOptions;
	const ClusterSubscriber_1 = requireClusterSubscriber();
	const ConnectionPool_1 = requireConnectionPool();
	const DelayQueue_1 = DelayQueue$1;
	const util_1 = util;
	const Deque = denque;
	const debug = (0, utils_1.Debug)("cluster");
	const REJECT_OVERWRITTEN_COMMANDS = new WeakSet();
	/**
	 * Client for the official Redis Cluster
	 */
	class Cluster extends Commander_1.default {
	    /**
	     * Creates an instance of Cluster.
	     */
	    constructor(startupNodes, options = {}) {
	        super();
	        this.slots = [];
	        /**
	         * @ignore
	         */
	        this._groupsIds = {};
	        /**
	         * @ignore
	         */
	        this._groupsBySlot = Array(16384);
	        /**
	         * @ignore
	         */
	        this.isCluster = true;
	        this.retryAttempts = 0;
	        this.delayQueue = new DelayQueue_1.default();
	        this.offlineQueue = new Deque();
	        this.isRefreshing = false;
	        this._refreshSlotsCacheCallbacks = [];
	        this._autoPipelines = new Map();
	        this._runningAutoPipelines = new Set();
	        this._readyDelayedCallbacks = [];
	        /**
	         * Every time Cluster#connect() is called, this value will be
	         * auto-incrementing. The purpose of this value is used for
	         * discarding previous connect attampts when creating a new
	         * connection.
	         */
	        this.connectionEpoch = 0;
	        events_1.EventEmitter.call(this);
	        this.startupNodes = startupNodes;
	        this.options = (0, utils_1.defaults)({}, options, ClusterOptions_1.DEFAULT_CLUSTER_OPTIONS, this.options);
	        if (this.options.redisOptions &&
	            this.options.redisOptions.keyPrefix &&
	            !this.options.keyPrefix) {
	            this.options.keyPrefix = this.options.redisOptions.keyPrefix;
	        }
	        // validate options
	        if (typeof this.options.scaleReads !== "function" &&
	            ["all", "master", "slave"].indexOf(this.options.scaleReads) === -1) {
	            throw new Error('Invalid option scaleReads "' +
	                this.options.scaleReads +
	                '". Expected "all", "master", "slave" or a custom function');
	        }
	        this.connectionPool = new ConnectionPool_1.default(this.options.redisOptions);
	        this.connectionPool.on("-node", (redis, key) => {
	            this.emit("-node", redis);
	        });
	        this.connectionPool.on("+node", (redis) => {
	            this.emit("+node", redis);
	        });
	        this.connectionPool.on("drain", () => {
	            this.setStatus("close");
	        });
	        this.connectionPool.on("nodeError", (error, key) => {
	            this.emit("node error", error, key);
	        });
	        this.subscriber = new ClusterSubscriber_1.default(this.connectionPool, this);
	        if (this.options.scripts) {
	            Object.entries(this.options.scripts).forEach(([name, definition]) => {
	                this.defineCommand(name, definition);
	            });
	        }
	        if (this.options.lazyConnect) {
	            this.setStatus("wait");
	        }
	        else {
	            this.connect().catch((err) => {
	                debug("connecting failed: %s", err);
	            });
	        }
	    }
	    /**
	     * Connect to a cluster
	     */
	    connect() {
	        return new Promise((resolve, reject) => {
	            if (this.status === "connecting" ||
	                this.status === "connect" ||
	                this.status === "ready") {
	                reject(new Error("Redis is already connecting/connected"));
	                return;
	            }
	            const epoch = ++this.connectionEpoch;
	            this.setStatus("connecting");
	            this.resolveStartupNodeHostnames()
	                .then((nodes) => {
	                if (this.connectionEpoch !== epoch) {
	                    debug("discard connecting after resolving startup nodes because epoch not match: %d != %d", epoch, this.connectionEpoch);
	                    reject(new redis_errors_1.RedisError("Connection is discarded because a new connection is made"));
	                    return;
	                }
	                if (this.status !== "connecting") {
	                    debug("discard connecting after resolving startup nodes because the status changed to %s", this.status);
	                    reject(new redis_errors_1.RedisError("Connection is aborted"));
	                    return;
	                }
	                this.connectionPool.reset(nodes);
	                const readyHandler = () => {
	                    this.setStatus("ready");
	                    this.retryAttempts = 0;
	                    this.executeOfflineCommands();
	                    this.resetNodesRefreshInterval();
	                    resolve();
	                };
	                let closeListener = undefined;
	                const refreshListener = () => {
	                    this.invokeReadyDelayedCallbacks(undefined);
	                    this.removeListener("close", closeListener);
	                    this.manuallyClosing = false;
	                    this.setStatus("connect");
	                    if (this.options.enableReadyCheck) {
	                        this.readyCheck((err, fail) => {
	                            if (err || fail) {
	                                debug("Ready check failed (%s). Reconnecting...", err || fail);
	                                if (this.status === "connect") {
	                                    this.disconnect(true);
	                                }
	                            }
	                            else {
	                                readyHandler();
	                            }
	                        });
	                    }
	                    else {
	                        readyHandler();
	                    }
	                };
	                closeListener = () => {
	                    const error = new Error("None of startup nodes is available");
	                    this.removeListener("refresh", refreshListener);
	                    this.invokeReadyDelayedCallbacks(error);
	                    reject(error);
	                };
	                this.once("refresh", refreshListener);
	                this.once("close", closeListener);
	                this.once("close", this.handleCloseEvent.bind(this));
	                this.refreshSlotsCache((err) => {
	                    if (err && err.message === ClusterAllFailedError_1.default.defaultMessage) {
	                        Redis_1.default.prototype.silentEmit.call(this, "error", err);
	                        this.connectionPool.reset([]);
	                    }
	                });
	                this.subscriber.start();
	            })
	                .catch((err) => {
	                this.setStatus("close");
	                this.handleCloseEvent(err);
	                this.invokeReadyDelayedCallbacks(err);
	                reject(err);
	            });
	        });
	    }
	    /**
	     * Disconnect from every node in the cluster.
	     */
	    disconnect(reconnect = false) {
	        const status = this.status;
	        this.setStatus("disconnecting");
	        if (!reconnect) {
	            this.manuallyClosing = true;
	        }
	        if (this.reconnectTimeout && !reconnect) {
	            clearTimeout(this.reconnectTimeout);
	            this.reconnectTimeout = null;
	            debug("Canceled reconnecting attempts");
	        }
	        this.clearNodesRefreshInterval();
	        this.subscriber.stop();
	        if (status === "wait") {
	            this.setStatus("close");
	            this.handleCloseEvent();
	        }
	        else {
	            this.connectionPool.reset([]);
	        }
	    }
	    /**
	     * Quit the cluster gracefully.
	     */
	    quit(callback) {
	        const status = this.status;
	        this.setStatus("disconnecting");
	        this.manuallyClosing = true;
	        if (this.reconnectTimeout) {
	            clearTimeout(this.reconnectTimeout);
	            this.reconnectTimeout = null;
	        }
	        this.clearNodesRefreshInterval();
	        this.subscriber.stop();
	        if (status === "wait") {
	            const ret = (0, standard_as_callback_1.default)(Promise.resolve("OK"), callback);
	            // use setImmediate to make sure "close" event
	            // being emitted after quit() is returned
	            setImmediate(function () {
	                this.setStatus("close");
	                this.handleCloseEvent();
	            }.bind(this));
	            return ret;
	        }
	        return (0, standard_as_callback_1.default)(Promise.all(this.nodes().map((node) => node.quit().catch((err) => {
	            // Ignore the error caused by disconnecting since
	            // we're disconnecting...
	            if (err.message === utils_1.CONNECTION_CLOSED_ERROR_MSG) {
	                return "OK";
	            }
	            throw err;
	        }))).then(() => "OK"), callback);
	    }
	    /**
	     * Create a new instance with the same startup nodes and options as the current one.
	     *
	     * @example
	     * ```js
	     * var cluster = new Redis.Cluster([{ host: "127.0.0.1", port: "30001" }]);
	     * var anotherCluster = cluster.duplicate();
	     * ```
	     */
	    duplicate(overrideStartupNodes = [], overrideOptions = {}) {
	        const startupNodes = overrideStartupNodes.length > 0
	            ? overrideStartupNodes
	            : this.startupNodes.slice(0);
	        const options = Object.assign({}, this.options, overrideOptions);
	        return new Cluster(startupNodes, options);
	    }
	    /**
	     * Get nodes with the specified role
	     */
	    nodes(role = "all") {
	        if (role !== "all" && role !== "master" && role !== "slave") {
	            throw new Error('Invalid role "' + role + '". Expected "all", "master" or "slave"');
	        }
	        return this.connectionPool.getNodes(role);
	    }
	    /**
	     * This is needed in order not to install a listener for each auto pipeline
	     *
	     * @ignore
	     */
	    delayUntilReady(callback) {
	        this._readyDelayedCallbacks.push(callback);
	    }
	    /**
	     * Get the number of commands queued in automatic pipelines.
	     *
	     * This is not available (and returns 0) until the cluster is connected and slots information have been received.
	     */
	    get autoPipelineQueueSize() {
	        let queued = 0;
	        for (const pipeline of this._autoPipelines.values()) {
	            queued += pipeline.length;
	        }
	        return queued;
	    }
	    /**
	     * Refresh the slot cache
	     *
	     * @ignore
	     */
	    refreshSlotsCache(callback) {
	        if (callback) {
	            this._refreshSlotsCacheCallbacks.push(callback);
	        }
	        if (this.isRefreshing) {
	            return;
	        }
	        this.isRefreshing = true;
	        const _this = this;
	        const wrapper = (error) => {
	            this.isRefreshing = false;
	            for (const callback of this._refreshSlotsCacheCallbacks) {
	                callback(error);
	            }
	            this._refreshSlotsCacheCallbacks = [];
	        };
	        const nodes = (0, utils_1.shuffle)(this.connectionPool.getNodes());
	        let lastNodeError = null;
	        function tryNode(index) {
	            if (index === nodes.length) {
	                const error = new ClusterAllFailedError_1.default(ClusterAllFailedError_1.default.defaultMessage, lastNodeError);
	                return wrapper(error);
	            }
	            const node = nodes[index];
	            const key = `${node.options.host}:${node.options.port}`;
	            debug("getting slot cache from %s", key);
	            _this.getInfoFromNode(node, function (err) {
	                switch (_this.status) {
	                    case "close":
	                    case "end":
	                        return wrapper(new Error("Cluster is disconnected."));
	                    case "disconnecting":
	                        return wrapper(new Error("Cluster is disconnecting."));
	                }
	                if (err) {
	                    _this.emit("node error", err, key);
	                    lastNodeError = err;
	                    tryNode(index + 1);
	                }
	                else {
	                    _this.emit("refresh");
	                    wrapper();
	                }
	            });
	        }
	        tryNode(0);
	    }
	    /**
	     * @ignore
	     */
	    sendCommand(command, stream, node) {
	        if (this.status === "wait") {
	            this.connect().catch(utils_1.noop);
	        }
	        if (this.status === "end") {
	            command.reject(new Error(utils_1.CONNECTION_CLOSED_ERROR_MSG));
	            return command.promise;
	        }
	        let to = this.options.scaleReads;
	        if (to !== "master") {
	            const isCommandReadOnly = command.isReadOnly ||
	                ((0, commands_1.exists)(command.name) && (0, commands_1.hasFlag)(command.name, "readonly"));
	            if (!isCommandReadOnly) {
	                to = "master";
	            }
	        }
	        let targetSlot = node ? node.slot : command.getSlot();
	        const ttl = {};
	        const _this = this;
	        if (!node && !REJECT_OVERWRITTEN_COMMANDS.has(command)) {
	            REJECT_OVERWRITTEN_COMMANDS.add(command);
	            const reject = command.reject;
	            command.reject = function (err) {
	                const partialTry = tryConnection.bind(null, true);
	                _this.handleError(err, ttl, {
	                    moved: function (slot, key) {
	                        debug("command %s is moved to %s", command.name, key);
	                        targetSlot = Number(slot);
	                        if (_this.slots[slot]) {
	                            _this.slots[slot][0] = key;
	                        }
	                        else {
	                            _this.slots[slot] = [key];
	                        }
	                        _this._groupsBySlot[slot] =
	                            _this._groupsIds[_this.slots[slot].join(";")];
	                        _this.connectionPool.findOrCreate(_this.natMapper(key));
	                        tryConnection();
	                        debug("refreshing slot caches... (triggered by MOVED error)");
	                        _this.refreshSlotsCache();
	                    },
	                    ask: function (slot, key) {
	                        debug("command %s is required to ask %s:%s", command.name, key);
	                        const mapped = _this.natMapper(key);
	                        _this.connectionPool.findOrCreate(mapped);
	                        tryConnection(false, `${mapped.host}:${mapped.port}`);
	                    },
	                    tryagain: partialTry,
	                    clusterDown: partialTry,
	                    connectionClosed: partialTry,
	                    maxRedirections: function (redirectionError) {
	                        reject.call(command, redirectionError);
	                    },
	                    defaults: function () {
	                        reject.call(command, err);
	                    },
	                });
	            };
	        }
	        tryConnection();
	        function tryConnection(random, asking) {
	            if (_this.status === "end") {
	                command.reject(new redis_errors_1.AbortError("Cluster is ended."));
	                return;
	            }
	            let redis;
	            if (_this.status === "ready" || command.name === "cluster") {
	                if (node && node.redis) {
	                    redis = node.redis;
	                }
	                else if (Command_1.default.checkFlag("ENTER_SUBSCRIBER_MODE", command.name) ||
	                    Command_1.default.checkFlag("EXIT_SUBSCRIBER_MODE", command.name)) {
	                    redis = _this.subscriber.getInstance();
	                    if (!redis) {
	                        command.reject(new redis_errors_1.AbortError("No subscriber for the cluster"));
	                        return;
	                    }
	                }
	                else {
	                    if (!random) {
	                        if (typeof targetSlot === "number" && _this.slots[targetSlot]) {
	                            const nodeKeys = _this.slots[targetSlot];
	                            if (typeof to === "function") {
	                                const nodes = nodeKeys.map(function (key) {
	                                    return _this.connectionPool.getInstanceByKey(key);
	                                });
	                                redis = to(nodes, command);
	                                if (Array.isArray(redis)) {
	                                    redis = (0, utils_1.sample)(redis);
	                                }
	                                if (!redis) {
	                                    redis = nodes[0];
	                                }
	                            }
	                            else {
	                                let key;
	                                if (to === "all") {
	                                    key = (0, utils_1.sample)(nodeKeys);
	                                }
	                                else if (to === "slave" && nodeKeys.length > 1) {
	                                    key = (0, utils_1.sample)(nodeKeys, 1);
	                                }
	                                else {
	                                    key = nodeKeys[0];
	                                }
	                                redis = _this.connectionPool.getInstanceByKey(key);
	                            }
	                        }
	                        if (asking) {
	                            redis = _this.connectionPool.getInstanceByKey(asking);
	                            redis.asking();
	                        }
	                    }
	                    if (!redis) {
	                        redis =
	                            (typeof to === "function"
	                                ? null
	                                : _this.connectionPool.getSampleInstance(to)) ||
	                                _this.connectionPool.getSampleInstance("all");
	                    }
	                }
	                if (node && !node.redis) {
	                    node.redis = redis;
	                }
	            }
	            if (redis) {
	                redis.sendCommand(command, stream);
	            }
	            else if (_this.options.enableOfflineQueue) {
	                _this.offlineQueue.push({
	                    command: command,
	                    stream: stream,
	                    node: node,
	                });
	            }
	            else {
	                command.reject(new Error("Cluster isn't ready and enableOfflineQueue options is false"));
	            }
	        }
	        return command.promise;
	    }
	    sscanStream(key, options) {
	        return this.createScanStream("sscan", { key, options });
	    }
	    sscanBufferStream(key, options) {
	        return this.createScanStream("sscanBuffer", { key, options });
	    }
	    hscanStream(key, options) {
	        return this.createScanStream("hscan", { key, options });
	    }
	    hscanBufferStream(key, options) {
	        return this.createScanStream("hscanBuffer", { key, options });
	    }
	    zscanStream(key, options) {
	        return this.createScanStream("zscan", { key, options });
	    }
	    zscanBufferStream(key, options) {
	        return this.createScanStream("zscanBuffer", { key, options });
	    }
	    /**
	     * @ignore
	     */
	    handleError(error, ttl, handlers) {
	        if (typeof ttl.value === "undefined") {
	            ttl.value = this.options.maxRedirections;
	        }
	        else {
	            ttl.value -= 1;
	        }
	        if (ttl.value <= 0) {
	            handlers.maxRedirections(new Error("Too many Cluster redirections. Last error: " + error));
	            return;
	        }
	        const errv = error.message.split(" ");
	        if (errv[0] === "MOVED") {
	            const timeout = this.options.retryDelayOnMoved;
	            if (timeout && typeof timeout === "number") {
	                this.delayQueue.push("moved", handlers.moved.bind(null, errv[1], errv[2]), { timeout });
	            }
	            else {
	                handlers.moved(errv[1], errv[2]);
	            }
	        }
	        else if (errv[0] === "ASK") {
	            handlers.ask(errv[1], errv[2]);
	        }
	        else if (errv[0] === "TRYAGAIN") {
	            this.delayQueue.push("tryagain", handlers.tryagain, {
	                timeout: this.options.retryDelayOnTryAgain,
	            });
	        }
	        else if (errv[0] === "CLUSTERDOWN" &&
	            this.options.retryDelayOnClusterDown > 0) {
	            this.delayQueue.push("clusterdown", handlers.connectionClosed, {
	                timeout: this.options.retryDelayOnClusterDown,
	                callback: this.refreshSlotsCache.bind(this),
	            });
	        }
	        else if (error.message === utils_1.CONNECTION_CLOSED_ERROR_MSG &&
	            this.options.retryDelayOnFailover > 0 &&
	            this.status === "ready") {
	            this.delayQueue.push("failover", handlers.connectionClosed, {
	                timeout: this.options.retryDelayOnFailover,
	                callback: this.refreshSlotsCache.bind(this),
	            });
	        }
	        else {
	            handlers.defaults();
	        }
	    }
	    resetOfflineQueue() {
	        this.offlineQueue = new Deque();
	    }
	    clearNodesRefreshInterval() {
	        if (this.slotsTimer) {
	            clearTimeout(this.slotsTimer);
	            this.slotsTimer = null;
	        }
	    }
	    resetNodesRefreshInterval() {
	        if (this.slotsTimer || !this.options.slotsRefreshInterval) {
	            return;
	        }
	        const nextRound = () => {
	            this.slotsTimer = setTimeout(() => {
	                debug('refreshing slot caches... (triggered by "slotsRefreshInterval" option)');
	                this.refreshSlotsCache(() => {
	                    nextRound();
	                });
	            }, this.options.slotsRefreshInterval);
	        };
	        nextRound();
	    }
	    /**
	     * Change cluster instance's status
	     */
	    setStatus(status) {
	        debug("status: %s -> %s", this.status || "[empty]", status);
	        this.status = status;
	        process.nextTick(() => {
	            this.emit(status);
	        });
	    }
	    /**
	     * Called when closed to check whether a reconnection should be made
	     */
	    handleCloseEvent(reason) {
	        if (reason) {
	            debug("closed because %s", reason);
	        }
	        let retryDelay;
	        if (!this.manuallyClosing &&
	            typeof this.options.clusterRetryStrategy === "function") {
	            retryDelay = this.options.clusterRetryStrategy.call(this, ++this.retryAttempts, reason);
	        }
	        if (typeof retryDelay === "number") {
	            this.setStatus("reconnecting");
	            this.reconnectTimeout = setTimeout(() => {
	                this.reconnectTimeout = null;
	                debug("Cluster is disconnected. Retrying after %dms", retryDelay);
	                this.connect().catch(function (err) {
	                    debug("Got error %s when reconnecting. Ignoring...", err);
	                });
	            }, retryDelay);
	        }
	        else {
	            this.setStatus("end");
	            this.flushQueue(new Error("None of startup nodes is available"));
	        }
	    }
	    /**
	     * Flush offline queue with error.
	     */
	    flushQueue(error) {
	        let item;
	        while ((item = this.offlineQueue.shift())) {
	            item.command.reject(error);
	        }
	    }
	    executeOfflineCommands() {
	        if (this.offlineQueue.length) {
	            debug("send %d commands in offline queue", this.offlineQueue.length);
	            const offlineQueue = this.offlineQueue;
	            this.resetOfflineQueue();
	            let item;
	            while ((item = offlineQueue.shift())) {
	                this.sendCommand(item.command, item.stream, item.node);
	            }
	        }
	    }
	    natMapper(nodeKey) {
	        if (this.options.natMap && typeof this.options.natMap === "object") {
	            const key = typeof nodeKey === "string"
	                ? nodeKey
	                : `${nodeKey.host}:${nodeKey.port}`;
	            const mapped = this.options.natMap[key];
	            if (mapped) {
	                debug("NAT mapping %s -> %O", key, mapped);
	                return Object.assign({}, mapped);
	            }
	        }
	        return typeof nodeKey === "string"
	            ? (0, util_1.nodeKeyToRedisOptions)(nodeKey)
	            : nodeKey;
	    }
	    getInfoFromNode(redis, callback) {
	        if (!redis) {
	            return callback(new Error("Node is disconnected"));
	        }
	        // Use a duplication of the connection to avoid
	        // timeouts when the connection is in the blocking
	        // mode (e.g. waiting for BLPOP).
	        const duplicatedConnection = redis.duplicate({
	            enableOfflineQueue: true,
	            enableReadyCheck: false,
	            retryStrategy: null,
	            connectionName: (0, util_1.getConnectionName)("refresher", this.options.redisOptions && this.options.redisOptions.connectionName),
	        });
	        // Ignore error events since we will handle
	        // exceptions for the CLUSTER SLOTS command.
	        duplicatedConnection.on("error", utils_1.noop);
	        duplicatedConnection.cluster("SLOTS", (0, utils_1.timeout)((err, result) => {
	            duplicatedConnection.disconnect();
	            if (err) {
	                return callback(err);
	            }
	            if (this.status === "disconnecting" ||
	                this.status === "close" ||
	                this.status === "end") {
	                debug("ignore CLUSTER.SLOTS results (count: %d) since cluster status is %s", result.length, this.status);
	                callback();
	                return;
	            }
	            const nodes = [];
	            debug("cluster slots result count: %d", result.length);
	            for (let i = 0; i < result.length; ++i) {
	                const items = result[i];
	                const slotRangeStart = items[0];
	                const slotRangeEnd = items[1];
	                const keys = [];
	                for (let j = 2; j < items.length; j++) {
	                    if (!items[j][0]) {
	                        continue;
	                    }
	                    const node = this.natMapper({
	                        host: items[j][0],
	                        port: items[j][1],
	                    });
	                    node.readOnly = j !== 2;
	                    nodes.push(node);
	                    keys.push(node.host + ":" + node.port);
	                }
	                debug("cluster slots result [%d]: slots %d~%d served by %s", i, slotRangeStart, slotRangeEnd, keys);
	                for (let slot = slotRangeStart; slot <= slotRangeEnd; slot++) {
	                    this.slots[slot] = keys;
	                }
	            }
	            // Assign to each node keys a numeric value to make autopipeline comparison faster.
	            this._groupsIds = Object.create(null);
	            let j = 0;
	            for (let i = 0; i < 16384; i++) {
	                const target = (this.slots[i] || []).join(";");
	                if (!target.length) {
	                    this._groupsBySlot[i] = undefined;
	                    continue;
	                }
	                if (!this._groupsIds[target]) {
	                    this._groupsIds[target] = ++j;
	                }
	                this._groupsBySlot[i] = this._groupsIds[target];
	            }
	            this.connectionPool.reset(nodes);
	            callback();
	        }, this.options.slotsRefreshTimeout));
	    }
	    invokeReadyDelayedCallbacks(err) {
	        for (const c of this._readyDelayedCallbacks) {
	            process.nextTick(c, err);
	        }
	        this._readyDelayedCallbacks = [];
	    }
	    /**
	     * Check whether Cluster is able to process commands
	     */
	    readyCheck(callback) {
	        this.cluster("INFO", (err, res) => {
	            if (err) {
	                return callback(err);
	            }
	            if (typeof res !== "string") {
	                return callback();
	            }
	            let state;
	            const lines = res.split("\r\n");
	            for (let i = 0; i < lines.length; ++i) {
	                const parts = lines[i].split(":");
	                if (parts[0] === "cluster_state") {
	                    state = parts[1];
	                    break;
	                }
	            }
	            if (state === "fail") {
	                debug("cluster state not ok (%s)", state);
	                callback(null, state);
	            }
	            else {
	                callback();
	            }
	        });
	    }
	    resolveSrv(hostname) {
	        return new Promise((resolve, reject) => {
	            this.options.resolveSrv(hostname, (err, records) => {
	                if (err) {
	                    return reject(err);
	                }
	                const self = this, groupedRecords = (0, util_1.groupSrvRecords)(records), sortedKeys = Object.keys(groupedRecords).sort((a, b) => parseInt(a) - parseInt(b));
	                function tryFirstOne(err) {
	                    if (!sortedKeys.length) {
	                        return reject(err);
	                    }
	                    const key = sortedKeys[0], group = groupedRecords[key], record = (0, util_1.weightSrvRecords)(group);
	                    if (!group.records.length) {
	                        sortedKeys.shift();
	                    }
	                    self.dnsLookup(record.name).then((host) => resolve({
	                        host,
	                        port: record.port,
	                    }), tryFirstOne);
	                }
	                tryFirstOne();
	            });
	        });
	    }
	    dnsLookup(hostname) {
	        return new Promise((resolve, reject) => {
	            this.options.dnsLookup(hostname, (err, address) => {
	                if (err) {
	                    debug("failed to resolve hostname %s to IP: %s", hostname, err.message);
	                    reject(err);
	                }
	                else {
	                    debug("resolved hostname %s to IP %s", hostname, address);
	                    resolve(address);
	                }
	            });
	        });
	    }
	    /**
	     * Normalize startup nodes, and resolving hostnames to IPs.
	     *
	     * This process happens every time when #connect() is called since
	     * #startupNodes and DNS records may chanage.
	     */
	    async resolveStartupNodeHostnames() {
	        if (!Array.isArray(this.startupNodes) || this.startupNodes.length === 0) {
	            throw new Error("`startupNodes` should contain at least one node.");
	        }
	        const startupNodes = (0, util_1.normalizeNodeOptions)(this.startupNodes);
	        const hostnames = (0, util_1.getUniqueHostnamesFromOptions)(startupNodes);
	        if (hostnames.length === 0) {
	            return startupNodes;
	        }
	        const configs = await Promise.all(hostnames.map((this.options.useSRVRecords ? this.resolveSrv : this.dnsLookup).bind(this)));
	        const hostnameToConfig = (0, utils_1.zipMap)(hostnames, configs);
	        return startupNodes.map((node) => {
	            const config = hostnameToConfig.get(node.host);
	            if (!config) {
	                return node;
	            }
	            if (this.options.useSRVRecords) {
	                return Object.assign({}, node, config);
	            }
	            return Object.assign({}, node, { host: config });
	        });
	    }
	    createScanStream(command, { key, options = {} }) {
	        return new ScanStream_1.default({
	            objectMode: true,
	            key: key,
	            redis: this,
	            command: command,
	            ...options,
	        });
	    }
	}
	(0, applyMixin_1.default)(Cluster, events_1.EventEmitter);
	(0, transaction_1.addTransactionSupport)(Cluster.prototype);
	cluster.default = Cluster;
	return cluster;
}

var connectors = {};

var StandaloneConnector$1 = {};

var AbstractConnector$1 = {};

Object.defineProperty(AbstractConnector$1, "__esModule", { value: true });
const utils_1$3 = utils;
const debug$2 = (0, utils_1$3.Debug)("AbstractConnector");
class AbstractConnector {
    constructor(disconnectTimeout) {
        this.connecting = false;
        this.disconnectTimeout = disconnectTimeout;
    }
    check(info) {
        return true;
    }
    disconnect() {
        this.connecting = false;
        if (this.stream) {
            const stream = this.stream; // Make sure callbacks refer to the same instance
            const timeout = setTimeout(() => {
                debug$2("stream %s:%s still open, destroying it", stream.remoteAddress, stream.remotePort);
                stream.destroy();
            }, this.disconnectTimeout);
            stream.on("close", () => clearTimeout(timeout));
            stream.end();
        }
    }
}
AbstractConnector$1.default = AbstractConnector;

Object.defineProperty(StandaloneConnector$1, "__esModule", { value: true });
const net_1 = require$$0$7;
const tls_1 = require$$1$4;
const utils_1$2 = utils;
const AbstractConnector_1 = AbstractConnector$1;
class StandaloneConnector extends AbstractConnector_1.default {
    constructor(options) {
        super(options.disconnectTimeout);
        this.options = options;
    }
    connect(_) {
        const { options } = this;
        this.connecting = true;
        let connectionOptions;
        if ("path" in options && options.path) {
            connectionOptions = {
                path: options.path,
            };
        }
        else {
            connectionOptions = {};
            if ("port" in options && options.port != null) {
                connectionOptions.port = options.port;
            }
            if ("host" in options && options.host != null) {
                connectionOptions.host = options.host;
            }
            if ("family" in options && options.family != null) {
                connectionOptions.family = options.family;
            }
        }
        if (options.tls) {
            Object.assign(connectionOptions, options.tls);
        }
        // TODO:
        // We use native Promise here since other Promise
        // implementation may use different schedulers that
        // cause issue when the stream is resolved in the
        // next tick.
        // Should use the provided promise in the next major
        // version and do not connect before resolved.
        return new Promise((resolve, reject) => {
            process.nextTick(() => {
                if (!this.connecting) {
                    reject(new Error(utils_1$2.CONNECTION_CLOSED_ERROR_MSG));
                    return;
                }
                try {
                    if (options.tls) {
                        this.stream = (0, tls_1.connect)(connectionOptions);
                    }
                    else {
                        this.stream = (0, net_1.createConnection)(connectionOptions);
                    }
                }
                catch (err) {
                    reject(err);
                    return;
                }
                this.stream.once("error", (err) => {
                    this.firstError = err;
                });
                resolve(this.stream);
            });
        });
    }
}
StandaloneConnector$1.default = StandaloneConnector;

var SentinelConnector = {};

var SentinelIterator$1 = {};

Object.defineProperty(SentinelIterator$1, "__esModule", { value: true });
function isSentinelEql(a, b) {
    return ((a.host || "127.0.0.1") === (b.host || "127.0.0.1") &&
        (a.port || 26379) === (b.port || 26379));
}
class SentinelIterator {
    constructor(sentinels) {
        this.cursor = 0;
        this.sentinels = sentinels.slice(0);
    }
    next() {
        const done = this.cursor >= this.sentinels.length;
        return { done, value: done ? undefined : this.sentinels[this.cursor++] };
    }
    reset(moveCurrentEndpointToFirst) {
        if (moveCurrentEndpointToFirst &&
            this.sentinels.length > 1 &&
            this.cursor !== 1) {
            this.sentinels.unshift(...this.sentinels.splice(this.cursor - 1));
        }
        this.cursor = 0;
    }
    add(sentinel) {
        for (let i = 0; i < this.sentinels.length; i++) {
            if (isSentinelEql(sentinel, this.sentinels[i])) {
                return false;
            }
        }
        this.sentinels.push(sentinel);
        return true;
    }
    toString() {
        return `${JSON.stringify(this.sentinels)} @${this.cursor}`;
    }
}
SentinelIterator$1.default = SentinelIterator;

var FailoverDetector$1 = {};

Object.defineProperty(FailoverDetector$1, "__esModule", { value: true });
FailoverDetector$1.FailoverDetector = void 0;
const utils_1$1 = utils;
const debug$1 = (0, utils_1$1.Debug)("FailoverDetector");
const CHANNEL_NAME = "+switch-master";
class FailoverDetector {
    // sentinels can't be used for regular commands after this
    constructor(connector, sentinels) {
        this.isDisconnected = false;
        this.connector = connector;
        this.sentinels = sentinels;
    }
    cleanup() {
        this.isDisconnected = true;
        for (const sentinel of this.sentinels) {
            sentinel.client.disconnect();
        }
    }
    async subscribe() {
        debug$1("Starting FailoverDetector");
        const promises = [];
        for (const sentinel of this.sentinels) {
            const promise = sentinel.client.subscribe(CHANNEL_NAME).catch((err) => {
                debug$1("Failed to subscribe to failover messages on sentinel %s:%s (%s)", sentinel.address.host || "127.0.0.1", sentinel.address.port || 26739, err.message);
            });
            promises.push(promise);
            sentinel.client.on("message", (channel) => {
                if (!this.isDisconnected && channel === CHANNEL_NAME) {
                    this.disconnect();
                }
            });
        }
        await Promise.all(promises);
    }
    disconnect() {
        // Avoid disconnecting more than once per failover.
        // A new FailoverDetector will be created after reconnecting.
        this.isDisconnected = true;
        debug$1("Failover detected, disconnecting");
        // Will call this.cleanup()
        this.connector.disconnect();
    }
}
FailoverDetector$1.FailoverDetector = FailoverDetector;

var hasRequiredSentinelConnector;

function requireSentinelConnector () {
	if (hasRequiredSentinelConnector) return SentinelConnector;
	hasRequiredSentinelConnector = 1;
	Object.defineProperty(SentinelConnector, "__esModule", { value: true });
	SentinelConnector.SentinelIterator = void 0;
	const net_1 = require$$0$7;
	const utils_1 = utils;
	const tls_1 = require$$1$4;
	const SentinelIterator_1 = SentinelIterator$1;
	SentinelConnector.SentinelIterator = SentinelIterator_1.default;
	const AbstractConnector_1 = AbstractConnector$1;
	const Redis_1 = requireRedis();
	const FailoverDetector_1 = FailoverDetector$1;
	const debug = (0, utils_1.Debug)("SentinelConnector");
	class SentinelConnector$1 extends AbstractConnector_1.default {
	    constructor(options) {
	        super(options.disconnectTimeout);
	        this.options = options;
	        this.emitter = null;
	        this.failoverDetector = null;
	        if (!this.options.sentinels.length) {
	            throw new Error("Requires at least one sentinel to connect to.");
	        }
	        if (!this.options.name) {
	            throw new Error("Requires the name of master.");
	        }
	        this.sentinelIterator = new SentinelIterator_1.default(this.options.sentinels);
	    }
	    check(info) {
	        const roleMatches = !info.role || this.options.role === info.role;
	        if (!roleMatches) {
	            debug("role invalid, expected %s, but got %s", this.options.role, info.role);
	            // Start from the next item.
	            // Note that `reset` will move the cursor to the previous element,
	            // so we advance two steps here.
	            this.sentinelIterator.next();
	            this.sentinelIterator.next();
	            this.sentinelIterator.reset(true);
	        }
	        return roleMatches;
	    }
	    disconnect() {
	        super.disconnect();
	        if (this.failoverDetector) {
	            this.failoverDetector.cleanup();
	        }
	    }
	    connect(eventEmitter) {
	        this.connecting = true;
	        this.retryAttempts = 0;
	        let lastError;
	        const connectToNext = async () => {
	            const endpoint = this.sentinelIterator.next();
	            if (endpoint.done) {
	                this.sentinelIterator.reset(false);
	                const retryDelay = typeof this.options.sentinelRetryStrategy === "function"
	                    ? this.options.sentinelRetryStrategy(++this.retryAttempts)
	                    : null;
	                let errorMsg = typeof retryDelay !== "number"
	                    ? "All sentinels are unreachable and retry is disabled."
	                    : `All sentinels are unreachable. Retrying from scratch after ${retryDelay}ms.`;
	                if (lastError) {
	                    errorMsg += ` Last error: ${lastError.message}`;
	                }
	                debug(errorMsg);
	                const error = new Error(errorMsg);
	                if (typeof retryDelay === "number") {
	                    eventEmitter("error", error);
	                    await new Promise((resolve) => setTimeout(resolve, retryDelay));
	                    return connectToNext();
	                }
	                else {
	                    throw error;
	                }
	            }
	            let resolved = null;
	            let err = null;
	            try {
	                resolved = await this.resolve(endpoint.value);
	            }
	            catch (error) {
	                err = error;
	            }
	            if (!this.connecting) {
	                throw new Error(utils_1.CONNECTION_CLOSED_ERROR_MSG);
	            }
	            const endpointAddress = endpoint.value.host + ":" + endpoint.value.port;
	            if (resolved) {
	                debug("resolved: %s:%s from sentinel %s", resolved.host, resolved.port, endpointAddress);
	                if (this.options.enableTLSForSentinelMode && this.options.tls) {
	                    Object.assign(resolved, this.options.tls);
	                    this.stream = (0, tls_1.connect)(resolved);
	                    this.stream.once("secureConnect", this.initFailoverDetector.bind(this));
	                }
	                else {
	                    this.stream = (0, net_1.createConnection)(resolved);
	                    this.stream.once("connect", this.initFailoverDetector.bind(this));
	                }
	                this.stream.once("error", (err) => {
	                    this.firstError = err;
	                });
	                return this.stream;
	            }
	            else {
	                const errorMsg = err
	                    ? "failed to connect to sentinel " +
	                        endpointAddress +
	                        " because " +
	                        err.message
	                    : "connected to sentinel " +
	                        endpointAddress +
	                        " successfully, but got an invalid reply: " +
	                        resolved;
	                debug(errorMsg);
	                eventEmitter("sentinelError", new Error(errorMsg));
	                if (err) {
	                    lastError = err;
	                }
	                return connectToNext();
	            }
	        };
	        return connectToNext();
	    }
	    async updateSentinels(client) {
	        if (!this.options.updateSentinels) {
	            return;
	        }
	        const result = await client.sentinel("sentinels", this.options.name);
	        if (!Array.isArray(result)) {
	            return;
	        }
	        result
	            .map(utils_1.packObject)
	            .forEach((sentinel) => {
	            const flags = sentinel.flags ? sentinel.flags.split(",") : [];
	            if (flags.indexOf("disconnected") === -1 &&
	                sentinel.ip &&
	                sentinel.port) {
	                const endpoint = this.sentinelNatResolve(addressResponseToAddress(sentinel));
	                if (this.sentinelIterator.add(endpoint)) {
	                    debug("adding sentinel %s:%s", endpoint.host, endpoint.port);
	                }
	            }
	        });
	        debug("Updated internal sentinels: %s", this.sentinelIterator);
	    }
	    async resolveMaster(client) {
	        const result = await client.sentinel("get-master-addr-by-name", this.options.name);
	        await this.updateSentinels(client);
	        return this.sentinelNatResolve(Array.isArray(result)
	            ? { host: result[0], port: Number(result[1]) }
	            : null);
	    }
	    async resolveSlave(client) {
	        const result = await client.sentinel("slaves", this.options.name);
	        if (!Array.isArray(result)) {
	            return null;
	        }
	        const availableSlaves = result
	            .map(utils_1.packObject)
	            .filter((slave) => slave.flags && !slave.flags.match(/(disconnected|s_down|o_down)/));
	        return this.sentinelNatResolve(selectPreferredSentinel(availableSlaves, this.options.preferredSlaves));
	    }
	    sentinelNatResolve(item) {
	        if (!item || !this.options.natMap)
	            return item;
	        return this.options.natMap[`${item.host}:${item.port}`] || item;
	    }
	    connectToSentinel(endpoint, options) {
	        const redis = new Redis_1.default({
	            port: endpoint.port || 26379,
	            host: endpoint.host,
	            username: this.options.sentinelUsername || null,
	            password: this.options.sentinelPassword || null,
	            family: endpoint.family ||
	                // @ts-expect-error
	                ("path" in this.options && this.options.path
	                    ? undefined
	                    : // @ts-expect-error
	                        this.options.family),
	            tls: this.options.sentinelTLS,
	            retryStrategy: null,
	            enableReadyCheck: false,
	            connectTimeout: this.options.connectTimeout,
	            commandTimeout: this.options.sentinelCommandTimeout,
	            ...options,
	        });
	        // @ts-expect-error
	        return redis;
	    }
	    async resolve(endpoint) {
	        const client = this.connectToSentinel(endpoint);
	        // ignore the errors since resolve* methods will handle them
	        client.on("error", noop);
	        try {
	            if (this.options.role === "slave") {
	                return await this.resolveSlave(client);
	            }
	            else {
	                return await this.resolveMaster(client);
	            }
	        }
	        finally {
	            client.disconnect();
	        }
	    }
	    async initFailoverDetector() {
	        var _a;
	        if (!this.options.failoverDetector) {
	            return;
	        }
	        // Move the current sentinel to the first position
	        this.sentinelIterator.reset(true);
	        const sentinels = [];
	        // In case of a large amount of sentinels, limit the number of concurrent connections
	        while (sentinels.length < this.options.sentinelMaxConnections) {
	            const { done, value } = this.sentinelIterator.next();
	            if (done) {
	                break;
	            }
	            const client = this.connectToSentinel(value, {
	                lazyConnect: true,
	                retryStrategy: this.options.sentinelReconnectStrategy,
	            });
	            client.on("reconnecting", () => {
	                var _a;
	                // Tests listen to this event
	                (_a = this.emitter) === null || _a === void 0 ? void 0 : _a.emit("sentinelReconnecting");
	            });
	            sentinels.push({ address: value, client });
	        }
	        this.sentinelIterator.reset(false);
	        if (this.failoverDetector) {
	            // Clean up previous detector
	            this.failoverDetector.cleanup();
	        }
	        this.failoverDetector = new FailoverDetector_1.FailoverDetector(this, sentinels);
	        await this.failoverDetector.subscribe();
	        // Tests listen to this event
	        (_a = this.emitter) === null || _a === void 0 ? void 0 : _a.emit("failoverSubscribed");
	    }
	}
	SentinelConnector.default = SentinelConnector$1;
	function selectPreferredSentinel(availableSlaves, preferredSlaves) {
	    if (availableSlaves.length === 0) {
	        return null;
	    }
	    let selectedSlave;
	    if (typeof preferredSlaves === "function") {
	        selectedSlave = preferredSlaves(availableSlaves);
	    }
	    else if (preferredSlaves !== null && typeof preferredSlaves === "object") {
	        const preferredSlavesArray = Array.isArray(preferredSlaves)
	            ? preferredSlaves
	            : [preferredSlaves];
	        // sort by priority
	        preferredSlavesArray.sort((a, b) => {
	            // default the priority to 1
	            if (!a.prio) {
	                a.prio = 1;
	            }
	            if (!b.prio) {
	                b.prio = 1;
	            }
	            // lowest priority first
	            if (a.prio < b.prio) {
	                return -1;
	            }
	            if (a.prio > b.prio) {
	                return 1;
	            }
	            return 0;
	        });
	        // loop over preferred slaves and return the first match
	        for (let p = 0; p < preferredSlavesArray.length; p++) {
	            for (let a = 0; a < availableSlaves.length; a++) {
	                const slave = availableSlaves[a];
	                if (slave.ip === preferredSlavesArray[p].ip) {
	                    if (slave.port === preferredSlavesArray[p].port) {
	                        selectedSlave = slave;
	                        break;
	                    }
	                }
	            }
	            if (selectedSlave) {
	                break;
	            }
	        }
	    }
	    // if none of the preferred slaves are available, a random available slave is returned
	    if (!selectedSlave) {
	        selectedSlave = (0, utils_1.sample)(availableSlaves);
	    }
	    return addressResponseToAddress(selectedSlave);
	}
	function addressResponseToAddress(input) {
	    return { host: input.ip, port: Number(input.port) };
	}
	function noop() { }
	return SentinelConnector;
}

var hasRequiredConnectors;

function requireConnectors () {
	if (hasRequiredConnectors) return connectors;
	hasRequiredConnectors = 1;
	Object.defineProperty(connectors, "__esModule", { value: true });
	connectors.SentinelConnector = connectors.StandaloneConnector = void 0;
	const StandaloneConnector_1 = StandaloneConnector$1;
	connectors.StandaloneConnector = StandaloneConnector_1.default;
	const SentinelConnector_1 = requireSentinelConnector();
	connectors.SentinelConnector = SentinelConnector_1.default;
	return connectors;
}

var event_handler = {};

var errors$1 = {};

var MaxRetriesPerRequestError$1 = {};

Object.defineProperty(MaxRetriesPerRequestError$1, "__esModule", { value: true });
const redis_errors_1 = redisErrors;
class MaxRetriesPerRequestError extends redis_errors_1.AbortError {
    constructor(maxRetriesPerRequest) {
        const message = `Reached the max retries per request limit (which is ${maxRetriesPerRequest}). Refer to "maxRetriesPerRequest" option for details.`;
        super(message);
        Error.captureStackTrace(this, this.constructor);
    }
    get name() {
        return this.constructor.name;
    }
}
MaxRetriesPerRequestError$1.default = MaxRetriesPerRequestError;

Object.defineProperty(errors$1, "__esModule", { value: true });
errors$1.MaxRetriesPerRequestError = void 0;
const MaxRetriesPerRequestError_1 = MaxRetriesPerRequestError$1;
errors$1.MaxRetriesPerRequestError = MaxRetriesPerRequestError_1.default;

var DataHandler$1 = {};

var redisParserExports = {};
var redisParser = {
  get exports(){ return redisParserExports; },
  set exports(v){ redisParserExports = v; },
};

const Buffer$1 = require$$0$8.Buffer;
const StringDecoder = require$$1$5.StringDecoder;
const decoder = new StringDecoder();
const errors = redisErrors;
const ReplyError = errors.ReplyError;
const ParserError = errors.ParserError;
var bufferPool = Buffer$1.allocUnsafe(32 * 1024);
var bufferOffset = 0;
var interval = null;
var counter = 0;
var notDecreased = 0;

/**
 * Used for integer numbers only
 * @param {JavascriptRedisParser} parser
 * @returns {undefined|number}
 */
function parseSimpleNumbers (parser) {
  const length = parser.buffer.length - 1;
  var offset = parser.offset;
  var number = 0;
  var sign = 1;

  if (parser.buffer[offset] === 45) {
    sign = -1;
    offset++;
  }

  while (offset < length) {
    const c1 = parser.buffer[offset++];
    if (c1 === 13) { // \r\n
      parser.offset = offset + 1;
      return sign * number
    }
    number = (number * 10) + (c1 - 48);
  }
}

/**
 * Used for integer numbers in case of the returnNumbers option
 *
 * Reading the string as parts of n SMI is more efficient than
 * using a string directly.
 *
 * @param {JavascriptRedisParser} parser
 * @returns {undefined|string}
 */
function parseStringNumbers (parser) {
  const length = parser.buffer.length - 1;
  var offset = parser.offset;
  var number = 0;
  var res = '';

  if (parser.buffer[offset] === 45) {
    res += '-';
    offset++;
  }

  while (offset < length) {
    var c1 = parser.buffer[offset++];
    if (c1 === 13) { // \r\n
      parser.offset = offset + 1;
      if (number !== 0) {
        res += number;
      }
      return res
    } else if (number > 429496728) {
      res += (number * 10) + (c1 - 48);
      number = 0;
    } else if (c1 === 48 && number === 0) {
      res += 0;
    } else {
      number = (number * 10) + (c1 - 48);
    }
  }
}

/**
 * Parse a '+' redis simple string response but forward the offsets
 * onto convertBufferRange to generate a string.
 * @param {JavascriptRedisParser} parser
 * @returns {undefined|string|Buffer}
 */
function parseSimpleString (parser) {
  const start = parser.offset;
  const buffer = parser.buffer;
  const length = buffer.length - 1;
  var offset = start;

  while (offset < length) {
    if (buffer[offset++] === 13) { // \r\n
      parser.offset = offset + 1;
      if (parser.optionReturnBuffers === true) {
        return parser.buffer.slice(start, offset - 1)
      }
      return parser.buffer.toString('utf8', start, offset - 1)
    }
  }
}

/**
 * Returns the read length
 * @param {JavascriptRedisParser} parser
 * @returns {undefined|number}
 */
function parseLength (parser) {
  const length = parser.buffer.length - 1;
  var offset = parser.offset;
  var number = 0;

  while (offset < length) {
    const c1 = parser.buffer[offset++];
    if (c1 === 13) {
      parser.offset = offset + 1;
      return number
    }
    number = (number * 10) + (c1 - 48);
  }
}

/**
 * Parse a ':' redis integer response
 *
 * If stringNumbers is activated the parser always returns numbers as string
 * This is important for big numbers (number > Math.pow(2, 53)) as js numbers
 * are 64bit floating point numbers with reduced precision
 *
 * @param {JavascriptRedisParser} parser
 * @returns {undefined|number|string}
 */
function parseInteger (parser) {
  if (parser.optionStringNumbers === true) {
    return parseStringNumbers(parser)
  }
  return parseSimpleNumbers(parser)
}

/**
 * Parse a '$' redis bulk string response
 * @param {JavascriptRedisParser} parser
 * @returns {undefined|null|string}
 */
function parseBulkString (parser) {
  const length = parseLength(parser);
  if (length === undefined) {
    return
  }
  if (length < 0) {
    return null
  }
  const offset = parser.offset + length;
  if (offset + 2 > parser.buffer.length) {
    parser.bigStrSize = offset + 2;
    parser.totalChunkSize = parser.buffer.length;
    parser.bufferCache.push(parser.buffer);
    return
  }
  const start = parser.offset;
  parser.offset = offset + 2;
  if (parser.optionReturnBuffers === true) {
    return parser.buffer.slice(start, offset)
  }
  return parser.buffer.toString('utf8', start, offset)
}

/**
 * Parse a '-' redis error response
 * @param {JavascriptRedisParser} parser
 * @returns {ReplyError}
 */
function parseError (parser) {
  var string = parseSimpleString(parser);
  if (string !== undefined) {
    if (parser.optionReturnBuffers === true) {
      string = string.toString();
    }
    return new ReplyError(string)
  }
}

/**
 * Parsing error handler, resets parser buffer
 * @param {JavascriptRedisParser} parser
 * @param {number} type
 * @returns {undefined}
 */
function handleError (parser, type) {
  const err = new ParserError(
    'Protocol error, got ' + JSON.stringify(String.fromCharCode(type)) + ' as reply type byte',
    JSON.stringify(parser.buffer),
    parser.offset
  );
  parser.buffer = null;
  parser.returnFatalError(err);
}

/**
 * Parse a '*' redis array response
 * @param {JavascriptRedisParser} parser
 * @returns {undefined|null|any[]}
 */
function parseArray (parser) {
  const length = parseLength(parser);
  if (length === undefined) {
    return
  }
  if (length < 0) {
    return null
  }
  const responses = new Array(length);
  return parseArrayElements(parser, responses, 0)
}

/**
 * Push a partly parsed array to the stack
 *
 * @param {JavascriptRedisParser} parser
 * @param {any[]} array
 * @param {number} pos
 * @returns {undefined}
 */
function pushArrayCache (parser, array, pos) {
  parser.arrayCache.push(array);
  parser.arrayPos.push(pos);
}

/**
 * Parse chunked redis array response
 * @param {JavascriptRedisParser} parser
 * @returns {undefined|any[]}
 */
function parseArrayChunks (parser) {
  const tmp = parser.arrayCache.pop();
  var pos = parser.arrayPos.pop();
  if (parser.arrayCache.length) {
    const res = parseArrayChunks(parser);
    if (res === undefined) {
      pushArrayCache(parser, tmp, pos);
      return
    }
    tmp[pos++] = res;
  }
  return parseArrayElements(parser, tmp, pos)
}

/**
 * Parse redis array response elements
 * @param {JavascriptRedisParser} parser
 * @param {Array} responses
 * @param {number} i
 * @returns {undefined|null|any[]}
 */
function parseArrayElements (parser, responses, i) {
  const bufferLength = parser.buffer.length;
  while (i < responses.length) {
    const offset = parser.offset;
    if (parser.offset >= bufferLength) {
      pushArrayCache(parser, responses, i);
      return
    }
    const response = parseType(parser, parser.buffer[parser.offset++]);
    if (response === undefined) {
      if (!(parser.arrayCache.length || parser.bufferCache.length)) {
        parser.offset = offset;
      }
      pushArrayCache(parser, responses, i);
      return
    }
    responses[i] = response;
    i++;
  }

  return responses
}

/**
 * Called the appropriate parser for the specified type.
 *
 * 36: $
 * 43: +
 * 42: *
 * 58: :
 * 45: -
 *
 * @param {JavascriptRedisParser} parser
 * @param {number} type
 * @returns {*}
 */
function parseType (parser, type) {
  switch (type) {
    case 36:
      return parseBulkString(parser)
    case 43:
      return parseSimpleString(parser)
    case 42:
      return parseArray(parser)
    case 58:
      return parseInteger(parser)
    case 45:
      return parseError(parser)
    default:
      return handleError(parser, type)
  }
}

/**
 * Decrease the bufferPool size over time
 *
 * Balance between increasing and decreasing the bufferPool.
 * Decrease the bufferPool by 10% by removing the first 10% of the current pool.
 * @returns {undefined}
 */
function decreaseBufferPool () {
  if (bufferPool.length > 50 * 1024) {
    if (counter === 1 || notDecreased > counter * 2) {
      const minSliceLen = Math.floor(bufferPool.length / 10);
      const sliceLength = minSliceLen < bufferOffset
        ? bufferOffset
        : minSliceLen;
      bufferOffset = 0;
      bufferPool = bufferPool.slice(sliceLength, bufferPool.length);
    } else {
      notDecreased++;
      counter--;
    }
  } else {
    clearInterval(interval);
    counter = 0;
    notDecreased = 0;
    interval = null;
  }
}

/**
 * Check if the requested size fits in the current bufferPool.
 * If it does not, reset and increase the bufferPool accordingly.
 *
 * @param {number} length
 * @returns {undefined}
 */
function resizeBuffer (length) {
  if (bufferPool.length < length + bufferOffset) {
    const multiplier = length > 1024 * 1024 * 75 ? 2 : 3;
    if (bufferOffset > 1024 * 1024 * 111) {
      bufferOffset = 1024 * 1024 * 50;
    }
    bufferPool = Buffer$1.allocUnsafe(length * multiplier + bufferOffset);
    bufferOffset = 0;
    counter++;
    if (interval === null) {
      interval = setInterval(decreaseBufferPool, 50);
    }
  }
}

/**
 * Concat a bulk string containing multiple chunks
 *
 * Notes:
 * 1) The first chunk might contain the whole bulk string including the \r
 * 2) We are only safe to fully add up elements that are neither the first nor any of the last two elements
 *
 * @param {JavascriptRedisParser} parser
 * @returns {String}
 */
function concatBulkString (parser) {
  const list = parser.bufferCache;
  const oldOffset = parser.offset;
  var chunks = list.length;
  var offset = parser.bigStrSize - parser.totalChunkSize;
  parser.offset = offset;
  if (offset <= 2) {
    if (chunks === 2) {
      return list[0].toString('utf8', oldOffset, list[0].length + offset - 2)
    }
    chunks--;
    offset = list[list.length - 2].length + offset;
  }
  var res = decoder.write(list[0].slice(oldOffset));
  for (var i = 1; i < chunks - 1; i++) {
    res += decoder.write(list[i]);
  }
  res += decoder.end(list[i].slice(0, offset - 2));
  return res
}

/**
 * Concat the collected chunks from parser.bufferCache.
 *
 * Increases the bufferPool size beforehand if necessary.
 *
 * @param {JavascriptRedisParser} parser
 * @returns {Buffer}
 */
function concatBulkBuffer (parser) {
  const list = parser.bufferCache;
  const oldOffset = parser.offset;
  const length = parser.bigStrSize - oldOffset - 2;
  var chunks = list.length;
  var offset = parser.bigStrSize - parser.totalChunkSize;
  parser.offset = offset;
  if (offset <= 2) {
    if (chunks === 2) {
      return list[0].slice(oldOffset, list[0].length + offset - 2)
    }
    chunks--;
    offset = list[list.length - 2].length + offset;
  }
  resizeBuffer(length);
  const start = bufferOffset;
  list[0].copy(bufferPool, start, oldOffset, list[0].length);
  bufferOffset += list[0].length - oldOffset;
  for (var i = 1; i < chunks - 1; i++) {
    list[i].copy(bufferPool, bufferOffset);
    bufferOffset += list[i].length;
  }
  list[i].copy(bufferPool, bufferOffset, 0, offset - 2);
  bufferOffset += offset - 2;
  return bufferPool.slice(start, bufferOffset)
}

class JavascriptRedisParser {
  /**
   * Javascript Redis Parser constructor
   * @param {{returnError: Function, returnReply: Function, returnFatalError?: Function, returnBuffers: boolean, stringNumbers: boolean }} options
   * @constructor
   */
  constructor (options) {
    if (!options) {
      throw new TypeError('Options are mandatory.')
    }
    if (typeof options.returnError !== 'function' || typeof options.returnReply !== 'function') {
      throw new TypeError('The returnReply and returnError options have to be functions.')
    }
    this.setReturnBuffers(!!options.returnBuffers);
    this.setStringNumbers(!!options.stringNumbers);
    this.returnError = options.returnError;
    this.returnFatalError = options.returnFatalError || options.returnError;
    this.returnReply = options.returnReply;
    this.reset();
  }

  /**
   * Reset the parser values to the initial state
   *
   * @returns {undefined}
   */
  reset () {
    this.offset = 0;
    this.buffer = null;
    this.bigStrSize = 0;
    this.totalChunkSize = 0;
    this.bufferCache = [];
    this.arrayCache = [];
    this.arrayPos = [];
  }

  /**
   * Set the returnBuffers option
   *
   * @param {boolean} returnBuffers
   * @returns {undefined}
   */
  setReturnBuffers (returnBuffers) {
    if (typeof returnBuffers !== 'boolean') {
      throw new TypeError('The returnBuffers argument has to be a boolean')
    }
    this.optionReturnBuffers = returnBuffers;
  }

  /**
   * Set the stringNumbers option
   *
   * @param {boolean} stringNumbers
   * @returns {undefined}
   */
  setStringNumbers (stringNumbers) {
    if (typeof stringNumbers !== 'boolean') {
      throw new TypeError('The stringNumbers argument has to be a boolean')
    }
    this.optionStringNumbers = stringNumbers;
  }

  /**
   * Parse the redis buffer
   * @param {Buffer} buffer
   * @returns {undefined}
   */
  execute (buffer) {
    if (this.buffer === null) {
      this.buffer = buffer;
      this.offset = 0;
    } else if (this.bigStrSize === 0) {
      const oldLength = this.buffer.length;
      const remainingLength = oldLength - this.offset;
      const newBuffer = Buffer$1.allocUnsafe(remainingLength + buffer.length);
      this.buffer.copy(newBuffer, 0, this.offset, oldLength);
      buffer.copy(newBuffer, remainingLength, 0, buffer.length);
      this.buffer = newBuffer;
      this.offset = 0;
      if (this.arrayCache.length) {
        const arr = parseArrayChunks(this);
        if (arr === undefined) {
          return
        }
        this.returnReply(arr);
      }
    } else if (this.totalChunkSize + buffer.length >= this.bigStrSize) {
      this.bufferCache.push(buffer);
      var tmp = this.optionReturnBuffers ? concatBulkBuffer(this) : concatBulkString(this);
      this.bigStrSize = 0;
      this.bufferCache = [];
      this.buffer = buffer;
      if (this.arrayCache.length) {
        this.arrayCache[0][this.arrayPos[0]++] = tmp;
        tmp = parseArrayChunks(this);
        if (tmp === undefined) {
          return
        }
      }
      this.returnReply(tmp);
    } else {
      this.bufferCache.push(buffer);
      this.totalChunkSize += buffer.length;
      return
    }

    while (this.offset < this.buffer.length) {
      const offset = this.offset;
      const type = this.buffer[this.offset++];
      const response = parseType(this, type);
      if (response === undefined) {
        if (!(this.arrayCache.length || this.bufferCache.length)) {
          this.offset = offset;
        }
        return
      }

      if (type === 45) {
        this.returnError(response);
      } else {
        this.returnReply(response);
      }
    }

    this.buffer = null;
  }
}

var parser = JavascriptRedisParser;

(function (module) {

	module.exports = parser;
} (redisParser));

var SubscriptionSet$1 = {};

Object.defineProperty(SubscriptionSet$1, "__esModule", { value: true });
/**
 * Tiny class to simplify dealing with subscription set
 */
class SubscriptionSet {
    constructor() {
        this.set = {
            subscribe: {},
            psubscribe: {},
            ssubscribe: {},
        };
    }
    add(set, channel) {
        this.set[mapSet(set)][channel] = true;
    }
    del(set, channel) {
        delete this.set[mapSet(set)][channel];
    }
    channels(set) {
        return Object.keys(this.set[mapSet(set)]);
    }
    isEmpty() {
        return (this.channels("subscribe").length === 0 &&
            this.channels("psubscribe").length === 0 &&
            this.channels("ssubscribe").length === 0);
    }
}
SubscriptionSet$1.default = SubscriptionSet;
function mapSet(set) {
    if (set === "unsubscribe") {
        return "subscribe";
    }
    if (set === "punsubscribe") {
        return "psubscribe";
    }
    if (set === "sunsubscribe") {
        return "ssubscribe";
    }
    return set;
}

Object.defineProperty(DataHandler$1, "__esModule", { value: true });
const Command_1 = Command$1;
const utils_1 = utils;
const RedisParser = redisParserExports;
const SubscriptionSet_1 = SubscriptionSet$1;
const debug = (0, utils_1.Debug)("dataHandler");
class DataHandler {
    constructor(redis, parserOptions) {
        this.redis = redis;
        const parser = new RedisParser({
            stringNumbers: parserOptions.stringNumbers,
            returnBuffers: true,
            returnError: (err) => {
                this.returnError(err);
            },
            returnFatalError: (err) => {
                this.returnFatalError(err);
            },
            returnReply: (reply) => {
                this.returnReply(reply);
            },
        });
        redis.stream.on("data", (data) => {
            parser.execute(data);
        });
    }
    returnFatalError(err) {
        err.message += ". Please report this.";
        this.redis.recoverFromFatalError(err, err, { offlineQueue: false });
    }
    returnError(err) {
        const item = this.shiftCommand(err);
        if (!item) {
            return;
        }
        err.command = {
            name: item.command.name,
            args: item.command.args,
        };
        this.redis.handleReconnection(err, item);
    }
    returnReply(reply) {
        if (this.handleMonitorReply(reply)) {
            return;
        }
        if (this.handleSubscriberReply(reply)) {
            return;
        }
        const item = this.shiftCommand(reply);
        if (!item) {
            return;
        }
        if (Command_1.default.checkFlag("ENTER_SUBSCRIBER_MODE", item.command.name)) {
            this.redis.condition.subscriber = new SubscriptionSet_1.default();
            this.redis.condition.subscriber.add(item.command.name, reply[1].toString());
            if (!fillSubCommand(item.command, reply[2])) {
                this.redis.commandQueue.unshift(item);
            }
        }
        else if (Command_1.default.checkFlag("EXIT_SUBSCRIBER_MODE", item.command.name)) {
            if (!fillUnsubCommand(item.command, reply[2])) {
                this.redis.commandQueue.unshift(item);
            }
        }
        else {
            item.command.resolve(reply);
        }
    }
    handleSubscriberReply(reply) {
        if (!this.redis.condition.subscriber) {
            return false;
        }
        const replyType = Array.isArray(reply) ? reply[0].toString() : null;
        debug('receive reply "%s" in subscriber mode', replyType);
        switch (replyType) {
            case "message":
                if (this.redis.listeners("message").length > 0) {
                    // Check if there're listeners to avoid unnecessary `toString()`.
                    this.redis.emit("message", reply[1].toString(), reply[2] ? reply[2].toString() : "");
                }
                this.redis.emit("messageBuffer", reply[1], reply[2]);
                break;
            case "pmessage": {
                const pattern = reply[1].toString();
                if (this.redis.listeners("pmessage").length > 0) {
                    this.redis.emit("pmessage", pattern, reply[2].toString(), reply[3].toString());
                }
                this.redis.emit("pmessageBuffer", pattern, reply[2], reply[3]);
                break;
            }
            case "smessage": {
                if (this.redis.listeners("smessage").length > 0) {
                    this.redis.emit("smessage", reply[1].toString(), reply[2] ? reply[2].toString() : "");
                }
                this.redis.emit("smessageBuffer", reply[1], reply[2]);
                break;
            }
            case "ssubscribe":
            case "subscribe":
            case "psubscribe": {
                const channel = reply[1].toString();
                this.redis.condition.subscriber.add(replyType, channel);
                const item = this.shiftCommand(reply);
                if (!item) {
                    return;
                }
                if (!fillSubCommand(item.command, reply[2])) {
                    this.redis.commandQueue.unshift(item);
                }
                break;
            }
            case "sunsubscribe":
            case "unsubscribe":
            case "punsubscribe": {
                const channel = reply[1] ? reply[1].toString() : null;
                if (channel) {
                    this.redis.condition.subscriber.del(replyType, channel);
                }
                const count = reply[2];
                if (Number(count) === 0) {
                    this.redis.condition.subscriber = false;
                }
                const item = this.shiftCommand(reply);
                if (!item) {
                    return;
                }
                if (!fillUnsubCommand(item.command, count)) {
                    this.redis.commandQueue.unshift(item);
                }
                break;
            }
            default: {
                const item = this.shiftCommand(reply);
                if (!item) {
                    return;
                }
                item.command.resolve(reply);
            }
        }
        return true;
    }
    handleMonitorReply(reply) {
        if (this.redis.status !== "monitoring") {
            return false;
        }
        const replyStr = reply.toString();
        if (replyStr === "OK") {
            // Valid commands in the monitoring mode are AUTH and MONITOR,
            // both of which always reply with 'OK'.
            // So if we got an 'OK', we can make certain that
            // the reply is made to AUTH & MONITOR.
            return false;
        }
        // Since commands sent in the monitoring mode will trigger an exception,
        // any replies we received in the monitoring mode should consider to be
        // realtime monitor data instead of result of commands.
        const len = replyStr.indexOf(" ");
        const timestamp = replyStr.slice(0, len);
        const argIndex = replyStr.indexOf('"');
        const args = replyStr
            .slice(argIndex + 1, -1)
            .split('" "')
            .map((elem) => elem.replace(/\\"/g, '"'));
        const dbAndSource = replyStr.slice(len + 2, argIndex - 2).split(" ");
        this.redis.emit("monitor", timestamp, args, dbAndSource[1], dbAndSource[0]);
        return true;
    }
    shiftCommand(reply) {
        const item = this.redis.commandQueue.shift();
        if (!item) {
            const message = "Command queue state error. If you can reproduce this, please report it.";
            const error = new Error(message +
                (reply instanceof Error
                    ? ` Last error: ${reply.message}`
                    : ` Last reply: ${reply.toString()}`));
            this.redis.emit("error", error);
            return null;
        }
        return item;
    }
}
DataHandler$1.default = DataHandler;
const remainingRepliesMap = new WeakMap();
function fillSubCommand(command, count) {
    let remainingReplies = remainingRepliesMap.has(command)
        ? remainingRepliesMap.get(command)
        : command.args.length;
    remainingReplies -= 1;
    if (remainingReplies <= 0) {
        command.resolve(count);
        remainingRepliesMap.delete(command);
        return true;
    }
    remainingRepliesMap.set(command, remainingReplies);
    return false;
}
function fillUnsubCommand(command, count) {
    let remainingReplies = remainingRepliesMap.has(command)
        ? remainingRepliesMap.get(command)
        : command.args.length;
    if (remainingReplies === 0) {
        if (Number(count) === 0) {
            remainingRepliesMap.delete(command);
            command.resolve(count);
            return true;
        }
        return false;
    }
    remainingReplies -= 1;
    if (remainingReplies <= 0) {
        command.resolve(count);
        return true;
    }
    remainingRepliesMap.set(command, remainingReplies);
    return false;
}

(function (exports) {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.readyHandler = exports.errorHandler = exports.closeHandler = exports.connectHandler = void 0;
	const redis_errors_1 = redisErrors;
	const Command_1 = Command$1;
	const errors_1 = errors$1;
	const utils_1 = utils;
	const DataHandler_1 = DataHandler$1;
	const debug = (0, utils_1.Debug)("connection");
	function connectHandler(self) {
	    return function () {
	        self.setStatus("connect");
	        self.resetCommandQueue();
	        // AUTH command should be processed before any other commands
	        let flushed = false;
	        const { connectionEpoch } = self;
	        if (self.condition.auth) {
	            self.auth(self.condition.auth, function (err) {
	                if (connectionEpoch !== self.connectionEpoch) {
	                    return;
	                }
	                if (err) {
	                    if (err.message.indexOf("no password is set") !== -1) {
	                        console.warn("[WARN] Redis server does not require a password, but a password was supplied.");
	                    }
	                    else if (err.message.indexOf("without any password configured for the default user") !== -1) {
	                        console.warn("[WARN] This Redis server's `default` user does not require a password, but a password was supplied");
	                    }
	                    else if (err.message.indexOf("wrong number of arguments for 'auth' command") !== -1) {
	                        console.warn(`[ERROR] The server returned "wrong number of arguments for 'auth' command". You are probably passing both username and password to Redis version 5 or below. You should only pass the 'password' option for Redis version 5 and under.`);
	                    }
	                    else {
	                        flushed = true;
	                        self.recoverFromFatalError(err, err);
	                    }
	                }
	            });
	        }
	        if (self.condition.select) {
	            self.select(self.condition.select).catch((err) => {
	                // If the node is in cluster mode, select is disallowed.
	                // In this case, reconnect won't help.
	                self.silentEmit("error", err);
	            });
	        }
	        if (!self.options.enableReadyCheck) {
	            exports.readyHandler(self)();
	        }
	        /*
	          No need to keep the reference of DataHandler here
	          because we don't need to do the cleanup.
	          `Stream#end()` will remove all listeners for us.
	        */
	        new DataHandler_1.default(self, {
	            stringNumbers: self.options.stringNumbers,
	        });
	        if (self.options.enableReadyCheck) {
	            self._readyCheck(function (err, info) {
	                if (connectionEpoch !== self.connectionEpoch) {
	                    return;
	                }
	                if (err) {
	                    if (!flushed) {
	                        self.recoverFromFatalError(new Error("Ready check failed: " + err.message), err);
	                    }
	                }
	                else {
	                    if (self.connector.check(info)) {
	                        exports.readyHandler(self)();
	                    }
	                    else {
	                        self.disconnect(true);
	                    }
	                }
	            });
	        }
	    };
	}
	exports.connectHandler = connectHandler;
	function abortError(command) {
	    const err = new redis_errors_1.AbortError("Command aborted due to connection close");
	    err.command = {
	        name: command.name,
	        args: command.args,
	    };
	    return err;
	}
	// If a contiguous set of pipeline commands starts from index zero then they
	// can be safely reattempted. If however we have a chain of pipelined commands
	// starting at index 1 or more it means we received a partial response before
	// the connection close and those pipelined commands must be aborted. For
	// example, if the queue looks like this: [2, 3, 4, 0, 1, 2] then after
	// aborting and purging we'll have a queue that looks like this: [0, 1, 2]
	function abortIncompletePipelines(commandQueue) {
	    var _a;
	    let expectedIndex = 0;
	    for (let i = 0; i < commandQueue.length;) {
	        const command = (_a = commandQueue.peekAt(i)) === null || _a === void 0 ? void 0 : _a.command;
	        const pipelineIndex = command.pipelineIndex;
	        if (pipelineIndex === undefined || pipelineIndex === 0) {
	            expectedIndex = 0;
	        }
	        if (pipelineIndex !== undefined && pipelineIndex !== expectedIndex++) {
	            commandQueue.remove(i, 1);
	            command.reject(abortError(command));
	            continue;
	        }
	        i++;
	    }
	}
	// If only a partial transaction result was received before connection close,
	// we have to abort any transaction fragments that may have ended up in the
	// offline queue
	function abortTransactionFragments(commandQueue) {
	    var _a;
	    for (let i = 0; i < commandQueue.length;) {
	        const command = (_a = commandQueue.peekAt(i)) === null || _a === void 0 ? void 0 : _a.command;
	        if (command.name === "multi") {
	            break;
	        }
	        if (command.name === "exec") {
	            commandQueue.remove(i, 1);
	            command.reject(abortError(command));
	            break;
	        }
	        if (command.inTransaction) {
	            commandQueue.remove(i, 1);
	            command.reject(abortError(command));
	        }
	        else {
	            i++;
	        }
	    }
	}
	function closeHandler(self) {
	    return function () {
	        const prevStatus = self.status;
	        self.setStatus("close");
	        if (self.commandQueue.length) {
	            abortIncompletePipelines(self.commandQueue);
	        }
	        if (self.offlineQueue.length) {
	            abortTransactionFragments(self.offlineQueue);
	        }
	        if (prevStatus === "ready") {
	            if (!self.prevCondition) {
	                self.prevCondition = self.condition;
	            }
	            if (self.commandQueue.length) {
	                self.prevCommandQueue = self.commandQueue;
	            }
	        }
	        if (self.manuallyClosing) {
	            self.manuallyClosing = false;
	            debug("skip reconnecting since the connection is manually closed.");
	            return close();
	        }
	        if (typeof self.options.retryStrategy !== "function") {
	            debug("skip reconnecting because `retryStrategy` is not a function");
	            return close();
	        }
	        const retryDelay = self.options.retryStrategy(++self.retryAttempts);
	        if (typeof retryDelay !== "number") {
	            debug("skip reconnecting because `retryStrategy` doesn't return a number");
	            return close();
	        }
	        debug("reconnect in %sms", retryDelay);
	        self.setStatus("reconnecting", retryDelay);
	        self.reconnectTimeout = setTimeout(function () {
	            self.reconnectTimeout = null;
	            self.connect().catch(utils_1.noop);
	        }, retryDelay);
	        const { maxRetriesPerRequest } = self.options;
	        if (typeof maxRetriesPerRequest === "number") {
	            if (maxRetriesPerRequest < 0) {
	                debug("maxRetriesPerRequest is negative, ignoring...");
	            }
	            else {
	                const remainder = self.retryAttempts % (maxRetriesPerRequest + 1);
	                if (remainder === 0) {
	                    debug("reach maxRetriesPerRequest limitation, flushing command queue...");
	                    self.flushQueue(new errors_1.MaxRetriesPerRequestError(maxRetriesPerRequest));
	                }
	            }
	        }
	    };
	    function close() {
	        self.setStatus("end");
	        self.flushQueue(new Error(utils_1.CONNECTION_CLOSED_ERROR_MSG));
	    }
	}
	exports.closeHandler = closeHandler;
	function errorHandler(self) {
	    return function (error) {
	        debug("error: %s", error);
	        self.silentEmit("error", error);
	    };
	}
	exports.errorHandler = errorHandler;
	function readyHandler(self) {
	    return function () {
	        self.setStatus("ready");
	        self.retryAttempts = 0;
	        if (self.options.monitor) {
	            self.call("monitor").then(() => self.setStatus("monitoring"), (error) => self.emit("error", error));
	            const { sendCommand } = self;
	            self.sendCommand = function (command) {
	                if (Command_1.default.checkFlag("VALID_IN_MONITOR_MODE", command.name)) {
	                    return sendCommand.call(self, command);
	                }
	                command.reject(new Error("Connection is in monitoring mode, can't process commands."));
	                return command.promise;
	            };
	            self.once("close", function () {
	                delete self.sendCommand;
	            });
	            return;
	        }
	        const finalSelect = self.prevCondition
	            ? self.prevCondition.select
	            : self.condition.select;
	        if (self.options.connectionName) {
	            debug("set the connection name [%s]", self.options.connectionName);
	            self.client("setname", self.options.connectionName).catch(utils_1.noop);
	        }
	        if (self.options.readOnly) {
	            debug("set the connection to readonly mode");
	            self.readonly().catch(utils_1.noop);
	        }
	        if (self.prevCondition) {
	            const condition = self.prevCondition;
	            self.prevCondition = null;
	            if (condition.subscriber && self.options.autoResubscribe) {
	                // We re-select the previous db first since
	                // `SELECT` command is not valid in sub mode.
	                if (self.condition.select !== finalSelect) {
	                    debug("connect to db [%d]", finalSelect);
	                    self.select(finalSelect);
	                }
	                const subscribeChannels = condition.subscriber.channels("subscribe");
	                if (subscribeChannels.length) {
	                    debug("subscribe %d channels", subscribeChannels.length);
	                    self.subscribe(subscribeChannels);
	                }
	                const psubscribeChannels = condition.subscriber.channels("psubscribe");
	                if (psubscribeChannels.length) {
	                    debug("psubscribe %d channels", psubscribeChannels.length);
	                    self.psubscribe(psubscribeChannels);
	                }
	                const ssubscribeChannels = condition.subscriber.channels("ssubscribe");
	                if (ssubscribeChannels.length) {
	                    debug("ssubscribe %d channels", ssubscribeChannels.length);
	                    self.ssubscribe(ssubscribeChannels);
	                }
	            }
	        }
	        if (self.prevCommandQueue) {
	            if (self.options.autoResendUnfulfilledCommands) {
	                debug("resend %d unfulfilled commands", self.prevCommandQueue.length);
	                while (self.prevCommandQueue.length > 0) {
	                    const item = self.prevCommandQueue.shift();
	                    if (item.select !== self.condition.select &&
	                        item.command.name !== "select") {
	                        self.select(item.select);
	                    }
	                    self.sendCommand(item.command, item.stream);
	                }
	            }
	            else {
	                self.prevCommandQueue = null;
	            }
	        }
	        if (self.offlineQueue.length) {
	            debug("send %d commands in offline queue", self.offlineQueue.length);
	            const offlineQueue = self.offlineQueue;
	            self.resetOfflineQueue();
	            while (offlineQueue.length > 0) {
	                const item = offlineQueue.shift();
	                if (item.select !== self.condition.select &&
	                    item.command.name !== "select") {
	                    self.select(item.select);
	                }
	                self.sendCommand(item.command, item.stream);
	            }
	        }
	        if (self.condition.select !== finalSelect) {
	            debug("connect to db [%d]", finalSelect);
	            self.select(finalSelect);
	        }
	    };
	}
	exports.readyHandler = readyHandler;
} (event_handler));

var RedisOptions = {};

Object.defineProperty(RedisOptions, "__esModule", { value: true });
RedisOptions.DEFAULT_REDIS_OPTIONS = void 0;
RedisOptions.DEFAULT_REDIS_OPTIONS = {
    // Connection
    port: 6379,
    host: "localhost",
    family: 4,
    connectTimeout: 10000,
    disconnectTimeout: 2000,
    retryStrategy: function (times) {
        return Math.min(times * 50, 2000);
    },
    keepAlive: 0,
    noDelay: true,
    connectionName: null,
    // Sentinel
    sentinels: null,
    name: null,
    role: "master",
    sentinelRetryStrategy: function (times) {
        return Math.min(times * 10, 1000);
    },
    sentinelReconnectStrategy: function () {
        // This strategy only applies when sentinels are used for detecting
        // a failover, not during initial master resolution.
        // The deployment can still function when some of the sentinels are down
        // for a long period of time, so we may not want to attempt reconnection
        // very often. Therefore the default interval is fairly long (1 minute).
        return 60000;
    },
    natMap: null,
    enableTLSForSentinelMode: false,
    updateSentinels: true,
    failoverDetector: false,
    // Status
    username: null,
    password: null,
    db: 0,
    // Others
    enableOfflineQueue: true,
    enableReadyCheck: true,
    autoResubscribe: true,
    autoResendUnfulfilledCommands: true,
    lazyConnect: false,
    keyPrefix: "",
    reconnectOnError: null,
    readOnly: false,
    stringNumbers: false,
    maxRetriesPerRequest: 20,
    maxLoadingRetryTime: 10000,
    enableAutoPipelining: false,
    autoPipeliningIgnoredCommands: [],
    sentinelMaxConnections: 10,
};

var hasRequiredRedis;

function requireRedis () {
	if (hasRequiredRedis) return Redis$1;
	hasRequiredRedis = 1;
	Object.defineProperty(Redis$1, "__esModule", { value: true });
	const commands_1 = built$1;
	const events_1 = require$$1$3;
	const standard_as_callback_1 = built;
	const cluster_1 = requireCluster();
	const Command_1 = Command$1;
	const connectors_1 = requireConnectors();
	const SentinelConnector_1 = requireSentinelConnector();
	const eventHandler = event_handler;
	const RedisOptions_1 = RedisOptions;
	const ScanStream_1 = ScanStream$1;
	const transaction_1 = transaction;
	const utils_1 = utils;
	const applyMixin_1 = applyMixin$1;
	const Commander_1 = Commander$1;
	const lodash_1 = lodash;
	const Deque = denque;
	const debug = (0, utils_1.Debug)("redis");
	/**
	 * This is the major component of ioredis.
	 * Use it to connect to a standalone Redis server or Sentinels.
	 *
	 * ```typescript
	 * const redis = new Redis(); // Default port is 6379
	 * async function main() {
	 *   redis.set("foo", "bar");
	 *   redis.get("foo", (err, result) => {
	 *     // `result` should be "bar"
	 *     console.log(err, result);
	 *   });
	 *   // Or use Promise
	 *   const result = await redis.get("foo");
	 * }
	 * ```
	 */
	class Redis extends Commander_1.default {
	    constructor(arg1, arg2, arg3) {
	        super();
	        this.status = "wait";
	        /**
	         * @ignore
	         */
	        this.isCluster = false;
	        this.reconnectTimeout = null;
	        this.connectionEpoch = 0;
	        this.retryAttempts = 0;
	        this.manuallyClosing = false;
	        // Prepare autopipelines structures
	        this._autoPipelines = new Map();
	        this._runningAutoPipelines = new Set();
	        this.parseOptions(arg1, arg2, arg3);
	        events_1.EventEmitter.call(this);
	        this.resetCommandQueue();
	        this.resetOfflineQueue();
	        if (this.options.Connector) {
	            this.connector = new this.options.Connector(this.options);
	        }
	        else if (this.options.sentinels) {
	            const sentinelConnector = new SentinelConnector_1.default(this.options);
	            sentinelConnector.emitter = this;
	            this.connector = sentinelConnector;
	        }
	        else {
	            this.connector = new connectors_1.StandaloneConnector(this.options);
	        }
	        if (this.options.scripts) {
	            Object.entries(this.options.scripts).forEach(([name, definition]) => {
	                this.defineCommand(name, definition);
	            });
	        }
	        // end(or wait) -> connecting -> connect -> ready -> end
	        if (this.options.lazyConnect) {
	            this.setStatus("wait");
	        }
	        else {
	            this.connect().catch(lodash_1.noop);
	        }
	    }
	    /**
	     * Create a Redis instance.
	     * This is the same as `new Redis()` but is included for compatibility with node-redis.
	     */
	    static createClient(...args) {
	        return new Redis(...args);
	    }
	    get autoPipelineQueueSize() {
	        let queued = 0;
	        for (const pipeline of this._autoPipelines.values()) {
	            queued += pipeline.length;
	        }
	        return queued;
	    }
	    /**
	     * Create a connection to Redis.
	     * This method will be invoked automatically when creating a new Redis instance
	     * unless `lazyConnect: true` is passed.
	     *
	     * When calling this method manually, a Promise is returned, which will
	     * be resolved when the connection status is ready.
	     */
	    connect(callback) {
	        const promise = new Promise((resolve, reject) => {
	            if (this.status === "connecting" ||
	                this.status === "connect" ||
	                this.status === "ready") {
	                reject(new Error("Redis is already connecting/connected"));
	                return;
	            }
	            this.connectionEpoch += 1;
	            this.setStatus("connecting");
	            const { options } = this;
	            this.condition = {
	                select: options.db,
	                auth: options.username
	                    ? [options.username, options.password]
	                    : options.password,
	                subscriber: false,
	            };
	            const _this = this;
	            (0, standard_as_callback_1.default)(this.connector.connect(function (type, err) {
	                _this.silentEmit(type, err);
	            }), function (err, stream) {
	                if (err) {
	                    _this.flushQueue(err);
	                    _this.silentEmit("error", err);
	                    reject(err);
	                    _this.setStatus("end");
	                    return;
	                }
	                let CONNECT_EVENT = options.tls ? "secureConnect" : "connect";
	                if ("sentinels" in options &&
	                    options.sentinels &&
	                    !options.enableTLSForSentinelMode) {
	                    CONNECT_EVENT = "connect";
	                }
	                _this.stream = stream;
	                if (options.noDelay) {
	                    stream.setNoDelay(true);
	                }
	                // Node ignores setKeepAlive before connect, therefore we wait for the event:
	                // https://github.com/nodejs/node/issues/31663
	                if (typeof options.keepAlive === "number") {
	                    if (stream.connecting) {
	                        stream.once(CONNECT_EVENT, () => {
	                            stream.setKeepAlive(true, options.keepAlive);
	                        });
	                    }
	                    else {
	                        stream.setKeepAlive(true, options.keepAlive);
	                    }
	                }
	                if (stream.connecting) {
	                    stream.once(CONNECT_EVENT, eventHandler.connectHandler(_this));
	                    if (options.connectTimeout) {
	                        /*
	                         * Typically, Socket#setTimeout(0) will clear the timer
	                         * set before. However, in some platforms (Electron 3.x~4.x),
	                         * the timer will not be cleared. So we introduce a variable here.
	                         *
	                         * See https://github.com/electron/electron/issues/14915
	                         */
	                        let connectTimeoutCleared = false;
	                        stream.setTimeout(options.connectTimeout, function () {
	                            if (connectTimeoutCleared) {
	                                return;
	                            }
	                            stream.setTimeout(0);
	                            stream.destroy();
	                            const err = new Error("connect ETIMEDOUT");
	                            // @ts-expect-error
	                            err.errorno = "ETIMEDOUT";
	                            // @ts-expect-error
	                            err.code = "ETIMEDOUT";
	                            // @ts-expect-error
	                            err.syscall = "connect";
	                            eventHandler.errorHandler(_this)(err);
	                        });
	                        stream.once(CONNECT_EVENT, function () {
	                            connectTimeoutCleared = true;
	                            stream.setTimeout(0);
	                        });
	                    }
	                }
	                else if (stream.destroyed) {
	                    const firstError = _this.connector.firstError;
	                    if (firstError) {
	                        process.nextTick(() => {
	                            eventHandler.errorHandler(_this)(firstError);
	                        });
	                    }
	                    process.nextTick(eventHandler.closeHandler(_this));
	                }
	                else {
	                    process.nextTick(eventHandler.connectHandler(_this));
	                }
	                if (!stream.destroyed) {
	                    stream.once("error", eventHandler.errorHandler(_this));
	                    stream.once("close", eventHandler.closeHandler(_this));
	                }
	                const connectionReadyHandler = function () {
	                    _this.removeListener("close", connectionCloseHandler);
	                    resolve();
	                };
	                var connectionCloseHandler = function () {
	                    _this.removeListener("ready", connectionReadyHandler);
	                    reject(new Error(utils_1.CONNECTION_CLOSED_ERROR_MSG));
	                };
	                _this.once("ready", connectionReadyHandler);
	                _this.once("close", connectionCloseHandler);
	            });
	        });
	        return (0, standard_as_callback_1.default)(promise, callback);
	    }
	    /**
	     * Disconnect from Redis.
	     *
	     * This method closes the connection immediately,
	     * and may lose some pending replies that haven't written to client.
	     * If you want to wait for the pending replies, use Redis#quit instead.
	     */
	    disconnect(reconnect = false) {
	        if (!reconnect) {
	            this.manuallyClosing = true;
	        }
	        if (this.reconnectTimeout && !reconnect) {
	            clearTimeout(this.reconnectTimeout);
	            this.reconnectTimeout = null;
	        }
	        if (this.status === "wait") {
	            eventHandler.closeHandler(this)();
	        }
	        else {
	            this.connector.disconnect();
	        }
	    }
	    /**
	     * Disconnect from Redis.
	     *
	     * @deprecated
	     */
	    end() {
	        this.disconnect();
	    }
	    /**
	     * Create a new instance with the same options as the current one.
	     *
	     * @example
	     * ```js
	     * var redis = new Redis(6380);
	     * var anotherRedis = redis.duplicate();
	     * ```
	     */
	    duplicate(override) {
	        return new Redis({ ...this.options, ...override });
	    }
	    /**
	     * Mode of the connection.
	     *
	     * One of `"normal"`, `"subscriber"`, or `"monitor"`. When the connection is
	     * not in `"normal"` mode, certain commands are not allowed.
	     */
	    get mode() {
	        var _a;
	        return this.options.monitor
	            ? "monitor"
	            : ((_a = this.condition) === null || _a === void 0 ? void 0 : _a.subscriber)
	                ? "subscriber"
	                : "normal";
	    }
	    /**
	     * Listen for all requests received by the server in real time.
	     *
	     * This command will create a new connection to Redis and send a
	     * MONITOR command via the new connection in order to avoid disturbing
	     * the current connection.
	     *
	     * @param callback The callback function. If omit, a promise will be returned.
	     * @example
	     * ```js
	     * var redis = new Redis();
	     * redis.monitor(function (err, monitor) {
	     *   // Entering monitoring mode.
	     *   monitor.on('monitor', function (time, args, source, database) {
	     *     console.log(time + ": " + util.inspect(args));
	     *   });
	     * });
	     *
	     * // supports promise as well as other commands
	     * redis.monitor().then(function (monitor) {
	     *   monitor.on('monitor', function (time, args, source, database) {
	     *     console.log(time + ": " + util.inspect(args));
	     *   });
	     * });
	     * ```
	     */
	    monitor(callback) {
	        const monitorInstance = this.duplicate({
	            monitor: true,
	            lazyConnect: false,
	        });
	        return (0, standard_as_callback_1.default)(new Promise(function (resolve, reject) {
	            monitorInstance.once("error", reject);
	            monitorInstance.once("monitoring", function () {
	                resolve(monitorInstance);
	            });
	        }), callback);
	    }
	    /**
	     * Send a command to Redis
	     *
	     * This method is used internally and in most cases you should not
	     * use it directly. If you need to send a command that is not supported
	     * by the library, you can use the `call` method:
	     *
	     * ```js
	     * const redis = new Redis();
	     *
	     * redis.call('set', 'foo', 'bar');
	     * // or
	     * redis.call(['set', 'foo', 'bar']);
	     * ```
	     *
	     * @ignore
	     */
	    sendCommand(command, stream) {
	        var _a, _b;
	        if (this.status === "wait") {
	            this.connect().catch(lodash_1.noop);
	        }
	        if (this.status === "end") {
	            command.reject(new Error(utils_1.CONNECTION_CLOSED_ERROR_MSG));
	            return command.promise;
	        }
	        if (((_a = this.condition) === null || _a === void 0 ? void 0 : _a.subscriber) &&
	            !Command_1.default.checkFlag("VALID_IN_SUBSCRIBER_MODE", command.name)) {
	            command.reject(new Error("Connection in subscriber mode, only subscriber commands may be used"));
	            return command.promise;
	        }
	        if (typeof this.options.commandTimeout === "number") {
	            command.setTimeout(this.options.commandTimeout);
	        }
	        let writable = this.status === "ready" ||
	            (!stream &&
	                this.status === "connect" &&
	                (0, commands_1.exists)(command.name) &&
	                (0, commands_1.hasFlag)(command.name, "loading"));
	        if (!this.stream) {
	            writable = false;
	        }
	        else if (!this.stream.writable) {
	            writable = false;
	            // @ts-expect-error
	        }
	        else if (this.stream._writableState && this.stream._writableState.ended) {
	            // TODO: We should be able to remove this as the PR has already been merged.
	            // https://github.com/iojs/io.js/pull/1217
	            writable = false;
	        }
	        if (!writable) {
	            if (!this.options.enableOfflineQueue) {
	                command.reject(new Error("Stream isn't writeable and enableOfflineQueue options is false"));
	                return command.promise;
	            }
	            if (command.name === "quit" && this.offlineQueue.length === 0) {
	                this.disconnect();
	                command.resolve(Buffer.from("OK"));
	                return command.promise;
	            }
	            // @ts-expect-error
	            if (debug.enabled) {
	                debug("queue command[%s]: %d -> %s(%o)", this._getDescription(), this.condition.select, command.name, command.args);
	            }
	            this.offlineQueue.push({
	                command: command,
	                stream: stream,
	                select: this.condition.select,
	            });
	        }
	        else {
	            // @ts-expect-error
	            if (debug.enabled) {
	                debug("write command[%s]: %d -> %s(%o)", this._getDescription(), (_b = this.condition) === null || _b === void 0 ? void 0 : _b.select, command.name, command.args);
	            }
	            if (stream) {
	                if ("isPipeline" in stream && stream.isPipeline) {
	                    stream.write(command.toWritable(stream.destination.redis.stream));
	                }
	                else {
	                    stream.write(command.toWritable(stream));
	                }
	            }
	            else {
	                this.stream.write(command.toWritable(this.stream));
	            }
	            this.commandQueue.push({
	                command: command,
	                stream: stream,
	                select: this.condition.select,
	            });
	            if (Command_1.default.checkFlag("WILL_DISCONNECT", command.name)) {
	                this.manuallyClosing = true;
	            }
	            if (this.options.socketTimeout !== undefined && this.socketTimeoutTimer === undefined) {
	                this.setSocketTimeout();
	            }
	        }
	        if (command.name === "select" && (0, utils_1.isInt)(command.args[0])) {
	            const db = parseInt(command.args[0], 10);
	            if (this.condition.select !== db) {
	                this.condition.select = db;
	                this.emit("select", db);
	                debug("switch to db [%d]", this.condition.select);
	            }
	        }
	        return command.promise;
	    }
	    setSocketTimeout() {
	        this.socketTimeoutTimer = setTimeout(() => {
	            this.stream.destroy(new Error(`Socket timeout. Expecting data, but didn't receive any in ${this.options.socketTimeout}ms.`));
	            this.socketTimeoutTimer = undefined;
	        }, this.options.socketTimeout);
	        // this handler must run after the "data" handler in "DataHandler"
	        // so that `this.commandQueue.length` will be updated
	        this.stream.once("data", () => {
	            clearTimeout(this.socketTimeoutTimer);
	            this.socketTimeoutTimer = undefined;
	            if (this.commandQueue.length === 0)
	                return;
	            this.setSocketTimeout();
	        });
	    }
	    scanStream(options) {
	        return this.createScanStream("scan", { options });
	    }
	    scanBufferStream(options) {
	        return this.createScanStream("scanBuffer", { options });
	    }
	    sscanStream(key, options) {
	        return this.createScanStream("sscan", { key, options });
	    }
	    sscanBufferStream(key, options) {
	        return this.createScanStream("sscanBuffer", { key, options });
	    }
	    hscanStream(key, options) {
	        return this.createScanStream("hscan", { key, options });
	    }
	    hscanBufferStream(key, options) {
	        return this.createScanStream("hscanBuffer", { key, options });
	    }
	    zscanStream(key, options) {
	        return this.createScanStream("zscan", { key, options });
	    }
	    zscanBufferStream(key, options) {
	        return this.createScanStream("zscanBuffer", { key, options });
	    }
	    /**
	     * Emit only when there's at least one listener.
	     *
	     * @ignore
	     */
	    silentEmit(eventName, arg) {
	        let error;
	        if (eventName === "error") {
	            error = arg;
	            if (this.status === "end") {
	                return;
	            }
	            if (this.manuallyClosing) {
	                // ignore connection related errors when manually disconnecting
	                if (error instanceof Error &&
	                    (error.message === utils_1.CONNECTION_CLOSED_ERROR_MSG ||
	                        // @ts-expect-error
	                        error.syscall === "connect" ||
	                        // @ts-expect-error
	                        error.syscall === "read")) {
	                    return;
	                }
	            }
	        }
	        if (this.listeners(eventName).length > 0) {
	            return this.emit.apply(this, arguments);
	        }
	        if (error && error instanceof Error) {
	            console.error("[ioredis] Unhandled error event:", error.stack);
	        }
	        return false;
	    }
	    /**
	     * @ignore
	     */
	    recoverFromFatalError(_commandError, err, options) {
	        this.flushQueue(err, options);
	        this.silentEmit("error", err);
	        this.disconnect(true);
	    }
	    /**
	     * @ignore
	     */
	    handleReconnection(err, item) {
	        var _a;
	        let needReconnect = false;
	        if (this.options.reconnectOnError) {
	            needReconnect = this.options.reconnectOnError(err);
	        }
	        switch (needReconnect) {
	            case 1:
	            case true:
	                if (this.status !== "reconnecting") {
	                    this.disconnect(true);
	                }
	                item.command.reject(err);
	                break;
	            case 2:
	                if (this.status !== "reconnecting") {
	                    this.disconnect(true);
	                }
	                if (((_a = this.condition) === null || _a === void 0 ? void 0 : _a.select) !== item.select &&
	                    item.command.name !== "select") {
	                    this.select(item.select);
	                }
	                // TODO
	                // @ts-expect-error
	                this.sendCommand(item.command);
	                break;
	            default:
	                item.command.reject(err);
	        }
	    }
	    /**
	     * Get description of the connection. Used for debugging.
	     */
	    _getDescription() {
	        let description;
	        if ("path" in this.options && this.options.path) {
	            description = this.options.path;
	        }
	        else if (this.stream &&
	            this.stream.remoteAddress &&
	            this.stream.remotePort) {
	            description = this.stream.remoteAddress + ":" + this.stream.remotePort;
	        }
	        else if ("host" in this.options && this.options.host) {
	            description = this.options.host + ":" + this.options.port;
	        }
	        else {
	            // Unexpected
	            description = "";
	        }
	        if (this.options.connectionName) {
	            description += ` (${this.options.connectionName})`;
	        }
	        return description;
	    }
	    resetCommandQueue() {
	        this.commandQueue = new Deque();
	    }
	    resetOfflineQueue() {
	        this.offlineQueue = new Deque();
	    }
	    parseOptions(...args) {
	        const options = {};
	        let isTls = false;
	        for (let i = 0; i < args.length; ++i) {
	            const arg = args[i];
	            if (arg === null || typeof arg === "undefined") {
	                continue;
	            }
	            if (typeof arg === "object") {
	                (0, lodash_1.defaults)(options, arg);
	            }
	            else if (typeof arg === "string") {
	                (0, lodash_1.defaults)(options, (0, utils_1.parseURL)(arg));
	                if (arg.startsWith("rediss://")) {
	                    isTls = true;
	                }
	            }
	            else if (typeof arg === "number") {
	                options.port = arg;
	            }
	            else {
	                throw new Error("Invalid argument " + arg);
	            }
	        }
	        if (isTls) {
	            (0, lodash_1.defaults)(options, { tls: true });
	        }
	        (0, lodash_1.defaults)(options, Redis.defaultOptions);
	        if (typeof options.port === "string") {
	            options.port = parseInt(options.port, 10);
	        }
	        if (typeof options.db === "string") {
	            options.db = parseInt(options.db, 10);
	        }
	        // @ts-expect-error
	        this.options = (0, utils_1.resolveTLSProfile)(options);
	    }
	    /**
	     * Change instance's status
	     */
	    setStatus(status, arg) {
	        // @ts-expect-error
	        if (debug.enabled) {
	            debug("status[%s]: %s -> %s", this._getDescription(), this.status || "[empty]", status);
	        }
	        this.status = status;
	        process.nextTick(this.emit.bind(this, status, arg));
	    }
	    createScanStream(command, { key, options = {} }) {
	        return new ScanStream_1.default({
	            objectMode: true,
	            key: key,
	            redis: this,
	            command: command,
	            ...options,
	        });
	    }
	    /**
	     * Flush offline queue and command queue with error.
	     *
	     * @param error The error object to send to the commands
	     * @param options options
	     */
	    flushQueue(error, options) {
	        options = (0, lodash_1.defaults)({}, options, {
	            offlineQueue: true,
	            commandQueue: true,
	        });
	        let item;
	        if (options.offlineQueue) {
	            while ((item = this.offlineQueue.shift())) {
	                item.command.reject(error);
	            }
	        }
	        if (options.commandQueue) {
	            if (this.commandQueue.length > 0) {
	                if (this.stream) {
	                    this.stream.removeAllListeners("data");
	                }
	                while ((item = this.commandQueue.shift())) {
	                    item.command.reject(error);
	                }
	            }
	        }
	    }
	    /**
	     * Check whether Redis has finished loading the persistent data and is able to
	     * process commands.
	     */
	    _readyCheck(callback) {
	        const _this = this;
	        this.info(function (err, res) {
	            if (err) {
	                if (err.message && err.message.includes("NOPERM")) {
	                    console.warn(`Skipping the ready check because INFO command fails: "${err.message}". You can disable ready check with "enableReadyCheck". More: https://github.com/luin/ioredis/wiki/Disable-ready-check.`);
	                    return callback(null, {});
	                }
	                return callback(err);
	            }
	            if (typeof res !== "string") {
	                return callback(null, res);
	            }
	            const info = {};
	            const lines = res.split("\r\n");
	            for (let i = 0; i < lines.length; ++i) {
	                const [fieldName, ...fieldValueParts] = lines[i].split(":");
	                const fieldValue = fieldValueParts.join(":");
	                if (fieldValue) {
	                    info[fieldName] = fieldValue;
	                }
	            }
	            if (!info.loading || info.loading === "0") {
	                callback(null, info);
	            }
	            else {
	                const loadingEtaMs = (info.loading_eta_seconds || 1) * 1000;
	                const retryTime = _this.options.maxLoadingRetryTime &&
	                    _this.options.maxLoadingRetryTime < loadingEtaMs
	                    ? _this.options.maxLoadingRetryTime
	                    : loadingEtaMs;
	                debug("Redis server still loading, trying again in " + retryTime + "ms");
	                setTimeout(function () {
	                    _this._readyCheck(callback);
	                }, retryTime);
	            }
	        }).catch(lodash_1.noop);
	    }
	}
	Redis.Cluster = cluster_1.default;
	Redis.Command = Command_1.default;
	/**
	 * Default options
	 */
	Redis.defaultOptions = RedisOptions_1.DEFAULT_REDIS_OPTIONS;
	(0, applyMixin_1.default)(Redis, events_1.EventEmitter);
	(0, transaction_1.addTransactionSupport)(Redis.prototype);
	Redis$1.default = Redis;
	return Redis$1;
}

(function (module, exports) {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.print = exports.ReplyError = exports.SentinelIterator = exports.SentinelConnector = exports.AbstractConnector = exports.Pipeline = exports.ScanStream = exports.Command = exports.Cluster = exports.Redis = exports.default = void 0;
	exports = module.exports = requireRedis().default;
	var Redis_1 = requireRedis();
	Object.defineProperty(exports, "default", { enumerable: true, get: function () { return Redis_1.default; } });
	var Redis_2 = requireRedis();
	Object.defineProperty(exports, "Redis", { enumerable: true, get: function () { return Redis_2.default; } });
	var cluster_1 = requireCluster();
	Object.defineProperty(exports, "Cluster", { enumerable: true, get: function () { return cluster_1.default; } });
	/**
	 * @ignore
	 */
	var Command_1 = Command$1;
	Object.defineProperty(exports, "Command", { enumerable: true, get: function () { return Command_1.default; } });
	/**
	 * @ignore
	 */
	var ScanStream_1 = ScanStream$1;
	Object.defineProperty(exports, "ScanStream", { enumerable: true, get: function () { return ScanStream_1.default; } });
	/**
	 * @ignore
	 */
	var Pipeline_1 = Pipeline$1;
	Object.defineProperty(exports, "Pipeline", { enumerable: true, get: function () { return Pipeline_1.default; } });
	/**
	 * @ignore
	 */
	var AbstractConnector_1 = AbstractConnector$1;
	Object.defineProperty(exports, "AbstractConnector", { enumerable: true, get: function () { return AbstractConnector_1.default; } });
	/**
	 * @ignore
	 */
	var SentinelConnector_1 = requireSentinelConnector();
	Object.defineProperty(exports, "SentinelConnector", { enumerable: true, get: function () { return SentinelConnector_1.default; } });
	Object.defineProperty(exports, "SentinelIterator", { enumerable: true, get: function () { return SentinelConnector_1.SentinelIterator; } });
	// No TS typings
	exports.ReplyError = redisErrors.ReplyError;
	/**
	 * @ignore
	 */
	Object.defineProperty(exports, "Promise", {
	    get() {
	        console.warn("ioredis v5 does not support plugging third-party Promise library anymore. Native Promise will be used.");
	        return Promise;
	    },
	    set(_lib) {
	        console.warn("ioredis v5 does not support plugging third-party Promise library anymore. Native Promise will be used.");
	    },
	});
	/**
	 * @ignore
	 */
	function print(err, reply) {
	    if (err) {
	        console.log("Error: " + err);
	    }
	    else {
	        console.log("Reply: " + reply);
	    }
	}
	exports.print = print;
} (built$2, builtExports));

var Redis = /*@__PURE__*/getDefaultExportFromCjs(builtExports);

/**
 * Multi-region load balancing.
 */
class index {
    /**
     * RateLimiter instance.
     * @type {{[key: string]: typeof import('rate-limiter-flexible').RateLimiterRedis}}
     */
    #limiters = {};
    /**
     * ioredis instance.
     * @type {typeof import('ioredis')}
     */
    #ioredis;
    /**
     * Key prefix of the region assignment information to be stored in Redis.
     * @type {typeof import('ioredis')}
     */
    #prefix;
    /**
     * If enabled, debug logs are output. Default is disabled.
     * @type {typeof boolean}
     */
    #debug;
    /**
     * Initialisation.
     * @param {string} options.prefix Key prefix for region assignment information to be stored in Redis. Defaults to ‘myapp’.
     * @param {string} options.host Redis hostname. Default is "127.0.0.1".
     * @param {number} options.port Redis port. Default is 6379.
     * @param {boolean} options.debug If enabled, debug logs are output. Default is disabled.
     */
    constructor(options) {
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
            retryStrategy: () => null, // No reconnection when Redis down.
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
    async consume(options) {
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
                        .catch(async (err) => {
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
        }
        catch (err) {
            // If it is not possible to connect to Redis, a random region is obtained and returned.
            throw err;
        }
        finally {
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
    async register(options) {
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
        this.#limiters[options.region] = new rateLimiterFlexible.RateLimiterRedis({
            storeClient: this.#ioredis,
            keyPrefix: this.#prefix + ':rl',
            points: options.quota,
            duration: options.duration,
            blockDuration: 0, // Do not block if consumed more than points.
        });
    }
    /**
     * Get milliseconds until next region assignment.
     * @return {Promise<number>} Number of milliseconds that can be allocated next.
     */
    async getTimeUntilAllocation() {
        // Get candidates for assignable regions.
        const candidateRegion = await this.#getAssignableRegion();
        return candidateRegion.duration;
    }
    /**
     * Get candidates for assignable regions.
     * @return {Promise<{region: string, allocationRate: number, duration: number}>} Candidate regions available for assignment.
     */
    async #getAssignableRegion() {
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
            regions.push({ region, allocationRate, duration });
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

export { index as default };
