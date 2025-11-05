import { plainTextFromHtml } from './sanitizeMessageHtml'

const usernamePattern = /[^a-z0-9._-]+/g
const mentionPattern = /@([a-z0-9._-]+)/gi

const sanitizeUsername = (value?: string) =>
  value ? value.toLowerCase().replace(usernamePattern, '') : ''

export const buildUsernameCandidates = (
  displayName: string,
  fallback?: string
): string[] => {
  const normalizedFallback = sanitizeUsername(fallback)
  const normalizedDisplay = sanitizeUsername(displayName)

  const candidates: string[] = []

  if (normalizedFallback) {
    candidates.push(normalizedFallback)
  }

  if (normalizedDisplay && !candidates.includes(normalizedDisplay)) {
    candidates.push(normalizedDisplay)
  }

  return candidates
}

export const deriveUsername = (displayName: string, fallback?: string): string => {
  const [primaryCandidate] = buildUsernameCandidates(displayName, fallback)
  return primaryCandidate ?? ''
}

export const extractMentionsFromHtml = (html: string): string[] => {
  if (!html) {
    return []
  }

  const plainText = plainTextFromHtml(html) ?? ''
  const mentions: string[] = []
  let match: RegExpExecArray | null = null
  while ((match = mentionPattern.exec(plainText))) {
    mentions.push(match[1].toLowerCase())
  }
  return mentions
}
