import { useContext, useEffect, useState } from "react";
import { MdKeyboardDoubleArrowRight } from "react-icons/md";
import ContentDisplayContext from "../contexts/ContentDisplayContext";
import React from "react";
import ModalContext from "../contexts/ModalContext";
import { FaGear } from "react-icons/fa6";

import FloatingButton from "./FloatingButton";
import ModalUtils from "../util/ModalUtil";
import { GiPeaceDove } from "react-icons/gi";

export default function Sidebar() {
  const displayContext = useContext(ContentDisplayContext);
  const modalContext = useContext(ModalContext);
  const [appIcon, setAppIcon] = useState("Default");

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === "appIcon") {
        setAppIcon(appIcon);
      }
    };

    window.addEventListener("storage", handler);

    setAppIcon(localStorage.getItem("appIcon") ?? "Default");

    return () => {
      window.removeEventListener("storage", handler);
    };
  });
  return (
    <div className="w-[2.1rem] sm:w-[5rem] shadow-md h-full bg-lime-800 flex flex-col items-center z-50">
      {appIcon === "Default" && (
        <div className="mb-auto mt-2 rounded-md shadow-xl bg-lime-600 p-1 md:p-2">
          <div className="hidden md:block text-white">
            <GiPeaceDove size={48} />
          </div>

          <div className="md:hidden text-white">
            <GiPeaceDove size={16} />
          </div>
        </div>
      )}

      {appIcon === "SimpleLight" && (
        <div className="mb-auto mt-2 rounded-md shadow-xl bg-lime-300 p-1 md:p-2">
          <div className="hidden md:block text-lime-500">
            <GiPeaceDove size={48} />
          </div>

          <div className="md:hidden text-lime-500">
            <GiPeaceDove size={16} />
          </div>
        </div>
      )}

      {appIcon === "ShadeDark" && (
        <div className="mb-auto mt-2 rounded-md shadow-xl bg-gradient-to-br from-lime-500 to-lime-700 dark:from-lime-400 dark:to-lime-200 p-1 md:p-2">
          <div className="hidden md:block text-white">
            <GiPeaceDove size={48} />
          </div>

          <div className="md:hidden text-white">
            <GiPeaceDove size={16} />
          </div>
        </div>
      )}

      {appIcon === "FieryOrange" && (
        <div className="mb-auto mt-2 rounded-md shadow-xl bg-gradient-to-br from-orange-400 to-orange-600 dark:from-orange-500 dark:to-orange-300 p-1 md:p-2">
          <div className="hidden md:block text-orange-700">
            <GiPeaceDove size={48} />
          </div>

          <div className="md:hidden text-orange-700">
            <GiPeaceDove size={16} />
          </div>
        </div>
      )}

      {appIcon === "GreenYellow" && (
        <div className="mb-auto mt-2 rounded-md shadow-xl bg-gradient-to-br from-yellow-500 to-lime-500 dark:from-yellow-400 dark:to-lime-400 p-1 md:p-2">
          <div className="hidden md:block text-lime-200">
            <GiPeaceDove size={48} />
          </div>

          <div className="md:hidden text-lime-200">
            <GiPeaceDove size={16} />
          </div>
        </div>
      )}

      {appIcon === "RainBlue" && (
        <div className="mb-auto mt-2 rounded-md shadow-xl bg-gradient-to-br from-blue-500 to-lime-500 dark:from-blue-400 dark:to-lime-400 p-1 md:p-2">
          <div className="hidden md:block text-blue-300">
            <GiPeaceDove size={48} />
          </div>

          <div className="md:hidden text-blue-300">
            <GiPeaceDove size={16} />
          </div>
        </div>
      )}

      {appIcon === "WindGray" && (
        <div className="mb-auto mt-2 rounded-md shadow-xl bg-gradient-to-br from-gray-200 to-gray-400 dark:from-gray-700 dark:to-gray-500 p-1 md:p-2">
          <div className="hidden md:block text-lime-600">
            <GiPeaceDove size={48} />
          </div>

          <div className="md:hidden text-lime-600">
            <GiPeaceDove size={16} />
          </div>
        </div>
      )}

      <div
        id="subSidebarOpener"
        onClick={() => {
          if (displayContext?.contentMode !== "showSubsidebar") {
            displayContext?.contentModeSetter("showSubsidebar");
          } else {
            displayContext.contentModeSetter("hideSubsidebar");
          }
        }}
        className="lg:hidden text-lime-500 p-1 sm:p-4 rounded-full cursor-pointer bg-lime-600 mt-2"
      >
        <div
          className={`${
            displayContext?.contentMode === "showSubsidebar"
              ? "rotate-180"
              : "rotate-0"
          } transition duration-200 hidden sm:block`}
        >
          {" "}
          <MdKeyboardDoubleArrowRight size={24} />
        </div>
        <div
          className={`${
            displayContext?.contentMode === "showSubsidebar"
              ? "rotate-180"
              : "rotate-0"
          } transition duration-200 sm:hidden`}
        >
          {" "}
          <MdKeyboardDoubleArrowRight size={12} />
        </div>
      </div>

      <div className="mt-auto">
        <FloatingButton
          description={"Settings"}
          backgroundColor="bg-transparent"
          onClick={() => {
            ModalUtils.openSettingsPage(modalContext);
          }}
        >
          <div className="hidden md:block">
            <FaGear size={48} />
          </div>

          <div className="md:hidden">
            <FaGear size={16} />
          </div>
        </FloatingButton>
      </div>
    </div>
  );
}
