import * as TOYS from "./toys"

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

// Genrate n secret shares, with random evaluation points
export function getShares(fieldN: number, poly: number[], nShares: number): number[][] {
    let shares: number[][] = []
    let usedX:  number[] = []       //Evaluation points used

    if (nShares*2 >= fieldN-1)
        throw   "Share count should be much smaller than field size";

    for (let cnt = 1; cnt <= nShares; ) {
        //Pick random evaluation point and ensure we 
        //...didn't already compute this evaluation
        let evalX = getRandomInt(1, fieldN-1);
        if (usedX.includes(evalX))
            continue;

        usedX.push(evalX)
        shares.push([evalX, evalPolynomial(fieldN, poly, evalX)])
        ++cnt
    }

    return shares
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
        throw "threshold must be less or equal to the number or participants"

    let poly = getPolynomial(fieldN, secret, schemeK-1)
    let shares =  getShares(fieldN, poly, schemeN)   

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
