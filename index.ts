import * as TOYS from "./toys"
import * as ITOYS from "./i-toys"
import * as PAIR from "./pairings"
import * as yargs from 'yargs'

yargs.version("1.1.0")

//Define common yargs parameters that are used in multiple commands
const valueOption: yargs.Options = {
    describe: "computation input value",
    demandOption: true,
    type: "number"
}

const fieldNOption: yargs.Options = {
    describe: "N defining the (mod N) arithmetic",
    demandOption: true,
    type: "number"
}

const coeffAOption: yargs.Options = {
    describe: "Elliptic Curve A coefficient",
    demandOption: true,
    type: "number"
}

const coeffBOption: yargs.Options = {
    describe: "Elliptic Curve B coefficient",
    demandOption: true,
    type: "number"
}

const xptOption: yargs.Options = {
    describe: "point x coordinate",
    demandOption: true,
    type: "number"
}

const yptOption: yargs.Options = {
    describe: "point y coordinate",
    demandOption: true,
    type: "number"
}

const multiplierOption: yargs.Options = {
    describe: "point multiplier (m) in m*P",
    demandOption: true,
    type: "number"
}

const comp_aOption: yargs.Options = {
    describe: "real component a, in a + bi",
    demandOption: true,
    type: "number"
}

const comp_bOption: yargs.Options = {
    describe: "imaginary component b, in a + bi",
    demandOption: true,
    type: "number"
}

const rorderOption: yargs.Options = {
    describe: "r-torsion order",
    demandOption: true,
    type: "number"
}

const isqrOption: yargs.Options = {
    describe: "extension field i^2 value",
    demandOption: false,
    type: "number",
    default: -1
}

yargs.command({
    command: "isPrime",
    describe: "Check if value is a prime number",
    builder: {
        value: valueOption
    },
    handler: function (argv: any) {
        let res = TOYS.isPrime(argv.value) ? "IS" : "IS NOT"
        console.log(`${argv.value} ${res} prime`)
    }
});

yargs.command({
    command: "isGenerator",
    describe: "Check if alpha is a generator for group over fieldN",
    builder: {
        alpha: valueOption,
        fieldN: fieldNOption
    },
    handler: function (argv: any) {
        TOYS.isGenerator(argv.fieldN, argv.alpha, true)
    }
});

yargs.command({
    command: "getGenerators",
    describe: "Get all generators for group over fieldN",
    builder: {
        fieldN: fieldNOption
    },
    handler: function (argv: any) {
        TOYS.getGenerators(argv.fieldN, true)
    }
});

yargs.command({
    command: "gcd",
    describe: "Get Greatest Common Divisor: gcd(aValue,bValue)",
    builder: {
        aValue: valueOption,
        bValue: valueOption
    },
    handler: function (argv: any) {
        console.log(`gcd(${argv.aValue}, ${argv.bValue}) = ${TOYS.gcd(argv.aValue, argv.bValue)}`)
    }
});

yargs.command({
    command: "inverse",
    describe: "Get inverse for value (mod fieldN)",
    builder: {
        value: valueOption,
        fieldN: fieldNOption
    },
    handler: function (argv: any) {
        TOYS.inverse(argv.fieldN, argv.value, true)    
    }
});

yargs.command({
    command: "groupInverses",
    describe: "Check if all values [1,N-1] have an inverse satisfying Group properties",
    builder: {
        fieldN: fieldNOption
    },
    handler: function (argv: any) {
        TOYS.groupInverses(argv.fieldN, true)    
    }
});

yargs.command({
    command: "ecpoints",
    describe: "Find all points for the given EC/Fq: y**2  = (x**3 + coeffA*x + coeffB) (% fieldN)",
    builder: {
        fieldN: fieldNOption,
        coeffA: coeffAOption,
        coeffB: coeffBOption,
    },
    handler: function (argv: any) {
        let pts = TOYS.ecpoints({
                            fieldN: argv.fieldN, 
                            coeffA: argv.coeffA, 
                            coeffB: argv.coeffB}) 

        TOYS.ecShowPoints(pts)
        console.log()
        console.log(`#E/F${argv.fieldN} = ${pts.length}`)
    }
});

