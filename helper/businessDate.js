
const getWeekdayName = (date) => {
  const weekdays = [
    "SUNDAY",
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
  ];

  return weekdays[date.getUTCDay()];
};


// Checks whether a date is one of the branch's normal operating days.
 

const isOperatingDay = (date, operatingDays) => {
  const weekday = getWeekdayName(date);

  return operatingDays.includes(weekday);
};


const getOperatingDates = ({ startDate, endDate, operatingDays }) => {
  const dates = [];

  const current = new Date(`${startDate}T00:00:00.000Z`);

  const end = new Date(`${endDate}T00:00:00.000Z`);

  while (current <= end) {
    if (isOperatingDay(current, operatingDays)) {
      dates.push(current.toISOString().slice(0, 10));
    }

    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
};

//     GET TODAY IN A BRANCH TIMEZONE

const getTodayForTimezone = (timezone) => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(new Date());
};


//   GET CURRENT TIME IN A BRANCH TIMEZONE

const getCurrentTimeForTimezone = (timezone) => {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return formatter.format(new Date());
};

//  IS BRANCH CURRENTLY OPEN?

const isBranchOpen = ({
  timezone,
  operatingDays,
  openingTime,
  closingTime,
}) => {
  const now = new Date();

  const weekdayFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "long",
  });

  const currentWeekday = weekdayFormatter.format(now).toUpperCase();

  if (!operatingDays.includes(currentWeekday)) {
    return false;
  }

  const currentTime = getCurrentTimeForTimezone(timezone);

  return currentTime >= openingTime && currentTime < closingTime;
};

module.exports = {
  getWeekdayName,
  isOperatingDay,
    getOperatingDates,
    getTodayForTimezone,
    getCurrentTimeForTimezone,
    isBranchOpen
};
