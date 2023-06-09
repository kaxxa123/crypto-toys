import {ECurve, unpackEC, ReqEC} from './config'

// compute a % b where a can be negative.
// however the result is always positive.
export function posmod(value: number, fieldN: number): number { 
    if (fieldN <= 0) throw "divisor must be greater than zero";
    return ((value%fieldN)+fieldN)%fieldN; 
}

// Check if number is a prime number
export function isPrime(value: number) {

    // Filter out zero and negative numbers
    if (value < 2)  return false;

    // 2 is the only even prime number
    if (value == 2)     return true;
    if (value%2 == 0)   return false;

    // Try dividing value by all odd numbers between [3, value/2]
    // If it is devisible than it's not prime
    let limit = Math.floor(value/2);

    for (let check = 3; check < limit; check += 2) {
        if (value%check == 0)   return false;
    }

    return true;
}

// Compute val**pow using the Square and Multiply Algorithm where everything is caller defined
// square and multiply operations are also distinct lambdas 
export function sqrAndMultEx<T>(
                    identity: T, 
                    val: T,                    
                    pow: number, 
                    square:   (a: T, b: T) => T, 
                    multiply: (a: T, b: T) => T): T {

    //Produce a MASK for filtering out the MSB
    let msbMask = (x: number) => {
            let mask = 1;   
            while (x != 0) {
                x = x >> 1;
                mask = mask << 1;
            }
            return (mask >> 1);
        }
   
    if (pow < 0)        throw "Negative powers not supported";
    if (pow == 0)       return identity;
    if (pow == 1)       return val;

    let mask = msbMask(pow);
    let res  = val;

    do {
        //We give square 2 params to allow the caller to easily define
        //both square and multiply are the same function
        res  = square(res,res);
        mask = (mask >> 1);

        if ((mask & pow) != 0)
            res = multiply(res,val);

    } while (mask > 1);

    return res;
}

// Compute val**pow using the Square and Multiply Algorithm
// Most often sqr=num*num so this simplified helper only has the multiply lambda
export function sqrAndMult<T>(
                    identity: T, 
                    val: T,                    
                    pow: number, 
                    multiply: (a: T, b: T) => T): T {
    return sqrAndMultEx(identity, val, pow, multiply, multiply);
}

// Compute (value**power) % fieldN
// This function better handles large numbers when doing (% n) arithmetic avoiding overflows
export function raisePower(value: number, pow: number, fieldN: number): number {
    return sqrAndMult(1, value, pow, (x: number, y:number):number => posmod(x*y,fieldN));
}

//
// Given a group over a prime p, a group element alpha is a generator if
// when computing (alpha**n % p) for n = [1,p-1], it returns all group elements.
//
// Furhtermore, other group elements will also generate a cycle whose order is 
// equal to the first n that produces the identity element
export function isGenerator(fieldN: number, alpha: number, verbose: boolean = false): boolean {

    if (fieldN < 3)
        throw "fieldN must be 3 or greater";

    if (alpha > fieldN-1)
        throw "alpha must be less or equal to (p-1)"

    let cnt = 1;
    for (; cnt<fieldN; ++cnt) {
        let element = raisePower(alpha, cnt, fieldN);

        if (verbose) console.log(`${alpha}**${cnt} = ${element}`);
        if (element == 1) break;
    }

    if (cnt == fieldN)
        throw "FAILED: Unable to find identity element."

    if (cnt == fieldN - 1)
         console.log(`Element ${alpha} is a generator!`)
    else console.log(`Element ${alpha} is of order ${cnt}`)

    return (cnt == fieldN-1);
}

// Cycle through all group elements determinig which of them are a generator
export function getGenerators(fieldN: number, verbose: boolean = false): number[] {
    let gens: number[] = []

    if (fieldN < 3)
        throw "fieldN must be 3 or greater";

    for (let alpha = 1; alpha<fieldN; ++alpha) {
        if (isGenerator(fieldN, alpha, verbose))
            gens.push(alpha)

        if (verbose) console.log()
    }
    if (verbose) console.log(gens)

    return gens;
}

// Compute the Greatest Common Divisor gcd using the Euclidean Algorithm
export function gcd(aValue: number, bValue: number): number {

    if ((aValue <= 0) || (bValue <= 0)) 
        throw "a and b must be greater than zero";
        
    while (bValue != 0) {
        let remainder = posmod(aValue,bValue);
        aValue = bValue;
        bValue = remainder;
    }
    return aValue;
}

