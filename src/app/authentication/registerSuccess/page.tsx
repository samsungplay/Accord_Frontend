"use client";
import PrimaryButton from "@/app/components/PrimaryButton";
import { GiPartyPopper } from "react-icons/gi";
import { useRouter } from "next/navigation";
import React from "react";

export default function RegisterSuccessPage() {
  const router = useRouter();

  return (
    <div className="absolute p-4 h-full w-full">
      <div className="relative top-[30%] text-center text-white w-full text-2xl">
        <div className="text-lime-200 flex w-full justify-center">
          <GiPartyPopper size={128}></GiPartyPopper>
        </div>
        <p className="font-bold text-4xl">Onset of Harmony!</p>

        <PrimaryButton
          onclick={() => router.replace("/authentication")}
          customStyles={"mt-5 w-full h-[5rem]"}
        >
          Back to login
        </PrimaryButton>
      </div>
    </div>
  );
}
