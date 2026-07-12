import type { Node, Root, RootContent } from 'mdast';
import type { Options } from 'mdast-util-toc';
import { toc } from 'mdast-util-toc';
import { defineMdastPlugin, type MdastVisitorContext } from 'satteri';

interface TocOptions extends Options {
  className?: string;
}

/**
 * Generate a table of contents (TOC).
 *
 * Looks for the first heading matching `options.heading` (case insensitive),
 * removes everything between it and an equal or higher next heading, and
 * replaces that with a list representing the rest of the document structure,
 * linking to all further headings.
 *
 * Adapted from https://github.com/remarkjs/remark-toc/blob/9d0e2764ce3b5a8276e3cdee36c56ff6eecf7477/lib/index.js
 * copied under the MIT License Copyright (c) 2015 Titus Wormer
 *
 */
export default function satteriToc(options: TocOptions = {}) {
  const { className, ...settings } = options;

  const heading = (node: Node, ctx: MdastVisitorContext) => {
    const tree = getRoot(node, ctx);
    if (!tree) return;

    // Run once per document even though we subscribe to heading nodes.
    if (ctx.data.__tocDone) return;
    ctx.data.__tocDone = true;

    const result = toc(tree, settings);

    if (
      result.endIndex === undefined ||
      result.endIndex === -1 ||
      result.index === undefined ||
      result.index === -1 ||
      !result.map
    ) {
      return;
    }

    // Add toc className
    result.map.data = result.map.data || {};
    result.map.data.hProperties = result.map.data.hProperties || {};
    result.map.data.hProperties.className = className;

    // Fix incorrect indices when the heading is inside a <details> element
    ctx.setProperty(tree, 'children', [
      ...tree.children.slice(0, result.index + 1),
      result.map,
      ...tree.children.slice(result.index + 1),
    ]);
  };

  return defineMdastPlugin({
    name: 'toc',
    heading,
  });
}

function getRoot(node: Node, ctx: MdastVisitorContext): Root | undefined {
  let root: Node | undefined = node;

  while (root && root.type !== 'root') {
    root = ctx.parent(root as RootContent);
  }

  return root as Root | undefined;
}
