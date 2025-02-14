import React, {
  Dispatch,
  SetStateAction,
  useCallback,
  useContext,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import PrimaryCalendar from "./PrimaryCalendar";
import { format } from "date-fns";
import { FaArrowLeft, FaClock } from "react-icons/fa";
import PrimaryButton from "./PrimaryButton";
import { FaClockRotateLeft, FaX } from "react-icons/fa6";
import ModalUtils from "../util/ModalUtil";
import ModalContext from "../contexts/ModalContext";
import { MdScheduleSend } from "react-icons/md";
import { ChatRecordType } from "../types/ChatRecordType";
import { useMutation, useQuery } from "@tanstack/react-query";
import api from "../api/api";
import queryClient from "../query/QueryClient";
import { ChatRoom } from "../types/ChatRoom";
import ChatRecord from "./ChatRecord";
import { User } from "../types/User";
import ScheduledMessageManager from "./ScheduledMessageManager";

export default function MessageScheduler({
  setMessageScheduler,
  rescheduleTarget,
  currentChatRoom,
}: {
  setMessageScheduler?: Dispatch<SetStateAction<number>>;
  rescheduleTarget?: ChatRecordType;
  currentChatRoom?: ChatRoom;
}) {
  const modalContext = useContext(ModalContext);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const hours = useMemo(() => {
    const values = new Array(12).fill(0).map((e, i) => {
      const string = (i + 1).toString();
      if (string.length === 2) return string;
      else return "0" + string;
    });

    return values;
  }, []);
  const minutes = useMemo(() => {
    return new Array(60).fill(0).map((e, i) => {
      const string = i.toString();
      return string.length === 2 ? string : "0" + string;
    });
  }, []);

  const rescheduleMessageMutation = useMutation({
    mutationFn: ({
      recordId,
      scheduledTime,
    }: {
      recordId: number;
      scheduledTime: number;
    }) => {
      return api.post(`/chat/message/scheduled/${recordId}`, {
        scheduledTime,
      });
    },
    onSettled(data, err, variables) {
      if (data?.status === 200) {
        queryClient.setQueryData(
          ["scheduled_messages", currentChatRoom?.id.toString()],
          (prev: { data: ChatRecordType[] }) => {
            if (!prev) {
              return prev;
            }
            return {
              data: prev.data.map((e) => {
                if (e.id === variables.recordId) {
                  return {
                    ...e,
                    date: new Date(variables.scheduledTime),
                  };
                }
                return e;
              }),
            };
          }
        );

        if (currentChatRoom)
          ModalUtils.openGenericModal(
            modalContext,
            "",
            "",
            undefined,
            <ScheduledMessageManager currentChatRoom={currentChatRoom} />,
            undefined,
            <div className="flex justify-center items-center gap-2">
              <FaClockRotateLeft /> View Scheduled Messages
            </div>,
            true
          );
      } else if (data) {
        ModalUtils.handleGenericError(modalContext, data);
      }
    },
  });
  useEffect(() => {
    const now = new Date();
    if (selectedDate) {
      const currentHour = document.getElementById("hour-" + format(now, "hh"));
      const currentMinute = document.getElementById(
        "minute-" + format(now, "mm")
      );
      const currentMeridiem = document.getElementById(
        "amPm-" + format(now, "a")
      );

      if (currentHour && currentMinute && currentMeridiem) {
        currentHour.scrollIntoView({
          block: "start",
          behavior: "smooth",
        });
        currentMinute.scrollIntoView({
          block: "start",
          behavior: "smooth",
        });
        currentMeridiem.scrollIntoView({
          block: "start",
          behavior: "smooth",
        });
      }
    }
  }, [selectedDate]);
  const [selectedTime, setSelectedTime] = useState<{
    hour: number;
    minute: number;
    amPm: string;
  }>({
    hour: 0,
    minute: 0,
    amPm: "AM",
  });
  const selectedTimeDeferred = useDeferredValue(selectedTime);

  useEffect(() => {
    const hours = document.getElementById("hoursSelector")?.children;
    const minutes = document.getElementById("minutesSelector")?.children;
    const amPm = document.getElementById("amPmSelector")?.children;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0] && entries[0].isIntersecting) {
          const content = entries[0].target.textContent;
          if (!content) return;

          if (entries[0].target.className.includes("minute")) {
            setSelectedTime((prev) => ({
              ...prev,
              minute: content.startsWith("0")
                ? parseInt(content.substring(1))
                : parseInt(content),
            }));
          } else if (entries[0].target.className.includes("hour")) {
            setSelectedTime((prev) => ({
              ...prev,
              hour: content.startsWith("0")
                ? parseInt(content.substring(1))
                : parseInt(content),
            }));
          } else if (entries[0].target.className.includes("amPm")) {
            setSelectedTime((prev) => ({
              ...prev,
              amPm: content,
            }));
          }
        }
      },
      { threshold: 0.9 }
    );

    if (hours && minutes && amPm) {
      for (const hour of hours) {
        observer.observe(hour);
      }

      for (const minute of minutes) {
        observer.observe(minute);
      }

      for (const e of amPm) {
        observer.observe(e);
      }
    }

    return () => {
      observer.disconnect();
    };
  }, [selectedDate]);

  const [outdated, setOutdated] = useState(false);

  const parsedDate = useMemo(() => {
    if (!selectedDate) {
      return new Date(Date.now() + 100000);
    }
    let hour = selectedTime.hour;

    if (selectedTime.amPm === "PM" && hour < 12) {
      hour += 12;
    } else if (selectedTime.amPm === "AM" && hour === 12) {
      hour = 0;
    }

    const date = new Date(selectedDate.getTime());

    date.setHours(hour);
    date.setMinutes(selectedTime.minute);

    return date;
  }, [selectedDate, selectedTimeDeferred]);

  const parsedDateDeferred = useDeferredValue(parsedDate);
  useEffect(() => {
    setOutdated(parsedDateDeferred.getTime() <= Date.now());
  }, [parsedDateDeferred]);
  const handleScheduleMessage = useCallback(() => {
    if (parsedDateDeferred.getTime() <= Date.now()) {
      ModalUtils.openGenericModal(
        modalContext,
        "Oof.",
        "You cannot schedule into the past!"
      );
    }

    if (rescheduleTarget) {
      if (!rescheduleMessageMutation.isPending)
        rescheduleMessageMutation.mutate({
          recordId: rescheduleTarget.id,
          scheduledTime: parsedDateDeferred.getTime(),
        });
    } else if (setMessageScheduler) {
      setMessageScheduler(parsedDateDeferred.getTime());
    }

    ModalUtils.closeCurrentModal(modalContext);
  }, [
    parsedDateDeferred,
    rescheduleMessageMutation,
    rescheduleTarget,
    setMessageScheduler,
  ]);

  const currentUser = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const response = await api.get<User>("/users");
      return { data: response.data };
    },
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  return (
    <div className="p-2 overflow-y-scroll max-h-[95vh] min-w-[40vw]">
      {selectedDate ? (
        <div className="animate-fadeInLeft bg-lime-600 rounded-md p-2">
          {rescheduleTarget && currentChatRoom && currentUser.data?.data && (
            <div className="p-2 flex flex-col mb-2 bg-lime-600 rounded-md text-lg">
              Rescheduling
              <ChatRecord
                record={rescheduleTarget}
                currentChatRoom={currentChatRoom}
                currentUser={currentUser.data.data}
              />
            </div>
          )}
          <div className="flex items-center justify-center">
            <div
              className="text-lime-400 cursor-pointer transition hover:text-opacity-50 p-2"
              onClick={() => setSelectedDate(null)}
            >
              <FaArrowLeft />
            </div>
            <p className="text-lime-400 font-semibold text-lg">
              {format(selectedDate, "LLLL dd, yyyy")}
            </p>
          </div>

          <div className="flex items-center mt-2 justify-center gap-2 text-lime-400">
            <FaClock />
            <div className="flex items-center gap-2 justify-center">
              <div
                id="hoursSelector"
                className="no-scrollbar h-[3rem] shadow-lime-200 shadow-inner overflow-y-scroll snap-y snap-mandatory p-2 rounded-md"
              >
                {hours.map((hour) => (
                  <div
                    id={"hour-" + hour}
                    key={hour}
                    className="hour h-[3rem] snap-start grid place-content-center"
                  >
                    {hour}
                  </div>
                ))}
              </div>
              <p>:</p>
              <div
                id="minutesSelector"
                className="no-scrollbar h-[3rem] shadow-lime-200 shadow-inner overflow-y-scroll snap-y snap-mandatory p-2 rounded-md"
              >
                {minutes.map((minute) => (
                  <div
                    id={"minute-" + minute}
                    key={minute}
                    className="minute h-[3rem] snap-start grid place-content-center"
                  >
                    {minute}
                  </div>
                ))}
              </div>

              <div
                id="amPmSelector"
                className="no-scrollbar h-[3rem] shadow-lime-200 shadow-inner overflow-y-scroll snap-y snap-mandatory p-2 rounded-md"
              >
                <div
                  id="amPm-AM"
                  className="amPm h-[3rem] snap-start grid place-content-center"
                >
                  AM
                </div>
                <div
                  id="amPm-PM"
                  className="amPm h-[3rem] snap-start grid place-content-center"
                >
                  PM
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-center gap-2">
            <PrimaryButton
              disabled={outdated}
              onclick={() => handleScheduleMessage()}
              customStyles="bg-lime-500 mt-5 px-2"
            >
              <div className="flex items-center gap-2 justify-center">
                <MdScheduleSend /> Schedule
              </div>
            </PrimaryButton>
            <PrimaryButton
              onclick={() => ModalUtils.closeCurrentModal(modalContext)}
              customStyles="bg-red-500 mt-5 px-2"
            >
              <div className="flex items-center gap-2 justify-center">
                <FaX /> Cancel
              </div>
            </PrimaryButton>
          </div>
        </div>
      ) : (
        <div className="animate-fadeInRight">
          {rescheduleTarget && currentChatRoom && currentUser.data?.data && (
            <div className="p-2 flex flex-col mb-2 bg-lime-600 rounded-md text-lg">
              Rescheduling
              <ChatRecord
                record={rescheduleTarget}
                currentChatRoom={currentChatRoom}
                currentUser={currentUser.data.data}
              />
            </div>
          )}
          <PrimaryCalendar
            customTileDisabled={({ date }) => {
              const yesterday = new Date();
              yesterday.setDate(yesterday.getDate() - 1);
              yesterday.setHours(23, 59, 59, 999);

              return date.getTime() <= yesterday.getTime();
            }}
            onClickDay={(date, event) => {
              setSelectedDate(date);
            }}
          />

          <PrimaryButton
            onclick={() => ModalUtils.closeCurrentModal(modalContext)}
            customStyles="bg-red-500 px-2"
          >
            <div className="flex items-center gap-2 justify-center">
              <FaX /> Cancel
            </div>
          </PrimaryButton>
        </div>
      )}
    </div>
  );
}
