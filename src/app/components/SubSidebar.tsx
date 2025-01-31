"use client";
import { useContext, useLayoutEffect, useRef, useState } from "react";
import { useOnClickOutside, useWindowSize } from "usehooks-ts";
import ContentDisplayContext from "../contexts/ContentDisplayContext";
import React from "react";
export default function SubSidebar({
  children,
}: {
  children: React.ReactNode;
}) {
  const displayContext = useContext(ContentDisplayContext);
  const windowSize = useWindowSize();
  const [isLargeScreen, setIsLargeScreen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    setIsLargeScreen(windowSize.width >= 1024);
    // setIsLargeScreen(true)
  }, [windowSize]);

  useOnClickOutside(ref, (e) => {
    if (displayContext?.contentMode === "hideSubsidebar") {
      return;
    }
    const node: HTMLElement = e.target as HTMLElement;
    const parentNode = node.parentNode as HTMLElement;
    const grandparentNode = parentNode.parentNode as HTMLElement;

    let currentNode = node;
    let i = 0;

    while (currentNode !== undefined && i < 30) {
      if (
        currentNode &&
        currentNode.classList &&
        currentNode.classList.contains("withinsubsidebar")
      ) {
        return;
      }

      if (!currentNode) break;

      currentNode = currentNode.parentNode as HTMLElement;
      i++;
    }

    if (
      node.id !== "subSidebarOpener" &&
      parentNode.id !== "subSidebarOpener" &&
      grandparentNode.id !== "subSidebarOpener"
    ) {
      displayContext?.contentModeSetter("hideSubsidebar");
    }
  });

  return (
    <>
      <div
        ref={ref}
        className={`-translate-x-[3rem] sm:translate-x-[0rem] ${
          displayContext?.contentMode === "showSubsidebar" &&
          !isLargeScreen &&
          "-translate-x-[18rem] sm:-translate-x-[15rem] animate-drawFromLeftFurther sm:animate-drawFromLeft"
        }
            ${
              displayContext?.contentMode === "hideSubsidebar" &&
              !isLargeScreen &&
              "animate-drawToLeftFurther sm:animate-drawToLeft"
            }
            ${
              isLargeScreen
                ? "shadow-md lg:w-[15rem] lg:flex hidden lg:flex-col h-full bg-lime-600"
                : "shadow-md w-[15rem] fixed left-[5rem] origin-left flex flex-col h-full z-30 bg-lime-600 "
            }
            `}
      >
        {children}
      </div>

      {/* {displayContext?.contentMode === 'showSubsidebar' && 
        (
            <div className="shadow-md w-[15rem] fixed left-[5rem] -translate-x-[15rem] animate-drawFromLeft origin-left flex flex-col h-full z-10 bg-lime-600">
            {children}
           </div>
        )
        }

        {
            displayContext?.contentMode === 'hideSubsidebar' &&
            <div className="shadow-md w-[15rem] fixed left-[5rem] animate-drawToLeft origin-left flex flex-col h-full z-10 bg-lime-600">
            {children}
           </div>
        }

        {
            isLargeScreen &&
            
            (
                <div className="shadow-md lg:w-[15rem] lg:flex hidden lg:flex-col h-full bg-lime-600">
                {children}
               </div>
            )
        } */}
    </>
  );
}
