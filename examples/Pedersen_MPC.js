// This sample script computes a Pedersen Verifiable Secret Sharing k-of-n scheme
// simulating an MPC and checks that the shares recompose the original secret

const assert = require('assert')
const secret = require('../build/src/secrets')

async function  main() {

    // Scheme parameters
    ec      = {fieldN: 101, coeffA: 0, coeffB: 3, rorder: 17, iSQR: -2}
    ped     = { ptG: [ [ 1, 0 ], [ 2, 0 ] ], ptH: [ [ 12, 0 ], [ 69, 0 ] ] }

    // Initialize 3-of-6 secret sharing scheme for secret 13
    // Computing the secret, shares and commitments of each party
    console.log()
    console.log("* * * * * * * * * * * * * * * * * * *")
    console.log("        MPC per party setup          ")
    console.log("* * * * * * * * * * * * * * * * * * *")
    partyIDs = secret.getUniqueRandomEval(ec.rorder, 6)
    mpcSetup = secret.pedersenMPC_AllSetup(ec, ped, 3, partyIDs, true)
    console.log()
    theSecret = secret.pedersenMPC_Secret(ec, mpcSetup, true)

    // For each party gather its secret shares and commitments
    // ...and verify them
    console.log()
    console.log("* * * * * * * * * * * * * * * * * * *")
    console.log(" Gathering secret shares per party ")
    console.log("* * * * * * * * * * * * * * * * * * *")
    allPty  = secret.pedersenMPC_AllShares(mpcSetup, true)
    secret.pedersenMPC_AllVerify(ec, ped, allPty, true)

    // For each party aggregate the secret shares and commitments
    // ...to produce the final aggregate secret share and 
    // ...aggregate commitment list.
    console.log()
    console.log("* * * * * * * * * * * * * * * * * * *")
    console.log("      Aggregate per party shares    ")
    console.log("* * * * * * * * * * * * * * * * * * *")
    allAggr = secret.pedersenMPC_AllAggr(ec, ped, allPty, true)

    // K parties come together and join their shares to discover the secret
    console.log()
    console.log("* * * * * * * * * * * * * * * * * * *")
    console.log("            Recover secret          ")
    console.log("* * * * * * * * * * * * * * * * * * *")
    shares  = secret.pedersenMPC_ExtractShares(allAggr)
    subset  = secret.getShareSubset(shares, 3)
    theSecret2 = secret.shamirRecover(ec.rorder, subset, true)

    assert(theSecret == theSecret2, "Recovered secret does not match original!")
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });