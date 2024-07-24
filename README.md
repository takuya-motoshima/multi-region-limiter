# multi-region-limiter
Multi-region load balancing.  
In this package, redis is required because redis is used to manage the region's quota limit.

## Installation
```sh
npm install --save multi-region-limiter
```

## Usage
```js
import MultiRegionLimiter from 'multi-region-limiter';
// const MultiRegionLimiter = require('multi-region-limiter');

// MultiRegionLimiter instance.
const limiter = new MultiRegionLimiter({
    prefix: 'myapp',// Key prefix for region assignment information to be stored in Redis. Defaults to ‘myapp’.
    host: '127.0.0.1',// Redis hostname. Default is "127.0.0.1".
    port: 6379,// Redis port. Default is 6379.
});

// Register a region for load balancing
await limiter.register({region: 'us-west1', quota: 100, duration: 60});
await limiter.register({region: 'us-west2', quota: 100, duration: 60});
await limiter.register({region: 'us-west3', quota: 50, duration: 60});

// Get regions that can be allocated
const region = await limiter.consume();
```

## API
### MultiRegionLimiter class
#### Instance methods
- ##### `constructor()`
    ###### Parameters:
    - {string} <code>options.prefix</code> Key prefix for region assignment information to be stored in Redis. Defaults to ‘myapp’.
    - {string} <code>options.host</code> Redis hostname. Default is "127.0.0.1".
    - {number} <code>options.port</code> Redis port. Default is 6379.
    - {boolean} <code>options.debug</code> If enabled, debug logs are output. Default is disabled.
- ##### `consume()`
    Get an assignable region.  
    If no allocatable region is found, waits and retries until an allocatable region is freed if the maximum retry option (`options.maxRetry`) is enabled (greater than or equal to 1).  
    If no allocatable regions are found, returns `undefined`.  

    ###### Parameters:
    - {number} <code>options.maxRetry</code> Maximum number of retries if no single assignable region is found. The default is 3. If you do not want to retry, set -1.
    - {boolean} <code>options.disconnect</code> When enabled, Redis is disconnected, allowing testing in scenarios where Redis is not available. Default is disabled.

    ###### Return value:
    {Promise&lt;string|undefined&gt;} Assignable region name.

    ###### Exceptions:
    - {Error} Unable to connect to Redis or unexpected errors occurred.
- ##### `register()`
    Register a region.

    ###### Parameters:
    - {string} <code>options.region</code> Region Name. Region name must be unique.
    - {number} <code>options.quota</code> Allocatable number of times per duration.
    - {number} <code>options.duration</code> Number of seconds before the allocated count is reset.

    ###### Return value:
    {Promise&lt;void&gt;}

    ###### Exceptions:
    - {Error} Duplicate region name. Please use a unique region name.
- ##### `getTimeUntilAllocation()`
    Get milliseconds until next region assignment.

    ###### Return value:
    {Promise&lt;number&gt;} Number of milliseconds that can be allocated next.


## Author
**Takuya Motoshima**

* [github/takuya-motoshima](https://github.com/takuya-motoshima)
* [twitter/TakuyaMotoshima](https://twitter.com/TakuyaMotoshima)
* [facebook/takuya.motoshima.7](https://www.facebook.com/takuya.motoshima.7)

## License
[MIT](LICENSE)