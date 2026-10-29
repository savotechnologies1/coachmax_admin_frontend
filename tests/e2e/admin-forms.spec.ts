import { test, expect, type Page } from "@playwright/test";

const staff = { _id: "666666666666666666666666", name: "Test Administrator", role: "SUPER_ADMIN", email: "admin@example.test" };
const term = { _id: "111111111111111111111111", name: "Term 4", year: 2026, startDate: "2026-10-01", endDate: "2026-12-31", status: "ACTIVE", isEvent: false };
const academyCategory = { _id: "222222222222222222222222", name: "Academy", isEvent: false };
const program = { _id: "333333333333333333333333", name: "Development", ageGroup: "U11", category: academyCategory._id };
const coach = { _id: "666666666666666666666667", name: "Coach Test" };
const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

type Submission = { path: string; method: string; contentType: string; body: Buffer };
type TestState = { submissions: Submission[]; pageErrors: string[]; externalRequests: string[]; storeCategories: { _id: string; name: string; description?: string }[] };

async function mockAdminApp(page: Page): Promise<TestState> {
  const state: TestState = { submissions: [], pageErrors: [], externalRequests: [], storeCategories: [{ _id: "777777777777777777777777", name: "Training Wear" }] };
  page.on("pageerror", (error) => state.pageErrors.push(error.message));
  await page.clock.setFixedTime(new Date("2026-10-28T05:00:00Z"));
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
    if (url.hostname === "fonts.googleapis.com") return route.fulfill({ status: 200, contentType: "text/css", body: "/* Isolated browser test: no external fonts. */" });
    if (url.origin === "http://127.0.0.1:4400" && !url.pathname.startsWith("/api/")) return route.continue();
    if (url.pathname.startsWith("/socket.io/")) return route.abort();
    if (url.origin !== "http://127.0.0.1:4401" || !url.pathname.startsWith("/api/")) {
      state.externalRequests.push(route.request().url());
      return route.abort();
    }

    const method = route.request().method();
    const path = url.pathname;
    const send = (body: unknown, status = 200) => route.fulfill({ status, contentType: "application/json", headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*" }, body: JSON.stringify(body) });
    if (method === "OPTIONS") return send({});
    if (method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE") {
      state.submissions.push({ path, method, contentType: route.request().headers()["content-type"] || "", body: route.request().postDataBuffer() || Buffer.alloc(0) });
      if (path === "/api/admin/store/categories" && method === "POST") {
        const raw = route.request().postDataJSON();
        state.storeCategories.push({ _id: "777777777777777777777778", ...raw });
      }
      return send({ success: true, message: "Saved successfully", data: { _id: "888888888888888888888888" } });
    }

    if (path === "/api/auth/getMyProfile") return send({ success: true, data: staff });
    if (path === "/api/admin/notifications") return send({ success: true, data: [] });
    if (path === "/api/admin/registration-requests") {
      const makeRequest = (id: string, name: string, requestType: string, addedBy: string, parentId: string) => ({
        _id: id,
        requestType,
        status: "PENDING",
        addedBy,
        createdAt: requestType === "TEMPORARY_PLAYER" ? "2026-10-28T04:00:00.000Z" : "2026-10-27T04:00:00.000Z",
        category: academyCategory,
        programs: [program],
        preferredTerm: term,
        preferredClasses: [],
        player: {
          _id: `${id}player`,
          firstName: name.split(" ")[0],
          lastName: name.split(" ").slice(1).join(" "),
          fullName: name,
          dob: "2015-10-30",
          gender: "MALE",
          profileImage: "",
          paymentStatus: "UNPAID",
          preferredFoot: "RIGHT",
          isMedicalCondition: false,
          rating: 0,
        },
        parent: { _id: parentId, fullName: "Test Parent", email: "parent@example.test", phone: "0400000000" },
      });
      return send({
        success: true,
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
        data: [
          makeRequest("999999999999999999999991", "Zara Temporary", "TEMPORARY_PLAYER", "Super Admin", "999999999999999999999981"),
          makeRequest("999999999999999999999992", "Alex App Registration", "NEW_PLAYER", "App", "999999999999999999999982"),
        ],
      });
    }
    if (path === "/api/admin/getAllTerms" || path === "/api/user/getAllTerms") return send({ data: [term] });
    if (path === "/api/admin/getAllCoaches") return send({ data: [coach] });
    if (path === "/api/admin/getAllTeams") return send({ success: true, data: [], pagination: { total: 0, totalPages: 1 } });
    if (path === "/api/admin/leagues") return send({ success: true, data: [] });
    if (path === "/api/admin/store/categories") return send({ success: true, data: state.storeCategories });
    if (path === "/api/user/getCategories") return send({ data: [academyCategory] });
    if (path.startsWith("/api/user/getProgramsByCategory/") || path === "/api/user/getAllPrograms") return send({ data: [program] });
    if (path === "/api/admin/getAllClasses") return send({ success: true, data: [], pagination: { totalClasses: 0, totalPages: 1 } });
    if (path === "/api/admin/getClassFiltersWithTimeSlots") return send({ terms: [term], categories: [academyCategory], programs: [program], days: [], timeSlots: [] });
    if (path === "/api/admin/getAllEvents") return send({ success: true, data: [] });
    if (path === "/api/admin/news/categories") return send({ success: true, data: ["Training"] });
    return send({ success: true, data: [], pagination: { total: 0, totalPages: 1 } });
  });
  return state;
}