yargs.command({
    command: "ec2p",
    describe: "EC point doubling",
    builder: {
        fieldN: fieldNOption,
        coeffA: coeffAOption,
        xpt: xptOption,
        ypt: yptOption
    },
    handler: function (argv: any) {
        TOYS.ec2P({
            fieldN: argv.fieldN, 
            coeffA: argv.coeffA}, 
            [argv.xpt, argv.ypt], true)   
    }
});

yargs.command({
    command: "ecadd",
    describe: "EC point addition",
    builder: {
        fieldN: fieldNOption,
        coeffA: coeffAOption,
        xPpt: xptOption,
        yPpt: yptOption,
        xQpt: xptOption,
        yQpt: yptOption
    },
    handler: function (argv: any) {
        TOYS.ecAdd({
                fieldN: argv.fieldN, 
                coeffA: argv.coeffA}, 
                [argv.xPpt, argv.yPpt], 
                [argv.xQpt, argv.yQpt], true)   
    }
});

yargs.command({
    command: "ecmultiply",
    describe: "EC point multiplication",
    builder: {
        fieldN: fieldNOption,
        coeffA: coeffAOption,
        xpt: xptOption,
        ypt: yptOption,
        multiplier: multiplierOption
    },
    handler: function (argv: any) {
        TOYS.ecMultiply({
                    fieldN: argv.fieldN, 
                    coeffA: argv.coeffA}, 
                    argv.multiplier, 
                    [argv.xpt, argv.ypt], true)   
    }
});

yargs.command({
    command: "ecinverse",
    describe: "EC point inversion",
    builder: {
        fieldN: fieldNOption,
        xpt: xptOption,
        ypt: yptOption,
    },
    handler: function (argv: any) {
        TOYS.ecInverse({fieldN: argv.fieldN}, [argv.xpt, argv.ypt], true)   
    }
});

yargs.command({
    command: "eccycle",
    describe: "EC cycle for given point",
    builder: {
        fieldN: fieldNOption,
        coeffA: coeffAOption,
        coeffB: coeffBOption,
        xpt: xptOption,
        ypt: yptOption,
    },
    handler: function (argv: any) {
        const cycle = TOYS.ecCycle({
                            fieldN: argv.fieldN, 
                            coeffA: argv.coeffA, 
                            coeffB: argv.coeffB}, 
                            [argv.xpt, argv.ypt], false)

        TOYS.ecShowCycles([cycle])
    }
});

yargs.command({
    command: "ecgetcycles",
    describe: "EC get cycle for each point",
    builder: {
        fieldN: fieldNOption,
        coeffA: coeffAOption,
        coeffB: coeffBOption,
    },
    handler: function (argv: any) {
        const cycles = TOYS.ecUniqueCycles({
                                    fieldN: argv.fieldN, 
                                    coeffA: argv.coeffA, 
                                    coeffB: argv.coeffB}, false)   
        TOYS.ecShowCycles(cycles)
    }
});

yargs.command({
    command: "eccycleproduct",
    describe: "EC cycle product Cn * Cm",
    builder: {
        fieldN: fieldNOption,
        coeffA: coeffAOption,
        coeffB: coeffBOption,
        cn: {
            describe: "Index of Cn cycle as returned by ecgetcycles",
            demandOption: true,
            type: "number"
        },
        cm: {
            describe: "Index of Cm cycle as returned by ecgetcycles",
            demandOption: true,
            type: "number"
        }
    },
    handler: function (argv: any) {
        const cycle = TOYS.ecCnxCm({
                            fieldN: argv.fieldN, 
                            coeffA: argv.coeffA, 
                            coeffB: argv.coeffB}, 
                            argv.cn, argv.cm, false)   
        TOYS.ecShowPoints(cycle)

        console.log()
        let pts = TOYS.ecpoints({
                            fieldN: argv.fieldN, 
                            coeffA: argv.coeffA, 
                            coeffB: argv.coeffB}) 

        if (TOYS.setCompare(pts, cycle, false))
                console.log(`C[${argv.cn}] * C[${argv.cm}] produces same points as EC group`)
        else    console.log(`C[${argv.cn}] * C[${argv.cm}] DOES NOT produce same points as EC group`)
    }
});

