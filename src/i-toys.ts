import {ECurve, unpackEC, ReqEC} from './config'
import * as TOYS from "./toys"

// Compare two complex points in the format [[xa,xb],[ya,yb]]
// ...with the exception of the point at infinity being [[0]]
export function compPointsEquals(ptA: number[][], ptB: number[][]): boolean {

    return  (ptA.length === ptB.length) &&
            (ptA.every((val, index) => TOYS.pointsEquals(val, ptB[index])));
}

// Convert complex number [a,b] to string (a + bi)
export function strComplex(value: number[]): string {
    if (value[1] == 0)
        return `${value[0]}`;
    else if (value[0] == 0)
        return `${value[1]}i`;
    return `(${value[0]} + ${value[1]}i)`;
}

// Convert complex number point [[xa,xb],[ya,yb]] to string ((xa + xb.i),(ya + yb.i))
export function strCompPt(ptA: number[][]): string { 
    if (compPointsEquals(ptA,[[0]]))
        return "(0,0)";
    return "(" + strComplex(ptA[0]) + "," + strComplex(ptA[1]) + ")";
}

// compute (a + bi) % n where a, b can be negative.
// however the result is always positive.
export function compmod(xx: number[], fieldN: number): number[] { 
    return [TOYS.posmod(xx[0], fieldN), TOYS.posmod(xx[1], fieldN)]
}

// Complex number addition (xa + xb.i) + (ya + yb.i)
export function compadd(xx: number[], yy: number[]): number[]  {
    let aa = xx[0]+yy[0];
    let bb = xx[1]+yy[1];
    return [aa,bb];
}

// Complex number subtraction (xa + xb.i) - (ya + yb.i)
export function compsub(xx: number[], yy: number[]): number[]  {
    let aa = xx[0]-yy[0];
    let bb = xx[1]-yy[1];
    return [aa,bb];
}

// Complex number multiplication (xa + xb.i) * (ya + yb.i)
export function compmul(xx: number[], yy: number[], iSQUARED: number): number[] {
    let aa = xx[0]*yy[0] + iSQUARED*xx[1]*yy[1];
    let bb = xx[0]*yy[1] + xx[1]*yy[0];
    return [aa,bb];
}

// Compute chain of complex number multiplications
export function compmulEx(values: number[][], iSQUARED: number): number[] {
    if (values.length == 0)
        throw 'compmulEx empty value array';

    let res: number[] = [1,0];
    values.forEach((val) => {res = compmul(res, val, iSQUARED)})
    return res;
}

// Complex number multiplication (xa + xb.i) * (ya + yb.i) (% fieldN)
export function compNmul(ec: ECurve, xx: number[], yy: number[]): number[]  {
    let {fieldN, iSQR} = unpackEC(ec, ReqEC.N);
    return compmod(compmul(xx, yy, iSQR), fieldN);
 }

// Compute chain of complex number multiplications (% fieldN)
export function compNmulEx(ec: ECurve, values: number[][]): number[] {
    unpackEC(ec, ReqEC.N);
    if (values.length == 0)
        throw 'compmulEx empty value array';
        
    let res: number[] = [1,0];
    values.forEach((val) => {res = compNmul(ec, res, val)})
    return res;
}

// Complex number squaring (xa + xb.i) * (xa + xb.i) (% fieldN)
export function compNsqr(ec: ECurve, xx: number[]): number[]  {
    unpackEC(ec, ReqEC.N);
    return compNmul(ec, xx, xx);
}

// Complex number division (xa + xb.i) / (ya + yb.i) (% fieldN)
export function compNdiv(ec: ECurve, xx: number[], yy: number[]): number[]  {
    let {fieldN} = unpackEC(ec, ReqEC.N);
    let quo = compNmul(ec, xx, [yy[0], (-1)*yy[1]]);
    let div = compNmul(ec, yy, [yy[0], (-1)*yy[1]]);
    if (div[1] !== 0) throw "Unexpected: Complex in divisor";
    let inv = TOYS.inverse(fieldN, div[0], false);
    return compNmul(ec, quo, [inv,0]);
}

// Complex number exponentiation (xa + xb.i)**pow  (% fieldN)
export function compNraise(ec: ECurve, xx: number[], pow: number) { 
    unpackEC(ec, ReqEC.N);
    return TOYS.sqrAndMult([0,1], xx, pow, (aa: number[], bb: number[]) => compNmul(ec, aa, bb)); 
}

