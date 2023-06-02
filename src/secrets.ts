import {ECurve, unpackEC, ReqEC, 
        PCommit, PVSS, PMPCParty, PMPCPartyShares, PMPCPartyAggr} from './config'
import * as TOYS from "./toys"
import * as ITOYS from "./i-toys"

// Generate a random integer between a minimum and maximum value (inclusive)
function getRandomInt(min: number, max: number) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Generate a polynomial with random coefficients of given degree whose f(0) = zeroCoeff
// Return an array of coefficients in the order: x^0, x^1, .... x^deg
export function getPolynomial(fieldN: number, zeroCoeff: number, deg: number): number[] {
    let coeff: number[] = [];

    coeff.push(TOYS.posmod(zeroCoeff, fieldN))
    for (let cnt = 1; cnt  <= deg; ++cnt) {
        coeff.push(getRandomInt(1, fieldN-1))
    }

    return coeff;
}

// Evaluate a polynomial represented by its array of coefficients
export function evalPolynomial(fieldN: number, poly: number[], x: number): number {

    let ans = poly[0]
    let nextX = TOYS.posmod(x, fieldN);

    for (let cnt = 1; cnt < poly.length; ++cnt) {
        ans   = TOYS.posmod(ans+poly[cnt]*nextX, fieldN)
        nextX = TOYS.posmod(x*nextX, fieldN)
    }
    return ans;
}

// Peform a set of evaluations for the given list of x values
export function evalPolynomialEx(fieldN: number, poly: number[], evalX: number[]): number[][] {
    let ans: number[][] = []

    for (let cnt = 0; cnt < evalX.length; ++cnt) {
        ans.push([evalX[cnt], evalPolynomial(fieldN, poly, evalX[cnt])])
    }
    return ans;
}

// Generate an array of random evaluation points of length total
export function getUniqueRandomEval(fieldN: number, total: number): number[] {

    let evalX:  number[] = []       //Evaluation points used

    if (total*2 >= fieldN-1)
        throw   "Total evaluation points must be much smaller than field size";

    while (evalX.length < total) {
        //Pick random evaluation point and ensure we 
        //...didn't already pick this.
        let oneX = getRandomInt(1, fieldN-1);

        if (!evalX.includes(oneX))
             evalX.push(oneX)
    }

    return evalX
}

// Get a random combination of shares
export function getShareSubset(shares: number[][], setSz: number): number[][] {
    
    if (setSz < 1)
        throw "Set size too small";

    if (setSz > shares.length)
        throw "Share subset must be smaller than share total";

    if (setSz == shares.length)
        return shares

    let subset: number[][] = []
    let used:  number[] = []

    for (let cnt = 0; cnt < setSz; ) {
        //Pick random shares 
        let idx = getRandomInt(0, shares.length-1);
        if (used.includes(idx))
            continue;

        used.push(idx)
        subset.push(shares[idx])
        ++cnt
    }

    return subset;
}

// Setup a K-of-N Shamir's Secret Sharing scheme 
// where N is the number of participants to which we give a secret share
//       K is the number of secret shares required to re-compose the secret
export function shamirSetup(
                fieldN: number, 
                secret: number, 
                schemeK: number, 
                schemeN: number,
                verbose: boolean = false): number[][] {
    if (schemeK < 2)
        throw "threshold must be greater or equal to 2"

    if (schemeK > schemeN)
        throw "threshold must be less or equal to the number of participants"

    let poly    = getPolynomial(fieldN, secret, schemeK-1)
    let evalX   = getUniqueRandomEval(fieldN, schemeN)
    let shares  = evalPolynomialEx(fieldN, poly, evalX)   

    if (verbose)
        TOYS.ecShowPoints(shares)

    return shares;
}