yargs.command({
    command: "ectorsion",
    describe: "EC get all order r points (r-torsion)",
    builder: {
        fieldN: fieldNOption,
        coeffA: coeffAOption,
        coeffB: coeffBOption,
        rorder: rorderOption
    },
    handler: function (argv: any) {
        const cycle = TOYS.ecTorsion({
                            fieldN: argv.fieldN, 
                            coeffA: argv.coeffA, 
                            coeffB: argv.coeffB, 
                            rorder: argv.rorder}, false)   
                            
        TOYS.ecShowPoints(cycle)
    }
});

yargs.command({
    command: "ecipoints",
    describe: "Find all points for the given EC/Fq^2: y**2  = (x**3 + coeffA*x + coeffB) (% fieldN)",
    builder: {
        fieldN: fieldNOption,
        coeffA: coeffAOption,
        coeffB: coeffBOption,
        isqr: isqrOption
    },
    handler: function (argv: any) {
        let pts = ITOYS.ecipoints({
                            fieldN: argv.fieldN, 
                            coeffA: argv.coeffA, 
                            coeffB: argv.coeffB,
                            iSQR:   argv.isqr}, false)   

        ITOYS.eciShowPoints(pts)
        console.log()
        console.log(`#E/F${argv.fieldN}^2 = ${pts.length}`)
    }
});

yargs.command({
    command: "eci2p",
    describe: "EC point doubling over Fq^2",
    builder: {
        fieldN: fieldNOption,
        coeffA: coeffAOption,
        xPpt_real: comp_aOption,
        xPpt_imag: comp_bOption,
        yPpt_real: comp_aOption,
        yPpt_imag: comp_bOption,
        isqr: isqrOption,
    },
    handler: function (argv: any) {
        ITOYS.eci2P({
                fieldN: argv.fieldN, 
                coeffA: argv.coeffA,
                iSQR:   argv.isqr}, 
                [[argv.xPpt_real,argv.xPpt_imag],[argv.yPpt_real, argv.yPpt_imag]], true)   
    }
});

yargs.command({
    command: "eciadd",
    describe: "EC point addition over Fq^2",
    builder: {
        fieldN: fieldNOption,
        coeffA: coeffAOption,
        xPpt_real: comp_aOption,
        xPpt_imag: comp_bOption,
        yPpt_real: comp_aOption,
        yPpt_imag: comp_bOption,
        xQpt_real: comp_aOption,
        xQpt_imag: comp_bOption,
        yQpt_real: comp_aOption,
        yQpt_imag: comp_bOption,
        isqr: isqrOption,
    },
    handler: function (argv: any) {
        ITOYS.eciAdd({
                fieldN: argv.fieldN, 
                coeffA: argv.coeffA,
                iSQR:   argv.isqr}, 
                [[argv.xPpt_real,argv.xPpt_imag],[argv.yPpt_real, argv.yPpt_imag]], 
                [[argv.xQpt_real,argv.xQpt_imag],[argv.yQpt_real, argv.yQpt_imag]], true)   
    }
});

yargs.command({
    command: "ecimultiply",
    describe: "EC point multiplication  over Fq^2",
    builder: {
        fieldN: fieldNOption,
        coeffA: coeffAOption,
        xPpt_real: comp_aOption,
        xPpt_imag: comp_bOption,
        yPpt_real: comp_aOption,
        yPpt_imag: comp_bOption,
        multiplier: multiplierOption,
        isqr: isqrOption,
    },
    handler: function (argv: any) {
        ITOYS.eciMultiply({
                fieldN: argv.fieldN, 
                coeffA: argv.coeffA,
                iSQR:   argv.isqr}, 
                argv.multiplier, 
                [[argv.xPpt_real,argv.xPpt_imag],[argv.yPpt_real, argv.yPpt_imag]], true)   
    }
});

yargs.command({
    command: "eciinverse",
    describe: "EC point inversion over Fq^2",
    builder: {
        fieldN: fieldNOption,
        xPpt_real: comp_aOption,
        xPpt_imag: comp_bOption,
        yPpt_real: comp_aOption,
        yPpt_imag: comp_bOption,
        isqr: isqrOption,
    },
    handler: function (argv: any) {
        ITOYS.eciInverse(
                    {fieldN: argv.fieldN, iSQR: argv.isqr}, 
                    [[argv.xPpt_real,argv.xPpt_imag],[argv.yPpt_real, argv.yPpt_imag]], true)   
    }
});

