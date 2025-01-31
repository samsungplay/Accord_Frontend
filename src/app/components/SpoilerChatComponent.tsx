import React, { useState } from "react";
type SpoilerChatComponentType = {
  children: React.ReactNode;
};
export default function SpoilerChatComponent({
  children,
}: SpoilerChatComponentType) {
  const [hidden, setHidden] = useState(true);

  return (
    <span
      onClick={() => {
        if (hidden) setHidden(false);
      }}
      className={`transition hover:bg-opacity-70 ${
        hidden
          ? "bg-lime-800 text-transparent cursor-pointer"
          : "bg-lime-700 text-lime-400 cursor-text"
      }`}
    >
      {children}
    </span>
  );
}
