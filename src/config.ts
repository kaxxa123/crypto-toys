
const iSQRDEF = -1;

export interface ECurve {
    fieldN: number;
    coeffA?: number;
    coeffB?: number;
    rorder?: number;
    iSQR?: number;
}

interface ECurveDef {
    fieldN: number;
    coeffA: number;
    coeffB: number;
    rorder: number;
    iSQR: number;
}

export enum ReqEC {
    N,      // require fieldN
    NA,     // require fieldN, coeffA
    NAB,    // require fieldN, coeffA, coeffB
    NABR,   // require fieldN, coeffA, coeffB, rorder
}

// Pedersen Commitment EC points G and H where
// E = s.G + t.H
export interface PCommit {
    ptG: number[][],
    ptH: number[][]
}

// Pedersen VSS Setup Params
export interface PVSS { 
    partyShares: Map<number, number[]>, 
    commitments: number[][][] 
}

// Pedersen MPC - 1 Party Setup
export interface PMPCParty { 
    id: number,
    secret: number,
    vss: PVSS
}

// Pedersen MPC - Info recevied by 1 party for other parties
export interface PMPCPartyShares { 
    id: number,                     // Party Id
    shares: number[][],             // Shares received from other Parties
    commitSets: number[][][][]      // Commitments received from other Parties
}

// Pedersen MPC - Aggregated info recevied by 1 party for other parties
export interface PMPCPartyAggr { 
    id: number,                    // Party Id
    share: number[],               // Aggregated secret share
    commitments: number[][][]      // Aggregated commitments
}

export function unpackEC(ec: ECurve, req: ReqEC): ECurveDef {

    if ((req > ReqEC.N) && (ec.coeffA === undefined))
        throw 'coeffA required'

    if ((req > ReqEC.NA) && (ec.coeffB === undefined))
        throw 'coeffB required'

    if ((req > ReqEC.NAB) && (ec.rorder === undefined))
        throw 'rorder required'

    return {
        fieldN: ec.fieldN,
        coeffA: ec.coeffA ?? 0,
        coeffB: ec.coeffB ?? 0,
        rorder: ec.rorder ?? 0,
        iSQR:   ec.iSQR ?? iSQRDEF
    }
}