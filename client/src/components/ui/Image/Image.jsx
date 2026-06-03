import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import { EASE_PREMIUM } from "@/animations/tokens";

/*
 * Image
 * -----
 * A resilient, premium image primitive. While loading it shows a shimmer; on
 * load it fades + settles from a slight zoom (the "blur-up" feel); on error it
 * degrades to a brand gradient so a broken CDN URL never leaves an empty box.
 * Lazy + async-decoded by default for performance.
 */

export function Image({
  src,
  alt = "",
  aspect,
  gradient = "from-brand-500 to-brand-700",
  rounded = "rounded-2xl",
  priority = false,
  zoomOnHover = false,
  className,
  imgClassName,
  overlay,
  ...props
}) {
  const [status, setStatus] = useState("loading"); // loading | loaded | error

  return (
    <div
      className={cn(
        "group relative overflow-hidden bg-ink-100",
        rounded,
        aspect,
        className
      )}
    >
      {/* Placeholder / fallback layer */}
      {status !== "loaded" && (
        <div
          className={cn(
            "absolute inset-0",
            status === "error" ? `bg-gradient-to-br ${gradient}` : "animate-shimmer"
          )}
          aria-hidden="true"
        >
          {status === "error" && (
            <div className="absolute inset-0 bg-grid opacity-10" />
          )}
        </div>
      )}

      {status !== "error" && (
        <motion.img
          src={src}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          onLoad={() => setStatus("loaded")}
          onError={() => setStatus("error")}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={status === "loaded" ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.7, ease: EASE_PREMIUM }}
          className={cn(
            "size-full object-cover",
            zoomOnHover &&
              "transition-transform duration-700 ease-out group-hover:scale-105",
            imgClassName
          )}
          {...props}
        />
      )}

      {overlay}
    </div>
  );
}

export default Image;
