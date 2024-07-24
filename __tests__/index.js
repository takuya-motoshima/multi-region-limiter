import MultiRegionLimiter from '../dist/build.esm.js';
// const MultiRegionLimiter = require('../dist/build.common.js');

(async () => {
  try {
    const limiter = new MultiRegionLimiter({
      prefix: 'myapp',
      host: '127.0.0.1',
      port: 6379,
    });

    await limiter.register({region: 'us-west1', quota: 10, duration: 60});
    await limiter.register({region: 'us-west2', quota: 10, duration: 60});
    await limiter.register({region: 'us-west3', quota: 10, duration: 60});

    for (let i=0, attempt=5; i<attempt; i++) {
      const region = await limiter.consume();
      console.log(`${region} (${i+1}/${attempt})`);
    }
  } catch (err) {
    console.error('err.message=', err.message);
  } finally {
    process.exit(0);
  }
})();