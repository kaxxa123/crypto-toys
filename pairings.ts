import { ECurve, unpackEC, ReqEC } from './config'

import { pointsEquals, isPrime, sqrAndMultEx, ecpoints,
         ecMultiply, ecShowPoints } from "./toys"

import {compmod, compsub, compmul, compNdiv, compNmul, compNsqr, compNraise,
        compPointsEquals, strComplex,
        ecipoints, eciAdd, eciMultiply, eciline2P, ecilinePplusQ, strCompPt,
        eciTorsion, eciFrobeniusTrMap, eciAntiFrobeniusTrMap, eciEmbeddingDegree, eciShowPoints } from "./i-toys"

const INVALID_LINE = [[0,0],[0,0]];

export function solveLine(ec: ECurve, ptP: number[][], line: number[][]): number[] {

    let {fieldN, iSQR} = unpackEC(ec, ReqEC.N)
    let res = compmul(line[0], ptP[0], iSQR);               // m*x
    res = compsub(ptP[1],res);                              // y - m*x
    res = compsub(res,line[1]);                             // y - mx - c
    return compmod(res,fieldN);
}

export function solveVert(ec: ECurve, ptP: number[][], vertPt: number[][]): number[] {

    let {fieldN} = unpackEC(ec, ReqEC.N)
    let res = compsub(ptP[0], vertPt[0]); // px - vx
    return compmod(res,fieldN);
}

// Display line formula in the format: 
//      y + mx + c = 0 (% n)
export function showFRPLine(ec: ECurve, line: number[][]) {

    let {fieldN} = unpackEC(ec, ReqEC.N)
    if (compPointsEquals(line, INVALID_LINE))
        return "<invalid line>";

    let negGradient  = compmod([-1*line[0][0],-1*line[0][1]], fieldN);
    let negIntercept = compmod([-1*line[1][0],-1*line[1][1]], fieldN);

    return `y + ${strComplex(negGradient)}x + ${strComplex(negIntercept)}`;
}

// Display vertical line formula as:
//      x + c = 0
export function showFRPVertical(ec: ECurve, ptP: number[][]) {
    let {fieldN} = unpackEC(ec, ReqEC.N)
    let negX = compmod([-1*ptP[0][0],-1*ptP[0][1]], fieldN);

    return `x + ${strComplex(negX)}`;
}

