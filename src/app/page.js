"use client";

import { useEffect, useMemo, useState } from "react";

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

// --- Icon Components ---------------------------------------------------------
function IconPin() {
  return (
    <svg width="11" height="13" viewBox="0 0 11 13" fill="none" style={{ flexShrink: 0 }}>
      <path d="M5.5 0C3.015 0 1 2.015 1 4.5c0 3.375 4.5 8.5 4.5 8.5S10 7.875 10 4.5C10 2.015 7.985 0 5.5 0Zm0 6.125A1.625 1.625 0 1 1 5.5 2.875a1.625 1.625 0 0 1 0 3.25Z" fill="currentColor"/>
    </svg>
  );
}

function IconBed() {
  return (
    <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
      <rect x="0" y="4" width="14" height="6" rx="1" fill="currentColor" opacity="0.4"/>
      <rect x="1" y="2" width="5" height="3" rx="1" fill="currentColor"/>
      <rect x="8" y="2" width="5" height="3" rx="1" fill="currentColor"/>
      <rect x="0" y="0" width="14" height="1" rx="0.5" fill="currentColor" opacity="0.3"/>
    </svg>
  );
}

function IconBath() {
  return (
    <svg width="13" height="12" viewBox="0 0 13 12" fill="none">
      <rect x="2" y="5" width="11" height="5" rx="1" fill="currentColor" opacity="0.4"/>
      <rect x="0" y="0" width="2" height="7" rx="1" fill="currentColor"/>
      <rect x="2" y="5" width="11" height="2" fill="currentColor" opacity="0.25"/>
    </svg>
  );
}

function IconSqft() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <rect x="1" y="1" width="10" height="10" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.7"/>
      <path d="M4 4h4v4" stroke="currentColor" strokeWidth="1.2" fill="none" opacity="0.9"/>
    </svg>
  );
}

function IconSend() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M1 1l12 6-12 6V8.5l8-1.5-8-1.5V1Z" fill="currentColor"/>
    </svg>
  );
}

function IconSearch() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <path d="M9.5 9.5L13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function IconStar() {
  return (
    <svg width="13" height="12" viewBox="0 0 13 12" fill="none">
      <path d="M6.5 0l1.545 4.255H12.5l-3.544 2.572 1.345 4.145L6.5 8.56 3.199 10.97l1.345-4.145L1 4.255h4.455L6.5 0Z" fill="currentColor"/>
    </svg>
  );
}

function IconTrash() {
  return (
    <svg width="12" height="13" viewBox="0 0 12 13" fill="none">
      <rect x="1" y="3" width="10" height="1" fill="currentColor"/>
      <path d="M4 3V2h4v1" stroke="currentColor" strokeWidth="1" fill="none"/>
      <path d="M2 4l.7 7.5h6.6L10 4" stroke="currentColor" strokeWidth="1.2" fill="none"/>
      <line x1="4.5" y1="6" x2="4.5" y2="10" stroke="currentColor" strokeWidth="1"/>
      <line x1="7.5" y1="6" x2="7.5" y2="10" stroke="currentColor" strokeWidth="1"/>
    </svg>
  );
}

function IconCompare() {
  return (
    <svg width="13" height="12" viewBox="0 0 13 12" fill="none">
      <rect x="0.5" y="0.5" width="5" height="11" rx="0.5" stroke="currentColor" strokeWidth="1.2" fill="none"/>
      <rect x="7.5" y="0.5" width="5" height="11" rx="0.5" stroke="currentColor" strokeWidth="1.2" fill="none"/>
      <line x1="3" y1="3" x2="3" y2="9" stroke="currentColor" strokeWidth="1" opacity="0.5"/>
      <line x1="10" y1="3" x2="10" y2="9" stroke="currentColor" strokeWidth="1" opacity="0.5"/>
    </svg>
  );
}

