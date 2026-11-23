// Browser page translation (Chrome/Edge "Translate this page", Chrome on
// Android and iOS, Safari's translator) rewrites the DOM underneath React: it
// swaps each text node it translates for <font> wrappers and detaches the
// original. React still holds the original node, so the next time it commits
// a change to that part of the tree it calls `parent.removeChild(original)` or
// `parent.insertBefore(node, original)` on a node that is no longer a child,
// and the DOM throws "NotFoundError: The node to be removed is not a child of
// this node" (WebKit: "The object can not be found here"). That throw happens
// mid-commit, so the whole page falls over for that visitor.
//
// In production every one of these crashes came from browsers set to a
// language other than English (zh-CN, fr-FR, ja), i.e. volunteers reading the
// site translated. Blocking translation (`translate="no"`) would lock them out
// of the content, so instead we make the two DOM calls React relies on
// tolerant of a node that has moved, which is the long-standing workaround
// from facebook/react#11538. See fairfoodnz/fairfood-volunteer#194, #195,
// #215 and #216.
//
// The cost is that a translated string React later updates can stay showing
// the old translation until the next navigation: far better than a dead page.

type PatchableNode = Pick<Node, "removeChild" | "insertBefore">;

/** Which guarded call recovered from a node the translator had moved. */
export type TranslationRecovery =
  | "removeChild:reparented"
  | "removeChild:detached"
  | "insertBefore:moved-anchor";

const PATCHED = Symbol.for("fairfood.translationSafeDom");

/**
 * Patch `proto.removeChild` / `proto.insertBefore` (normally `Node.prototype`)
 * so a reference node that is no longer a direct child no longer throws.
 * Behaviour for every well-formed call is unchanged. Idempotent.
 *
 * `onRecover` fires each time a call that would have thrown is recovered, so
 * the caller can measure how often the guard is actually needed.
 */
export function installTranslationSafeDom(
  proto: PatchableNode,
  onRecover?: (kind: TranslationRecovery) => void,
): void {
  const marked = proto as PatchableNode & { [PATCHED]?: true };
  if (marked[PATCHED]) return;
  marked[PATCHED] = true;

  const recovered = (kind: TranslationRecovery) => {
    try {
      onRecover?.(kind);
    } catch {
      // Reporting must never turn a recovered DOM call back into a crash.
    }
  };

  const originalRemoveChild = proto.removeChild;
  proto.removeChild = function <T extends Node>(this: Node, child: T): T {
    const parent = child.parentNode;
    if (parent && parent !== this) {
      // The translator re-parented the node (e.g. into a <font> it inserted
      // under `this`). Removing it from where it actually lives is what React
      // meant, and it keeps the stale node from lingering on screen.
      recovered("removeChild:reparented");
      return originalRemoveChild.call(parent, child) as T;
    }
    if (!parent) {
      // Already detached by the translator: the removal React asked for has,
      // in effect, happened.
      recovered("removeChild:detached");
      return child;
    }
    return originalRemoveChild.call(this, child) as T;
  };

  const originalInsertBefore = proto.insertBefore;
  proto.insertBefore = function <T extends Node>(
    this: Node,
    node: T,
    child: Node | null,
  ): T {
    if (child && child.parentNode !== this) {
      // The anchor React picked was moved or detached. Appending keeps the new
      // node in the right parent; its exact position among siblings the
      // translator has already rearranged is the best that can be recovered.
      recovered("insertBefore:moved-anchor");
      return originalInsertBefore.call(this, node, null) as T;
    }
    return originalInsertBefore.call(this, node, child) as T;
  };
}
