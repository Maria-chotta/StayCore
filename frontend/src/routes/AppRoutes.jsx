import { Routes, Route, Navigate } from "react-router-dom";

import Login from "../pages/auth/Login";

import PropertyOnboarding from "../pages/properties/PropertyOnboarding";

import Home from "../pages/home/Home";
import Dashboard from "../pages/dashboard/Dashboard";

import RequireAuth from "../components/RequireAuth";
import AuthenticatedLayout from "../components/layout/AuthenticatedLayout";

import Rooms from "../pages/rooms/Rooms";
import RoomDetail from "../pages/rooms/RoomDetail";

import RoomTypes from "../pages/room-types/RoomTypes";
import RoomTypeDetail from "../pages/room-types/RoomTypeDetail";
import RoomTypeForm from "../pages/room-types/RoomTypeForm";

import Guests from "../pages/guests/Guests";
import GuestDetail from "../pages/guests/GuestDetail";

import Reservations from "../pages/reservations/Reservations";
import ReservationDetail from "../pages/reservations/ReservationDetail";
import ReservationForm from "../pages/reservations/ReservationForm";

import Housekeeping from "../pages/housekeeping/Housekeeping";
import HousekeepingForm from "../pages/housekeeping/HousekeepingForm";
import HousekeepingDetail from "../pages/housekeeping/HousekeepingDetail";

import Maintenance from "../pages/maintenance/Maintenance";
import MaintenanceForm from "../pages/maintenance/MaintenanceForm";
import MaintenanceDetail from "../pages/maintenance/MaintenanceDetail";

import Billing from "../pages/billing/Billing";
import FolioDetail from "../pages/billing/FolioDetail";
import FolioForm from "../pages/billing/FolioForm";

import Reports from "../pages/reports/Reports";
import PortfolioOverview from "../pages/portfolio/PortfolioOverview";

import Staff from "../pages/staff/Staff";
import StaffForm from "../pages/staff/StaffForm";
import StaffDetail from "../pages/staff/StaffDetail";


function ProtectedPage({ children }) {
  return (
    <RequireAuth>
      <AuthenticatedLayout>
        {children}
      </AuthenticatedLayout>
    </RequireAuth>
  );
}


