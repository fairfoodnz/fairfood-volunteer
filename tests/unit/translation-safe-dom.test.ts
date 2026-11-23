import { beforeEach, describe, expect, it } from "vitest";

import {
  installTranslationSafeDom,
  type TranslationRecovery,
} from "@/lib/translation-safe-dom";

// A tiny stand-in for the DOM: just enough tree structure, and the same
// NotFoundError the real removeChild/insertBefore throw for a node that is not
// a direct child. The unit suite runs in Node (no jsdom), so a fresh class per
// test keeps each patched prototype isolated.
function makeDom(onRecover?: (kind: TranslationRecovery) => void) {
  class FakeNode {
    parentNode: FakeNode | null = null;
    childNodes: FakeNode[] = [];

    constructor(readonly name: string) {}

    appendChild(node: FakeNode) {
      return this.insertBefore(node, null);
    }

    removeChild(child: FakeNode) {
      const i = this.childNodes.indexOf(child);
      if (i === -1) throw new Error("NotFoundError: not a child of this node");
      this.childNodes.splice(i, 1);
      child.parentNode = null;
      return child;
    }

    insertBefore(node: FakeNode, child: FakeNode | null) {
      if (node.parentNode) node.parentNode.removeChild(node);
      const i = child === null ? this.childNodes.length : this.childNodes.indexOf(child);
      if (i === -1) throw new Error("NotFoundError: not a child of this node");
      this.childNodes.splice(i, 0, node);
      node.parentNode = this;
      return node;
    }
  }
  installTranslationSafeDom(FakeNode.prototype as unknown as Node, onRecover);
  return FakeNode;
}

const names = (n: { childNodes: { name: string }[] }) =>
  n.childNodes.map((c) => c.name);

describe("installTranslationSafeDom", () => {
  let FakeNode: ReturnType<typeof makeDom>;
  beforeEach(() => {
    FakeNode = makeDom();
  });

  it("leaves a normal removeChild unchanged", () => {
    const p = new FakeNode("p");
    const a = p.appendChild(new FakeNode("a"));
    p.appendChild(new FakeNode("b"));

    expect(p.removeChild(a)).toBe(a);
    expect(names(p)).toEqual(["b"]);
    expect(a.parentNode).toBeNull();
  });

  it("leaves a normal insertBefore unchanged", () => {
    const p = new FakeNode("p");
    const b = p.appendChild(new FakeNode("b"));
    p.insertBefore(new FakeNode("a"), b);

    expect(names(p)).toEqual(["a", "b"]);
  });

  it("removes a node a translator wrapped in <font> from its real parent", () => {
    // Chrome translate: <p>text</p> becomes <p><font>text</font></p>.
    const p = new FakeNode("p");
    const text = p.appendChild(new FakeNode("text"));
    const font = p.insertBefore(new FakeNode("font"), text);
    font.appendChild(text);

    expect(() => p.removeChild(text)).not.toThrow();
    expect(text.parentNode).toBeNull();
    expect(names(font)).toEqual([]);
  });

  it("treats removing an already-detached node as done", () => {
    // Chrome translate: the original text node is swapped out entirely.
    const p = new FakeNode("p");
    const text = p.appendChild(new FakeNode("text"));
    p.removeChild(text);
    p.appendChild(new FakeNode("font"));

    expect(p.removeChild(text)).toBe(text);
    expect(names(p)).toEqual(["font"]);
  });

  it("appends instead of throwing when the insertBefore anchor was moved", () => {
    const p = new FakeNode("p");
    const anchor = p.appendChild(new FakeNode("anchor"));
    p.removeChild(anchor);
    p.appendChild(new FakeNode("font"));

    const added = new FakeNode("new");
    expect(p.insertBefore(added, anchor)).toBe(added);
    expect(names(p)).toEqual(["font", "new"]);
  });

  it("is idempotent", () => {
    const patched = FakeNode.prototype.removeChild;
    installTranslationSafeDom(FakeNode.prototype as unknown as Node);
    expect(FakeNode.prototype.removeChild).toBe(patched);
  });

  describe("onRecover", () => {
    it("reports each recovered call, and stays quiet for normal ones", () => {
      const kinds: TranslationRecovery[] = [];
      const Dom = makeDom((kind) => kinds.push(kind));

      const p = new Dom("p");
      const kept = p.appendChild(new Dom("kept"));
      p.removeChild(kept);
      expect(kinds).toEqual([]);

      const wrapped = p.appendChild(new Dom("wrapped"));
      p.appendChild(new Dom("font")).appendChild(wrapped);
      p.removeChild(wrapped);

      const detached = new Dom("detached");
      p.removeChild(detached);
      p.insertBefore(new Dom("new"), detached);

      expect(kinds).toEqual([
        "removeChild:reparented",
        "removeChild:detached",
        "insertBefore:moved-anchor",
      ]);
    });

    it("never lets a failing reporter turn a recovery back into a crash", () => {
      const Dom = makeDom(() => {
        throw new Error("analytics down");
      });
      const p = new Dom("p");
      expect(() => p.removeChild(new Dom("detached"))).not.toThrow();
    });
  });
});