yargs.command({
    command: "ecicycle",
    describe: "EC cycle for given point over Fq^2",
    builder: {
        fieldN: fieldNOption,
        coeffA: coeffAOption,
        coeffB: coeffBOption,
        xPpt_real: comp_aOption,
        xPpt_imag: comp_bOption,
        yPpt_real: comp_aOption,
        yPpt_imag: comp_bOption,
        isqr: isqrOption,
    },
    handler: function (argv: any) {
        const cycle = ITOYS.eciCycle({
                                fieldN: argv.fieldN, 
                                coeffA: argv.coeffA, 
                                coeffB: argv.coeffB,
                                iSQR:   argv.isqr}, 
                                [[argv.xPpt_real,argv.xPpt_imag],[argv.yPpt_real, argv.yPpt_imag]], false)
        ITOYS.eciShowCycles([cycle])
    }
});

yargs.command({
    command: "ecigetcycles",
    describe: "EC get cycle for each point over Fq^2",
    builder: {
        fieldN: fieldNOption,
        coeffA: coeffAOption,
        coeffB: coeffBOption,
        isqr: isqrOption,
    },
    handler: function (argv: any) {
        const cycles = ITOYS.eciUniqueCycles({
                                fieldN: argv.fieldN, 
                                coeffA: argv.coeffA, 
                                coeffB: argv.coeffB,
                                iSQR:   argv.isqr}, false)   
        ITOYS.eciShowCycles(cycles)
    }
});

yargs.command({
    command: "ecitorsion",
    describe: "EC get all order r points (r-torsion) over Fq^2",
    builder: {
        fieldN: fieldNOption,
        coeffA: coeffAOption,
        coeffB: coeffBOption,
        rorder: rorderOption,
        isqr: isqrOption,
    },
    handler: function (argv: any) {
        const cycle = ITOYS.eciTorsion({
                                fieldN: argv.fieldN, 
                                coeffA: argv.coeffA, 
                                coeffB: argv.coeffB, 
                                rorder: argv.rorder,
                                iSQR:   argv.isqr}, false)   
        ITOYS.eciShowPoints(cycle)
    }
});

yargs.command({
    command: "eciembeddingdegree",
    describe: "Get the smallest embedding degree k that captures all r-torsion points",
    builder: {
        fieldN: fieldNOption,
        rorder: rorderOption,
        isqr: isqrOption,
    },
    handler: function (argv: any) {
        ITOYS.eciEmbeddingDegree({
                        fieldN: argv.fieldN, 
                        coeffA: 0, 
                        coeffB: 0, 
                        rorder: argv.rorder,
                        iSQR:   argv.isqr}, true)   
    }
});

yargs.command({
    command: "eciFrobenius",
    describe: "Apply the Frobenius Trace Map to all r-torsion points",
    builder: {
        fieldN: fieldNOption,
        coeffA: coeffAOption,
        coeffB: coeffBOption,
        rorder: rorderOption,
        isqr: isqrOption,
    },
    handler: function (argv: any) {
        const ec = {
            fieldN: argv.fieldN, 
            coeffA: argv.coeffA, 
            coeffB: argv.coeffB, 
            rorder: argv.rorder,
            iSQR:   argv.isqr}

        const torPts = ITOYS.eciTorsion(ec, false) 
        const powk = ITOYS.eciEmbeddingDegree(ec, true)   
        ITOYS.eciFrobeniusTrMap( ec, powk, torPts, true)            
    }
});

yargs.command({
    command: "eciAntiFrobenius",
    describe: "Apply the Frobenius Anti Trace Map to all r-torsion points",
    builder: {
        fieldN: fieldNOption,
        coeffA: coeffAOption,
        coeffB: coeffBOption,
        rorder: rorderOption,
        isqr: isqrOption,
    },
    handler: function (argv: any) {
        const ec = {
            fieldN: argv.fieldN, 
            coeffA: argv.coeffA, 
            coeffB: argv.coeffB, 
            rorder: argv.rorder,
            iSQR:   argv.isqr}

        const torPts = ITOYS.eciTorsion(ec, false) 
        const powk = ITOYS.eciEmbeddingDegree(ec, true)   
        ITOYS.eciAntiFrobeniusTrMap( ec, powk, torPts, true)            
    }
});

