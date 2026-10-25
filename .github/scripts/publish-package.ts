import { appendFileSync, readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { npmDistTag } from './release-version'

interface PackageManifest {
  name: string
  version: string
}

async function isPublished(packageName: string, version: string): Promise<boolean> {
  const registryName = packageName.replace('/', '%2f')
  const response = await fetch(`https://registry.npmjs.org/${registryName}/${version}`)

  if (response.status === 404) {
    return false
  }

  if (!response.ok) {
    throw new Error(`npm registry check failed with HTTP ${response.status}`)
  }

  return true
}

async function main(): Promise<void> {
  const tarball = process.argv[2]
  const releaseVersion = process.env.RELEASE_VERSION
  const manifest = JSON.parse(readFileSync('package.json', 'utf8')) as PackageManifest

  if (!tarball || !releaseVersion) {
    throw new Error('Pass the verified tarball path and set RELEASE_VERSION')
  }

  if (manifest.version !== releaseVersion) {
    throw new Error(`Tag version ${releaseVersion} does not match package version ${manifest.version}`)
  }

  if (await isPublished(manifest.name, releaseVersion)) {
    const message = `${manifest.name}@${releaseVersion} is already published; nothing was published.`
    const summaryFile = process.env.GITHUB_STEP_SUMMARY

    if (summaryFile) {
      appendFileSync(summaryFile, `### Already published\n\n${message}\n`)
    }

    process.stdout.write(`::notice title=Version already published::${message}\n`)
    return
  }

  const result = spawnSync('npm', [
    'publish',
    tarball,
    '--access',
    'public',
    '--provenance',
    '--tag',
    npmDistTag(releaseVersion)
  ], { stdio: 'inherit' })

  if (result.error) {
    throw result.error
  }

  if (result.status !== 0) {
    throw new Error(`npm publish failed with exit code ${result.status}`)
  }
}

await main()
