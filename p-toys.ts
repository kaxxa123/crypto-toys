import {pointsEquals} from "./toys"

import {compmod, compadd, compsub, compmul, compNdiv, 
        compPointsEquals, strCompPt, strComplex,
        ecipoints, ecihasPoint, eciAdd, eci2P } from "./i-toys"

// Functions to compute EC point addition using projective coordinates
// The mapping to/from projective space is
//  (x, y)    -> (xZ, yZ, Z)
//  (X, Y, Z) -> (X/Z, Y/Z)
//
// References:
//  https://en.wikibooks.org/wiki/Cryptography/Prime_Curve/Standard_Projective_Coordinates
//  https://www.nayuki.io/page/elliptic-curve-point-addition-in-projective-coordinates

// Compute 2P in projective space  (X: Y: Z)
export function proj2PXYZ(
                fieldN: number, 
                coeffA: number, 
                xyzP: number[][]): number[][] {
                    
    if (pointsEquals(xyzP[1], [0,0])) 
        return [[0,0], [1,0], [0,0]];

    let tempW = compadd(compmul([coeffA,0], compmul(xyzP[2], xyzP[2])),
                        compmul([3,0],      compmul(xyzP[0], xyzP[0])))
    let tempS = compmul(xyzP[1],xyzP[2])
    let tempB = compmul(xyzP[0],compmul(xyzP[1],tempS))
    let tempH = compsub(compmul(tempW,tempW),compmul([8,0],tempB))
    let tempS_SQR = compmul(tempS, tempS)

    let outX = compmul([2,0],compmul(tempH,tempS))
    let outY = compsub(compmul(tempW,compsub(compmul([4,0],tempB),tempH)),
                       compmul([8,0],compmul(compmul(xyzP[1], xyzP[1]),tempS_SQR)))
    let outZ = compmul(compmul([8,0], tempS),tempS_SQR)

    return [compmod(outX, fieldN), 
            compmod(outY, fieldN), 
            compmod(outZ, fieldN)]
}

// Compute P+Q in projective space (X: Y: Z)
export function projPplusQXYZ(
                fieldN: number, 
                coeffA: number, 
                xyzP: number[][],
                xyzQ: number[][]): number[][] {

    let tempU1 = compmul(xyzQ[1], xyzP[2])
    let tempU2 = compmul(xyzP[1], xyzQ[2])
    let tempV1 = compmul(xyzQ[0], xyzP[2])
    let tempV2 = compmul(xyzP[0], xyzQ[2])
    
    if (pointsEquals(tempV1, tempV2)) {
        if (!pointsEquals(tempU1, tempU2))
                return [[0,0], [1,0], [0,0]];
        else    return proj2PXYZ(fieldN, coeffA, xyzP) 
    }

    let tempU = compsub(tempU1, tempU2)
    let tempV = compsub(tempV1, tempV2)
    let tempV_SQR = compmul(tempV, tempV)
    let tempV_CUB = compmul(tempV_SQR, tempV)
    let tempW = compmul(xyzP[2], xyzQ[2])
    let tempA = compsub(compmul(compmul(tempU, tempU),tempW), compadd(tempV_CUB, compmul([2,0], compmul(tempV_SQR, tempV2))))

    let outX = compmul(tempV, tempA)
    let outY = compsub(compmul(tempU,compsub(compmul(tempV_SQR, tempV2),tempA)), compmul(tempV_CUB, tempU2))
    let outZ = compmul(tempV_CUB,tempW)

    return [compmod(outX, fieldN), 
            compmod(outY, fieldN), 
            compmod(outZ, fieldN)]
}

// Compute 2P mapping in/out of projective space
export function proj2P(
                fieldN: number, 
                coeffA: number, 
                ptP: number[][],
                verbose: boolean = false): number[][] {

    let compute2P = (   fieldN: number, 
                        coeffA: number, 
                        ptP: number[][],
                        verbose: boolean = false): number[][] => { 
        //0 + 0 = 0
        if (compPointsEquals(ptP, [[0]]))
            return [[0]];

        //y symetry --> 2P = 0 when y = 0
        if (pointsEquals(ptP[1],[0,0]))
            return [[0]];

        let XYZ = proj2PXYZ(fieldN, coeffA, [ptP[0], ptP[1], [1,0]])

        if (verbose)
            console.log(`2P = 2*(${strComplex(ptP[0])},${strComplex(ptP[1])},${strComplex([1,0])}) = ` +
                               `(${strComplex(XYZ[0])},${strComplex(XYZ[1])},${strComplex(XYZ[2])})`);
        
        let xx = compNdiv(fieldN, XYZ[0], XYZ[2])
        let yy = compNdiv(fieldN, XYZ[1], XYZ[2])
        return [xx,yy]
    }

    let pt2P = compute2P(fieldN, coeffA, ptP, verbose);

    if (verbose) 
        console.log(`2P = 2*${strCompPt(ptP)} = ${strCompPt(pt2P)}`);

    return pt2P;
}

