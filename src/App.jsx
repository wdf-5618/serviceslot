import React, { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "serviceslot.requests.v1";

const SERVICES = [
  {
    id: "consultation",
    number: "01",
    name: "Home consultation",
    description: "Talk through the issue and plan the next step.",
    duration: "30 min",
    price: "Complimentary",
  },
  {
    id: "maintenance",
    number: "02",
    name: "Repair & maintenance",
    description: "A focused visit for repairs or routine maintenance.",
    duration: "60 min",
    price: "From MMK 35,000",
  },
  {
    id: "installation",
    number: "03",
    name: "Installation visit",
    description: "Plan and review an installation at your property.",
    duration: "90 min",
    price: "From MMK 50,000",
  },
];

const TIME_SLOTS = ["09:00", "10:30", "13:00", "14:30", "16:00"];
const FILTERS = ["All", "Pending", "Confirmed", "Completed", "Cancelled"];

function localDateString(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}

function readRequests() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) =>
      item &&
      typeof item.id === "string" &&
      typeof item.date === "string" &&
      typeof item.time === "string" &&
      typeof item.serviceName === "string" &&
      typeof item.customerName === "string" &&
      FILTERS.includes(item.status)
    );
  } catch (error) {
    console.warn("ServiceSlot could not read the local request list.", error);
    return [];
  }
}

function formatDate(dateValue, options = {}) {
  if (!dateValue) return "Date not set";
  const parts = dateValue.split("-").map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) {
    return dateValue;
  }
  // Construct a local date from the calendar fields to avoid UTC date shifts.
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  return new Intl.DateTimeFormat(undefined, {
    weekday: options.weekday || "short",
    month: "short",
    day: "numeric",
    year: options.year ? "numeric" : undefined,
  }).format(date);
}

