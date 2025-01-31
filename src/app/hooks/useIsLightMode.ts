import { useEffect, useState } from "react";

const useIsLightMode = () => {
  const [isLightMode, setIsLightMode] = useState(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("appTheme") ?? "Dark") === "Light";
    }
    return false;
  });

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === "appTheme") {
        setIsLightMode(e.newValue === "Light");
      }
    };
    window.addEventListener("storage", handler);

    return () => window.removeEventListener("storage", handler);
  }, []);

  return isLightMode;
};
export default useIsLightMode;
