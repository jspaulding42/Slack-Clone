import { type ClipboardEvent, type FormEvent, type KeyboardEvent, useRef, useState } from 'react'
import { FileUpload } from './FileUpload'
import { AttachmentDisplay } from './AttachmentDisplay'
import { storageService } from '../lib/storageService'
import type { MessageAttachment } from '../lib/chatService'
import { plainTextFromHtml, sanitizeMessageHtml } from '../lib/sanitizeMessageHtml'

type MessageInputProps = {
  onSend: (text: string, attachments?: MessageAttachment[]) => Promise<void> | void
  disabled?: boolean
  channelName?: string
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

export const MessageInput = ({ onSend, disabled = false, channelName }: MessageInputProps) => {
  const editorRef = useRef<HTMLDivElement>(null)
  const [editorHtml, setEditorHtml] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [attachments, setAttachments] = useState<MessageAttachment[]>([])
  const [showFileUpload, setShowFileUpload] = useState(false)

  const updateEditorState = () => {
    const html = editorRef.current?.innerHTML ?? ''
    setEditorHtml(html)
    if (error) {
      setError(null)
    }
  }

  const syncEditorSoon = () => {
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(() => updateEditorState())
    } else {
      setTimeout(() => updateEditorState(), 0)
    }
  }

  const resetEditor = () => {
    if (editorRef.current) {
      editorRef.current.innerHTML = ''
    }
    setEditorHtml('')
  }

  const submitMessage = async () => {
    if (disabled || isSending) {
      return
    }

    const rawHtml = editorRef.current?.innerHTML ?? ''
    const sanitizedHtml = sanitizeMessageHtml(rawHtml)
    const plainText = plainTextFromHtml(sanitizedHtml).trim()

    if ((!plainText && attachments.length === 0) || disabled) {
      return
    }

    setError(null)
    try {
      setIsSending(true)
      await onSend(sanitizedHtml, attachments.length > 0 ? attachments : undefined)
      resetEditor()
      setAttachments([])
      setShowFileUpload(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send message.')
    } finally {
      setIsSending(false)
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await submitMessage()
  }

  const findClosestListItem = (node: Node | null): HTMLLIElement | null => {
    let current: Node | null = node
    while (current && current !== editorRef.current) {
      if (current.nodeType === Node.ELEMENT_NODE) {
        const element = current as HTMLElement
        if (element.tagName === 'LI') {
          return element as HTMLLIElement
        }
      }
      current = current.parentNode
    }
    return null
  }

  const insertLineBreak = () => {
    if (!editorRef.current || typeof document === 'undefined') {
      return false
    }
    if (!document.execCommand('insertLineBreak')) {
      document.execCommand('insertHTML', false, '<br>')
    }
    syncEditorSoon()
    return true
  }

  const insertListItemBreak = () => {
    if (
      !editorRef.current ||
      typeof window === 'undefined' ||
      typeof document === 'undefined'
    ) {
      return false
    }
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) {
      return false
    }
    const range = selection.getRangeAt(0)
    const currentLi = findClosestListItem(range.startContainer)
    if (!currentLi || !currentLi.parentElement) {
      return false
    }

    const trailingRange = range.cloneRange()
    try {
      trailingRange.setEnd(currentLi, currentLi.childNodes.length)
    } catch {
      return false
    }
    const trailingFragment = trailingRange.extractContents()

    if (currentLi.childNodes.length === 0) {
      currentLi.appendChild(document.createElement('br'))
    }

    const newLi = document.createElement('li')
    if (trailingFragment.childNodes.length > 0) {
      newLi.appendChild(trailingFragment)
    } else {
      newLi.appendChild(document.createElement('br'))
    }

    currentLi.parentElement.insertBefore(newLi, currentLi.nextSibling)

    const caretRange = document.createRange()
    const focusTarget = newLi.firstChild
    if (focusTarget && focusTarget.nodeType === Node.TEXT_NODE) {
      caretRange.setStart(focusTarget, 0)
    } else {
      caretRange.setStart(newLi, 0)
    }
    caretRange.collapse(true)
    selection.removeAllRanges()
    selection.addRange(caretRange)
    syncEditorSoon()
    return true
  }

  const handleEditorKeyDown = async (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' && event.altKey) {
      event.preventDefault()
      if (!insertListItemBreak()) {
        insertLineBreak()
      }
      return
    }

    if (event.key === 'Enter' && !event.shiftKey && !event.altKey) {
      event.preventDefault()
      await submitMessage()
    }
  }

  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault()
    const text = event.clipboardData.getData('text/plain')
    if (typeof document !== 'undefined') {
      document.execCommand('insertText', false, text)
      syncEditorSoon()
    }
  }

  const runEditorCommand = (command: string, value?: string) => {
    if (!editorRef.current || disabled || isSending || typeof document === 'undefined') {
      return
    }
    editorRef.current.focus()
    document.execCommand(command, false, value ?? '')
    syncEditorSoon()
  }

  const applyInlineCode = () => {
    if (
      !editorRef.current ||
      disabled ||
      isSending ||
      typeof window === 'undefined' ||
      typeof document === 'undefined'
    ) {
      return
    }
    const selection = window.getSelection()
    const selectedText = selection?.toString() ?? ''
    const content = selectedText ? escapeHtml(selectedText) : 'code'
    document.execCommand('insertHTML', false, `<code>${content}</code>`)
    syncEditorSoon()
  }

  const editorIsEmpty = plainTextFromHtml(editorHtml).trim().length === 0
  const toolbarDisabled = disabled || isSending
  const placeholder = channelName ? `Message #${channelName}` : 'Choose a channel'

  const handleFilesSelected = (newAttachments: MessageAttachment[]) => {
    setAttachments(prev => [...prev, ...newAttachments])
    setShowFileUpload(false)
  }

  const handleRemoveAttachment = async (attachmentId: string) => {
    // Find the attachment to remove
    const attachmentToRemove = attachments.find(att => att.id === attachmentId)
    
    if (attachmentToRemove) {
      try {
        // Delete the file and its thumbnail from Firebase Storage
        await storageService.deleteFileWithThumbnail(attachmentToRemove)
      } catch (error) {
        console.error('Failed to delete attachment from storage:', error)
        // Continue with UI removal even if storage deletion fails
      }
    }
    
    // Remove from UI state
    setAttachments(prev => prev.filter(att => att.id !== attachmentId))
  }

  return (
    <div className="message-input-container">
      {attachments.length > 0 && (
        <div className="message-input__attachments">
          {attachments.map((attachment) => (
            <AttachmentDisplay
              key={attachment.id}
              attachment={attachment}
              onRemove={handleRemoveAttachment}
              showRemoveButton={true}
            />
          ))}
        </div>
      )}
      
      {showFileUpload && (
        <div className="message-input__file-upload">
          <FileUpload
            onFilesSelected={handleFilesSelected}
            disabled={disabled || isSending}
            maxFiles={5}
          />
          <button
            type="button"
            className="message-input__cancel-upload"
            onClick={() => setShowFileUpload(false)}
          >
            Cancel
          </button>
        </div>
      )}
      
      <form className="message-input" onSubmit={handleSubmit}>
        <div className={`message-input__composer${toolbarDisabled ? ' is-disabled' : ''}`}>
          <div className="message-input__toolbar">
            <button
              type="button"
              className="message-input__toolbar-btn"
              onClick={() => runEditorCommand('bold')}
              disabled={toolbarDisabled}
              title="Bold"
            >
              B
            </button>
            <button
              type="button"
              className="message-input__toolbar-btn"
              onClick={() => runEditorCommand('italic')}
              disabled={toolbarDisabled}
              title="Italic"
            >
              I
            </button>
            <button
              type="button"
              className="message-input__toolbar-btn"
              onClick={() => runEditorCommand('underline')}
              disabled={toolbarDisabled}
              title="Underline"
            >
              U
            </button>
            <button
              type="button"
              className="message-input__toolbar-btn"
              onClick={applyInlineCode}
              disabled={toolbarDisabled}
              title="Inline code"
            >
              {'<>'}
            </button>
            <button
              type="button"
              className="message-input__toolbar-btn"
              onClick={() => runEditorCommand('insertUnorderedList')}
              disabled={toolbarDisabled}
              title="Bulleted list"
            >
              ••
            </button>
            <button
              type="button"
              className="message-input__toolbar-btn"
              onClick={() => runEditorCommand('insertOrderedList')}
              disabled={toolbarDisabled}
              title="Numbered list"
            >
              1.
            </button>
            <button
              type="button"
              className="message-input__toolbar-btn"
              onClick={() => runEditorCommand('formatBlock', '<blockquote>')}
              disabled={toolbarDisabled}
              title="Block quote"
            >
              “”
            </button>
          </div>
          <div className="message-input__editor-wrapper">
            <div
              ref={editorRef}
              className={`message-input__editor${editorIsEmpty ? ' message-input__editor--empty' : ''}`}
              contentEditable={!toolbarDisabled}
              suppressContentEditableWarning
              onInput={updateEditorState}
              onKeyDown={handleEditorKeyDown}
              onPaste={handlePaste}
              data-placeholder={placeholder}
              role="textbox"
              aria-multiline="true"
            />
          </div>
        </div>
        <div className="message-input__controls">
          <button
            type="button"
            className="message-input__attach-btn"
            onClick={() => setShowFileUpload(!showFileUpload)}
            disabled={disabled || isSending}
            title="Attach files"
          >
            📎
          </button>
          <button
            type="submit"
            className="primary-btn"
            disabled={disabled || isSending || (editorIsEmpty && attachments.length === 0)}
          >
            {isSending ? 'Sending…' : 'Send'}
          </button>
        </div>
        {error && <p className="form-error">{error}</p>}
      </form>
    </div>
  )
}
