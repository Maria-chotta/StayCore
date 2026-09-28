import { Component } from "react";

export default class RouteErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
          <h1>StayCore could not load this page</h1>
          <p>{this.state.error.message || "Unexpected frontend error."}</p>
          <button type="button" onClick={() => window.location.reload()}>
            Reload page
          </button>
        </main>
      );
    }

    return this.props.children;
  }
}