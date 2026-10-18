/**
 * Renders the synthetic text fixtures in tests/fixtures as PDFs into examples/inputs, one document per
 * fixture, one text line per PDF line. The result extracts back to exactly the fixture text, so the
 * example PDFs can be fed to the CLI during development and are checked against the fixtures by the
 * tests. JSON fixtures are copied as they are.
 *
 *   yarn examples:generate
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import {PDFDocument, StandardFonts} from 'pdf-lib'

const ROOT = path.join(import.meta.dirname, '..')
const FIXTURES = path.join(ROOT, 'tests', 'fixtures')
const EXAMPLES = path.join(ROOT, 'examples', 'inputs')

async function render(text: string): Promise<Uint8Array> {
    const pdf = await PDFDocument.create()
    // Fixed metadata keeps the output byte-identical between runs.
    pdf.setCreationDate(new Date(0))
    pdf.setModificationDate(new Date(0))
    pdf.setProducer('ghostfolio-importer examples')
    pdf.setCreator('ghostfolio-importer examples')

    const font = await pdf.embedFont(StandardFonts.Helvetica)
    const page = pdf.addPage([595, 842])
    const size = 10
    const lineHeight = 14
    let y = 800
    for (const line of text.split('\n')) {
        if (line !== '') page.drawText(line, {x: 50, y, size, font})
        y -= lineHeight
    }
    return pdf.save({useObjectStreams: false})
}

async function main() {
    for (const provider of await fs.readdir(FIXTURES, {withFileTypes: true})) {
        if (!provider.isDirectory()) continue
        const source = path.join(FIXTURES, provider.name)
        const target = path.join(EXAMPLES, provider.name)
        await fs.mkdir(target, {recursive: true})
        for (const fixture of (await fs.readdir(source)).sort()) {
            const text = (await fs.readFile(path.join(source, fixture), 'utf-8')).trimEnd()
            let file: string
            if (fixture.endsWith('.txt')) {
                file = path.join(target, fixture.replace(/\.txt$/, '.pdf'))
                await fs.writeFile(file, await render(text))
            } else if (fixture.endsWith('.json')) {
                file = path.join(target, fixture)
                await fs.writeFile(file, text + '\n')
            } else continue
            console.log(path.relative(ROOT, file))
        }
    }
}

await main()
