const supportsDom =
  typeof window !== 'undefined' && typeof window.document !== 'undefined'

const stripTags = (value: string) => value.replace(/<[^>]*>/g, '')

const allowedTags = new Set([
  'b',
  'strong',
  'i',
  'em',
  'u',
  'p',
  'br',
  'ul',
  'ol',
  'li',
  'blockquote',
  'code',
  'pre',
  'div'
])

const allowedAttributes: Record<string, Set<string>> = {
  a: new Set(['href'])
}

const isSafeHref = (value: string | null) => {
  if (!value) {
    return false
  }
  return /^(https?:|mailto:)/i.test(value.trim())
}

const sanitizeAttributes = (element: HTMLElement) => {
  const tagName = element.tagName.toLowerCase()
  const attrs = allowedAttributes[tagName]
  Array.from(element.attributes).forEach((attr) => {
    if (!attrs || !attrs.has(attr.name)) {
      element.removeAttribute(attr.name)
      return
    }

    if (attr.name === 'href' && !isSafeHref(attr.value)) {
      element.removeAttribute(attr.name)
      return
    }

    if (attr.name === 'href') {
      element.setAttribute('rel', 'noreferrer noopener')
      element.setAttribute('target', '_blank')
    }
  })
}

const unwrapElement = (element: Element) => {
  const parent = element.parentNode
  if (!parent) {
    return
  }
  while (element.firstChild) {
    parent.insertBefore(element.firstChild, element)
  }
  parent.removeChild(element)
}

const hasBoldWeight = (value: string | null) => {
  if (!value) {
    return false
  }
  if (value.includes('bold')) {
    return true
  }
  const numeric = Number.parseInt(value, 10)
  return !Number.isNaN(numeric) && numeric >= 500
}

const normalizeSpanElement = (element: HTMLSpanElement) => {
  const wrappers: string[] = []
  if (hasBoldWeight(element.style.fontWeight)) {
    wrappers.push('strong')
  }
  if (element.style.fontStyle && element.style.fontStyle.includes('italic')) {
    wrappers.push('em')
  }
  const decoration = element.style.textDecoration || element.style.textDecorationLine
  if (decoration && decoration.includes('underline')) {
    wrappers.push('u')
  }

  if (wrappers.length === 0) {
    return null
  }

  const outer = document.createElement(wrappers[0])
  let currentWrapper = outer
  wrappers.slice(1).forEach((tag) => {
    const nextWrapper = document.createElement(tag)
    currentWrapper.appendChild(nextWrapper)
    currentWrapper = nextWrapper
  })

  while (element.firstChild) {
    currentWrapper.appendChild(element.firstChild)
  }

  element.replaceWith(outer)
  return outer
}

const sanitizeTree = (root: Element) => {
  Array.from(root.childNodes).forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      return
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      root.removeChild(node)
      return
    }

    const element = node as HTMLElement
    const tagName = element.tagName.toLowerCase()

    if (tagName === 'span') {
      const normalized = normalizeSpanElement(element as HTMLSpanElement)
      if (normalized) {
        sanitizeTree(normalized)
        return
      }
      unwrapElement(element)
      return
    }

    if (!allowedTags.has(tagName)) {
      unwrapElement(element)
      return
    }

    sanitizeAttributes(element)
    sanitizeTree(element)
  })
}

export const sanitizeMessageHtml = (value: string) => {
  if (!value) {
    return ''
  }

  if (!supportsDom) {
    return stripTags(value).trim()
  }

  const container = document.createElement('div')
  container.innerHTML = value
  sanitizeTree(container)

  return container.innerHTML
    .replace(/\u200B/g, '')
    .replace(/(&nbsp;)+/g, ' ')
    .trim()
}

export const plainTextFromHtml = (value: string) => {
  if (!value) {
    return ''
  }

  if (!supportsDom) {
    return stripTags(value)
  }

  const container = document.createElement('div')
  container.innerHTML = value
  return container.textContent?.replace(/\u200B/g, '') ?? ''
}
