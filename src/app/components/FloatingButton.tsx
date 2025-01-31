"use client";
import { MouseEvent, useRef, useState } from "react";
import { Popover } from "react-tiny-popover";
import { useOnClickOutside } from "usehooks-ts";
import React from "react";
import GenericUtil from "../util/GenericUtil";
type FloatingButtonType = {
  onClick?: (e: MouseEvent) => void;
  description?: string;
  children: React.ReactNode;
  menu?: React.ReactNode;
  hoverColor?: string;
  disabled?: boolean;
  direction?: "up" | "down";
  backgroundColor?: string;
  backgroundGroupHoverColor?: string;
  customPosition?: string;
  customTextColor?: string;
  customDescriptionSize?: string;
  parentElement?: HTMLElement;
};
export default function FloatingButton({
  onClick,
  description,
  children,
  menu,
  hoverColor = "hover:text-lime-500",
  backgroundColor = "bg-lime-600",
  disabled = false,
  direction = "up",
  customTextColor = "text-lime-300",
  backgroundGroupHoverColor = "group-hover:bg-lime-700",
  customDescriptionSize = "text-sm",
  parentElement,
}: FloatingButtonType) {
  const [showMenu, setShowMenu] = useState(false);
  const [menuX, setMenuX] = useState(0);
  const [menuY, setMenuY] = useState(0);
  const [showDescription, setShowDescription] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const handleShowMenu = (e: MouseEvent) => {
    setShowMenu((prev) => !prev);
    setMenuX(e.clientY);
    setMenuY(e.clientX);
  };

  useOnClickOutside(ref, () => {
    setTimeout(() => setShowMenu(false), 100);
  });
  return (
    <>
      <div
        ref={ref}
        className={`${
          disabled ? "opacity-50 cursor-not-allowed" : "opacity-100"
        } ${backgroundColor} ${backgroundGroupHoverColor} rounded-full p-2 cursor-pointer ml-auto ${customTextColor}`}
        onClick={
          onClick && !disabled
            ? onClick
            : menu && !disabled
            ? handleShowMenu
            : () => {}
        }
      >
        <div
          className={`relative ${
            disabled ? "cursor-not-allowed" : "cursor-pointer"
          } ${!disabled ? hoverColor : ""} transition`}
        >
          {!description || (disabled && <div>{children}</div>)}

          {description && !disabled && direction === "up" && (
            <Popover
              containerStyle={{
                zIndex: 105,
              }}
              reposition={false}
              isOpen={showDescription}
              positions={["top"]}
              parentElement={parentElement}
              content={
                <div
                  className={`animate-popOut z-20 rounded-md bg-lime-700 shadow-md p-1 ${customDescriptionSize} text-white whitespace-nowrap mb-2`}
                >
                  {description}
                  <div
                    className="absolute ml-auto w-0 h-0 bottom-0 translate-y-[100%] right-[45%] border-l-[5px] border-solid border-l-transparent
                 border-r-[5px] border-r-transparent border-b-[10px] border-b-lime-700 dark:border-b-lime-200 rotate-180"
                  ></div>
                </div>
              }
            >
              <div
                className=""
                onMouseEnter={() => {
                  if (!GenericUtil.isTouchDevice()) setShowDescription(true);
                }}
                onMouseLeave={() => setShowDescription(false)}
              >
                {children}
              </div>
            </Popover>
          )}

          {description && !disabled && direction === "down" && (
            <Popover
              containerStyle={{
                zIndex: 105,
              }}
              reposition={false}
              isOpen={showDescription}
              positions={["bottom"]}
              parentElement={parentElement ?? document.body}
              content={
                <div className="animate-popOut z-20 rounded-md bg-lime-700 shadow-md p-1 text-sm text-white whitespace-nowrap mt-2">
                  {description}
                  <div
                    className="absolute ml-auto w-0 h-0 top-0 translate-y-[-100%] right-[45%] border-l-[5px] border-solid border-l-transparent
             border-r-[5px] border-r-transparent border-b-[10px] border-b-lime-700 dark:border-b-lime-200"
                  ></div>
                </div>
              }
            >
              <div
                className=""
                onMouseEnter={() => {
                  if (!GenericUtil.isTouchDevice()) setShowDescription(true);
                }}
                onMouseLeave={() => setShowDescription(false)}
              >
                {children}
              </div>
            </Popover>
          )}
        </div>
      </div>
      {showMenu && menu && (
        <div
          className="absolute z-[100]"
          style={{
            top: menuX,
            left: menuY,
          }}
        >
          {menu}
        </div>
      )}
    </>
  );
}
