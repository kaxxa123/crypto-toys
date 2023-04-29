import {pointsEquals, sqrAndMultEx} from "./toys"

import {compmod, compsub, compmul, compNdiv, compNmul, compNsqr, compNraise,
        compPointsEquals, strComplex,
        eciAdd, eciline2P, ecilinePplusQ, strCompPt,
        eciTorsion, eciFrobeniusTrMap, eciAntiFrobeniusTrMap, eciEmbeddingDegree, eciShowPoints } from "./i-toys"
import { Console } from "console";

const INVALID_LINE = [[0,0],[0,0]];
export function solveLine(fieldN: number, ptP: number[][], line: number[][]): number[] {
    let res = compmul(line[0], ptP[0]);                     // m*x
    res = compsub(ptP[1],res);                              // y - m*x
    res = compsub(res,line[1]);                             // y - mx - c
    return compmod(res,fieldN);
}

export function solveVert(fieldN: number, ptP: number[][], vertPt: number[][]): number[] {
    let res = compsub(ptP[0], vertPt[0]); // px - vx
    return compmod(res,fieldN);
}

// Display line formula in the format: 
//      y + mx + c = 0 (% n)
export function showFRPLine(
                    fieldN: number, 
                    line: number[][]) {

    if (compPointsEquals(line, INVALID_LINE))
        return "<invalid line>";

    let negGradient  = compmod([-1*line[0][0],-1*line[0][1]], fieldN);
    let negIntercept = compmod([-1*line[1][0],-1*line[1][1]], fieldN);

    return `y + ${strComplex(negGradient)}x + ${strComplex(negIntercept)}`;
}

// Display vertical line formula as:
//      x + c = 0
export function showFRPVertical(
                    fieldN: number, 
                    ptP: number[][]) {

    let negX = compmod([-1*ptP[0][0],-1*ptP[0][1]], fieldN);

    return `x + ${strComplex(negX)}`;
}

// Compute set of lines/verticals that allow for naive computation of frp
// for any r-torsion. The result can be fed to solveFRP together with
// a specific point P for which we want to workout frp
//
// let pair   = require('./build/pairings.js')
// let params = pair.getFRPparams(23, 17, 6, 5, [[10,0],[7,0]], true)
export function getFRPparams(
                        fieldN: number, 
                        coeffA: number, 
                        coeffB: number, 
                        rorder: number, 
                        ptP: number[][], 
                        verbose: boolean = false): number[][][][] {
    let funcOut = [];
    let line = INVALID_LINE;
    let next = JSON.parse(JSON.stringify(ptP));

    for (let cnt = 1; cnt <= rorder-2; ++cnt) {
        let prev = JSON.parse(JSON.stringify(next));

        if (cnt == 1) {
            line = eciline2P(fieldN, coeffA, coeffB, ptP);
            next = eciAdd(fieldN, coeffA, ptP, ptP);
        }
        else {
            line = ecilinePplusQ(fieldN, next, ptP);
            next = eciAdd(fieldN, coeffA, next, ptP);
        }

        if (verbose) {
            console.log();
            console.log(`L[${cnt}]P,P: ` + showFRPLine(fieldN,line))
            console.log(`v[${cnt}]P:   ` + showFRPVertical(fieldN,prev))
            console.log();
        }

        funcOut.push([line,prev]);
    }
    return funcOut;
 }

// Naive computation of frp for any r-torsion point
//
// FRP =  L_[1]P,P * L_[2]P,P * … * L_[r-2]P,P
//       --------------------------------------
//          V_[2]P * V_[3]P * … * V_[r-2]P
//
// let toys = require('./build/toys.js')
// let pair = require('./build/pairings.js')
//
// let tor5 = toys.ecTorsion(23,17,6, 5, true)
// let params = pair.getFRPparams(23, 17, 6, 5, [[tor5[1][0], 0], [tor5[1][1], 0]], true)
// pair.solveFRP(23, [[tor5[2][0], 0], [tor5[2][1], 0]], params, true)
export function solveFRP(
                    fieldN: number, 
                    ptP: number[][], 
                    params: number[][][][],
                    verbose: boolean = false): number[] {

    let quoStr: string = "";
    let divStr: string = "";
    let quo: number[] = [];
    let div: number[] = [];
 
    params.forEach( (oneParam, idx) => {
        let lparam = oneParam[0];
        let vparam = oneParam[1];

        // Compute Quotient for frp: L_[1]P,P * L_[2]P,P * … * L_[r-2]P,P
        let solveL = solveLine(fieldN, ptP, lparam); 
        if  (quo.length === 0) {
            quo = solveL;
            quoStr = showFRPLine(fieldN, lparam);            
        }
        else {
            quo = compNmul(fieldN, quo, solveL);
            quoStr = quoStr + ` * ${showFRPLine(fieldN, lparam)}`;
        }

        // Compute Divisor for frp: V_[2]P * V_[3]P * … * V_[r-2]P
        // Skippin V_[1]P...
        if (idx == 0)
            return;

        let solveV = solveVert(fieldN, ptP, vparam);
        if (idx == 1) {
            div = solveV;
            divStr = showFRPVertical(fieldN, vparam);
        } 
        else {
            div = compNmul(fieldN, div, solveV);
            divStr = divStr + ` * ${showFRPVertical(fieldN, vparam)}`;
        }
    });
 
    let res: number[] = [];
    if (div.length > 0)
          res = compNdiv(fieldN, quo, div);
    else  res = quo;

    if (verbose)
    {
        console.log(quoStr + ` = ${strComplex(res)}`)
        console.log('-'.repeat(quoStr.length))
        console.log(divStr)
    }

    return res;
 }

