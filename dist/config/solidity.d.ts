export declare const compilers: ({
    version: string;
    settings: {
        optimizer: {
            enabled: boolean;
            runs: number;
            details?: undefined;
        };
        evmVersion?: undefined;
        outputSelection?: undefined;
        viaIR?: undefined;
    };
} | {
    version: string;
    settings: {
        optimizer: {
            enabled: boolean;
            runs: number;
            details?: undefined;
        };
        evmVersion: string;
        outputSelection: {
            "*": {
                "*": string[];
            };
        };
        viaIR?: undefined;
    };
} | {
    version: string;
    settings: {
        optimizer: {
            enabled: boolean;
            runs: number;
            details: {
                yulDetails: {
                    optimizerSteps: string;
                };
            };
        };
        viaIR: boolean;
        evmVersion: string;
        outputSelection: {
            "*": {
                "*": string[];
            };
        };
    };
})[];
export declare const npmFilesToBuild: string[];
//# sourceMappingURL=solidity.d.ts.map