// Compute P+Q/2P mapping in/out of projective space
export function projAdd(
                fieldN: number, 
                coeffA: number, 
                ptP: number[][], 
                ptQ: number[][], 
                verbose: boolean = false): number[][] {

    let computeAdd = (  fieldN: number, 
                        coeffA: number, 
                        ptP: number[][], 
                        ptQ: number[][],
                        verbose: boolean = false): number[][]  => {

        if  (compPointsEquals(ptP, [[0]]))       return ptQ;
        if  (compPointsEquals(ptQ, [[0]]))       return ptP;

        //PX == QX -> Points on a straight line return Zero        
        if (!compPointsEquals(ptP, ptQ) &&          //  (P != Q)
            pointsEquals(ptP[0], ptQ[0]))           //  (PX == QX)
            return [[0]];

        //2P with (y == 0), EC symetry around x-axis implies that 2P = 0
        if (compPointsEquals(ptP, ptQ) &&           //  (P == Q)
            pointsEquals(ptP[1],[0,0]))             //  (y == 0)
                        return [[0]];

        let XYZ = []
        if (compPointsEquals(ptP, ptQ))         
                XYZ = proj2PXYZ(
                        fieldN, 
                        coeffA,  
                        [ptP[0], ptP[1], [1,0]]);

        else    XYZ = projPplusQXYZ(
                        fieldN, 
                        coeffA, 
                        [ptP[0], ptP[1], [1,0]], 
                        [ptQ[0], ptQ[1], [1,0]]);

        if (verbose)
            console.log(`P+Q = (${strComplex(ptP[0])},${strComplex(ptP[1])},${strComplex([1,0])}) + ` +
                              `(${strComplex(ptQ[0])},${strComplex(ptQ[1])},${strComplex([1,0])}) = ` +
                              `(${strComplex(XYZ[0])},${strComplex(XYZ[1])},${strComplex(XYZ[2])})`);

        let xx = compNdiv(fieldN, XYZ[0], XYZ[2])
        let yy = compNdiv(fieldN, XYZ[1], XYZ[2])
        return [xx,yy]
    }

    let ptPQ = computeAdd(fieldN, coeffA, ptP, ptQ, verbose);
    if (verbose) 
        console.log(`P+Q = ${strCompPt(ptP)} + ${strCompPt(ptQ)} = ${strCompPt(ptPQ)}`);

    return ptPQ;
}


// TEST CODE
// Compute P + Q = R for any P and Q...
// ...do this for both the affine and projective space
// ...confirm that the result is the same.
//
// let ptoys = require('./build/p-toys.js')
// ptoys.projTestPplusQ(11, 4, 3, true)
//
// ptoys.projTestPplusQ(13, 4, 3, true)
//
export function projTestPplusQ(
    fieldN: number, 
    coeffA: number, 
    coeffB: number, 
    verbose: boolean = false): boolean {

    let pts = ecipoints(fieldN, coeffA, coeffB, false);

    let confirms: number = 0;
    let notComputed: number = 0;

    for (let icntP = 0; icntP < pts.length; ++icntP) {
        for (let icntQ = icntP; icntQ < pts.length; ++icntQ) {

            let ptPP: number[][] = [[0]];
            let ptXY: number[][] = [[0]];
            let failures = 0;
            let errMsg: string = "";

            try {
                ptPP = projAdd(fieldN, coeffA, pts[icntP], pts[icntQ], verbose) 
            }
            catch (err) {
                //Using odd prime numbers allous us to know which of the functions failed.
                failures += 3;
                errMsg = `${err}`;
            }

            try {
                ptXY = eciAdd(fieldN, coeffA, pts[icntP], pts[icntQ], verbose)
            }
            catch (err) {
                //Using odd prime numbers allous us to know which of the functions failed.
                failures += 5;
                errMsg = `${err}`;
            }

            //They should either both fail or both succeed
            if (failures%2 != 0) {
                console.log(`Failed on computing: ${strCompPt(pts[icntP])} + ${strCompPt(pts[icntQ])}`)

                if (failures == 3)
                        console.log('FAILED: projAdd(): ' + errMsg)
                else    console.log('FAILED: eciAdd(): ' + errMsg)
                return false;
            }

            if (failures != 0) {
                // Happens when the chord computations leads to a divide by zero.
                // i.e. a complex number for which we cannot obtain an inverse 
                console.log(`Failed on computing: ${strCompPt(pts[icntP])} + ${strCompPt(pts[icntQ])}`)
                ++notComputed;
                continue;
            }

            if (!compPointsEquals(ptPP, ptXY)) {
                console.log(`Failed on computing: ${strCompPt(pts[icntP])} + ${strCompPt(pts[icntQ])}`)
                console.log('Projective/Affine point computation MISMATCHED')
                console.log(`Projective Result = ${strCompPt(ptPP)}`)
                console.log(`Affine Result     = ${strCompPt(ptXY)}`)
                return false;
            }

            if (ecihasPoint(pts, ptPP) == -1) {
                console.log(`Failed on computing: ${strCompPt(pts[icntP])} + ${strCompPt(pts[icntQ])}`)
                console.log(`Closure Test failed. Result = ${strCompPt(ptPP)}`)
                return false;
            }

            ++confirms;
        }

        if (verbose) 
            console.log();
    }

    if (verbose)
        console.log(`Confirmed ${confirms}, Not Computed: ${notComputed}`);

    return true;
}