// Lookup for points on an EC: y**2  % n = (x**3 + A*x + B) % n
// ...by trying out all combinations
export function ecipoints(ec: ECurve,  verbose: boolean = false): number[][][] {
    let {fieldN, coeffA, coeffB} = unpackEC(ec, ReqEC.NAB);
    let out: number[][][] = [[[0]]];

    //Zero/Point at Infinity is always present
    if (verbose) 
        console.log(strCompPt([[0]]));

    // Compute all possible y**2 values in the field: a + bi
    //0 + 0i, 0 + 1i, 0 + 2i, ... 0 + (n-1)i,   => index / n = a,  index % n = b
    //1 + 0i, 1 + 1i, 1 + 2i, ... 1 + (n-1)i, 
    //(n-1) + 0,          ... (n-1) + (n-1)i, 
    let ysqrd: number[][] = []; 
    for (let cntReal = 0; cntReal < fieldN; ++cntReal) 
        for (let cntImg = 0; cntImg < fieldN; ++cntImg) 
            ysqrd.push(compNsqr(ec, [cntReal, cntImg]));

    // Lookup these y**2 values by computing
    // (x**3 + A*x + B) for all possible x values...
    // and check if these match the y**2 values
    let rightside = (x: number[]) => {
        //Compute: y^2 given x: y^2 = x^3 + A*x + B
        //where x = a + bi
        let xcubed  = compNraise(ec, x, 3)                          //x^3
        let Ax      = compNmul(ec, x, [coeffA,0])                   // Ax
        let ans     = compadd(compadd(xcubed,Ax),[coeffB, 0])       //x^3 + coeffA*x + coeffB

        return compmod(ans,fieldN);
    }

    for (let cntReal = 0; cntReal < fieldN; ++cntReal) 
        for (let cntImg = 0; cntImg < fieldN; ++cntImg)  {
            let solution = rightside([cntReal,cntImg]);

            ysqrd.forEach((ysqVal,idx) => {
                
                if (TOYS.pointsEquals(ysqVal, solution)) {
                    let ya = Math.floor(idx/fieldN);
                    let yb = idx%fieldN;

                    if (verbose) 
                        console.log(strCompPt([[cntReal, cntImg],[ya,yb]]));

                    out.push([[cntReal, cntImg], [ya, yb]]);
                }
            });
        }

    return out;
}

// Check if point is within set
export function ecihasPoint(set: number[][][], pt: number[][]): number {
    return set.findIndex((setPt) => compPointsEquals(setPt, pt) );
}

// Check if P + Q = R for any P, Q gives an R within the same group
//
// let itoys = require('./build/src/i-toys.js')
// itoys.eciClosure({fieldN: 11, coeffA: 4, coeffB: 3}, true)
// itoys.eciClosure({fieldN: 13, coeffA: 4, coeffB: 3}, true)
//
export function eciClosure(ec: ECurve, verbose: boolean = false): boolean {

    unpackEC(ec, ReqEC.NAB);
    let pts = ecipoints(ec, false);

    let confirms: number = 0;
    let notComputed: number = 0;

    for (let icntP = 0; icntP < pts.length; ++icntP) {
        for (let icntQ = icntP; icntQ < pts.length; ++icntQ) {

            let ptR: number[][] = [[0]];
            try {
                ptR = eciAdd(ec, pts[icntP], pts[icntQ], verbose) 
                if (ecihasPoint(pts, ptR) == -1) {
                    console.log(`Closure Test failed for: ${strCompPt(pts[icntP])} + ${strCompPt(pts[icntQ])}`)
                    return false;
                }
                ++confirms;
            }
            catch {
                // Happens when the chord computations leads to a divide by zero.
                // i.e. a complex number for which we cannot obtain an inverse 
                console.log(`Cannot Compute: ${strCompPt(pts[icntP])} + ${strCompPt(pts[icntQ])}`)
                ++notComputed;
            }
        }

        if (verbose) 
            console.log();
    }

    if (verbose)
        console.log(`Confirmed ${confirms}, Not Computed: ${notComputed}`);

    return true;
}