// Compute inverse using the Extended Euclidean Algorithm
// gcd(a,n)  = n*s + a*t
export function inverse(fieldN: number, value: number, verbose: boolean = false): number {

    value = posmod(value, fieldN)

    if ((value <= 0) || (fieldN <= 0)) 
        throw "value and fieldN must be greater than zero";

    if (value >= fieldN)
        throw `value (${value}) should be smaller than fieldN (${fieldN})`;
    
    const initialV = value;
    const initialN = fieldN; 

    if (verbose) 
        console.log(`gcd(${initialV},${initialN}) = ${initialN}*s + ${initialV}*t`);

    let s_coeff  = 1;
    let s_coeff2 = 0;
    let t_coeff  = 0;
    let t_coeff2 = 1;

    while (value != 0) {
        //fieldN  = quotient*value + remainder
        let quotient = Math.floor(fieldN / value);
        let remainder = posmod(fieldN,value);

        //Prepare for the next iteration where we devide
        //value / remainder
        fieldN = value;
        value = remainder;

        //Update the s and t coefficients
        const s_swap = s_coeff2; 
        const t_swap = t_coeff2;
        s_coeff2 = s_coeff - quotient*s_coeff2;
        t_coeff2 = t_coeff - quotient*t_coeff2;

        s_coeff = s_swap; 
        t_coeff = t_swap;
    }

    if (verbose) 
        console.log(`gcd(${initialV},${initialN}) = ${initialN}*${s_coeff} + ${initialV}*${t_coeff} = ${fieldN}`);

    let inv = posmod(t_coeff, initialN);
    if (posmod(initialV*t_coeff, initialN) != 1)
        throw   `Unexpected: Invalid inverse result: ${inv}.\n` + 
                `Field ${initialN} does not satisfy group inversion property.` 

    if (verbose) 
        console.log(`${initialV}^-1 = ${inv}`);

    return inv;
}

//Check if all elements in the range 1 to (n-1) has an inverse
export function groupInverses(fieldN: number, verbose: boolean = false): boolean {

    if (fieldN <= 0)
        throw "fieldN must be greater than zero";

    for (let value = 1; value < fieldN; ++value)
        inverse(fieldN, value, verbose)

    //If the inverse calls don't throw, than all checks succeeded
    if (verbose)
        console.log(`Confirmed all elements in set % ${fieldN} have an inverse.`)

    return true;
}

// Check if two points (for any number of dimensions) are equal.
// In this library a point is just a number array. So this just 
// becomes comparing the elements of the two arrays
export function pointsEquals(ptA: number[], ptB: number[]): boolean {
    return Array.isArray(ptA) &&
           Array.isArray(ptB) &&
           ptA.length === ptB.length &&
           ptA.every((val, index) => val === ptB[index]);
}
  
// Lookup for points on an EC: y**2  % n = (x**3 + A*x + B) % n
// ...by trying out all combinations
export function ecpoints(
                ec: ECurve, 
                verbose: boolean = false): number[][] {
    let out = [[0]];
    let {fieldN, coeffA, coeffB} = unpackEC(ec, ReqEC.NAB);

    //Zero/Point at Infinity is always present
    if (verbose) 
        console.log('(0)');

    // Compute all possible y**2 values
    let y = []; 
    for (let cnt = 0; cnt < fieldN; ++cnt) 
        y.push(posmod(cnt**2,fieldN));

    // Lookup these y**2 values by computing
    // (x**3 + A*x + B) for all possible x values...
    // and check if these match the y**2 values
    let rightSide = (x: number) => (x**3 + coeffA*x + coeffB);

    for (let x = 0; x < fieldN; ++x) {
       let temp = posmod(rightSide(x),fieldN);
       let yIdx = y.indexOf(temp);

       //Because of the EC symmetry we should find two y values
       while (yIdx >= 0) {
           if (verbose) 
                console.log(`(${x}, ${yIdx})`);

           out.push([x,yIdx]);
           yIdx = y.indexOf(temp, yIdx+1);
       }
    }

    return out;
}

