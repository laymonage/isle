import type { Root } from 'mdast';
import type { Options } from 'mdast-util-toc';

import { toc } from 'mdast-util-toc';

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
export default function remarkToc(options: TocOptions) {
  const settings = {
    ...options,
    heading: options?.heading || '(table[ -]of[ -])?contents?|toc',
    tight: options && typeof options.tight === 'boolean' ? options.tight : true,
  };

  return (tree: Root) => {
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
    result.map.data.hProperties.className = options.className;

    // Fix incorrect indices when the heading is inside a <details> element
    tree.children = [
      ...tree.children.slice(0, result.index + 1),
      result.map,
      ...tree.children.slice(result.index + 1),
    ];
  };
}
