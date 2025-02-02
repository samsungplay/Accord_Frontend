import React, { useCallback, useRef, useState } from "react";
import { useOnClickOutside } from "usehooks-ts";
export default function RightClickMenuWrapper({
  children,
  menu,
  disabled,
  supportLeftClick = false,
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
  const handleShowMenu = useCallback((x: number, y: number) => {
    setShowMenu((prev) => !prev);

    setMenuX(x);
    setMenuY(y);
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

  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  return (
    <div
      ref={ref}
      className="cursor-pointer relative"
      onContextMenu={(e) => {
        e.preventDefault();
        handleShowMenu(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
      }}
      onTouchStart={(e) => {
        if (e.target instanceof HTMLElement) {
          const rect = e.target.getBoundingClientRect();
          const x = e.targetTouches[0].pageX - rect.left;
          const y = e.targetTouches[0].pageY - rect.top;
          longPressTimer.current = setTimeout(() => {
            handleShowMenu(x, y);
          }, 1000);
        }
      }}
      onTouchCancel={() => {
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
      }}
      onTouchEnd={() => {
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
      }}
      onClick={(e) => {
        e.preventDefault();
        if (supportLeftClick) {
          handleShowMenu(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
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
