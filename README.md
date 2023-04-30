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

<BR />

---

## Working out Toy Examples from Literature

<BR />

### Example 1 - Weil Pairing Computation
Source: On The Implementation Of Pairing-Based Cryptosystems - Ben Lynn (page 53 to 55)

```JS
let pair = require('./build/pairings.js')

// Prepare curve parameters
let ec = {
        fieldN: 59,
        coeffA: 1,
        coeffB: 0,
        rorder: 5
    }

//Points for which the example is to be worked
P = [[25,0], [30,0]]
Q = [[(59-25),0], [0,30]]
R = [[40,0], [54,0]]
S = [[48,55], [28,51]]

//Pairing computation
pair.weilPairing(ec, P, Q, R, S, true)

//Expected Result: 46 + 56i
```


<BR />

### Example 2 - Weil Pairing Computation
Source: Pairings for beginners - Craig Costello (page 69 to 70)

```JS
let pair = require('./build/pairings.js')

// Prepare curve parameters
let ec = {
        fieldN: 23,
        coeffA: -1,
        coeffB: 0,
        rorder: 3
    }

//Points for which the example is to be worked
P = [[2,0], [11,0]]
Q = [[21,0], [0,12]]
R = [[0,17], [21,2]]
S = [[18,10], [13,13]]

//Pairing computation
pair.weilPairing(ec, P, Q, R, S, true)

//Expected Result: 11 + 15i
```


<BR />

---

## References

* Pairings for beginners - Craig Costello (2012) <BR />
[https://www.craigcostello.com.au/s/PairingsForBeginners.pdf](https://www.craigcostello.com.au/s/PairingsForBeginners.pdf)


* On The Implementation Of Pairing-Based Cryptosystems - Ben Lynn (2007)<BR />
[https://crypto.stanford.edu/pbc/thesis.pdf](https://crypto.stanford.edu/pbc/thesis.pdf)