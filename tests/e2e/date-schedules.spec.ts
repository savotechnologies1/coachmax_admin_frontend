import { test, expect, type Locator, type Page } from "@playwright/test";

// These tests exercise the actual React application with an explicitly mocked
// backend. They never start the API server, connect to MongoDB, or send email.
const ids = { term: "111111111111111111111111", future: "111111111111111111111112", category: "222222222222222222222222", program: "333333333333333333333333", first: "444444444444444444444441", second: "444444444444444444444442", player: "555555555555555555555555" };
const category = { _id: ids.category, name: "Academy", isEvent: false };
const program = { _id: ids.program, name: "Development", ageGroup: "U11", category: ids.category };
const staff = { _id: "666666666666666666666666", name: "Test Administrator", role: "SUPER_ADMIN", email: "admin@example.test" };
const term = { _id: ids.term, name: "Term 4", year: 2026, startDate: "2026-10-01", endDate: "2026-12-09", status: "ACTIVE", isEvent: false };
const player = { _id: ids.player, fullName: "Abeer Example", firstName: "Abeer", lastName: "Example", dob: "2015-10-30", gender: "MALE", isMedicalCondition: false, medicalConditionDetails: "", playerStatus: "ACTIVE", rating: 1, programs: [program], category, assignedClasses: [], classPaymentStatuses: [], createdAt: "2026-10-25T23:30:00Z" };
const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

type MockState = {
  terms: typeof term[];
  creates: Record<string, unknown>[];
  updates: Record<string, unknown>[];
  rosterReads: string[];
  attendanceWrites: Record<string, unknown>[];
  playerWrites: string[];
  runtimeErrors: string[];
  unexpectedRequests: string[];
  rejectTerm: boolean;
  currentDob: string;
  note: string;
  status: string;
};

