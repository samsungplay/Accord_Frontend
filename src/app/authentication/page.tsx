"use client";
import { GiPeaceDove } from "react-icons/gi";
import PrimaryButton from "../components/PrimaryButton";
import PrimaryInput from "../components/PrimaryInput";
import Spinner from "../components/Spinner";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import { useWindowSize } from "usehooks-ts";

import moment from "moment";
import api from "../api/api";
import { useMutation } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";

import { FaGithub } from "react-icons/fa";

import LoadingScreen from "../components/LoadingScreen";
import Constants from "../constants/Constants";
import React from "react";

export default function AuthenticationPage() {
  const searchParams = useSearchParams();
  const [showRegister, setShowRegister] = useState(
    searchParams.has("register")
  );
  const [formHeight, setFormHeight] = useState("25rem");
  const [shouldStartFadeOut, setShouldStartFadeOut] = useState(false);
  const [submitRegisterFormData, setSubmitRegisterFormData] =
    useState<FormData | null>(null);
  const [submitLoginFormData, setSubmitLoginFormData] =
    useState<FormData | null>(null);
  //form states
  const [emailError, setEmailError] = useState("");
  const [nicknameError, setNicknameError] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [pwdError, setPwdError] = useState("");
  const [confirmPwdError, setConfirmPwdError] = useState("");
  const [birthdateError, setBirthdateError] = useState("");
  const [pwdStrength, setPwdStrength] = useState(0.0);
  const [pageLoading, setPageLoading] = useState(true);
  const windowSize = useWindowSize();
  const router = useRouter();

  useEffect(() => {
    const verifyAuthentication = async () => {
      const res = await api.get("/authentication/authenticate", {
        validateStatus: () => true,
      });
      if (res.status === 200) {
        window.location.href = "/dashboard";
      }
    };

    verifyAuthentication();
  }, []);

  const resetAndSubmitRegisterForm = useCallback(
    (e: FormData) => {
      setEmailError("");
      setNicknameError("");
      setUsernameError("");
      setPwdError("");
      setConfirmPwdError("");
      setBirthdateError("");
      setSubmitRegisterFormData(e);
    },
    [
      setEmailError,
      setNicknameError,
      setUsernameError,
      setPwdError,
      setConfirmPwdError,
      setBirthdateError,
      setSubmitRegisterFormData,
    ]
  );

  const resetAndSubmitLoginForm = useCallback(
    (e: FormData) => {
      setEmailError("");
      setPwdError("");
      setSubmitLoginFormData(e);
    },
    [setEmailError, setPwdError, setSubmitLoginFormData]
  );

  const resetFormErrors = useCallback(() => {
    setEmailError("");
    setNicknameError("");
    setUsernameError("");
    setPwdError("");
    setConfirmPwdError("");
    setBirthdateError("");
  }, [
    setEmailError,
    setNicknameError,
    setUsernameError,
    setPwdError,
    setConfirmPwdError,
    setBirthdateError,
  ]);

  useLayoutEffect(() => {
    if (windowSize.width < 768) {
      setFormHeight("100vh");
    } else {
      if (showRegister) {
        setFormHeight(searchParams.has("github") ? "30rem" : "40rem");
      } else {
        setFormHeight("25rem");
      }
    }

    if (pageLoading) {
      setPageLoading(false);
    }
  }, [windowSize]);

  const showLoginForm = useCallback(() => {
    setShouldStartFadeOut(true);
    setTimeout(() => {
      setShouldStartFadeOut(false);
      setShowRegister(false);
      resetFormErrors();
    }, 300);

    if (windowSize.width >= 768) setFormHeight("25rem");
  }, [setShowRegister, setFormHeight, resetFormErrors, windowSize]);

  const showRegisterForm = useCallback(() => {
    setShouldStartFadeOut(true);
    setTimeout(() => {
      setShowRegister(true);
      setShouldStartFadeOut(false);
      resetFormErrors();
    }, 300);
    if (windowSize.width >= 768)
      setFormHeight(searchParams.has("github") ? "30rem" : "40rem");
  }, [setShowRegister, setFormHeight, resetFormErrors, windowSize]);

  const years = useMemo(() => {
    const years = [];
    const currentYear = new Date().getFullYear();

    for (let i = currentYear - 1; i >= currentYear - 120; i--) {
      years.push(i.toString());
    }
    return years;
  }, []);

  const months = useMemo(() => {
    return [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
  }, []);

  const days = useMemo(() => {
    const days = [];
    for (let i = 1; i <= 31; i++) days.push(i.toString());
    return days;
  }, []);

  //client form validation
  const usernameRegex = new RegExp("^[\\p{L}\\p{N}_.]+$", "u");

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

  const registerGithubMutation = useMutation({
    mutationFn: (registerData: {
      email: string;
      nickname: string;
      username: string;
      birthDate: Date;
    }) => {
      return api.post("/authentication/registerGithub", {
        ...registerData,
      });
    },
    onSettled(data) {
      if (data?.status === 201) {
        router.replace("/authentication/registerSuccess");
      } else if (data?.status === 400) {
        const registerError = data.data as {
          type: "EMAIL" | "USERNAME" | "NICKNAME";
          message: string;
        };
        if (registerError.type === "EMAIL") {
          setEmailError(registerError.message);
        } else if (registerError.type === "USERNAME") {
          setUsernameError(registerError.message);
        } else if (registerError.type === "NICKNAME") {
          setNicknameError(registerError.message);
        } else if (registerError.type === "DATE") {
          setBirthdateError(registerError.message);
        }
      } else if (data?.status === 401) {
        router.replace("/authentication/registerFailure");
      }
    },
  });

  const registerMutation = useMutation({
    mutationFn: (registerData: {
      email: string;
      nickname: string;
      username: string;
      password: string;
      birthDate: Date;
    }) => {
      return api.post("/authentication/register", registerData);
    },
    onSettled(data) {
      if (data?.status === 201) {
        router.replace("/authentication/registerSuccess");
      } else if (data?.status === 400) {
        const registerError = data.data as {
          type: "EMAIL" | "USERNAME" | "NICKNAME" | "PASSWORD";
          message: string;
        };
        if (registerError.type === "EMAIL") {
          setEmailError(registerError.message);
        } else if (registerError.type === "USERNAME") {
          setUsernameError(registerError.message);
        } else if (registerError.type === "NICKNAME") {
          setNicknameError(registerError.message);
        } else if (registerError.type === "PASSWORD") {
          setPwdError(registerError.message);
        } else if (registerError.type === "DATE") {
          setBirthdateError(registerError.message);
        }
      }
    },
  });

  const loginMutation = useMutation({
    mutationFn: (loginDetails: { user: string; pwd: string }) => {
      const bytes = new TextEncoder().encode(
        loginDetails.user + ":" + loginDetails.pwd
      );
      const binString = Array.from(bytes, (byte) =>
        String.fromCodePoint(byte)
      ).join("");
      const base64 = btoa(binString);
      return api.get("/authentication/authenticate", {
        headers: {
          Authorization: "Basic " + base64,
        },
      });
    },
    onSettled(data) {
      if (data?.status === 200) {
        router.replace("/dashboard");
      } else if (data?.data && data?.data["error"]) {
        if (data.data["error"].includes("email")) {
          setEmailError(data?.data["error"]);
        } else if (data.data["error"].includes("password")) {
          setPwdError(data.data["error"]);
        }
      }
    },
  });

  useEffect(() => {
    if (submitRegisterFormData !== null) {
      setTimeout(() => {
        const e = submitRegisterFormData;
        const email = e.get("registerEmail")?.toString();
        let hasError = false;
        if (!email || email.length < 1) {
          setEmailError("Email is a required field!");
          hasError = true;
        }

        if (email) {
          if (email.length < 3) {
            setEmailError("Email is too short!");
            hasError = true;
          } else if (email.length > 50) {
            setEmailError("Email is too long!");
            hasError = true;
          }
        }

        const nickname = e.get("registerNickname")?.toString();
        if (nickname) {
          if (nickname.length > 30) {
            setNicknameError(
              "Nickname must not be more than 30 characters long!"
            );
            hasError = true;
          } else if (nickname.length < 2) {
            setNicknameError("Nickname must at least be 2 characters long!");
            hasError = true;
          }
        }

        const username = e.get("registerUsername")?.toString();
        if (!username || username.length < 1) {
          setUsernameError("Username is a required field!");
          hasError = true;
        } else if (username && !usernameRegex.test(username)) {
          setUsernameError("Username contains invalid characters!");
          hasError = true;
        } else if (username) {
          if (username.length > 30) {
            setUsernameError("Username is too long!");
            hasError = true;
          } else if (username.length < 2) {
            setUsernameError("Username must be at least 2 characters long!");
            hasError = true;
          }
        }

        const password = e.get("registerPassword")?.toString();

        if (!searchParams.has("github")) {
          if (!password || password.length < 1) {
            setPwdError("Password is a required field!");
            hasError = true;
          } else if (password && password.length > 25) {
            setPwdError("Password is too long!");
            hasError = true;
          }

          if (pwdStrength < 0.7) {
            setPwdError("Password is too weak!");
            hasError = true;
          }

          const confirmPassword = e.get("registerConfirmPassword")?.toString();

          if (!confirmPassword || confirmPassword.length < 1) {
            setConfirmPwdError("Confirm Password is a required field!");
            hasError = true;
          } else if (confirmPassword && confirmPassword !== password) {
            setConfirmPwdError("Password does not match!");
            hasError = true;
          }
        }

        const birthYear = e.get("registerBirthYear")?.toString();
        const birthMonth = e.get("registerBirthMonth")?.toString();
        const birthDate = e.get("registerBirthDate")?.toString();

        const monthMap: { [month: string]: number } = {
          January: 1,
          February: 2,
          March: 3,
          April: 4,
          May: 5,
          June: 6,
          July: 7,
          August: 8,
          September: 9,
          October: 10,
          November: 11,
          December: 12,
        };

        let birthDay;
        if (!birthYear || !birthMonth || !birthDate) {
          setBirthdateError("Birth date is a required field!");
          hasError = true;
        } else {
          const date = moment(
            `${birthYear}/${monthMap[birthMonth]}/${birthDate}`,
            "YYYY/M/D"
          );
          if (!date.isValid()) {
            setBirthdateError("Please enter a valid date!");
            hasError = true;
          }
          birthDay = date.toDate();
        }

        if (!hasError) {
          if (!searchParams.has("github")) {
            registerMutation.mutate({
              email: email!,
              username: username!,
              password: password!,
              nickname: nickname!,
              birthDate: birthDay!,
            });
          } else {
            //github registration

            registerGithubMutation.mutate({
              email: email!,
              username: username!,
              nickname: nickname!,
              birthDate: birthDay!,
            });
          }
        }
        setSubmitRegisterFormData(null);
      }, 25);
    }
  }, [submitRegisterFormData, registerMutation, registerGithubMutation]);

  useEffect(() => {
    if (submitLoginFormData != null) {
      const e = submitLoginFormData;

      setTimeout(() => {
        let hasError = false;

        const username = e.get("userEmail")?.toString() || "";
        const password = e.get("userPassword")?.toString() || "";

        if (username.length <= 3) {
          hasError = true;
          setEmailError("Please enter your username!");
        }

        if (password.length <= 3) {
          hasError = true;
          setPwdError("Please enter your password!");
        }

        if (!hasError) {
          loginMutation.mutate({
            user: username,
            pwd: password,
          });
        }
        setSubmitLoginFormData(null);
      }, 25);
    }
  }, [submitLoginFormData, loginMutation]);

  const handleRegisterForm = useCallback(
    (e: FormData) => {
      if (!searchParams.has("github") && registerMutation.isPending) {
        return;
      }

      if (searchParams.has("github") && registerGithubMutation.isPending) {
        return;
      }

      resetAndSubmitRegisterForm(e);
    },
    [registerMutation, registerGithubMutation]
  );

  const handleLoginForm = useCallback(
    (e: FormData) => {
      if (loginMutation.isPending) {
        return;
      }
      resetAndSubmitLoginForm(e);
    },
    [loginMutation]
  );

  return (
    <>
      {pageLoading ? <LoadingScreen /> : <></>}

      <div className="flex flex-col md:p-[2rem] relative">
        <div className="flex z-10 p-[2rem] md:p-0">
          <div className="text-2xl md:text-3xl lg:text-4xl">
            <GiPeaceDove color="white" />
          </div>
          <div className="ml-1 text-white font-extrabold hidden sm:block text-xl md:text-2xl lg:text-3xl">
            Accord
          </div>
        </div>

        <div
          className="fixed flex flex-col justify-center md:top-[50%] md:left-[50%] md:-translate-x-1/2 md:-translate-y-1/2 w-full md:w-[40rem] bg-lime-700 rounded-md 
    p-4 text-white md:transition-all md:duration-700"
          style={{
            height: formHeight,
          }}
        >
          <div className="flex flex-col">
            {!showRegister ? (
              <>
                <p
                  className={`${
                    shouldStartFadeOut
                      ? "animate-fadeOutDown"
                      : "animate-fadeInUp"
                  } text-2xl font-bold text-center`}
                >
                  Welcome Back!
                </p>
                <p
                  className={`${
                    shouldStartFadeOut
                      ? "animate-fadeOutDown"
                      : "animate-fadeInUp"
                  } text-xl text-center text-opacity-70`}
                >
                  Have you been at peace?
                </p>
              </>
            ) : (
              <>
                <p
                  className={`${
                    shouldStartFadeOut
                      ? "animate-fadeOutDown"
                      : "animate-fadeInUp"
                  } text-base sm:text-2xl font-bold text-center`}
                >
                  New User Inbound.
                </p>
                <p
                  className={`${
                    shouldStartFadeOut
                      ? "animate-fadeOutDown"
                      : "animate-fadeInUp"
                  } text-base sm:text-xl text-center text-opacity-70`}
                >
                  Ready to Harmonize?
                </p>
              </>
            )}
          </div>

          <form
            className="flex flex-col mt-4"
            action={showRegister ? handleRegisterForm : handleLoginForm}
          >
            {showRegister ? (
              <div
                className={`${
                  shouldStartFadeOut
                    ? "animate-fadeOutDown"
                    : "animate-fadeInUp"
                } w-full h-ful flex flex-col`}
              >
                <PrimaryInput
                  errorMessage={emailError}
                  id="registerEmail"
                  type="email"
                  label="Email"
                />

                <PrimaryInput
                  errorMessage={nicknameError}
                  description={
                    "Your nickname displayed to other users. Special characters can be used."
                  }
                  required={false}
                  customStyles="mt-2"
                  id="registerNickname"
                  type="text"
                  label="Nickname"
                />
                <PrimaryInput
                  defaultValue={
                    searchParams.has("github")
                      ? searchParams.get("github")!
                      : ""
                  }
                  errorMessage={usernameError}
                  description={
                    "Only numbers, alphanumeric characters, _, and . allowed."
                  }
                  required={true}
                  customStyles="mt-2"
                  id="registerUsername"
                  type="text"
                  label="Username"
                />
                {!searchParams.has("github") && (
                  <>
                    <PrimaryInput
                      setPwdStrength={setPwdStrength}
                      errorMessage={pwdError}
                      customStyles="mt-2"
                      description={
                        "Try adding special characters, lowercase/uppercase letters, and numbers."
                      }
                      id="registerPassword"
                      type="password"
                      label="Password"
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
                          className="absolute bg-gradient-to-r from-lime-400 to-lime-600
                          dark:from-lime-500 dark:to-lime-300
                           rounded-md border-white
                                    h-[1rem]"
                          style={{
                            width: 15 * pwdStrength + "rem",
                          }}
                        />
                      </div>
                    </div>
                    <PrimaryInput
                      errorMessage={confirmPwdError}
                      customStyles="mt-2"
                      id="registerConfirmPassword"
                      type="password"
                      label="Confirm Password"
                    />
                  </>
                )}

                <p className={`ml-1 text-opacity-70 mt-1`}>
                  Birth Date
                  <span className="text-red-500">*</span>{" "}
                  <span className="text-red-400">
                    {birthdateError.length > 0 ? birthdateError : ""}
                  </span>{" "}
                </p>

                <div className="flex mt-1 justify-start gap-3 scale-[75%] sm:scale-100 origin-left">
                  <Spinner
                    width="6rem"
                    placeholder="Year"
                    data={years}
                    errorMessage={birthdateError}
                    id={"registerBirthYear"}
                  />
                  <Spinner
                    width="10rem"
                    placeholder="Month"
                    data={months}
                    errorMessage={birthdateError}
                    id={"registerBirthMonth"}
                  />
                  <Spinner
                    width="6rem"
                    placeholder="Date"
                    data={days}
                    errorMessage={birthdateError}
                    id={"registerBirthDate"}
                  />
                </div>
                <PrimaryButton
                  customStyles={
                    searchParams.has("github")
                      ? "mt-5 bg-white"
                      : "mt-5 bg-lime-500"
                  }
                  disabled={registerMutation.isPending}
                >
                  {searchParams.has("github") ? (
                    <div className="flex justify-center gap-4">
                      <p className="text-black">Register With Github</p>
                      <div className="text-black">
                        {" "}
                        <FaGithub size={24} />{" "}
                      </div>
                    </div>
                  ) : (
                    "Register"
                  )}
                </PrimaryButton>
                <p className="mt-2" onClick={showLoginForm}>
                  Already Registered?{" "}
                  <span className="text-lime-200 underline cursor-pointer">
                    Login
                  </span>
                </p>
              </div>
            ) : (
              <div
                className={`${
                  shouldStartFadeOut
                    ? "animate-fadeOutDown"
                    : "animate-fadeInUp"
                } w-full h-ful flex flex-col`}
              >
                <PrimaryInput
                  errorMessage={emailError}
                  id="userEmail"
                  type="text"
                  label="Email"
                />

                <PrimaryInput
                  errorMessage={pwdError}
                  id="userPassword"
                  type="password"
                  label="Password"
                />
                <PrimaryButton disabled={loginMutation.isPending}>
                  {" "}
                  <div className="flex justify-center gap-4">
                    <p className="text-white">Login with Accord</p>
                    <div>
                      {" "}
                      <GiPeaceDove size={24} />{" "}
                    </div>
                  </div>{" "}
                </PrimaryButton>

                <p className="text-center mt-1">Or</p>
                <PrimaryButton buttonType="button" customStyles="mt-2 bg-white">
                  <div className="flex justify-center gap-4">
                    <a
                      href={`${Constants.SERVER_URL_PATH}/oauth2/authorization/github`}
                      className="text-black"
                    >
                      Sign in with Github
                    </a>
                    <div className="text-black">
                      {" "}
                      <FaGithub size={24} />{" "}
                    </div>
                  </div>
                </PrimaryButton>

                <p onClick={showRegisterForm} className="mt-2">
                  Need an Account?{" "}
                  <span className="text-lime-200 underline cursor-pointer">
                    Register
                  </span>
                </p>
              </div>
            )}
          </form>
        </div>
      </div>
    </>
  );
}
