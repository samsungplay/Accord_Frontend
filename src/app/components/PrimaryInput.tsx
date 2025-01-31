"use client";
import {
  ChangeEvent,
  Dispatch,
  SetStateAction,
  useDeferredValue,
  useEffect,
  useState,
} from "react";
import { FaLock } from "react-icons/fa";

import React from "react";

type PrimaryInputProps = {
  id: string;
  label?: string;
  type: string;
  customStyles?: string;
  customStylesInput?: string;
  required?: boolean;
  description?: string;
  errorMessage?: string;
  readonly?: boolean;
  defaultValue?: string;
  placeholder?: string;
  value_?: string;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  lines?: number;
  maxLength?: number;
  customInputAnimation?: string;
  setPwdStrength?: Dispatch<SetStateAction<number>>;
};

export default function PrimaryInput({
  id,
  label = "",
  type,
  customStyles = "mt-0",
  required = true,
  description = "",
  errorMessage = "",
  readonly = false,
  defaultValue = "",
  placeholder = "",
  customStylesInput = "",
  value_,
  onChange,
  lines = 1,
  maxLength,
  customInputAnimation = "animate-none",
  setPwdStrength,
}: PrimaryInputProps) {
  const [focused, setFocused] = useState(false);
  const [value, setValue] = useState(defaultValue);
  const deferredValue = useDeferredValue(value);

  const onFocus = () => setFocused(true);
  const onBlur = () => setFocused(false);
  const isError = errorMessage.length > 0;

  if (id === "registerPassword") {
    //handle pwd strength calculation for password field in registration form
    const getPwdStrength = (value: string): number => {
      //pwd conditions:
      //1. at least 7 characters long
      //2. contains at least 1 special character
      //3. contains at least 1 lowercase alphanumeric character
      //4. contains at least 1 number digit
      //5. contains at least 1 uppercase alphanumeric character
      let conditionsSatisfied = 0;
      let regex = new RegExp("[!@#$%^&*.?_]");
      if (value.length >= 7) {
        conditionsSatisfied++;
      }

      if (regex.test(value)) {
        conditionsSatisfied++;
      }

      regex = new RegExp("[a-z]");

      if (regex.test(value)) {
        conditionsSatisfied++;
      }

      regex = new RegExp("[\\d]");

      if (regex.test(value)) {
        conditionsSatisfied++;
      }

      regex = new RegExp("[A-Z]");

      if (regex.test(value)) {
        conditionsSatisfied++;
      }

      if (conditionsSatisfied === 1) return 0.1;
      else if (conditionsSatisfied === 2) return 0.3;
      else if (conditionsSatisfied === 3) return 0.5;
      else if (conditionsSatisfied === 4) return 0.7;
      else if (conditionsSatisfied === 5) return 1.0;

      return 0;
    };
    useEffect(() => {
      if (setPwdStrength) {
        setPwdStrength(getPwdStrength(deferredValue));
      }
    }, [deferredValue]);
  }

  return (
    <>
      {label.length > 0 && (
        <div className="flex">
          <label
            htmlFor={id}
            className={`ml-1 text-opacity-70 ${customStyles} ${
              isError ? "text-red-400" : "text-white"
            } text-nowr`}
          >
            {" "}
            <div className="flex gap-1">
              {" "}
              {isError ? label + "-" + errorMessage : label}{" "}
              <span className="text-red-500">{required && "*"}</span>{" "}
              {readonly && (
                <div className=" text-lime-800 mt-1">
                  <FaLock size={12} />
                </div>
              )}{" "}
            </div>
          </label>
        </div>
      )}

      {id === "registerPassword" ? (
        <input
          placeholder={placeholder}
          readOnly={readonly}
          onFocus={onFocus}
          onBlur={onBlur}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          id={id}
          name={id}
          type={type}
          className={`${
            readonly && "cursor-not-allowed"
          } peer ${customStylesInput} placeholder:text-lime-300 hover:bg-opacity-70 focus:bg-opacity-70 transition duration-500 focus:shadow-md mt-1 rounded-md h-[2rem] focus:outline-none bg-lime-600 p-2 caret-lime-300
            text-lime-300 ${
              isError ? "animate-jiggle" : customInputAnimation
            } ${
            isError ? "border-red-500 border-x-2 border-y-2" : "border-none"
          }`}
        />
      ) : lines <= 1 ? (
        <input
          maxLength={maxLength}
          placeholder={placeholder}
          readOnly={readonly}
          onFocus={onFocus}
          onBlur={onBlur}
          defaultValue={defaultValue.length ? defaultValue : undefined}
          value={value_}
          onChange={onChange}
          id={id}
          name={id}
          type={type}
          className={`${
            readonly && "cursor-not-allowed"
          } peer ${customStylesInput} placeholder:text-lime-300 hover:bg-opacity-70 focus:bg-opacity-70 transition duration-500 focus:shadow-md mt-1 rounded-md h-[2rem] focus:outline-none bg-lime-600 p-2 caret-lime-300
            text-lime-300 ${
              isError ? "animate-jiggle" : customInputAnimation
            } ${
            isError ? "border-red-500 border-x-2 border-y-2" : "border-none"
          }`}
        />
      ) : (
        <textarea
          maxLength={maxLength}
          rows={lines}
          placeholder={placeholder}
          readOnly={readonly}
          onFocus={onFocus}
          onBlur={onBlur}
          defaultValue={defaultValue.length ? defaultValue : undefined}
          value={value_}
          id={id}
          name={id}
          className={`${
            readonly && "cursor-not-allowed"
          } peer ${customStylesInput} placeholder:text-lime-300 hover:bg-opacity-70 focus:bg-opacity-70 transition duration-500 focus:shadow-md mt-1 rounded-md h-[2rem] focus:outline-none bg-lime-600 p-2 caret-lime-300
            text-lime-300 ${
              isError ? "animate-jiggle" : customInputAnimation
            } ${
            isError ? "border-red-500 border-x-2 border-y-2" : "border-none"
          }`}
        />
      )}

      {description.length > 0 && (
        <div
          className="h-fit mt-1 overflow-hidden transition-all duration-700"
          style={{
            maxHeight: focused ? "2rem" : "0rem",
          }}
        >
          {" "}
          {focused ? (
            <p className="animate-fadeInUp text-xs md:text-base">
              {description}
            </p>
          ) : (
            <p className="animate-fadeOutDown text-xs md:text-base">
              {description}
            </p>
          )}{" "}
        </div>
      )}
    </>
  );
}
