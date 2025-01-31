"use client";
import { useState } from "react";
import { FaCheck, FaCopy } from "react-icons/fa";
import { RenderElementProps } from "slate-react";
import React from "react";

export default function CodeBlock({
  attributes,
  children,
  element,
}: RenderElementProps) {
  const [clicked, setClicked] = useState(false);

  return (
    <div
      {...attributes}
      className="group font-mono w-[95%] p-2 bg-lime-400 text-lime-700 rounded-md relative"
    >
      {children}
      <div
        onClick={() => {
          navigator.clipboard.writeText(element.content || "");
          if (!clicked) setClicked(true);
        }}
        className="hidden group-hover:block absolute right-0 top-0 p-2 cursor-pointer"
      >
        {!clicked ? <FaCopy /> : <FaCheck />}
      </div>
    </div>
  );
}
