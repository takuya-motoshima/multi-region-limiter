## Redis CLI
Check all keys.
```sh
redis6-cli keys \*
```

Delete all keys.
```sh
redis6-cli flushdb
```

## Run a test
```sh
node -r esm/esm __tests__/index
```