function AppRoutes() {
  return (
    <Routes>

      {/* =========================
          PUBLIC ROUTES
      ========================== */}

      <Route
        path="/login"
        element={<Login />}
      />

      <Route
        path="/"
        element={<Home />}
      />


      {/* =========================
          DASHBOARD
      ========================== */}

      <Route
        path="/dashboard"
        element={
          <ProtectedPage>
            <Dashboard />
          </ProtectedPage>
        }
      />

      <Route
        path="/portfolio"
        element={
          <ProtectedPage>
            <PortfolioOverview />
          </ProtectedPage>
        }
      />

      <Route
        path="/properties/onboarding"
        element={
          <ProtectedPage>
            <PropertyOnboarding />
          </ProtectedPage>
        }
      />


      {/* =========================
          ROOMS
      ========================== */}

      <Route
        path="/rooms"
        element={
          <ProtectedPage>
            <Rooms />
          </ProtectedPage>
        }
      />

      <Route
        path="/rooms/:id"
        element={
          <ProtectedPage>
            <RoomDetail />
          </ProtectedPage>
        }
      />


      {/* =========================
          ROOM TYPES
      ========================== */}

      <Route
        path="/room-types"
        element={
          <ProtectedPage>
            <RoomTypes />
          </ProtectedPage>
        }
      />

      <Route
        path="/room-types/new"
        element={
          <ProtectedPage>
            <RoomTypeForm mode="create" />
          </ProtectedPage>
        }
      />

      <Route
        path="/room-types/:id"
        element={
          <ProtectedPage>
            <RoomTypeDetail />
          </ProtectedPage>
        }
      />

      <Route
        path="/room-types/:id/edit"
        element={
          <ProtectedPage>
            <RoomTypeForm mode="edit" />
          </ProtectedPage>
        }
      />


      {/* =========================
          GUESTS
      ========================== */}

      <Route
        path="/guests"
        element={
          <ProtectedPage>
            <Guests />
          </ProtectedPage>
        }
      />

      <Route
        path="/guests/:id"
        element={
          <ProtectedPage>
            <GuestDetail />
          </ProtectedPage>
        }
      />


      {/* =========================
          RESERVATIONS
      ========================== */}

      <Route
        path="/reservations"
        element={
          <ProtectedPage>
            <Reservations />
          </ProtectedPage>
        }
      />

      <Route
        path="/reservations/new"
        element={
          <ProtectedPage>
            <ReservationForm mode="create" />
          </ProtectedPage>
        }
      />

      <Route
        path="/reservations/:id"
        element={
          <ProtectedPage>
            <ReservationDetail />
          </ProtectedPage>
        }
      />

      <Route
        path="/reservations/:id/edit"
        element={
          <ProtectedPage>
            <ReservationForm mode="edit" />
          </ProtectedPage>
        }
      />


      {/* =========================
          HOUSEKEEPING
      ========================== */}

      <Route
        path="/housekeeping"
        element={
          <ProtectedPage>
            <Housekeeping />
          </ProtectedPage>
        }
      />

      <Route
        path="/housekeeping/new"
        element={
          <ProtectedPage>
            <HousekeepingForm mode="create" />
          </ProtectedPage>
        }
      />

      <Route
        path="/housekeeping/:id"
        element={
          <ProtectedPage>
            <HousekeepingDetail />
          </ProtectedPage>
        }
      />

      <Route
        path="/housekeeping/:id/edit"
        element={
          <ProtectedPage>
            <HousekeepingForm mode="edit" />
          </ProtectedPage>
        }
      />


      {/* =========================
          MAINTENANCE
      ========================== */}

      <Route
        path="/maintenance"
        element={
          <ProtectedPage>
            <Maintenance />
          </ProtectedPage>
        }
      />

      <Route
        path="/maintenance/new"
        element={
          <ProtectedPage>
            <MaintenanceForm mode="create" />
          </ProtectedPage>
        }
      />

      <Route
        path="/maintenance/:id"
        element={
          <ProtectedPage>
            <MaintenanceDetail />
          </ProtectedPage>
        }
      />

      <Route
        path="/maintenance/:id/edit"
        element={
          <ProtectedPage>
            <MaintenanceForm mode="edit" />
          </ProtectedPage>
        }
      />


      {/* =========================
          BILLING
      ========================== */}

      <Route
        path="/billing"
        element={
          <ProtectedPage>
            <Billing />
          </ProtectedPage>
        }
      />

      <Route
        path="/billing/new"
        element={
          <ProtectedPage>
            <FolioForm />
          </ProtectedPage>
        }
      />

      <Route
        path="/billing/:id"
        element={
          <ProtectedPage>
            <FolioDetail />
          </ProtectedPage>
        }
      />


      {/* =========================
          STAFF MANAGEMENT
      ========================== */}

      <Route
        path="/staff"
        element={
          <ProtectedPage>
            <Staff />
          </ProtectedPage>
        }
      />

      <Route
        path="/staff/new"
        element={
          <ProtectedPage>
            <StaffForm mode="create" />
          </ProtectedPage>
        }
      />

      <Route
        path="/staff/:id"
        element={
          <ProtectedPage>
            <StaffDetail />
          </ProtectedPage>
        }
      />

      <Route
        path="/staff/:id/edit"
        element={
          <ProtectedPage>
            <StaffForm mode="edit" />
          </ProtectedPage>
        }
      />


      {/* =========================
          REPORTS
      ========================== */}

      <Route
        path="/reports"
        element={
          <ProtectedPage>
            <Reports />
          </ProtectedPage>
        }
      />


      {/* =========================
          FALLBACK
      ========================== */}

      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />

    </Routes>
  );
}

export default AppRoutes;