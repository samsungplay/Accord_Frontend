import React from "react";
type MenuBoxType = {
  menus: (string | React.ReactNode)[];
  styles?: ("default" | "danger" | "primary")[];
  onClicks?: (() => void)[];
};
export default function MenuBox({
  menus,
  styles = [],
  onClicks = [],
}: MenuBoxType) {
  if (styles.length == 0) {
    styles = menus.map(() => "default");
  }
  if (onClicks.length == 0) {
    onClicks = menus.map(() => () => {});
  }
  return (
    <div className="menu p-2 bg-lime-700 text-white rounded-md flex flex-col text-sm">
      {menus.map((e, i) => {
        return (
          <div key={i} onClick={onClicks[i]}>
            {styles[i] === "default" && (
              <div className="hover:bg-lime-500 p-1 rounded-md text-center cursor-pointer transition">
                {e}
              </div>
            )}
            {styles[i] === "danger" && (
              <div className="hover:bg-red-500 p-1 rounded-md text-center text-red-500 hover:text-white cursor-pointer transition">
                {e}
              </div>
            )}
            {styles[i] === "primary" && (
              <div className="hover:bg-lime-500 text-lime-400 p-1 rounded-md text-center hover:text-white cursor-pointer transition">
                {e}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