// Recover the secret given an array of shares (points)
// [[x1,y1],[x2,y2],[x3,y3]...]
//
// It is up to the caller to make sure that the correct number
// of shares matching/exceeding the scheme threshold are provided
//
// The functions computes f(0) using Lagrange Interpolation 
export function shamirRecover(
                    fieldN: number, 
                    shares: number[][],
                    verbose: boolean = false): number {
    let secret: number = 0;

    let lj_of_x = (idx: number): number => {
        if (idx >= shares.length)
            throw "Index must be smaller than share count"

        let top = 1;
        let bot = 1;
        let xj  = shares[idx][0];

        for (let cnt = 0; cnt < shares.length; ++cnt)
        {
            if (cnt == idx) continue;
            top = TOYS.posmod(top * shares[cnt][0], fieldN)
            bot = TOYS.posmod(bot * (shares[cnt][0] - xj), fieldN)
        }

        return TOYS.posmod(TOYS.inverse(fieldN, bot) * top, fieldN)
    }

    for (let cnt = 0; cnt < shares.length; ++cnt) {
        secret = TOYS.posmod(secret + shares[cnt][1] * lj_of_x(cnt), fieldN)
    }

    if (verbose)
        console.log(`Recovered Shamir's Secret: ${secret}`)

    return secret;
}

// Validate the G and H points used in the Pedersen
// commitment scheme are truly on the curve and of
// the claimed order.
//
// In Pedersen we start with a curve over a prime field p.
// But work with points from within a sub-group of order q.
export function pedersenParamCheck(
                ec: ECurve, 
                ped: PCommit) {

    unpackEC(ec, ReqEC.NABR);

    //Verify that G and H are on the EC and have order <rorder>
    let tor = ITOYS.eciTorsion(ec)
    if (ITOYS.ecihasPoint(tor,ped.ptG) == -1)
        throw `Point G not found in ${ec.rorder} sub-group`

    if (ITOYS.ecihasPoint(tor,ped.ptH) == -1)
        throw `Point G not found in ${ec.rorder} sub-group`
}

// Compute Pedersen commitment given EC points G, H,  secret and 
// salt values.
//
// Example Curve (used in Plonk by Hand)
// ec = {fieldN: 101, coeffA: 0, coeffB: 3, rorder: 17, iSQR: -2}
//
// ---- order 17 sub-group ---
// ped = {
//      ptG: [[1,0],[2,0]],              
//      ptH: [[12,0],[69,0]]    //12G
// }
//
// pedersenCommit(ec, ped, 13, 9, true, true)
export function pedersenCommit(
                ec: ECurve, 
                ped: PCommit, 
                secret: number, 
                salt: number,
                verbose: boolean = false):  number[][] {

    let {rorder} = unpackEC(ec, ReqEC.NABR);

    // Secret and salt should be from the field 
    // defined by the sub-group order
    if ((secret < 0) || (secret >= rorder))
        throw `Secret must be within F_${rorder}`

    if ((salt < 0) || (salt >= rorder))
        throw `Salt must be within F_${rorder}`

    return ITOYS.eciAdd(
                ec, 
                ITOYS.eciMultiply(ec, secret, ped.ptG, verbose),
                ITOYS.eciMultiply(ec, salt, ped.ptH, verbose), verbose)
}

