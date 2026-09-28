import { BrowserRouter } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext.jsx";
import AppRoutes from "./routes/AppRoutes";
import RouteErrorBoundary from "./components/RouteErrorBoundary";
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <RouteErrorBoundary>
          <AppRoutes />
        </RouteErrorBoundary>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;