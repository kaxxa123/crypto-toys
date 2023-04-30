import {ECurve, unpackEC, ReqEC} from './config'
import {pointsEquals} from "./toys"

import {compmod, compadd, compsub, compmul, compmulEx, compNdiv, 
        compPointsEquals, strCompPt, strComplex,
        ecipoints, ecihasPoint, eciAdd, eci2P } from "./i-toys"

// ---------------------------------------------------------------------------------------------
//
// Functions to compute EC point addition using projective coordinates
// The mapping to/from projective space is
//  (x, y)    -> (xZ, yZ, Z)
//  (X, Y, Z) -> (X/Z, Y/Z)
//
// References:
//  https://en.wikibooks.org/wiki/Cryptography/Prime_Curve/Standard_Projective_Coordinates
//  https://www.nayuki.io/page/elliptic-curve-point-addition-in-projective-coordinates
//
// ---------------------------------------------------------------------------------------------

// Compute 2P in projective space  (X: Y: Z)
export function proj2PXYZ(ec: ECurve, xyzP: number[][]): number[][] {
             
    let {fieldN, coeffA, iSQR} = unpackEC(ec, ReqEC.NA);    
    if (pointsEquals(xyzP[1], [0,0])) 
        return [[0,0], [1,0], [0,0]];

    let tempW = compadd(compmulEx([[coeffA,0], xyzP[2], xyzP[2]], iSQR), compmulEx([[3,0], xyzP[0], xyzP[0]], iSQR))
    let tempS = compmul(xyzP[1],xyzP[2], iSQR)
    let tempB = compmulEx([xyzP[0], xyzP[1], tempS], iSQR)
    let tempH = compsub(compmul(tempW,tempW, iSQR),compmul([8,0],tempB, iSQR))
    let tempS_SQR = compmul(tempS, tempS, iSQR)

    let outX = compmulEx([[2,0],tempH,tempS], iSQR)
    let outY = compsub(compmul(tempW, compsub(compmul([4,0],tempB, iSQR),tempH), iSQR), compmulEx([[8,0], xyzP[1], xyzP[1], tempS_SQR], iSQR))
    let outZ = compmulEx([[8,0], tempS, tempS_SQR], iSQR)

    return [compmod(outX, fieldN), 
            compmod(outY, fieldN), 
            compmod(outZ, fieldN)]
}

// Compute P+Q in projective space (X: Y: Z)
export function projPplusQXYZ(ec: ECurve, xyzP: number[][], xyzQ: number[][]): number[][] {

    let {fieldN, iSQR} = unpackEC(ec, ReqEC.NA);    
    let tempU1 = compmul(xyzQ[1], xyzP[2], iSQR)
    let tempU2 = compmul(xyzP[1], xyzQ[2], iSQR)
    let tempV1 = compmul(xyzQ[0], xyzP[2], iSQR)
    let tempV2 = compmul(xyzP[0], xyzQ[2], iSQR)
    
    if (pointsEquals(tempV1, tempV2)) {
        if (!pointsEquals(tempU1, tempU2))
                return [[0,0], [1,0], [0,0]];
        else    return proj2PXYZ(ec, xyzP) 
    }

    let tempU = compsub(tempU1, tempU2)
    let tempV = compsub(tempV1, tempV2)
    let tempV_SQR = compmul(tempV, tempV, iSQR)
    let tempV_CUB = compmul(tempV_SQR, tempV, iSQR)
    let tempW = compmul(xyzP[2], xyzQ[2], iSQR)
    let tempA = compsub(compmulEx([tempU, tempU, tempW], iSQR), compadd(tempV_CUB, compmulEx([[2,0], tempV_SQR, tempV2], iSQR)))

    let outX = compmul(tempV, tempA, iSQR)
    let outY = compsub(compmul(tempU,compsub(compmul(tempV_SQR, tempV2, iSQR),tempA), iSQR), compmul(tempV_CUB, tempU2, iSQR))
    let outZ = compmul(tempV_CUB,tempW, iSQR)

    return [compmod(outX, fieldN), 
            compmod(outY, fieldN), 
            compmod(outZ, fieldN)]
}

