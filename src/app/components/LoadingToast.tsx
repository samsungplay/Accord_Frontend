import { ClockLoader } from "react-spinners";
import React from "react";
export default function LoadingToast() {
  return (
    <div className="bg-lime-400 text-lime-700 rounded-md shadow-md fixed z-50 bottom-[10%] left-[50%] translate-x-[-50%] p-2 flex items-center">
      <div className="sm:hidden">
        <ClockLoader color={"#4d7c0f"} size={12} />
      </div>
      <div className="hidden sm:block md:hidden">
        <ClockLoader color={"#4d7c0f"} size={16} />
      </div>
      <div className="hidden md:block lg:hidden">
        <ClockLoader color={"#4d7c0f"} size={24} />
      </div>
      <div className="hidden lg:block">
        <ClockLoader color={"#4d7c0f"} size={36} />
      </div>

      <p className="ml-2 text-xs sm:text-sm md:text-base lg:text-lg text-lime-600">
        App is loading content.. Please wait!
      </p>
    </div>
  );
}