function formatTime(timeValue) {
  const parts = timeValue.split(":").map(Number);
  if (parts.length !== 2 || parts.some((part) => !Number.isFinite(part))) {
    return timeValue;
  }
  return new Date(2000, 0, 1, parts[0], parts[1]).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function isPastTime(dateValue, timeValue) {
  if (dateValue !== localDateString()) return false;
  const parts = timeValue.split(":").map(Number);
  const now = new Date();
  const slotMinutes = parts[0] * 60 + parts[1];
  return slotMinutes <= now.getHours() * 60 + now.getMinutes();
}

function getSlotKey(dateValue, timeValue) {
  return dateValue + "|" + timeValue;
}

function makeRequestId() {
  return "SS-" + Date.now().toString(36).slice(-5).toUpperCase();
}

function StatusPill({ status }) {
  return <span className={"status-pill status-" + status.toLowerCase()}>{status}</span>;
}

function App() {
  const today = localDateString();
  const [requests, setRequests] = useState(readRequests);
  const [storageWarning, setStorageWarning] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState("consultation");
  const [selectedDate, setSelectedDate] = useState(() => localDateString(1));
  const [selectedTime, setSelectedTime] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState("");
  const [formNotice, setFormNotice] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
      setStorageWarning(false);
    } catch (error) {
      console.warn("ServiceSlot could not save the local request list.", error);
      setStorageWarning(true);
    }
  }, [requests]);

  const selectedService = SERVICES.find((service) => service.id === selectedServiceId) || SERVICES[0];

  const activeSlots = useMemo(() => {
    return new Set(
      requests
        .filter((item) => item.status === "Pending" || item.status === "Confirmed")
        .map((item) => getSlotKey(item.date, item.time))
    );
  }, [requests]);

  const filteredRequests = useMemo(() => {
    return requests
      .filter((item) => activeFilter === "All" || item.status === activeFilter)
      .slice()
      .sort((first, second) => {
        const dateCompare = (first.date + first.time).localeCompare(second.date + second.time);
        if (dateCompare !== 0) return dateCompare;
        return first.customerName.localeCompare(second.customerName);
      });
  }, [requests, activeFilter]);

  const pendingCount = requests.filter((item) => item.status === "Pending").length;
  const confirmedCount = requests.filter((item) => item.status === "Confirmed").length;
  const upcomingCount = requests.filter((item) =>
    (item.status === "Pending" || item.status === "Confirmed") && item.date >= today
  ).length;

  function handleSubmit(event) {
    event.preventDefault();
    setFormError("");
    setFormNotice("");

    if (!selectedTime) {
      setFormError("Choose a time slot before saving your request.");
      return;
    }

    if (activeSlots.has(getSlotKey(selectedDate, selectedTime))) {
      setFormError("That slot already has an active request in this browser. Choose another time.");
      return;
    }

    const request = {
      id: makeRequestId(),
      serviceId: selectedService.id,
      serviceName: selectedService.name,
      duration: selectedService.duration,
      date: selectedDate,
      time: selectedTime,
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim(),
      customerPhone: customerPhone.trim(),
      notes: notes.trim(),
      status: "Pending",
      createdAt: new Date().toISOString(),
    };

    setRequests((current) => [request, ...current]);
    setFormNotice("Request " + request.id + " was saved in this browser. The business was not notified.");
    setSelectedTime("");
    setCustomerName("");
    setCustomerEmail("");
    setCustomerPhone("");
    setNotes("");
  }

  function updateStatus(id, nextStatus) {
    setRequests((current) =>
      current.map((item) => item.id === id ? { ...item, status: nextStatus } : item)
    );
  }

  function removeRequest(id) {
    const confirmed = window.confirm("Remove this local demo record from this browser?");
    if (!confirmed) return;
    setRequests((current) => current.filter((item) => item.id !== id));
  }

  function clearRequests() {
    const confirmed = window.confirm("Clear all ServiceSlot records saved in this browser?");
    if (!confirmed) return;
    setRequests([]);
    setFormNotice("Local demo records cleared.");
    setFormError("");
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="container header-inner">
          <a className="brand-lockup" href="#top" aria-label="ServiceSlot home">
            <span className="brand-mark" aria-hidden="true">S</span>
            <span>
              <span className="brand-name">ServiceSlot</span>
              <span className="brand-caption">APPOINTMENT DESK</span>
            </span>
          </a>
          <div className="header-actions">
            <span className="demo-chip"><span className="demo-dot" /> Local demo</span>
            {requests.length > 0 && (
              <button className="btn btn-sm btn-outline-secondary reset-button" onClick={clearRequests} type="button">
                Clear local records
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="container page-content" id="top">
        <section className="hero-section">
          <div className="hero-copy">
            <p className="eyebrow"><span className="eyebrow-line" /> SIMPLE SERVICE SCHEDULING</p>
            <h1>Good service starts with a <span>clear time.</span></h1>
            <p className="hero-description">
              A tidy place to request a visit, review appointments, and keep the next step clear.
            </p>
          </div>
          <div className="hero-business-card">
            <div className="business-icon" aria-hidden="true">NS</div>
            <div>
              <p className="business-label">DEMO BUSINESS</p>
              <h2>Northstar Home Services</h2>
              <p>Home consultations · Repairs · Installation</p>
            </div>
          </div>
        </section>

        <div className="alert local-only-banner" role="note">
          <span className="banner-icon" aria-hidden="true">i</span>
          <p><strong>Demo only.</strong> Requests stay in this browser. No appointment is actually reserved and no business is notified.</p>
        </div>

        {storageWarning && (
          <div className="alert alert-warning" role="alert">
            This browser blocked local storage. Requests may disappear when you refresh or close the page.
          </div>
        )}

        <section className="stats-grid" aria-label="Request overview">
          <article className="stat-card stat-card-primary">
            <div className="stat-topline"><span>Upcoming requests</span><span className="stat-mark">↗</span></div>
            <p className="stat-value">{upcomingCount}</p>
            <p className="stat-help">Pending or confirmed</p>
          </article>
          <article className="stat-card">
            <div className="stat-topline"><span>Awaiting review</span><span className="stat-indicator pending-indicator" /></div>
            <p className="stat-value">{pendingCount}</p>
            <p className="stat-help">Needs a next step</p>
          </article>
          <article className="stat-card">
            <div className="stat-topline"><span>Confirmed</span><span className="stat-indicator confirmed-indicator" /></div>
            <p className="stat-value">{confirmedCount}</p>
            <p className="stat-help">Locally marked confirmed</p>
          </article>
        </section>

        {(formError || formNotice) && (
          <div className={"alert " + (formError ? "alert-danger" : "alert-success") + " form-feedback"} role={formError ? "alert" : "status"}>
            {formError || formNotice}
          </div>
        )}

        <section className="workspace-grid">
          <section className="panel booking-panel" aria-labelledby="booking-title">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">NEW REQUEST</p>
                <h2 id="booking-title">Book a visit</h2>
                <p>Choose a service and a time that works for you.</p>
              </div>
              <span className="step-count">01 / 02</span>
            </div>

            <form onSubmit={handleSubmit}>
              <fieldset className="booking-fieldset">
                <legend className="field-legend">Choose a service</legend>
                <div className="service-list">
                  {SERVICES.map((service) => (
                    <button
                      className={"service-option " + (selectedServiceId === service.id ? "is-selected" : "")}
                      key={service.id}
                      onClick={() => setSelectedServiceId(service.id)}
                      type="button"
                      aria-pressed={selectedServiceId === service.id}
                    >
                      <span className="service-number">{service.number}</span>
                      <span className="service-copy">
                        <span className="service-name">{service.name}</span>
                        <span className="service-description">{service.description}</span>
                        <span className="service-meta">{service.duration} <span aria-hidden="true">·</span> {service.price}</span>
                      </span>
                      <span className="service-check" aria-hidden="true">{selectedServiceId === service.id ? "✓" : "+"}</span>
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset className="booking-fieldset">
                <legend className="field-legend">Pick a date</legend>
                <div className="date-row">
                  <div className="date-input-wrap">
                    <label className="form-label" htmlFor="appointment-date">Appointment date</label>
                    <input
                      className="form-control"
                      id="appointment-date"
                      type="date"
                      min={today}
                      value={selectedDate}
                      onChange={(event) => {
                        setSelectedDate(event.target.value);
                        setSelectedTime("");
                        setFormError("");
                      }}
                      required
                    />
                  </div>
                  <p className="date-note">Slots shown in your local time.</p>
                </div>
                <div className="time-grid" role="group" aria-label="Available time slots">
                  {TIME_SLOTS.map((time) => {
                    const booked = activeSlots.has(getSlotKey(selectedDate, time));
                    const past = isPastTime(selectedDate, time);
                    const disabled = booked || past;
                    let reason = "";
                    if (booked) reason = "Already requested in this browser";
                    if (past) reason = "This time has passed";
                    return (
                      <button
                        className={"time-option " + (selectedTime === time ? "is-selected" : "")}
                        key={time}
                        type="button"
                        aria-pressed={selectedTime === time}
                        aria-label={formatTime(time) + (reason ? ". " + reason : "")}
                        disabled={disabled}
                        onClick={() => {
                          setSelectedTime(time);
                          setFormError("");
                        }}
                      >
                        {formatTime(time)}
                      </button>
                    );
                  })}
                </div>
                <p className="slot-note">Times reserved by active requests are unavailable in this browser only.</p>
              </fieldset>

              <fieldset className="booking-fieldset">
                <legend className="field-legend">Your details</legend>
                <div className="row g-3">
                  <div className="col-12">
                    <label className="form-label" htmlFor="customer-name">Full name <span className="required-mark">*</span></label>
                    <input
                      className="form-control"
                      id="customer-name"
                      type="text"
                      autoComplete="name"
                      maxLength={90}
                      placeholder="Your name"
                      value={customerName}
                      onChange={(event) => setCustomerName(event.target.value)}
                      required
                    />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label" htmlFor="customer-email">Email address <span className="required-mark">*</span></label>
                    <input
                      className="form-control"
                      id="customer-email"
                      type="email"
                      autoComplete="email"
                      maxLength={120}
                      placeholder="you@example.com"
                      value={customerEmail}
                      onChange={(event) => setCustomerEmail(event.target.value)}
                      required
                    />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label" htmlFor="customer-phone">Phone number</label>
                    <input
                      className="form-control"
                      id="customer-phone"
                      type="tel"
                      autoComplete="tel"
                      maxLength={35}
                      placeholder="Optional"
                      value={customerPhone}
                      onChange={(event) => setCustomerPhone(event.target.value)}
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label" htmlFor="request-notes">Anything we should know?</label>
                    <textarea
                      className="form-control"
                      id="request-notes"
                      rows="3"
                      maxLength={400}
                      placeholder="A short note about the service you need (optional)"
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                    />
                    <div className="field-footnote">{notes.length}/400 characters</div>
                  </div>
                </div>
              </fieldset>

              <button className="btn btn-primary submit-button" type="submit">
                Save appointment request <span aria-hidden="true">↗</span>
              </button>
              <p className="submit-note">Saving here does not contact a service provider.</p>
            </form>
          </section>

          <section className="panel queue-panel" aria-labelledby="queue-title">
            <div className="panel-heading queue-heading">
              <div>
                <p className="panel-kicker">LOCAL REQUEST QUEUE</p>
                <h2 id="queue-title">Appointment requests <span className="count-bubble">{requests.length}</span></h2>
                <p>Review and update the demo records stored here.</p>
              </div>
            </div>

            <div className="filter-bar" role="group" aria-label="Filter requests by status">
              {FILTERS.map((filter) => (
                <button
                  className={"filter-button " + (activeFilter === filter ? "is-active" : "")}
                  key={filter}
                  type="button"
                  aria-pressed={activeFilter === filter}
                  onClick={() => setActiveFilter(filter)}
                >
                  {filter}
                </button>
              ))}
            </div>

            {filteredRequests.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon" aria-hidden="true">○</div>
                <h3>{activeFilter === "All" ? "No requests yet" : "Nothing in " + activeFilter.toLowerCase()}</h3>
                <p>
                  {activeFilter === "All"
                    ? "Submit the form to create a local demo request. It will appear here for review."
                    : "Try another status filter or save a new request."}
                </p>
                {activeFilter !== "All" && (
                  <button className="btn btn-sm btn-outline-secondary" type="button" onClick={() => setActiveFilter("All")}>
                    Show all requests
                  </button>
                )}
              </div>
            ) : (
              <div className="request-list">
                {filteredRequests.map((item) => (
                  <article className="request-card" key={item.id}>
                    <div className="request-top">
                      <div>
                        <p className="request-id">{item.id}</p>
                        <h3>{item.customerName}</h3>
                      </div>
                      <StatusPill status={item.status} />
                    </div>
                    <p className="request-service">{item.serviceName} <span>·</span> {item.duration}</p>
                    <div className="request-time">
                      <span className="time-icon" aria-hidden="true">◷</span>
                      <span>{formatDate(item.date, { weekday: "short" })} · {formatTime(item.time)}</span>
                    </div>
                    <div className="request-contact">
                      <span>{item.customerEmail || "No email supplied"}</span>
                      {item.customerPhone && <span>{item.customerPhone}</span>}
                    </div>
                    {item.notes && <p className="request-notes">{item.notes}</p>}
                    <div className="request-actions">
                      {item.status === "Pending" && (
                        <>
                          <button className="btn btn-sm btn-primary" type="button" onClick={() => updateStatus(item.id, "Confirmed")}>Confirm request</button>
                          <button className="btn btn-sm btn-outline-secondary" type="button" onClick={() => updateStatus(item.id, "Cancelled")}>Cancel</button>
                        </>
                      )}
                      {item.status === "Confirmed" && (
                        <>
                          <button className="btn btn-sm btn-primary" type="button" onClick={() => updateStatus(item.id, "Completed")}>Mark complete</button>
                          <button className="btn btn-sm btn-outline-secondary" type="button" onClick={() => updateStatus(item.id, "Cancelled")}>Cancel</button>
                        </>
                      )}
                      {(item.status === "Completed" || item.status === "Cancelled") && (
                        <button className="btn btn-sm btn-outline-secondary" type="button" onClick={() => removeRequest(item.id)}>
                          Remove record
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}

            <div className="queue-footer">
              <span className="footer-dot" aria-hidden="true" />
              <p>Single-browser demo · Not connected to a real calendar</p>
            </div>
          </section>
        </section>

        <footer className="page-footer">
          <span>ServiceSlot <span className="footer-divider">/</span> React + Bootstrap</span>
          <span>Built as a learning project by THET PAING SOE</span>
        </footer>
      </main>
    </div>
  );
}

export default App;