async function mockApplication(page: Page): Promise<MockState> {
  const state: MockState = { terms: [structuredClone(term), { ...term, _id: ids.future, name: "Term 1", year: 2027, startDate: "2027-01-15", endDate: "2027-03-31", status: "UPCOMING" }], creates: [], updates: [], rosterReads: [], attendanceWrites: [], playerWrites: [], runtimeErrors: [], unexpectedRequests: [], rejectTerm: false, currentDob: player.dob, note: "", status: "PRESENT" };
  page.on("pageerror", (error) => state.runtimeErrors.push(error.message));
  await page.clock.setFixedTime(new Date("2026-10-26T05:00:00Z"));
  await page.addInitScript((user) => {
    localStorage.setItem("token", "mocked-browser-test-token");
    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("show_players_sidebar", "false");
    localStorage.setItem("show_allocated_players", "false");
    localStorage.setItem("show_unallocated_players", "false");
  }, staff);
  await page.routeWebSocket(/\/socket\.io\//, (socket) => socket.close());
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === "fonts.googleapis.com") return route.fulfill({ status: 200, contentType: "text/css", body: "/* External font disabled in isolated browser tests. */" });
    if (url.origin === "http://127.0.0.1:4400" && !url.pathname.startsWith("/api/")) return route.continue();
    if (url.pathname.startsWith("/socket.io/")) return route.abort();
    if (url.origin !== "http://127.0.0.1:4401" || !url.pathname.startsWith("/api/")) {
      state.unexpectedRequests.push(route.request().url());
      return route.abort();
    }
    const send = (body: unknown, status = 200) => route.fulfill({ status, contentType: "application/json", headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*" }, body: JSON.stringify(body) });
    if (route.request().method() === "OPTIONS") return send({});
    const pathname = url.pathname;
    if (pathname === "/api/auth/getMyProfile") return send({ success: true, data: staff });
    if (pathname.includes("sidebar-badges")) return send({ success: true, data: {} });
    if (pathname === "/api/admin/notifications") return send({ success: true, data: [] });
    if (pathname === "/api/user/getCategories") return send({ data: [category] });
    if (pathname.startsWith("/api/user/getProgramsByCategory/")) return send({ data: [program] });
    if (pathname === "/api/user/getAllPrograms") return send({ data: [program] });
    if (pathname === "/api/admin/getAllCoaches") return send({ data: [{ _id: staff._id, name: "Coach Test" }] });
    if (pathname === "/api/admin/players/search") return send({ success: true, data: [], pagination: { total: 0, totalPages: 0 } });
    if (pathname === "/api/admin/getAllTerms") return send({ data: state.terms.filter((item) => !url.searchParams.get("year") || item.year === Number(url.searchParams.get("year"))) });
    if (pathname === "/api/admin/createTerm") {
      const body = route.request().postDataJSON();
      state.creates.push(body);
      if (state.rejectTerm) return send({ message: "The selected dates were rejected by the server" }, 400);
      const created = { ...term, ...body, _id: "111111111111111111111113" };
      state.terms.push(created);
      return send({ message: "Term created successfully", data: created });
    }
    if (pathname.startsWith("/api/admin/updateTerm/")) {
      const body = route.request().postDataJSON(); state.updates.push(body);
      state.terms = state.terms.map((item) => item._id === pathname.split("/").at(-1) ? { ...item, ...body } : item);
      return send({ message: "Term updated successfully", data: state.terms.find((item) => item._id === pathname.split("/").at(-1)) });
    }
    const slots = [
      { classId: ids.first, className: "U11 Development", dayOfWeek: "MONDAY", startTime: "17:00", endTime: "18:00", occurrenceId: `${ids.first}:MONDAY:1020:1080` },
      { classId: ids.second, className: "U10 Skills", dayOfWeek: "TUESDAY", startTime: "16:30", endTime: "17:30", occurrenceId: `${ids.second}:TUESDAY:990:1050` },
      { classId: ids.first, className: "U11 Development", dayOfWeek: "WEDNESDAY", startTime: "17:00", endTime: "18:00", occurrenceId: `${ids.first}:WEDNESDAY:1020:1080` },
    ].map((slot) => ({ ...slot, category, program, term, coach: { _id: staff._id, name: "Test Coach" }, playerCount: 1, status: "ACTIVE" }));
    if (pathname === "/api/admin/getClassFiltersWithTimeSlots") {
      const day = url.searchParams.get("day");
      return send({ terms: [term], categories: [category], programs: [program], days: ["MONDAY", "TUESDAY", "WEDNESDAY"], timeSlots: slots.filter((slot) => day === "ALL" || day === slot.dayOfWeek) });
    }
    if (pathname === "/api/admin/getClassFullTable") {
      const classId = url.searchParams.get("classId")!; state.rosterReads.push(classId);
      const slot = slots.find((item) => item.classId === classId)!;
      return send({ ...slot, sessions: classId === ids.first ? ["2026-10-26", "2026-10-28"] : ["2026-10-27"], players: [{ playerId: ids.player, name: player.fullName, dob: state.currentDob, gender: "MALE", isMedicalCondition: false, rating: 1, paymentStatus: "UNPAID", attendance: { "2026-10-26": state.status, "2026-10-28": "NOT_MARKED" }, attendanceDetails: { "2026-10-26": { status: state.status, reason: state.note, note: state.note } } }] });
    }
    if (pathname.startsWith("/api/admin/markSingleAttendance/")) {
      const body = route.request().postDataJSON(); state.attendanceWrites.push(body);
      state.note = body.reason ?? state.note; state.status = body.status;
      return send({ success: true, message: "Attendance and notes saved", data: { ...body, note: state.note } });
    }
    if (pathname === `/api/admin/player/${ids.player}`) return send({ success: true, data: { player: { ...player, dob: state.currentDob }, familyPlayers: [], perDayAttendance: [], availableTerms: state.terms, paymentFinancialSummary: { history: [] } } });
    if (pathname.startsWith("/api/coach/notes/player/")) return send({ success: true, data: [], pagination: { page: 1, totalPages: 0, total: 0 } });
    if (pathname.startsWith("/api/admin/updatePlayer/")) {
      const body = route.request().postData() || ""; state.playerWrites.push(body);
      state.currentDob = body.match(/name="dob"\r\n\r\n([^\r]+)/)?.[1] || state.currentDob;
      return send({ success: true, message: "Player updated successfully", data: { ...player, dob: state.currentDob } });
    }
    state.unexpectedRequests.push(`${route.request().method()} ${pathname}`);
    return send({ message: "Unconfigured browser-test API" }, 500);
  });
  return state;
}

