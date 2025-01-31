import React from "react";

type PrimaryButtonType = {
  children: React.ReactNode;
  customStyles?: string;
  customHeight?: string;
  disabled?: boolean;
  buttonType?: "submit" | "button";
  customWidth?: string;
  onclick?: () => void;
};
export default function PrimaryButton({
  children,
  customHeight = "h-9",
  customWidth = "w-full",
  customStyles = "mt-5 bg-lime-500",
  disabled = false,
  onclick = () => {},
  buttonType = "submit",
}: PrimaryButtonType) {
  return (
    <button
      disabled={disabled}
      type={buttonType}
      onClick={() => {
        onclick();
      }}
      onFocus={(e) => {
        e.preventDefault();
        e.target.blur();
      }}
      tabIndex={-1}
      className={`${customWidth} ${customStyles} rounded-md ${customHeight} ${
        disabled && "opacity-50 text-gray-600"
      } ${disabled ? "cursor-not-allowed" : "cursor-pointer"} transition ${
        !disabled && "hover:bg-opacity-70 hover:text-lime-300"
      }`}
    >
      {children}
    </button>
  );
}
