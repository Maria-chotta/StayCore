import axios from "axios";

const AUTH_URLS = ["/auth/login/", "/auth/refresh/"];

const api = axios.create({
  baseURL: "http://127.0.0.1:8000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

/* Attach the access token to every request EXCEPT the auth
   endpoints. Sending a stale token to /auth/login/ used to make
   SimpleJWT reject the request with 401 even when the
   credentials were correct — that was the intermittent login
   failure. */
api.interceptors.request.use(
  (config) => {
    const isAuthUrl = AUTH_URLS.some((url) =>
      config.url?.includes(url)
    );

    if (!isAuthUrl) {
      const token = localStorage.getItem("access_token");
      const activeHotelId = localStorage.getItem("active_hotel_id");

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      if (activeHotelId) {
        config.headers["X-Hotel-ID"] = String(activeHotelId);
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

/* On a 401 (expired access token), try to refresh once and retry
   the original request. If the refresh fails, clear the session
   so the user is sent back to login instead of looping on
   errors. */
let refreshing = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    const isAuthUrl = original?.url
      ? AUTH_URLS.some((url) => original.url.includes(url))
      : false;

    if (
      error.response?.status !== 401 ||
      isAuthUrl ||
      original._retry
    ) {
      return Promise.reject(error);
    }

    original._retry = true;

    const refresh = localStorage.getItem("refresh_token");

    if (!refresh) {
      return Promise.reject(error);
    }

    try {
      refreshing =
        refreshing ||
        axios.post("http://127.0.0.1:8000/api/auth/refresh/", {
          refresh,
        });

      const { data } = await refreshing;
      refreshing = null;

      localStorage.setItem("access_token", data.access);
      localStorage.setItem("token", data.access);

      original.headers.Authorization = `Bearer ${data.access}`;

      return api(original);
    } catch (refreshError) {
      refreshing = null;

      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("user_email");

      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }

      return Promise.reject(refreshError);
    }
  }
);

export default api;
