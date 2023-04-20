import * as TOYS from "./toys"

export const iSQUARED = -1;

// Compare two complex points in the format [[xa,xb],[ya,yb]]
// ...with the exception of the point at infinity being [[0]]
export function compPointsEquals(ptA: number[][], ptB: number[][]): boolean {

    return  (ptA.length === ptB.length) &&
            (ptA.every((val, index) => TOYS.pointsEquals(val, ptB[index])));
}

// Convert complex number [a,b] to string (a + bi)
export function strComplex(value: number[]): string {
    if (value[0] == 0)
        return `${value[1]}i`;
    else if (value[1] == 0)
        return `${value[0]}`;
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
export function compmul(xx: number[], yy: number[]): number[] {
    let aa = xx[0]*yy[0] + iSQUARED*xx[1]*yy[1];
    let bb = xx[0]*yy[1] + xx[1]*yy[0];
    return [aa,bb];
}

// Complex number multiplication (xa + xb.i) * (ya + yb.i) (% fieldN)
export function compNmul(fieldN: number, xx: number[], yy: number[]): number[]  {
    return compmod(compmul(xx, yy), fieldN);
 }

// Complex number squaring (xa + xb.i) * (xa + xb.i) (% fieldN)
export function compNsqr(fieldN: number, xx: number[]): number[]  {
    return compNmul(fieldN, xx, xx);
}

// Complex number division (xa + xb.i) / (ya + yb.i) (% fieldN)
export function compNdiv(fieldN: number, xx: number[], yy: number[]): number[]  {
    let quo = compNmul(fieldN, xx, [yy[0], (-1)*yy[1]]);
    let div = compNmul(fieldN, yy, [yy[0], (-1)*yy[1]]);
    if (div[1] !== 0) throw "Unexpected: Complex in divisor";
    let inv = TOYS.inverse(fieldN, div[0], false);
    return compNmul(fieldN, quo, [inv,0]);
}

// Complex number exponentiation (xa + xb.i)**pow  (% fieldN)
export function compNraise(xx: number[], pow: number, fieldN: number) { 
    return TOYS.sqrAndMult([0,1], xx, pow, (aa: number[], bb: number[]) => compNmul(fieldN, aa, bb)); 
}

// Lookup for points on an EC: y**2  % n = (x**3 + A*x + B) % n
// ...by trying out all combinations
export function ecipoints(
                fieldN: number, 
                coeffA: number, 
                coeffB: number, 
                verbose: boolean = false): number[][][] {
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
            ysqrd.push(compNsqr(fieldN, [cntReal, cntImg]));

    // Lookup these y**2 values by computing
    // (x**3 + A*x + B) for all possible x values...
    // and check if these match the y**2 values
    let rightside = (fieldN: number, x: number[]) => {
        //Compute: y^2 given x: y^2 = x^3 + A*x + B
        //where x = a + bi
        let xcubed  = compNraise(x, 3, fieldN)                      //x^3
        let Ax      = compNmul(fieldN, x, [coeffA,0])               // Ax
        let ans     = compadd(compadd(xcubed,Ax),[coeffB, 0])       //x^3 + coeffA*x + coeffB

        return compmod(ans,fieldN);
    }

    for (let cntReal = 0; cntReal < fieldN; ++cntReal) 
        for (let cntImg = 0; cntImg < fieldN; ++cntImg)  {
            let solution = rightside(fieldN, [cntReal,cntImg]);

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
    return set.findIndex((setPt,idx) => compPointsEquals(setPt, pt) );
}

// Compute gradient of a line between two points expressed in complex numbers (% fieldN)
// P = [[xa, xb],[ya, yb]]
// Q = [[xa, xb],[ya, yb]]
// m = (yQ - yP)/(xQ - xP) (% fieldN)
export function ecigradPplusQ(fieldN: number, ptP: number[][], ptQ: number[][]): number[] {
    let quo = compsub(ptQ[1], ptP[1]);
    let div = compsub(ptQ[0], ptP[0]);
    let ans = compNdiv(fieldN, quo, div);
    return ans;
}

// Compute the intercept of a line between two points expressed as complex numbers (% fieldN)
export function eciInterceptPplusQ(fieldN: number, ptP: number[][], ptQ: number[][]): number[] {
    let y1x2 = compmul(ptP[1], ptQ[0]);
    let y2x1 = compmul(ptQ[1], ptP[0]);
    let quo  = compsub(y1x2, y2x1);
    let div  = compsub(ptQ[0], ptP[0]);
    let ans  = compNdiv(fieldN, quo, div);
    return ans;
}

//Compute the line equation between two complex numbers
export function ecilinePplusQ(
                    fieldN: number, 
                    ptP: number[][], 
                    ptQ: number[][], 
                    verbose: boolean = false): number[][] {
                        
    let gradient = ecigradPplusQ(fieldN, ptP, ptQ);
    let intercept = eciInterceptPplusQ(fieldN, ptP, ptQ);

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

        let gradient = ecigradPplusQ(fieldN, ptP, ptQ);
        let mSqr     = compmul(gradient, gradient);

        let xx  = compsub(mSqr, ptP[0]);        //  m^2 - x1
        xx      = compsub(xx,   ptQ[0]);        //  m^2 - x1 - x2
        xx      = compmod(xx, fieldN);

        let yy  = compsub(ptP[0], xx);          //  (x1 - x_PQ)
        yy      = compmul(gradient, yy);        // m(x1 - x_PQ)
        yy      = compsub(yy, ptP[1]);          // m(x1 - x_PQ) - y1
        yy      = compmod(yy, fieldN);

        return [xx,yy];
    }

    let ptPQ = computePplusQ(fieldN, ptP, ptQ);

    if (verbose) 
        console.log(`P+Q = ${strCompPt(ptP)} + ${strCompPt(ptQ)} = ${strCompPt(ptPQ)}`);

    return ptPQ;
}

// Compute -P = (x, -y)
export function eciInverse(fieldN: number, ptP: number[][]): number[][] {
    if (compPointsEquals(ptP, [[0]]))    
        return ptP;

    return [ptP[0], compmod([-1*ptP[1][0], -1*ptP[1][1]], fieldN)];
}

// Compute gradient at a tangent to a point expressed as a complex number (% fieldN)
// where    m = (3x**2 + A) (2y)**-1
//
// WARNING: function does not verify that the supplied point is actually on the curve!
export function ecigrad2P(fieldN: number, coeffA: number, ptP: number[][]): number[] {
    let quo = compmul(ptP[0], ptP[0]);              //  x^2
    quo = compmul(quo, [3,0]);                      // 3x^2
    quo = compadd(quo, [coeffA,0]);                 // 3x^2 + A

    let div = compmul(ptP[1], [2,0]);               //  2y
    return compNdiv(fieldN, quo, div);              // (3x^2 + A) (2y)^-1
}

// Compute the interecept of tangent to a point expressed as a complex number (% fieldN)
// where (Ax + 2B - x^3) * (2y)^-1
//
// WARNING: function does not verify that the supplied point is actually on the curve!
export function eciIntercept2P(fieldN: number, coeffA: number, coeffB: number, ptP: number[][]): number[] {
    let quo = compmul(ptP[0], [coeffA,0]);          // Ax
    quo = compadd(quo, [2*coeffB,0]);               // Ax + 2B

    let xcubed = compmul(ptP[0], ptP[0]);           //  x^2
    xcubed = compmul(xcubed, ptP[0]);               //  x^3
    quo = compsub(quo, xcubed);                     // Ax + 2B - x^3

    let div = compmul(ptP[1], [2,0]);               //  2y
    return compNdiv(fieldN, quo, div);              // (Ax + 2B - x^3) * (2y)^-1
}

//Compute the line equation for a tangent to a point
export function eciline2P(
                    fieldN: number, 
                    coeffA: number, 
                    coeffB: number, 
                    ptP: number[][], 
                    verbose: boolean = false): number[][] {
    let gradient = ecigrad2P(fieldN, coeffA, ptP);
    let intercept = eciIntercept2P(fieldN, coeffA, coeffB, ptP);

    let strm = strComplex(gradient);
    let strc = strComplex(intercept);
    if (verbose)     console.log(`y = ${strm}x + ${strc}`);
    return [gradient,intercept];
}

// Compute P+P over an EC
// WARNING: function does not verify that the supplied point is actually on the curve!
export function eci2P(
                    fieldN: number, 
                    coeffA: number, 
                    ptP: number[][], 
                    verbose: boolean = false): number[][] {

    let compute2P = (fieldN: number, coeffA: number, ptP: number[][]): number[][] => { 
        //0 + 0 = 0
        if (compPointsEquals(ptP, [[0]]))
            return [[0]];

        //y symetry --> 2P = 0 when y = 0
        if (TOYS.pointsEquals(ptP[1],[0,0]))
            return [[0]];

        let gradient = ecigrad2P(fieldN, coeffA, ptP);                 // m
        let mSqr = compmul(gradient,gradient);                      // m^2

        let xx = compsub(mSqr, ptP[0]);                             // m^2 - x
        xx = compsub(xx, ptP[0]);                                   // m^2 - x -x
        xx = compmod(xx, fieldN);

        let yy = compsub(ptP[0], xx);                               // x - x3
        yy = compmul(yy, gradient);                                 // m(x - x3)
        yy = compsub(yy, ptP[1]);                                   // m(x - x3) - y
        yy = compmod(yy, fieldN);
        return [xx,yy];
    }

    let pt2P = compute2P(fieldN, coeffA, ptP);

    if (verbose) 
        console.log(`2P = ${strCompPt(ptP)} + ${strCompPt(ptP)} = ${strCompPt(pt2P)}`);

    return pt2P;
}

// Compute P+P over an EC: y**2  % n = (x**3 + A*x + B) % n
// WARNING: function does not verify that the supplied point is actually on the curve!
export function eciAdd(
                        fieldN: number, 
                        coeffA: number, 
                        ptP: number[][], 
                        ptQ: number[][], 
                        verbose: boolean = false): number[][] {

    if (compPointsEquals(ptP, [[0]]))    return ptQ;
    if (compPointsEquals(ptQ, [[0]]))    return ptP;
    if (compPointsEquals(ptP, ptQ))  return eci2P(fieldN, coeffA, ptP, verbose);

    return eciPplusQ(fieldN, ptP, ptQ, verbose);
}

// Compute m*P over an EC: y**2  % n = (x**3 + A*x + B) % n
// WARNING: function does not verify that the supplied point is actually on the curve!
export function eciMultiply(
                    fieldN: number, 
                    coeffA: number, 
                    multiplier: number, 
                    ptP: number[][], 
                    verbose: boolean = false): number[][] { 
    return TOYS.sqrAndMult([[0]], ptP, multiplier, (ptA: number[][], ptB: number[][]): number[][] => eciAdd(fieldN, coeffA, ptA, ptB, verbose)); 
}

// Given an initial point P, compute 2P, 3P, 4P until the cycle is closed.
// A point that cycles through ALL group elements is a generator.
export function eciCycle(
                    fieldN: number, 
                    coeffA: number, 
                    coeffB: number, 
                    ptP: number[][],
                    verbose: boolean = false): number[][][] {

    //Get list of all points on this curve
    let allPoints = ecipoints(fieldN, coeffA, coeffB, false);
    if (ecihasPoint(allPoints, ptP) == -1)
        throw `Failed: Input point is not within E/F${fieldN}`

    let cycle = [ptP];
    if (verbose) 
        console.log(`P = ${strCompPt(ptP)}`);

    let ptNew = eciAdd(fieldN, coeffA, ptP, ptP);
    while (!compPointsEquals(ptNew, ptP))
    {  
        if (cycle.length > allPoints.length)
            throw `Unexpected: element order cannot exceed ${allPoints.length}`

        if (ecihasPoint(allPoints, ptNew) == -1)
            throw `Unexpected: Computed point ${strCompPt(ptNew)} is not within E/F${fieldN}`
    
        cycle.push(ptNew);
        if (verbose) 
            console.log(`${cycle.length}P = ${strCompPt(ptNew)}`);

        ptNew = eciAdd(fieldN,coeffA,ptP,ptNew);
    }

    if (verbose)
        console.log(`Point ${strCompPt(ptP)} has order ${cycle.length}`);

    return cycle;
}

// For each EC point compute its cycle
export function eciAllCycles(
                    fieldN: number, 
                    coeffA: number, 
                    coeffB: number, 
                    verbose: boolean = false) {

    let points = ecipoints(fieldN,coeffA,coeffB, false);
    let allcycles = [];

    for (let cnt = 0; cnt < points.length; ++cnt) {

        //skip the special infinity point = [[0]]
        if (compPointsEquals(points[cnt], [[0]])) 
            continue;

        let onecycle = eciCycle(fieldN, coeffA, coeffB, points[cnt]);
        allcycles.push(onecycle);

        if (verbose)
            console.log(onecycle)
    }
    return allcycles;
}

//Compare if 2 sets have exactly the same elements
export function compCompareSets(
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

// For each EC point compute its cycle, filtering out duplicates.
export function eciUniqueCycles(
                    fieldN: number, 
                    coeffA: number, 
                    coeffB: number, 
                    verbose: boolean = false): number[][][][] {

    let cycAll = eciAllCycles(fieldN,coeffA,coeffB);
    let cycOut = [cycAll[0]];
    let cycIdx = [0];

    if (verbose)
        console.log(cycAll[0])

    for (let cnt = 1; cnt < cycAll.length; ++cnt) {

       let idx = cycOut.findIndex((aCycle, aCycleIdx) => {
            if (compCompareSets(cycAll[cnt], aCycle, false)) {
                //    console.log(`Cycle ${cnt+1} matches Cycle ${aCycleIdx+1}`);
                return true;               
            }
            return false;
        });

       if (idx  == -1)
       {
            cycOut.push(cycAll[cnt]);
            cycIdx.push(cnt);

            if (verbose)
                console.log(cycAll[cnt])
       }
    }

    return cycOut;
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

// Find all the r-torsion points for the given curve.
// "...a point is “killed” (sent to O) when multiplied by its order"
// Pairings for beginners - Craig Costello
export function eciTorsion(
                    fieldN: number, 
                    coeffA: number, 
                    coeffB: number, 
                    rorder: number, 
                    verbose: boolean = false): number[][][] {

    let ptsR: number[][][] = [];
    
    let pts = ecipoints(fieldN,coeffA,coeffB, false);
    if (pts.length % rorder != 0)
        throw `r (${rorder}) is not a factor of #E (${pts.length})`

    // A point Q that is in the r-torsion will satisfy this relation:
    // rQ = 0
    for (let cnt = 0; cnt < pts.length; ++cnt) {
        let rQ = eciMultiply(fieldN, coeffA, rorder, pts[cnt], false);
        
        if (compPointsEquals(rQ, [[0]]))
            ptsR.push(pts[cnt]);
    }

    if (verbose)
        console.log(ptsR)

    return ptsR;
}