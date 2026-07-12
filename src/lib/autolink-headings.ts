import type { Element } from 'hast';
import { defineHastPlugin } from 'satteri';

const HEADING_TAGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];

interface AutolinkHeadingsOptions {
  content?: string;
  ignore?: RegExp;
  headingClassName?: string[];
  linkClassName?: string[];
}

export default function satteriAutolinkHeadings(
  options: AutolinkHeadingsOptions = {},
) {
  const { content = '#', headingClassName, linkClassName } = options;

  return defineHastPlugin({
    name: 'autolink-headings',
    element: {
      filter: HEADING_TAGS,
      visit(node, ctx) {
        const { id } = node.properties;
        if (typeof id !== 'string' || !id) return;
        if (options.ignore && id.match(options.ignore)) return;

        if (headingClassName) {
          ctx.setProperty(node, 'className', headingClassName);
        }

        const firstChild = node.children[0];
        const href = `#${id}`;
        if (
          firstChild?.type === 'element' &&
          firstChild.tagName === 'a' &&
          firstChild.properties?.href === href
        ) {
          return;
        }

        const anchor: Element = {
          type: 'element',
          tagName: 'a',
          properties: {
            href,
            className: linkClassName,
          },
          children: [{ type: 'text', value: content }],
        };

        ctx.prependChild(node, anchor);
      },
    },
  });
}
