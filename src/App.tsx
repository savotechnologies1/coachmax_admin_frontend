import { lazy } from "react";
import PageLoadBoundary from "./components/common/PageLoadBoundary";
import { BrowserRouter as Router, Routes, Route, useParams } from "react-router";
import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import { Toaster } from "react-hot-toast";

const SignIn = lazy(() => import("./pages/AuthPages/SignIn"));
const SignUp = lazy(() => import("./pages/AuthPages/SignUp"));
const ForgotPassword = lazy(() => import("./pages/AuthPages/ForgotPassword"));
const NotFound = lazy(() => import("./pages/OtherPage/NotFound"));
const UserProfiles = lazy(() => import("./pages/UserProfiles"));
const Videos = lazy(() => import("./pages/UiElements/Videos"));
const Images = lazy(() => import("./pages/UiElements/Images"));
const Alerts = lazy(() => import("./pages/UiElements/Alerts"));
const Badges = lazy(() => import("./pages/UiElements/Badges"));
const Avatars = lazy(() => import("./pages/UiElements/Avatars"));
const Buttons = lazy(() => import("./pages/UiElements/Buttons"));
const LineChart = lazy(() => import("./pages/Charts/LineChart"));
const BarChart = lazy(() => import("./pages/Charts/BarChart"));
const Calendar = lazy(() => import("./pages/Calendar"));
const BasicTables = lazy(() => import("./pages/Tables/BasicTables"));
const FormElements = lazy(() => import("./pages/Forms/FormElements"));
const Blank = lazy(() => import("./pages/Blank"));
const PlayersManagement = lazy(() => import("./pages/PlayersManagement/PlayersManagement"));
const RegistrationRequests = lazy(() => import("./pages/PlayersManagement/RegistrationRequests"));
const PlayerProfilePage = lazy(() => import("./pages/PlayersManagement/PlayerProfilePage"));
const Academy = lazy(() => import("./pages/Academy/Academy"));
const ProgramsManagement = lazy(() => import("./pages/Programs/ProgramsManagement"));
const Programs2 = lazy(() => import("./pages/Programs/Programs2"));
const CloneTermPage = lazy(() => import("./pages/Classes/CloneTermPage"));
const ProductList = lazy(() => import("./pages/Store/ProductList"));
const ProductDetails = lazy(() => import("./pages/Store/ProductDetails"));
const OrdersList = lazy(() => import("./pages/Store/OrdersList"));
const OrderDetails = lazy(() => import("./pages/Store/OrderDetails"));
const CoachingManagementPage = lazy(() => import("./pages/CoachingManagement/CoachingManagementPage"));
const CoachesPage = lazy(() => import("./pages/Coaches/CoachesPage"));
const CoachDetailPage = lazy(() => import("./pages/Coaches/CoachDetailPage"));
const AddTempPlayers = lazy(() => import("./pages/CoachManagement/AddTempPlayers"));
const MyClassesList = lazy(() => import("./pages/CoachManagement/MyClassesList"));
const TemporaryPlayersList = lazy(() => import("./pages/CoachManagement/TemporaryPlayersList"));
const CoachNotesPage = lazy(() => import("./pages/CoachManagement/CoachNotesPage"));
const RoleBasedDashboard = lazy(() => import("./components/auth/RoleBasedDashboard"));
const AddEvent = lazy(() => import("./pages/Events/AddEvent"));
const EventList = lazy(() => import("./pages/Events/EventList"));
const ContentListPage = lazy(() => import("./pages/Content/ContentListPage"));
const AddContentPage = lazy(() => import("./pages/Content/AddContentPage"));
const NewsDetails = lazy(() => import("./pages/Content/NewsDetails"));
const GalleryGrid = lazy(() => import("./pages/Gallery/GalleryGrid"));
const AddGalleryPage = lazy(() => import("./pages/Gallery/AddGalleryPage"));
const SponsorManagementPage = lazy(() => import("./pages/Sponsors/SponsorManagementPage"));
const EditEvent = lazy(() => import("./pages/Events/EditEvent"));
const EventDetails = lazy(() => import("./pages/Events/EventDetails"));
const BankDetails = lazy(() => import("./pages/Finance/BankDetails"));
const InvoiceList = lazy(() => import("./pages/Finance/InvoiceList"));
const InvoiceDetails = lazy(() => import("./pages/Finance/InvoiceDetails"));
const Transactions = lazy(() => import("./pages/Finance/Transactions"));
const TermEarningsPage = lazy(() => import("./pages/Finance/TermEarningsPage"));
const NotificationsPage = lazy(() => import("./pages/Notifications/NotificationsPage"));
const CommunicationPage = lazy(() => import("./pages/Communication"));
const TeamsManagementPage = lazy(() => import("./pages/Teams/TeamsManagementPage"));
const TeamDetailsPage = lazy(() => import("./pages/Teams/TeamDetailsPage"));
const LeaguesManagementPage = lazy(() => import("./pages/Teams/LeaguesManagementPage"));
const LeagueDetails = lazy(() => import("./modules/leagues/pages/LeagueDetails"));
const FixturesManagementPage = lazy(() => import("./pages/Teams/FixturesManagementPage"));
const AuditLogsPage = lazy(() => import("./pages/AuditLogs/AuditLogsPage"));
const UserManual = lazy(() => import("./pages/Docs/UserManual"));
const AddProductPage = lazy(() => import("./pages/Store/AddProductPage"));
const EditProductPage = lazy(() => import("./pages/Store/AddProductPage").then((module) => ({ default: module.EditProductPage })));