// Initialize a Pedersen Verifiable Secret Sharing k-of-n scheme.
// This would be called by the dealer to produce all the info
// to be distributed to the n participants.
export function pedersenVSS(
    ec: ECurve, 
    ped: PCommit, 
    secret: number, 
    thresholdK: number, 
    partiesN: number | number[],
    verbose: boolean = false) : PVSS {

    let {rorder} = unpackEC(ec, ReqEC.NABR);
    let partyIDs: number[] = [];

    pedersenParamCheck(ec, ped)

    if (thresholdK < 2)
        throw "threshold must be greater or equal to 2"

    if (typeof partiesN ===  "number") {
        let partyCnt: number = partiesN
        partyIDs = getUniqueRandomEval(rorder, partyCnt)
    }
    else {
        partyIDs = partiesN
    }

    if (thresholdK > partyIDs.length)
        throw "threshold must be less or equal to the number of participants"

    let saltT    = getRandomInt(1, rorder - 1)
    let polyS    = getPolynomial(rorder, secret, thresholdK-1)
    let polyT    = getPolynomial(rorder, saltT,  thresholdK-1)
    let sharesS  = evalPolynomialEx(rorder, polyS, partyIDs)   
    let sharesT  = evalPolynomialEx(rorder, polyT, partyIDs)

    // Construct participant secret shares as a mapping
    // Party_i => (s_i, t_i)
    const partyShares: Map<number, number[]> = new Map()
    for(let idx = 0; idx < partyIDs.length; ++idx)
        partyShares.set(partyIDs[idx], [sharesS[idx][1], sharesT[idx][1]])

    // Compute commitments from 0 to k-1
    let commitments: number[][][] = []
    for (let cnt = 0; cnt < thresholdK; ++cnt)
    {
        let Ei  = pedersenCommit(ec, ped, polyS[cnt], polyT[cnt])
        commitments.push(Ei)
    }

    if (verbose) {
        console.log()
        console.log('Party Shares:')
        partyShares.forEach((val, key) => console.log(`Party Id ${key} <- (${val[0]}, ${val[1]})`))

        console.log()
        console.log('Commitments:')
        commitments.forEach((com, idx) => console.log(`E${idx}: ${ITOYS.strCompPt(com)}`))
    }

    return {partyShares, commitments}
}

// Verify the share given to 1 participant in the Pedersen VSS scheme
export function pedersenVSS_1PartyVerify(
    ec: ECurve, 
    ped: PCommit,
    pid: number,
    secretShare: number,
    saltShare: number,
    commitments: number[][][],
    verbose: boolean = false): boolean {

    unpackEC(ec, ReqEC.NABR);

    let thresholdK = commitments.length

    if (thresholdK < 2)
        throw "number of commitments (threshold) must be greater or equal to 2"

    let Ei1 : number[][]  = pedersenCommit(ec, ped, secretShare, saltShare, false)
    let Ei2 : number[][]  = commitments[0];

    let mul = pid;
    for (let idx = 1; idx < thresholdK; ++idx) {
        Ei2 = ITOYS.eciAdd(ec, Ei2, ITOYS.eciMultiply(ec, mul, commitments[idx]))
        mul *= pid;
    }

    let res = ITOYS.compPointsEquals(Ei1,Ei2)
    
    if (verbose) {
        if (res) {
            console.log("VERIFIED OK")
            console.log(`E_${pid}(${secretShare}, ${saltShare}) = ${ITOYS.strCompPt(Ei1)}`)
        }
        else {
            console.log(`VERIFIED FAILED: E_${pid}(${secretShare}, ${saltShare}) = ${ITOYS.strCompPt(Ei1)}`)
            console.log(`E_${pid}(${secretShare}, ${saltShare}) = ${ITOYS.strCompPt(Ei1)}`)
            console.log(`SUM  = ${ITOYS.strCompPt(Ei2)}`)
        }
    }

    return res;
}

// Verify all Pedersen VSS shares, this function could be used by the
// dealer to cross check the shares before distributing them
export function pedersenVSS_AllPartiesVerify(
    ec: ECurve, 
    ped: PCommit,
    vss: PVSS,
    verbose: boolean = false) {

    unpackEC(ec, ReqEC.NABR);

    vss.partyShares.forEach((share, pid) => {
        if (!pedersenVSS_1PartyVerify(ec, ped, pid, share[0], share[1], vss.commitments, verbose))
            throw `FAILED Verificatoin for party ${pid}`;
    })
}

// Gather the secret shares in a VSS scheme into one array.
// In real live k parties would bring together their share.
// Here we cheat and take the shares from the setup info.
//
// This allows us to recover the secret using shamirRecover
export function pedersenVSS_Shares(vss: PVSS): number[][] {
    let shares: number[][] = []
    vss.partyShares.forEach((pShare,pid) => shares.push([pid, pShare[0]]))

    return shares
}

