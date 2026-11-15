import fs from 'node:fs'
import path from 'node:path'
import * as reader from 'pdf-text-reader'

/**
 * Synthetic inputs per provider: broker PDFs and Scalable CLI JSON files. They contain no real data.
 */
export const FIXTURES = path.join(import.meta.dirname, 'fixtures')

export function fixture(provider: string, file: string): string {
    return fs.readFileSync(path.join(FIXTURES, provider, file), 'utf-8')
}

/** The text of a fixture PDF, extracted the same way the PDF input does. */
export function pdfText(provider: string, name: string): Promise<string> {
    return reader.readPdfText({url: path.join(FIXTURES, provider, name + '.pdf')} as reader.ReadPdfTextParams)
}
