import * as TOYS from "./toys"
import * as yargs from 'yargs'

yargs.version("1.1.0")

//Define common yargs parameters that are used in multiple commands
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

yargs.command({
    command: "isGenerator",
    describe: "Check if alpha is a generator for group over fieldN",
    builder: {
        alpha: {
            describe: "generator",
            demandOption: true,
            type: "number"
        },
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
        aValue: {
            describe: "value a",
            demandOption: true,
            type: "number"
        },
        bValue: {
            describe: "value b",
            demandOption: true,
            type: "number"
        }
    },
    handler: function (argv: any) {
        console.log(`gcd(${argv.aValue}, ${argv.bValue}) = ${TOYS.gcd(argv.aValue, argv.bValue)}`)
    }
});

yargs.command({
    command: "inverse",
    describe: "Get inverse for value (mod fieldN)",
    builder: {
        value: {
            describe: "value to be inverted",
            demandOption: true,
            type: "number"
        },
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
    describe: "Find all points for the given EC: y**2  = (x**3 + coeffA*x + coeffB) (% fieldN)",
    builder: {
        fieldN: fieldNOption,
        coeffA: coeffAOption,
        coeffB: coeffBOption,
    },
    handler: function (argv: any) {
        let pts = TOYS.ecpoints(argv.fieldN, argv.coeffA, argv.coeffB, true)   
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
        TOYS.ec2P(argv.fieldN, argv.coeffA, [argv.xpt, argv.ypt], true)   
    }
});

yargs.command({
    command: "ecadd",
    describe: "EC point addition",
    builder: {
        fieldN: fieldNOption,
        coeffA: coeffAOption,
        xPpt: {
            describe: "point P x coordinate",
            demandOption: true,
            type: "number"
        },
        yPpt: {
            describe: "point P y coordinate",
            demandOption: true,
            type: "number"
        },
        xQpt: {
            describe: "point Q x coordinate",
            demandOption: true,
            type: "number"
        },
        yQpt: {
            describe: "point Q y coordinate",
            demandOption: true,
            type: "number"
        }        
    },
    handler: function (argv: any) {
        TOYS.ecAdd(argv.fieldN, argv.coeffA, [argv.xPpt, argv.yPpt], [argv.xQpt, argv.yQpt], true)   
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
        multiplier: {
            describe: "point multiplier (m) in m*P",
            demandOption: true,
            type: "number"
        }
    },
    handler: function (argv: any) {
        TOYS.ecMultiply(argv.fieldN, argv.coeffA, argv.multiplier, [argv.xpt, argv.ypt], true)   
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
        TOYS.ecInverse(argv.fieldN, [argv.xpt, argv.ypt], true)   
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
        const cycle = TOYS.ecCycle(argv.fieldN, argv.coeffA, argv.coeffB, [argv.xpt, argv.ypt], false)
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
        const cycles = TOYS.ecUniqueCycles(argv.fieldN, argv.coeffA, argv.coeffB, false)   
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
        const cycle = TOYS.ecCnxCm(argv.fieldN, argv.coeffA, argv.coeffB, argv.cn, argv.cm, false)   
        TOYS.ecShowCycles([cycle])

        console.log()
        let points = TOYS.ecpoints(argv.fieldN, argv.coeffA, argv.coeffB)
        if (TOYS.compareSets(points, cycle, false))
                console.log(`C[${argv.cn}] * C[${argv.cm}] produces same points as EC group`)
        else    console.log(`C[${argv.cn}] * C[${argv.cm}] DOES NOT produce same points as EC group`)
    }
});

try {
    yargs.parse();
}
catch (err) {
    console.log(err)
}
