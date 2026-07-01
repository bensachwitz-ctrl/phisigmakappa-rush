import React from "react";

/**
 * Closes a modal when the user presses Escape.
 *
 * Registers a `keydown` listener on `window` while the modal is mounted and
 * invokes `onClose` on the Escape key. The listener is cleaned up on unmount.
 * `onClose` is read from a ref so the effect never needs to re-subscribe when
 * the callback identity changes between renders.
 */
export function useEscapeClose(onClose: () => void) {
  const onCloseRef = React.useRef(onClose);
  onCloseRef.current = onClose;

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCloseRef.current();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}
