# crypto-toys
Scripts for computing Discrete Logarithm, Elliptic Curve and Pairings toy examples. This collection of function is intended to be used through the interactive node console. 

Also included is a primitive command line tool to try out the available functionality.

<BR />

## Setup and Build

Requirements: node v14 or later

Setup:
```BASH
npm install
npm run build
```

<BR />


## Command-Line Tool


After building the project, check all possible command line operations by running:
```BASH
# List of all commands from npm
npm run help

# List of all commands from node
node ./build/index --help

# Help for individual commands
node ./build/index ecipoints --help
```
For each command, an npm script is available that allows to quickly see the command in action without entering any parameters. For example, to quickly see ``ecipoints`` in action:
```BASH
npm run ecipoints
```

From here one can copy the command line used to generate the output and customize it to the required EC. For example (at the time of writing) the command generated for ``ecipoints`` is:
```BASH
node ./build/index.js ecipoints --fieldN 11 --coeffA 4 --coeffB 3
```

In this case ``fieldN`` is the integer field over which the EC operation is being computed. Whereas ``coeffA`` and ``coeffB`` are the ``A`` and ``B`` coefficients in the EC formula: <BR />
_y<sup>2</sup> = x<sup>3</sup> + Ax + B_

For complete details on the parameters check the help for each command.


<BR />

---

## Running the Functions Directly from Node

When computing operations that require multiple parameters, it is much easier to work directly from the node console. The scripts are organized as follows:

```JS
// DL and EC operations over the affine space
let toys = require('./build/toys.js')

// EC operations over an extension field of the type i^2 = constant
// by default i^2 = -1, however this can be customized by setting 
// iSQR in the EC configuration.
let itoys = require('./build/i-toys.js')

//Functions for computing EC using projective coordinates
let ptoys = require('./build/p-toys.js')

//Functions for computing pairings
let pair = require('./build/pairings.js')
```

The most important configuration structure to be aware when working with these functions is ``ECurve`` which is defined as follows:

```TS
interface ECurve {
    fieldN: number;
    coeffA?: number;
    coeffB?: number;
    rorder?: number;
    iSQR?: number;
}
```

These are the parameters defining the field, EC and sub-group order over which computations are to be carried out.


<BR />

---

## Toy Examples from Literature

<BR />

### Example 1 - Weil Pairing Computation
Source: On The Implementation Of Pairing-Based Cryptosystems - Ben Lynn (page 53 to 55)

Computing ``e(P, Q)`` given additional points ``R`` and ``S``.

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

//Expected Result: e(P, Q) = 46 + 56i
```


<BR />

### Example 2 - Weil Pairing Computation
Source: Pairings for beginners - Craig Costello (page 69 to 70)

Computing ``e(P, Q)`` given additional points ``R`` and ``S``.

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

//Expected Result: e(P, Q) = 11 + 15i
```


<BR />

### Example 3 - Tate Pairing Computation
Source: Pairings for beginners - Craig Costello (page 74)

Computing ``e(P, Q)`` given additional point ``R``.

```JS
let pair = require('./build/pairings.js')

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
pair.tatePairing(ec, P, Q, R)

//Expected Result: e(P, Q) = 2 + 15i
```

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