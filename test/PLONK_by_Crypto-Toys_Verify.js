// This sample script works out the pairing computation for verifying the proof  
// described in:
//
// PLONK by Hand (Part 3: Verification)
// Written by Joshua Fitzgerald, zero-knowledge cryptography researcher & protocol developer at Metastate
// https://research.metastate.dev/plonk-by-hand-part-3-verification/
//
// Run this script by creating a node.js project:
//      npm init -y
//      npm i crypto-toys

const assert = require('assert')
const toys = require('crypto-toys')

async function  main() {
    // Prepare curve parameters
    ec = {fieldN: 101, coeffA: 0, coeffB: 3, rorder: 17, iSQR: -2}

    //To compute the Weil Pairing we need two additional points
    //...from different sub-broups other than G1 and G2
    //Let's get all unique order 17 sub-groups 
    cycle17 = toys.eciTorUniqueCycles(ec)
    toys.eciShowCycles(cycle17)

    //We manually picked two points from different sub-groups
    // other than G1 and G2
    R = [[25, 53], [ 6, 24]]
    S = [[20, 84], [37, 40]]

    //Make sure R and S are not in G1 or G2
    tor17 = toys.eciTorsion(ec,true)
    G1 = toys.eciFrobeniusTrMap(ec, 2, tor17, true)
    G2 = toys.eciAntiFrobeniusTrMap(ec, 2, tor17, true)

    assert(toys.ecihasPoint(G1,R) == -1, "Unexpected: Point in G1/G2")
    assert(toys.ecihasPoint(G1,S) == -1, "Unexpected: Point in G1/G2")
    assert(toys.ecihasPoint(G2,R) == -1, "Unexpected: Point in G1/G2")
    assert(toys.ecihasPoint(G2,S) == -1, "Unexpected: Point in G1/G2")
    assert(toys.ecihasPoint(cycle17[17],R) != -1, "Unexpected: Point should be in Cycle 17")
    assert(toys.ecihasPoint(cycle17[15],S) != -1, "Unexpected: Point should be in Cycle 15")

    //Pairing computations
    P  = [[32,0], [42,0]]
    Q  = [[90,0], [0,82]]
    P2 = [[12,0], [69,0]]
    Q2 = [[36,0], [0,31]]

    //Weil Pairing
    w1 =  toys.weilPairing(ec, P, Q, R, S, true)    // [ 97, 12 ]
    w2 =  toys.weilPairing(ec, P2, Q2, R, S, true)  // [ 97, 12 ]

    //Tate Pairing
    t1 =  toys.tatePairing(ec, P, Q, R, true)       // [ 93, 76 ]
    t2 =  toys.tatePairing(ec, P2, Q2, R, true)     // [ 93, 76 ]

    assert(toys.pointsEquals(w1, w2), "Weil Pairing mistmatch") 
    assert(toys.pointsEquals(t1, t2), "Tate Pairing mistmatch") 

    console.log()
    console.log("SUCCESS! Proof Verified.")
    console.log()

}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });