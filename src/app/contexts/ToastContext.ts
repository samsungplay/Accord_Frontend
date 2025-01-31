import { createContext, Dispatch, SetStateAction } from "react";

const ToastContext = createContext<{
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  message: string | React.ReactNode;
  setMessage: Dispatch<SetStateAction<string | React.ReactNode>>;
  type: string;
  setType: Dispatch<SetStateAction<string>>;
  showLoader: boolean;
  setShowLoader: Dispatch<SetStateAction<boolean>>;
} | null>(null);

export default ToastContext;
