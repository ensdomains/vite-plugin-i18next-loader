import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import type { Plugin } from 'vite'
import { test } from 'vitest'

export interface ThisScope {
  addWatchFile: (id: string) => void
}

// export type LoadFn = Required<Plugin>['load']
/**
 * type UserWithName = WithRequired<User, 'name'>
 *
 * @see https://stackoverflow.com/a/69328045/2363935
 */
export type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] }

export type LoaderPlugin = WithRequired<Plugin, 'load'>

// export type LoadFn = ObjectHook<
//   (
//     this: PluginContext,
//     id: string,
//     options?: {
//       ssr?: boolean
//     },
//   ) => Promise<LoadResult> | LoadResult
// >

// export function esm(templateStrings: TemplateStringsArray, ...substitutions: string[]) {
//   let js = templateStrings.raw[0]
//   for (let i = 0; i < substitutions.length; i++) {
//     js += substitutions[i] + templateStrings.raw[i + 1]
//   }
//   return 'data:text/javascript;base64,' + btoa(js)
// }

export function esm(js: string) {
  return `data:text/javascript;base64,${btoa(js)}`
}

interface TmpDirFixture {
  tmpdir: string
}

async function createTempDir() {
  const ostmpdir = os.tmpdir()
  const tmpdir = path.join(ostmpdir, 'vite-plugin-i18next-loader-test-')
  return await fs.mkdtemp(tmpdir)
}

export const tmpdirTest = test.extend<TmpDirFixture>({
  // biome-ignore lint/correctness/noEmptyPattern: Required by vitest: The first argument inside a fixture must use object destructuring pattern
  tmpdir: async ({}, use) => {
    const directory = await createTempDir()

    await use(directory)

    await fs.rm(directory, { recursive: true })
  },
})
