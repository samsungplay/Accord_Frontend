/* eslint-disable @typescript-eslint/no-explicit-any */
import { MouseEventHandler, useMemo, useState } from "react";
import React from "react";
import { Popover } from "react-tiny-popover";
type DraggableProgressbarType = {
  id?: string;
  onMouseDown?: MouseEventHandler<HTMLDivElement>;
  onMouseMove?: MouseEventHandler<HTMLDivElement>;
  onMouseEnter?: MouseEventHandler<HTMLDivElement>;
  onMouseLeave?: MouseEventHandler<HTMLDivElement>;
  onDrag?: MouseEventHandler<HTMLDivElement>;
  onDragEnd?: MouseEventHandler<HTMLDivElement>;
  width?: string | number;
  height?: string | number;
  dragPointSize?: string | number;
  dragPointHalfSize?: string | number;
  progress: number;
  backgroundColor?: string;
  foregroundColor?: string;
  dragPointColor?: string;
  showDragPointProgress?: boolean;
  getProgressText?: (progress: number) => string;
};

export default function DraggableProgressbar({
  id,
  onMouseDown,
  onMouseMove,
  onMouseEnter,
  onMouseLeave,
  onDrag,
  onDragEnd,
  progress,
  width = "100%",
  height = "0.5rem",
  dragPointSize = "1rem",
  dragPointHalfSize = "0.5rem",
  backgroundColor = "bg-lime-700",
  foregroundColor = "bg-gradient-to-r from-lime-400 to-lime-500 dark:from-lime-500 dark:to-lime-400",
  dragPointColor = "bg-lime-500",
  showDragPointProgress = false,
  getProgressText = (progress) => parseFloat(progress.toFixed(1)) + "%",
}: DraggableProgressbarType) {
  const invisibleDragImage = useMemo(() => {
    const img = new Image();
    img.src =
      "data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=";
    return img;
  }, []);

  const [progressHoverOpen, setProgressHoverOpen] = useState(false);

  const [isDragging, setIsDragging] = useState(false);

  return (
    <div
      id={id}
      onMouseDown={onMouseDown}
      onTouchStart={(e) => {
        const touch = e.touches[0];
        if (onMouseDown) {
          onMouseDown(touch as any);
        }
      }}
      onMouseMove={onMouseMove}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`${backgroundColor} rounded-md relative cursor-pointer`}
      style={{
        width: width,
        height: height,
      }}
    >
      <div
        className={`flex items-center justify-end rounded-md absolute z-10 ${foregroundColor}`}
        style={{
          width: `max(calc(${progress}% + ${dragPointHalfSize}),${dragPointSize})`,
          height: height,
        }}
      >
        <Popover
          containerStyle={{
            zIndex: "85",
          }}
          positions={["top"]}
          content={
            showDragPointProgress ? (
              <div className="animate-popOut rounded-md p-2 bg-lime-700 text-white">
                {getProgressText(progress)}
              </div>
            ) : (
              <></>
            )
          }
          isOpen={progressHoverOpen}
        >
          <div
            onTouchStart={() => {
              setProgressHoverOpen(true);
            }}
            onDragEnter={() => {
              setProgressHoverOpen(true);
              setIsDragging(true);
            }}
            onMouseEnter={() => setProgressHoverOpen(true)}
            onMouseLeave={() => {
              setTimeout(() => {
                if (!isDragging) setProgressHoverOpen(false);
              }, 100);
            }}
            onDragStart={(e) => {
              e.dataTransfer.setDragImage(invisibleDragImage, 0, 0);
            }}
            onDrag={onDrag}
            onDragOver={(e) => {
              e.preventDefault();
            }}
            onDragEnd={(e) => {
              setProgressHoverOpen(false);
              setIsDragging(false);
              if (onDragEnd) onDragEnd(e);
            }}
            onTouchMove={(e) => {
              const touch = e.touches[0];

              if (onDrag) onDrag(touch as any);
            }}
            onTouchEnd={(e) => {
              const touch = e.changedTouches[0];

              if (onDragEnd) onDragEnd(touch as any);

              setProgressHoverOpen(false);
            }}
            onTouchCancel={(e) => {
              const touch = e.changedTouches[0];
              if (onDragEnd) onDragEnd(touch as any);

              setProgressHoverOpen(false);
            }}
            draggable={true}
            style={{
              width: dragPointSize,
              height: dragPointSize,
            }}
            className={`rounded-full transition hover:scale-125 ${dragPointColor}`}
          />
        </Popover>
      </div>
    </div>
  );
}
