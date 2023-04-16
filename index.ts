import * as TOYS from "./toys"
import * as yargs from 'yargs'

yargs.version("1.1.0")

yargs.command({
    command: "isGenerator",
    describe: "Check if alpha is a generator for group over fieldN",
    builder: {
        alpha: {
            describe: "generator",
            demandOption: true,
            type: "number"
        },
        fieldN: {
            describe: "N defining the (mod N) arithmetic",
            demandOption: true,
            type: "number"
        }
    },
    handler: function (argv: any) {
        TOYS.isGenerator(argv.alpha, argv.fieldN, true)
    }
});

yargs.command({
    command: "getGenerators",
    describe: "Get all generators for group over fieldN",
    builder: {
        fieldN: {
            describe: "N defining the (mod N) arithmetic",
            demandOption: true,
            type: "number"
        }
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
        fieldN: {
            describe: "N defining the (mod N) arithmetic",
            demandOption: true,
            type: "number"
        }
    },
    handler: function (argv: any) {
        TOYS.inverse(argv.value, argv.fieldN, true)    
    }
});

yargs.command({
    command: "groupInverses",
    describe: "Check if all values [1,N-1] have an inverse satisfying Group properties",
    builder: {
        fieldN: {
            describe: "N defining the (mod N) arithmetic",
            demandOption: true,
            type: "number"
        }
    },
    handler: function (argv: any) {
        TOYS.groupInverses(argv.fieldN, true)    
    }
});

yargs.command({
    command: "ecpoints",
    describe: "Find all points for the given EC: y**2  = (x**3 + coeffA*x + coeffB) (% fieldN)",
    builder: {
        fieldN: {
            describe: "N defining the (mod N) arithmetic",
            demandOption: true,
            type: "number"
        },
        coeffA: {
            describe: "Elliptic Curve A coefficient",
            demandOption: true,
            type: "number"
        },
        coeffB: {
            describe: "Elliptic Curve B coefficient",
            demandOption: true,
            type: "number"
        }

    },
    handler: function (argv: any) {
        TOYS.findpoints(argv.fieldN, argv.coeffA, argv.coeffB, true)   
    }
});

yargs.command({
    command: "ec2p",
    describe: "EC point doubling",
    builder: {
        fieldN: {
            describe: "N defining the (mod N) arithmetic",
            demandOption: true,
            type: "number"
        },
        coeffA: {
            describe: "Elliptic Curve A coefficient",
            demandOption: true,
            type: "number"
        },
        xpt: {
            describe: "point x coordinate",
            demandOption: true,
            type: "number"
        },
        ypt: {
            describe: "point y coordinate",
            demandOption: true,
            type: "number"
        }
    },
    handler: function (argv: any) {
        TOYS.ec2P(argv.fieldN, argv.coeffA, [argv.xpt, argv.ypt], true)   
    }
});

yargs.command({
    command: "ecadd",
    describe: "EC point addition",
    builder: {
        fieldN: {
            describe: "N defining the (mod N) arithmetic",
            demandOption: true,
            type: "number"
        },
        coeffA: {
            describe: "Elliptic Curve A coefficient",
            demandOption: true,
            type: "number"
        },
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
        fieldN: {
            describe: "N defining the (mod N) arithmetic",
            demandOption: true,
            type: "number"
        },
        coeffA: {
            describe: "Elliptic Curve A coefficient",
            demandOption: true,
            type: "number"
        },
        multiplier: {
            describe: "point multiplier (m) in m*P",
            demandOption: true,
            type: "number"
        },
        xpt: {
            describe: "point x coordinate",
            demandOption: true,
            type: "number"
        },
        ypt: {
            describe: "point y coordinate",
            demandOption: true,
            type: "number"
        }
    },
    handler: function (argv: any) {
        TOYS.ecMultiply(argv.fieldN, argv.coeffA, argv.multiplier, [argv.xpt, argv.ypt], true)   
    }
});

try {
    yargs.parse();
}
catch (err) {
    console.log(err)
}
