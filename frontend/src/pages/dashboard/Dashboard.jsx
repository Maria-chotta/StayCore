import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/useAuth";
import api from "../../services/api";
import "./Dashboard.css";
import { useNavigate } from "react-router-dom";

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
  String(value || "—").replaceAll("_", " ");

const guestName = (item) =>
  item.guest_details
    ? `${item.guest_details.first_name} ${item.guest_details.last_name}`.trim()
    : `Guest #${item.guest}`;


/* =========================================================
   SUMMARY CARD
========================================================= */

function SummaryCard({
  title,
  value,
  note,
  loading,
  variant,
}) {
  return (
    <div className={`summary-card summary-card--${variant}`}>
      <div className="summary-title">
        {title}
      </div>

      {loading ? (
        <div className="skeleton skeleton-value" />
      ) : (
        <>
          <div className="summary-value">
            {value}
          </div>

          {note && (
            <div className="summary-subtitle">
              {note}
            </div>
          )}
        </>
      )}
    </div>
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
          Loading operations…
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
                    {item[dateField]}
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
        <h2>Recent Reservations</h2>
        <button
          className="btn-ghost small"
          onClick={() => navigate("/reservations")}
        >
          View all
        </button>
      </div>

      {loading ? (
        <div className="dashboard-loading">
          Loading reservations…
        </div>
      ) : reservations.length === 0 ? (
        <div className="reservations-empty">
          No reservations yet.
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

                  <td data-label="Check-in">{item.check_in_date}</td>
                  <td data-label="Check-out">{item.check_out_date}</td>

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
          View Maintenance
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

  const { user } = useAuth();

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

    load();

  }, [load]);


  /* =====================================================
     USER ROLE
  ===================================================== */

  const role =
    user?.memberships?.[0]?.role ||
    user?.role ||
    "";


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


    const maintenanceCounts =
      data.maintenance.reduce(
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


  const activeReservations =
    (metrics.reservationCounts.CONFIRMED || 0) +
    (metrics.reservationCounts.CHECKED_IN || 0);

  const highPriorityMaintenance = data.maintenance.filter(
    (item) =>
      item.priority === "URGENT" &&
      !["RESOLVED", "CANCELLED"].includes(item.status)
  ).length;

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

      {/* HEADER */}

      <div className="dashboard-header">

        <div>

          <h1>
            Dashboard
          </h1>

          <div className="welcome">

            {user?.email
              ? `Operations overview for ${user.email}`
              : "Operations overview"}

          </div>

        </div>


        <button
          className="btn-ghost small"
          onClick={load}
          disabled={loading}
        >

          {loading
            ? "Refreshing…"
            : "Refresh"}

        </button>

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
          title="Total Rooms"
          value={data.rooms.length}
          loading={loading}
          variant="available"
        />

        <SummaryCard
          title="Available Rooms"
          value={
            metrics.roomCounts.AVAILABLE || 0
          }
          loading={loading}
          variant="available"
        />

        <SummaryCard
          title="Occupied Rooms"
          value={
            metrics.roomCounts.OCCUPIED || 0
          }
          loading={loading}
          variant="occupied"
        />

        <SummaryCard
          title="Housekeeping Queue"
          value={metrics.housekeeping}
          note="Open or in progress"
          loading={loading}
          variant="arrivals"
        />

        <SummaryCard
          title="Active Reservations"
          value={activeReservations}
          note="Confirmed and checked in"
          loading={loading}
          variant="departures"
        />

        <SummaryCard
          title="Today's Check-ins"
          value={checkIns.length}
          loading={loading}
          variant="arrivals"
        />

        <SummaryCard
          title="Today's Check-outs"
          value={checkOuts.length}
          loading={loading}
          variant="departures"
        />

        <SummaryCard
          title="Total Guests"
          value={data.guests.length}
          loading={loading}
          variant="available"
        />

      </div>


      {/* ROOM STATUS */}

      <section className="room-status dashboard-panel">

        <div className="panel-heading">

          <h2>
            Room status overview
          </h2>

          <button
            className="btn-ghost small"
            onClick={() =>
              navigate("/rooms")
            }
          >
            View rooms
          </button>

        </div>


        <div className="status-grid">

          {ROOM_STATUSES.map(
            ([key, name]) => (

              <button
                key={key}
                className="status-item"
                onClick={() =>
                  navigate(
                    `/rooms?status=${key}`
                  )
                }
              >

                <span className="status-label">
                  {name}
                </span>

                <span className="status-count">

                  {loading
                    ? "—"
                    : metrics.roomCounts[key] || 0}

                </span>

              </button>

            )
          )}

        </div>

      </section>


      {/* RESERVATION STATUS */}

      <section className="dashboard-panel reservation-status">

        <h2>
          Reservation status
        </h2>


        {loading ? (

          <div className="dashboard-loading">
            Loading reservations…
          </div>

        ) : data.reservations.length === 0 ? (

          <div className="reservations-empty">
            No reservations available.
          </div>

        ) : (

          <div className="status-grid">

            {Object.entries(
              metrics.reservationCounts
            ).map(
              ([status, count]) => (

                <button
                  key={status}
                  className="status-item"
                  onClick={() =>
                    navigate(
                      `/reservations?status=${status}`
                    )
                  }
                >

                  <span className="status-label">
                    {label(status)}
                  </span>

                  <span className="status-count">
                    {count}
                  </span>

                </button>

              )
            )}

          </div>

        )}

      </section>



      {/* TODAY'S OPERATIONS */}

      <div className="operations-grid">

        <OperationTable
          title="Today's Arrivals"
          reservations={checkIns}
          dateField="check_in_date"
          emptyText="No arrivals scheduled today."
          loading={loading}
        />

        <OperationTable
          title="Today's Departures"
          reservations={checkOuts}
          dateField="check_out_date"
          emptyText="No departures scheduled today."
          loading={loading}
        />

      </div>


      {/* RECENT RESERVATIONS */}

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


      {/* HOUSEKEEPING OVERVIEW */}

      <section className="dashboard-panel">

        <div className="panel-heading">
          <h2>Housekeeping Overview</h2>
          <button
            className="btn-ghost small"
            onClick={() => navigate("/housekeeping")}
          >
            View housekeeping
          </button>
        </div>

        <div className="status-grid">
          <div className="status-item">
            <span className="status-label">Clean rooms</span>
            <span className="status-count">
              {loading ? "—" : metrics.housekeepingCounts.CLEAN || 0}
            </span>
          </div>
          <div className="status-item">
            <span className="status-label">Dirty rooms</span>
            <span className="status-count">
              {loading ? "—" : metrics.housekeepingCounts.DIRTY || 0}
            </span>
          </div>
          <div className="status-item">
            <span className="status-label">Cleaning in progress</span>
            <span className="status-count">
              {loading ? "—" : metrics.housekeepingCounts.IN_PROGRESS || 0}
            </span>
          </div>
          <div className="status-item">
            <span className="status-label">Rooms under maintenance</span>
            <span className="status-count">
              {loading ? "—" : metrics.roomCounts.MAINTENANCE || 0}
            </span>
          </div>
        </div>

      </section>


      {/* MAINTENANCE OVERVIEW */}

      <section className="dashboard-panel">

        <div className="panel-heading">
          <h2>Maintenance Overview</h2>
          <button
            className="btn-ghost small"
            onClick={() => navigate("/maintenance")}
          >
            View maintenance
          </button>
        </div>

        <div className="status-grid">
          <div className="status-item">
            <span className="status-label">Open requests</span>
            <span className="status-count">
              {loading ? "—" : metrics.maintenanceCounts.OPEN || 0}
            </span>
          </div>
          <div className="status-item">
            <span className="status-label">In-progress requests</span>
            <span className="status-count">
              {loading ? "—" : metrics.maintenanceCounts.IN_PROGRESS || 0}
            </span>
          </div>
          <div className="status-item">
            <span className="status-label">High-priority requests</span>
            <span className="status-count">
              {loading ? "—" : highPriorityMaintenance}
            </span>
          </div>
        </div>

      </section>


      {/* LEGACY OPERATIONS TABLES */}

      <div className="operations-grid">

        <OperationTable
          title="Today's check-ins"
          reservations={checkIns}
          dateField="check_in_date"
          emptyText="No check-ins scheduled today."
          loading={loading}
        />

        <OperationTable
          title="Today's check-outs"
          reservations={checkOuts}
          dateField="check_out_date"
          emptyText="No check-outs scheduled today."
          loading={loading}
        />

      </div>

    </div>

  );
}