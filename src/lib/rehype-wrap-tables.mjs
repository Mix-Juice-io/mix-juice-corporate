// Wraps every Markdown table in <div class="art-table-wrap"> so wide tables
// scroll horizontally on narrow screens instead of overflowing the article.
// The table itself keeps display: table, preserving its semantics for
// screen readers.

/** @param {import('hast').Parent} node */
function wrapTables(node) {
  node.children = node.children.map((child) => {
    if (child.type !== 'element') return child
    if (child.tagName === 'table') {
      return {
        type: 'element',
        tagName: 'div',
        properties: { className: ['art-table-wrap'] },
        children: [child],
      }
    }
    wrapTables(child)
    return child
  })
}

export default function rehypeWrapTables() {
  /** @param {import('hast').Root} tree */
  return (tree) => wrapTables(tree)
}