// Compute gradient of a line between two points expressed in complex numbers (% fieldN)
// P = [[xa, xb],[ya, yb]]
// Q = [[xa, xb],[ya, yb]]
// m = (yQ - yP)/(xQ - xP) (% fieldN)
export function ecigradPplusQ(ec: ECurve, ptP: number[][], ptQ: number[][]): number[] {
    unpackEC(ec, ReqEC.N);

    let quo = compsub(ptQ[1], ptP[1]);
    let div = compsub(ptQ[0], ptP[0]);
    let ans = compNdiv(ec, quo, div);
    return ans;
}

// Compute the intercept of a line between two points expressed as complex numbers (% fieldN)
export function eciInterceptPplusQ(ec: ECurve, ptP: number[][], ptQ: number[][]): number[] {
    let {iSQR} = unpackEC(ec, ReqEC.N);

    let y1x2 = compmul(ptP[1], ptQ[0], iSQR);
    let y2x1 = compmul(ptQ[1], ptP[0], iSQR);
    let quo  = compsub(y1x2, y2x1);
    let div  = compsub(ptQ[0], ptP[0]);
    let ans  = compNdiv(ec, quo, div);
    return ans;
}

//Compute the line equation between two complex numbers
export function ecilinePplusQ(
                    ec: ECurve, 
                    ptP: number[][], 
                    ptQ: number[][], 
                    verbose: boolean = false): number[][] {

    unpackEC(ec, ReqEC.N);
    let gradient = ecigradPplusQ(ec, ptP, ptQ);
    let intercept = eciInterceptPplusQ(ec, ptP, ptQ);

    if (verbose)  {   
        const strm = strComplex(gradient);
        const strc = strComplex(intercept);
        console.log(`y = ${strm}x + ${strc}`);
    }

    return [gradient, intercept];
}

// Compute P+Q over an EC, where the points are complex numbers.
// where    m = (y2 – y1)*(x2 – x1)**-1
//       x_PQ = m*m - x1 - x2)
//       y_PQ = m(x1 - x_PQ) - y1
//
// WARNING: function does not verify that the supplied point is actually on the curve!
// WARNING: function does not support doubling the same point!
export function eciPplusQ(
                    ec: ECurve, 
                    ptP: number[][], 
                    ptQ: number[][],
                    verbose: boolean = false): number[][] {

    let {fieldN, iSQR} = unpackEC(ec, ReqEC.N);
    let computePplusQ = (ptP: number[][], ptQ: number[][]): number[][] => {

        if (compPointsEquals(ptP,ptQ))
            throw "Compute 2P using comp2P.";                           //Function cannot handle point doubling

        if (compPointsEquals(ptP, [[0]]))         return ptQ;
        if (compPointsEquals(ptQ, [[0]]))         return ptP;
        if (TOYS.pointsEquals(ptP[0], ptQ[0]))    return [[0]];         //PX = QX -> Points on a straight line return Zero

        let gradient = ecigradPplusQ(ec, ptP, ptQ);
        let mSqr     = compmul(gradient, gradient, iSQR);

        let xx  = compsub(mSqr, ptP[0]);            //  m^2 - x1
        xx      = compsub(xx,   ptQ[0]);            //  m^2 - x1 - x2
        xx      = compmod(xx, fieldN);

        let yy  = compsub(ptP[0], xx);              //  (x1 - x_PQ)
        yy      = compmul(gradient, yy, iSQR);      // m(x1 - x_PQ)
        yy      = compsub(yy, ptP[1]);              // m(x1 - x_PQ) - y1
        yy      = compmod(yy, fieldN);

        return [xx,yy];
    }

    let ptPQ = computePplusQ(ptP, ptQ);

    if (verbose) 
        console.log(`P+Q = ${strCompPt(ptP)} + ${strCompPt(ptQ)} = ${strCompPt(ptPQ)}`);

    return ptPQ;
}

// Compute -P = (x, -y)
export function eciInverse(ec: ECurve, ptP: number[][], verbose: boolean = false): number[][] {

    let {fieldN} = unpackEC(ec, ReqEC.N);
    let invertP = (ptP: number[][]): number[][] => {    
        if (compPointsEquals(ptP, [[0]]))    
            return ptP;

        return [ptP[0], compmod([-1*ptP[1][0], -1*ptP[1][1]], fieldN)];
    }

    let minusP = invertP(ptP)

    if (verbose) 
        console.log(`-P = ${strCompPt(minusP)}`);

    return minusP;
}