// Compute P+P over an EC: y**2  % n = (x**3 + A*x + B) % n
// where    m = (3x**2 + A) (2y)**-1
//       x_2P = m*m - 2x
//       y_2P = m(x - x_2P) - y
//
// WARNING: function does not verify that the supplied point is actually on the curve!
export function ec2P(
                ec: ECurve, 
                ptP: number[], 
                verbose: boolean = false): number[] {

    let {fieldN, coeffA} = unpackEC(ec, ReqEC.NA);
    
    let compute2P = (ptP: number[]): number[] => {

        //0 + 0 = 0
        if (pointsEquals(ptP, [0]))
            return [0];

        //y symetry => when y = 0, 2P = 0 
        if (ptP[1] == 0)
            return [0];

        let inv2y = inverse(fieldN, posmod(2*ptP[1], fieldN), false);
        let m  = posmod(posmod(3*(ptP[0]**2) + coeffA, fieldN)*inv2y,fieldN);
        let x2 = posmod(m**2 -2*ptP[0], fieldN);
        let y2 = posmod(m*(ptP[0]-x2)-ptP[1], fieldN);
        return [x2,y2];
    }
    
    let pt2P = compute2P(ptP);

    if (verbose) 
        console.log(`2P = (${ptP}) + (${ptP}) = (${pt2P})`);

    return pt2P;
}

// Compute P+Q over an EC: y**2  % n = (x**3 + A*x + B) % n
// where    m = (y2 – y1)*(x2 – x1)**-1
//       x_PQ = m*m - x1 - x2)
//       y_PQ = m(x1 - x_PQ) - y1
//
// WARNING: function does not verify that the supplied point is actually on the curve!
// WARNING: function does not support doubling the same point!
export function ecPplusQ(
                    ec: ECurve,
                    ptP: number[],
                    ptQ: number[], 
                    verbose: boolean = false): number[] {

    let {fieldN} = unpackEC(ec, ReqEC.N);

    let computePplusQ = (fieldN: number, 
                        ptP: number[], 
                        ptQ: number[]): number[] => {

        if (pointsEquals(ptP,ptQ))                                              
            throw "Compute 2P using ec2P.";                    //Function cannot handle point doubling
                
        if (pointsEquals(ptP, [0]))     return ptQ;
        if (pointsEquals(ptQ, [0]))     return ptP;
        if (ptP[0] == ptQ[0])           return [0];              //PX = QX -> Points on a vertical line return Zero

        let y2_minus_y1 = posmod(ptQ[1]-ptP[1], fieldN);
        let x2_minus_x1 = posmod(ptQ[0]-ptP[0], fieldN);
        let inv         = inverse(fieldN, x2_minus_x1, false);
        let m           = posmod(y2_minus_y1*inv, fieldN);
        let x3          = posmod(m**2-ptP[0]-ptQ[0], fieldN);
        let y3          = posmod(m*(ptP[0]-x3)-ptP[1], fieldN);

        return [x3,y3];
    }

    let ptPQ = computePplusQ(fieldN, ptP, ptQ);

    if (verbose) 
        console.log(`P+Q = (${ptP}) + (${ptQ}) = (${ptPQ})`);

    return ptPQ;
}

// Compute P+P over an EC: y**2  % n = (x**3 + A*x + B) % n
// where    m = (y2 – y1)*(x2 – x1)**-1
//       x_PQ = m*m - x1 - x2)
//       y_PQ = m(x1 - x_PQ) - y1
//
// WARNING: function does not verify that the supplied point is actually on the curve!
export function ecAdd(
                    ec: ECurve, 
                    ptP: number[], 
                    ptQ: number[], 
                    verbose: boolean = false): number[] {

    unpackEC(ec, ReqEC.NA);

    let computeAdd = (ptP: number[], ptQ: number[]): number[]  => {
        if (pointsEquals(ptP, [0]))    return ptQ;
        if (pointsEquals(ptQ, [0]))    return ptP;
        if (pointsEquals(ptP, ptQ))    return ec2P(ec, ptP, false);
        return ecPplusQ(ec, ptP, ptQ, false);
    }

    let ptPQ = computeAdd(ptP, ptQ);

    if (verbose) 
        console.log(`P+Q = (${ptP}) + (${ptQ}) = (${ptPQ})`);

    return ptPQ;
}

