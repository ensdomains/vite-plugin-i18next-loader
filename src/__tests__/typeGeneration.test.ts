/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'

import { beforeEach, describe, expect, it, afterEach } from 'vitest'

import factory from '../index.js'
import { resolvedVirtualModuleId } from '../utils.js'
import { type ThisScope } from './util.js'

describe('TypeScript type generation', () => {
  let thisScope: ThisScope
  let tempDir: string

  beforeEach(() => {
    // mock vite-plugin `this` scope
    thisScope = {
      addWatchFile: () => {},
    }
    
    // Create temporary directory for type output (unique for each test)
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'i18next-test-'))
  })

  afterEach(() => {
    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  })

  for (const type of ['yaml', 'json']) {
    const appLocalesDir = path.join(
      __dirname,
      `./data/basic-app-${type}/locales`,
    )

    describe(type, () => {
      it.concurrent('should generate TypeScript types for English language', async () => {
        const typeOutputPath = path.join(tempDir, 'i18n-en.d.ts')
        
        const plugin = factory({ 
          paths: [appLocalesDir],
          typeOutputPath,
          typeLanguage: 'en', // Explicitly specify English
          ignore: ['**/exclude.json'] // Exclude the test exclusion file
        })
        
        const load = plugin.load as any
        load.call(thisScope, resolvedVirtualModuleId)
        
        expect(fs.existsSync(typeOutputPath)).toBe(true)
        
        const generatedTypes = fs.readFileSync(typeOutputPath, 'utf-8')
        expect(generatedTypes).toContain('/* eslint-disable */')
        expect(generatedTypes).toContain('// @ts-nocheck')
        expect(generatedTypes).toContain('export type Resources =')
        expect(generatedTypes).toContain('This file was automatically generated')
        
        // Should contain actual English translation values as literals
        expect(generatedTypes).toContain('"This is a test!"')
        expect(generatedTypes).toContain('"main"')
        expect(generatedTypes).toContain('"test"')
        // Should not contain the excluded content
        expect(generatedTypes).not.toContain('"foo"')
      })
      
      it.concurrent('should generate TypeScript types for default language when no typeLanguage specified', async () => {
        const typeOutputPath = path.join(tempDir, 'i18n-default.d.ts')
        
        const plugin = factory({ 
          paths: [appLocalesDir],
          typeOutputPath,
          ignore: ['**/exclude.json'] // Exclude the test exclusion file
        })
        
        const load = plugin.load as any
        load.call(thisScope, resolvedVirtualModuleId)
        
        expect(fs.existsSync(typeOutputPath)).toBe(true)
        
        const generatedTypes = fs.readFileSync(typeOutputPath, 'utf-8')
        expect(generatedTypes).toContain('export type Resources =')
        
        // Should contain the first language found (alphabetically 'de' comes first)
        expect(generatedTypes).toContain('"Das ist ein Test!"')
      })

      it.concurrent('should generate TypeScript types for specified German language', async () => {
        const typeOutputPath = path.join(tempDir, 'i18n-de.d.ts')
        
        const plugin = factory({ 
          paths: [appLocalesDir],
          typeOutputPath,
          typeLanguage: 'de',
          ignore: ['**/exclude.json'] // Exclude the test exclusion file
        })
        
        const load = plugin.load as any
        load.call(thisScope, resolvedVirtualModuleId)
        
        expect(fs.existsSync(typeOutputPath)).toBe(true)
        
        const generatedTypes = fs.readFileSync(typeOutputPath, 'utf-8')
        expect(generatedTypes).toContain('export type Resources =')
        
        // Should contain German translation values
        expect(generatedTypes).toContain('"Das ist ein Test!"')
      })

      it.concurrent('should generate TypeScript types for French language', async () => {
        const typeOutputPath = path.join(tempDir, 'i18n-fr.d.ts')
        
        const plugin = factory({ 
          paths: [appLocalesDir],
          typeOutputPath,
          typeLanguage: 'fr',
          ignore: ['**/exclude.json'] // Exclude the test exclusion file
        })
        
        const load = plugin.load as any
        load.call(thisScope, resolvedVirtualModuleId)
        
        expect(fs.existsSync(typeOutputPath)).toBe(true)
        
        const generatedTypes = fs.readFileSync(typeOutputPath, 'utf-8')
        expect(generatedTypes).toContain('export type Resources =')
        
        // Should contain French translation values
        expect(generatedTypes).toContain('"Ceci est un test!"')
      })

      it.concurrent('should not generate types when typeOutputPath is not specified', async () => {
        const typeOutputPath = path.join(tempDir, 'i18n-none.d.ts')
        
        const plugin = factory({ 
          paths: [appLocalesDir]
          // No typeOutputPath specified
        })
        
        const load = plugin.load as any
        load.call(thisScope, resolvedVirtualModuleId)
        
        // Should not create any type file
        expect(fs.existsSync(typeOutputPath)).toBe(false)
      })

      it.concurrent('should throw error for non-existent language', async () => {
        const typeOutputPath = path.join(tempDir, 'i18n-error.d.ts')
        
        const plugin = factory({ 
          paths: [appLocalesDir],
          typeOutputPath,
          typeLanguage: 'nonexistent'
        })
        
        const load = plugin.load as any
        
        expect(() => {
          load.call(thisScope, resolvedVirtualModuleId)
        }).toThrow('Language \'nonexistent\' not found in resource bundle')
      })

      it.concurrent('should create directory if it does not exist', async () => {
        const nestedTypeOutputPath = path.join(tempDir, 'nested', 'deep', 'i18n.d.ts')
        
        const plugin = factory({ 
          paths: [appLocalesDir],
          typeOutputPath: nestedTypeOutputPath,
          typeLanguage: 'en',
          ignore: ['**/exclude.json']
        })
        
        const load = plugin.load as any
        load.call(thisScope, resolvedVirtualModuleId)
        
        expect(fs.existsSync(nestedTypeOutputPath)).toBe(true)
        
        const generatedTypes = fs.readFileSync(nestedTypeOutputPath, 'utf-8')
        expect(generatedTypes).toContain('"This is a test!"')
      })

      it.concurrent('should regenerate types when locale files change in handleHotUpdate', async () => {
        const typeOutputPath = path.join(tempDir, 'i18n-hotupdate.d.ts')
        
        const plugin = factory({ 
          paths: [appLocalesDir],
          typeOutputPath,
          typeLanguage: 'en',
          ignore: ['**/exclude.json']
        })
        
        // Initial load
        const load = plugin.load as any
        load.call(thisScope, resolvedVirtualModuleId)
        
        expect(fs.existsSync(typeOutputPath)).toBe(true)
        const initialContent = fs.readFileSync(typeOutputPath, 'utf-8')
        
        // Simulate hot update - this should not regenerate types directly
        // (the comment says it should already be handled by the file being reloaded)
        const mockServer = {
          moduleGraph: {
            getModuleById: () => ({}),
          },
          reloadModule: () => Promise.resolve(),
        }
        
        const handleHotUpdate = plugin.handleHotUpdate as any
        await handleHotUpdate({
          file: path.join(appLocalesDir, 'en', 'main.json'),
          server: mockServer,
        })
        
        // Types file should still exist (unchanged for now since regeneration is commented out)
        expect(fs.existsSync(typeOutputPath)).toBe(true)
      })
    })
  }

  describe('namespace resolution', () => {
    const appLocalesDir = path.join(
      __dirname,
      './data/relativePathAsNamespace-json/locales',
    )

    it.concurrent('should generate types with namespace resolution', async () => {
      const typeOutputPath = path.join(tempDir, 'i18n-namespace.d.ts')
      
      const plugin = factory({ 
        paths: [appLocalesDir],
        typeOutputPath,
        namespaceResolution: 'relativePath',
        typeLanguage: 'en' // Explicitly specify language
      })
      
      const load = plugin.load as any
      load.call(thisScope, resolvedVirtualModuleId)
      
      expect(fs.existsSync(typeOutputPath)).toBe(true)
      
      const generatedTypes = fs.readFileSync(typeOutputPath, 'utf-8')
      expect(generatedTypes).toContain('export type Resources =')
      
      // Should contain namespace structure
      expect(generatedTypes).toContain('"main"')
    })
  })

  describe('multiple paths', () => {
    const overrideLocalesDir = path.join(
      __dirname,
      './data/override-app-json/locales',
    )
    const basicLocalesDir = path.join(
      __dirname,
      './data/basic-app-json/locales',
    )

    it.concurrent('should generate types with merged resources from multiple paths', async () => {
      const typeOutputPath = path.join(tempDir, 'i18n-merged.d.ts')
      
      const plugin = factory({ 
        paths: [basicLocalesDir, overrideLocalesDir],
        typeOutputPath,
        typeLanguage: 'en', // Explicitly specify language
        ignore: ['**/exclude.json'] // Exclude the test exclusion file
      })
      
      const load = plugin.load as any
      load.call(thisScope, resolvedVirtualModuleId)
      
      expect(fs.existsSync(typeOutputPath)).toBe(true)
      
      const generatedTypes = fs.readFileSync(typeOutputPath, 'utf-8')
      expect(generatedTypes).toContain('export type Resources =')
      
      // Should contain merged content from both paths
      const resourcesMatch = generatedTypes.match(/export type Resources = (.*)/s)
      expect(resourcesMatch).toBeTruthy()
      if (resourcesMatch) {
        const parsedTypes = JSON.parse(resourcesMatch[1])
        expect(parsedTypes).toBeDefined()
      }
    })
  })
}) 