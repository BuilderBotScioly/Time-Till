const STORAGE_KEY = "time-till-countdowns-v1";
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const WEEKDAY_ORDER = [
  { value: 1, short: "Mon", long: "Monday" },
  { value: 2, short: "Tue", long: "Tuesday" },
  { value: 3, short: "Wed", long: "Wednesday" },
  { value: 4, short: "Thu", long: "Thursday" },
  { value: 5, short: "Fri", long: "Friday" },
  { value: 6, short: "Sat", long: "Saturday" },
  { value: 0, short: "Sun", long: "Sunday" },
];

const state = {
  countdowns: loadCountdowns(),
  draftSpecificDates: [],
  editingId: null,
};

const elements = {
  form: document.querySelector("#countdown-form"),
  formTitle: document.querySelector("#form-title"),
  submitButton: document.querySelector("#submit-button"),
  cancelEditButton: document.querySelector("#cancel-edit"),
  formNote: document.querySelector("#form-note"),
  idInput: document.querySelector("#countdown-id"),
  nameInput: document.querySelector("#countdown-name"),
  targetDateInput: document.querySelector("#target-date"),
  addSpecificDateButton: document.querySelector("#add-specific-date"),
  specificDateInput: document.querySelector("#specific-date-input"),
  specificDateList: document.querySelector("#specific-date-list"),
  weekdayCheckboxes: Array.from(document.querySelectorAll(".weekday-checkbox")),
  countdownGrid: document.querySelector("#countdown-grid"),
  emptyState: document.querySelector("#empty-state"),
  resultsSummary: document.querySelector("#results-summary"),
  clearAllButton: document.querySelector("#clear-all"),
  cardTemplate: document.querySelector("#countdown-card-template"),
};

initialize();

function initialize() {
  bindEvents();
  renderSpecificDateChips();
  renderCountdowns();
}

function bindEvents() {
  elements.form.addEventListener("submit", handleSubmit);
  elements.addSpecificDateButton.addEventListener("click", handleAddSpecificDate);
  elements.specificDateInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleAddSpecificDate();
    }
  });
  elements.specificDateList.addEventListener("click", handleSpecificDateListClick);
  elements.cancelEditButton.addEventListener("click", () => resetForm());
  elements.clearAllButton.addEventListener("click", handleClearAll);
  elements.countdownGrid.addEventListener("click", handleCardAction);
}

