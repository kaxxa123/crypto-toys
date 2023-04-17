# crypto-toys
Scripts for computing DLP and EC toy examples

Requirements: node v14 or later

Setup:
```BASH
npm install
npm run build
```

The project includes a command line tool to try out the functionality of the library. Check all supported operations:

```BASH
npm run help
```

For each operation a sample command is included to see what it looks like. For example to quickly run ``isGenerator`` try:

```BASH
npm run isGenerator
```

To set your own parameters run ``index.js``, for example to directly run ``ecpoints``:

```BASH
node ./build/index.js ecpoints --fieldN 37 --coeffA -5 --coeffB 8
```
