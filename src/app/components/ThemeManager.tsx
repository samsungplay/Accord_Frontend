"use client";
import React, { useLayoutEffect } from "react";
import nightwind from "nightwind/helper";
export default function ThemeManager() {
  useLayoutEffect(() => {
    const theme = localStorage.getItem("appTheme") ?? "Dark";
    if (theme === "Light") {
      nightwind.enable(true);
    } else {
      nightwind.enable(false);
    }

    const saturation = localStorage.getItem("saturationScale") ?? "100.0";

    const val = parseFloat(saturation);

    if (!isNaN(val)) {
      document.body.style.filter = `saturate(${val}%)`;
    }

    const reducedMotion = localStorage.getItem("reducedMotion") ?? "no";

    if (reducedMotion === "yes") {
      const style = document.createElement("style");
      style.innerHTML = `
          *, *::before, *::after {
            animation: none !important;
            transition: none !important;
          }
        `;
      style.id = "disable-animations";
      document.head.appendChild(style);
    } else {
      const style = document.getElementById("disable-animations");
      if (style) {
        style.remove();
      }
    }
  });

  return <></>;
}
