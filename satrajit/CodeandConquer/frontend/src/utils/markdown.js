// Format markdown-like text to HTML
export const formatMarkdown = (text) => {
  if (!text) return ''
  
  let formatted = String(text)
  
  // First, handle code blocks to protect them from other transformations
  const codeBlocks = []
  formatted = formatted.replace(/```[\s\S]*?```/g, (match) => {
    codeBlocks.push(match)
    return `__CODE_BLOCK_${codeBlocks.length - 1}__`
  })
  
  // Escape HTML (but preserve existing tags if any)
  formatted = formatted
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  
  // Convert **bold** to <strong>bold</strong> - improved regex for edge cases
  formatted = formatted.replace(/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>')
  
  // Convert *italic* to <em>italic</em> (single asterisks)
  formatted = formatted.replace(/\*([^*\n]+?)\*/g, '<em>$1</em>')
  
  // Convert `code` to <code>code</code>
  formatted = formatted.replace(/`([^`\n]+?)`/g, '<code class="inline-code">$1</code>')
  
  // Convert _underscore_ to <em> as well
  formatted = formatted.replace(/_([^_\n]+?)_/g, '<em>$1</em>')
  
  // Convert line breaks to <br>
  formatted = formatted.replace(/\n/g, '<br/>')
  
  // Convert multiple consecutive <br/> to paragraphs
  formatted = formatted.replace(/(<br\/>){3,}/g, '</p><p>')
  formatted = formatted.replace(/(<br\/>){2}/g, '</p><p>')
  
  // Restore code blocks
  codeBlocks.forEach((block, i) => {
    const code = block.replace(/```(\w*)\n?([\s\S]*?)```/, '$2').trim()
    formatted = formatted.replace(`__CODE_BLOCK_${i}__`, `<pre class="code-block"><code>${code}</code></pre>`)
  })
  
  // Wrap in paragraph if not already wrapped
  if (!formatted.startsWith('<p>')) {
    formatted = '<p>' + formatted + '</p>'
  }
  
  // Clean up empty paragraphs
  formatted = formatted.replace(/<p><\/p>/g, '')
  formatted = formatted.replace(/<p>(<br\/>)+<\/p>/g, '')
  
  return formatted
}

