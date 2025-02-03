"use client";
import { useRouter } from "next/navigation";
import { useCallback, useContext } from "react";
import { IoIosLogOut } from "react-icons/io";
import React from "react";
import { useMutation } from "@tanstack/react-query";
import api from "../api/api";
import ModalUtils from "../util/ModalUtil";
import ModalContext from "../contexts/ModalContext";
export default function Header({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const modalContext = useContext(ModalContext);

  const logoutMutation = useMutation({
    mutationFn: () => {
      return api.post(`/users/logout`);
    },
    onSettled(data) {
      if (data?.status === 200) {
        setTimeout(() => {
          router.replace("/authentication");
        }, 50);
      } else if (data) {
        ModalUtils.handleGenericError(modalContext, data);
      }
    },
  });
  const logout = useCallback(() => {
    if (!logoutMutation.isPending) {
      logoutMutation.mutate();
    }
  }, [logoutMutation.isPending]);

  //   const statusMutation = useMutation({
  //     mutationFn: (status: string) => {
  //       return api.post('/users/status', status)
  //     },
  //   })

  return (
    <div
      id="header"
      className="shadow-md border-white flex relative justify-end p-2 gap-2 bg-lime-400 h-fit items-center"
    >
      {children}

      <div
        className="group relative cursor-pointer text-lime-200 hover:text-lime-700 transition z-[10]"
        onClick={logout}
      >
        <IoIosLogOut size={24} />

        <div className="hidden group-hover:flex absolute right-0 flex-col">
          <div className="relative text-white top-1.5 rounded-md bg-lime-700 shadow-md p-1 text-sm">
            Logout
            <div
              className="absolute ml-auto w-0 h-0 bottom-[1.6rem] left-[2.1rem] border-l-[5px] border-solid border-l-transparent
                    border-r-[5px] border-r-transparent border-b-[10px] border-b-lime-700"
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
}
