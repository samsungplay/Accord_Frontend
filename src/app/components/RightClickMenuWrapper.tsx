import React, { MouseEvent, useCallback, useRef, useState } from "react";
import { useOnClickOutside } from "usehooks-ts";
export default function RightClickMenuWrapper({
  children,
  menu,
  disabled,
  supportLeftClick = true,
  additionalOnClick,
}: {
  children: React.ReactNode;
  menu: React.ReactNode;
  disabled?: boolean;
  supportLeftClick?: boolean;
  additionalOnClick?: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [menuX, setMenuX] = useState(0);
  const [menuY, setMenuY] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const handleShowMenu = useCallback((e: MouseEvent) => {
    e.preventDefault();
    setShowMenu((prev) => !prev);

    setMenuX(e.nativeEvent.offsetX);
    setMenuY(e.nativeEvent.offsetY);
  }, []);

  useOnClickOutside(ref, (e) => {
    let node = e.target;

    const maxDepth = 10;
    let depth = 0;
    while (node && node instanceof HTMLElement && depth < maxDepth) {
      if (node.className.includes("rightClickMenuWrapperExclude")) {
        return;
      }
      node = node.parentElement;

      depth++;
    }
    setTimeout(() => setShowMenu(false), 100);
  });

  return (
    <div
      ref={ref}
      className="cursor-pointer relative"
      onContextMenu={(e) => handleShowMenu(e)}
      onClick={(e) => {
        if (supportLeftClick) {
          handleShowMenu(e);
        }
        if (additionalOnClick) {
          additionalOnClick();
        }
      }}
    >
      {children}
      {showMenu && !disabled && (
        <div
          className="animate-popOut shadow-md absolute z-[70]"
          style={{
            top: menuY,
            left: menuX,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {menu}
        </div>
      )}
    </div>
  );
}
