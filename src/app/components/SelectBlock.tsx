import React from "react";
type SelectBlockType = {
  children: React.ReactNode;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  attributes: any;
  onClick?: () => void;
};
export default function SelectBlock({
  attributes,
  children,
  onClick = () => {},
}: SelectBlockType) {
  return (
    <span
      {...attributes}
      contentEditable={false}
      onClick={onClick}
      className="bg-lime-700 inline px-2 mx-1 rounded-md shadow-md text-lime-500 text-sm whitespace-nowrap"
    >
      <span className="inline mr-1 cursor-pointer hover:text-lime-300 transition">
        X
      </span>
      {children}
    </span>
  );
}
