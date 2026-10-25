"use client";

import { useEffect, useRef, useState } from "react";
import { bookmarkletHref } from "@/lib/bookmarklet";

export default function BookmarkletLink() {
  const link = useRef<HTMLAnchorElement>(null);
  const [href, setHref] = useState("");
  const [copied, setCopied] = useState(false);

  // React refuses to render javascript: links, so set it on the element directly.
  useEffect(() => {
    const value = bookmarkletHref(window.location.origin);
    setHref(value);
    link.current?.setAttribute("href", value);
  }, []);

  return (
    <div className="bookmarklet">
      <a ref={link} className="btn bookmarklet-link" onClick={(e) => e.preventDefault()} draggable>
        ＋ Add to wishlist
      </a>
      <button
        type="button"
        className="btn secondary"
        disabled={!href}
        onClick={async () => {
          await navigator.clipboard.writeText(href);
          setCopied(true);
        }}
      >
        {copied ? "Copied" : "Copy the code"}
      </button>
    </div>
  );
}
