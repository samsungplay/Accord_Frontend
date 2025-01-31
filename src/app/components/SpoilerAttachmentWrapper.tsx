import React, { useEffect, useState } from "react";
type SpoilerAttachmentWrapperType = {
  children: React.ReactNode;
  active: boolean;
};
export default function SpoilerAttachmentWrapper({
  children,
  active,
}: SpoilerAttachmentWrapperType) {
  const [hidden, setHidden] = useState(active);
  useEffect(() => {
    setHidden(active);
  }, [active]);
  return (
    <div
      onClick={() => {
        if (hidden) setHidden(false);
      }}
      className={`relative`}
    >
      <div
        className={`absolute top-[50%] left-[50%] z-[1] translate-x-[-50%] translate-y-[-50%] ${
          hidden ? "block" : "hidden"
        } 
            px-2 py-1 font-bold text-white bg-lime-700 rounded-md cursor-pointer transition hover:bg-opacity-70`}
      >
        SPOILER
      </div>
      <div
        style={{
          pointerEvents: hidden ? "none" : "all",
        }}
        className={`${hidden ? "blur-xl" : "blur-none"}`}
      >
        {children}
      </div>
    </div>
  );
}
