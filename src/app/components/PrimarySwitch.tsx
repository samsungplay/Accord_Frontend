import React, { useEffect, useState } from "react";
import { FaCheck } from "react-icons/fa";
import { FaX } from "react-icons/fa6";

export default function PrimarySwitch({
  onClick,
  isActive,
  customBackground = "bg-lime-600",
}: {
  onClick: (active: boolean) => void;
  isActive: boolean;
  customBackground?: string;
}) {
  const [active, setActive] = useState(isActive);

  useEffect(() => {
    setActive(isActive);
  }, [isActive, active]);

  return (
    <div
      className={`rounded-xl w-[3rem] cursor-pointer h-[1.5rem] transition flex ${
        active ? customBackground : "bg-gray-500"
      }`}
      onClick={(e) => {
        e.stopPropagation();
        onClick(!active);
        setActive(!active);
      }}
    >
      <div
        className={`rounded-full w-[50%] aspect-square ${
          active ? "text-lime-400" : "text-gray-500"
        } bg-white grid place-content-center
      ${active && "translate-x-[100%]"} transition-all`}
      >
        {active ? <FaCheck /> : <FaX />}
      </div>
    </div>
  );
}