// --- Main Component -----------------------------------------------------------
export default function Home() {
  const [authForm, setAuthForm] = useState(initialAuthForm);
  const [currentUserEmail, setCurrentUserEmail] = useState("");
  const [authStatus, setAuthStatus] = useState("");
  const [authStatusType, setAuthStatusType] = useState(""); // "success" | "error" | ""
  const [form, setForm] = useState(initialForm);
  const [nlQuery, setNlQuery] = useState("");
  const [lastUserMessage, setLastUserMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatMessage, setChatMessage] = useState("Tell me your preferences and I will find the perfect property for you.");
  const [correctedText, setCorrectedText] = useState("");
  const [parsedFilters, setParsedFilters] = useState(null);
  const [results, setResults] = useState([]);
  const [savedProperties, setSavedProperties] = useState([]);
  const [saveStatus, setSaveStatus] = useState("");
  const [saveStatusType, setSaveStatusType] = useState("");
  const [comparePropertyIds, setComparePropertyIds] = useState([]);

  const hasResults = results.length > 0;
  const isLoggedIn = Boolean(currentUserEmail);

  const comparedProperties = useMemo(
    () => savedProperties.filter((p) => comparePropertyIds.includes(String(p.id))),
    [savedProperties, comparePropertyIds]
  );

  const hasAnyFormFilter = useMemo(
    () => Object.values(form).some((v) => String(v).trim() !== ""),
    [form]
  );

  const formEntries = useMemo(
    () => [
      { key: "location", label: "Location", type: "text", placeholder: "e.g. New York" },
      { key: "maxBudget", label: "Max Budget (USD)", type: "number", placeholder: "e.g. 700,000" },
      { key: "minBedrooms", label: "Min Bedrooms", type: "number", placeholder: "e.g. 2" },
      { key: "minBathrooms", label: "Min Bathrooms", type: "number", placeholder: "e.g. 2" },
      { key: "minSizeSqft", label: "Min Size (sqft)", type: "number", placeholder: "e.g. 1,200" },
      { key: "amenities", label: "Amenities", type: "text", placeholder: "e.g. Gym, Parking, Pool" },
    ],
    []
  );

  function normalizedEmail() {
    return authForm.email.trim().toLowerCase();
  }

  function setAuth(msg, type = "") {
    setAuthStatus(msg);
    setAuthStatusType(type);
  }

  function setSave(msg, type = "") {
    setSaveStatus(msg);
    setSaveStatusType(type);
  }

  async function register() {
    setAuth("Creating account...");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail(), password: authForm.password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.details ? `${data.error} ${data.details}` : data.error || "Registration failed");
      setCurrentUserEmail(data.email);
      setAuth(`Signed in as ${data.email}`, "success");
      setAuthForm((p) => ({ ...p, password: "" }));
    } catch (err) {
      setAuth(err.message || "Registration failed.", "error");
    }
  }

  async function login() {
    setAuth("Authenticating...");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail(), password: authForm.password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.details ? `${data.error} ${data.details}` : data.error || "Login failed");
      setCurrentUserEmail(data.email);
      setAuth(`Signed in as ${data.email}`, "success");
      setAuthForm((p) => ({ ...p, password: "" }));
    } catch (err) {
      setAuth(err.message || "Login failed.", "error");
    }
  }

  function logout() {
    setCurrentUserEmail("");
    setSavedProperties([]);
    setComparePropertyIds([]);
    setAuth("Session ended.", "");
    window.location.reload();
  }

  async function runSearch(payload) {
    setLoading(true);
    setSave("");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed");
      setChatMessage(data.message);
      setCorrectedText(data.correctedText || "");
      setParsedFilters(data.filters || null);
      setResults(data.results || []);
    } catch (err) {
      setChatMessage(err.message || "Something went wrong. Please try again.");
      setCorrectedText("");
      setParsedFilters(null);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch(e) {
    e.preventDefault();
    await runSearch(form);
  }

  useEffect(() => {
    if (!hasAnyFormFilter) return;
    const id = setTimeout(() => runSearch(form), 350);
    return () => clearTimeout(id);
  }, [form, hasAnyFormFilter]);

  async function handleChatSearch(e) {
    e.preventDefault();
    if (!nlQuery.trim()) { setChatMessage("Please type your request first."); return; }
    setLastUserMessage(nlQuery.trim());
    await runSearch({ message: nlQuery });
  }

  async function fetchSavedProperties() {
    if (!isLoggedIn) { setSave("Please sign in to view saved properties.", "error"); return; }
    setSave("Loading saved properties...");
    try {
      const res = await fetch(`/api/saved?email=${encodeURIComponent(currentUserEmail)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.details ? `${data.error} ${data.details}` : data.error || "Unable to fetch.");
      setSavedProperties(data.saved || []);
      setComparePropertyIds((prev) => {
        const ids = new Set((data.saved || []).map((p) => String(p.id)));
        return prev.filter((id) => ids.has(id));
      });
      setSave(data.notice || `${(data.saved || []).length} saved properties loaded.`, "success");
    } catch (err) {
      setSave(err.message || "Unable to load saved properties.", "error");
    }
  }

  async function saveProperty(property) {
    if (!isLoggedIn) { setSave("Please sign in to save properties.", "error"); return; }
    setSave("Saving property...");
    try {
      const res = await fetch("/api/saved", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...property, userEmail: currentUserEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.details ? `${data.error} ${data.details}` : data.error || "Unable to save.");
      setSave(data.message || "Property saved successfully.", "success");
      await fetchSavedProperties();
    } catch (err) {
      setSave(err.message || "Unable to save property.", "error");
    }
  }

  async function deleteSavedProperty(propertyId) {
    if (!isLoggedIn) { setSave("Please sign in to delete properties.", "error"); return; }
    setSave("Removing property...");
    try {
      const res = await fetch("/api/saved", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userEmail: currentUserEmail, id: propertyId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.details ? `${data.error} ${data.details}` : data.error || "Unable to delete.");
      setSave(data.message || "Property removed.", "success");
      await fetchSavedProperties();
    } catch (err) {
      setSave(err.message || "Unable to remove property.", "error");
    }
  }

  function toggleCompare(propertyId) {
    const id = String(propertyId);
    setComparePropertyIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) { setSave("Maximum 3 properties can be compared at once.", "error"); return prev; }
      return [...prev, id];
    });
  }

  return (
    <main className="page">
      <div className="appShell">

        {/* -- TOP BAR -- */}
        <header className="topBar">
          <div className="topBarLogo">
            <div className="logoMark">M</div>
            <div>
              <div className="logoText">Agent Mira</div>
              <div className="logoSub">Property Intelligence Platform</div>
            </div>
          </div>
          <div className="topBarRight">
            <div className="statusPill">
              <span className={`statusDot ${isLoggedIn ? "online" : ""}`} />
              {isLoggedIn ? currentUserEmail : "Not signed in"}
            </div>
          </div>
        </header>

        {/* -- HERO -- */}
        <section className="heroAuthGrid">
        <section className="heroBlock">
          <div className="heroInner">
            <p className="eyebrow">
              <span className="eyebrowLine" />
              Real Estate Intelligence
            </p>
            <h1>
              Find Your <em>Perfect</em> Property
            </h1>
            <p className="subtitle">
              AI-powered property search with natural language understanding. Search, save, and compare premium listings - all in one professional workspace.
            </p>
          </div>
        </section>
        <article className="card loginCard">
          <div className="cardHeader">
            <div>
              <div className="cardLabel">Account Access</div>
              <h2>Sign In</h2>
            </div>
          </div>
          <div className="cardBody">
            <div className="authFields">
              <div className="field">
                <span className="fieldLabel">Email Address</span>
                <input
                  type="email"
                  value={authForm.email}
                  placeholder="your@email.com"
                  onChange={(e) => setAuthForm((p) => ({ ...p, email: e.target.value }))}
                />
              </div>
              <div className="field">
                <span className="fieldLabel">Password</span>
                <input
                  type="password"
                  value={authForm.password}
                  placeholder="••••••••••"
                  onChange={(e) => setAuthForm((p) => ({ ...p, password: e.target.value }))}
                />
              </div>
            </div>
            <div className="authActions">
              <button type="button" className="btnGold" onClick={register}>
                Register
              </button>
              <button type="button" className="btnGhost" onClick={login}>
                Sign In
              </button>
              <button type="button" className="btnGhost" onClick={logout}>
                Sign Out
              </button>
            </div>
            {authStatus && (
              <div className={`statusLine ${authStatusType}`}>{authStatus}</div>
            )}
          </div>
        </article>
      </section>
        <div className="bodyPad">

          {/* -- TOP GRID -- */}
          <div className="topGrid">

            {/* Chat Card */}
            <article className="card chatFullRow">
              <div className="cardHeader">
                <div>
                  <div className="cardLabel">AI Assistant</div>
                  <h2>Chat Search</h2>
                </div>
              </div>
              <div className="cardBody">
                <form onSubmit={handleChatSearch} className="chatSearchForm">
                  <textarea
                    value={nlQuery}
                    placeholder="e.g. Looking for a home in New York with at least 2 bedrooms under $500,000, preferably with a gym..."
                    onChange={(e) => setNlQuery(e.target.value)}
                    rows={4}
                    className="mspChatInput"
                  />
                  <button type="submit" disabled={loading} className="btnGold" style={{ height: "100%", minHeight: 96 }}>
                    {loading ? (
                      <span style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                        <svg width="18" height="18" viewBox="0 0 18 18" style={{ animation: "spin 1s linear infinite" }}>
                          <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="2" fill="none" strokeDasharray="22" strokeDashoffset="8" opacity="0.7"/>
                        </svg>
                        <span style={{ fontSize: 11 }}>Thinking</span>
                      </span>
                    ) : (
                      <span style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                        <IconSend />
                        <span style={{ fontSize: 11 }}>Ask Mira</span>
                      </span>
                    )}
                  </button>
                </form>

                <div className="chatTranscript">
                  {lastUserMessage && (
                    <div className="chatBubble userBubble">
                      <span className="bubbleLabel">You</span>
                      <p style={{ fontSize: 14, lineHeight: 1.55 }}>{lastUserMessage}</p>
                    </div>
                  )}
                  <div className="chatBubble botBubble">
                    <span className="bubbleLabel">Agent Mira</span>
                    <p style={{ fontSize: 14, lineHeight: 1.55 }}>{chatMessage}</p>
                  </div>
                </div>
              </div>
            </article>

          </div>

          {/* -- FILTER CARD -- */}
          <article className="card" style={{ position: "relative", overflow: "hidden" }}>
            <div className="filterAccent" />
            <div className="cardHeader">
              <div>
                <div className="cardLabel">Search Criteria</div>
                <h2>Structured Filters</h2>
              </div>
              <button
                type="submit"
                form="filterForm"
                disabled={loading}
                className="btnGold"
                style={{ flexShrink: 0 }}
              >
                <IconSearch />
                {loading ? "Searching..." : "Find Homes"}
              </button>
            </div>
            <div className="cardBody">
              <form id="filterForm" onSubmit={handleSearch} className="searchForm">
                {formEntries.map((entry) => (
                  <label key={entry.key} className="field">
                    <span className="fieldLabel">{entry.label}</span>
                    <input
                      type={entry.type}
                      value={form[entry.key]}
                      placeholder={entry.placeholder}
                      onChange={(e) => setForm((p) => ({ ...p, [entry.key]: e.target.value }))}
                    />
                  </label>
                ))}
              </form>
              {(correctedText || parsedFilters) && (
                <div className="parsedInfo">
                  {correctedText && <div><strong style={{ color: "var(--gold-light)" }}>Corrected query:</strong> {correctedText}</div>}
                  {parsedFilters && <div style={{ marginTop: correctedText ? 4 : 0 }}><strong style={{ color: "var(--gold-light)" }}>Active filters:</strong> {JSON.stringify(parsedFilters)}</div>}
                </div>
              )}
            </div>
          </article>

          {/* -- CONTENT GRID -- */}
          <div className="contentGrid">

            {/* Results */}
            <article className="card">
              <div className="cardHeader">
                <div>
                  <div className="cardLabel">Listings</div>
                  <h2>
                    Matching Properties
                    {hasResults && (
                      <span className="resultCount" style={{ marginLeft: 12, fontSize: 12, verticalAlign: "middle" }}>
                        {results.length} found
                      </span>
                    )}
                  </h2>
                </div>
                <button type="button" className="btnGhost" onClick={fetchSavedProperties}>
                  <IconStar />
                  View Saved
                </button>
              </div>
              <div className="cardBody">
                {!hasResults && (
                  <div className="emptyState">
                    No properties to display. Use the chat or filters above to begin your search.
                  </div>
                )}
                <div className="propertyGrid">
                  {results.map((property) => (
                    <article key={property.id} className="propertyCard">
                      <div className="propImgWrap">
                        <img src={property.imageUrl} alt={property.title} />
                        <div className="propBadge">{formatCurrency(property.price)}</div>
                      </div>
                      <div className="propBody">
                        <div className="propTitle">{property.title}</div>
                        <div className="propLocation">
                          <IconPin />
                          {property.location}
                        </div>
                        <div className="propPrice">{formatCurrency(property.price)}</div>
                        <div className="propMeta">
                          <span className="propTag">
                            <IconBed style={{ marginRight: 4 }} /> {property.bedrooms} bed
                          </span>
                          <span className="propTag">
                            <IconBath style={{ marginRight: 4 }} /> {property.bathrooms} bath
                          </span>
                          <span className="propTag">
                            <IconSqft style={{ marginRight: 4 }} /> {property.sizeSqft} sqft
                          </span>
                        </div>
                        <div className="amenities">
                          {property.amenities.join(" · ")}
                        </div>
                        <button
                          type="button"
                          className="btnGold"
                          style={{ width: "100%", fontSize: 12, padding: "9px 14px" }}
                          onClick={() => saveProperty(property)}
                        >
                          <IconStar /> Save Property
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </article>

            {/* Saved & Compare */}
            <article className="card">
              <div className="cardHeader">
                <div>
                  <div className="cardLabel">Portfolio</div>
                  <h2>Saved Properties</h2>
                </div>
              </div>
              <div className="cardBody">
                <div className="savedStats">
                  <div className="statBox">
                    <div className="statNum">{savedProperties.length}</div>
                    <div className="statLabel">Saved</div>
                  </div>
                  <div className="statBox">
                    <div className="statNum">{comparePropertyIds.length}/3</div>
                    <div className="statLabel">Comparing</div>
                  </div>
                </div>

                {saveStatus && (
                  <div className={`statusLine ${saveStatusType}`} style={{ marginBottom: 14 }}>
                    {saveStatus}
                  </div>
                )}

                {savedProperties.length === 0 ? (
                  <div className="emptyState" style={{ padding: "28px 20px" }}>
                    No saved properties yet. Sign in and save listings to build your portfolio.
                  </div>
                ) : (
                  <ul className="savedList">
                    {savedProperties.map((property) => {
                      const isComparing = comparePropertyIds.includes(String(property.id));
                      return (
                        <li key={property._id || `${property.userEmail}-${property.id}`} className="savedItem">
                          <div>
                            <div className="savedItemTitle">{property.title}</div>
                            <div className="savedItemMeta" style={{ marginTop: 3 }}>
                              <IconPin style={{ display: "inline", marginRight: 4 }} />
                              {property.location}
                            </div>
                          </div>
                          <div className="savedItemPrice">{formatCurrency(property.price)}</div>
                          <div className="savedActions">
                            <button
                              type="button"
                              className={isComparing ? "btnCompareActive" : "btnCompare"}
                              onClick={() => toggleCompare(property.id)}
                              style={{ fontSize: 12, padding: "7px 12px" }}
                            >
                              <IconCompare />
                              {isComparing ? "Remove" : "Compare"}
                            </button>
                            <button
                              type="button"
                              className="btnDanger"
                              onClick={() => deleteSavedProperty(property.id)}
                              style={{ fontSize: 12, padding: "7px 12px" }}
                            >
                              <IconTrash />
                              Remove
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {comparedProperties.length > 0 && (
                  <div className="compareSection">
                    <div className="compareSectionHeader">
                      <div className="cardLabel" style={{ margin: 0 }}>Side-by-Side</div>
                      <h3>Property Comparison</h3>
                    </div>
                    <div className="compareGrid">
                      {comparedProperties.map((property) => (
                        <article key={`compare-${property.id}`} className="compareCard">
                          {property.imageUrl && (
                            <img className="compareImage" src={property.imageUrl} alt={property.title} />
                          )}
                          <div className="compareBody">
                            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 10, lineHeight: 1.3 }}>
                              {property.title}
                            </div>
                            <div className="divider" />
                            <div className="compareRow">
                              <span className="compareRowLabel">Location</span>
                              <span className="compareRowVal">{property.location || "N/A"}</span>
                            </div>
                            <div className="compareRow">
                              <span className="compareRowLabel">Price</span>
                              <span className="compareRowValGold">{property.price ? formatCurrency(property.price) : "N/A"}</span>
                            </div>
                            <div className="compareRow">
                              <span className="compareRowLabel">Beds</span>
                              <span className="compareRowVal">{property.bedrooms ?? "N/A"}</span>
                            </div>
                            <div className="compareRow">
                              <span className="compareRowLabel">Baths</span>
                              <span className="compareRowVal">{property.bathrooms ?? "N/A"}</span>
                            </div>
                            <div className="compareRow">
                              <span className="compareRowLabel">Size</span>
                              <span className="compareRowVal">{property.sizeSqft ? `${property.sizeSqft} sqft` : "N/A"}</span>
                            </div>
                            <div className="compareRow">
                              <span className="compareRowLabel">Amenities</span>
                              <span className="compareRowVal" style={{ fontSize: 11 }}>
                                {Array.isArray(property.amenities) && property.amenities.length > 0
                                  ? property.amenities.join(", ")
                                  : "N/A"}
                              </span>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </article>

          </div>

        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  );
}

