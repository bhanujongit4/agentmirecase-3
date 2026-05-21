"use client";

import { useMemo, useState } from "react";

const initialForm = {
  location: "",
  maxBudget: "",
  minBedrooms: "",
  minBathrooms: "",
  minSizeSqft: "",
  amenities: "",
};

const initialAuthForm = {
  email: "",
  password: "",
};

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function Home() {
  const [authForm, setAuthForm] = useState(initialAuthForm);
  const [currentUserEmail, setCurrentUserEmail] = useState("");
  const [authStatus, setAuthStatus] = useState("Not logged in.");
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [chatMessage, setChatMessage] = useState(
    "Tell me your preferences and I will find matching homes.",
  );
  const [results, setResults] = useState([]);
  const [savedProperties, setSavedProperties] = useState([]);
  const [saveStatus, setSaveStatus] = useState("");

  const hasResults = results.length > 0;
  const isLoggedIn = Boolean(currentUserEmail);

  const formEntries = useMemo(
    () => [
      { key: "location", label: "Location", type: "text", placeholder: "e.g. New York" },
      { key: "maxBudget", label: "Max Budget (USD)", type: "number", placeholder: "e.g. 700000" },
      { key: "minBedrooms", label: "Min Bedrooms", type: "number", placeholder: "e.g. 2" },
      { key: "minBathrooms", label: "Min Bathrooms", type: "number", placeholder: "e.g. 2" },
      { key: "minSizeSqft", label: "Min Size (sqft)", type: "number", placeholder: "e.g. 1200" },
      {
        key: "amenities",
        label: "Amenities (comma separated)",
        type: "text",
        placeholder: "e.g. Gym, Parking",
      },
    ],
    [],
  );

  function normalizedEmail() {
    return authForm.email.trim().toLowerCase();
  }

  async function register() {
    setAuthStatus("Creating account...");
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail(), password: authForm.password }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.details ? `${data.error} ${data.details}` : data.error || "Registration failed");
      }
      setCurrentUserEmail(data.email);
      setAuthStatus(`Logged in as ${data.email}`);
      setAuthForm((prev) => ({ ...prev, password: "" }));
    } catch (error) {
      setAuthStatus(error.message || "Registration failed.");
    }
  }

  async function login() {
    setAuthStatus("Logging in...");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail(), password: authForm.password }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.details ? `${data.error} ${data.details}` : data.error || "Login failed");
      }
      setCurrentUserEmail(data.email);
      setAuthStatus(`Logged in as ${data.email}`);
      setAuthForm((prev) => ({ ...prev, password: "" }));
    } catch (error) {
      setAuthStatus(error.message || "Login failed.");
    }
  }

  function logout() {
    setCurrentUserEmail("");
    setSavedProperties([]);
    setAuthStatus("Logged out.");
    window.location.reload();
  }

  async function handleSearch(event) {
    event.preventDefault();
    setLoading(true);
    setSaveStatus("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Search failed");
      }

      setChatMessage(data.message);
      setResults(data.results);
    } catch (error) {
      setChatMessage(error.message || "Something went wrong while searching.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchSavedProperties() {
    if (!isLoggedIn) {
      setSaveStatus("Login first to view saved properties.");
      return;
    }

    setSaveStatus("Loading saved properties...");

    try {
      const response = await fetch(`/api/saved?email=${encodeURIComponent(currentUserEmail)}`, {
        method: "GET",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.details
            ? `${data.error} ${data.details}`
            : data.error || "Unable to fetch saved properties.",
        );
      }

      setSavedProperties(data.saved || []);
      setSaveStatus(data.notice || `Saved properties loaded from ${data.storage || "storage"}.`);
    } catch (error) {
      setSaveStatus(error.message || "Unable to load saved properties.");
    }
  }

  async function saveProperty(property) {
    if (!isLoggedIn) {
      setSaveStatus("Login first to save properties.");
      return;
    }

    setSaveStatus("Saving property...");

    try {
      const response = await fetch("/api/saved", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...property, userEmail: currentUserEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.details
            ? `${data.error} ${data.details}`
            : data.error || "Unable to save property.",
        );
      }

      setSaveStatus(data.message || `Property saved to ${data.storage || "storage"}.`);
      await fetchSavedProperties();
    } catch (error) {
      setSaveStatus(error.message || "Unable to save property.");
    }
  }

  async function deleteSavedProperty(propertyId) {
    if (!isLoggedIn) {
      setSaveStatus("Login first to delete saved properties.");
      return;
    }

    setSaveStatus("Deleting property...");

    try {
      const response = await fetch("/api/saved", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userEmail: currentUserEmail, id: propertyId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.details
            ? `${data.error} ${data.details}`
            : data.error || "Unable to delete property.",
        );
      }

      setSaveStatus(data.message || `Property deleted from ${data.storage || "storage"}.`);
      await fetchSavedProperties();
    } catch (error) {
      setSaveStatus(error.message || "Unable to delete property.");
    }
  }

  return (
    <main className="page">
      <section className="chatCard">
        <h1>Agent Mira Real Estate Chatbot</h1>
        <p className="subtitle">Find properties based on your preferences.</p>

        <div className="authBox">
          <h2>Login</h2>
          <div className="authFields">
            <input
              type="email"
              value={authForm.email}
              placeholder="Email"
              onChange={(event) => setAuthForm((prev) => ({ ...prev, email: event.target.value }))}
            />
            <input
              type="password"
              value={authForm.password}
              placeholder="Password"
              onChange={(event) =>
                setAuthForm((prev) => ({ ...prev, password: event.target.value }))
              }
            />
          </div>
          <div className="authActions">
            <button type="button" onClick={register}>Register</button>
            <button type="button" onClick={login}>Login</button>
            <button type="button" onClick={logout}>Logout</button>
          </div>
          <p className="statusLine">{authStatus}</p>
        </div>

        <form onSubmit={handleSearch} className="searchForm">
          {formEntries.map((entry) => (
            <label key={entry.key} className="field">
              <span>{entry.label}</span>
              <input
                type={entry.type}
                value={form[entry.key]}
                placeholder={entry.placeholder}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, [entry.key]: event.target.value }))
                }
              />
            </label>
          ))}

          <button type="submit" disabled={loading}>
            {loading ? "Searching..." : "Find Homes"}
          </button>
        </form>

        <div className="botMessage">{chatMessage}</div>

        <div className="resultsHeader">
          <h2>Matching Properties</h2>
          <button type="button" onClick={fetchSavedProperties}>
            View Saved Properties
          </button>
        </div>

        {!hasResults && <p className="emptyState">No properties to show yet.</p>}

        <div className="propertyGrid">
          {results.map((property) => (
            <article key={property.id} className="propertyCard">
              <img src={property.imageUrl} alt={property.title} />
              <h3>{property.title}</h3>
              <p>{property.location}</p>
              <p>{formatCurrency(property.price)}</p>
              <p>
                {property.bedrooms} bed | {property.bathrooms} bath | {property.sizeSqft} sqft
              </p>
              <p className="amenities">Amenities: {property.amenities.join(", ")}</p>
              <button type="button" onClick={() => saveProperty(property)}>
                Save Property
              </button>
            </article>
          ))}
        </div>

        <div className="savedSection">
          <h2>Saved Properties</h2>
          <p className="statusLine">{saveStatus || "No saved property loaded."}</p>
          <ul>
            {savedProperties.map((property) => (
              <li key={property._id || `${property.userEmail}-${property.id}`} className="savedItem">
                <span>
                  {property.title} ({property.location}) - {formatCurrency(property.price)}
                </span>
                <button type="button" onClick={() => deleteSavedProperty(property.id)}>
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