// Initialize a Pedersen Verifiable Secret Sharing k-of-n scheme MPC
// for a single party. This should be called 1x by each party.
export function pedersenMPC_PartySetup(
    ec: ECurve, 
    ped: PCommit, 
    pid: number,
    thresholdK: number, 
    partiesN: number[],
    verbose: boolean = false): PMPCParty {

    let {rorder} = unpackEC(ec, ReqEC.NABR);

    // Validate pedersen scheme EC points
    pedersenParamCheck(ec, ped)

    // Validate that provided id is one of the party IDs
    if (!partiesN.includes(pid))
        throw "Party ID not found!";

    // Generate random secret
    let partySecret = getRandomInt(1, rorder-1)
    
    if (verbose) {
        console.log()
        console.log("********************************************")
        console.log(` Initializing shares distributed by P_${pid} `)
    }

    // Generate k-of-n VSS over the party's secret
    let vss = pedersenVSS(ec, ped, partySecret, thresholdK, partiesN, verbose)

    return { id: pid, secret: partySecret, vss }
}

// Initialize a Pedersen Verifiable Secret Sharing k-of-n scheme MPC
// for all parties.
export function pedersenMPC_AllSetup(
    ec: ECurve, 
    ped: PCommit, 
    thresholdK: number, 
    partiesN: number[],
    verbose: boolean = false): PMPCParty[] {

    let all: PMPCParty[] = []
    partiesN.forEach((pid) => all.push(pedersenMPC_PartySetup(ec, ped, pid, thresholdK,partiesN, verbose)))
    return all
}

// Expose the secret that results from the MPC setup
// This is a cheat that can be done since we are running the entire
// MPC on our own...
export function pedersenMPC_Secret(
                    ec: ECurve,
                    mpcSetup: PMPCParty[],
                    verbose: boolean = false): number {

    let {rorder} = unpackEC(ec, ReqEC.NABR);

    let secret: number = 0
    mpcSetup.forEach(pty => secret += pty.secret)

    secret = TOYS.posmod(secret, rorder)
    if (verbose)
        console.log(`Shhhh the secret is ${secret}`)

    return secret;
}

// Gather Pedersen VSS MPC parameters for a single party
export function pedersenMPC_1PartyShares(
    mpcSetup: PMPCParty[], 
    pid: number, 
    verbose: boolean = false) : PMPCPartyShares {

    let partyOut: PMPCPartyShares = {id: pid, shares: [], commitSets: []}
    let partyTot = mpcSetup.length;

    if (partyTot < 2)
        throw "Scheme cannot have less than 2 parties";
    
    mpcSetup.forEach((mpcPty, idx) => {
        if (partyTot < mpcPty.vss.commitments.length)
            throw "Number of parties cannot be less than the threshold.";

        let sharePi = mpcPty.vss.partyShares.get(pid)
        if (!sharePi)
            throw `P_${mpcPty.id} did not provide share for P_${pid}`

        partyOut.shares.push(sharePi);
        partyOut.commitSets.push(mpcPty.vss.commitments)
    })

    if (verbose) {
        console.log()
        console.log(`Shares for P_${pid}`)

        let strShares = ""
        partyOut.shares.forEach((val) => {
                            if (strShares.length == 0)
                                    strShares += `(${val[0]}, ${val[1]})`
                            else    strShares += `, (${val[0]}, ${val[1]})`
                        }
                    )
        console.log("(si, ti): " + strShares)
    }

    return partyOut;
}

// Gather Pedersen VSS MPC parameters for each party
export function pedersenMPC_AllShares(
    mpcSetup: PMPCParty[], 
    verbose: boolean = false) : PMPCPartyShares[] {

    let allParties: PMPCPartyShares[] = []
    mpcSetup.forEach( mpcPty => allParties.push(pedersenMPC_1PartyShares(mpcSetup, mpcPty.id, verbose)))
    return allParties;
}

