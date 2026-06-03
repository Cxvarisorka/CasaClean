import { motion } from "framer-motion";
import { pageTransition } from "@/animations/pageTransitions";

/*
 * Page
 * ----
 * The animated wrapper every routed page renders into. It supplies the
 * enter/exit transition consumed by the router's <AnimatePresence>, so pages
 * themselves stay focused on content, not motion plumbing.
 */

export function Page({ children, className }) {
  return (
    <motion.div
      variants={pageTransition}
      initial="initial"
      animate="animate"
      exit="exit"
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default Page;
