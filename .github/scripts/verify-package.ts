import { appendFile, cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { spawn, spawnSync } from 'node:child_process'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { basename, join, resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

interface ExportConditionMap {
  [condition: string]: ExportTarget
}

type ExportTarget = string | ExportConditionMap

interface PackageManifest {
  name: string
  version: string
  repository?: string | { type?: string; url?: string }
  main?: string
  module?: string
  types?: string
  exports: Record<string, ExportTarget>
  peerDependencies: Record<string, string>
  devDependencies: Record<string, string>
}

interface PackedManifest {
  filename: string
}

function runCommand(command: string[], cwd: string): string {
  const [executable, ...args] = command
  if (!executable) {
    throw new Error('Cannot run an empty command')
  }

  const result = spawnSync(executable, args, {
    cwd,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024
  })

  if (result.error) {
    throw result.error
  }

  if (result.status !== 0) {
    const output = [result.stderr.trim(), result.stdout.trim()].filter(Boolean).join('\n')
    throw new Error(`${command.join(' ')} failed${output ? `:\n${output}` : ''}`)
  }

  return result.stdout.trim()
}

function collectExportPaths(value: ExportTarget): string[] {
  if (typeof value === 'string') {
    return [value]
  }

  return Object.values(value).flatMap(collectExportPaths)
}

function normalizeRepositoryUrl(url: string): string {
  return url.trim()
    .replace(/^git\+/i, '')
    .replace(/^git@github\.com:/i, 'https://github.com/')
    .replace(/^ssh:\/\/git@github\.com\//i, 'https://github.com/')
    .replace(/\.git$/i, '')
    .replace(/\/+$/g, '')
    .toLowerCase()
}

function repositoryUrl(manifest: PackageManifest): string {
  if (typeof manifest.repository === 'string') {
    return manifest.repository
  }

  if (manifest.repository?.type !== 'git' || typeof manifest.repository.url !== 'string') {
    throw new Error('Package manifest must declare a GitHub Git repository URL')
  }

  return manifest.repository.url
}

function assertRepositoryMetadata(manifest: PackageManifest, repositoryRoot: string): void {
  const expectedRepository = process.env.GITHUB_REPOSITORY
    ? `https://github.com/${process.env.GITHUB_REPOSITORY}`
    : runCommand(['git', 'remote', 'get-url', 'origin'], repositoryRoot)

  if (normalizeRepositoryUrl(repositoryUrl(manifest)) !== normalizeRepositoryUrl(expectedRepository)) {
    throw new Error(`Package repository URL does not match this repository: ${repositoryUrl(manifest)}`)
  }
}

async function createTarball(repositoryRoot: string, directory: string): Promise<string> {
  const output = runCommand(['npm', 'pack', '--json', '--pack-destination', directory], repositoryRoot)
  const [packed] = JSON.parse(output) as PackedManifest[]

  if (!packed?.filename) {
    throw new Error('npm pack did not return a tarball filename')
  }

  return join(directory, packed.filename)
}

async function verifyTarball(tarball: string, manifest: PackageManifest, repositoryRoot: string): Promise<void> {
  const files = new Set(runCommand(['tar', '-tzf', tarball], repositoryRoot).split('\n'))
  const requiredFiles = [
    'dist/module.mjs',
    'dist/module.cjs',
    'dist/module.d.ts',
    'dist/runtime.mjs',
    'dist/runtime.cjs',
    'dist/runtime.d.ts',
    'dist/runtime/index.js',
    'dist/runtime/index.d.ts',
    'dist/runtime/renderers/default/index.d.ts',
    'dist/runtime/renderers/default/FormForgeRenderer.vue',
    'dist/runtime/renderers/default/FormForgeBuilder.vue',
    'dist/runtime/renderers/default/FormForgeResponse.vue',
    'dist/runtime/renderers/default/FormForgeCategoryCreateModal.vue',
    'dist/runtime/types/generated/statistics.d.ts',
    'dist/runtime/assets/formforge.css'
  ]
  const exportPaths = [manifest.main, manifest.module, manifest.types, ...Object.values(manifest.exports).flatMap(collectExportPaths)]
    .filter((path): path is string => typeof path === 'string' && path.startsWith('./'))
    .map((path) => `package/${path.slice(2)}`)
  const missingFiles = [...new Set([...requiredFiles.map((path) => `package/${path}`), ...exportPaths])]
    .filter((path) => !files.has(path))

  if (missingFiles.length > 0) {
    throw new Error(`Package tarball is missing required files:\n${missingFiles.join('\n')}`)
  }

  const packedManifest = JSON.parse(runCommand(['tar', '-xOf', tarball, 'package/package.json'], repositoryRoot)) as PackageManifest
  if (packedManifest.name !== manifest.name || packedManifest.version !== manifest.version) {
    throw new Error(`Packed manifest mismatch: expected ${manifest.name}@${manifest.version}, received ${packedManifest.name}@${packedManifest.version}`)
  }

  assertRepositoryMetadata(packedManifest, repositoryRoot)

  const componentTypes = runCommand(['tar', '-xOf', tarball, 'package/dist/runtime/renderers/default/index.d.ts'], repositoryRoot)
  for (const component of ['FormForgeRenderer', 'FormForgeBuilder', 'FormForgeResponse', 'FormForgeCategoryCreateModal']) {
    if (!componentTypes.includes(component)) {
      throw new Error(`Package tarball is missing the ${component} component export`)
    }
  }

  const statisticsTypes = runCommand(['tar', '-xOf', tarball, 'package/dist/runtime/types/generated/statistics.d.ts'], repositoryRoot)
  if (!statisticsTypes.includes('FormForgeStatisticsResponse') || !statisticsTypes.includes('FormForgeQuestionStatistics')) {
    throw new Error('Package tarball is missing its public statistics response types')
  }

  const stylesheet = runCommand(['tar', '-xOf', tarball, 'package/dist/runtime/assets/formforge.css'], repositoryRoot)
  const builtStylesheet = await readFile(join(repositoryRoot, 'dist/runtime/assets/formforge.css'), 'utf8')
  if (stylesheet !== builtStylesheet) {
    throw new Error('Package tarball stylesheet differs from the built runtime stylesheet')
  }

  if (!stylesheet.includes('@reference "#build/ui.css";') || !stylesheet.includes('prefix(ff)') || !stylesheet.includes('@custom-variant formforge')) {
    throw new Error('Package stylesheet is missing its host-theme reference or scoped FormForge configuration')
  }

  if (stylesheet.includes('@import "#build/ui.css"') || /(?:^|[\s,{])(?:html|body|:root|:host)(?:[\s,{.#:[>]|$)/m.test(stylesheet)) {
    throw new Error('Package stylesheet contains a global selector or re-imports the host Nuxt UI stylesheet')
  }

  if (stylesheet.includes('prefers-color-scheme') || stylesheet.includes('color-scheme')) {
    throw new Error('Package stylesheet overrides the host color scheme')
  }
}

async function verifyConsumer(tarball: string, manifest: PackageManifest, directory: string, repositoryRoot: string): Promise<void> {
  const fixtureDirectory = join(repositoryRoot, 'test/fixtures/consumer')
  const consumerDirectory = join(directory, 'consumer')
  await cp(fixtureDirectory, consumerDirectory, { recursive: true })

  const consumerManifest = {
    name: 'formforgeclient-consumer-smoke-test',
    private: true,
    type: 'module',
    scripts: {},
    dependencies: {
      '@nuxt/ui': manifest.peerDependencies['@nuxt/ui'],
      [manifest.name]: `file:${tarball}`,
      nuxt: manifest.peerDependencies.nuxt
    },
    devDependencies: {
      typescript: manifest.devDependencies.typescript,
      'vue-tsc': manifest.devDependencies['vue-tsc']
    }
  }

  await writeFile(join(consumerDirectory, 'package.json'), `${JSON.stringify(consumerManifest, null, 2)}\n`)
  runCommand(['bun', 'install'], consumerDirectory)
  runCommand(['bun', 'run', 'nuxt', 'prepare'], consumerDirectory)
  runCommand(['bun', 'run', 'vue-tsc', '--noEmit', '--project', 'tsconfig.json'], consumerDirectory)
  await verifyConsumerRendering(consumerDirectory)
}

async function getAvailablePort(): Promise<number> {
  return await new Promise((resolvePort, reject) => {
    const server = createServer()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (!address || typeof address === 'string') {
        server.close()
        reject(new Error('Could not allocate a port for the Nuxt consumer'))
        return
      }

      server.close((error) => {
        if (error) {
          reject(error)
          return
        }

        resolvePort(address.port)
      })
    })
  })
}

async function fetchNuxtPage(url: string, server: ReturnType<typeof spawn>): Promise<Response> {
  const deadline = Date.now() + 60_000
  let lastError = 'Nuxt did not respond'

  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`Nuxt dev server exited with code ${server.exitCode}`)
    }

    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(10_000) })
      if (response.status !== 503) {
        return response
      }

      lastError = `Nuxt is still starting (HTTP ${response.status})`
      await response.body?.cancel()
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error)
    }

    await delay(500)
  }

  throw new Error(`Nuxt consumer did not respond: ${lastError}`)
}