// Compute gradient at a tangent to a point expressed as a complex number (% fieldN)
// where    m = (3x**2 + A) (2y)**-1
//
// WARNING: function does not verify that the supplied point is actually on the curve!
export function ecigrad2P(ec: ECurve, ptP: number[][]): number[] {
    let {coeffA, iSQR} = unpackEC(ec, ReqEC.NA);

    let quo = compmulEx([[3,0], ptP[0], ptP[0]], iSQR);     // 3x^2
    quo = compadd(quo, [coeffA,0]);                         // 3x^2 + A

    let div = compmul(ptP[1], [2,0], iSQR);                 //  2y
    return compNdiv(ec, quo, div);                          // (3x^2 + A) (2y)^-1
}

// Compute the interecept of tangent to a point expressed as a complex number (% fieldN)
// where (Ax + 2B - x^3) * (2y)^-1
//
// WARNING: function does not verify that the supplied point is actually on the curve!
export function eciIntercept2P(ec: ECurve, ptP: number[][]): number[] {
    let {coeffA, coeffB, iSQR} = unpackEC(ec, ReqEC.NAB);

    let quo = compmul(ptP[0], [coeffA,0], iSQR);                // Ax
    quo = compadd(quo, [2*coeffB,0]);                           // Ax + 2B

    let xcubed = compmulEx([ptP[0], ptP[0], ptP[0]], iSQR);     // x^3
    quo = compsub(quo, xcubed);                                 // Ax + 2B - x^3

    let div = compmul(ptP[1], [2,0], iSQR);                     //  2y
    return compNdiv(ec, quo, div);                        // (Ax + 2B - x^3) * (2y)^-1
}

//Compute the line equation for a tangent to a point
export function eciline2P(ec: ECurve, ptP: number[][], verbose: boolean = false): number[][] {

    unpackEC(ec, ReqEC.NAB);

    let gradient = ecigrad2P(ec, ptP);
    let intercept = eciIntercept2P(ec, ptP);

    let strm = strComplex(gradient);
    let strc = strComplex(intercept);
    if (verbose)     console.log(`y = ${strm}x + ${strc}`);
    return [gradient,intercept];
}

// Compute P+P over an EC
// WARNING: function does not verify that the supplied point is actually on the curve!
export function eci2P(ec: ECurve, ptP: number[][], verbose: boolean = false): number[][] {

    let {fieldN, iSQR} = unpackEC(ec, ReqEC.NA);

    let compute2P = (ptP: number[][]): number[][] => { 
        //0 + 0 = 0
        if (compPointsEquals(ptP, [[0]]))
            return [[0]];

        //y symetry --> 2P = 0 when y = 0
        if (TOYS.pointsEquals(ptP[1],[0,0]))
            return [[0]];

        let gradient = ecigrad2P(ec, ptP);                  // m
        let mSqr = compmul(gradient,gradient, iSQR);        // m^2

        let xx = compsub(mSqr, ptP[0]);                     // m^2 - x
        xx = compsub(xx, ptP[0]);                           // m^2 - x -x
        xx = compmod(xx, fieldN);

        let yy = compsub(ptP[0], xx);                       // x - x3
        yy = compmul(yy, gradient, iSQR);                   // m(x - x3)
        yy = compsub(yy, ptP[1]);                           // m(x - x3) - y
        yy = compmod(yy, fieldN);
        return [xx,yy];
    }

    let pt2P = compute2P(ptP);

    if (verbose) 
        console.log(`2P = ${strCompPt(ptP)} + ${strCompPt(ptP)} = ${strCompPt(pt2P)}`);

    return pt2P;
}

// Compute P+P over an EC: y**2  % n = (x**3 + A*x + B) % n
// WARNING: function does not verify that the supplied point is actually on the curve!
export function eciAdd( ec: ECurve, 
                        ptP: number[][], 
                        ptQ: number[][], 
                        verbose: boolean = false): number[][] {

    unpackEC(ec, ReqEC.NA);

    let computeAdd = (ptP: number[][], ptQ: number[][]): number[][]  => {
        if (compPointsEquals(ptP, [[0]]))    return ptQ;
        if (compPointsEquals(ptQ, [[0]]))    return ptP;
        if (compPointsEquals(ptP, ptQ))     return eci2P(ec, ptP, false);
        return eciPplusQ(ec, ptP, ptQ, false);
    }

    let ptPQ = computeAdd(ptP, ptQ);
    if (verbose) 
        console.log(`P+Q = ${strCompPt(ptP)} + ${strCompPt(ptQ)} = ${strCompPt(ptPQ)}`);

    return ptPQ;
}

