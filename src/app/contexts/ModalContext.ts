import { createContext, Dispatch, SetStateAction } from "react";

const ModalContext = createContext<{
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  modalType: string;
  setModalType: Dispatch<SetStateAction<string>>;
  genericHeader: string;
  genericContent: string;
  customContent: React.ReactNode | undefined;
  setGenericHeader: Dispatch<SetStateAction<string>>;
  setGenericContent: Dispatch<SetStateAction<string>>;
  setCustomContent: Dispatch<SetStateAction<React.ReactNode | undefined>>;
  onAccept: () => void | ((e: FileList) => string);
  onReject: () => void;
  setOnAccept: Dispatch<SetStateAction<() => void | ((e: FileList) => string)>>;
  setOnReject: Dispatch<SetStateAction<() => void>>;
  customHeader: React.ReactNode | undefined;
  setCustomHeader: Dispatch<SetStateAction<React.ReactNode | undefined>>;
  customButtonSet: React.ReactNode[] | undefined;
  setCustomButtonSet: Dispatch<SetStateAction<React.ReactNode[] | undefined>>;
  clickOutsideToClose: boolean;
  setClickOutsideToClose: Dispatch<SetStateAction<boolean>>;
  setShouldExitAnimation: Dispatch<SetStateAction<boolean>>;
  shouldExitAnimation: boolean;
  openSettingsPage: boolean;
  setOpenSettingsPage: Dispatch<SetStateAction<boolean>>;
  settingsPageDefaultTab: string;
  setSettingsPageDefaultTab: Dispatch<SetStateAction<string>>;
} | null>(null);

export default ModalContext;
