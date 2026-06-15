"use client";

import { useEffect } from "react";

export function RemoveBisAttributes() {
  useEffect(() => {
    const removeBisAttributes = (node: Node) => {
      if (node.nodeType === 1) {
        const el = node as Element;
        if (el.hasAttribute("bis_skin_checked")) {
          el.removeAttribute("bis_skin_checked");
        }
        const children = el.querySelectorAll("[bis_skin_checked]");
        for (let i = 0; i < children.length; i++) {
          children[i].removeAttribute("bis_skin_checked");
        }
      }
    };

    const observer = new MutationObserver((mutations) => {
      for (let i = 0; i < mutations.length; i++) {
        const addedNodes = mutations[i].addedNodes;
        for (let j = 0; j < addedNodes.length; j++) {
          removeBisAttributes(addedNodes[j]);
        }
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, []);

  return null;
}