function DynamicProgramRoute() {
  const { programType } = useParams<{ programType: string }>();
  const formattedType = programType
    ? programType
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
    : 'Academy';
  return <Academy programType={formattedType} />;
}

export default function App() {
  return (
    <>
      <Toaster
        position="top-right"
        containerStyle={{
          zIndex: 999999,
        }}
        toastOptions={{
          style: {
            background: '#333',
            color: '#fff',
            borderRadius: '0px',
            padding: '16px',
            fontWeight: '500',
            fontSize: '14px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          },
          success: {
            iconTheme: {
              primary: '#10B981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#EF4444',
              secondary: '#fff',
            },
          },
        }}
      />
      <Router>
        <ScrollToTop />
        <Routes>
          {/* Dashboard Layout */}
          <Route element={<AppLayout />}>
            <Route element={<PageLoadBoundary />}>
            <Route index path="/" element={<RoleBasedDashboard />} />
            <Route path="/new-registration-request" element={<RegistrationRequests />} />
            <Route path="/players" element={<PlayersManagement />} />
            <Route path="/player/:playerId" element={<PlayerProfilePage />} />
            <Route path="/programs" element={<ProgramsManagement />} />
            <Route path="/programs-2" element={<Programs2 />} />
            <Route path="/classes" element={<Programs2 />} />
            <Route path="/clone-term" element={<CloneTermPage />} />
            <Route path="/program/:programType" element={<DynamicProgramRoute />} />

            {/* Store */}
            <Route path="/products" element={<ProductList />} />
            <Route path="/products/:id" element={<ProductDetails />} />
            <Route path="/add-product" element={<AddProductPage />} />
            <Route path="/edit-product/:id" element={<EditProductPage />} />
            <Route path="/orders" element={<OrdersList />} />
            <Route path="/orders/:id" element={<OrderDetails />} />

            {/* Management */}
            <Route path="/coaching-management" element={<CoachingManagementPage />} />
            <Route path="/coaches" element={<CoachesPage />} />
            <Route path="/coaches/:coachId" element={<CoachDetailPage />} />
            <Route path="/add-temporary-players" element={<AddTempPlayers />} />
            <Route path="/leagues" element={<LeaguesManagementPage />} />
            <Route path="/leagues/:leagueId" element={<LeagueDetails />} />
            <Route path="/admin/leagues/:leagueId" element={<LeagueDetails />} />
            <Route path="/teams" element={<TeamsManagementPage />} />
            <Route path="/teams/:teamId" element={<TeamDetailsPage />} />
            <Route path="/fixtures" element={<FixturesManagementPage />} />
            <Route path="/events" element={<EventList />} />
            <Route path="/add-event" element={<AddEvent />} />
            <Route path="/edit-event/:id" element={<EditEvent />} />
            <Route path="/event-details/:id" element={<EventDetails />} />
            <Route path="/news" element={<ContentListPage type="news" />} />
            <Route path="/news/:id" element={<NewsDetails />} />
            <Route path="/add-content" element={<AddContentPage />} />
            <Route path="/gallery" element={<GalleryGrid />} />
            <Route path="/add-gallery" element={<AddGalleryPage />} />
            <Route path="/sponsors" element={<SponsorManagementPage />} />

            {/* Finance */}
            <Route path="/bank-details" element={<BankDetails />} />
            <Route path="/invoices" element={<InvoiceList />} />
            <Route path="/invoices/:id" element={<InvoiceDetails />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/term-earnings" element={<TermEarningsPage />} />
            <Route path="/finance-report" element={<TermEarningsPage />} />

            {/* Audit & Manual */}
            <Route path="/audit-logs" element={<AuditLogsPage />} />
            <Route path="/user-manual" element={<UserManual />} />

            {/* Notifications */}
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/schedule" element={<MyClassesList />} />
            <Route path="/my-players" element={<PlayersManagement />} />
            <Route path="/temporary-players-list" element={<TemporaryPlayersList />} />
            <Route path="/coach-notes" element={<CoachNotesPage />} />

            {/* Communication & Messages */}
            <Route path="/communication" element={<CommunicationPage />} />
            <Route path="/messages" element={<CommunicationPage />} />
            <Route path="/announcements" element={<CommunicationPage />} />

            {/* Others Page */}
            <Route path="/profile" element={<UserProfiles />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/blank" element={<Blank />} />

            {/* Forms */}
            <Route path="/form-elements" element={<FormElements />} />

            {/* Tables */}
            <Route path="/basic-tables" element={<BasicTables />} />

            {/* Ui Elements */}
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/avatars" element={<Avatars />} />
            <Route path="/badge" element={<Badges />} />
            <Route path="/buttons" element={<Buttons />} />
            <Route path="/images" element={<Images />} />
            <Route path="/videos" element={<Videos />} />

            {/* Charts */}
            <Route path="/line-chart" element={<LineChart />} />
            <Route path="/bar-chart" element={<BarChart />} />
            </Route>
          </Route>

          <Route element={<PageLoadBoundary />}>
          {/* Auth Layout */}
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Fallback Route */}
          <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Router>
    </>
  );
}