function handleSubmit(event) {
  event.preventDefault();

  const name = elements.nameInput.value.trim();
  const targetDate = elements.targetDateInput.value;

  if (!name || !targetDate) {
    setFormNote("Add a name and target date before saving.", "error");
    return;
  }

  const existing = state.countdowns.find(
    (countdown) => countdown.id === state.editingId,
  );
  const countdown = {
    id: existing?.id ?? createId(),
    name,
    targetDate,
    excludedWeekdays: getSelectedWeekdays(),
    excludedDates: sortDateValues(state.draftSpecificDates),
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (existing) {
    state.countdowns = state.countdowns.map((entry) =>
      entry.id === countdown.id ? countdown : entry,
    );
    saveCountdowns(state.countdowns);
    renderCountdowns();
    resetForm("Countdown updated.");
    return;
  }

  state.countdowns = [...state.countdowns, countdown];
  saveCountdowns(state.countdowns);
  renderCountdowns();
  resetForm("Countdown created.");
}

function handleAddSpecificDate() {
  const dateValue = elements.specificDateInput.value;

  if (!dateValue) {
    setFormNote("Choose a specific date to exclude first.", "error");
    return;
  }

  if (state.draftSpecificDates.includes(dateValue)) {
    setFormNote("That date is already excluded for this countdown.", "error");
    return;
  }

  state.draftSpecificDates = sortDateValues([...state.draftSpecificDates, dateValue]);
  elements.specificDateInput.value = "";
  renderSpecificDateChips();
  setFormNote("Specific date added.", "success");
}

function handleSpecificDateListClick(event) {
  const removeButton = event.target.closest("[data-remove-date]");
  if (!removeButton) {
    return;
  }

  const dateToRemove = removeButton.dataset.removeDate;
  state.draftSpecificDates = state.draftSpecificDates.filter(
    (value) => value !== dateToRemove,
  );
  renderSpecificDateChips();
  setFormNote("Specific date removed.", "success");
}

function handleCardAction(event) {
  const actionButton = event.target.closest("[data-action]");
  if (!actionButton) {
    return;
  }

  const card = actionButton.closest("[data-countdown-id]");
  if (!card) {
    return;
  }

  const countdownId = card.dataset.countdownId;
  const action = actionButton.dataset.action;

  if (action === "edit") {
    startEditing(countdownId);
    return;
  }

  if (action === "delete") {
    deleteCountdown(countdownId);
  }
}

function handleClearAll() {
  if (!state.countdowns.length) {
    return;
  }

  const confirmed = window.confirm(
    "Delete every countdown saved in Time-Till on this device?",
  );
  if (!confirmed) {
    return;
  }

  state.countdowns = [];
  saveCountdowns(state.countdowns);
  renderCountdowns();
  resetForm("All countdowns deleted.");
}

function startEditing(countdownId) {
  const countdown = state.countdowns.find((entry) => entry.id === countdownId);
  if (!countdown) {
    return;
  }

  state.editingId = countdown.id;
  state.draftSpecificDates = [...countdown.excludedDates];

  elements.idInput.value = countdown.id;
  elements.nameInput.value = countdown.name;
  elements.targetDateInput.value = countdown.targetDate;
  elements.weekdayCheckboxes.forEach((checkbox) => {
    checkbox.checked = countdown.excludedWeekdays.includes(Number(checkbox.value));
  });

  elements.formTitle.textContent = "Edit countdown";
  elements.submitButton.textContent = "Save changes";
  elements.cancelEditButton.hidden = false;
  renderSpecificDateChips();
  setFormNote(`Editing \"${countdown.name}\".`, "success");
  elements.form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function deleteCountdown(countdownId) {
  const countdown = state.countdowns.find((entry) => entry.id === countdownId);
  if (!countdown) {
    return;
  }

  const confirmed = window.confirm(`Delete \"${countdown.name}\"?`);
  if (!confirmed) {
    return;
  }

  state.countdowns = state.countdowns.filter((entry) => entry.id !== countdownId);
  saveCountdowns(state.countdowns);
  renderCountdowns();

  if (state.editingId === countdownId) {
    resetForm("Deleted the countdown you were editing.");
    return;
  }

  setFormNote(`Deleted \"${countdown.name}\".`, "success");
}

function resetForm(message = "Countdowns are saved locally in your browser on this device.") {
  const noteText = message.toLowerCase();
  state.editingId = null;
  state.draftSpecificDates = [];
  elements.form.reset();
  elements.idInput.value = "";
  elements.formTitle.textContent = "Create a countdown";
  elements.submitButton.textContent = "Create countdown";
  elements.cancelEditButton.hidden = true;
  renderSpecificDateChips();
  setFormNote(
    message,
    noteText.includes("deleted") ||
      noteText.includes("created") ||
      noteText.includes("updated")
      ? "success"
      : "neutral",
  );
}

function renderSpecificDateChips() {
  if (!state.draftSpecificDates.length) {
    elements.specificDateList.innerHTML =
      '<p class="chip-placeholder">No one-off dates excluded yet.</p>';
    return;
  }

  const chipsMarkup = state.draftSpecificDates
    .map(
      (dateValue) => `
        <span class="chip">
          ${escapeHtml(formatDateLong(dateValue))}
          <button
            type="button"
            class="chip-remove"
            aria-label="Remove ${escapeHtml(formatDateLong(dateValue))}"
            data-remove-date="${dateValue}"
          >
            x
          </button>
        </span>
      `,
    )
    .join("");

  elements.specificDateList.innerHTML = chipsMarkup;
}

function renderCountdowns() {
  const sortedCountdowns = [...state.countdowns].sort((left, right) => {
    const leftGap = differenceInCalendarDays(todayDateValue(), left.targetDate);
    const rightGap = differenceInCalendarDays(todayDateValue(), right.targetDate);
    if (leftGap !== rightGap) {
      return leftGap - rightGap;
    }
    return left.name.localeCompare(right.name);
  });

  elements.countdownGrid.innerHTML = "";

  if (!sortedCountdowns.length) {
    elements.emptyState.hidden = false;
    elements.clearAllButton.hidden = true;
    elements.resultsSummary.textContent =
      "No countdowns yet. Create one to get started.";
    return;
  }

  elements.emptyState.hidden = true;
  elements.clearAllButton.hidden = false;
  elements.resultsSummary.textContent = `${sortedCountdowns.length} countdown${
    sortedCountdowns.length === 1 ? "" : "s"
  } saved on this device.`;

  sortedCountdowns.forEach((countdown) => {
    const card = elements.cardTemplate.content.firstElementChild.cloneNode(true);
    const metrics = buildCountdownMetrics(countdown);

    card.dataset.countdownId = countdown.id;
    card.classList.add(metrics.statusClass);
    card.querySelector(".countdown-title").textContent = countdown.name;
    card.querySelector(".metric-value").textContent = metrics.displayValue;
    card.querySelector(".metric-caption").textContent = metrics.caption;
    card.querySelector(".target-date").textContent = formatDateLong(countdown.targetDate);
    card.querySelector(".calendar-gap").textContent = metrics.calendarGapLabel;
    card.querySelector(".excluded-range").textContent = metrics.excludedInRangeLabel;
    card.querySelector(".recurring-summary").textContent = summarizeWeekdays(
      countdown.excludedWeekdays,
    );
    card.querySelector(".specific-summary").textContent = summarizeSpecificDates(
      countdown.excludedDates,
    );
    card.querySelector(".date-preview").textContent = previewSpecificDates(
      countdown.excludedDates,
    );

    elements.countdownGrid.appendChild(card);
  });
}

function buildCountdownMetrics(countdown) {
  const today = todayDateValue();
  const calendarGap = differenceInCalendarDays(today, countdown.targetDate);
  const includedDays = countIncludedDays(today, countdown);
  const excludedInRange = Math.max(
    Math.abs(calendarGap) - Math.abs(includedDays),
    0,
  );

  if (calendarGap > 0) {
    return {
      statusClass: "is-future",
      displayValue: String(includedDays),
      caption:
        includedDays === 0
          ? "No included days left before the target date"
          : `${includedDays} included day${pluralize(includedDays)} left`,
      calendarGapLabel: `${calendarGap} calendar day${pluralize(calendarGap)} left`,
      excludedInRangeLabel: `${excludedInRange} excluded day${pluralize(
        excludedInRange,
      )}`,
    };
  }

  if (calendarGap < 0) {
    const overdue = Math.abs(includedDays);
    const overdueCalendar = Math.abs(calendarGap);
    return {
      statusClass: "is-past",
      displayValue: String(overdue),
      caption:
        overdue === 0
          ? "Passed without any counted included days"
          : `${overdue} included day${pluralize(overdue)} ago`,
      calendarGapLabel: `${overdueCalendar} calendar day${pluralize(
        overdueCalendar,
      )} ago`,
      excludedInRangeLabel: `${excludedInRange} excluded day${pluralize(
        excludedInRange,
      )}`,
    };
  }

  return {
    statusClass: "is-today",
    displayValue: "0",
    caption: "Target date is today",
    calendarGapLabel: "Today",
    excludedInRangeLabel: "0 excluded days",
  };
}

function countIncludedDays(today, countdown) {
  const totalCalendarDays = differenceInCalendarDays(today, countdown.targetDate);

  if (totalCalendarDays === 0) {
    return 0;
  }

  const direction = totalCalendarDays > 0 ? 1 : -1;
  let cursor = today;
  let includedDays = 0;

  for (let step = 0; step < Math.abs(totalCalendarDays); step += 1) {
    cursor = offsetDateValue(cursor, direction);
    if (!isExcludedDay(cursor, countdown)) {
      includedDays += 1;
    }
  }

  return includedDays * direction;
}

function isExcludedDay(dateValue, countdown) {
  const weekday = new Date(`${dateValue}T00:00:00`).getDay();
  return (
    countdown.excludedWeekdays.includes(weekday) ||
    countdown.excludedDates.includes(dateValue)
  );
}

function getSelectedWeekdays() {
  return elements.weekdayCheckboxes
    .filter((checkbox) => checkbox.checked)
    .map((checkbox) => Number(checkbox.value))
    .sort((left, right) => weekdaySortIndex(left) - weekdaySortIndex(right));
}

function summarizeWeekdays(values) {
  if (!values.length) {
    return "Counts every weekday";
  }

  const labels = WEEKDAY_ORDER.filter((weekday) => values.includes(weekday.value)).map(
    (weekday) => weekday.short,
  );
  return `Skips ${labels.join(", ")}`;
}

function summarizeSpecificDates(values) {
  if (!values.length) {
    return "No one-off dates";
  }

  return `${values.length} specific date${pluralize(values.length)} skipped`;
}

function previewSpecificDates(values) {
  if (!values.length) {
    return "No one-off exclusions added for this countdown.";
  }

  const preview = values.slice(0, 3).map(formatDateShort);
  if (values.length <= 3) {
    return `Excluded dates: ${preview.join(", ")}`;
  }

  return `Excluded dates: ${preview.join(", ")} and ${
    values.length - 3
  } more`;
}

function loadCountdowns() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map(normalizeCountdown)
      .filter(Boolean);
  } catch (error) {
    console.error("Unable to load saved countdowns.", error);
    return [];
  }
}

