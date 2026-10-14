import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock3,
  MapPinned,
  Menu,
  Plus,
  Search,
  Settings,
  StickyNote,
  X,
} from "lucide-react";
import api from "../../services/api";
import "./OperationsCalendar.css";

const asList = (data) => (Array.isArray(data) ? data : data?.results || []);
const pad = (value) => String(value).padStart(2, "0");
const dateKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const toLocalDate = (value) => value ? new Date(`${value}T00:00:00`) : null;
const addDays = (date, amount) => {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
};
const startOfWeek = (date) => {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  result.setDate(result.getDate() - result.getDay());
  return result;
};
const guestName = (reservation) => {
  const details = reservation.guest_details;
  return details
    ? `${details.first_name || ""} ${details.last_name || ""}`.trim() || "Guest"
    : `Guest #${reservation.guest}`;
};

const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const HOURS = Array.from({ length: 12 }, (_, index) => index + 11);

export default function OperationsCalendar() {
  const navigate = useNavigate();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [view, setView] = useState("week");
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showReservationDetails, setShowReservationDetails] = useState(true);
  const [notesOpen, setNotesOpen] = useState(false);
  const [note, setNote] = useState("");
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let mounted = true;
    api.get("/reservations/")
      .then((response) => {
        if (mounted) setReservations(asList(response.data));
      })
      .catch((err) => {
        if (mounted) setError(err.response?.data?.detail || err.message || "Failed to load calendar data.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  const weekStart = useMemo(() => startOfWeek(selectedDate), [selectedDate]);
  const days = useMemo(() => {
    if (view === "day") return [new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate())];
    return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  }, [selectedDate, view, weekStart]);
  const todayKey = dateKey(now);
  const displayedReservations = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return reservations;
    return reservations.filter((reservation) => (
      guestName(reservation).toLowerCase().includes(query)
      || String(reservation.room_details?.room_number || reservation.room || "").toLowerCase().includes(query)
      || String(reservation.status || "").toLowerCase().includes(query)
    ));
  }, [reservations, search]);

  const eventsByDate = useMemo(() => {
    const events = new Map();
    const addEvent = (date, event) => {
      const key = dateKey(date);
      if (!events.has(key)) events.set(key, []);
      events.get(key).push(event);
    };

    displayedReservations.forEach((reservation) => {
      const checkIn = toLocalDate(reservation.check_in_date);
      const checkOut = toLocalDate(reservation.check_out_date);
      const name = guestName(reservation);
      const room = reservation.room_details?.room_number || reservation.room;
      const details = room ? `Room ${room}` : "Reservation";

      if (checkIn) addEvent(checkIn, { type: "arrival", label: `Arrival · ${name}`, details, id: reservation.id });
      if (checkOut) addEvent(checkOut, { type: "departure", label: `Departure · ${name}`, details, id: reservation.id });

      if (checkIn && checkOut) {
        for (let date = addDays(checkIn, 1); date < checkOut; date = addDays(date, 1)) {
          addEvent(date, { type: "stay", label: `${name} · in-house`, details, id: reservation.id });
        }
      }
    });
    return events;
  }, [displayedReservations]);

  const dateLabel = new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(selectedDate);
  const monthValue = `${selectedDate.getFullYear()}-${pad(selectedDate.getMonth() + 1)}`;
  const isTodaySelected = dateKey(selectedDate) === todayKey;
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const showCurrentTime = isTodaySelected && currentHour >= 11 && currentHour < 23;
  const currentTimeTop = `${((currentHour - 11 + currentMinute / 60) / 12) * 100}%`;

  function moveDate(amount) {
    setSelectedDate((current) => addDays(current, amount * (view === "week" ? 7 : 1)));
  }

  function handleMonthChange(event) {
    if (!event.target.value) return;
    const [year, month] = event.target.value.split("-").map(Number);
    setSelectedDate(new Date(year, month - 1, 1));
  }

  return (
    <div className={`ops-calendar ${view === "day" ? "ops-calendar--day" : ""}`}>
      <header className="calendar-toolbar">
        <div className="calendar-toolbar-left">
          <div className="calendar-menu-wrap">
            <button className="calendar-icon-button" type="button" aria-label="Open navigation" title="Navigation" onClick={() => setMenuOpen((open) => !open)}>
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            {menuOpen && (
              <div className="calendar-popover calendar-nav-menu">
                <button type="button" onClick={() => navigate("/dashboard")}>Dashboard</button>
                <button type="button" onClick={() => navigate("/reservations")}>Reservations</button>
                <button type="button" onClick={() => navigate("/housekeeping")}>Housekeeping</button>
              </div>
            )}
          </div>
          <button className="calendar-today-button" type="button" onClick={() => setSelectedDate(new Date())}>Today</button>
          <div className="calendar-pagination" aria-label="Calendar date navigation">
            <button className="calendar-icon-button" type="button" aria-label="Previous" title="Previous" onClick={() => moveDate(-1)}><ChevronLeft size={20} /></button>
            <button className="calendar-icon-button" type="button" aria-label="Next" title="Next" onClick={() => moveDate(1)}><ChevronRight size={20} /></button>
          </div>
          <label className="calendar-month-select">
            <span>{dateLabel}</span>
            <ChevronDown size={16} />
            <input type="month" value={monthValue} onChange={handleMonthChange} aria-label="Choose month" />
          </label>
        </div>

        <div className="calendar-toolbar-right">
          {searchOpen && <input className="calendar-search-input" autoFocus placeholder="Search guests or rooms" value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search reservations" />}
          <button className={`calendar-icon-button ${searchOpen ? "is-active" : ""}`} type="button" aria-label="Search" title="Search" onClick={() => { setSearchOpen((open) => !open); setSearch(""); }}><Search size={19} /></button>
          <div className="calendar-menu-wrap">
            <button className={`calendar-icon-button ${helpOpen ? "is-active" : ""}`} type="button" aria-label="Help" title="Help" onClick={() => setHelpOpen((open) => !open)}><CircleHelp size={19} /></button>
            {helpOpen && <div className="calendar-popover calendar-help-popover">Choose a date or use the arrows to move through the calendar. Reservation arrivals and departures appear in the all-day row.</div>}
          </div>
          <div className="calendar-menu-wrap">
            <button className={`calendar-icon-button ${settingsOpen ? "is-active" : ""}`} type="button" aria-label="Settings" title="Settings" onClick={() => setSettingsOpen((open) => !open)}><Settings size={19} /></button>
            {settingsOpen && <div className="calendar-popover calendar-settings-popover"><label><input type="checkbox" checked={showReservationDetails} onChange={(event) => setShowReservationDetails(event.target.checked)} /> Show reservation details</label><span>Time zone: Local time</span></div>}
          </div>
          <label className="calendar-view-select">
            <select value={view} onChange={(event) => setView(event.target.value)} aria-label="Calendar view">
              <option value="week">Week</option>
              <option value="day">Day</option>
            </select>
            <ChevronDown size={15} />
          </label>
        </div>
      </header>

      {error && <div className="calendar-error" role="alert">{typeof error === "string" ? error : "Could not load calendar reservations."}</div>}

      <div className="calendar-workspace">
        <main className="calendar-board">
          <div className="calendar-grid-scroll">
            <div className="calendar-week-layout" style={{ "--calendar-day-count": days.length }}>
              <div className="calendar-date-header">
                <div className="calendar-date-gutter" />
                {days.map((day) => {
                  const key = dateKey(day);
                  return (
                    <div className={`calendar-date-cell ${key === todayKey ? "is-today" : ""}`} key={key}>
                      <span className="calendar-weekday">{WEEKDAYS[day.getDay()]}</span>
                      <span className={`calendar-date-number ${key === todayKey ? "is-today" : ""}`}>{day.getDate()}</span>
                    </div>
                  );
                })}
              </div>

              <div className="calendar-allday-row">
                <div className="calendar-allday-label">All day</div>
                {days.map((day) => {
                  const events = eventsByDate.get(dateKey(day)) || [];
                  const taskCount = events.filter((event) => event.type === "arrival" || event.type === "departure").length;
                  return (
                    <div className="calendar-allday-cell" key={dateKey(day)}>
                      {showReservationDetails && events.slice(0, 3).map((event, index) => (
                        <button className={`calendar-event calendar-event--${event.type}`} type="button" key={`${event.id}-${event.type}-${index}`} onClick={() => navigate(`/reservations/${event.id}`)} title={`${event.label} · ${event.details}`}>
                          <span>{event.label}</span>
                        </button>
                      ))}
                      {showReservationDetails && events.length > 3 && <span className="calendar-more-events">+{events.length - 3} more</span>}
                      {taskCount > 0 && <span className="calendar-task-count"><CheckCheck size={13} /> {taskCount} task{taskCount === 1 ? "" : "s"}</span>}
                    </div>
                  );
                })}
              </div>

              <div className="calendar-time-layout">
                <div className="calendar-time-axis">
                  {HOURS.map((hour, index) => (
                    <span className="calendar-time-label" style={{ gridRow: index + 1 }} key={hour}>{pad(hour)}:00</span>
                  ))}
                  <span className="calendar-time-label calendar-time-label--end">23:00</span>
                </div>
                {days.map((day) => {
                  const key = dateKey(day);
                  return (
                    <div className={`calendar-day-column ${key === todayKey ? "is-today" : ""}`} key={key}>
                      {HOURS.map((hour) => <div className="calendar-hour-cell" key={hour} />)}
                      {showCurrentTime && key === todayKey && <div className="calendar-now-line" style={{ top: currentTimeTop }}><span>{pad(currentHour)}:{pad(currentMinute)}</span></div>}
                    </div>
                  );
                })}
              </div>

              {loading && <div className="calendar-loading"><Clock3 size={15} /> Loading reservations…</div>}
              {!loading && !error && displayedReservations.length === 0 && <div className="calendar-no-results">No reservations match this search.</div>}
            </div>
          </div>
        </main>

        <aside className="calendar-utility-rail" aria-label="Calendar tools">
          <button className="calendar-rail-button is-selected" type="button" aria-label="Calendar" title="Calendar"><CalendarDays size={19} /></button>
          <button className="calendar-rail-button" type="button" aria-label="Tasks and housekeeping" title="Tasks and housekeeping" onClick={() => navigate("/housekeeping")}><CheckCheck size={19} /></button>
          <button className={`calendar-rail-button ${notesOpen ? "is-selected" : ""}`} type="button" aria-label="Notes" title="Notes" onClick={() => setNotesOpen((open) => !open)}><StickyNote size={19} /></button>
          <button className="calendar-rail-button" type="button" aria-label="Rooms" title="Rooms" onClick={() => navigate("/rooms")}><MapPinned size={19} /></button>
          <button className="calendar-rail-add" type="button" aria-label="Create reservation" title="Create reservation" onClick={() => navigate("/reservations/new")}><Plus size={22} /></button>
        </aside>

        {notesOpen && (
          <section className="calendar-notes-panel" aria-label="Quick notes">
            <div className="calendar-notes-heading"><strong>Quick notes</strong><button type="button" aria-label="Close notes" onClick={() => setNotesOpen(false)}><X size={17} /></button></div>
            <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Add a note for your shift…" />
            <span>Notes stay in this browser session.</span>
          </section>
        )}
      </div>
    </div>
  );
}