// TEST CODE
// Compute 2P = R for all P...
// ...do this for both the affine and projective space
// ...confirm that the result is the same.
//
// let ptoys = require('./build/p-toys.js')
// ptoys.projTest2P(11, 4, 3, true)
//
// ptoys.projTest2P(13, 4, 3, true)
//
export function projTest2P(
    fieldN: number, 
    coeffA: number, 
    coeffB: number, 
    verbose: boolean = false): boolean {

    let pts = ecipoints(fieldN, coeffA, coeffB, false);

    let confirms: number = 0;
    let notComputed: number = 0;

    for (let icntP = 0; icntP < pts.length; ++icntP) {

        let ptPP: number[][] = [[0]];
        let ptXY: number[][] = [[0]];
        let failures = 0;
        let errMsg: string = "";

        try {
            ptPP = proj2P(fieldN, coeffA, pts[icntP], verbose) 
        }
        catch (err) {
            //Using odd prime numbers allous us to know which of the functions failed.
            failures += 3;
            errMsg = `${err}`;
        }

        try {
            ptXY = eci2P(fieldN, coeffA, pts[icntP], verbose)
        }
        catch (err) {
            //Using odd prime numbers allous us to know which of the functions failed.
            failures += 5;
            errMsg = `${err}`;
        }

        //They should either both fail or both succeed
        if (failures%2 != 0) {
            console.log(`Failed on computing: 2*${strCompPt(pts[icntP])}`)

            if (failures == 3)
                    console.log('FAILED: projAdd(): ' + errMsg)
            else    console.log('FAILED: eciAdd(): ' + errMsg)
            return false;
        }

        if (failures != 0) {
            // Happens when the chord computations leads to a divide by zero.
            // i.e. a complex number for which we cannot obtain an inverse 
            console.log(`Failed on computing: 2*${strCompPt(pts[icntP])}`)
            ++notComputed;
            continue;
        }

        if (!compPointsEquals(ptPP, ptXY)) {
            console.log(`Failed on computing: 2*${strCompPt(pts[icntP])}`)
            console.log('Projective/Affine point computation MISMATCHED')
            console.log(`Projective Result = ${strCompPt(ptPP)}`)
            console.log(`Affine Result     = ${strCompPt(ptXY)}`)
            return false;
        }

        if (ecihasPoint(pts, ptPP) == -1) {
            console.log(`Failed on computing: 2*${strCompPt(pts[icntP])}`)
            console.log(`Closure Test failed. Result = ${strCompPt(ptPP)}`)
            return false;
        }

        ++confirms;
    }

    if (verbose)
        console.log(`Confirmed ${confirms}, Not Computed: ${notComputed}`);

    return true;        
}


// {
//     let pts = itoys.ecipoints(11,4,3)

//     for (cnt = 1; cnt < pts.length; ++cnt) { 
//         let pp = itoys.proj2P(11,4, pts[cnt], false)
//         let xy = itoys.eci2P(11,4, pts[cnt], false)

//         if (itoys.compPointsEquals(pp,xy)) 
//             console.log(`MATCHED 2*${itoys.strCompPt(pts[cnt])} = ${itoys.strCompPt(pp)}`)
//         else {
//             console.log(`NOT MATCHED ${itoys.strCompPt(pts[cnt])}`)
//             break
//         }
//     }
// }