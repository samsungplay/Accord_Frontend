"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FaCheck } from "react-icons/fa";
import { IoIosArrowUp } from "react-icons/io";
import { useOnClickOutside } from "usehooks-ts";
import React from "react";
type SpinnerProps = {
  data: string[];
  placeholder: string;
  defaultValue?: string;
  width: `${number}rem`;
  errorMessage?: string;
  id: string;
  rounded?: boolean;
  showSelected?: boolean;
  customInputStyles?: string;
  customMenuButtonStyles?: string;
  onSelected?: (i: number) => void;
  direction?: "up" | "down";
  selectedIndex_?: number;
};
export default function Spinner({
  showSelected = false,
  customInputStyles = "",
  customMenuButtonStyles = "",
  data,
  defaultValue,
  rounded,
  placeholder,
  width,
  errorMessage = "",
  id,
  onSelected,
  direction = "up",
  selectedIndex_,
}: SpinnerProps) {
  const [showMenu, setShowMenu] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuBtnRef = useRef<HTMLDivElement>(null);
  const isError = errorMessage.length > 0;
  const [selectedIndex, setSelectedIndex] = useState(
    !defaultValue ? -1 : data.indexOf(defaultValue)
  );

  useEffect(() => {
    if (selectedIndex_ !== undefined && selectedIndex_ !== -1) {
      setSelectedIndex(selectedIndex_);
    }
  }, [selectedIndex_, selectedIndex]);

  const handleClickOutsideMenu = useCallback(
    (e: MouseEvent | FocusEvent | TouchEvent) => {
      if (
        e.target !== menuBtnRef.current &&
        (e.target as Node).parentNode !== menuBtnRef.current &&
        (e.target as Node).parentNode?.parentNode !== menuBtnRef.current
      )
        setShowMenu(false);
    },
    [setShowMenu]
  );

  useOnClickOutside(menuRef, handleClickOutsideMenu);

  const inputWidth = useMemo(() => {
    const numValue = Number.parseFloat(width.substring(0, width.length - 3));
    return ((2 / 3) * numValue).toString() + "rem";
  }, [width]);

  const menuButtonWidth = useMemo(() => {
    const numValue = Number.parseFloat(width.substring(0, width.length - 3));
    return ((1 / 3) * numValue).toString() + "rem";
  }, [width]);

  return (
    <div
      className={`${isError ? "animate-jiggle" : "animate-none"} ${
        isError ? "border-red-500 border-x-2 border-y-2" : "border-none"
      } flex w-fit relative ${showMenu ? "z-[31]" : "z-[30]"}`}
    >
      <input
        name={id}
        id={id}
        ref={inputRef}
        placeholder={placeholder}
        value={data[selectedIndex]}
        readOnly
        className={`p-2 bg-lime-600 ${rounded && "rounded-s-md"}
                    focus:outline-none text-center
                    ${customInputStyles}`}
        style={{
          width: inputWidth,
        }}
      />
      <div
        style={{
          width: menuButtonWidth,
        }}
        className={`cursor-pointer bg-lime-600 grid place-content-center ${
          rounded && "rounded-e-md"
        } text-xl hover:text-lime-300 transition
            ${customMenuButtonStyles}`}
      >
        <div
          ref={menuBtnRef}
          onClick={() => {
            setShowMenu((prev) => !prev);
          }}
          className={`duration-300 transition ${
            showMenu ? "rotate-0" : "rotate-180 text-center"
          }`}
        >
          <IoIosArrowUp />
        </div>
      </div>

      {showMenu && (
        <div
          ref={menuRef}
          style={{
            width: width,
            height: "8rem",
          }}
          className={`absolute rounded-sm shadow-md ${
            direction === "down" ? "top-[100%]" : "bottom-[100%]"
          } bg-lime-600 overflow-y-scroll`}
        >
          {data.map((element, i) => {
            return (
              <div
                key={element}
                className={`
                            ${
                              showSelected &&
                              selectedIndex === i &&
                              "bg-lime-700"
                            } flex ${
                  showSelected
                    ? "justify-start py-2 px-4"
                    : "justify-center p-2"
                } items-center cursor-pointer transition hover:bg-lime-700 text-center`}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(false);
                  if (inputRef.current) {
                    inputRef.current.value = element;
                  }
                  if (showSelected) {
                    if (onSelected) {
                      onSelected(i);
                    }
                    setSelectedIndex(i);
                  }
                }}
              >
                {element}
                {showSelected && selectedIndex === i && (
                  <div className="bg-lime-700 ml-auto text-lime-400 rounded-full p-2 grid place-content-center">
                    <FaCheck size={12} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