function saveCountdowns(countdowns) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(countdowns));
}

function normalizeCountdown(input) {
  if (!input || typeof input !== "object") {
    return null;
  }

  const name = typeof input.name === "string" ? input.name.trim() : "";
  const targetDate = typeof input.targetDate === "string" ? input.targetDate : "";

  if (!name || !isDateValue(targetDate)) {
    return null;
  }

  const excludedWeekdays = Array.isArray(input.excludedWeekdays)
    ? input.excludedWeekdays
        .map((value) => Number(value))
        .filter((value) => WEEKDAY_ORDER.some((weekday) => weekday.value === value))
        .sort((left, right) => weekdaySortIndex(left) - weekdaySortIndex(right))
    : [];

  const excludedDates = Array.isArray(input.excludedDates)
    ? sortDateValues(input.excludedDates.filter(isDateValue))
    : [];

  return {
    id: typeof input.id === "string" && input.id ? input.id : createId(),
    name,
    targetDate,
    excludedWeekdays,
    excludedDates,
    createdAt: input.createdAt ?? new Date().toISOString(),
    updatedAt: input.updatedAt ?? new Date().toISOString(),
  };
}

function createId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `countdown-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function setFormNote(message, tone = "neutral") {
  elements.formNote.textContent = message;
  elements.formNote.classList.remove("is-error", "is-success");

  if (tone === "error") {
    elements.formNote.classList.add("is-error");
  }

  if (tone === "success") {
    elements.formNote.classList.add("is-success");
  }
}

function todayDateValue() {
  return toDateValue(new Date());
}

function toDateValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function offsetDateValue(dateValue, days) {
  const [year, month, day] = dateValue.split("-").map(Number);
  const shifted = new Date(year, month - 1, day + days);
  return toDateValue(shifted);
}

function differenceInCalendarDays(startDateValue, endDateValue) {
  return Math.round(
    (toUtcTimestamp(endDateValue) - toUtcTimestamp(startDateValue)) / MS_PER_DAY,
  );
}

function toUtcTimestamp(dateValue) {
  const [year, month, day] = dateValue.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function sortDateValues(values) {
  return [...new Set(values)].sort((left, right) =>
    toUtcTimestamp(left) - toUtcTimestamp(right),
  );
}

function isDateValue(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function formatDateLong(dateValue) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${dateValue}T00:00:00`));
}

function formatDateShort(dateValue) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${dateValue}T00:00:00`));
}

function pluralize(value) {
  return Number(value) === 1 ? "" : "s";
}

function weekdaySortIndex(value) {
  return WEEKDAY_ORDER.findIndex((weekday) => weekday.value === value);
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