// Compute 2P mapping in/out of projective space
export function proj2P(ec: ECurve, ptP: number[][], verbose: boolean = false): number[][] {

    unpackEC(ec, ReqEC.NA);    
    let compute2P = (ptP: number[][], verbose: boolean = false): number[][] => { 

        //0 + 0 = 0
        if (compPointsEquals(ptP, [[0]]))
            return [[0]];

        //y symetry --> 2P = 0 when y = 0
        if (pointsEquals(ptP[1],[0,0]))
            return [[0]];

        let XYZ = proj2PXYZ(ec, [ptP[0], ptP[1], [1,0]])

        if (verbose)
            console.log(`2P = 2*(${strComplex(ptP[0])},${strComplex(ptP[1])},${strComplex([1,0])}) = ` +
                               `(${strComplex(XYZ[0])},${strComplex(XYZ[1])},${strComplex(XYZ[2])})`);
        
        let xx = compNdiv(ec, XYZ[0], XYZ[2])
        let yy = compNdiv(ec, XYZ[1], XYZ[2])
        return [xx,yy]
    }

    let pt2P = compute2P(ptP, verbose);

    if (verbose) 
        console.log(`2P = 2*${strCompPt(ptP)} = ${strCompPt(pt2P)}`);

    return pt2P;
}

// Compute P+Q/2P mapping in/out of projective space
export function projAdd(
                ec: ECurve, 
                ptP: number[][], 
                ptQ: number[][], 
                verbose: boolean = false): number[][] {

    unpackEC(ec, ReqEC.NA);    
    let computeAdd = (  ptP: number[][], 
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
                XYZ = proj2PXYZ(ec, [ptP[0], ptP[1], [1,0]]);

        else    XYZ = projPplusQXYZ(ec, [ptP[0], ptP[1], [1,0]], [ptQ[0], ptQ[1], [1,0]]);

        if (verbose)
            console.log(`P+Q = (${strComplex(ptP[0])},${strComplex(ptP[1])},${strComplex([1,0])}) + ` +
                              `(${strComplex(ptQ[0])},${strComplex(ptQ[1])},${strComplex([1,0])}) = ` +
                              `(${strComplex(XYZ[0])},${strComplex(XYZ[1])},${strComplex(XYZ[2])})`);

        let xx = compNdiv(ec, XYZ[0], XYZ[2])
        let yy = compNdiv(ec, XYZ[1], XYZ[2])
        return [xx,yy]
    }

    let ptPQ = computeAdd(ptP, ptQ, verbose);
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
// ptoys.projTestPplusQ({fieldN: 11, coeffA: 4, coeffB: 3}, true)
// ptoys.projTestPplusQ({fieldN: 13, coeffA: 4, coeffB: 3}, true)
export function projTestPplusQ(ec: ECurve, verbose: boolean = false): boolean {

    unpackEC(ec, ReqEC.NAB);    
    let pts = ecipoints(ec, false);

    let confirms: number = 0;
    let notComputed: number = 0;

    for (let icntP = 0; icntP < pts.length; ++icntP) {
        for (let icntQ = icntP; icntQ < pts.length; ++icntQ) {

            let ptPP: number[][] = [[0]];
            let ptXY: number[][] = [[0]];
            let failures = 0;
            let errMsg: string = "";

            try {
                ptPP = projAdd(ec, pts[icntP], pts[icntQ], verbose) 
            }
            catch (err) {
                //Using odd prime numbers allous us to know which of the functions failed.
                failures += 3;
                errMsg = `${err}`;
            }

            try {
                ptXY = eciAdd(ec, pts[icntP], pts[icntQ], verbose)
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
// ptoys.projTest2P({fieldN: 11, coeffA: 4, coeffB: 3}, true)
// ptoys.projTest2P({fieldN: 13, coeffA: 4, coeffB: 3}, true)
export function projTest2P(ec: ECurve, verbose: boolean = false): boolean {

    unpackEC(ec, ReqEC.NAB);    
    let pts = ecipoints(ec, false);
    let confirms: number = 0;
    let notComputed: number = 0;

    for (let icntP = 0; icntP < pts.length; ++icntP) {

        let ptPP: number[][] = [[0]];
        let ptXY: number[][] = [[0]];
        let failures = 0;
        let errMsg: string = "";

        try {
            ptPP = proj2P(ec, pts[icntP], verbose) 
        }
        catch (err) {
            //Using odd prime numbers allous us to know which of the functions failed.
            failures += 3;
            errMsg = `${err}`;
        }

        try {
            ptXY = eci2P(ec, pts[icntP], verbose)
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
