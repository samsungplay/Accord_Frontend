import { useRef, useEffect, Dispatch, SetStateAction } from "react";

const useNextRenderSetState = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setState: Dispatch<SetStateAction<any>> | undefined
) => {
  const queue = useRef<(() => void)[]>([]);

  useEffect(() => {
    if (queue.current.length > 0) {
      queue.current.forEach((update) => update());
      queue.current = [];
    }
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (updateFn: any) => {
    if (!setState) return;
    queue.current.push(() => setState(updateFn));
  };
};

export default useNextRenderSetState;
