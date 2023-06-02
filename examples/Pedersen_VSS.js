// This sample script computes a Pedersen Verifiable Secret Sharing k-of-n scheme
// and checks that the shares recompose the original secret

const assert = require('assert')
const secret = require('../build/src/secrets')

async function  main() {

    // Scheme parameters
    ec      = {fieldN: 101, coeffA: 0, coeffB: 3, rorder: 17, iSQR: -2}
    ped     = { ptG: [ [ 1, 0 ], [ 2, 0 ] ], ptH: [ [ 12, 0 ], [ 69, 0 ] ] }

    // Initialize 3-of-6 secret sharing scheme for secret 13
    theSecret = 13
    vss = secret.pedersenVSS(ec, ped, theSecret, 3, 6, true)

    // Get secret share for the first participant
    firstEntry = vss.partyShares.entries().next().value;
    pid   = firstEntry[0]
    share = firstEntry[1]

    // Verify the secret share
    console.log()
    console.log(`Verifying one participant...`)
    bOk = secret.pedersenVSS_1PartyVerify(ec, ped, pid, share[0], share[1], vss.commitments, true)
    assert(bOk, 'Verification Failed')

    // Let's verifiy all shares
    // throws on failure
    console.log()
    console.log(`Verifying all participant...`)
    secret.pedersenVSS_AllPartiesVerify(ec, ped, vss, true)

    // Recover the secret
    console.log()
    shares = secret.pedersenVSS_Shares(vss)
    subset = secret.getShareSubset(shares, vss.commitments.length)
    theSecret2 = secret.shamirRecover(ec.rorder, subset, true)

    assert(theSecret == theSecret2, "Recovered secret does not match original!")
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });