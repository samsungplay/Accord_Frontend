"use client";
import { useContext, useState } from "react";
import { FaFileAlt, FaFileAudio, FaFileImage } from "react-icons/fa";
import { useOnClickOutside } from "usehooks-ts";
import ModalContext from "../contexts/ModalContext";
import PrimaryButton from "./PrimaryButton";
import React from "react";
import useIsLightMode from "../hooks/useIsLightMode";

export default function PrimaryModal() {
  const modalContext = useContext(ModalContext);
  const isLightMode = useIsLightMode();

  const [fileDropError, setFileDropError] = useState(false);
  const [
    fileDropErrorShouldCloseAnimation,
    setFileDropErrorShouldCloseAnimation,
  ] = useState(false);

  const [modalRef, setModalRef] = useState<HTMLDivElement | null>(null);

  useOnClickOutside({ current: modalRef }, (e_) => {
    const node = e_.target as HTMLElement;
    const parentNode = node.parentNode as HTMLElement;
    const grandParentNode = node.parentNode as HTMLElement;

    if (
      node.id === "customcontent" ||
      parentNode.id === "customcontent" ||
      grandParentNode.id === "customcontent"
    ) {
      return;
    }
    if (modalContext?.clickOutsideToClose) {
      modalContext?.setShouldExitAnimation(true);
      setTimeout(() => {
        modalContext?.setShouldExitAnimation(false);
        modalContext?.setOpen(false);
      }, 400);
    }
  });

  return (
    modalContext?.open && (
      <>
        {modalContext?.modalType === "filedrop" && (
          <div
            id="primaryModal"
            onDragOver={(e) => {
              e.preventDefault();
            }}
            onDragEnter={(e) => {
              e.preventDefault();
            }}
            onDrop={(e) => {
              const files = e.dataTransfer.files;

              for (const file of files) {
                if (file.size >= 8000000) {
                  modalContext.setGenericHeader("Your files are too powerful!");
                  modalContext.setGenericContent("files cannot exceed 8MB!");
                  setFileDropError(true);
                  setFileDropErrorShouldCloseAnimation(false);
                  modalContext?.setShouldExitAnimation(true);
                  if (modalContext?.onAccept) modalContext?.onAccept();

                  setTimeout(() => {
                    setFileDropErrorShouldCloseAnimation(true);
                  }, 1000);
                  setTimeout(() => {
                    modalContext?.setShouldExitAnimation(false);
                    modalContext?.setOpen(false);
                    setFileDropError(false);
                  }, 1400);
                  e.preventDefault();
                  return;
                }
              }

              e.preventDefault();

              //add attachments

              let feedback = "success";

              if (modalContext.onAccept && modalContext.onAccept.length >= 1) {
                feedback = (
                  modalContext.onAccept as unknown as (e: FileList) => string
                )(files);
              }

              if (feedback === "error") {
                setFileDropError(true);
                setFileDropErrorShouldCloseAnimation(false);
                modalContext?.setShouldExitAnimation(true);
                if (modalContext?.onAccept) modalContext?.onAccept();

                setTimeout(() => {
                  setFileDropErrorShouldCloseAnimation(true);
                }, 1000);
                setTimeout(() => {
                  modalContext?.setShouldExitAnimation(false);
                  modalContext?.setOpen(false);
                  setFileDropError(false);
                }, 1400);
              } else {
                modalContext?.setShouldExitAnimation(true);
                if (modalContext?.onAccept) modalContext?.onAccept();
                setTimeout(() => {
                  modalContext?.setShouldExitAnimation(false);
                  modalContext?.setOpen(false);
                }, 300);
              }
            }}
            onDragLeave={() => {
              modalContext?.setShouldExitAnimation(true);
              if (modalContext?.onAccept) modalContext?.onAccept();
              setTimeout(() => {
                modalContext?.setShouldExitAnimation(false);
                modalContext?.setOpen(false);
              }, 300);
            }}
            className="w-full h-full fixed grid place-content-center bg-black bg-opacity-50 z-[90]"
          >
            <div
              className="flex flex-col"
              style={{
                pointerEvents: "none",
              }}
            >
              <div
                ref={setModalRef}
                className={`w-fit h-fit bg-lime-700 text-white rounded-md ${
                  modalContext?.shouldExitAnimation
                    ? fileDropError && !fileDropErrorShouldCloseAnimation
                      ? "animate-jiggle"
                      : "animate-popIn"
                    : "animate-fadeInUpFaster"
                }`}
              >
                <div className="flex flex-col p-2">
                  <div
                    className={`flex flex-col gap-2 border-lime-300 items-center p-2 border-dotted rounded-md border-2 transition
                                            ${fileDropError && "bg-red-500"}`}
                  >
                    <div className="relative text-lime-300 bg-transparent">
                      <FaFileAlt size={128} />
                      <div className="absolute z-10 text-lime-400 left-[2rem] bg-transparent rotate-[30deg] top-0">
                        <FaFileAudio size={128} />
                      </div>
                      <div className="absolute z-0 text-lime-500 left-[-2rem] bg-transparent rotate-[-30deg] top-0">
                        <FaFileImage size={128} />
                      </div>
                    </div>

                    <p className="text-2xl font-bold">
                      {modalContext.genericHeader}
                    </p>
                    <p className="text-base">{modalContext.genericContent}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {modalContext?.modalType === "custom" && (
          <div
            id="primaryModal"
            className="w-full h-full fixed grid place-content-center bg-black bg-opacity-50 z-[90]"
          >
            <div
              className="flex flex-col z-[100]"
              style={
                {
                  // pointerEvents: 'none'
                }
              }
            >
              <div
                ref={setModalRef}
                className={`flex justify-center w-fit h-fit text-white rounded-md ${
                  modalContext?.shouldExitAnimation
                    ? "animate-fadeOutDown"
                    : "animate-fadeInUpFaster"
                }`}
                style={{
                  background: "transparent",
                }}
              >
                {modalContext.customContent ? (
                  modalContext.customContent
                ) : (
                  <></>
                )}
              </div>
            </div>
          </div>
        )}

        {modalContext?.modalType &&
          modalContext.modalType.startsWith("yesorno") && (
            <div
              id="primaryModal"
              className="w-full h-full fixed grid place-content-center bg-black bg-opacity-50 z-[90] soundPicker"
            >
              <div className="flex flex-col">
                <div
                  className={`w-fit h-fit text-white rounded-md p-4 ${
                    modalContext?.shouldExitAnimation
                      ? "animate-fadeOutDown"
                      : "animate-fadeInUpFaster"
                  }`}
                  style={{
                    background: isLightMode
                      ? "linear-gradient(180deg, rgb(217,249,157) 60%, rgb(236,252,203) 40%)"
                      : "linear-gradient(180deg, rgb(77,124,15) 60%, rgb(63,98,18) 40%)",
                  }}
                >
                  <p className="text-lg text-center font-bold">
                    {modalContext?.genericHeader}
                  </p>
                  {modalContext.genericContent.length > 0 ? (
                    <p className="text-center mt-4">
                      {modalContext?.genericContent}
                    </p>
                  ) : (
                    <></>
                  )}
                  {modalContext.customContent ? (
                    modalContext.customContent
                  ) : (
                    <></>
                  )}

                  <div className="flex mt-2 gap-2 w-full">
                    <div className="w-full">
                      <PrimaryButton
                        onclick={() => {
                          modalContext?.setShouldExitAnimation(true);
                          if (modalContext?.onAccept) modalContext?.onAccept();
                          setTimeout(() => {
                            modalContext?.setShouldExitAnimation(false);
                            modalContext?.setOpen(false);
                          }, 400);
                        }}
                      >
                        {modalContext.modalType.split("_").length === 3
                          ? modalContext.modalType.split("_")[1]
                          : "Yes"}
                      </PrimaryButton>
                    </div>
                    <div className="w-full">
                      <PrimaryButton
                        customStyles={"mt-5 bg-red-500"}
                        onclick={() => {
                          modalContext?.setShouldExitAnimation(true);
                          if (modalContext?.onReject) modalContext?.onReject();
                          setTimeout(() => {
                            modalContext?.setShouldExitAnimation(false);
                            modalContext?.setOpen(false);
                          }, 400);
                        }}
                      >
                        {modalContext.modalType.split("_").length === 3
                          ? modalContext.modalType.split("_")[2]
                          : "No"}
                      </PrimaryButton>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        {modalContext?.modalType === "generic" && (
          <div
            id="primaryModal"
            className="w-full h-full fixed grid place-content-center bg-black bg-opacity-50 z-[90]"
          >
            <div className="flex flex-col">
              <div
                ref={setModalRef}
                className={`w-fit h-fit text-white z-[100] bg-lime-700 rounded-md p-4 ${
                  modalContext?.shouldExitAnimation
                    ? "animate-fadeOutDown"
                    : "animate-fadeInUpFaster"
                }`}
              >
                {modalContext?.genericHeader.length > 0 ? (
                  <p className="text-lg text-center font-bold">
                    {modalContext?.genericHeader}
                  </p>
                ) : (
                  <></>
                )}

                {modalContext.customHeader ? modalContext.customHeader : <></>}

                {modalContext?.genericContent.length > 0 ? (
                  <p className="text-center mt-4">
                    {modalContext?.genericContent}
                  </p>
                ) : (
                  <></>
                )}

                {modalContext.customContent ? (
                  modalContext.customContent
                ) : (
                  <></>
                )}

                <div
                  style={{
                    borderRadius: "0 0 0.375rem 0.375rem",
                  }}
                  className="bg-lime-800 mb-[-1rem] mx-[-1rem] mt-2"
                >
                  {(
                    (modalContext.customButtonSet !== undefined &&
                      modalContext.customButtonSet) ||
                    []
                  ).length == 2 ? (
                    <div className="flex gap-2 w-full px-4 pb-4 items-center justify-center">
                      <div
                        className="w-full"
                        onClick={() => {
                          modalContext?.setShouldExitAnimation(true);
                          if (modalContext?.onAccept) modalContext?.onAccept();
                          setTimeout(() => {
                            modalContext?.setShouldExitAnimation(false);
                            modalContext?.setOpen(false);
                          }, 400);
                        }}
                      >
                        {modalContext.customButtonSet![0]}
                      </div>
                      <div
                        className="w-full"
                        onClick={() => {
                          modalContext?.setShouldExitAnimation(true);
                          if (modalContext?.onReject) modalContext?.onReject();
                          setTimeout(() => {
                            modalContext?.setShouldExitAnimation(false);
                            modalContext?.setOpen(false);
                          }, 400);
                        }}
                      >
                        {modalContext.customButtonSet![1]}
                      </div>
                    </div>
                  ) : (
                      (modalContext.customButtonSet !== undefined &&
                        modalContext.customButtonSet) ||
                      []
                    ).length == 1 ? (
                    <div
                      className="px-4 pb-4"
                      onClick={() => {
                        modalContext?.setShouldExitAnimation(true);
                        if (modalContext?.onAccept) modalContext?.onAccept();
                        setTimeout(() => {
                          modalContext?.setShouldExitAnimation(false);
                          modalContext?.setOpen(false);
                        }, 400);
                      }}
                    >
                      {modalContext.customButtonSet![0]}
                    </div>
                  ) : (
                    <div className="px-4 pb-4">
                      <PrimaryButton
                        onclick={() => {
                          modalContext?.setShouldExitAnimation(true);
                          if (modalContext?.onAccept) modalContext?.onAccept();
                          setTimeout(() => {
                            modalContext?.setShouldExitAnimation(false);
                            modalContext?.setOpen(false);
                          }, 400);
                        }}
                      >
                        OK
                      </PrimaryButton>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    )
  );
}
