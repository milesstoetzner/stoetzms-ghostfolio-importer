import fs from 'node:fs'
import path from 'node:path'

export const FIXTURES = path.join(import.meta.dirname, 'fixtures')

export function fixture(provider: string, name: string, extension = 'txt'): string {
    return fs.readFileSync(path.join(FIXTURES, provider, name + '.' + extension), 'utf-8')
}
