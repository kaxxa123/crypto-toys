
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