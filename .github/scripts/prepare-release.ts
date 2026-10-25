import { appendFileSync, readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { nextVersion, resolveRelease, type ReleaseType } from './release-version'

interface PackageManifest {
  name: string
  version: string
}

function runGit(args: string[]): string {
  const result = spawnSync('git', args, { encoding: 'utf8' })

  if (result.error) {
    throw result.error
  }

  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || `git ${args.join(' ')} failed`)
  }

  return result.stdout.trim()
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
  const manifest = JSON.parse(readFileSync('package.json', 'utf8')) as PackageManifest
  const releaseType = process.env.RELEASE_TYPE as ReleaseType | undefined
  const prereleaseVersion = process.env.PRERELEASE_VERSION
  const outputFile = process.env.GITHUB_OUTPUT

  if (!releaseType || !['patch', 'minor', 'major', 'alpha', 'beta', 'rc'].includes(releaseType)) {
    throw new Error('RELEASE_TYPE must be patch, minor, major, alpha, beta, or rc')
  }

  if (!outputFile) {
    throw new Error('GITHUB_OUTPUT is required')
  }

  runGit(['fetch', 'origin', '+refs/heads/main:refs/remotes/origin/main', '--tags', '--force'])

  const currentTag = `v${manifest.version}`
  const currentTagExists = Boolean(runGit(['tag', '--list', currentTag]))
  const currentVersionPublished = currentTagExists ? await isPublished(manifest.name, manifest.version) : false
  const version = currentTagExists && !currentVersionPublished
    ? manifest.version
    : nextVersion(manifest.version, releaseType, prereleaseVersion)
  const targetTag = `v${version}`
  const existingTag = runGit(['tag', '--list', targetTag])
  const resolution = resolveRelease({
    currentVersion: manifest.version,
    releaseType,
    prereleaseVersion,
    currentVersionTagExists: currentTagExists,
    currentVersionPublished,
    targetTagExists: Boolean(existingTag),
    targetVersionPublished: version === manifest.version
      ? currentVersionPublished
      : await isPublished(manifest.name, version)
  })

  if (resolution.resume) {
    const resumeTag = `v${resolution.version}`
    runGit(['merge-base', '--is-ancestor', resumeTag, 'refs/remotes/origin/main'])
    const taggedManifest = JSON.parse(runGit(['show', `${resumeTag}:package.json`])) as PackageManifest

    if (taggedManifest.version !== resolution.version) {
      throw new Error(`Tag ${resumeTag} points to package version ${taggedManifest.version}`)
    }

    appendFileSync(outputFile, `version=${resolution.version}\nresume=true\n`)
    process.stdout.write(`Resuming release ${resumeTag}; publication will check whether npm already has this version.\n`)
    return
  }

  const currentHead = runGit(['rev-parse', 'HEAD'])
  const remoteMain = runGit(['rev-parse', 'refs/remotes/origin/main'])

  if (currentHead !== remoteMain) {
    throw new Error('main advanced after this release was requested. Start a new Release workflow from the latest main commit.')
  }

  appendFileSync(outputFile, `version=${resolution.version}\nresume=false\n`)
  process.stdout.write(`Preparing release ${resolution.version}.\n`)
}

await main()
