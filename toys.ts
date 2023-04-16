
// compute a % b where a can be negative.
// however the result is always positive.
export function posmod(value: number, fieldN: number): number { 
    if (fieldN <= 0) throw "divisor must be greater than zero";
    return ((value%fieldN)+fieldN)%fieldN; 
}

//
// Given a group over a prime p, a group element alpha is a generator if
// when computing (alpha**n % p) for n = [1,p-1], it returns all group elements.
//
// Furhtermore, other group elements will also generate a cycle whose order is 
// equal to the first n that produces the identity element
export function isGenerator(alpha: number, fieldN: number, verbose: boolean = false): boolean {

    if (fieldN < 3)
        throw "fieldN must be 3 or greater";

    if (alpha > fieldN-1)
        throw "alpha must be less or equal to (p-1)"

    let cnt = 1;
    for (; cnt<fieldN; ++cnt) {
        let element = posmod(alpha**cnt,fieldN)

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
        if (isGenerator(alpha, fieldN, verbose))
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
export function inverse(value: number, fieldN: number, verbose: boolean = false): number {

    if ((value <= 0) || (fieldN <= 0)) 
        throw "value and fieldN must be greater than zero";

    if (value >= fieldN)
        throw "value should be smaller than fieldN";
    
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
        inverse(value, fieldN, verbose)

    //If the inverse calls don't throw, than all checks succeeded
    return true;
}

// Compute val**pow using the Square and Multiply Algorithm where everything is caller defined
// square and multiply operations are also distinct lambdas 
export function sqrAndMultEx(
                    identity: number, 
                    val: number,                    
                    pow: number, 
                    square:   (a: number, b: number) => number, 
                    multiply: (a: number, b: number) => number)    {

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
export function sqrAndMult(
                    identity: number, 
                    val: number,                    
                    pow: number, 
                    multiply:   (a: number, b: number) => number)    {
    return sqrAndMultEx(identity, val, pow, multiply, multiply);
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
export function findpoints(fieldN: number, coeffA: number, coeffB: number, verbose: boolean = false): number[][] {
    let out = [[0]];

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
           if (verbose) console.log(`(${x}, ${yIdx})`);

           out.push([x,yIdx]);
           yIdx = y.indexOf(temp, yIdx+1);
       }
    }

    return out;
 }
 