// The polling day shown on demo voter cards. Fictional, and labelled as such wherever it appears:
// ElectraLens holds no election schedule; real dates come from the Election Commission.
export const DEMO_POLL = {
  date: '2027-02-14',
  opens: '07:00',
  closes: '18:00',
} as const;

/** The demo polling day and hours in the reader's language, for example "Sunday, 14 February 2027". */
export function demoPollText(locale: string) {
  const tag = locale === 'hi' ? 'hi-IN' : 'en-IN';
  const day = new Intl.DateTimeFormat(tag, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(`${DEMO_POLL.date}T12:00:00+05:30`));
  const time = (hhmm: string) =>
    new Intl.DateTimeFormat(tag, {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'Asia/Kolkata',
    }).format(new Date(`${DEMO_POLL.date}T${hhmm}:00+05:30`));
  return { day, opens: time(DEMO_POLL.opens), closes: time(DEMO_POLL.closes) };
}
