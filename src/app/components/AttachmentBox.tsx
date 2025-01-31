"use client";
import React, { useCallback } from "react";
import {
  AiFillEdit,
  AiFillDelete,
  AiFillFile,
  AiFillVideoCamera,
  AiFillSound,
  AiFillEye,
  AiFillEyeInvisible,
} from "react-icons/ai";
import FloatingButton from "./FloatingButton";
import {
  Dispatch,
  SetStateAction,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import ModalContext from "../contexts/ModalContext";
import ModalUtils from "../util/ModalUtil";
import PrimaryInput from "./PrimaryInput";
import PrimaryButton from "./PrimaryButton";
import { FaCheck } from "react-icons/fa";
import Constants from "../constants/Constants";
import { FaX } from "react-icons/fa6";

type AttachmentBoxType = {
  file: { file: File; spoiler: boolean };
  setAttachments: Dispatch<
    SetStateAction<{ file: File; spoiler: boolean }[] | null>
  >;
  fileId: number;
};
export default function AttachmentBox({
  file,
  setAttachments,
  fileId,
}: AttachmentBoxType) {
  const modalContext = useContext(ModalContext);
  const [dynamicFileIcon, setDynamicFileIcon] = useState<
    React.ReactNode | undefined
  >(undefined);
  const [isSpoilerAttachment, setIsSpoilerAttachment] = useState(false);
  const [spoilerTagCornered, setSpoilerTagCornered] = useState(false);

  const error = useMemo(() => {
    if (file.file.name.length > 35) {
      return "file name too long";
    }
    if (!Constants.fileNameRe.test(file.file.name)) {
      return "Contains invalid characters";
    }
    if (file.file.size >= 8000000) {
      return "file exceeds 8MB";
    }

    return "";
  }, [file]);

  const extension = useMemo(() => {
    if (file.file.name.lastIndexOf(".") === -1) {
      return "";
    }
    return file.file.name.substring(file.file.name.lastIndexOf(".") + 1);
  }, [file]);

  const fileIcon = useMemo(() => {
    if (extension === "mp3" || extension === "ogg" || extension === "wav") {
      return <AiFillSound size={70} />;
    } else if (extension === "mp4" || extension === "webm") {
      return <AiFillVideoCamera size={70} />;
    }

    return <AiFillFile size={70} />;
  }, [file, extension]);

  useEffect(() => {
    const handler = async () => {
      if (file.file.size > 8000000) {
        return;
      }

      if (extension === "jpg" || extension === "png" || extension === "jpeg") {
        let binary = "";
        if (!file.file.arrayBuffer) {
          setDynamicFileIcon(undefined);
          return;
        }
        const bytes = new Uint8Array(await file.file.arrayBuffer());
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);

        const base64 = window.btoa(binary);

        setDynamicFileIcon(
          <img
            src={`data:image/${extension};base64, ${base64}`}
            className={` w-[7rem] h-[4.35rem] object-cover rounded-md`}
          />
        );

        return;
      }

      setDynamicFileIcon(undefined);
    };

    handler();
  }, [file, extension]);

  const handleToggleSpoilerAttachment = useCallback(() => {
    if (isSpoilerAttachment) {
      setIsSpoilerAttachment(false);
      setAttachments((prev) => {
        if (prev) {
          return prev.map((file, i) => {
            if (i === fileId) {
              return {
                file: file.file,
                spoiler: false,
              };
            }

            return file;
          });
        }

        return null;
      });
    } else {
      setIsSpoilerAttachment(true);
      setAttachments((prev) => {
        if (prev) {
          return prev.map((file, i) => {
            if (i === fileId) {
              return {
                file: file.file,
                spoiler: true,
              };
            }

            return file;
          });
        }

        return null;
      });
    }
  }, [isSpoilerAttachment, setIsSpoilerAttachment]);

  return (
    <div className="flex flex-col relative items-center px-2 pb-2 pt-3 w-[10rem] h-[10rem] m-2 shadow-md rounded-md bg-lime-600">
      <div className="flex items-center z-[1] absolute top-[-0.5rem] right-[-0.5rem] shadow-md bg-lime-500 rounded-md">
        <FloatingButton
          onClick={() => {
            ModalUtils.openGenericModal(
              modalContext,
              "",
              "",
              () => {
                setAttachments((prev) => {
                  if (prev) {
                    return prev.map((file, i) => {
                      if (i === fileId) {
                        return {
                          file: new File(
                            [file.file],
                            (
                              document.getElementById(
                                "filenameInput"
                              ) as HTMLInputElement
                            ).value,
                            {
                              type: file.file.type,
                            }
                          ),
                          spoiler: file.spoiler,
                        };
                      }

                      return file;
                    });
                  }

                  return null;
                });
              },
              <div className="flex flex-col p-2 relative">
                <div className="flex absolute top-[-4rem] left-[0rem] items-end">
                  <AiFillFile size={64} />
                </div>

                <div className="">
                  <PrimaryInput
                    label="Filename"
                    id="filenameInput"
                    type="text"
                    defaultValue={file.file.name}
                  />
                </div>
              </div>,
              [
                <PrimaryButton key={1} customStyles="mt-5 bg-lime-500 w-full">
                  Save
                </PrimaryButton>,
                <PrimaryButton
                  key={2}
                  customStyles="mt-5 bg-transparent hover:underline w-full"
                >
                  Cancel
                </PrimaryButton>,
              ],
              <div className="flex ml-[4rem]">
                <p className="text-2xl max-w-[10ch] overflow-x-scroll whitespace-nowrap">
                  {file.file.name}
                </p>
              </div>,
              true
            );
          }}
          description="Modify Attachment"
          backgroundColor="bg-lime-500"
          hoverColor="hover:text-lime-800"
        >
          <AiFillEdit />
        </FloatingButton>

        <FloatingButton
          description="Spoiler Attachment"
          backgroundColor="bg-lime-500"
          hoverColor="hover:text-lime-800"
          onClick={handleToggleSpoilerAttachment}
        >
          {isSpoilerAttachment ? <AiFillEyeInvisible /> : <AiFillEye />}
        </FloatingButton>

        <FloatingButton
          onClick={() => {
            setAttachments((prev) => {
              if (prev) {
                return prev.filter((_, i) => i !== fileId);
              }
              return null;
            });
          }}
          description="Remove Attachment"
          backgroundColor="bg-lime-500"
          customTextColor="text-red-500"
          hoverColor="hover:text-lime-800"
        >
          <AiFillDelete />
        </FloatingButton>
      </div>

      <div className={`relative`}>
        <div
          onClick={() => setSpoilerTagCornered((prev) => !prev)}
          className={`${
            isSpoilerAttachment ? "block" : "hidden"
          } absolute blur-none z-[1]
        ${
          spoilerTagCornered
            ? "left-[50%] translate-x-[-50%] bottom-[0.2rem] bg-opacity-50 bg-lime-500 px-1 text-xs"
            : "top-[50%] left-[50%] px-2 py-1 text-xs translate-x-[-50%] translate-y-[-50%] bg-lime-700"
        } cursor-pointer rounded-md text-white font-bold`}
        >
          SPOILER
        </div>
        <div
          className={`${
            isSpoilerAttachment && !spoilerTagCornered ? "blur-sm" : "blur-none"
          }`}
        >
          {dynamicFileIcon ? dynamicFileIcon : fileIcon}
        </div>
      </div>

      <div className="flex gap-2 items-center">
        <p
          className={`${
            error.length > 0 ? "text-red-500" : "text-lime-300"
          } text-center mt-1 max-w-[7rem] overflow-x-scroll whitespace-nowrap`}
        >
          {file.file.name}
        </p>
        {error.length > 0 ? (
          <div className="text-red-500">
            <FaX />
          </div>
        ) : (
          <FaCheck />
        )}
      </div>

      {error.length > 0 ? (
        <p className="text-sm text-red-500">{error}</p>
      ) : (
        <p className="tex-lime-300">valid file</p>
      )}

      <p
        className={`${
          error.length > 0 ? "text-red-500" : "text-lime-400"
        } text-center max-w-[7rem] whitespace-nowrap`}
      >
        {parseFloat((file.file.size / 1000000).toString()).toFixed(2)}MB
      </p>
    </div>
  );
}