async function pngFile(page: Page, name: string, width: number, height: number) {
  const base64 = await page.evaluate(([w, h]) => {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const context = canvas.getContext("2d")!;
    const gradient = context.createLinearGradient(0, 0, w, h);
    gradient.addColorStop(0, "#0047ff");
    gradient.addColorStop(1, "#ff8a00");
    context.fillStyle = gradient;
    context.fillRect(0, 0, w, h);
    return canvas.toDataURL("image/png").split(",")[1];
  }, [width, height]);
  return { name, mimeType: "image/png", buffer: Buffer.from(base64, "base64") };
}

async function chooseDate(page: Page, input: ReturnType<Page["locator"]>, isoDate: string) {
  await input.click();
  const calendar = page.locator(".flatpickr-calendar.open");
  await expect(calendar).toBeVisible();
  const [year, month, day] = isoDate.split("-").map(Number);
  const currentYear = Number(await calendar.locator(".cur-year").inputValue());
  const monthDropdown = calendar.locator(".flatpickr-monthDropdown-months");
  const currentMonth = await monthDropdown.count() ? Number(await monthDropdown.inputValue()) : months.indexOf((await calendar.locator(".cur-month").innerText()).trim());
  const delta = year * 12 + month - 1 - (currentYear * 12 + currentMonth);
  for (let offset = 0; offset < Math.abs(delta); offset++) await calendar.locator(delta > 0 ? ".flatpickr-next-month" : ".flatpickr-prev-month").click();
  await calendar.locator(`.flatpickr-day[aria-label="${months[month - 1]} ${day}, ${year}"]`).click();
}

function uploadedPngDimensions(submission: Submission, fieldName: string) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const body = submission.body;
  const headerText = body.toString("latin1");
  expect(headerText).toContain(`name="${fieldName}"`);
  const imageStart = body.indexOf(signature);
  expect(imageStart, `PNG payload for ${fieldName}`).toBeGreaterThanOrEqual(0);
  return { width: body.readUInt32BE(imageStart + 16), height: body.readUInt32BE(imageStart + 20) };
}

