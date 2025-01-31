import { Context } from "react";
import ToastContext from "../contexts/ToastContext";

type ToastContextType<S> = S extends Context<infer I> ? I : never;
type ToastType = ToastContextType<typeof ToastContext>;

const openToast = (
  context: ToastType,
  message: string | React.ReactNode,
  showLoader = true
) => {
  context?.setMessage(message);
  context?.setType("generic");
  context?.setShowLoader(showLoader);
  context?.setOpen(true);
};

const openSplashToast = (
  context: ToastType,
  message: string | React.ReactNode,
  showLoader = false
) => {
  context?.setMessage(message);
  context?.setType("short");
  context?.setShowLoader(showLoader);
  context?.setOpen(true);
};

const closeToast = (context: ToastType) => {
  context?.setOpen(false);
};

const ToastUtils = {
  openToast,
  closeToast,
  openSplashToast,
};

export default ToastUtils;
