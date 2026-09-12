import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/useAuth";
import api from "../../services/api";
import "./Dashboard.css";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight, BedDouble, CalendarDays, CheckCircle2, ClipboardList,
  DoorOpen, LogIn, LogOut, Plus, RefreshCw, Settings2, ShieldCheck,
  Sparkles, Wrench,
} from "lucide-react";

const ROOM_STATUSES = [
  ["AVAILABLE", "Available"],
  ["OCCUPIED", "Occupied"],
  ["DIRTY", "Dirty"],
  ["CLEANING", "Cleaning"],
  ["MAINTENANCE", "Maintenance"],
  ["OUT_OF_ORDER", "Out of Order"],
];

const asList = (data) =>
  Array.isArray(data) ? data : data?.results || [];

const dateToday = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  }).format(new Date());

const label = (value) =>
  String(value || "—")
    .replaceAll("_", " ")
    .split(" ")
    .map((word) =>
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    )
    .join(" ");

const guestName = (item) =>
  item.guest_details
    ? `${item.guest_details.first_name} ${item.guest_details.last_name}`.trim()
    : item.guest ? `Guest #${item.guest}` : "Guest";

const displayDate = (value) => value ? new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(`${value}T00:00:00`)) : "—";


/* =========================================================
   SUMMARY CARD
========================================================= */

function SummaryCard({ title, value, note, valueInline, loading, variant, icon: Icon = ClipboardList }) {
  return (
    <article className={`summary-card summary-card--${variant}`}>
      <div className="summary-card-top">
        <span className="summary-icon"><Icon size={19} strokeWidth={2} /></span>
        <span className="summary-title">{title}</span>
      </div>
      {loading ? (
        <div className="skeleton skeleton-value" />
      ) : valueInline ? (
        <div className="summary-value" dangerouslySetInnerHTML={{ __html: value }} />
      ) : (
        <div className="summary-value">{value}</div>
      )}
      {note && <div className="summary-subtitle">{note}</div>}
    </article>
  );
}


/* =========================================================
   OPERATIONS TABLE
========================================================= */

