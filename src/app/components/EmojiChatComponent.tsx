import { useState } from "react";
import { Popover } from "react-tiny-popover";
import React from "react";
type EmojiChatComponentType = {
  code: string;
  size: string;
};
export default function EmojiChatComponent({
  code,
  size,
}: EmojiChatComponentType) {
  const [open, setOpen] = useState(false);
  return (
    <Popover
      isOpen={open}
      positions={["right"]}
      content={
        <div
          style={{
            marginBottom: size === "5em" ? "4rem" : "0.75rem",
          }}
          className="cursor-pointer text-white p-2 animate-popOut rounded-md shadow-md bg-lime-700"
        >
          {code}
        </div>
      }
    >
      <span
        className="cursor-pointer"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        {/*@ts-expect-error: em-emoji not detected by jsx */}
        <em-emoji size={size} fallback={code} shortcodes={code}></em-emoji>
      </span>
    </Popover>
  );
}