// Miller’s Algorithm
// Computation of frp for any r-torsion point
export function fastFRP(
                    fieldN: number, 
                    coeffA: number, 
                    coeffB: number, 
                    rorder: number, 
                    ptP: number[][], 
                    ptQ: number[][], 
                    verbose: boolean = false): number[] {

    if (rorder < 4)
    {
        let frp = getFRPparams(fieldN, coeffA, coeffB, rorder, ptP, verbose);        
        return solveFRP(fieldN, ptQ, frp);
    }

    let frpSqr = (prev: any[]): any[] => {
        let frpPrev: number[] = prev[0];
        let mPt: number[][]   = prev[1];

        if (verbose) console.log(`frpSqr: ${prev}`);
        let frpSqr  = compNsqr(fieldN, frpPrev);

        let line    = eciline2P(fieldN, coeffA, coeffB, mPt, verbose);
        let solveL  = solveLine(fieldN, ptQ, line); 
        let quo     = compNmul(fieldN, frpSqr, solveL);

        let newP    = eciAdd(fieldN, coeffA, mPt, mPt);
        let solveV  = solveVert(fieldN, ptQ, newP);

        let res     = compNdiv(fieldN, quo, solveV);
        return [res, newP];
    }

    let frpMulti = (prev: any[]): any[] => {
        let frpPrev: number[] = prev[0];
        let mPt: number[][]   = prev[1];

        if (verbose) console.log(`frpMulti: ${prev}`);
        let line    = ecilinePplusQ(fieldN, ptP, mPt, verbose);
        let solveL  = solveLine(fieldN, ptQ, line); 
        let quo     = compNmul(fieldN, frpPrev, solveL);

        let newP    = eciAdd(fieldN, coeffA, ptP, mPt);
        let solveV  = solveVert(fieldN, ptQ, newP);

        let res     = compNdiv(fieldN, quo, solveV);
        return [res, newP];
    }

    let f1p     = [1, 0];
    let frmin2p = sqrAndMultEx([[0,0],[[0]]], [f1p, ptP], rorder-2, frpSqr, frpMulti);
    let frpPrev = frmin2p[0];
    let mPt     = frmin2p[1];

    let line    = ecilinePplusQ(fieldN, ptP, mPt, verbose);
    let solveL  = solveLine(fieldN, ptQ, line); 
    return compNmul(fieldN, frpPrev, solveL);
}

// Computing f(D) as defined for the Weil Pairing
// where    f = FRP * v^r / L^r
export function solveWeilFD(
                    fieldN: number, 
                    coeffA: number, 
                    coeffB: number, 
                    rorder: number, 
                    ptP: number[][], 
                    ptQ: number[][], 
                    vertPt: number[][], 
                    line: number[][], 
                    verbose: boolean = false): number[] {

    let funcFrm = fastFRP(fieldN, coeffA, coeffB, rorder, ptP, ptQ, verbose);
    if (verbose) 
        console.log(`F_rm = ${strComplex(funcFrm)}`);
 
    let funcV = solveVert(fieldN, ptQ, vertPt);
    if (verbose) 
        console.log(`VERTICAL: ${showFRPVertical(fieldN,vertPt)} = ${strComplex(funcV)}`);
 
    let funcL = solveLine(fieldN, ptQ, line);
    if (verbose) 
        console.log(`LINE: ${showFRPLine(fieldN,line)} = ${strComplex(funcL)}`);
 
    funcV = compNraise(funcV, rorder, fieldN);      //v^r
    funcL = compNraise(funcL, rorder, fieldN);      //L^r
 
    let quo = compNmul(fieldN,funcFrm,funcV);       //frm * v^r
    if (verbose) 
        console.log(`F_rm * V^r = ${strComplex(quo)}`);
    if (verbose) 
        console.log(`L^r = ${strComplex(funcL)}`);
 
    return compNdiv(fieldN,quo,funcL);              //frm * v^r / (L^r)
 }

