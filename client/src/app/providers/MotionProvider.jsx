import { MotionConfig } from "framer-motion";

/*
 * MotionProvider
 * --------------
 * Centralizes Framer Motion configuration. `reducedMotion="user"` makes every
 * animation in the tree automatically honor the OS "reduce motion" setting,
 * complementing the CSS-level handling in globals.css. A single transition
 * default keeps incidental animations consistent with our easing tokens.
 *
 * The transition is a module constant rather than an inline literal: as a
 * literal it was a new object on every render of the provider, which sits above
 * the entire app, so it invalidated MotionConfig's context each time.
 */

const DEFAULT_TRANSITION = { duration: 0.45, ease: [0.22, 1, 0.36, 1] };

export function MotionProvider({ children }) {
  return (
    <MotionConfig reducedMotion="user" transition={DEFAULT_TRANSITION}>
      {children}
    </MotionConfig>
  );
}

export default MotionProvider;