// Verify Pedersen VSS MPC parameters given to a single party
export function pedersenMPC_1PartyVerify(
    ec:  ECurve, 
    ped: PCommit,
    mpcPty: PMPCPartyShares,
    verbose: boolean = false) {

    return mpcPty.shares.every((oneShare, idx) => 
            pedersenVSS_1PartyVerify(ec, ped, mpcPty.id, oneShare[0], oneShare[1], mpcPty.commitSets[idx], verbose)
        )
}

// Iterate over each party and verify its share of secrets
export function pedersenMPC_AllVerify(
    ec:  ECurve, 
    ped: PCommit,
    allPty: PMPCPartyShares[], 
    verbose: boolean = false): boolean {

    return allPty.every((onePty) => {
            return  pedersenMPC_1PartyVerify(ec, ped, onePty, verbose)
        })
}

// Aggregate shares and commitments for one party to obtain...
//      * single share (secretShare, saltShare)
//      * Commitment list
export function pedersenMPC_1PartyAggr(
                        ec: ECurve, 
                        ped: PCommit, 
                        mpcPty: PMPCPartyShares,
                        verbose: boolean = false): PMPCPartyAggr {

    let {rorder} = unpackEC(ec, ReqEC.NABR);

    let mpcAggr:PMPCPartyAggr = {
            id: mpcPty.id, 
            share: JSON.parse(JSON.stringify(mpcPty.shares[0])), 
            commitments: JSON.parse(JSON.stringify(mpcPty.commitSets[0]))}

    for (let cnt = 1; cnt < mpcPty.shares.length; ++cnt) {
        mpcAggr.share[0] += mpcPty.shares[cnt][0]
        mpcAggr.share[1] += mpcPty.shares[cnt][1]
    }
    mpcAggr.share[0] = TOYS.posmod(mpcAggr.share[0], rorder)
    mpcAggr.share[1] = TOYS.posmod(mpcAggr.share[1], rorder)

    for (let cnt = 1; cnt < mpcPty.commitSets.length; ++cnt) {
        mpcPty.commitSets[cnt].forEach((Ei,idx) => 
                mpcAggr.commitments[idx] = ITOYS.eciAdd(ec, mpcAggr.commitments[idx], Ei)
        )
    }

    if (!pedersenVSS_1PartyVerify(
                    ec, ped, 
                    mpcAggr.id, 
                    mpcAggr.share[0], 
                    mpcAggr.share[1],
                    mpcAggr.commitments,
                    verbose))
            throw "FAILED Validation of aggregate share!"

    if (verbose) {
        console.log()
        console.log(`Shares for P_${mpcAggr.id}: (${mpcAggr.share[0]}, ${mpcAggr.share[1]})`)

        console.log()
        console.log('Commitments:')
        mpcAggr.commitments.forEach((com, idx) => console.log(`E${idx}: ${ITOYS.strCompPt(com)}`))
    }

    return mpcAggr;
}

// Aggregate shares and commitments for each Party
export function pedersenMPC_AllAggr(
                            ec: ECurve, 
                            ped: PCommit, 
                            allPty: PMPCPartyShares[],
                            verbose: boolean = false): PMPCPartyAggr[] {

    unpackEC(ec, ReqEC.NABR);

    let allAggr: PMPCPartyAggr[] = []
    allPty.forEach((onePty) => allAggr.push(pedersenMPC_1PartyAggr(ec, ped, onePty, verbose)))
    return allAggr
}

// Extract list of aggregate secret shares in the form (party_id, secret_share)
// This is the format required by shamirRecover
export function pedersenMPC_ExtractShares(allAggr: PMPCPartyAggr[]): number[][] {
    let shares: number[][] = []

    allAggr.forEach(oneAggr => shares.push([oneAggr.id, oneAggr.share[0]]))
    return shares;
}
