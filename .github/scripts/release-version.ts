export type StableReleaseType = 'patch' | 'minor' | 'major'
export type PrereleaseType = 'alpha' | 'beta' | 'rc'
export type ReleaseType = StableReleaseType | PrereleaseType

export interface ReleaseResolution {
  version: string
  resume: boolean
}

interface ParsedVersion {
  major: number
  minor: number
  patch: number
  prerelease?: {
    channel: PrereleaseType
    iteration: number
  }
}

const prereleaseChannels: PrereleaseType[] = ['alpha', 'beta', 'rc']

function parseVersion(version: string): ParsedVersion {
  const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-(alpha|beta|rc)\.(0|[1-9]\d*))?$/.exec(version)

  if (!match) {
    throw new Error(`Expected a stable or alpha, beta, or rc package version, received "${version}"`)
  }

  const [, major, minor, patch, channel, iteration] = match

  return {
    major: Number(major),
    minor: Number(minor),
    patch: Number(patch),
    ...(channel && iteration ? { prerelease: { channel: channel as PrereleaseType, iteration: Number(iteration) } } : {})
  }
}

function compareVersions(left: ParsedVersion, right: ParsedVersion): number {
  for (const key of ['major', 'minor', 'patch'] as const) {
    if (left[key] !== right[key]) {
      return left[key] - right[key]
    }
  }

  if (!left.prerelease) {
    return right.prerelease ? 1 : 0
  }

  if (!right.prerelease) {
    return -1
  }

  const channelDifference = prereleaseChannels.indexOf(left.prerelease.channel) - prereleaseChannels.indexOf(right.prerelease.channel)
  return channelDifference || left.prerelease.iteration - right.prerelease.iteration
}

export function nextVersion(currentVersion: string, releaseType: ReleaseType, prereleaseVersion?: string): string {
  const current = parseVersion(currentVersion)

  if (prereleaseChannels.includes(releaseType as PrereleaseType)) {
    if (!prereleaseVersion) {
      throw new Error(`PRERELEASE_VERSION is required for ${releaseType} releases`)
    }

    const requested = parseVersion(prereleaseVersion)
    if (!requested.prerelease || requested.prerelease.channel !== releaseType) {
      throw new Error(`PRERELEASE_VERSION must use the ${releaseType} channel, received "${prereleaseVersion}"`)
    }

    if (compareVersions(requested, current) <= 0) {
      throw new Error(`Prerelease version ${prereleaseVersion} must be newer than ${currentVersion}`)
    }

    return prereleaseVersion
  }

  if (prereleaseVersion) {
    throw new Error('PRERELEASE_VERSION can only be set for alpha, beta, or rc releases')
  }

  const { major, minor, patch } = current

  if (releaseType === 'major') {
    return `${major + 1}.0.0`
  }

  if (releaseType === 'minor') {
    return `${major}.${minor + 1}.0`
  }

  return current.prerelease ? `${major}.${minor}.${patch}` : `${major}.${minor}.${patch + 1}`
}

export function npmDistTag(version: string): string {
  return parseVersion(version).prerelease?.channel ?? 'latest'
}

export function resolveRelease(input: {
  currentVersion: string
  releaseType: ReleaseType
  prereleaseVersion?: string
  currentVersionTagExists: boolean
  currentVersionPublished: boolean
  targetTagExists: boolean
  targetVersionPublished: boolean
}): ReleaseResolution {
  if (input.currentVersionTagExists && !input.currentVersionPublished) {
    return { version: input.currentVersion, resume: true }
  }

  const version = nextVersion(input.currentVersion, input.releaseType, input.prereleaseVersion)

  if (input.targetTagExists) {
    if (input.targetVersionPublished) {
      throw new Error(`Version ${version} is already published to npm; refusing to treat it as an unpublished release`)
    }

    return { version, resume: true }
  }

  if (input.targetVersionPublished) {
    throw new Error(`Version ${version} is already published to npm but has no matching Git tag`)
  }

  return { version, resume: false }
}
