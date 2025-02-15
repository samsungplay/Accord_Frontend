import { useMutation, useQuery } from "@tanstack/react-query";
import React, { useContext, useEffect } from "react";
import api from "../api/api";
import { ChatRecordType } from "../types/ChatRecordType";
import ModalContext from "../contexts/ModalContext";
import ModalUtils from "../util/ModalUtil";
import queryClient from "../query/QueryClient";
import ChatRecord from "./ChatRecord";
import { ChatRoom } from "../types/ChatRoom";
import { User } from "../types/User";
import PrimaryButton from "./PrimaryButton";

import { format, sub } from "date-fns";
import { FaClock } from "react-icons/fa";
import MessageScheduler from "./MessageScheduler";
import { MdCancelScheduleSend, MdSchedule } from "react-icons/md";
export default function ScheduledMessageManager({
  currentChatRoom,
  timeFormat = "12-hour",
}: {
  currentChatRoom: ChatRoom;
  timeFormat?: string;
}) {
  const modalContext = useContext(ModalContext);
  const currentUser = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const response = await api.get<User>("/users");
      return { data: response.data };
    },
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
  const scheduledMessages = useQuery({
    queryKey: ["scheduled_messages", currentChatRoom.id.toString()],
    queryFn: async () => {
      const response = await api.get<ChatRecordType[]>(
        `/chat/message/scheduled/${currentChatRoom.id}`
      );
      return {
        data: response.data,
      };
    },
    refetchOnMount: false,
  });

  const unscheduleMessageMutation = useMutation({
    mutationFn: (recordId: number) => {
      return api.delete(`/chat/message/scheduled/${recordId}`);
    },
    onSettled(data, err, recordId) {
      if (data?.status === 200) {
        queryClient.setQueryData(
          ["scheduled_messages", currentChatRoom.id.toString()],
          (prev: { data: ChatRecordType[] }) => {
            if (!prev) {
              return prev;
            }
            return {
              data: prev.data.filter((e) => e.id !== recordId),
            };
          }
        );
      } else if (data) {
        ModalUtils.handleGenericError(modalContext, data);
      }
    },
  });

  useEffect(() => {
    //auto sort scheduled messages data
    if (scheduledMessages.data?.data)
      queryClient.setQueryData(
        ["scheduled_messages", currentChatRoom.id.toString()],
        (prev: { data: ChatRecordType[] }) => {
          if (!prev) {
            return prev;
          }
          return {
            data: prev.data.sort(
              (a, b) => sub(a.date, {}).getTime() - sub(b.date, {}).getTime()
            ),
          };
        }
      );
  }, [scheduledMessages.data?.data]);

  return (
    <div className="overflow-y-scroll max-h-[70vh] min-w-[50vw]">
      {(!scheduledMessages.data?.data || !currentUser.data?.data) && (
        <div className="grid place-content-center mt-2 mb-2">
          <div className="flex flex-col justify-center items-center text-lime-400">
            <FaClock size={64} />
            Loading...
          </div>
        </div>
      )}
      {scheduledMessages.data?.data &&
        scheduledMessages.data.data.length === 0 && (
          <div className="grid place-content-center mt-2 mb-2">
            <div className="flex flex-col justify-center items-center text-lime-400 text-lg md:text-xl">
              <MdSchedule size={64} />
              Serenity in the schedule.
            </div>
          </div>
        )}
      {currentUser.data?.data &&
        scheduledMessages.data?.data &&
        scheduledMessages.data.data["map"] &&
        scheduledMessages.data.data
          .filter((record) => sub(record.date, {}).getTime() > Date.now())
          .map((record) => {
            return (
              <div
                key={record.id}
                className="flex flex-col gap-1 rounded-md p-2 bg-lime-600 mt-2"
              >
                <ChatRecord
                  record={record}
                  currentChatRoom={currentChatRoom}
                  currentUser={currentUser.data.data}
                  isSimplePreview
                />
                <p className="font-semibold text-lime-400">
                  {"Scheduled at: "}
                  {timeFormat === "12-hour"
                    ? format(sub(record.date, {}), "LLLL dd, yyyy hh:mm a")
                    : format(sub(record.date, {}), "LLLL dd, yyyy HH:mm")}
                </p>
                <div className="flex justify-center items-center gap-2">
                  <PrimaryButton
                    customStyles="mt-0 bg-lime-500"
                    onclick={() => {
                      ModalUtils.openCustomModal(
                        modalContext,
                        <MessageScheduler
                          currentChatRoom={currentChatRoom}
                          rescheduleTarget={record}
                        />,
                        true
                      );
                    }}
                  >
                    <div className="flex justify-center items-center gap-2">
                      <FaClock /> Reschedule
                    </div>
                  </PrimaryButton>

                  <PrimaryButton
                    onclick={() => {
                      if (!unscheduleMessageMutation.isPending) {
                        unscheduleMessageMutation.mutate(record.id);
                      }
                    }}
                    customStyles="mt-0 bg-red-500"
                  >
                    <div className="flex justify-center items-center gap-2 px-2">
                      <MdCancelScheduleSend />
                      Unschedule
                    </div>
                  </PrimaryButton>
                </div>
              </div>
            );
          })}
    </div>
  );
}
