# crypto-toys
Library for computing Discrete Logarithm, Elliptic Curve and Pairings toy examples. 

Crypto-Toys may be either installed as a library, or else one may clone the project, 
build it and run its command line tool.

<BR />

---

## Requirements

Node.js v14 or later

<BR />

---

## Crypto-Toys Library

To add crypto-toys to a node.js project:
```BASH
npm i crypto-toys
```

Next import the library using one of these methods:
```JS
const toys = require("crypto-toys")
```

```TS
import * as toys from "crypto-toys"
```

The most important configuration structure to be aware of is ``ECurve``, defined as follows:

```TS
interface ECurve {
    fieldN: number;
    coeffA?: number;
    coeffB?: number;
    rorder?: number;
    iSQR?: number;
}
```

These are the parameters defining the field, EC and sub-group order over which computations are to be computed.


<BR />

---

## Toy Examples from Literature

<BR />

### Example 1 - Weil Pairing Computation
Source: On The Implementation Of Pairing-Based Cryptosystems - Ben Lynn (page 53 to 55)

Computing ``e(P, Q)`` given additional points ``R`` and ``S``.

```JS
const toys = require("crypto-toys")

// Prepare curve parameters
let ec = {
        fieldN: 59,
        coeffA: 1,
        coeffB: 0,
        rorder: 5
    }

//Points for which the example is to be worked
let P = [[25,0], [30,0]]
let Q = [[(59-25),0], [0,30]]
let R = [[40,0], [54,0]]
let S = [[48,55], [28,51]]

//Pairing computation
toys.weilPairing(ec, P, Q, R, S, true)

//Expected Result: e(P, Q) = 46 + 56i
```


<BR />

### Example 2 - Weil Pairing Computation
Source: Pairings for beginners - Craig Costello (page 69 to 70)

Computing ``e(P, Q)`` given additional points ``R`` and ``S``.

```JS
const toys = require("crypto-toys")

// Prepare curve parameters
let ec = {
        fieldN: 23,
        coeffA: -1,
        coeffB: 0,
        rorder: 3
    }

//Points for which the example is to be worked
let P = [[2,0], [11,0]]
let Q = [[21,0], [0,12]]
let R = [[0,17], [21,2]]
let S = [[18,10], [13,13]]

//Pairing computation
toys.weilPairing(ec, P, Q, R, S, true)

//Expected Result: e(P, Q) = 11 + 15i
```


<BR />

### Example 3 - Tate Pairing Computation
Source: Pairings for beginners - Craig Costello (page 74)

Computing ``e(P, Q)`` given additional point ``R``.

```JS
const toys = require("crypto-toys")

// Prepare curve parameters
let ec = {
        fieldN: 19, 
        coeffA: 14, 
        coeffB: 3, 
        rorder: 5
    }


//Points for which the example is to be worked
let P = [[17,0], [9, 0]]
let Q = [[16,0], [0,16]]
let R = [[18,2], [14,5]]

//Pairing computation
toys.tatePairing(ec, P, Q, R, true)

//Expected Result: e(P, Q) = 2 + 15i
```

<BR />

---

## Clone and Build

```BASH
git clone https://github.com/kaxxa123/crypto-toys.git
cd crypto-toys
npm install
npm run build
```

<BR />

---


## Crypto-Toys Command-Line Tool


After building crypto-toys, check all possible command line operations by running:
```BASH
# List of all commands from npm
npm run help

# List of all commands from node
node ./build/src/toyscli --help

# Help for individual commands
node ./build/src/toyscli ecipoints --help
```
For each command, an npm script is available that allows to quickly see the command in action without entering any parameters. For example, to quickly see ``ecipoints`` in action:
```BASH
npm run ecipoints
```

From here one can copy the command line used to generate the output and customize it to the required EC. For example (at the time of writing) the command generated for ``ecipoints`` is:
```BASH
node ./build/src/toyscli.js ecipoints --fieldN 11 --coeffA 4 --coeffB 3
```

In this case ``fieldN`` is the integer field over which the EC operation is being computed. Whereas ``coeffA`` and ``coeffB`` are the ``A`` and ``B`` coefficients in the EC formula: <BR />
_y<sup>2</sup> = x<sup>3</sup> + Ax + B_

For complete details on the parameters check the help for each command.


<BR />

---

## PLONK by Crypto-Toys

[See details on how to run PLONK setup using Crypto-Toys.](./docs/plonk_by_crypto-toys.md)

<BR />

---

## References

* Pairings for beginners - Craig Costello (2012) <BR />
[https://www.craigcostello.com.au/s/PairingsForBeginners.pdf](https://www.craigcostello.com.au/s/PairingsForBeginners.pdf)


* On The Implementation Of Pairing-Based Cryptosystems - Ben Lynn (2007)<BR />
[https://crypto.stanford.edu/pbc/thesis.pdf](https://crypto.stanford.edu/pbc/thesis.pdf)