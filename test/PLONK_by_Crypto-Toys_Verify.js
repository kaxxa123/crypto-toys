// This script works out the pairing computation for verifying the proof  
// described in:
//
// PLONK by Hand (Part 3: Verification)
// Written by Joshua Fitzgerald, zero-knowledge cryptography researcher & protocol developer at Metastate
// https://research.metastate.dev/plonk-by-hand-part-3-verification/
//
// This script is meant to be manually typed into node as a learning exercise
// rather than running it all at one go.

const toys = require('./build/toys.js')
const itoys = require('./build/i-toys.js')
const pair = require('./build/pairings.js')

// Prepare curve parameters
ec = {fieldN: 101, coeffA: 0, coeffB: 3, rorder: 17, iSQR: -2}

//To compute the Weil Pairing we need two additional points
//...from different sub-broups other than G1 and G2
//Let's get all unique order 17 sub-groups 
cycle17 = itoys.eciTorUniqueCycles(ec, true)
itoys.eciShowCycles(cycle17)

//We manually pick two points from different sub-groups
// other than G1 and G2
R = [[25, 53], [ 6, 24]]
S = [[20, 84], [37, 40]]

//Make sure R and S are not in G1 or G2
tor17 = itoys.eciTorsion(ec,true)
G1 = itoys.eciFrobeniusTrMap(ec, 2, tor17, true)
G2 = itoys.eciAntiFrobeniusTrMap(ec, 2, tor17, true)

if (itoys.ecihasPoint(G1,R) != -1) throw "Unexpected: Point in G1/G2"
if (itoys.ecihasPoint(G1,S) != -1) throw "Unexpected: Point in G1/G2"
if (itoys.ecihasPoint(G2,R) != -1) throw "Unexpected: Point in G1/G2"
if (itoys.ecihasPoint(G2,S) != -1) throw "Unexpected: Point in G1/G2"

if (itoys.ecihasPoint(cycle17[17],R) == -1) throw "Unexpected: Point showld be in Cycle 17"
if (itoys.ecihasPoint(cycle17[15],S) == -1) throw "Unexpected: Point showld be in Cycle 15"

//Pairing computations
P  = [[32,0], [42,0]]
Q  = [[90,0], [0,82]]
P2 = [[12,0], [69,0]]
Q2 = [[36,0], [0,31]]

//Weil Pairing
w1 =  pair.weilPairing(ec, P, Q, R, S, true)    // [ 97, 12 ]
w2 =  pair.weilPairing(ec, P2, Q2, R, S, true)  // [ 97, 12 ]

//Tate Pairing
t1 =  pair.tatePairing(ec, P, Q, R, true)       // [ 93, 76 ]
t2 =  pair.tatePairing(ec, P2, Q2, R, true)     // [ 93, 76 ]

if (!toys.pointsEquals(w1, w2))  throw "Weil Pairing mistmatch"
if (!toys.pointsEquals(t1, t2))  throw "Tate Pairing mistmatch"