function OperationTable({
  title,
  reservations,
  dateField,
  emptyText,
  loading,
}) {
  return (
    <section className="dashboard-panel">
      <h2>{title}</h2>

      {loading ? (
        <div className="dashboard-loading">
          <span className="spinner" />
          Loading…
        </div>
      ) : reservations.length === 0 ? (
        <div className="reservations-empty">
          {emptyText}
        </div>
      ) : (
        <div className="reservations-wrap">
          <table className="reservations-table">
            <thead>
              <tr>
                <th>Guest</th>
                <th>Room</th>
                <th>
                  {dateField === "check_in_date"
                    ? "Check-in"
                    : "Check-out"}
                </th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {reservations.map((item) => (
                <tr key={item.id}>
                  <td data-label="Guest">
                    <div className="guest-name">
                      {guestName(item)}
                    </div>

                    <div className="guest-contact">
                      {item.guest_details?.phone ||
                        item.guest_details?.email ||
                        ""}
                    </div>
                  </td>

                  <td data-label="Room">
                    {item.room_details?.room_number ||
                      `Room #${item.room}`}
                  </td>

                  <td
                    data-label={
                      dateField === "check_in_date"
                        ? "Check-in"
                        : "Check-out"
                    }
                  >
                    {displayDate(item[dateField])}
                  </td>

                  <td data-label="Status">
                    <span
                      className={`status status-${String(
                        item.status
                      ).toLowerCase()}`}
                    >
                      {label(item.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}


/* =========================================================
   RECENT RESERVATIONS TABLE
========================================================= */

function RecentReservationsTable({
  reservations,
  loading,
  navigate,
}) {
  return (
    <section className="dashboard-panel">

      <div className="panel-heading">
        <div><div className="eyebrow">Today's activity</div><h2>Today's reservations</h2></div>
        <button className="panel-link" onClick={() => navigate("/reservations")}>
          View all reservations <ArrowRight size={14} />
        </button>
      </div>

      {loading ? (
        <div className="dashboard-loading">
          <span className="spinner" /><span>Loading reservations…</span>
        </div>
      ) : reservations.length === 0 ? (
        <div className="reservations-empty">
          <CalendarDays size={24} />
          <strong>No reservations today</strong>
          <span>No arrivals or departures are scheduled for today.</span>
        </div>
      ) : (
        <div className="reservations-wrap">
          <table className="reservations-table">
            <thead>
              <tr>
                <th>Guest</th>
                <th>Room</th>
                <th>Check-in</th>
                <th>Check-out</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {reservations.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => navigate(`/reservations/${item.id}`)}
                  style={{ cursor: "pointer" }}
                >
                  <td data-label="Guest">
                    <div className="guest-name">
                      {guestName(item)}
                    </div>
                    <div className="guest-contact">
                      {item.guest_details?.phone ||
                        item.guest_details?.email ||
                        ""}
                    </div>
                  </td>

                  <td data-label="Room">
                    {item.room_details?.room_number ||
                      `Room #${item.room}`}
                  </td>

                  <td data-label="Check-in">{displayDate(item.check_in_date)}</td>
                  <td data-label="Check-out">{displayDate(item.check_out_date)}</td>

                  <td data-label="Status">
                    <span
                      className={`status status-${String(
                        item.status
                      ).toLowerCase()}`}
                    >
                      {label(item.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}


/* =========================================================
   MAINTENANCE DASHBOARD
========================================================= */

function MaintenanceDashboard({
  data,
  loading,
  navigate,
}) {
  const requests = data.maintenance || [];

  const openRequests = requests.filter(
    (item) => item.status === "OPEN"
  );

  const inProgressRequests = requests.filter(
    (item) => item.status === "IN_PROGRESS"
  );

  const urgentRequests = requests.filter(
    (item) =>
      item.priority === "URGENT" &&
      !["RESOLVED", "CANCELLED"].includes(item.status)
  );

  const resolvedRequests = requests.filter(
    (item) => item.status === "RESOLVED"
  );

  const cancelledRequests = requests.filter(
    (item) => item.status === "CANCELLED"
  );

  const maintenanceRooms = data.rooms.filter(
    (room) => room.status === "MAINTENANCE"
  );

  return (
    <div className="dashboard-root">

      {/* HEADER */}
      <div className="dashboard-header">
        <div>
          <h1>Maintenance Dashboard</h1>

          <div className="welcome">
            Maintenance operations overview
          </div>
        </div>

        <button
          className="btn-ghost small"
          onClick={() => navigate("/maintenance")}
        >
          View maintenance
        </button>
      </div>


      {/* SUMMARY CARDS */}
      <div className="summary-grid">

        <SummaryCard
          title="Open Requests"
          value={openRequests.length}
          note="Waiting for action"
          loading={loading}
          variant="arrivals"
        />

        <SummaryCard
          title="In Progress"
          value={inProgressRequests.length}
          note="Currently being repaired"
          loading={loading}
          variant="departures"
        />

        <SummaryCard
          title="Urgent Issues"
          value={urgentRequests.length}
          note="Require immediate attention"
          loading={loading}
          variant="occupied"
        />

        <SummaryCard
          title="Resolved"
          value={resolvedRequests.length}
          note="Completed maintenance"
          loading={loading}
          variant="available"
        />

        <SummaryCard
          title="Cancelled"
          value={cancelledRequests.length}
          note="Cancelled requests"
          loading={loading}
          variant="departures"
        />

        <SummaryCard
          title="Rooms Under Maintenance"
          value={maintenanceRooms.length}
          note="Currently unavailable"
          loading={loading}
          variant="occupied"
        />

      </div>


      {/* MAINTENANCE REQUESTS */}
      <section className="dashboard-panel">

        <div className="panel-heading">
          <h2>Maintenance Requests</h2>

          <button
            className="btn-ghost small"
            onClick={() => navigate("/maintenance")}
          >
            View all
          </button>
        </div>


        {loading ? (
          <div className="dashboard-loading">
            Loading maintenance requests…
          </div>
        ) : requests.length === 0 ? (
          <div className="reservations-empty">
            No maintenance requests found.
          </div>
        ) : (
          <div className="reservations-wrap">

            <table className="reservations-table">

              <thead>
                <tr>
                  <th>Issue</th>
                  <th>Room</th>
                  <th>Priority</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>

                {requests.slice(0, 10).map((item) => (

                  <tr
                    key={item.id}
                    onClick={() =>
                      navigate(`/maintenance/${item.id}`)
                    }
                    style={{ cursor: "pointer" }}
                  >

                    <td data-label="Issue">

                      <div className="guest-name">
                        {item.title}
                      </div>

                    </td>

                    <td data-label="Room">

                      {item.room_details?.room_number ||
                        `Room #${item.room}`}

                    </td>

                    <td data-label="Priority">

                      <span
                        className={`status status-${String(
                          item.priority
                        ).toLowerCase()}`}
                      >
                        {label(item.priority)}
                      </span>

                    </td>

                    <td data-label="Status">

                      <span
                        className={`status status-${String(
                          item.status
                        ).toLowerCase()}`}
                      >
                        {label(item.status)}
                      </span>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>
        )}

      </section>


      {/* ROOMS UNDER MAINTENANCE */}
      <section className="room-status dashboard-panel">

        <div className="panel-heading">

          <h2>Rooms Under Maintenance</h2>

          <button
            className="btn-ghost small"
            onClick={() =>
              navigate("/rooms?status=MAINTENANCE")
            }
          >
            View rooms
          </button>

        </div>


        {maintenanceRooms.length === 0 ? (

          <div className="reservations-empty">
            No rooms are currently under maintenance.
          </div>

        ) : (

          <div className="status-grid">

            {maintenanceRooms.map((room) => (

              <button
                key={room.id}
                className="status-item"
                onClick={() =>
                  navigate(`/rooms/${room.id}`)
                }
              >

                <span className="status-label">
                  Room {room.room_number}
                </span>

                <span className="status-count">
                  Maintenance
                </span>

              </button>

            ))}

          </div>

        )}

      </section>

    </div>
  );
}


/* =========================================================
   MAIN DASHBOARD
========================================================= */

export default function Dashboard() {

  const { user, activeHotel } = useAuth();

  const navigate = useNavigate();

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [data, setData] = useState({
    rooms: [],
    reservations: [],
    guests: [],
    housekeeping: [],
    maintenance: [],
    folios: [],
  });


  /* =====================================================
     LOAD DASHBOARD DATA
  ===================================================== */

  const load = useCallback(async () => {

    setLoading(true);
    setError("");

    try {

      const [
        roomsRes,
        reservationsRes,
        guestsRes,
        housekeepingRes,
        maintenanceRes,
        foliosRes,
      ] = await Promise.all([

        api.get("/rooms/"),

        api.get("/reservations/"),

        api.get("/guests/"),

        api.get("/housekeeping/"),

        api.get("/maintenance/"),

        api.get("/folios/"),

      ]);


      const rooms =
        asList(roomsRes.data);

      const guests =
        asList(guestsRes.data);


      /*
       * Determine hotels available to the
       * currently authenticated user.
       */

      const hotelIds = new Set([
        ...rooms.map(
          (item) => String(item.hotel)
        ),

        ...guests.map(
          (item) => String(item.hotel)
        ),
      ]);


      setData({

        rooms,

        guests,

        reservations:
          asList(reservationsRes.data),

        housekeeping:
          asList(
            housekeepingRes.data
          ).filter(
            (item) =>
              hotelIds.has(
                String(item.hotel)
              )
          ),

        maintenance:
          asList(
            maintenanceRes.data
          ).filter(
            (item) =>
              hotelIds.has(
                String(item.hotel)
              )
          ),

        folios:
          asList(
            foliosRes.data
          ).filter(
            (item) =>
              hotelIds.has(
                String(item.hotel)
              )
          ),

      });

    } catch (err) {

      console.error(
        "Dashboard loading error:",
        err
      );

      setError(
        typeof err.response?.data === "string"
          ? err.response.data
          : "Dashboard data could not be loaded."
      );

    } finally {

      setLoading(false);

    }

  }, []);


  useEffect(() => {

    void (async () => {
      setLoading(true);
      setError("");

      try {
        const [
          roomsRes,
          reservationsRes,
          guestsRes,
          housekeepingRes,
          maintenanceRes,
          foliosRes,
        ] = await Promise.all([
          api.get("/rooms/"),
          api.get("/reservations/"),
          api.get("/guests/"),
          api.get("/housekeeping/"),
          api.get("/maintenance/"),
          api.get("/folios/"),
        ]);

        const rooms = asList(roomsRes.data);
        const guests = asList(guestsRes.data);

        const hotelIds = new Set([
          ...rooms.map((item) => String(item.hotel)),
          ...guests.map((item) => String(item.hotel)),
        ]);

        setData({
          rooms,
          guests,
          reservations: asList(reservationsRes.data),
          housekeeping: asList(housekeepingRes.data).filter((item) => hotelIds.has(String(item.hotel))),
          maintenance: asList(maintenanceRes.data).filter((item) => hotelIds.has(String(item.hotel))),
          folios: asList(foliosRes.data).filter((item) => hotelIds.has(String(item.hotel))),
        });
      } catch (err) {
        console.error("Dashboard loading error:", err);
        setError(typeof err.response?.data === "string" ? err.response.data : "Dashboard data could not be loaded.");
      } finally {
        setLoading(false);
      }
    })();

  }, [load]);


  /* =====================================================
     USER ROLE
  ===================================================== */

  const role = activeHotel?.role || user?.role || "";


  /* =====================================================
     GENERAL METRICS
  ===================================================== */

  const metrics = useMemo(() => {

    const roomCounts =
      Object.fromEntries(
        ROOM_STATUSES.map(
          ([key]) => [key, 0]
        )
      );


    data.rooms.forEach((item) => {

      roomCounts[item.status] =
        (roomCounts[item.status] || 0) + 1;

    });


    const reservationCounts =
      data.reservations.reduce(
        (all, item) => ({

          ...all,

          [item.status]:
            (all[item.status] || 0) + 1,

        }),
        {}
      );

    return {
  roomCounts,
  reservationCounts,

  housekeeping: data.housekeeping.filter(
    (item) => !["COMPLETED", "CANCELLED"].includes(item.status)
  ).length,

  housekeepingCounts: data.housekeeping.reduce((all, item) => {
    all[item.status] = (all[item.status] || 0) + 1;
    return all;
  }, {}),

  maintenanceCounts: data.maintenance.reduce((all, item) => {
    all[item.status] = (all[item.status] || 0) + 1;
    return all;
  }, {}),
};

  }, [data]);


  /* =====================================================
     TODAY'S OPERATIONS
  ===================================================== */

  const currentDate =
    dateToday();


  const checkIns =
    data.reservations.filter(
      (item) =>
        item.check_in_date === currentDate &&
        ![
          "CANCELLED",
          "NO_SHOW",
        ].includes(item.status)
    );


  const checkOuts =
    data.reservations.filter(
      (item) =>
        item.check_out_date === currentDate &&
        [
          "CONFIRMED",
          "CHECKED_IN",
        ].includes(item.status)
    );


  const occupiedRooms =
    metrics.roomCounts.OCCUPIED || 0;

  const totalRooms =
    data.rooms.length;

  const occupancyPct =
    totalRooms > 0
      ? (occupiedRooms / totalRooms) * 100
      : 0;

  const highPriorityMaintenance = data.maintenance.filter(
    (item) =>
      item.priority === "URGENT" &&
      !["RESOLVED", "CANCELLED"].includes(item.status)
  ).length;

  const timeOfDay = new Date().getHours() < 12
    ? "Good morning"
    : new Date().getHours() < 18
      ? "Good afternoon"
      : "Good evening";

  const aiInsight = highPriorityMaintenance > 0
    ? `${highPriorityMaintenance} urgent maintenance ${highPriorityMaintenance === 1 ? "request needs" : "requests need"} attention before the next shift.`
    : checkIns.length > 0
      ? `${checkIns.length} arrival${checkIns.length === 1 ? " is" : "s are"} scheduled today. Your team has a clear runway for check-in.`
      : occupancyPct >= 80
        ? "High occupancy today. Keep room readiness visible and protect your fastest turnarounds."
        : "Your property is in a steady rhythm. A good moment to review room readiness and tomorrow's arrivals.";

  /* =====================================================
     MAINTENANCE ROLE DASHBOARD
  ===================================================== */

  if (role === "MAINTENANCE") {

    return (
      <MaintenanceDashboard
        data={data}
        loading={loading}
        navigate={navigate}
      />
    );

  }


  /* =====================================================
     NORMAL HOTEL DASHBOARD
  ===================================================== */

  return (

    <div className="dashboard-root">

      {/* PROPERTY PULSE */}

      <section className="dashboard-welcome-hero">
        <img
          className="dashboard-welcome-image"
          src="https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1600&q=88"
          alt="Elegant sunlit hotel lounge"
          loading="eager"
        />
        <div className="dashboard-welcome-overlay" />
        <div className="dashboard-welcome-content">
          <div className="dashboard-welcome-copy">
            <span className="dashboard-welcome-kicker">StayCore intelligence · live property brief</span>
            <h1>{timeOfDay}, {user?.first_name || user?.email?.split("@")[0] || "there"}.</h1>
            <p>Everything your team needs to make today feel effortless.</p>
            <div className="dashboard-welcome-stats" aria-label="Live property pulse">
              <span><strong>{Math.round(occupancyPct)}%</strong><small>occupied</small></span>
              <span><strong>{checkIns.length}</strong><small>arrivals today</small></span>
              <span><strong>{metrics.roomCounts.AVAILABLE || 0}</strong><small>rooms ready</small></span>
            </div>
          </div>
          <div className="dashboard-ai-brief">
            <div className="dashboard-ai-brief-top"><span className="dashboard-ai-icon"><Sparkles size={15} /></span><span>AI operations brief</span><span className="dashboard-ai-live">Live</span></div>
            <strong>{aiInsight}</strong>
            <span className="dashboard-ai-meta">Based on your live property activity</span>
          </div>
        </div>
      </section>

      {/* HEADER */}

      <div className="dashboard-header">

        <div>
          <div className="eyebrow">Property overview</div>
          <h2 className="dashboard-overview-title">Today at a glance</h2>
          <div className="welcome">Here's what's happening at your property today.</div>
        </div>

        <div className="header-actions">
          <div className="today-indicator"><CalendarDays size={16} /><span>{new Intl.DateTimeFormat("en", { weekday: "short", month: "short", day: "numeric" }).format(new Date())}</span></div>
          <button className="btn-primary small" onClick={() => navigate("/reservations/new")}><Plus size={16} /> New reservation</button>
          <button className="btn-ghost small refresh-button" onClick={load} disabled={loading}><RefreshCw size={15} className={loading ? "spin" : ""} /> {loading ? "Refreshing…" : "Refresh"}</button>
        </div>

      </div>


      {/* ERROR */}

      {error && (

        <div className="dashboard-error">

          {error}

          <button
            className="btn-ghost small"
            onClick={load}
          >
            Try again
          </button>

        </div>

      )}


      {/* SUMMARY CARDS */}

      <div className="summary-grid">

        <SummaryCard
          title="Occupancy"
          value={
            totalRooms > 0
              ? `${Math.round(
                  (occupiedRooms / totalRooms) * 100
                )}<span class="unit">%</span>`
              : 0
          }
          valueInline
          note={<strong>{occupiedRooms} / {totalRooms} rooms</strong>}
          loading={loading}
          variant="occupied"
          icon={BedDouble}
        />

        <SummaryCard
          title="Today's Arrivals"
          value={checkIns.length}
          note={checkIns.length === 1 ? "Check-in today" : "Check-ins today"}
          loading={loading}
          variant="arrivals"
          icon={LogIn}
        />

        <SummaryCard
          title="Today's Departures"
          value={checkOuts.length}
          note={checkOuts.length === 1 ? "Check-out today" : "Check-outs today"}
          loading={loading}
          variant="departures"
          icon={LogOut}
        />

        <SummaryCard
          title="Available Rooms"
          value={
            metrics.roomCounts.AVAILABLE || 0
          }
          note="Ready for new guests"
          loading={loading}
          variant="available"
          icon={DoorOpen}
        />

      </div>


      {/* MAIN GRID: TODAY'S RESERVATIONS + OCCUPANCY */}

      <div className="main-dashboard-grid">

        <RecentReservationsTable
          reservations={[...data.reservations]
            .sort((a, b) =>
              String(b.created_at || b.id).localeCompare(
                String(a.created_at || a.id)
              )
            )
            .slice(0, 8)}
          loading={loading}
          navigate={navigate}
        />

        <section className="dashboard-panel occupancy-panel">

          <div className="panel-heading">
            <div>
              <div className="eyebrow">Live inventory</div>
              <h2>Occupancy overview</h2>
            </div>
          </div>

          {loading ? (
            <div className="dashboard-loading">
              <span className="spinner" />
              Loading occupancy…
            </div>
          ) : totalRooms === 0 ? (
            <div className="reservations-empty">
              <BedDouble size={22} />
              <strong>No rooms yet</strong>
              <span>Add rooms to see occupancy at a glance.</span>
            </div>
          ) : (
            <>
              <div className={`occupancy-ring${occupancyPct === 0 ? " occupancy-ring--empty" : ""}`}>
                <div className="ring-wrap">
                  <svg viewBox="0 0 42 42" width="132" height="132">
                    <circle className="ring-track" cx="21" cy="21" r="15.9" />
                    <circle
                      className="ring-fill"
                      cx="21"
                      cy="21"
                      r="15.9"
                      strokeDasharray={100}
                      strokeDashoffset={100 - occupancyPct}
                    />
                  </svg>
                  <div className="ring-center">
                    <strong>{Math.round(occupancyPct)}%</strong>
                    <span>{occupancyPct === 0 ? "No guests yet" : "Occupied"}</span>
                  </div>
                </div>

                <div className="occupancy-legend">
                  <div className="legend-row">
                    <span className="legend-dot" style={{ background: "#0d5146" }} />
                    Occupied
                    <span className="legend-count">{occupiedRooms}</span>
                  </div>
                  <div className="legend-row">
                    <span className="legend-dot" style={{ background: "#0f7d4d" }} />
                    Available
                    <span className="legend-count">{metrics.roomCounts.AVAILABLE || 0}</span>
                  </div>
                  <div className="legend-row">
                    <span className="legend-dot" style={{ background: "#b7791f" }} />
                    Cleaning
                    <span className="legend-count">{(metrics.roomCounts.CLEANING || 0) + (metrics.roomCounts.DIRTY || 0)}</span>
                  </div>
                  <div className="legend-row">
                    <span className="legend-dot" style={{ background: "#c0392b" }} />
                    Maintenance
                    <span className="legend-count">{metrics.roomCounts.MAINTENANCE || 0}</span>
                  </div>
                </div>
              </div>

              <div className="occupancy-bar">
                <div className="occupancy-bar-label">
                  <span>Occupied rooms</span>
                  <strong>{occupiedRooms} / {totalRooms}</strong>
                </div>
                <div className="occupancy-bar-track">
                  <div className="occupancy-bar-fill" style={{ width: `${Math.round(occupancyPct)}%` }} />
                </div>
              </div>
            </>
          )}

        </section>

      </div>


      {/* ROOM STATUS OVERVIEW */}

      <section className="room-status dashboard-panel">

        <div className="panel-heading">
          <div>
            <div className="eyebrow">Inventory</div>
            <h2>Rooms by status</h2>
          </div>
          <button className="panel-link" onClick={() => navigate("/rooms")}>
            View rooms <ArrowRight size={14} />
          </button>
        </div>

        {loading ? (
          <div className="dashboard-loading"><span className="spinner" /> Loading rooms…</div>
        ) : (
          <div className="status-chips">
            {ROOM_STATUSES.filter(
              ([key]) => (metrics.roomCounts[key] || 0) > 0
            ).map(([key, name]) => (
              <button
                key={key}
                className="status-chip"
                onClick={() => navigate(`/rooms?status=${key}`)}
              >
                <span className="status-chip-count">{metrics.roomCounts[key] || 0}</span>
                <span className="status-chip-label">{name}</span>
              </button>
            ))}
          </div>
        )}

      </section>

      {/* TODAY'S MOVEMENT */}

      <div className="operations-grid movement-grid">

        <OperationTable
          title="Today's arrivals"
          reservations={checkIns}
          dateField="check_in_date"
          emptyText={<><LogIn size={22} /><strong>No arrivals scheduled today</strong><span>No check-ins are expected at your property.</span></>}
          loading={loading}
        />

        <OperationTable
          title="Today's departures"
          reservations={checkOuts}
          dateField="check_out_date"
          emptyText={<><LogOut size={22} /><strong>No departures scheduled today</strong><span>No check-outs are expected at your property.</span></>}
          loading={loading}
        />

      </div>

      {/* LOWER GRID: HOUSEKEEPING + MAINTENANCE */}

      <div className="lower-grid">

        <section className="dashboard-panel lower-panel">

          <div className="panel-heading">
            <div>
              <div className="eyebrow">Room care</div>
              <h2>Housekeeping overview</h2>
            </div>
            <button className="panel-link" onClick={() => navigate("/housekeeping")}>
              View housekeeping <ArrowRight size={14} />
            </button>
          </div>

          {loading ? (
            <div className="dashboard-loading"><span className="spinner" /> Loading housekeeping…</div>
          ) : data.housekeeping.length === 0 ? (
            <div className="reservations-empty">
              <Sparkles size={22} />
              <strong>All caught up</strong>
              <span>No housekeeping tasks are on record.</span>
            </div>
          ) : (
            <div className="kpi-badge-list">
              <div className="kpi-badge">
                <span className="summary-icon" style={{ background: "var(--sc-amber-soft)", color: "var(--sc-amber)" }}><ClipboardList size={16} /></span>
                <span className="kpi-badge-label">Pending cleaning<span className="kpi-badge-count">{loading ? "—" : metrics.housekeepingCounts.PENDING_CLEANING || 0}</span></span>
              </div>
              <div className="kpi-badge">
                <span className="summary-icon" style={{ background: "var(--sc-blue-soft)", color: "var(--sc-blue)" }}><Settings2 size={16} /></span>
                <span className="kpi-badge-label">In progress<span className="kpi-badge-count">{loading ? "—" : (metrics.housekeepingCounts.IN_PROGRESS || 0) + (metrics.housekeepingCounts.CLEANING || 0)}</span></span>
              </div>
              <div className="kpi-badge">
                <span className="summary-icon" style={{ background: "var(--sc-green-soft)", color: "var(--sc-green)" }}><CheckCircle2 size={16} /></span>
                <span className="kpi-badge-label">Clean<span className="kpi-badge-count">{loading ? "—" : (metrics.housekeepingCounts.CLEAN || 0) + (metrics.housekeepingCounts.COMPLETED || 0)}</span></span>
              </div>
              <div className="kpi-badge">
                <span className="summary-icon" style={{ background: "var(--sc-slate-soft)", color: "var(--sc-slate)" }}><ShieldCheck size={16} /></span>
                <span className="kpi-badge-label">Inspected<span className="kpi-badge-count">{loading ? "—" : metrics.housekeepingCounts.INSPECTED || 0}</span></span>
              </div>
            </div>
          )}

        </section>

        <section className="dashboard-panel lower-panel">

          <div className="panel-heading">
            <div>
              <div className="eyebrow">Property care</div>
              <h2>Maintenance overview</h2>
            </div>
            <button className="panel-link" onClick={() => navigate("/maintenance")}>
              View maintenance <ArrowRight size={14} />
            </button>
          </div>

          {loading ? (
            <div className="dashboard-loading"><span className="spinner" /> Loading maintenance…</div>
          ) : data.maintenance.length === 0 ? (
            <div className="reservations-empty">
              <Wrench size={22} />
              <strong>No open issues</strong>
              <span>There are no maintenance requests to review.</span>
            </div>
          ) : (
            <div className="kpi-badge-list">
              <div className="kpi-badge">
                <span className="summary-icon" style={{ background: "var(--sc-amber-soft)", color: "var(--sc-amber)" }}><Wrench size={16} /></span>
                <span className="kpi-badge-label">Open requests<span className="kpi-badge-count">{loading ? "—" : metrics.maintenanceCounts.OPEN || 0}</span></span>
              </div>
              <div className="kpi-badge">
                <span className="summary-icon" style={{ background: "var(--sc-blue-soft)", color: "var(--sc-blue)" }}><Settings2 size={16} /></span>
                <span className="kpi-badge-label">In progress<span className="kpi-badge-count">{loading ? "—" : metrics.maintenanceCounts.IN_PROGRESS || 0}</span></span>
              </div>
              <div className="kpi-badge">
                <span className="summary-icon" style={{ background: "var(--sc-green-soft)", color: "var(--sc-green)" }}><CheckCircle2 size={16} /></span>
                <span className="kpi-badge-label">Completed<span className="kpi-badge-count">{loading ? "—" : metrics.maintenanceCounts.RESOLVED || 0}</span></span>
              </div>
              <div className="kpi-badge">
                <span className="summary-icon" style={{ background: "var(--sc-red-soft)", color: "var(--sc-red)" }}><ShieldCheck size={16} /></span>
                <span className="kpi-badge-label">High priority<span className="kpi-badge-count">{loading ? "—" : highPriorityMaintenance}</span></span>
              </div>
            </div>
          )}

        </section>

      </div>

      {/* QUICK ACTIONS */}

      <section className="quick-actions dashboard-panel">

        <div>
          <div className="eyebrow">Shortcuts</div>
          <h2>Quick actions</h2>
        </div>

        <div className="quick-action-list">
          <button className="qa-primary" onClick={() => navigate("/reservations/new")}>
            <Plus size={17} /> New reservation <ArrowRight size={15} />
          </button>
          <button onClick={() => navigate("/guests")}>
            <ClipboardList size={17} /> View guests <ArrowRight size={15} />
          </button>
          <button onClick={() => navigate("/rooms")}>
            <DoorOpen size={17} /> View rooms <ArrowRight size={15} />
          </button>
        </div>

      </section>

    </div>

  );
}