// Compute m*P over an EC: y**2  % n = (x**3 + A*x + B) % n
// WARNING: function does not verify that the supplied point is actually on the curve!
export function ecMultiply(
                    ec: ECurve, 
                    multiplier: number, 
                    ptP: number[], 
                    verbose: boolean = false): number[] {
    unpackEC(ec, ReqEC.NA);
    return sqrAndMult([0], ptP, multiplier, (ptA: number[], ptB: number[]): number[] => ecAdd(ec, ptA, ptB, verbose));
}

// Compute -P over an EC: y**2  % n = (x**3 + A*x + B) % n
// WARNING: function does not verify that the supplied point is actually on the curve!
export function ecInverse(ec: ECurve, ptP: number[], verbose: boolean = false): number[] {

    unpackEC(ec, ReqEC.N);
    let invertP = (ec: ECurve, ptP: number[]): number[]  => {
        let {fieldN} = unpackEC(ec, ReqEC.N);
        if (pointsEquals(ptP, [0]))    
            return ptP;
            
        return [ptP[0], posmod(-1*posmod(ptP[1], fieldN), fieldN)];
    }

    let minusP = invertP(ec, ptP)

    if (verbose) 
        console.log(`-P = (${minusP})`);

    return minusP;
}

// Given an initial point P, compute 2P, 3P, 4P until the cycle is closed.
// A point that cycles through ALL group elements is a generator.
export function ecCycle(
                    ec: ECurve, 
                    ptP: number[], 
                    verbose: boolean = false): number[][] {

    let {fieldN} = unpackEC(ec, ReqEC.NAB);

    //Get list of all points on this curve
    let allPoints = ecpoints(ec, false);
    if (allPoints.findIndex((pt2) => pointsEquals(ptP,pt2)) == -1)
        throw `Failed: Input point is not within E/F${fieldN}`

    let cycle = [ptP];
    if (verbose) 
        console.log(`P = (${ptP})`);
    
    let ptNew = ecAdd(ec, ptP, ptP, false);
    while (!pointsEquals(ptNew, ptP))
    {  
        if (cycle.length > allPoints.length)
            throw `Unexpected: element order cannot exceed ${allPoints.length}`

        if (allPoints.findIndex((pt2) => pointsEquals(ptNew,pt2)) == -1)
            throw `Unexpected: Computed point (${ptNew}) is not within E/F${fieldN}`
    
        cycle.push(ptNew);
        if (verbose) 
            console.log(`${cycle.length}P = (${ptNew})`);

        ptNew = ecAdd(ec, ptP,ptNew, false);
    }

    if (verbose)
        console.log(`Point (${ptP}) has order ${cycle.length}`);

    return cycle;
}

// For each EC point compute its cycle
export function ecAllCycles(ec: ECurve, verbose: boolean = false): number[][][] {

    unpackEC(ec, ReqEC.NAB);
    let points = ecpoints(ec, false);
    let allcycles = [];

    for (let cnt = 0; cnt < points.length; ++cnt) {

        //skip the special infinity point = [0]
        if (points[cnt].length == 1) 
            continue;

        let onecycle = ecCycle(ec, points[cnt], false);
        allcycles.push(onecycle);

        if (verbose)
            console.log(onecycle)
    }

    return allcycles;
}

// Compare if 2 sets have exactly the same elements
export function setCompare(
                    set1: number[][], 
                    set2: number[][], 
                    verbose: boolean = false): boolean {

    if (set1.length != set2.length) {
        if (verbose)
            console.log("Different set lengths");

        return false;
    }

    //Look for a point in set1, that does NOT exist in set2
    let idxErr = set1.findIndex((pt, idx1) => {
        //Find matching point in set2
        let idx2 = set2.findIndex((pt2) => pointsEquals(pt, pt2) );

        //Terminate if a matching point is NOT found
        if (idx2 < 0) 
        {
            if (verbose)
                console.log(`Set 1 point not found in Set 2: (${pt})`);
            return true;
        }

        //Make sure there is only 1 such point in set1
        let idx3 = set1.findIndex((ptx) => ((ptx !== pt) && pointsEquals(ptx, pt)), pt);

        //Terminate if repeated point is found
        if (idx3 >= 0)
        {
            if (verbose)
                console.log(`Duplicate Set 1 point (${pt}) at indexes: ${idx1} and ${idx3}`);
            return true;
        }

        if (verbose)
            console.log(`set1[${idx1}] = set2[${idx2}]: (${set1[idx1]}) = (${set2[idx2]})`);
    })

    return (idxErr < 0);
}