// Compute set of lines/verticals that allow for naive computation of frp
// for any r-torsion. The result can be fed to solveFRP together with
// a specific point P for which we want to workout frp
//
// let pair   = require('./build/pairings.js')
// let params = pair.getFRPparams({fieldN: 23, coeffA: 17, coeffB: 6, rorder: 5}, [[10,0],[7,0]], true)
export function getFRPparams(ec: ECurve, ptP: number[][], verbose: boolean = false): number[][][][] {
    let {rorder} = unpackEC(ec, ReqEC.NABR)
    let funcOut = [];
    let line = INVALID_LINE;
    let next = JSON.parse(JSON.stringify(ptP));

    for (let cnt = 1; cnt <= rorder-2; ++cnt) {
        let prev = JSON.parse(JSON.stringify(next));

        if (cnt == 1) {
            line = eciline2P(ec, ptP);
            next = eciAdd(ec, ptP, ptP);
        }
        else {
            line = ecilinePplusQ(ec, next, ptP);
            next = eciAdd(ec, next, ptP);
        }

        if (verbose) {
            console.log();
            console.log(`L[${cnt}]P,P: ` + showFRPLine(ec, line))
            console.log(`v[${cnt}]P:   ` + showFRPVertical(ec, prev))
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
// let tor5   = toys.ecTorsion({fieldN: 23, coeffA: 17, coeffB: 6, rorder: 5}, true)
// let params = pair.getFRPparams({fieldN: 23, coeffA: 17, coeffB: 6, rorder: 5}, [[tor5[1][0], 0], [tor5[1][1], 0]], true)
// pair.solveFRP({fieldN: 23}, [[tor5[2][0], 0], [tor5[2][1], 0]], params, true)
export function solveFRP(
                    ec: ECurve, 
                    ptP: number[][], 
                    params: number[][][][],
                    verbose: boolean = false): number[] {

    unpackEC(ec, ReqEC.N)
    let quoStr: string = "";
    let divStr: string = "";
    let quo: number[] = [];
    let div: number[] = [];
 
    params.forEach( (oneParam, idx) => {
        let lparam = oneParam[0];
        let vparam = oneParam[1];

        // Compute Quotient for frp: L_[1]P,P * L_[2]P,P * … * L_[r-2]P,P
        let solveL = solveLine(ec, ptP, lparam); 
        if  (quo.length === 0) {
            quo = solveL;
            quoStr = showFRPLine(ec, lparam);            
        }
        else {
            quo = compNmul(ec, quo, solveL);
            quoStr = quoStr + ` * ${showFRPLine(ec, lparam)}`;
        }

        // Compute Divisor for frp: V_[2]P * V_[3]P * … * V_[r-2]P
        // Skippin V_[1]P...
        if (idx == 0)
            return;

        let solveV = solveVert(ec, ptP, vparam);
        if (idx == 1) {
            div = solveV;
            divStr = showFRPVertical(ec, vparam);
        } 
        else {
            div = compNmul(ec, div, solveV);
            divStr = divStr + ` * ${showFRPVertical(ec, vparam)}`;
        }
    });
 
    let res: number[] = [];
    if (div.length > 0)
          res = compNdiv(ec, quo, div);
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
export function fastFRP(ec: ECurve, ptP: number[][], ptQ: number[][], verbose: boolean = false): number[] {

    let {rorder} = unpackEC(ec, ReqEC.NABR)
    if (rorder < 4)
    {
        let frp = getFRPparams(ec, ptP, verbose);        
        return solveFRP(ec, ptQ, frp);
    }

    let frpSqr = (prev: any[]): any[] => {
        let frpPrev: number[] = prev[0];
        let mPt: number[][]   = prev[1];

        if (verbose) console.log(`frpSqr: ${prev}`);
        let frpSqr  = compNsqr(ec, frpPrev);

        let line    = eciline2P(ec, mPt, verbose);
        let solveL  = solveLine(ec, ptQ, line); 
        let quo     = compNmul(ec, frpSqr, solveL);

        let newP    = eciAdd(ec, mPt, mPt);
        let solveV  = solveVert(ec, ptQ, newP);

        let res     = compNdiv(ec, quo, solveV);
        return [res, newP];
    }

    let frpMulti = (prev: any[]): any[] => {
        let frpPrev: number[] = prev[0];
        let mPt: number[][]   = prev[1];

        if (verbose) console.log(`frpMulti: ${prev}`);
        let line    = ecilinePplusQ(ec, ptP, mPt, verbose);
        let solveL  = solveLine(ec, ptQ, line); 
        let quo     = compNmul(ec, frpPrev, solveL);

        let newP    = eciAdd(ec, ptP, mPt);
        let solveV  = solveVert(ec, ptQ, newP);

        let res     = compNdiv(ec, quo, solveV);
        return [res, newP];
    }

    let f1p     = [1, 0];
    let frmin2p = sqrAndMultEx([[0,0],[[0]]], [f1p, ptP], rorder-2, frpSqr, frpMulti);
    let frpPrev = frmin2p[0];
    let mPt     = frmin2p[1];

    let line    = ecilinePplusQ(ec, ptP, mPt, verbose);
    let solveL  = solveLine(ec, ptQ, line); 
    let res =  compNmul(ec, frpPrev, solveL);

    if (verbose)
        console.log(`frp(Q) = ${strComplex(res)}`)

    return res;
}

// Computing f(D) as defined for the Weil Pairing
// where    f = FRP * v^r / L^r
export function solveWeilFD(
                    ec: ECurve, 
                    ptP: number[][], 
                    ptQ: number[][], 
                    vertPt: number[][], 
                    line: number[][], 
                    verbose: boolean = false): number[] {

    let {rorder} = unpackEC(ec, ReqEC.NABR)
    let funcFrm = fastFRP(ec, ptP, ptQ, verbose);
    if (verbose) 
        console.log(`F_rm = ${strComplex(funcFrm)}`);
 
    let funcV = solveVert(ec, ptQ, vertPt);
    if (verbose) 
        console.log(`VERTICAL: ${showFRPVertical(ec,vertPt)} = ${strComplex(funcV)}`);
 
    let funcL = solveLine(ec, ptQ, line);
    if (verbose) 
        console.log(`LINE: ${showFRPLine(ec, line)} = ${strComplex(funcL)}`);
 
    funcV = compNraise(ec, funcV, rorder);      //v^r
    funcL = compNraise(ec, funcL, rorder);      //L^r
 
    let quo = compNmul(ec,funcFrm,funcV);       //frm * v^r
    if (verbose) 
        console.log(`F_rm * V^r = ${strComplex(quo)}`);
    if (verbose) 
        console.log(`L^r = ${strComplex(funcL)}`);
 
    return compNdiv(ec,quo,funcL);              //frm * v^r / (L^r)
 }

// Weil pairing computation
//
// Weil’s Pairing Example from: 
// "ON THE IMPLEMENTATION OF PAIRING-BASED CRYPTOSYSTEMS - Ben Lynn’s Dissertation"
// Page 53 to 55
// Expected Result = (46 + 56i)
//
// let pair = require('./build/pairings.js')
// pair.weilPairing({fieldN: 59, coeffA: 1, coeffB: 0, rorder: 5}, [[25,0], [30,0]], [[(59-25),0], [0,30]], [[40,0], [54,0]], [[48,55], [28,51]])
 export function weilPairing(
                    ec: ECurve, 
                    ptP: number[][], 
                    ptQ: number[][], 
                    ptR: number[][], 
                    ptS: number[][], 
                    verbose: boolean = false): number[] {
    
    unpackEC(ec, ReqEC.NABR)
    let ptQS = eciAdd(ec, ptQ, ptS);
    let ptPR = eciAdd(ec, ptP, ptR);
 
    let linePR = ecilinePplusQ(ec, ptP, ptR);
    let lineQS = ecilinePplusQ(ec, ptQ, ptS);
 
    let Fqs = solveWeilFD(ec, ptP, ptQS, ptPR, linePR, verbose);
    let Fs  = solveWeilFD(ec, ptP, ptS,  ptPR, linePR, verbose);
    let Gpr = solveWeilFD(ec, ptQ, ptPR, ptQS, lineQS, verbose);
    let Gr  = solveWeilFD(ec, ptQ, ptR,  ptQS, lineQS, verbose);
 
    let quoPair = compNmul(ec, Fqs, Gr);
    let divPair = compNmul(ec, Gpr, Fs);
    let weil = compNdiv(ec, quoPair, divPair);

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
// pair.weilTest({fieldN: 59, coeffA: 1, coeffB: 0, rorder: 5}, [[40,0], [54,0]], [[48,55], [28,51]])
export function weilTest(ec: ECurve, ptR: number[][], ptS: number[][]): boolean {

    let {rorder} = unpackEC(ec, ReqEC.NABR)
    let powk = eciEmbeddingDegree(ec)
    if (powk != 2)
        throw `Embedding degree for field/order not supported (must be 2): ${powk}`;

    let torPts = eciTorsion(ec)
    let g1 = eciFrobeniusTrMap(ec, powk, torPts, false)
    let g2 = eciAntiFrobeniusTrMap(ec, powk, torPts, false)


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

            let weil = weilPairing(ec, g1[g1Cnt], g2[g2Cnt], ptR, ptS, true)
            console.log("==========================================")
            console.log()

            //Identity Test
            let weilR = compNraise(ec, weil, rorder);
            if (!pointsEquals(weilR, [1,0]))
                throw `weil^r = ${strComplex(weilR)} should have been 1`;

            //Bilinearity Test
            let g1g1 = eciAdd(ec, g1[g1Cnt], g1[g1Cnt])
            let g2g2 = eciAdd(ec, g2[g2Cnt], g2[g2Cnt])

            let weilg1g1 = weilPairing(ec, g1g1, g2[g2Cnt], ptR, ptS, false)
            let weilg2g2 = weilPairing(ec, g1[g1Cnt], g2g2, ptR, ptS, false)
            let weil2 = compNraise(ec, weil, 2);

            if (!pointsEquals(weilg1g1, weilg2g2))
                throw `e(2P,Q) != e(P,2Q) | ${strComplex(weilg1g1)}  != ${strComplex(weilg2g2)} `;

            if (!pointsEquals(weilg1g1, weil2))
                throw `e(2P,Q) != e(P,Q)"2 | ${strComplex(weilg1g1)}  != ${strComplex(weil2)} `;
        }
    }

    return true
}

// Verify the condition:     r||#E
// for r prime, 
//      r should divide #E, 
//      r^2 should NOT divide #E
export function orderDivFQ(ec: ECurve, group: number[][], verbose: boolean = false): void {

    let {rorder} = unpackEC(ec, ReqEC.NABR);

    if (verbose)
        console.log(`#E = ${group.length}`)

    if (!isPrime(rorder))
        throw `Order r is not prime`

    let rSqr = rorder*rorder
    if ((group.length % rorder != 0) ||
        (group.length % rSqr == 0))
        throw `r||#E NOT satisfied`

    if (verbose) {
        let h = group.length/rorder
        console.log(`h = #E/r = ${h}`)
    }
}

// Verify the condition:     r^2||#E(Fq^k)
// for r prime, 
//      r^2 should divide #E(Fq^k), 
//      r^4 should NOT divide #E(Fq^k)
export function orderDivFQk(ec: ECurve, group: number[][][], verbose: boolean = false): void {

    let {rorder} = unpackEC(ec, ReqEC.NABR);

    if (verbose)
        console.log(`#E(Fq^2) = ${group.length}`)

    if (!isPrime(rorder))
        throw `Order r is not prime`

    let kpow = eciEmbeddingDegree(ec)
    if (kpow < 2)
        throw `Embedding Degree k > 1 required. ${kpow}`

    let rSqr = rorder*rorder
    let r4th = rSqr*rSqr
    if ((group.length % rSqr != 0) ||
        (group.length % r4th == 0))
        throw `r^2||#E(Fq^2) NOT satisfied`

    if (verbose) {
        let h = group.length/rSqr
        console.log(`h = #E(Fq^2)/r^2 = ${h}`)
    }
}

// Compute the rE coset of size h, where h*r = #E(Fq)
// for prime h and r
//
// let pair = require('./build/pairings.js')
// pair.ecrE({fieldN: 53, coeffA: -5, coeffB: 8, rorder: 5}, true)
export function ecrE(ec: ECurve, verbose: boolean = false): number[][] {

    let {rorder} = unpackEC(ec, ReqEC.NABR);
    let coset_rE: number[][] = [];
    let pts = ecpoints(ec);

    orderDivFQ(ec, pts, verbose);

    for (let cnt = 0; cnt < pts.length; ++cnt) {
        let rP = ecMultiply(ec, rorder, pts[cnt]);
        
        let idx = coset_rE.findIndex((onePt) => pointsEquals(onePt, rP));
        if (idx == -1)
            coset_rE.push(rP);
    }

    if (verbose)
        ecShowPoints(coset_rE)

    return coset_rE;
}

// Compute the rE coset of size h, where h*r^2 = #E(Fq^k)
// rE(Fq^k) (written as rE) is the coset of points defined as: 
//  rE = {[r]P: P ϵ E(Fq^k)}
//  h  = #rE and includes 0
//
// let pair   = require('./build/pairings.js')
// pair.ecirE({fieldN: 5, coeffA: 0, coeffB: -3, rorder: 3}, true)
export function ecirE(ec: ECurve, verbose: boolean = false): number[][][] {

    let {rorder} = unpackEC(ec, ReqEC.NABR);
    let coset_rE: number[][][] = [];
    let ptsF   = ecpoints(ec);
    let ptsFqk = ecipoints(ec);

    orderDivFQ(ec, ptsF, verbose);
    orderDivFQk(ec, ptsFqk, verbose)
    
    for (let cnt = 0; cnt < ptsFqk.length; ++cnt) {
        let rP = eciMultiply(ec, rorder, ptsFqk[cnt], true);
        
        let idx = coset_rE.findIndex((onePt) => compPointsEquals(onePt, rP));
        if (idx == -1)
            coset_rE.push(rP);
    }

    if (verbose)
        eciShowPoints(coset_rE)

    return coset_rE;
}

// Compute the "basic" Tate Pairing defined as:
// e(P, Q) = f(DQ)      where DQ = (Q+S) – (S)
// e(P, Q) = f(Q+S)/f(S)
//
// WARNING: This computation has the limitation that it returns a result within an 
//          equivalnece class. Hence different results are possible for the same points
//
// let pair = require('./build/pairings.js')
// let ec = {fieldN: 5, coeffA: 0, coeffB: -3, rorder: 3, iSQR: -2}
// P = [[3,0],[2,0]]		
// Q = [[1,1],[2,4]]		
// R = [[0,2],[2,1]]
// pair.tateBasic(ec, P, Q, R)
export function tateBasic(
    ec: ECurve, 
    ptP: number[][], 
    ptQ: number[][], 
    ptR: number[][], 
    verbose: boolean = false): number[] {

    unpackEC(ec, ReqEC.NABR)
    let ptQR    = eciAdd(ec, ptQ, ptR);
    let quo     = fastFRP(ec, ptP, ptQR, verbose);
    let div     = fastFRP(ec, ptP, ptR, verbose);

    return compNdiv(ec,quo,div);
}

// Compute the Reduced Tate Pairing
//
// Given the same P and Q the pairing now always returns 
// the same result. Thus the limitation of the tateBasic 
// implementation is eliminated.
//
// let pair = require('./build/pairings.js')
// let ec = {fieldN: 19, coeffA: 14, coeffB: 3, rorder: 5}
// let P = [[17,0], [9, 0]]
// let Q = [[16,0], [0,16]]
// let R = [[18,2],[14,5]]
// pair.tatePairing(ec, P, Q, R)        // [ 2,15]
export function tatePairing(
                    ec: ECurve, 
                    ptP: number[][], 
                    ptQ: number[][], 
                    ptR: number[][], 
                    verbose: boolean = false): number[] {

    let {fieldN, rorder} = unpackEC(ec, ReqEC.NABR)

    let ptsF   = ecpoints(ec);
    let ptsFqk = ecipoints(ec);
    orderDivFQ(ec, ptsF, verbose);
    orderDivFQk(ec, ptsFqk, verbose)

    if ((fieldN**2 - 1) % rorder != 0)
        throw "Cardinality of Fq^k is not divisible by r";

    let basic = tateBasic(ec, ptP, ptQ, ptR, verbose);
    let pow = Math.floor((fieldN**2 - 1)/rorder);
    let tate = compNraise(ec, basic, pow);

    if (verbose) {
        console.log()
        console.log(`e(P, Q) = e(${strCompPt(ptP)}, ${strCompPt(ptQ)}) = ${strComplex(tate)}`)
    }

    return tate;
}