test.describe("CoachMax form design and submission acceptance", () => {
  let state: TestState;
  test.beforeEach(async ({ page }) => { state = await mockAdminApp(page); });
  test.afterEach(async ({ page }, info) => {
    await page.screenshot({ path: info.outputPath("final-screen.png"), fullPage: false, animations: "disabled", timeout: 10000 });
    expect(state.pageErrors, "uncaught browser errors").toEqual([]);
    expect(state.externalRequests, "external requests remain isolated").toEqual([]);
  });

  test("team and league forms validate, crop logos, and submit the selected term year", async ({ page }) => {
    await page.goto("/teams");
    await page.getByRole("button", { name: "Add Team", exact: true }).click();
    await page.getByRole("button", { name: "Save Team", exact: true }).click();
    await expect(page.locator("#team-name-error")).toHaveText("Team name is required.");
    await page.getByLabel("Team Name *").fill("U11 Test Team");
    await page.getByLabel("Age Group *").fill("U11");
    await page.getByLabel("Academic Term *").selectOption(term._id);
    await page.getByLabel("Assigned Head Coach *").selectOption(coach._id);
    await page.locator('input[type="file"]').setInputFiles(await pngFile(page, "team.png", 512, 512));
    await expect(page.getByRole("dialog", { name: "Crop image" })).toBeVisible();
    await expect(page.getByText("Final file: 512 × 512 px", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Use this crop", exact: true }).click();
    await page.getByRole("button", { name: "Save Team", exact: true }).click();
    await expect.poll(() => state.submissions.filter((item) => item.path === "/api/admin/teams" && item.method === "POST").length).toBe(1);
    const teamRequest = state.submissions.find((item) => item.path === "/api/admin/teams" && item.method === "POST")!;
    expect(teamRequest.contentType).toContain("multipart/form-data");
    expect(teamRequest.body.toString("latin1")).toContain('name="year"\r\n\r\n2026');
    expect(teamRequest.body.toString("latin1")).toContain(term._id);
    expect(uploadedPngDimensions(teamRequest, "teamLogo")).toEqual({ width: 512, height: 512 });

    await page.goto("/leagues");
    await page.getByRole("button", { name: "Add League", exact: true }).click();
    await page.getByRole("button", { name: /Next: Fixtures & Rules/ }).click();
    await expect(page.locator("#league-name-error")).toHaveText("League name is required.");
    const form = page.locator("[data-coachmax-form]");
    await form.locator("input").first().fill("U11 Autumn League");
    await form.locator("select").nth(1).selectOption(term._id);
    await page.locator('input[type="file"]').setInputFiles(await pngFile(page, "league.png", 512, 512));
    await expect(page.getByText("Final file: 512 × 512 px", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Use this crop", exact: true }).click();
    await page.getByRole("button", { name: /Next: Fixtures & Rules/ }).click();
    await page.getByRole("button", { name: /Next: Select Teams/ }).click();
    await page.getByRole("button", { name: "Create League", exact: true }).click();
    await expect.poll(() => state.submissions.filter((item) => item.path === "/api/admin/leagues" && item.method === "POST").length).toBe(1);
    const leagueRequest = state.submissions.find((item) => item.path === "/api/admin/leagues" && item.method === "POST")!;
    expect(leagueRequest.body.toString("latin1")).toContain('name="year"\r\n\r\n2026');
    expect(leagueRequest.body.toString("latin1")).toContain(term._id);
    expect(uploadedPngDimensions(leagueRequest, "leagueLogo")).toEqual({ width: 512, height: 512 });
  });

  test("store category and product submit required fields and a square cropped image", async ({ page }) => {
    await page.goto("/products");
    await expect(page.getByRole("link", { name: "Add Product", exact: true })).toBeVisible();
    await expect(page.locator("aside").getByRole("link", { name: "Add Product", exact: true })).toHaveCount(0);
    await page.getByRole("link", { name: "Add Product", exact: true }).click();
    await expect(page).toHaveURL(/\/add-product$/);
    await page.getByRole("button", { name: "Publish to Store", exact: true }).click();
    await expect(page.locator("#product-name-error")).toHaveText("Product name is required.");
    await page.getByRole("button", { name: "Manage Categories", exact: true }).click();
    const categoryDialog = page.locator('form[data-coachmax-form]').filter({ hasText: "Add New Category" });
    await categoryDialog.getByRole("button", { name: "Add Category", exact: true }).click();
    await expect(categoryDialog.getByText("Category name is required.", { exact: true })).toBeVisible();
    await categoryDialog.getByLabel("Category Name *").fill("CoachMax Test Apparel");
    await categoryDialog.getByLabel("Description (optional)").fill("Browser acceptance category");
    await categoryDialog.getByRole("button", { name: "Add Category", exact: true }).click();
    await expect.poll(() => state.submissions.filter((item) => item.path === "/api/admin/store/categories" && item.method === "POST").length).toBe(1);
    await page.keyboard.press("Escape");
    await page.getByRole("combobox", { name: "Product category" }).click();
    await page.getByRole("option", { name: "CoachMax Test Apparel", exact: true }).click();
    await page.getByLabel("Product Name *").fill("Training Top");
    await page.getByLabel("Price (AUD) *").fill("49.95");
    await page.getByLabel("Search sizes or type a custom size").fill("Medium");
    await page.getByRole("option", { name: "Medium M", exact: true }).click();
    await page.getByLabel("Colors *").fill("Navy, White");
    await page.locator('input[type="file"]').setInputFiles(await pngFile(page, "product.png", 1200, 1200));
    await expect(page.getByText("Final file: 1200 × 1200 px", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Use this crop", exact: true }).click();
    await page.getByRole("button", { name: "Publish to Store", exact: true }).click();
    await expect.poll(() => state.submissions.filter((item) => item.path === "/api/admin/store/products" && item.method === "POST").length).toBe(1);
    const productRequest = state.submissions.find((item) => item.path === "/api/admin/store/products" && item.method === "POST")!;
    expect(productRequest.body.toString("latin1")).toContain('name="name"\r\n\r\nTraining Top');
    expect(productRequest.body.toString("latin1")).toContain('name="price"\r\n\r\n49.95');
    expect(uploadedPngDimensions(productRequest, "images")).toEqual({ width: 1200, height: 1200 });
  });

  test("coach and sponsor forms show field-level errors and submit valid data", async ({ page }) => {
    await page.goto("/coaches");
    await page.getByRole("button", { name: "Add Coach", exact: true }).click();
    const coachForm = page.locator('form[data-coachmax-form]');
    const coachDialogShell = page.locator(".coachmax-form-header").locator("xpath=../..");
    await expect(coachDialogShell).toHaveCSS("border-top-left-radius", "8px");
    await expect(coachDialogShell).toHaveCSS("border-bottom-left-radius", "8px");
    await expect(coachDialogShell).toHaveCSS("overflow-x", "hidden");
    await coachForm.getByRole("button", { name: "Add Coach", exact: true }).click();
    await expect(page.locator("#coach-full-name-error")).toHaveText("Full name is required.");
    await expect(page.locator("#coach-email-error")).toHaveText("Enter a valid email address.");
    await expect(page.locator("#coach-phone-error")).toHaveText("Enter a valid phone number.");
    await page.getByLabel("Full Name *").fill("Jordan Coach");
    await page.getByLabel("Email Identity *").fill("jordan@example.test");
    await page.getByLabel("Mobile Access *").fill("0400123456");
    await page.getByLabel("Secure Password *").fill("CoachMax!2026");
    await page.getByLabel("Confirm Password *").fill("CoachMax!2026");
    await coachForm.getByRole("button", { name: "Add Coach", exact: true }).click();
    await expect.poll(() => state.submissions.filter((item) => item.path === "/api/admin/createCoach" && item.method === "POST").length).toBe(1);

    await page.goto("/sponsors");
    const sponsorForm = page.locator('form[data-coachmax-form]');
    await sponsorForm.getByRole("button", { name: "Create Sponsor", exact: true }).click();
    await expect(page.locator("#sponsor-title-error")).toHaveText("Banner title is required.");
    await expect(page.locator("#sponsor-subtitle-error")).toHaveText("Subtitle or offer is required.");
    await expect(page.locator("#sponsor-link-error")).toHaveText("Action link is required.");
    await expect(page.locator("#sponsor-image-error")).toHaveText("Upload a banner image to create this sponsor.");
    await page.getByLabel("Banner Title *").fill("Season Partner");
    await page.getByLabel("Subtitle / Offer *").fill("Official training partner");
    await page.getByLabel("Action Link / URL *").fill("https://example.test/partner");
    await page.locator('input[type="file"]').setInputFiles(await pngFile(page, "sponsor.png", 1200, 400));
    await expect(page.getByText("Final file: 1200 × 400 px", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Use this crop", exact: true }).click();
    await sponsorForm.getByRole("button", { name: "Create Sponsor", exact: true }).click();
    await expect.poll(() => state.submissions.filter((item) => item.path === "/api/admin/createBanner" && item.method === "POST").length).toBe(1);
    const sponsorRequest = state.submissions.find((item) => item.path === "/api/admin/createBanner" && item.method === "POST")!;
    expect(uploadedPngDimensions(sponsorRequest, "bannerImg")).toEqual({ width: 1200, height: 400 });
  });

  test("clone term requires different source and target terms with inline messages", async ({ page }) => {
    await page.goto("/clone-term");
    await page.getByRole("button", { name: "Preview Clone Data", exact: true }).click();
    await expect(page.locator("#clone-source-term-error")).toHaveText("Select a source term.");
    await expect(page.locator("#clone-target-term-error")).toHaveText("Select a target term.");
    await page.getByRole("combobox", { name: "Source Term *" }).click();
    await page.getByRole("option", { name: "Term 4 (2026)", exact: true }).click();
    await page.getByRole("combobox", { name: "Target Term *" }).click();
    await page.getByRole("option", { name: "Term 4 (2026)", exact: true }).click();
    await page.getByRole("button", { name: "Preview Clone Data", exact: true }).click();
    await expect(page.locator("#clone-target-term-error")).toHaveText("Choose a different target term from the source.");
  });

  test("news article submits its cropped banner after required description validation", async ({ page }) => {
    await page.goto("/news");
    await expect(page.locator("aside").getByRole("link", { name: "All News", exact: true })).toHaveCount(0);
    await expect(page.locator("aside").getByRole("link", { name: "Add News", exact: true })).toHaveCount(0);
    await page.locator("aside").getByRole("link", { name: "News", exact: true }).click();
    await expect(page).toHaveURL(/\/news$/);
    await expect(page.getByRole("link", { name: "Add News", exact: true })).toBeVisible();
    await page.getByRole("link", { name: "Add News", exact: true }).click();
    await expect(page).toHaveURL(/\/add-content$/);
    const newsFormCard = page.locator(".coachmax-form-header").locator("xpath=..");
    await expect(newsFormCard).toHaveCSS("border-top-left-radius", "8px");
    await expect(newsFormCard).toHaveCSS("border-bottom-left-radius", "8px");
    await expect(newsFormCard).toHaveCSS("overflow-x", "hidden");
    await page.getByRole("button", { name: "Publish Article", exact: true }).click();
    await expect(page.getByText("Headline title is required.", { exact: true })).toBeVisible();
    await page.getByLabel("Headline Title").fill("Club announces the new season");
    await page.getByLabel("Category").fill("Training");
    await page.locator('[contenteditable="true"]').fill("The new academy season starts this week.");
    await page.getByLabel("Choose news banner image").setInputFiles(await pngFile(page, "news.png", 1200, 675));
    await expect(page.getByText("Final file: 1200 × 675 px", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Use this crop", exact: true }).click();
    await page.getByRole("button", { name: "Publish Article", exact: true }).click();
    await expect.poll(() => state.submissions.filter((item) => item.path === "/api/admin/news" && item.method === "POST").length).toBe(1);
    const newsRequest = state.submissions.find((item) => item.path === "/api/admin/news" && item.method === "POST")!;
    expect(newsRequest.body.toString("latin1")).toContain('name="title"\r\n\r\nClub announces the new season');
    expect(uploadedPngDimensions(newsRequest, "images")).toEqual({ width: 1200, height: 675 });
  });

  test("holiday camp submits date range, sessions, and the 16:9 banner crop", async ({ page }) => {
    await page.goto("/add-event");
    await page.getByRole("button", { name: "Next Step", exact: true }).click();
    await expect(page.locator("#event-title-error")).toHaveText("Event title is required.");
    await page.getByLabel("Event Title *").fill("October Holiday Camp");
    await page.getByRole("combobox", { name: "Event type" }).click();
    await page.getByRole("option", { name: "Holiday Camp", exact: true }).click();
    await page.getByLabel("Event Description *").fill("A week of skills and friendly matches.");
    await page.getByRole("button", { name: "Next Step", exact: true }).click();
    await chooseDate(page, page.getByLabel("Start Date (DD/MM/YYYY)"), "2026-10-30");
    await chooseDate(page, page.getByLabel("End Date (DD/MM/YYYY)"), "2026-10-30");
    await page.getByRole("button", { name: "Next Step", exact: true }).click();
    await page.locator('input[type="file"]').setInputFiles(await pngFile(page, "camp.png", 1920, 1080));
    await expect(page.getByText("Final file: 1920 × 1080 px", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Use this crop", exact: true }).click();
    await page.getByRole("button", { name: "Create Event Profile", exact: true }).click();
    await expect.poll(() => state.submissions.filter((item) => item.path === "/api/admin/createEvent" && item.method === "POST").length).toBe(1);
    const eventRequest = state.submissions.find((item) => item.path === "/api/admin/createEvent" && item.method === "POST")!;
    const eventBody = eventRequest.body.toString("latin1");
    expect(eventBody).toContain('name="eventType"\r\n\r\nCAMP');
    expect(eventBody).toContain('name="startDate"\r\n\r\n2026-10-30');
    expect(eventBody).toContain('name="sessions"');
    expect(uploadedPngDimensions(eventRequest, "eventImg")).toEqual({ width: 1920, height: 1080 });
  });

  test("term and program dialogs use the shared header and submit valid dates and fields", async ({ page }) => {
    await page.goto("/programs-2");
    await page.getByRole("button", { name: "Term Settings", exact: true }).click();
    await page.getByRole("button", { name: "Add Term", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Schedule New Term" })).toBeVisible();
    const termDialogShell = page.locator(".coachmax-form-header").locator("xpath=../..");
    await expect(termDialogShell).toHaveCSS("border-top-left-radius", "8px");
    await expect(termDialogShell).toHaveCSS("border-bottom-left-radius", "8px");
    await expect(termDialogShell).toHaveCSS("overflow-x", "hidden");
    await page.getByRole("button", { name: "Commit Term", exact: true }).click();
    await expect(page.locator("#term-name-error")).toHaveText("Term name is required.");
    await expect(page.locator("#term-start-error")).toHaveText("Start date is required.");
    await page.locator("#term-name").fill("Term 1 2026");
    await chooseDate(page, page.locator("#term-start-display"), "2026-11-01");
    await chooseDate(page, page.locator("#term-end-display"), "2026-12-15");
    await page.getByRole("button", { name: "Commit Term", exact: true }).click();
    await expect.poll(() => state.submissions.filter((item) => item.path === "/api/admin/createTerm" && item.method === "POST").length).toBe(1);
    const termRequest = state.submissions.find((item) => item.path === "/api/admin/createTerm" && item.method === "POST")!;
    expect(termRequest.body.toString("utf8")).toContain('"year":2026');
    expect(termRequest.body.toString("utf8")).toContain('"startDate":"01/11/2026"');
    expect(termRequest.body.toString("utf8")).toContain('"endDate":"15/12/2026"');

    await page.goto("/programs");
    await page.getByRole("button", { name: "Add Program", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Add New Program" })).toBeVisible();
    const programForm = page.locator("form[data-coachmax-form]");
    await programForm.getByRole("button", { name: "Create Program", exact: true }).click();
    await expect(programForm.getByText("Program name is required", { exact: true })).toBeVisible();
    await programForm.locator('input[type="text"]').first().fill("U11 Development");
    await programForm.locator("select").selectOption("Academy");
    await programForm.locator('input[type="number"]').nth(0).fill("18");
    await programForm.locator('input[type="number"]').nth(1).fill("75");
    await programForm.locator('input[type="time"]').nth(0).fill("09:00");
    await programForm.locator('input[type="time"]').nth(1).fill("10:00");
    await programForm.getByRole("button", { name: "Create Program", exact: true }).click();
    await expect.poll(() => state.submissions.filter((item) => item.path === "/api/admin/createProgram" && item.method === "POST").length).toBe(1);
    expect(state.submissions.find((item) => item.path === "/api/admin/createProgram")!.body.toString("utf8")).toContain('"name":"U11 Development"');
  });

  test("category and curriculum dialogs match the term dialog header", async ({ page }) => {
    await page.goto("/coaching-management");

    await page.getByTitle("Add Category").click();
    await expect(page.getByRole("heading", { name: "New Category" })).toBeVisible();
    await expect(page.locator(".coachmax-form-header")).toHaveCSS("background-color", "rgb(3, 21, 73)");
    const categoryDialogShell = page.locator(".coachmax-form-header").locator("xpath=../..");
    await expect(categoryDialogShell).toHaveCSS("border-top-left-radius", "8px");
    await expect(categoryDialogShell).toHaveCSS("border-bottom-left-radius", "8px");
    await expect(categoryDialogShell).toHaveCSS("overflow-x", "hidden");
    await expect(page.getByRole("button", { name: "Close category form" })).toBeVisible();
    await page.getByRole("button", { name: "Close category form" }).click();

    await expect(page.getByRole("button", { name: "Add Program", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Add Program", exact: true }).click();
    await expect(page.getByRole("heading", { name: "New Curriculum Module" })).toBeVisible();
    await expect(page.locator(".coachmax-form-header")).toHaveCSS("background-color", "rgb(3, 21, 73)");
    const programDialogShell = page.locator(".coachmax-form-header").locator("xpath=../..");
    await expect(programDialogShell).toHaveCSS("border-top-left-radius", "8px");
    await expect(programDialogShell).toHaveCSS("border-bottom-left-radius", "8px");
    await expect(programDialogShell).toHaveCSS("overflow-x", "hidden");
    await expect(page.getByRole("button", { name: "Close program form" })).toBeVisible();
  });

  test("class creation validates and submits the selected term and year context", async ({ page }) => {
    await page.goto("/classes");
    await page.getByRole("button", { name: /Add Class/ }).click();
    await page.getByRole("button", { name: "Create Class", exact: true }).click();
    await expect(page.locator("#class-name-error")).toHaveText("Class name is required.");
    await page.locator('#create-class-form input[name="name"]').fill("U11 Thursday Skills");
    await page.locator('#create-class-form select[name="category"]').selectOption(academyCategory._id);
    await page.locator('#create-class-form select[name="program"]').selectOption(program._id);
    await page.locator('#create-class-form select[name="coach"]').selectOption(coach._id);
    await page.locator('#create-class-form select[name="term"]').selectOption(term._id);
    await page.locator('#create-class-form input[name="location"]').fill("Main Ground");
    await page.getByPlaceholder("Select start time").fill("09:00 AM");
    await page.getByPlaceholder("Select end time").fill("10:00 AM");
    await page.getByPlaceholder("Select end time").press("Tab");
    await page.getByRole("button", { name: "Create Class", exact: true }).click();
    await expect.poll(() => state.submissions.filter((item) => item.path === "/api/admin/createClass" && item.method === "POST").length).toBe(1);
    const classRequest = state.submissions.find((item) => item.path === "/api/admin/createClass" && item.method === "POST")!;
    expect(JSON.parse(classRequest.body.toString("utf8"))).toMatchObject({ name: "U11 Thursday Skills", term: term._id, year: 2026, category: academyCategory._id, program: program._id, coach: coach._id });
  });

  test("verification requests retain newest-first order across app and admin sources", async ({ page }) => {
    await page.goto("/new-registration-request");
    const rows = page.locator("tbody tr");
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0)).toContainText("Zara Temporary");
    await expect(rows.nth(1)).toContainText("Alex App Registration");
  });
});