// Weil pairing computation
//
// Weil’s Pairing Example from: 
// "ON THE IMPLEMENTATION OF PAIRING-BASED CRYPTOSYSTEMS - Ben Lynn’s Dissertation"
// Page 53 to 55
// Expected Result = (46 + 56i)
//
// let pair = require('./build/pairings.js')
// pair.weilPairing(59, 1, 0, 5, [[25,0], [30,0]], [[(59-25),0], [0,30]], [[40,0], [54,0]], [[48,55], [28,51]])
 export function weilPairing(
                    fieldN: number, 
                    coeffA: number, 
                    coeffB: number, 
                    rorder: number, 
                    ptP: number[][], 
                    ptQ: number[][], 
                    ptR: number[][], 
                    ptS: number[][], 
                    verbose: boolean = false): number[] {
    
    let ptQS = eciAdd(fieldN, coeffA, ptQ, ptS);
    let ptPR = eciAdd(fieldN, coeffA, ptP, ptR);
 
    let linePR = ecilinePplusQ(fieldN, ptP, ptR);
    let lineQS = ecilinePplusQ(fieldN, ptQ, ptS);
 
    let Fqs = solveWeilFD(fieldN, coeffA, coeffB, rorder, ptP, ptQS, ptPR, linePR, verbose);
    let Fs  = solveWeilFD(fieldN, coeffA, coeffB, rorder, ptP, ptS,  ptPR, linePR, verbose);
    let Gpr = solveWeilFD(fieldN, coeffA, coeffB, rorder, ptQ, ptPR, ptQS, lineQS, verbose);
    let Gr  = solveWeilFD(fieldN, coeffA, coeffB, rorder, ptQ, ptR,  ptQS, lineQS, verbose);
 
    let quoPair = compNmul(fieldN, Fqs, Gr);
    let divPair = compNmul(fieldN, Gpr, Fs);
    let weil = compNdiv(fieldN, quoPair, divPair);

    if (verbose) {
        console.log()
        console.log(`e(P, Q) = e(${strCompPt(ptP)}, ${strCompPt(ptQ)}) = ${strComplex(weil)}`)
    }

    return weil;
 }
 
// Test the Weil piaring on all G1 and G2 points
// and confirm that e(P, Q)^r = 1
//
// function only supports cases for embedding degree k = 2
//
// let pair = require('./build/pairings.js')
// pair.weilTest(59, 1, 0, 5, [[40,0], [54,0]], [[48,55], [28,51]])
export function weilTest(
                    fieldN: number, 
                    coeffA: number, 
                    coeffB: number, 
                    rorder: number,
                    ptR: number[][], 
                    ptS: number[][]): boolean {

    let powk = eciEmbeddingDegree(fieldN, rorder)
    if (powk != 2)
        throw `Embedding degree for field/order not supported (must be 2): ${powk}`;

    let torPts = eciTorsion(fieldN, coeffA, coeffB, rorder)
    let g1 = eciFrobeniusTrMap(fieldN, coeffA, powk, torPts, false)
    let g2 = eciAntiFrobeniusTrMap(fieldN, coeffA, powk, torPts, false)


    console.log()
    console.log('G1:')
    eciShowPoints(g1)
    console.log()
    console.log('G2:')
    eciShowPoints(g2)
    console.log("==========================================")
    console.log()

    for (let g1Cnt = 0; g1Cnt < g1.length; ++g1Cnt) {
        if (compPointsEquals(g1[g1Cnt], [[0]]))
            continue;

        for (let g2Cnt = 0; g2Cnt < g2.length; ++g2Cnt) {
            if (compPointsEquals(g2[g2Cnt], [[0]]))
                    continue;

            let weil = weilPairing(
                        fieldN, coeffA, coeffB, rorder, 
                        g1[g1Cnt], g2[g2Cnt], ptR, ptS, true)
            console.log("==========================================")
            console.log()

            //Identity Test
            let weilR = compNraise(weil, rorder, fieldN);
            if (!pointsEquals(weilR, [1,0]))
                throw `weil^r = ${strComplex(weilR)} should have been 1`;

            //Bilinearity Test
            let g1g1 = eciAdd(fieldN, coeffA, g1[g1Cnt], g1[g1Cnt])
            let g2g2 = eciAdd(fieldN, coeffA, g2[g2Cnt], g2[g2Cnt])

            let weilg1g1 = weilPairing(
                            fieldN, coeffA, coeffB, rorder, 
                            g1g1, g2[g2Cnt], ptR, ptS, false)

            let weilg2g2 = weilPairing(
                            fieldN, coeffA, coeffB, rorder, 
                            g1[g1Cnt], g2g2, ptR, ptS, false)

            let weil2 = compNraise(weil, 2, fieldN);

            if (!pointsEquals(weilg1g1, weilg2g2))
                throw `e(2P,Q) != e(P,2Q) | ${strComplex(weilg1g1)}  != ${strComplex(weilg2g2)} `;

            if (!pointsEquals(weilg1g1, weil2))
                throw `e(2P,Q) != e(P,Q)"2 | ${strComplex(weilg1g1)}  != ${strComplex(weil2)} `;
        }
    }

    return true
}