// Compute m*P over an EC: y**2  % n = (x**3 + A*x + B) % n
// WARNING: function does not verify that the supplied point is actually on the curve!
export function eciMultiply(
                    ec: ECurve, 
                    multiplier: number, 
                    ptP: number[][], 
                    verbose: boolean = false): number[][] { 
    unpackEC(ec, ReqEC.NA);
    return TOYS.sqrAndMult([[0]], ptP, multiplier, (ptA: number[][], ptB: number[][]): number[][] => eciAdd(ec, ptA, ptB, verbose)); 
}

// Given an initial point P, compute 2P, 3P, 4P until the cycle is closed.
// A point that cycles through ALL group elements is a generator.
export function eciCycle(
                    ec: ECurve, 
                    ptP: number[][], 
                    ecPoints?: number[][][], 
                    verbose: boolean = false): number[][][] {

    let {fieldN} = unpackEC(ec, ReqEC.NAB);

    //Get list of all points on this curve
    let allPoints = ecPoints ?? ecipoints(ec, false);
    if (ecihasPoint(allPoints, ptP) == -1)
        throw `Failed: Input point is not within E/F${fieldN}`

    let cycle = [ptP];
    if (verbose) 
        console.log(`P = ${strCompPt(ptP)}`);

    let ptNew = eciAdd(ec, ptP, ptP);
    while (!compPointsEquals(ptNew, ptP))
    {  
        if (cycle.length > allPoints.length)
            throw `Unexpected: element order cannot exceed ${allPoints.length}`

        if (ecihasPoint(allPoints, ptNew) == -1)
            throw `Unexpected: Computed point ${strCompPt(ptNew)} is not within E/F${fieldN}`
    
        cycle.push(ptNew);
        if (verbose) 
            console.log(`${cycle.length}P = ${strCompPt(ptNew)}`);

        ptNew = eciAdd(ec, ptP, ptNew);
    }

    if (verbose)
        console.log(`Point ${strCompPt(ptP)} has order ${cycle.length}`);

    return cycle;
}

// For each provided point compute its cycle
export function eciPtsCycles(
                    ec: ECurve, 
                    points?: number[][][], 
                    verbose: boolean = false): number[][][][]  {

    unpackEC(ec, ReqEC.NAB);
    let allPoints = ecipoints(ec);
    let allcycles = [];

    points = points ?? allPoints;
    for (let cnt = 0; cnt < points.length; ++cnt) {

        //skip the special infinity point = [[0]]
        if (compPointsEquals(points[cnt], [[0]])) 
            continue;

        let onecycle = eciCycle(ec, points[cnt], allPoints);
        allcycles.push(onecycle);

        if (verbose)
            console.log(onecycle)
    }
    return allcycles;
}

// For each EC point compute its cycle
export function eciAllCycles(ec: ECurve, verbose: boolean = false): number[][][][]  {
    return eciPtsCycles(ec, undefined, verbose);
}

//Compare if 2 sets have exactly the same elements
export function compSetCompare(
                        set1: number[][][], 
                        set2: number[][][], 
                        verbose: boolean = false): boolean {

    if (set1.length != set2.length) {
        if (verbose)
            console.log("Different set lengths");

        return false;
    }

    //Look for a point in set1, that does NOT exist in set2
    let idxErr = set1.findIndex((pt, idx1) => {
        //Find matching point in set2
        let idx2 = set2.findIndex((pt2) => compPointsEquals(pt, pt2) );

        //Terminate if a matching point is NOT found
        if (idx2 < 0) 
        {
            if (verbose)
                console.log(`Set 1 point not found in Set 2: ${strCompPt(pt)}`);
            return true;
        }
        
        //Make sure there is only 1 such point in set1
        let idx3 = set1.findIndex((ptx) => ((ptx !== pt) && compPointsEquals(ptx, pt)), pt);
        //Terminate if repeated point is found
        if (idx3 >= 0)
        {
            if (verbose)
                console.log(`Duplicate Set 1 point ${strCompPt(pt)} at indexes: ${idx1} and ${idx3}`);
            return true;
        }

        if (verbose)
            console.log(`set1[${idx1}] = set2[${idx2}]: ${strCompPt(set1[idx1])} = ${strCompPt(set2[idx2])}`);
    })

    return (idxErr < 0);
}

