import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { FaDownload } from "react-icons/fa";
import { GrView } from "react-icons/gr";
import { MdDelete, MdExpandMore } from "react-icons/md";
import api from "../api/api";
import Constants from "../constants/Constants";
import { ChatRecordType } from "../types/ChatRecordType";
import { User } from "../types/User";
import FloatingButton from "./FloatingButton";
import React from "react";
type TextPreviewType = {
  record: ChatRecordType;
  fileName: string;
  fullFileName: string;
  fileSize: string;
  currentUser: User;
  uuid: string;
  handleDeleteChatAttachment: (uuid: string) => void;
  isSimplePreview: boolean;
};
export default function TextPreview({
  record,
  fileName,
  fullFileName,
  fileSize,
  currentUser,
  handleDeleteChatAttachment,
  uuid,
  isSimplePreview,
}: TextPreviewType) {
  const text = useQuery({
    queryKey: ["attachmentText", uuid],
    queryFn: () => {
      return api.get(Constants.SERVER_STATIC_CONTENT_PATH + fullFileName);
    },
  });

  const textContent = useMemo(() => {
    if (text.data?.data) {
      if (text.data.data.length > 50000) {
        return text.data.data.substring(0, 50000) + "...";
      } else {
        return text.data.data;
      }
    } else {
      return "";
    }
  }, [text]);
  const linesCount = useMemo(() => {
    if (text.data?.data) {
      if (text.data.data.length > 50000) {
        return text.data.data.substring(0, 50000).split("\n").length + "+";
      } else {
        return text.data.data.split("\n").length;
      }
    } else {
      return "";
    }
  }, [text]);

  const [expanded, setExpanded] = useState(false);

  return (
    <div className="w-full h-full flex flex-col overflow-scroll items-center">
      <div className="flex w-full h-full justify-center">
        <div
          className={`${
            expanded ? "max-h-fit" : "max-h-[7rem]"
          } w-[10rem] sm:w-[20rem] md:w-[30rem] lg:w-[40rem] transition font-mono text-sm p-2 whitespace-pre overflow-x-scroll overflow-y-hidden h-fit`}
          style={{}}
        >
          {textContent}
        </div>
      </div>

      <hr className="bg-lime-400 text-lime-400 border-lime-400 h-[0.1rem] w-full" />

      <div
        className={`${
          record.type === "pending_text" && "hidden"
        } flex w-full items-center p-1`}
      >
        <p className="text-sm ml-1 sm:ml-4 overflow-x-scroll overflow-y-hidden max-w-[4rem] sm:max-w-[9rem] whitespace-nowrap">
          {fileName}
        </p>

        <div className={`transition ${expanded ? "-rotate-180" : "rotate-0"}`}>
          <FloatingButton
            backgroundColor="bg-transparent"
            customTextColor="text-lime-400"
            hoverColor="text-lime-500"
            backgroundGroupHoverColor="bg-transparent"
            description={`${
              expanded ? "Collapse" : `Expand(${linesCount} lines)`
            }`}
            onClick={() => {
              setExpanded(!expanded);
            }}
          >
            <div className="sm:hidden">
              <MdExpandMore size={16} />
            </div>
            <div className="hidden sm:block">
              <MdExpandMore size={24} />
            </div>
          </FloatingButton>
        </div>

        <p className="text-xs ml-auto text-lime-700">{fileSize}MB</p>

        <div>
          <FloatingButton
            onClick={() => {
              const link = document.createElement("a");
              link.href =
                Constants.SERVER_ATTACHMENT_CONTENT_PATH + fullFileName;
              link.download = fileName;
              link.click();
            }}
            description="Download"
            backgroundColor="bg-transparent"
            backgroundGroupHoverColor="bg-lime-600"
            customTextColor="text-lime-700"
          >
            <FaDownload />
          </FloatingButton>
        </div>

        <div className="hidden sm:block">
          <FloatingButton
            onClick={() => {
              const link = document.createElement("a");
              link.href = Constants.SERVER_STATIC_CONTENT_PATH + fullFileName;
              link.download = fileName;
              link.target = "_blank";
              link.click();
            }}
            description="View Raw"
            backgroundColor="bg-transparent"
            backgroundGroupHoverColor="bg-lime-600"
            customTextColor="text-lime-700"
          >
            <GrView />
          </FloatingButton>
        </div>

        {record.sender?.id === currentUser.id && !isSimplePreview && (
          <div>
            <FloatingButton
              onClick={() => {
                handleDeleteChatAttachment(uuid);
              }}
              description="Delete"
              backgroundColor="bg-transparent"
              backgroundGroupHoverColor="bg-lime-600"
              customTextColor="text-red-500"
            >
              <MdDelete />
            </FloatingButton>
          </div>
        )}
      </div>
    </div>
  );
}
