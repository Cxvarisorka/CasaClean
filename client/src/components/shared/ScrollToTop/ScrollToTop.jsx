import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/*
 * ScrollToTop
 * -----------
 * Resets scroll position on route change (but preserves in-page hash anchors).
 * Mounted once inside the router so every navigation starts at the top.
 */

export function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) return; // let anchored navigation scroll to its target
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname, hash]);

  return null;
}

export default ScrollToTop;
