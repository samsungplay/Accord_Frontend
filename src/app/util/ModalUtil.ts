import { Context, Dispatch, SetStateAction } from "react";
import ModalContext from "../contexts/ModalContext";
import { AxiosResponse } from "axios";

type ModalContextType<S> = S extends Context<infer I> ? I : never;
type ModalType = ModalContextType<typeof ModalContext>;

type ModalRootType = {
  setModalType: Dispatch<SetStateAction<string>>;
  setGenericHeader: Dispatch<SetStateAction<string>>;
  setGenericContent: Dispatch<SetStateAction<string>>;
  setOnAccept: Dispatch<SetStateAction<() => void | ((e: FileList) => string)>>;
  setOnReject: Dispatch<SetStateAction<() => void>>;
  setCustomContent: Dispatch<SetStateAction<React.ReactNode | undefined>>;
  setCustomButtonSet: Dispatch<SetStateAction<React.ReactNode[] | undefined>>;
  setCustomHeader: Dispatch<SetStateAction<React.ReactNode | undefined>>;
  setClickOutsideToClose: Dispatch<SetStateAction<boolean>>;
  setOpen: Dispatch<SetStateAction<boolean>>;
  open: boolean;
  setShouldExitAnimation: Dispatch<SetStateAction<boolean>>;
};
const MODAL_DELAY = 50;

const closeCurrentModal = (modalContext: ModalType | ModalRootType) => {
  modalContext?.setShouldExitAnimation(true);
  setTimeout(() => {
    modalContext?.setShouldExitAnimation(false);
    modalContext?.setOpen(false);
  }, 400);
};
const openCustomModal = (
  context: ModalType | ModalRootType,
  content: React.ReactNode,
  clickOutsideToClose?: boolean
) => {
  if (document.fullscreenElement) {
    document.exitFullscreen();
  }
  const activeElement = document.activeElement;

  if (activeElement instanceof HTMLElement) {
    activeElement.blur();
  }

  let delay = MODAL_DELAY;

  if (document.getElementById("primaryModal")) {
    closeCurrentModal(context);
    delay += 400;
  }

  setTimeout(() => {
    context?.setModalType("custom");
    context?.setCustomContent(content);
    context?.setClickOutsideToClose(
      clickOutsideToClose ? clickOutsideToClose : false
    );
    context?.setOpen(true);
  }, delay);
};

const openFileDropModal = (
  context: ModalType,
  header: string,
  content: string,
  onDrop: (e: FileList) => string
) => {
  let delay = MODAL_DELAY;

  if (
    document.getElementById("primaryModal") &&
    context?.modalType !== "filedrop"
  ) {
    closeCurrentModal(context);
    delay += 400;
  }

  const activeElement = document.activeElement;

  if (activeElement instanceof HTMLElement) {
    activeElement.blur();
  }

  setTimeout(() => {
    context?.setModalType("filedrop");
    context?.setGenericContent(content);
    context?.setGenericHeader(header);
    context?.setOnAccept(() => onDrop || (() => {}));
    context?.setClickOutsideToClose(false);
    context?.setOpen(true);
  }, delay);
};

const openGenericModal = (
  context: ModalType | ModalRootType,
  header: string,
  content: string,
  onAccept?: () => void,
  customContent?: React.ReactNode,
  customButtonSet?: React.ReactNode[],
  customHeader?: React.ReactNode,
  clickOutsideToClose?: boolean,
  onReject?: () => void
) => {
  if (document.fullscreenElement) {
    document.exitFullscreen();
  }
  const activeElement = document.activeElement;

  if (activeElement instanceof HTMLElement) {
    activeElement.blur();
  }

  let delay = MODAL_DELAY;

  if (document.getElementById("primaryModal")) {
    closeCurrentModal(context);
    delay += 400;
  }

  setTimeout(() => {
    context?.setModalType("generic");
    context?.setGenericHeader(header);
    context?.setGenericContent(content);
    context?.setOnAccept(() => onAccept || (() => {}));
    context?.setOnReject(() => onReject || (() => {}));
    context?.setCustomContent(customContent || undefined);
    context?.setCustomButtonSet(customButtonSet);
    context?.setCustomHeader(customHeader);
    context?.setClickOutsideToClose(clickOutsideToClose || false);

    context?.setOpen(true);
  }, delay);
};

const openSettingsPage = (context: ModalType, defaultTab?: string) => {
  if (document.fullscreenElement) {
    document.exitFullscreen();
  }
  const activeElement = document.activeElement;

  if (activeElement instanceof HTMLElement) {
    activeElement.blur();
  }

  const delay = MODAL_DELAY;

  context?.setSettingsPageDefaultTab(defaultTab?.length ? defaultTab : "");

  setTimeout(() => {
    context?.setOpenSettingsPage(true);
  }, delay);
};

const openYesorNoModal = (
  context: ModalType | ModalRootType,
  header: string,
  content: string,
  onAccept: () => void,
  onReject?: () => void,
  customContent?: React.ReactNode,
  customButtonLabels?: [string, string]
) => {
  if (document.fullscreenElement) {
    document.exitFullscreen();
  }
  const activeElement = document.activeElement;

  if (activeElement instanceof HTMLElement) {
    activeElement.blur();
  }

  let delay = MODAL_DELAY;

  if (document.getElementById("primaryModal")) {
    closeCurrentModal(context);
    delay += 400;
  }

  setTimeout(() => {
    context?.setModalType(
      customButtonLabels
        ? "yesorno_" + customButtonLabels[0] + "_" + customButtonLabels[1]
        : "yesorno"
    );
    context?.setGenericHeader(header);
    context?.setGenericContent(content);
    context?.setOnAccept(() => onAccept);
    context?.setOnReject(() => onReject || (() => {}));
    context?.setCustomContent(customContent || undefined);
    context?.setClickOutsideToClose(false);
    context?.setOpen(true);
  }, delay);
};

const handleGenericError = (
  context: ModalType | ModalRootType,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: AxiosResponse<any, any>
) => {
  setTimeout(() => {
    if (data.status === 400) {
      const response = data.data;
      ModalUtils.openGenericModal(
        context,
        "Following error occurred:",
        response
      );
    } else if (data.status === 429) {
      ModalUtils.openGenericModal(
        context,
        "Find some peace!",
        "You are interacting too quickly!",
        () => {},
        undefined,
        undefined,
        undefined,
        true
      );
    } else if (data.status === 409) {
      ModalUtils.openGenericModal(
        context,
        "Oof.",
        "Your action couldn't be completed because the data has changed. Please try again.",
        () => {}
      );
    } else {
      ModalUtils.openGenericModal(context, "ERROR", "Unknown error occurred.");
    }
  }, MODAL_DELAY);
};
const ModalUtils = {
  openGenericModal,
  openSettingsPage,
  openYesorNoModal,
  openCustomModal,
  openFileDropModal,
  handleGenericError,
  closeCurrentModal,
};

export default ModalUtils;