// Subtract set elements returning only the elements in setA that are NOT in setB
export function setSubtract(setA: number[][], setB: number[][]): number[][] {
    return setA.filter((ptA) => (setB.findIndex((ptB) => pointsEquals(ptB, ptA)) == -1) );
}

// Filter out duplicate sets
export function setsUnique(sets: number[][][], verbose: boolean = false): number[][][] {

    let setsOut: number[][][] = [];
    for (let cnt = 0; cnt < sets.length; ++cnt) {
        let idx = setsOut.findIndex((oneSet) => {
            if (setCompare(sets[cnt], oneSet, false)) {
                return true;               
            }
            return false;
        });

        if (idx  == -1)
        {
            setsOut.push(sets[cnt]);
            if (verbose)
                ecShowPoints(sets[cnt])
        }
    }
    return setsOut;
}

// For each EC point compute its cycle, filtering out duplicates.
export function ecUniqueCycles(ec: ECurve, verbose: boolean = false): number[][][] {

    unpackEC(ec, ReqEC.NAB);
    return setsUnique(ecAllCycles(ec), verbose)        
}

// Compute Cn X Cm by applying the additive operation defined for EC points
export function ecCxC(
                    ec: ECurve, 
                    c1: number[][], 
                    c2: number[][],
                    verbose: boolean = false): number[][] {

    unpackEC(ec, ReqEC.NA);
    let c1xc2: number[][] = [];

    c1.forEach((pt1) => {
        c2.forEach((pt2) => {
            c1xc2.push(ecAdd(ec, pt1, pt2, false));
        });
    });

    if (verbose)
        console.log(c1xc2)

    return c1xc2;
}

// Compute Cn X Cm by applying the additive operation defined for EC points
// Here the caller for Cn and Cm simply passes the cyclic group index for
// the groups returned by ecUniqueCycles.
export function ecCnxCm(
                    ec: ECurve, 
                    cn: number, 
                    cm: number,
                    verbose: boolean = false): number[][] {

    unpackEC(ec, ReqEC.NAB);
    let cycles = ecUniqueCycles(ec)

    if (cycles.length <= cn)
        throw `Invalid sub-group index ${cn}`

    if (cycles.length <= cm)
        throw `Invalid sub-group index ${cm}`

    let c1xc2 = ecCxC(ec, cycles[cn], cycles[cm], verbose);

    return c1xc2;
}

// Find all the r-torsion points for the given curve.
// "...a point is “killed” (sent to O) when multiplied by its order"
// Pairings for beginners - Craig Costello
export function ecTorsion(ec: ECurve, verbose: boolean = false): number[][] {

    let {rorder} = unpackEC(ec, ReqEC.NABR);
    let ptsR: number[][] = [];
    
    let pts = ecpoints(ec, false);
    if (pts.length % rorder != 0)
        throw `r (${rorder}) is not a factor of #E (${pts.length})`

    // A point Q that is in the r-torsion will satisfy this relation:
    // rQ = 0
    for (let cnt = 0; cnt < pts.length; ++cnt) {
        let rQ = ecMultiply(ec, rorder, pts[cnt], false);
        
        if (pointsEquals(rQ, [0]))
            ptsR.push(pts[cnt]);
    }

    if (verbose)
        console.log(ptsR)

    return ptsR;
}

// Print out a set of point cycles
export function ecShowCycles(cycles: number[][][]): void {

    for (let cnt = 0; cnt < cycles.length; ++cnt) {
        let outstr = "";
        cycles[cnt].forEach((pt) => {
            if (outstr.length === 0) 
                  outstr  = `${cnt}. C${cycles[cnt].length}: (${pt})`;            
            else  outstr += ` -> (${pt})`;           
        });
        console.log();
        console.log(outstr);
    }
}

// Print out a list of points
export function ecShowPoints(points: number[][]): void {

    let outstr = "";
    points.forEach((pt) => {
        if (outstr.length === 0) 
                outstr  = `$ Total Points ${points.length}: (${pt})`;            
        else  outstr += `, (${pt})`;           
    });
    console.log();
    console.log(outstr);
}

