import React, { useState, useEffect } from "react";
import PageMeta from "../../components/common/PageMeta";
import { Link } from "react-router";
import apiClient from "../../api/apiClient";
import { getMediaUrl, getMediaFallback } from "../../utils/media";
import { formatDateOnly } from "../../utils/dateTime";

interface DashboardData {
  coach: {
    coachId: string;
    name: string;
    email: string;
    mobile: string;
    profileImage: string | null;
    role: string;
  };
  stats: {
    totalAssignedClasses: number;
    totalAssignedTeams: number;
    totalUniquePlayers: number;
    todaysClassesCount: number;
    thisWeekSessionsCount: number;
    pendingAttendanceTodayCount: number;
    totalNotesCreated: number;
    totalTemporaryPlayers: number;
    unreadNotificationsCount: number;
  };
  todaysClasses: any[];
  upcomingSessions: any[];
  recentNotes: any[];
  recentNotifications: any[];
  assignedClassesSummary: any[];
}

const CoachDashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await apiClient.get("/api/coach/dashboard");
        if (response.data && response.data.success) {
          setData(response.data.data);
        }
      } catch (error) {
        console.error("Failed to fetch coach dashboard:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0047FF]"></div>
      </div>
    );
  }

  const user = data?.coach || { coachId: "", name: "Coach", email: "", mobile: "", profileImage: null, role: "COACH" };
  const stats = data?.stats;
  return (
    <div className="max-w-[1600px] mx-auto p-4 sm:p-6 bg-[#F4F7FE] min-h-screen font-sans">
      <PageMeta title="Coach Dashboard | CoachMax" description="Coach analytics and class management" />

      {/* Top Section: Profile & Stats */}
      <div className="bg-white border border-gray-200 rounded-none mb-6 flex flex-col lg:flex-row shadow-sm">
        
        {/* Profile Card (Left) */}
        <div className="lg:w-[30%] p-6 sm:p-8 border-b lg:border-b-0 lg:border-r border-gray-200 flex flex-col items-center lg:items-start text-center lg:text-left">
          <div className="w-24 h-24 rounded-full bg-gray-200 overflow-hidden mb-4 border-2 border-gray-100 flex-shrink-0 mx-auto lg:mx-0">
            <img src={getMediaUrl(user.profileImage, getMediaFallback(user.name))} alt={user.name} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = getMediaFallback(user.name); }} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">{user.name}</h2>
          <p className="text-sm text-gray-500 mb-2">{user.email}</p>
          <p className="text-sm text-gray-500 mb-4">{data?.coach?.mobile}</p>
          <span className="inline-block px-3 py-1 bg-blue-50 text-blue-600 text-xs font-bold rounded-none uppercase tracking-wide">
            {data?.coach?.role || 'COACH'}
          </span>
        </div>

        {/* Stats Grid (Right) */}
        <div className="lg:w-[70%] p-6 sm:p-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-6 sm:gap-y-8 gap-x-4">
            
            {/* Stat Item 1 */}
            <div className="flex gap-4">
              <div className="mt-1 text-blue-500">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">{stats?.totalAssignedClasses || 0}</h3>
                <p className="text-xs text-gray-500 leading-snug">Total Assigned<br/>Classes</p>
              </div>
            </div>

            {/* Stat Item 2 */}
            <div className="flex gap-4">
              <div className="mt-1 text-blue-500">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">{stats?.totalAssignedTeams || 0}</h3>
                <p className="text-xs text-gray-500 leading-snug">Total Assigned<br/>Teams</p>
              </div>
            </div>

            {/* Stat Item 3 */}
            <div className="flex gap-4">
              <div className="mt-1 text-blue-500">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">{stats?.totalUniquePlayers || 0}</h3>
                <p className="text-xs text-gray-500 leading-snug">Total Unique<br/>Players</p>
              </div>
            </div>

            {/* Stat Item 4 */}
            <div className="flex gap-4">
              <div className="mt-1 text-blue-500">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">{stats?.todaysClassesCount || 0}</h3>
                <p className="text-xs text-gray-500 leading-snug">Today's Classes<br/>Count</p>
              </div>
            </div>

            {/* Stat Item 5 */}
            <div className="flex gap-4">
              <div className="mt-1 text-blue-500">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">{stats?.thisWeekSessionsCount || 0}</h3>
                <p className="text-xs text-gray-500 leading-snug">This Week<br/>Sessions</p>
              </div>
            </div>

            {/* Empty Stat Space for alignment */}
            <div className="hidden md:block"></div>

            {/* Stat Item 6 */}
            <div className="flex gap-4">
              <div className="mt-1 text-blue-500">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">{stats?.pendingAttendanceTodayCount || 0}</h3>
                <p className="text-xs text-gray-500 leading-snug">Pending Attendance<br/>Today</p>
              </div>
            </div>

            {/* Stat Item 7 */}
            <div className="flex gap-4">
              <div className="mt-1 text-blue-500">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">{stats?.totalNotesCreated || 0}</h3>
                <p className="text-xs text-gray-500 leading-snug">Total Notes<br/>Created</p>
              </div>
            </div>

            {/* Stat Item 8 */}
            <div className="flex gap-4">
              <div className="mt-1 text-blue-500">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">{stats?.totalTemporaryPlayers || 0}</h3>
                <p className="text-xs text-gray-500 leading-snug">Total Temporary<br/>Players</p>
              </div>
            </div>

            {/* Stat Item 9 */}
            <div className="flex gap-4">
              <div className="mt-1 text-blue-500">
                <div className="relative">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">{stats?.unreadNotificationsCount || 0}</h3>
                <p className="text-xs text-gray-500 leading-snug">Unread<br/>Notifications</p>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Bottom Section: Two Columns */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* Today's Classes (Left Column) */}
        <div className="xl:col-span-5 bg-white border border-gray-200 rounded-none shadow-sm flex flex-col">
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <h3 className="text-lg font-bold text-gray-900">Today's Classes</h3>
            <Link to="/schedule" className="text-sm font-semibold text-blue-600 hover:underline">View all</Link>
          </div>
          <div className="flex-1 p-5 overflow-y-auto max-h-[600px] custom-scrollbar">
            {data?.todaysClasses?.length === 0 ? (
              <p className="text-sm text-gray-500 italic py-8 text-center">No classes scheduled for today.</p>
            ) : (
              <div className="space-y-6">
                {data?.todaysClasses?.map((cls, idx) => {
                  return (
                    <div key={idx} className="flex gap-6">
                      {/* Left: Time and Blue Line */}
                      <div className="w-24 flex-shrink-0 flex gap-4">
                        <div className="w-1 bg-blue-600 rounded-none h-full"></div>
                        <div className="flex flex-col text-sm font-bold text-gray-900 pt-1">
                          <span>{cls.startTime}</span>
                          <span className="text-gray-400 font-normal my-0.5">-</span>
                          <span>{cls.endTime}</span>
                        </div>
                      </div>
                      
                      {/* Right: Class Details */}
                      <div className="flex-1 pb-4 border-b border-gray-100 last:border-b-0">
                        <h4 className="text-sm font-bold text-gray-900 mb-3">{cls.className}</h4>
                        
                        <div className="grid grid-cols-1 gap-2 mb-3">
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                             <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                             Program: {cls.program?.name}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                             <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                             Category: {cls.category?.name}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                             <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                             Venue: {cls.venue}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                             <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                             Total Players: {cls.totalPlayers}
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4">
                          {cls.isAttendanceMarked ? (
                            <span className="inline-block px-3 py-1 bg-green-50 text-green-700 text-[11px] font-bold rounded-none w-max">
                              Attendance Marked
                            </span>
                          ) : (
                            <Link to="/attendance" className="inline-block px-3 py-1 bg-blue-600 text-white text-[11px] font-bold rounded-none w-max">
                              Log Attendance
                            </Link>
                          )}
                          <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            {formatDateOnly(cls.sessionDate, { day: 'numeric', month: 'short', year: 'numeric' })}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Sessions (Right Column) */}
        <div className="xl:col-span-7 bg-white border border-gray-200 rounded-none shadow-sm flex flex-col">
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <h3 className="text-lg font-bold text-gray-900">Upcoming Sessions</h3>
            <Link to="/schedule" className="text-sm font-semibold text-blue-600 hover:underline">View all</Link>
          </div>
          <div className="flex-1 p-0 overflow-y-auto max-h-[600px] custom-scrollbar">
            {data?.upcomingSessions?.length === 0 ? (
              <p className="text-sm text-gray-500 italic py-8 text-center">No upcoming sessions.</p>
            ) : (
              <div className="flex flex-col">
                {data?.upcomingSessions?.map((cls, idx) => {
                  return (
                    <div key={idx} className="flex flex-col sm:flex-row sm:items-center p-5 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors gap-4 sm:gap-6">
                      
                      {/* Date & Day */}
                      <div className="w-16 flex-shrink-0 flex flex-col text-sm">
                        <span className="font-bold text-blue-600 uppercase tracking-wider">{formatDateOnly(cls.sessionDate, { weekday: 'short' })}</span>
                        <span className="font-bold text-gray-900 mt-0.5">{formatDateOnly(cls.sessionDate, { day: 'numeric', month: 'short' }).toUpperCase()}</span>
                      </div>

                      {/* Title & Time */}
                      <div className="flex-1 sm:w-1/3">
                        <h4 className="text-sm font-bold text-gray-900 mb-1">{cls.className}</h4>
                        <p className="text-xs text-gray-500 font-medium">{cls.startTime} – {cls.endTime}</p>
                      </div>

                      {/* Program & Category */}
                      <div className="flex-1 sm:w-1/4 flex flex-col justify-center">
                         <span className="text-sm text-gray-800">{cls.programName}</span>
                         <span className="text-xs text-gray-500 mt-1">{cls.categoryName}</span>
                      </div>

                      {/* Status Badge */}
                      <div className="flex-shrink-0 sm:w-32 sm:text-right flex items-center justify-start sm:justify-end">
                        {cls.isAttendanceMarked ? (
                          <span className="inline-block px-3 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-none border border-green-100">
                            Attendance Marked
                          </span>
                        ) : (
                          <span className="inline-block px-3 py-1 bg-red-50 text-red-600 text-xs font-bold rounded-none border border-red-100">
                            Not Marked
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="p-4 border-t border-gray-100 text-center">
            <Link to="/schedule" className="text-sm font-bold text-blue-600 hover:underline">View all sessions</Link>
          </div>
        </div>
        
      </div>
    </div>
  );
};

export default CoachDashboard;
