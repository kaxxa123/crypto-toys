import {posmod} from "./toys"

import {compmod, compadd, compsub, compmul, compNdiv, compNmul,
        compPointsEquals, strCompPt, strComplex,
        ecipoints, ecihasPoint, eciAdd, eciline2P, ecilinePplusQ } from "./i-toys"

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



