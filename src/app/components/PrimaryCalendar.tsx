import { format } from "date-fns";
import React, { Dispatch, SetStateAction } from "react";
import Calendar, { OnClickFunc } from "react-calendar";
import { GrLinkNext, GrLinkPrevious } from "react-icons/gr";
type PrimaryCalendarType = {
  onClickDay?: OnClickFunc;
  onClickYear?: OnClickFunc;
  setMonthName?: Dispatch<SetStateAction<string>>;
};
export default function PrimaryCalendar({
  onClickDay,
  onClickYear,
  setMonthName,
}: PrimaryCalendarType) {
  return (
    <Calendar
      tileDisabled={({ date }) => {
        const now = new Date().getTime();

        return date.getTime() > now;
      }}
      maxDetail="month"
      minDetail="year"
      locale="en-US"
      nextLabel={
        <div className="">
          <GrLinkNext size={16} />
        </div>
      }
      prevLabel={
        <div className="">
          <GrLinkPrevious size={16} />
        </div>
      }
      next2Label={null}
      prev2Label={null}
      onClickDay={onClickDay}
      onClickYear={onClickYear}
      onActiveStartDateChange={(prop) => {
        if (prop.view === "month" && setMonthName) {
          setMonthName(
            Math.random() > 0.5
              ? format(prop.activeStartDate ?? new Date(), "MMMM").toLowerCase()
              : "week"
          );
        }
      }}
      className="bg-lime-600 rounded-md p-2 text-white text-center"
      tileClassName="p-2 text-sm border-[1px] border-transparent hover:border-lime-300 bg-transparent hover:bg-lime-500 grid place-content-center whitespace-nowrap transition"
    />
  );
}