async function chooseDate(page: Page, input: Locator, isoDate: string) {
  await input.click();
  const calendar = page.locator(".flatpickr-calendar.open");
  await expect(calendar).toBeVisible();
  await expect(calendar.locator(".flatpickr-weekday")).toHaveText(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
  const [year, month, day] = isoDate.split("-").map(Number);
  const currentYear = Number(await calendar.locator(".cur-year").inputValue());
  const monthDropdown = calendar.locator(".flatpickr-monthDropdown-months");
  const currentMonth = await monthDropdown.count() ? Number(await monthDropdown.inputValue()) : months.indexOf((await calendar.locator(".cur-month").innerText()).trim());
  const delta = year * 12 + month - 1 - (currentYear * 12 + currentMonth);
  for (let offset = 0; offset < Math.abs(delta); offset++) await calendar.locator(delta > 0 ? ".flatpickr-next-month" : ".flatpickr-prev-month").click();
  await calendar.locator(`.flatpickr-day[aria-label="${months[month - 1]} ${day}, ${year}"]`).click();
}

test.describe("Mocked-backend browser acceptance", () => {
  let state: MockState;
  test.beforeEach(async ({ page }) => { state = await mockApplication(page); });
  test.afterEach(async ({ page }, info) => {
    await page.screenshot({ path: info.outputPath("final-screen.png"), fullPage: false, animations: "disabled", timeout: 10000 });
    expect(state.runtimeErrors, "uncaught browser errors").toEqual([]);
    expect(state.unexpectedRequests, "all external and API requests are isolated by the fixture").toEqual([]);
  });

  test("term create and edit preserve the server date format and slash display in any viewer timezone", async ({ page }) => {
    await page.goto("/programs-2");
    await page.getByRole("button", { name: "Term Settings", exact: true }).click();
    await page.locator("select").filter({ has: page.locator('option[value="2027"]') }).selectOption("2027");
    await page.getByRole("button", { name: "Add Term", exact: true }).click();
    await page.getByRole("button", { name: "Commit Term", exact: true }).click();
    await expect(page.locator("#term-name-error")).toHaveText("Term name is required.");
    await page.locator('input[name="name"]').fill("Term roundtrip");
    await expect(page.locator('input[name="year"]')).toHaveValue("2027");
    await chooseDate(page, page.getByLabel("Start Date (DD/MM/YYYY)", { exact: true }), "2027-01-15");
    await chooseDate(page, page.getByLabel("End Date (DD/MM/YYYY)", { exact: true }), "2027-03-31");
    await expect(page.getByLabel("Start Date (DD/MM/YYYY)", { exact: true })).toHaveValue("15/01/2027");
    await page.screenshot({ path: test.info().outputPath("term-date-form.png"), fullPage: false, animations: "disabled", timeout: 10000 });
    await page.getByRole("button", { name: "Commit Term", exact: true }).click();
    await expect.poll(() => state.creates.length).toBe(1);
    expect(state.creates[0]).toMatchObject({ year: 2027, startDate: "15/01/2027", endDate: "31/03/2027" });
    await page.getByRole("button", { name: "Edit Term roundtrip", exact: true }).click();
    await expect(page.getByLabel("Start Date (DD/MM/YYYY)", { exact: true })).toHaveValue("15/01/2027");
    await chooseDate(page, page.getByLabel("Start Date (DD/MM/YYYY)", { exact: true }), "2027-01-16");
    await page.getByRole("button", { name: "Commit Term", exact: true }).click();
    await expect.poll(() => state.updates.length).toBe(1);
    expect(state.updates[0]).toMatchObject({ startDate: "16/01/2027", endDate: "31/03/2027" });
    await expect(page.getByText("16/01/2027", { exact: true })).toBeVisible();
  });

  test("View All groups multi-day classes Monday-first and loads collapsed rosters on demand", async ({ page }) => {
    await page.goto("/programs-2");
    await page.getByRole("button", { name: "View All", exact: true }).click();
    const headings = page.getByRole("heading", { name: /^(Monday|Tuesday|Wednesday)$/ });
    await expect(headings).toHaveText(["Monday", "Tuesday", "Wednesday"]);
    const secondCard = page.locator(`[id="class-card-${ids.second}:TUESDAY:990:1050"]`);
    await expect(secondCard.getByText("U10 Skills", { exact: true })).toBeVisible();
    expect(state.rosterReads).not.toContain(ids.second);
    await expect(secondCard.getByRole("button", { name: "Edit class", exact: true })).toBeVisible();
    await expect(secondCard.getByRole("button", { name: "Duplicate class", exact: true })).toBeVisible();
    await secondCard.getByRole("button", { name: "Expand class", exact: true }).click();
    await expect.poll(() => state.rosterReads.includes(ids.second)).toBe(true);
    const headerText = await secondCard.innerText();
    expect(headerText.indexOf("U10 Skills")).toBeLessThan(headerText.indexOf("16:30"));
    const mondayCard = page.locator(`[id="class-card-${ids.first}:MONDAY:1020:1080"]`);
    const expandMonday = mondayCard.getByRole("button", { name: "Expand class", exact: true });
    if (await expandMonday.isVisible()) await expandMonday.click();
    await expect(mondayCard.getByText("26/10/2026", { exact: true })).toBeVisible();
    await expect(mondayCard.getByText("28/10/2026", { exact: true })).toHaveCount(0);
    await expect(mondayCard.getByText("30/10/2015", { exact: true })).toBeVisible();
  });

  test("notes save independently for a present player and Clear Status preserves the note", async ({ page }) => {
    await page.goto("/programs-2");
    const card = page.locator(`[id="class-card-${ids.first}:MONDAY:1020:1080"]`);
    const row = card.locator("tbody tr").filter({ hasText: player.fullName });
    await expect(row).toBeVisible();
    await row.locator("td").nth(5).click();
    const menu = page.getByRole("dialog", { name: "Attendance and note", exact: true });
    await expect(menu.getByText("26/10/2026", { exact: true })).toBeVisible();
    await menu.getByRole("button", { name: "Great session", exact: true }).click();
    await page.screenshot({ path: test.info().outputPath("attendance-note-menu.png"), fullPage: false, animations: "disabled", timeout: 10000 });
    await menu.getByRole("button", { name: "Save Note", exact: true }).click();
    await expect.poll(() => state.attendanceWrites.length).toBe(1);
    expect(state.attendanceWrites[0]).toMatchObject({ status: "PRESENT", reason: "Great session", sessionDate: "2026-10-26", playerId: ids.player });
    await expect(card.locator('[title="PRESENT: Great session"]')).toBeVisible();
    await row.locator("td").nth(5).click({ position: { x: 8, y: 20 } });
    await menu.getByRole("button", { name: "Clear Status", exact: true }).click();
    await expect.poll(() => state.attendanceWrites.length).toBe(2);
    expect(state.attendanceWrites[1]).toMatchObject({ status: "NOT_MARKED", reason: "Great session", sessionDate: "2026-10-26" });
  });

  test("DOB control displays DD/MM/YYYY and submits the selected calendar day in multipart", async ({ page }) => {
    await page.goto(`/player/${ids.player}`);
    await page.getByRole("button", { name: "Edit player", exact: true }).click();
    const dobInput = page.getByRole("textbox", { name: "Date (DD/MM/YYYY)", exact: true });
    await expect(dobInput).toHaveValue("30/10/2015");
    await chooseDate(page, dobInput, "2015-10-31");
    await expect(dobInput).toHaveValue("31/10/2015");
    await page.screenshot({ path: test.info().outputPath("dob-date-input.png"), fullPage: false, animations: "disabled", timeout: 10000 });
    await page.getByRole("button", { name: "Save Changes", exact: true }).click();
    await expect.poll(() => state.playerWrites.length).toBe(1);
    expect(state.playerWrites[0]).toContain('name="dob"\r\n\r\n2015-10-31');
    await expect(page.getByText("31/10/2015", { exact: true })).toBeVisible();
    await expect(page.getByText("Academy · U11", { exact: true })).toBeVisible();
  });

  test("a rejected term save keeps the form open and shows the real server error", async ({ page }) => {
    state.rejectTerm = true;
    await page.goto("/programs-2");
    await page.getByRole("button", { name: "Term Settings", exact: true }).click();
    await page.getByRole("button", { name: "Add Term", exact: true }).click();
    await page.locator('input[name="name"]').fill("Rejected term");
    await chooseDate(page, page.getByLabel("Start Date (DD/MM/YYYY)", { exact: true }), "2026-10-28");
    await chooseDate(page, page.getByLabel("End Date (DD/MM/YYYY)", { exact: true }), "2026-10-30");
    await page.getByRole("button", { name: "Commit Term", exact: true }).click();
    await expect(page.getByText("The selected dates were rejected by the server").first()).toBeVisible();
    await expect(page.locator('input[name="name"]')).toHaveValue("Rejected term");
    expect(state.terms.some((item) => item.name === "Rejected term")).toBe(false);
  });
});
