"use client";

import { Dispatch, SetStateAction, useState } from "react";
import { IoCheckmark } from "react-icons/io5";
import React from "react";

type PrimaryCheckboxType = {
  onChecked?: () => void;
  onUnchecked?: () => void;
  checked?: boolean;
  setChecked?: Dispatch<SetStateAction<boolean>>;
};
export default function PrimaryCheckBox({
  onChecked,
  onUnchecked,
  checked,
  setChecked,
}: PrimaryCheckboxType) {
  if (!checked && !setChecked) {
    [checked, setChecked] = useState(false);
  }

  return (
    <>
      <div
        className="cursor-pointer w-6 h-6 grid place-content-center bg-lime-600 hover:bg-lime-500 transition border-lime-400 border-solid border-x-2 border-y-2 rounded-md"
        onClick={() => {
          if (onChecked && !checked) onChecked();
          if (onUnchecked && checked) onUnchecked();

          if (setChecked) setChecked((prev) => !prev);
        }}
      >
        <div className="text-lime-300 hover:text-lime-200">
          {checked && <IoCheckmark size={24} />}
        </div>
      </div>
    </>
  );
}
