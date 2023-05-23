// This script works out the various computations
// described in:
//
// PLONK by Hand (Part 1: Setup)
// Written by Joshua Fitzgerald, zero-knowledge cryptography researcher & protocol developer at Metastate
// https://research.metastate.dev/plonk-by-hand-part-1/
//
// This script is meant to be manually typed into node as a learning exercise
// rather than running it all at one go.
//
// Run this script by creating a node.js project:
//      npm init -y
//      npm i crypto-toys
//
// Then open the node console and enter the script 
// commands whilst inspecting the output

let toys = require('crypto-toys')

toys.posmod(-1,101)     //  = 100
toys.inverse(101, -2)	//  =  50
toys.inverse(101, -5)	//  =  20

//==========================================================

// Define the EC and the finite field over which it will be computed
ec = {fieldN: 101, coeffA: 0, coeffB: 3}

// Retrieve all points
pts = toys.ecpoints(ec)

// Get the group cardinality
pts.length  // Should return 102

//==========================================================

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

//==========================================================

// Crypto-Toys works with the default extension i^2 = -1 
// but let's set it explicitly for clarity.
// Here we want to see why we cannot work with i^2 = -1 
// and should instead work with i^2 = -2 
ec = {fieldN: 101, coeffA: 0, coeffB: 3, rorder: 17, iSQR: -1}

// Compute embedding degree
toys.eciEmbeddingDegree(ec, true)
// Returns:
// Embedding Degree k = 2

// Let's discover the cardinality of #E/Fq^k
ipts = toys.ecipoints(ec,true)
ipts.length     // Should return  10202

// But does it satisfy this condition?
//      order || #E/Fq^k

// Try retrieving the order 17 points for #E/Fq^k
tor17 = toys.eciTorsion(ec,true)
// FAILED! with error 'r (17) is not a factor of #E (10202)'

//==========================================================

// Repeat computations with i^2 = -2
ec = {fieldN: 101, coeffA: 0, coeffB: 3, rorder: 17, iSQR: -2}
toys.eciEmbeddingDegree(ec, true) // k = 2
ipts = toys.ecipoints(ec,true)
ipts.length     // Should return 10404 (= 17*612)

tor17 = toys.eciTorsion(ec,true)
tor17.length    // Should return 289 (= 17*17)

//==========================================================

// Apply the Frobenius Trace Map to all order-17 points
// obtaining the set of unique points that compose G1
G1 = toys.eciFrobeniusTrMap(ec, 2, tor17, true)
toys.eciShowPoints(G1)
// Total Points 17: (0,0), (68,74), (68,27), (18,52), (18,49), 
// (91,35), (91,66), (12,69), (12,32), (65,3), (65,98), (1,99), 
// (1,2), (32,59), (32,42), (26,45), (26,56)

// Apply the Anti-Trace Map to all order-17 points
// obtaining the set of unique points that compose G2
G2 = toys.eciAntiFrobeniusTrMap(ec, 2, tor17, true)
toys.eciShowPoints(G2)
// Total Points 17: (0,0), (36,31i), (36,70i), (66,78i), (66,23i), 
// (41,22i), (41,79i), (63,66i), (63,35i), (10,85i), (10,16i), 
// (90,19i), (90,82i), (2,34i), (2,67i), (74,89i), (74,12i)

//==========================================================

// Computing the SRS points 
g1 = [[1,0], [2,0]]
g2 = [[36,0], [0,31]]
secret_s = 2
gates = 4
srsG1 = []
srsG2 = []

for (cnt = 0; cnt <= gates+2; ++cnt) {
    srsPt = toys.eciMultiply(ec, secret_s**cnt, g1)
    srsG1.push(srsPt)
}

srsPt = toys.eciMultiply(ec, secret_s, g2)
srsG2.push(g2)
srsG2.push(srsPt)

toys.eciShowPoints(srsG1)
// Total Points 7: (1,2), (68,74), (65,98), (18,49), (1,99), (68,27), (65,3)

toys.eciShowPoints(srsG2)
// Total Points 2: (36,31i), (90,82i)
