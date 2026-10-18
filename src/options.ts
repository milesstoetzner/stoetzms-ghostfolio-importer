/**
 * Options of the transform command, as parsed by commander.
 */
export type TransformOptions = InputOptions &
    OutputOptions & {
        /** Keep running and repeat the transform whenever the input directory changes. */
        watch?: boolean
        /** Milliseconds to wait after the last change before running again. */
        watchDebounce?: number
    }

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
    /** With the endpoint format: only create activities that are not in Ghostfolio yet. */
    sync?: boolean
    /** With --sync: also delete activities the importer created earlier that are no longer in the inputs. */
    prune?: boolean
}
