import React, { useState } from "react";

type PrimaryRadioGroupType = {
  keys?: string[];
  items: React.ReactNode[];
  customBackgroundColor?: string;
  defaultSelectedId?: number;
  onClick?: (index: number) => Promise<boolean>;
};

export default function PrimaryRadioGroup({
  items,
  customBackgroundColor = "bg-white",
  defaultSelectedId = 0,
  keys,
  onClick,
}: PrimaryRadioGroupType) {
  const [selectedId, setSelectedId] = useState(defaultSelectedId);

  return (
    <div className={`${customBackgroundColor} flex flex-col`}>
      {items.map((item, i) => {
        return (
          <div
            key={keys ? keys[i] : i}
            className="flex items-center w-full gap-2"
          >
            {item}
            <div
              onClick={async () => {
                if (onClick !== undefined) {
                  if (await onClick(i)) {
                    setSelectedId(i);
                  }
                } else {
                  setSelectedId(i);
                }
              }}
              className={`rounded-full ml-auto mt-1 p-2 w-4 h-4 bg-lime-500 cursor-pointer border-lime-400 border-4
                    transition hover:bg-lime-700 ${
                      selectedId === i && "bg-lime-700"
                    }`}
            ></div>
          </div>
        );
      })}
    </div>
  );
}