yargs.command({
    command: "frpParams",
    describe: "Get sequence of lines and verticals for computing the divisor function Frp",
    builder: {
        fieldN: fieldNOption,
        coeffA: coeffAOption,
        coeffB: coeffBOption,
        rorder: rorderOption,
        xPpt_real: comp_aOption,
        xPpt_imag: comp_bOption,
        yPpt_real: comp_aOption,
        yPpt_imag: comp_bOption,
        isqr: isqrOption,
    },
    handler: function (argv: any) {
        const ec = {
            fieldN: argv.fieldN, 
            coeffA: argv.coeffA, 
            coeffB: argv.coeffB, 
            rorder: argv.rorder,
            iSQR:   argv.isqr}

        const ptP =[[argv.xPpt_real,argv.xPpt_imag],[argv.yPpt_real, argv.yPpt_imag]]
        PAIR.getFRPparams(ec, ptP, true)
    }
})

yargs.command({
    command: "weil",
    describe: "Computing the Weil Pairing",
    builder: {
        fieldN: fieldNOption,
        coeffA: coeffAOption,
        coeffB: coeffBOption,
        rorder: rorderOption,
        xPpt_real: comp_aOption,
        xPpt_imag: comp_bOption,
        yPpt_real: comp_aOption,
        yPpt_imag: comp_bOption,
        xQpt_real: comp_aOption,
        xQpt_imag: comp_bOption,
        yQpt_real: comp_aOption,
        yQpt_imag: comp_bOption,
        xRpt_real: comp_aOption,
        xRpt_imag: comp_bOption,
        yRpt_real: comp_aOption,
        yRpt_imag: comp_bOption,
        xSpt_real: comp_aOption,
        xSpt_imag: comp_bOption,
        ySpt_real: comp_aOption,
        ySpt_imag: comp_bOption,
        isqr: isqrOption,
    },
    handler: function (argv: any) {
        const ec = {
            fieldN: argv.fieldN, 
            coeffA: argv.coeffA, 
            coeffB: argv.coeffB, 
            rorder: argv.rorder,
            iSQR:   argv.isqr}

        const ptP = [[argv.xPpt_real,argv.xPpt_imag],[argv.yPpt_real, argv.yPpt_imag]]
        const ptQ = [[argv.xQpt_real,argv.xQpt_imag],[argv.yQpt_real, argv.yQpt_imag]]
        const ptR = [[argv.xRpt_real,argv.xRpt_imag],[argv.yRpt_real, argv.yRpt_imag]]
        const ptS = [[argv.xSpt_real,argv.xSpt_imag],[argv.ySpt_real, argv.ySpt_imag]]
        PAIR.weilPairing(ec, ptP, ptQ, ptR, ptS, true)
    }
})

yargs.command({
    command: "tate",
    describe: "Computing the Tate Pairing",
    builder: {
        fieldN: fieldNOption,
        coeffA: coeffAOption,
        coeffB: coeffBOption,
        rorder: rorderOption,
        xPpt_real: comp_aOption,
        xPpt_imag: comp_bOption,
        yPpt_real: comp_aOption,
        yPpt_imag: comp_bOption,
        xQpt_real: comp_aOption,
        xQpt_imag: comp_bOption,
        yQpt_real: comp_aOption,
        yQpt_imag: comp_bOption,
        xRpt_real: comp_aOption,
        xRpt_imag: comp_bOption,
        yRpt_real: comp_aOption,
        yRpt_imag: comp_bOption,
        isqr: isqrOption,
    },
    handler: function (argv: any) {
        const ec = {
            fieldN: argv.fieldN, 
            coeffA: argv.coeffA, 
            coeffB: argv.coeffB, 
            rorder: argv.rorder,
            iSQR:   argv.isqr}

        const ptP = [[argv.xPpt_real,argv.xPpt_imag],[argv.yPpt_real, argv.yPpt_imag]]
        const ptQ = [[argv.xQpt_real,argv.xQpt_imag],[argv.yQpt_real, argv.yQpt_imag]]
        const ptR = [[argv.xRpt_real,argv.xRpt_imag],[argv.yRpt_real, argv.yRpt_imag]]
        PAIR.tatePairing(ec, ptP, ptQ, ptR, true)
    }
})

try {
    yargs.parse();
}
catch (err) {
    console.log(err)
}