// For the provided cycles, filter out duplicates.
export function eciUniqueCycleFilter(
            cycles: number[][][][], 
            verbose: boolean = false): number[][][][] {

    if (cycles.length == 0)
            return [];

    let cycOut = [cycles[0]];
    let cycIdx = [0];
    if (verbose)
        console.log(cycles[0])

    for (let cnt = 1; cnt < cycles.length; ++cnt) {

       let idx = cycOut.findIndex((aCycle, aCycleIdx) => {
            if (compSetCompare(cycles[cnt], aCycle, false)) {
                //    console.log(`Cycle ${cnt+1} matches Cycle ${aCycleIdx+1}`);
                return true;               
            }
            return false;
        });

       if (idx  == -1)
       {
            cycOut.push(cycles[cnt]);
            cycIdx.push(cnt);

            if (verbose)
                console.log(cycles[cnt])
       }
    }

    return cycOut;
}

// Filter cycles by order
export function eciFilterCycles(cycles: number[][][][], rorder: number): number[][][][]  {
    let cycOut: number[][][][] = [];

    cycles.forEach((cyc) => {
        if (cyc.length == rorder)
            cycOut.push(cyc);
    })

    return cycOut;
}

// For each EC point compute its cycle, filtering out duplicates.
export function eciUniqueCycles(ec: ECurve, verbose: boolean = false): number[][][][] {
    unpackEC(ec, ReqEC.NAB);
    let cycAll = eciAllCycles(ec);
    return eciUniqueCycleFilter(cycAll, verbose);
}

// Find all the r-torsion points for the given curve. 
// By applying this rule:
// "...a point is “killed” (sent to O) when multiplied by its order"
// Pairings for beginners - Craig Costello
//
// itoys.eciTorsion({fieldN: 11, coeffA: 0, coeffB: 4, rorder: 3})
export function eciTorsion(ec: ECurve, verbose: boolean = false): number[][][] {

    let {rorder} = unpackEC(ec, ReqEC.NABR);
    let ptsR: number[][][] = [];
    let pts = ecipoints(ec);
    if (pts.length % rorder != 0)
        throw `r (${rorder}) is not a factor of #E (${pts.length})`

    // A point Q that is in the r-torsion will satisfy this relation:
    // rQ = 0
    for (let cnt = 0; cnt < pts.length; ++cnt) {
        let rQ = eciMultiply(ec, rorder, pts[cnt], false);
        
        if (compPointsEquals(rQ, [[0]]))
            ptsR.push(pts[cnt]);
    }

    if (verbose)
        console.log(ptsR)

    return ptsR;
}

// Find all the r-torsion points for the given curve. 
// By applying this rule:
// Given any two points P, Q that are not in the same (r-order) subgroup, neither of 
// which is 0, any other point in E[r] can be obtained as [i]P + [j]Q for i, j = [0, r-1]
// Pairings for beginners - Craig Costello
//
// itoys.eciTorByPts({fieldN: 11, coeffA: 0, coeffB: 4, rorder: 3}, [[0,0],[9,0]], [[7,2],[0,1]])
export function eciTorByPts(
                ec: ECurve, 
                ptP: number[][], 
                ptQ: number[][],
                verbose: boolean = false): number[][][] {

    let {rorder} = unpackEC(ec, ReqEC.NABR);
    let ptsOut = [];

    //Check P and Q are not Zero
    if (compPointsEquals(ptP, [[0]]) || compPointsEquals(ptQ, [[0]])) 
        throw `Point P, Q cannot be Zero`

    //Check if P and Q are truly an r-order point
    let zero = eciMultiply(ec, rorder, ptP, false);
    if (!compPointsEquals(zero, [[0]])) 
        throw `Point P is not of order ${rorder}`

    zero = eciMultiply(ec, rorder, ptQ, false);
    if (!compPointsEquals(zero, [[0]])) 
        throw `Point Q is not of order ${rorder}`

    //Check that P and Q are not in the same subgroup
    let cycleP = eciCycle(ec, ptP)
    if (ecihasPoint(cycleP, ptQ) != -1)
        throw `P and Q are in the same subgroup`
    
    for (let cnt1 = 0; cnt1 < rorder; ++cnt1)
        for (let cnt2 = 0; cnt2 < rorder; ++cnt2) {
            let mP = (cnt1 == 0) ? [[0]] : eciMultiply(ec, cnt1, ptP, false);
            let mQ = (cnt2 == 0) ? [[0]] : eciMultiply(ec, cnt2, ptQ, false);

            let newP = eciAdd(ec, mP, mQ, false);
            ptsOut.push(newP)
        }

    if (verbose)
        console.log(ptsOut)

    return ptsOut;
}

