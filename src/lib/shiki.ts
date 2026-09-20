import type { Element } from 'hast';

export function copyButton() {
  return {
    name: 'l-copy-button',
    pre(node: Element) {
      node.properties.tabindex = undefined;
      node.children.push({
        type: 'element',
        tagName: 'l-copy-button',
        properties: {},
        children: [],
      });
    },
  };
}
