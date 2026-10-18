/**
 * Options of the transform command, as parsed by commander.
 */
export type TransformOptions = InputOptions & OutputOptions

export type InputOptions = {
    inputDir: string
    inputFile?: string
    inputFilter?: string
    inputProvider: string
    inputFormat: string
    ignoreErrors?: boolean
}

export type OutputOptions = {
    outputProvider: string
    outputFormat: string
    outputFile?: string
    ghostfolioAccountId?: string
    ghostfolioMap?: string
    ghostfolioEndpoint?: string
    ghostfolioToken?: string
}
