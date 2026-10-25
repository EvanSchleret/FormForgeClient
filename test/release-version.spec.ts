import { describe, expect, it } from 'vitest'
import { nextVersion, npmDistTag, resolveRelease } from '../.github/scripts/release-version'

describe('release versioning', () => {
  it('increments patch, minor, and major versions', () => {
    expect(nextVersion('2.3.2', 'patch')).toBe('2.3.3')
    expect(nextVersion('2.3.2', 'minor')).toBe('2.4.0')
    expect(nextVersion('2.3.2', 'major')).toBe('3.0.0')
  })

  it('accepts exact alpha, beta, and rc versions that advance the current version', () => {
    expect(nextVersion('2.3.2', 'alpha', '2.3.3-alpha.1')).toBe('2.3.3-alpha.1')
    expect(nextVersion('2.3.3-alpha.1', 'alpha', '2.3.3-alpha.2')).toBe('2.3.3-alpha.2')
    expect(nextVersion('2.3.3-alpha.2', 'beta', '2.3.3-beta.1')).toBe('2.3.3-beta.1')
    expect(nextVersion('2.3.3-beta.1', 'rc', '2.3.3-rc.1')).toBe('2.3.3-rc.1')
  })

  it('requires a matching, newer prerelease version', () => {
    expect(() => nextVersion('2.3.2', 'alpha')).toThrow('PRERELEASE_VERSION is required')
    expect(() => nextVersion('2.3.2', 'rc', '2.3.3-beta.1')).toThrow('must use the rc channel')
    expect(() => nextVersion('2.3.3-beta.1', 'alpha', '2.3.3-alpha.2')).toThrow('must be newer')
    expect(() => nextVersion('2.3.3', 'rc', '2.3.3-rc.1')).toThrow('must be newer')
    expect(() => nextVersion('2.3.2', 'alpha', '2.3.3-alpha.01')).toThrow('stable or alpha, beta, or rc package version')
  })

  it('finalizes a prerelease with a stable patch or minor release', () => {
    expect(nextVersion('2.3.3-rc.1', 'patch')).toBe('2.3.3')
    expect(nextVersion('2.3.3-rc.1', 'minor')).toBe('2.4.0')
  })

  it('uses the channel-specific npm dist-tag', () => {
    expect(npmDistTag('2.3.3-alpha.1')).toBe('alpha')
    expect(npmDistTag('2.3.3-beta.1')).toBe('beta')
    expect(npmDistTag('2.3.3-rc.1')).toBe('rc')
    expect(npmDistTag('2.3.3')).toBe('latest')
  })

  it('resumes an existing tag instead of creating a second release', () => {
    expect(resolveRelease({
      currentVersion: '2.3.2',
      releaseType: 'patch',
      currentVersionTagExists: false,
      currentVersionPublished: false,
      targetTagExists: true,
      targetVersionPublished: false
    })).toEqual({ version: '2.3.3', resume: true })
  })

  it('resumes an unpublished version already tagged on main', () => {
    expect(resolveRelease({
      currentVersion: '2.3.3',
      releaseType: 'patch',
      currentVersionTagExists: true,
      currentVersionPublished: false,
      targetTagExists: false,
      targetVersionPublished: false
    })).toEqual({ version: '2.3.3', resume: true })
  })

  it('rejects a published npm version that has no matching tag', () => {
    expect(() => resolveRelease({
      currentVersion: '2.3.2',
      releaseType: 'patch',
      currentVersionTagExists: false,
      currentVersionPublished: false,
      targetTagExists: false,
      targetVersionPublished: true
    })).toThrow('already published to npm but has no matching Git tag')
  })

  it('does not silently resume a target version that is already published', () => {
    expect(() => resolveRelease({
      currentVersion: '2.3.2',
      releaseType: 'patch',
      currentVersionTagExists: false,
      currentVersionPublished: false,
      targetTagExists: true,
      targetVersionPublished: true
    })).toThrow('already published to npm')
  })
})
