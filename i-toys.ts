import * as TOYS from "./toys"

export const iSQUARED = -1;

// Compare two complex points in the format [[xa,xb],[ya,yb]]
// ...with the exception of the point at infinity being [[0]]
export function compPointsEquals(ptA: number[][], ptB: number[][]): boolean {

    return  (ptA.length === ptB.length) &&
            (ptA.every((val, index) => TOYS.pointsEquals(val, ptB[index])));
}

// Convert complex number [a,b] to string
export function strComplex(value: number[]): string {
    if (value[0] == 0)
        return `${value[1]}`;
    else if (value[1] == 0)
        return `${value[0]}i`;
    return `(${value[0]}i + ${value[1]})`;
}

// Convert complex number point to string
export function strCompPt(ptA: any[]): string { 
    if (compPointsEquals(ptA,[[0]]))
        return "(0,0)";
    return "(" + strComplex(ptA[0]) + "," + strComplex(ptA[1]) + ")";
}

// Complex number addition (xa.i + xb) + (ya.i + yb)
export function compadd(xx: number[], yy: number[]): number[]  {
    let aa = xx[0]+yy[0];
    let bb = xx[1]+yy[1];
    return [aa,bb];
}

// Complex number subtraction (xa.i + xb) - (ya.i + yb)
export function compsub(xx: number[], yy: number[]): number[]  {
    let aa = xx[0]-yy[0];
    let bb = xx[1]-yy[1];
    return [aa,bb];
}

// Complex number multiplication (xa.i + xb) * (ya.i + yb)
export function compmul(xx: number[], yy: number[]): number[] {
    let aa = xx[0]*yy[1] + xx[1]*yy[0];
    let bb = xx[1]*yy[1] + iSQUARED*xx[0]*yy[0];
    return [aa,bb];
}

// Complex number multiplication (xa.i + xb) * (ya.i + yb) (% fieldN)
export function compNmul(fieldN: number, xx: number[], yy: number[]): number[]  {
    let aa = TOYS.posmod(xx[0]*yy[1] + xx[1]*yy[0], fieldN);
    let bb = TOYS.posmod(xx[1]*yy[1] + iSQUARED*xx[0]*yy[0], fieldN);
    return [aa,bb];
 }

// Complex number squaring (xa.i + xb) * (xa.i + xb) (% fieldN)
export function compNsqr(fieldN: number, xx: number[]): number[]  {
    return compNmul(fieldN, xx, xx);
}

// Complex number division (xa.i + xb) / (ya.i + yb) (% fieldN)
export function compNdiv(fieldN: number, xx: number[], yy: number[]): number[]  {
    let quo = compNmul(fieldN, xx, [yy[0], (-1)*yy[1]]);
    let div = compNmul(fieldN, yy, [yy[0], (-1)*yy[1]]);
    if (div[0] !== 0) throw "Unexpected: Complex in divisor";
    let inv = TOYS.inverse(fieldN, div[1], false);
    return compNmul(fieldN, quo, [0,inv]);
}

// Complex number exponentiation (xa.i + xb)**pow  (% fieldN)
export function compRaise(xx: number[], pow: number, fieldN: number) { 
    return TOYS.sqrAndMult([0,1], xx, pow, (aa: number[], bb: number[]) => compNmul(fieldN, aa, bb)); 
}

// Compute gradient of a line between two points expressed as complex numbers (% fieldN)
// P = [[xa, xb],[ya, yb]]
// Q = [[xa, xb],[ya, yb]]
// m = (yQ - yP)/(xQ - xP) (% fieldN)
export function gradPplusQ(fieldN: number, ptP: number[][], ptQ: number[][]): number[] {
    let quo = compsub(ptQ[1], ptP[1]);
    let div = compsub(ptQ[0], ptP[0]);
    let ans = compNdiv(fieldN, quo, div);
    return ans;
}

// Compute the intercept of a line between two points expressed as complex numbers (% fieldN)
export function interceptPplusQ(fieldN: number, ptP: number[][], ptQ: number[][]): number[] {
    let y1x2 = compmul(ptP[1], ptQ[0]);
    let y2x1 = compmul(ptQ[1], ptP[0]);
    let quo  = compsub(y1x2, y2x1);
    let div  = compsub(ptQ[0], ptP[0]);
    let ans  = compNdiv(fieldN, quo, div);
    return ans;
}

//Compute the line equation between two complex numbers
export function linePplusQ(
                    fieldN: number, 
                    ptP: number[][], 
                    ptQ: number[][], 
                    verbose: boolean = false): number[][] {
                        
    let gradient = gradPplusQ(fieldN, ptP, ptQ);
    let intercept = interceptPplusQ(fieldN, ptP, ptQ);

    if (verbose)  {   
        const strm = strComplex(gradient);
        const strc = strComplex(intercept);
        console.log(`y = ${strm}x + ${strc}`);
    }

    return [gradient, intercept];
}

// Compute P+Q over an EC, where the points are complex numbers.
// WARNING: function does not verify that the supplied point is actually on the curve!
// WARNING: function does not support doubling the same point!
export function compPplusQ(
                    fieldN: number, 
                    ptP: number[][], 
                    ptQ: number[][],
                    verbose: boolean = false): number[][] {

    let computePplusQ = (fieldN: number, 
                        ptP: number[][], 
                        ptQ: number[][]): number[][] => {

        if (compPointsEquals(ptP,ptQ))
            throw "Compute 2P using comp2P.";                           //Function cannot handle point doubling

        if (compPointsEquals(ptP, [[0]]))         return ptQ;
        if (compPointsEquals(ptQ, [[0]]))         return ptP;
        if (TOYS.pointsEquals(ptP[0], ptQ[0]))    return [[0]];         //PX = QX -> Points on a straight line return Zero

        let gradient = gradPplusQ(fieldN, ptP, ptQ);
        let mSqr     = compmul(gradient, gradient);

        let xx  = compsub(mSqr, ptP[0]);
        xx      = compsub(xx,   ptQ[0]);
        xx[0] = TOYS.posmod(xx[0],fieldN);
        xx[1] = TOYS.posmod(xx[1],fieldN);

        let yy = compsub(ptP[0], xx);
        yy = compmul(gradient, yy);
        yy = compsub(yy, ptP[1]);
        yy[0] = TOYS.posmod(yy[0],fieldN);
        yy[1] = TOYS.posmod(yy[1],fieldN);

        return [xx,yy];
    }

    let ptPQ = computePplusQ(fieldN, ptP, ptQ);

    if (verbose) 
        console.log(`P+Q = ${strCompPt(ptP)} + ${strCompPt(ptQ)} = ${strCompPt(ptPQ)}`);

    return ptPQ;

}

//Compute -P
export function compInv(fieldN: number, ptP: number[][]): number[][] {
    if (compPointsEquals(ptP, [[0]]))    
        return ptP;

    return [ptP[0], [TOYS.posmod(-1*ptP[1][0], fieldN), TOYS.posmod(-1*ptP[1][1], fieldN)]];
}
