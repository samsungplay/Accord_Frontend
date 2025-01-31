import React, { useCallback, useContext, useState } from "react";
import PrimaryInput from "./PrimaryInput";
import { useMutation } from "@tanstack/react-query";
import api from "../api/api";

import ModalUtils from "../util/ModalUtil";
import ModalContext from "../contexts/ModalContext";
import PrimaryButton from "./PrimaryButton";
import { FaCheck } from "react-icons/fa";

export default function ChangePasswordForm() {
  const [pwdStrength, setPwdStrength] = useState(0.0);
  const [pwdError, setPwdError] = useState("");
  const [confirmPwdError, setConfirmPwdError] = useState("");
  const [newPwdError, setNewPwdError] = useState("");

  const modalContext = useContext(ModalContext);
  const changePasswordMutation = useMutation({
    mutationFn: ({
      oldPassword,
      newPassword,
    }: {
      oldPassword: string;
      newPassword: string;
    }) => {
      return api.post("/users/password", {
        oldPassword,
        newPassword,
      });
    },

    onSettled(data) {
      if (data?.status === 400) {
        if (data.data === "Incorrect password") {
          setPwdError(data.data);
        } else if (data.data === "Invalid password") {
          setNewPwdError(data.data);
        }
      } else if (data?.status === 200) {
        ModalUtils.openGenericModal(
          modalContext,
          "NOTE",
          "",
          undefined,
          <div className="flex justify-center items-center gap-2 text-lime-300">
            <FaCheck />
            Password has been successfully updated
          </div>
        );
      } else if (data) {
        ModalUtils.handleGenericError(modalContext, data);
      }
    },
  });

  const handleChangePassword = useCallback(() => {
    setPwdError("");
    setConfirmPwdError("");
    setNewPwdError("");

    setTimeout(() => {
      const currentPwd = (
        document.getElementById("currentPwdInput") as HTMLInputElement
      ).value;
      const newPwd = (
        document.getElementById("registerPassword") as HTMLInputElement
      ).value;
      const confirmPwd = (
        document.getElementById("confirmPwdInput") as HTMLInputElement
      ).value;

      let hasError = false;
      if (currentPwd.length === 0 || currentPwd.length > 25) {
        setPwdError("Invalid password");
        hasError = true;
      }

      if (newPwd.length === 0 || newPwdError.length > 25 || pwdStrength < 0.7) {
        setNewPwdError("Invalid new password");
        hasError = true;
      }

      if (confirmPwd.length === 0 || confirmPwd !== newPwd) {
        setConfirmPwdError("Incorrect confirm password");
        hasError = true;
      }

      if (!changePasswordMutation.isPending && !hasError) {
        changePasswordMutation.mutate({
          oldPassword: currentPwd,
          newPassword: newPwd,
        });
      }
    }, 100);
  }, [pwdStrength, changePasswordMutation]);
  const getPwdStrengthLabel = useCallback(
    (pwdStrength: number) => {
      if (pwdStrength < 0.3) {
        return "Very Weak";
      }
      if (pwdStrength < 0.5) {
        return "Weak";
      }
      if (pwdStrength < 0.7) {
        return "Moderate";
      }
      if (pwdStrength < 0.9) {
        return "Strong";
      }

      return "Very Strong";
    },
    [pwdStrength]
  );
  return (
    <div className="flex flex-col min-w-[30vw]">
      <p className="text-opacity-70 text-white">
        Enter the informations below.
      </p>
      <PrimaryInput
        errorMessage={pwdError}
        id="currentPwdInput"
        type="password"
        label="CURRENT PASSWORD"
        customStyles="mt-2"
      />
      <PrimaryInput
        errorMessage={newPwdError}
        setPwdStrength={setPwdStrength}
        id="registerPassword"
        type="password"
        label="NEW PASSWORD"
        description={
          "Try adding special characters, lowercase/uppercase letters, and numbers."
        }
        customStyles="mt-2"
      />
      <div className="flex ml-1 mt-1">
        <p className={`text-opacity-70}`}>
          Password Strength:{" "}
          <span className="text-lime-300">
            {getPwdStrengthLabel(pwdStrength)}
          </span>
        </p>
        <div
          className="relative ml-2 mt-[.35rem] bg-lime-300 rounded-md
                                w-[15rem] h-[1rem]"
        >
          <div
            className="absolute bg-gradient-to-r from-lime-400 to-lime-600 rounded-md border-white
                                    h-[1rem] dark:from-lime-500 dark:to-lime-300"
            style={{
              width: 15 * pwdStrength + "rem",
            }}
          />
        </div>
      </div>
      <PrimaryInput
        errorMessage={confirmPwdError}
        customStyles="mt-2"
        id="confirmPwdInput"
        type="password"
        label="CONFIRM NEW PASSWORD"
      />

      <PrimaryButton
        disabled={changePasswordMutation.isPending}
        onclick={handleChangePassword}
      >
        Done
      </PrimaryButton>
    </div>
  );
}
