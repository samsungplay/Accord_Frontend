import { ClipLoader } from "react-spinners";
import React, { useContext, useEffect, useRef, useState } from "react";
import ToastContext from "../contexts/ToastContext";
type PrimaryToastType = {
  message: string | React.ReactNode;
  type: string;
};
export default function PrimaryToast({ message, type }: PrimaryToastType) {
  const [playExitAnimation, setPlayExitAnimation] = useState(false);
  const toastContext = useContext(ToastContext);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef2 = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    if (timerRef2.current) {
      clearTimeout(timerRef2.current);
    }
    setPlayExitAnimation(false);

    if (type === "short") {
      timerRef.current = setTimeout(() => {
        setPlayExitAnimation(true);
        timerRef2.current = setTimeout(() => {
          toastContext?.setOpen(false);
          setPlayExitAnimation(false);
        }, 1000);
      }, 1000);
    }
  }, [type]);
  return (
    <div
      className={`bg-lime-300 ${
        playExitAnimation ? "animate-fadeOut" : "animate-fadeIn"
      } text-lime-700 rounded-md shadow-md fixed z-50 bottom-[10%] left-[50%] translate-x-[-50%] p-2 flex items-center`}
    >
      {toastContext?.showLoader && (
        <>
          <div className="sm:hidden">
            <ClipLoader color={"#4d7c0f"} size={12} />
          </div>
          <div className="hidden sm:block md:hidden">
            <ClipLoader color={"#4d7c0f"} size={16} />
          </div>
          <div className="hidden md:block lg:hidden">
            <ClipLoader color={"#4d7c0f"} size={24} />
          </div>
          <div className="hidden lg:block">
            <ClipLoader color={"#4d7c0f"} size={36} />
          </div>
        </>
      )}

      <div className="ml-2 text-xs sm:text-sm md:text-base lg:text-lg text-lime-600">
        {message}
      </div>
    </div>
  );
}