// For each N-order point compute its cycle, filtering out duplicates.
export function eciTorUniqueCycles(ec: ECurve, verbose: boolean = false): number[][][][] {
    unpackEC(ec, ReqEC.NABR);
    let points = eciTorsion(ec);
    let cycNOrder = eciPtsCycles(ec, points, verbose);
    return eciUniqueCycleFilter(cycNOrder, verbose);
}

// Map point by applying Frobenius endomorphism π
// For E/Fq^2 π: (x, y) -> (x^q, y^q)
//
// This mapping is applied k times computing π^k
export function eciFrobeniusPi(
                        ec: ECurve,
                        powk: number, 
                        ptP: number[][], 
                        verbose: boolean = false): number[][] {
                  
    let {fieldN} = unpackEC(ec, ReqEC.N);                            
    let strP = strCompPt(ptP)
    let ptPi = ptP;

    //Skip [[0]] -> [[0]]
    if (ptPi.length == 2) {
        let piX = ptPi[0];
        let piY = ptPi[1];

        for (let cntk = 0; cntk < powk; ++cntk) {
            piX = compNraise(ec, piX, fieldN);
            piY = compNraise(ec, piY, fieldN);
        }

        ptPi = [piX, piY]
    }

    if (verbose) 
        console.log(`${strP} -> ${strCompPt(ptPi)}`);

    return ptPi;
}

// Compute trace map Tr(P)
// Galois theory tells us Tr: E(q^k) -> E(q)
// Tr(P) = π^0 (P) + π^1 (P) + π^2 (P) ... + π^(k-1) (P)
// Tr(P) =      P  + π^1 (P) + π^2 (P) ... + π^(k-1) (P)
// When the order r||#E(q), Tr sends all torsion points...
// ...to 1 subgroup of the r-torsion
// Pairings for beginners - Craig Costello
export function eciFrobeniusTr(
                        ec: ECurve,
                        powk: number, 
                        ptP: number[][],
                        verbose: boolean = false): number[][] {

    let {fieldN} = unpackEC(ec, ReqEC.NA);
    let strP = strCompPt(ptP)
    let ptOut = ptP;

    if (ptOut.length == 2) {
        let piX = ptOut[0];
        let piY = ptOut[1];

        for (let cntk = 1; cntk < powk; ++cntk) {
            piX = compNraise(ec, piX, fieldN);
            piY = compNraise(ec, piY, fieldN);
            ptOut  = eciAdd(ec, ptOut, [piX, piY], false);
        }
    }

    if (verbose)
        console.log(`Tr(${strP}) = ${strCompPt(ptOut)}`)

    return ptOut;
}

// Compute the anti-trace map Tr(P)
// aTr: P -> P’ = [k]P – Tr(P) 
export function eciAntiFrobeniusTr(
                        ec: ECurve,
                        powk: number, 
                        ptP: number[][],
                        verbose: boolean = false): number[][] {

    unpackEC(ec, ReqEC.NA);
    let kp = eciMultiply(ec, powk, ptP);                // [k]P
    let trace = eciFrobeniusTr(ec, powk, ptP, false)    // Tr(P)
    trace = eciInverse(ec, trace);                      //-Tr(P)

    let ptOut  = eciAdd(ec, kp, trace);                 // [k]P - Tr(P)
    if (verbose) 
        console.log(`${strCompPt(ptP)} -> ${strCompPt(ptOut)}`);

    return ptOut;
}

