import { MotionConfig } from "framer-motion";

/*
 * MotionProvider
 * --------------
 * Centralizes Framer Motion configuration. `reducedMotion="user"` makes every
 * animation in the tree automatically honor the OS "reduce motion" setting,
 * complementing the CSS-level handling in globals.css. A single transition
 * default keeps incidental animations consistent with our easing tokens.
 */

export function MotionProvider({ children }) {
  return (
    <MotionConfig
      reducedMotion="user"
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </MotionConfig>
  );
}

export default MotionProvider;