async function verifyConsumerRendering(consumerDirectory: string): Promise<void> {
  const port = await getAvailablePort()
  const server = spawn('bun', ['run', '--bun', 'nuxt', 'dev', '--host', '127.0.0.1', '--port', String(port)], {
    cwd: consumerDirectory,
    stdio: 'ignore'
  })

  try {
    const response = await fetchNuxtPage(`http://127.0.0.1:${port}/formforge-consumer`, server)
    const html = await response.text()

    if (!response.ok) {
      throw new Error(`Nuxt consumer failed to render FormForge (HTTP ${response.status}):\n${html.slice(0, 2000)}`)
    }

    for (const marker of ['Consumer builder question', 'Consumer renderer question']) {
      if (!html.includes(marker)) {
        throw new Error(`Nuxt consumer response did not render "${marker}":\n${html.slice(-4000)}`)
      }
    }
  } finally {
    if (server.exitCode === null) {
      server.kill()
      await new Promise<void>((resolveExit) => server.once('exit', () => resolveExit()))
    }
  }
}

async function main(): Promise<void> {
  const repositoryRoot = resolve(import.meta.dirname, '../..')
  const manifest = JSON.parse(await readFile(join(repositoryRoot, 'package.json'), 'utf8')) as PackageManifest
  const providedTarball = process.argv[2]
  const directory = await mkdtemp(join(tmpdir(), 'formforgeclient-package-'))
  const tarball = providedTarball ? resolve(providedTarball) : await createTarball(repositoryRoot, directory)
  let preserveTarball = false

  try {
    assertRepositoryMetadata(manifest, repositoryRoot)
    runCommand(['bun', 'run', 'test:css:dist'], repositoryRoot)
    await verifyTarball(tarball, manifest, repositoryRoot)
    await verifyConsumer(tarball, manifest, directory, repositoryRoot)

    const outputFile = process.env.GITHUB_OUTPUT
    if (outputFile) {
      await appendFile(outputFile, `tarball=${tarball}\n`)
      preserveTarball = true
    }

    process.stdout.write(`Verified ${manifest.name}@${manifest.version} from ${basename(tarball)} in a fresh Nuxt consumer\n`)
  } finally {
    await rm(join(directory, 'consumer'), { recursive: true, force: true })
    if (!preserveTarball) {
      await rm(directory, { recursive: true, force: true })
    }
  }
}

await main()
