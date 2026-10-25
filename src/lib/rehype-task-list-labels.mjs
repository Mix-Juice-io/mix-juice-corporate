// GFM task lists ("- [ ] item") render a disabled checkbox followed by the
// item text, with nothing linking the two, so the checkbox has no accessible
// name. Wrap the checkbox and its text in a <label> so the text names it.

/** @param {import('hast').Element} node */
function isCheckbox(node) {
  return (
    node.type === 'element' &&
    node.tagName === 'input' &&
    node.properties?.type === 'checkbox'
  )
}

/** @param {import('hast').Parent} node */
function labelTaskItems(node) {
  for (const child of node.children) {
    if (child.type !== 'element') continue
    const classes = child.properties?.className ?? []
    if (child.tagName === 'li' && classes.includes('task-list-item')) {
      // Loose lists wrap the item in <p>; label the element holding the box.
      const holder = isCheckbox(child.children[0]) ? child : child.children[0]
      if (holder?.type === 'element' && isCheckbox(holder.children[0])) {
        const nested = holder.children.filter(
          (c) =>
            c.type === 'element' && (c.tagName === 'ul' || c.tagName === 'ol'),
        )
        const inline = holder.children.filter((c) => !nested.includes(c))
        holder.children = [
          {
            type: 'element',
            tagName: 'label',
            properties: {},
            children: inline,
          },
          ...nested,
        ]
      }
    }
    labelTaskItems(child)
  }
}

export default function rehypeTaskListLabels() {
  /** @param {import('hast').Root} tree */
  return (tree) => labelTaskItems(tree)
}
