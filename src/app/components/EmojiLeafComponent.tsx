/* eslint-disable react/prop-types */
import { useMemo, useState } from "react";
import { Popover } from "react-tiny-popover";
import { RenderLeafProps } from "slate-react";
import React from "react";
import Constants from "../constants/Constants";

export default function EmojiLeafComponent({
  props,
  underlineLinks,
  chatFontScale,
}: {
  props: RenderLeafProps;
  underlineLinks: boolean;
  chatFontScale: number;
}) {
  const [open, setOpen] = useState(false);
  const [emoji, setEmoji] = useState<React.ReactNode | null>(null);

  const emojiPreview = useMemo(() => {
    return (
      <div className="bg-lime-500 animate-popOut text-white p-2 w-fit h-fit mb-1 shadow-md rounded-md">
        {emoji}
      </div>
    );
  }, [emoji]);

  const shortCode = useMemo(() => {
    if (props.leaf["emoticon"]) {
      const code = (Constants.emoticonConvertMap as { [key: string]: string })[
        props.leaf["emoticon"]
      ];
      return code;
    }

    return props.leaf["emoji"];
  }, [props.leaf]);

  return (
    <Popover
      containerStyle={{
        zIndex: 105,
      }}
      isOpen={open}
      content={emojiPreview}
      positions={["top"]}
      onClickOutside={() => setOpen(false)}
    >
      <span
        {...props.attributes}
        onMouseEnter={() => {
          setOpen(true);
          setEmoji(<p></p>);
          setTimeout(() => {
            setEmoji(
              <div className="">
                {/*@ts-expect-error: em-emoji not detected by jsx */}
                <em-emoji
                  fallback={shortCode}
                  shortcodes={shortCode}
                  size="1.5em"
                >
                  {/*@ts-expect-error: em-emoji not detected by jsx */}
                </em-emoji>
              </div>
            );
          }, 1);
        }}
        onMouseLeave={() => {
          setOpen(false);
        }}
        className={`
          ${props.leaf["spoiler"] ? "bg-lime-700 rounded-sm" : ""}
              ${
                props.leaf["url"] && underlineLinks
                  ? `text-blue-500 underline`
                  : ""
              }
                  ${props.leaf["emoticon"] ? "text-orange-500" : ""}
              ${props.leaf["emojisearch"] ? "text-blue-300" : ""}
              ${props.leaf["emoji"] ? "text-blue-300 cursor-pointer" : ""}
              ${props.leaf["greyed"] ? "text-lime-700" : ""}
              ${props.leaf["bold"] ? "font-bold" : ""} ${
          props.leaf["italic"] && "italic"
        }
              ${
                props.leaf["code"] &&
                "font-mono bg-lime-400 text-lime-700 rounded-md py-2"
              }
              ${props.leaf["blockquote"] && "border-l-4 border-lime-400 py-2"}
             
              ${props.leaf["underline"] && "underline"}
              ${props.leaf["strikethrough"] && "line-through"}
              ${props.leaf["subtext"] && "text-lime-700"}
              ${
                props.leaf["maskedlink"] &&
                underlineLinks &&
                "text-blue-500 underline"
              }
              ${
                props.leaf["list"] !== undefined &&
                (props.leaf["list"] as unknown as number) === 0 &&
                "before:content-['•'] before:mr-[0.25rem]"
              }
              ${
                props.leaf["list"] !== undefined &&
                (props.leaf["list"] as unknown as number) > 0 &&
                "before:content-['○'] before:mr-[0.25rem]"
              }
              whitespace-pre-wrap
              `}
        style={{
          paddingLeft:
            props.leaf["list"] !== undefined
              ? `${(props.leaf["list"] as unknown as number) * 0.5 + 0.5}rem`
              : props.leaf["blockquote"]
              ? "1rem"
              : "0rem",
          fontSize:
            props.leaf["subtext"] !== undefined
              ? 0.75 * (12 + (chatFontScale / 100.0) * (24 - 12)) + "px"
              : props.leaf["heading3"] !== undefined
              ? 1.25 * (12 + (chatFontScale / 100.0) * (24 - 12)) + "px"
              : props.leaf["heading2"] !== undefined
              ? 1.5 * (12 + (chatFontScale / 100.0) * (24 - 12)) + "px"
              : props.leaf["heading1"] !== undefined
              ? 1.875 * (12 + (chatFontScale / 100.0) * (24 - 12)) + "px"
              : "inherit",
        }}
      >
        {props.children}
      </span>
    </Popover>
  );
}
