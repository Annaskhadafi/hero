"use client";

import { useEffect } from "react";

export function DomCleanupPatch() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const origRemoveChild = Node.prototype.removeChild;
    Node.prototype.removeChild = function (child: any) {
      if (!child) return child;
      if (child.parentNode !== this) {
        if (child.parentNode) {
          return origRemoveChild.call(child.parentNode, child);
        }
        return child;
      }
      return origRemoveChild.call(this, child);
    };

    const origInsertBefore = Node.prototype.insertBefore;
    Node.prototype.insertBefore = function (newNode: any, refNode: any) {
      if (refNode && refNode.parentNode !== this) {
        if (refNode.parentNode) {
          return origInsertBefore.call(refNode.parentNode, newNode, refNode);
        }
        return newNode;
      }
      return origInsertBefore.call(this, newNode, refNode);
    };
  }, []);

  return null;
}