// Compute trace map Tr(P) for all torsion points
// Function returns all the unique points resulting from Tr(P)
// ...which effectively results in the: 
//                  Base-Field Subgroup
//
// let itoys = require('./build/src/i-toys.js')
// let torPts = itoys.eciTorByPts({fieldN: 11, coeffA: 0, coeffB: 4, rorder: 3}, [[0,0],[9,0]], [[7,2],[0,1]])
// let baseField = itoys.eciFrobeniusTrMap( {fieldN: 11, coeffA: 0}, 2, torPts, true)
export function eciFrobeniusTrMap(
                            ec: ECurve,
                            powk: number, 
                            torPts: number[][][],
                            verbose: boolean = false): number[][][] {

    unpackEC(ec, ReqEC.NA);
    let torOut: number[][][] = [];

    torPts.forEach((pt) => {
        let ptOut  = eciFrobeniusTr(ec, powk, pt, verbose);

        //Add if not already added
        let idx = torOut.findIndex((pt2) => compPointsEquals(ptOut,pt2));
        if (idx < 0)  torOut.push(ptOut);
    });
    return torOut; 
}

// Compute anti-trace map aTr(P) for all torsion points
// Function returns all the unique points resulting from aTr(P)
// ...which effectively results in the: 
//                  Trace Zero Subgroup
//
// let itoys = require('./build/src/i-toys.js')
// let torPts = itoys.eciTorByPts({fieldN: 11, coeffA: 0, coeffB: 4, rorder: 3}, [[0,0],[9,0]], [[7,2],[0,1]])
// let traceZero = itoys.eciAntiFrobeniusTrMap({fieldN: 11, coeffA: 0}, 2, torPts, true)
export function eciAntiFrobeniusTrMap(
                            ec: ECurve,
                            powk: number, 
                            torPts: number[][][],
                            verbose: boolean = false): number[][][] {

    unpackEC(ec, ReqEC.NA);
    let torOut: number[][][] = [];

    torPts.forEach((pt) => {
        let ptOut  = eciAntiFrobeniusTr(ec, powk, pt, verbose);

        //Add if not already added
        let idx = torOut.findIndex((pt2) => compPointsEquals(ptOut,pt2));
        if (idx < 0)  torOut.push(ptOut);
    });
    return torOut; 
}

// Find embedding degree k, limiting the search between [1,10]
// where k allows forming an extension field Fq^k such that to
// obtain all the r torsion points.
// For prime q and r, k is the smallest positive integer that 
// satisfies:       
//      r | (q^k - 1)   =>    (q^k - 1) % r = 0
export function eciEmbeddingDegree(ec: ECurve,verbose: boolean = false) {
    
    let {fieldN, rorder} = unpackEC(ec, ReqEC.NABR);
    let powk = 1;

    if (!TOYS.isPrime(fieldN))
        throw `Field n is not prime`

    if (!TOYS.isPrime(rorder))
        throw `Order r is not prime`

    //Try out all k within [1, 10]
    for ( ;powk < 11; ++powk) {
        let qk = TOYS.raisePower(fieldN, powk, rorder)

        if (TOYS.posmod(qk-1,rorder) == 0)
            break;
    }

    if (verbose) {
        if (powk < 11)  console.log(`Embedding Degree k = ${powk}`)
        else            console.log(`Embedding Degree k not found within [1,10]`)
    }
    return (powk < 11) ? powk : -1;
}

// Print out a set of point cycles
export function eciShowCycles(cycles: number[][][][]): void {

    for (let cnt = 0; cnt < cycles.length; ++cnt) {
        let outstr = "";
        cycles[cnt].forEach((pt) => {
            if (outstr.length === 0) 
                  outstr  = `${cnt+1}. C${cycles[cnt].length}: ${strCompPt(pt)}`;
            else  outstr += ` -> ${strCompPt(pt)}`;           
        });
        console.log();
        console.log(outstr);
    }
}

// Print out a list of points
export function eciShowPoints(points: number[][][]): void {

    let outstr = "";
    points.forEach((pt) => {
        if (outstr.length === 0) 
              outstr  = `$ Total Points ${points.length}: ${strCompPt(pt)}`;            
        else  outstr += `, ${strCompPt(pt)}`;           
    });
    console.log();
    console.log(outstr);
}
