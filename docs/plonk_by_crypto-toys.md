# PLONK by Crypto-Toys
___Written By Alexander Zammit - WinDeveloper Software - 3rd March 2023___

The application of Zero Knowledge Proofs (ZKPs) in the blockchain space needs little introduction. Whether we look at scalability solutions or on-chain privacy, ZKPs are almost always in the mix.

While planning to embark on another ZKP project, I set myself to reorganize my scripts for computing Elliptic Curve (EC) cryptography toy examples. This gave birth to the node.js [Crypto-Toys](https://github.com/kaxxa123/crypto-toys) project, a collection of functions for computing points on a curve, torsion points computation, support for degree-2 extension fields and pairings computation. It's an educational tool. So once ready, I wanted a good example to demonstrate Crypto-Toys in action, which is what this article is about.

Anyone learning ZKPs most likely came across the articles from Joshua Fitzgerald, a zero-knowledge cryptography researcher & protocol developer at Metastate. His three-part series, named [PLONK by Hand](https://research.metastate.dev/plonk-by-hand-part-1/) takes the reader through a PLONK-based ZKP setup, proof creation, and verification. What makes Joshua's series awesome is his workings of cryptographic and other mathematical operations. By hand, of course!

So, my idea is to demonstrate how to cheat and use Crypto-Toys instead. I will only be covering the first article of Joshua's series, the proof setup. Here almost every step can be computed using Crypto-Toys. If you like my article, I might write a follow up covering the proof and verification. You should consider this article as an Appendix to Joshua's work, which hopefully will occasionally offer some additional insight.

Thus, to follow the rest of the article the following is required: <BR />
[Crypto-Toys Repository](https://github.com/kaxxa123/crypto-toys) <BR />
[PLONK by Hand (Part 1: Setup)](https://research.metastate.dev/plonk-by-hand-part-1/)

<BR />

---

## Get Started with Crypto-Toys

Crypto-Toys requires node v14 or later. Start by cloning the repository and build the project:

```BASH
git clone https://github.com/kaxxa123/crypto-toys.git
npm install
npm run build
```

Next, we can run the Crypto-Toys command line. Check the available commands using:

```BASH
node ./build/index --help
```

Let's take an example curve from [Craig Costello's Pairings for beginners](https://www.craigcostello.com.au/s/PairingsForBeginners.pdf). <BR />

E: y<sup>2</sup> = x<sup>3</sup> - 5x + 8 over the finite field F<sub>37</sub>

To get all the points run the command:
```BASH
node ./build/index.js ecpoints --fieldN 37 --coeffA -5 --coeffB 8
```

...and for the same curve over F<sub>37^2</sub>, we get the points using:

```BASH
node ./build/index.js ecipoints --fieldN 37 --coeffA -5 --coeffB 8
```

This article won't use the command-line tool. It rather runs Crypto-Toys from the node console. We thus need to learn how Crypto-Toys is organized.

``./build/toys.js`` - EC computations over finite fields of the type Fq. 

``./build/i-toys.js`` - EC computations over an extension fields Fq^2. Only extension fields having embedding degree 2 are supported. This is often the case when dealing with toy examples.

``./build/p-toys.js`` - Support for projective coordinates.

``./build/pairings.js`` - Pairings computations.

In this article only ``toys.js`` and ``i-toys.js`` are used.

An important parameter that is required by most functions, is the one describing the EC:

```TS
interface ECurve {
    fieldN: number;
    coeffA?: number;
    coeffB?: number;
    rorder?: number;
    iSQR?: number;
}
```
``fieldN`` – the integer defining the finite field F<sub>N</sub> over which the group operations are computed.

``coeffA``, ``coeffB`` – the ``A`` and ``B`` coefficients defining the EC _y<sup>2</sup> = x<sup>3</sup> + Ax + B_

``rorder`` the sub-group order over which G<sub>1</sub> and G<sub>2</sub> are defined.

``iSQR`` – the constant for customizing the degree 2 extension field. By default, _iSQR = -1_, hence the extension field is computed for _i<sup>2</sup> = -1_. Setting ``iSQR`` changes the i-squared value of course.


Note how, depending on the function being invoked some of the ``ECurve`` properties may not be required.

<BR />

---

## PLONK Setup

We now turn our attention to the computations presented in PLONK by Hand. Here I will not repeat Joshua's explanation. We will jump from one computation to another, showing how each would be performed using Crypto-Toys.

Assuming you already cloned and built Crypto-Toys, it's time to fire node and import the necessary functions with:

```JS
let toys = require('./build/toys.js')
let itoys = require('./build/i-toys.js')
```

We start by exploring the EC over F<sub>101</sub>, for which the ZKP is being set up. <BR/>
E/F<sub>101</sub>: _y<sup>2</sup> = x<sup>3</sup> + 3_

Let's retrieve all points and determine the group cardinality.

```JS
// Define the EC and the finite field over which it will be computed
ec = {fieldN: 101, coeffA: 0, coeffB: 3}

// Retrieve all points
pts = toys.ecpoints(ec)

// Get the group cardinality
pts.length	// Should return 102
```

``ecpoints`` returns an array of points. Each point is itself an array in the format [x, y].

Next, we compute all points for the generator (1,2) and discover the sub-group order. 

```JS
// Discover the cyclic group for generator point (1,2)
toys.ecCycle(ec, [1,2], true)
// Returns:
// P = (1,2)
// 2P = (68,74)
// 3P = (26,45)
// 4P = (65,98)
// 5P = (12,32)
// 6P = (32,42)
// 7P = (91,35)
// 8P = (18,49)
// 9P = (18,52)
// 10P = (91,66)
// 11P = (32,59)
// 12P = (12,69)
// 13P = (65,3)
// 14P = (26,56)
// 15P = (68,27)
// 16P = (1,99)
// 17P = (0)
// Point (1,2) has order 17
```

Note how ``ecCycle`` is fed the curve configuration, and the generator point as an [x, y] array. The last flag simply enables verbose mode.

PLONK by Hand computes the embedding degree to be 2 and explains how the extension field must be defined using _u<sup>2</sup> = -2_. This is where the ``iSQR`` configuration comes into play. 

Computations over an extension field require ``i-toys.js``. To begin, let's see what happens when we work with the simplest extension field definition (_i<sup>2</sup> = -1_). 

```JS
// Crypto-Toys works with the default extension i^2 = -1 
// but let's set it explicitly for clarity.
// Here we want to see why we cannot work with i^2 = -1 
// and should instead work with i^2 = -2
ec = {fieldN: 101, coeffA: 0, coeffB: 3, rorder: 17, iSQR: -1}

// Compute embedding degree
itoys.eciEmbeddingDegree(ec, true)
// Returns:
// Embedding Degree k = 2

// Let's discover the cardinality of #E/Fq^k
ipts = itoys.ecipoints(ec,true)
ipts.length     // Should return  10202

// But does it satisfy this condition?
//      order || #E/Fq^k

// Try retrieving the order 17 points for #E/Fq^k
tor17 = itoys.eciTorsion(ec,true)
// FAILED! with error 'r (17) is not a factor of #E (10202)'
```

The above functions simply take the EC configuration and a flag that enables a more verbose output. However, note that ``eciEmbeddingDegree`` and ``eciTorsion`` both require the sub-group order to also be included (``rorder``).

``eciTorsion`` fails as the extension field resulting from _i<sup>2</sup> = -1_ generates a group whose cardinality (10202) is not divisible by the sub-group order (17).

Also if we look into the points returned by ``ecipoints``, note how each is now encoded as: <BR />
_[[xa, xb],[ya, yb]]_. This is so, as each coordinate is in the form _a + ib_.

Let's redefine the extension field to _i<sup>2</sup> = -2_. This time, ``eciTorsion`` succeeds as the new cardinality (10404) is indeed divisible by the sub-group order.

```JS
// Repeat computations with i^2 = -2
ec = {fieldN: 101, coeffA: 0, coeffB: 3, rorder: 17, iSQR: -2}
itoys.eciEmbeddingDegree(ec, true) // k = 2
ipts = itoys.ecipoints(ec,true)
ipts.length     // Should return 10404 (= 17*612)

tor17 = itoys.eciTorsion(ec,true)
tor17.length    // Should return 289 (= 17*17)
```

Next, we discover the G<sub>1</sub> and G<sub>2</sub> sub-groups. These are respectively the base-field and the trace zero sub-groups obtainable by applying the Frobenius trace map and anti-trace map. 

Indeed, we already got the G<sub>1</sub> points on computing the cycle for generator (1,2). However, it is still interesting to see how the unique points resulting on applying the trace map, generates G<sub>1</sub>. As for G<sub>2</sub>, this is obtained by applying the anti-trace map.

```JS
// Apply the Frobenius Trace Map to all order-17 points
// obtaining the set of unique points that compose G1
G1 = itoys.eciFrobeniusTrMap(ec, 2, tor17, true)
itoys.eciShowPoints(G1)
// Total Points 17: (0,0), (68,74), (68,27), (18,52), (18,49), 
// (91,35), (91,66), (12,69), (12,32), (65,3), (65,98), (1,99), 
// (1,2), (32,59), (32,42), (26,45), (26,56)

// Apply the Anti-Trace Map to all order-17 points
// obtaining the set of unique points that compose G2
G2 = itoys.eciAntiFrobeniusTrMap(ec, 2, tor17, true)
itoys.eciShowPoints(G2)
// Total Points 17: (0,0), (36,31i), (36,70i), (66,78i), (66,23i), 
// (41,22i), (41,79i), (63,66i), (63,35i), (10,85i), (10,16i), 
// (90,19i), (90,82i), (2,34i), (2,67i), (74,89i), (74,12i)
```

The ``eciFrobeniusTrMap`` and ``eciAntiFrobeniusTrMap`` both take as input the EC configuration, the embedding degree 2, the array of points order-17 and the verbosity flag.

Lastly, we compute the SRS points. Here PLONK by Hand picks a random secret s and generators g<sub>1</sub> and g<sub>2</sub>. The computations ultimately boil down to point multiplications.

SRS: s<sup>0</sup> g<sub>1</sub>, s<sup>1</sup> g<sub>1</sub>, s<sup>2</sup> g<sub>1</sub>, s<sup>3</sup> g<sub>1</sub>, s<sup>4</sup> g<sub>1</sub>, s<sup>5</sup> g<sub>1</sub>, s<sup>6</sup> g<sub>1</sub>, s<sup>0</sup> g<sub>2</sub>, s<sup>1</sup> g<sub>2</sub>

...where _s = 2_, _g<sub>1</sub> = (1, 2)_ and _g<sub>2</sub> = (36, 31i)_

```JS
// Computing the SRS points 
g1 = [[1,0], [2,0]]
g2 = [[36,0], [0,31]]
secret_s = 2
gates = 4
srsG1 = []
srsG2 = []

for (cnt = 0; cnt <= gates+2; ++cnt) {
    srsPt = itoys.eciMultiply(ec, secret_s**cnt, g1)
    srsG1.push(srsPt)
}

srsPt = itoys.eciMultiply(ec, secret_s, g2)
srsG2.push(g2)
srsG2.push(srsPt)

itoys.eciShowPoints(srsG1)
// Total Points 7: (1,2), (68,74), (65,98), (18,49), (1,99), (68,27), (65,3)

itoys.eciShowPoints(srsG2)
// Total Points 2: (36,31i), (90,82i)
```

Here ``eciMultiply`` is fed the EC configuration, the integer multiplier _s<sup>x</sup>_, and a generator point.

We thus complete the set of computations necessary for the PLONK by Hand setup. Crypto-Toys includes a lot more functionality. Hopefully today I showed you enough to try it out and maybe contribute to its improvement!


## References
[Crypto-Toys Repository](https://github.com/kaxxa123/crypto-toys)

[PLONK by Hand (Part 1: Setup)](https://research.metastate.dev/plonk-by-hand-part-1/)

[Pairings for beginners - Craig Costello (2012)](https://www.craigcostello.com.au/s/PairingsForBeginners.pdf)




