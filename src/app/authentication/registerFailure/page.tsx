"use client";
import React from "react";
import PrimaryButton from "@/app/components/PrimaryButton";
import { useRouter } from "next/navigation";
import { RiPassExpiredFill } from "react-icons/ri";

export default function RegisterFailPage() {
  const router = useRouter();

  return (
    <div className="absolute p-4 h-full w-full">
      <div className="relative top-[30%] text-center text-white w-full text-2xl">
        <div className="text-lime-200 flex w-full justify-center">
          <RiPassExpiredFill size={128} />
        </div>
        <p className="font-bold text-4xl">Harmony Disturbed...</p>
        <p className="font-bold text-2xl">
          Session Expired, Please Login Again!
        </p>

        <PrimaryButton
          onclick={() => router.replace("/authentication")}
          customStyles={"mt-5 w-full h-[5rem]"}
        >
          Back to Login
        </PrimaryButton>
      </div>
    </div>
  );
}
