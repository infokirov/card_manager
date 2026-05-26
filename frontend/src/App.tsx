import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { AuthPage } from "@/pages/AuthPage";
import { EmployeesPage } from "@/pages/EmployeesPage";
import { AccessCardsPage } from "@/pages/AccessCardsPage";
import {
  DepartmentsPage,
  PositionsPage,
  AccessResourcesPage,
  InternetResourcesPage,
  SoftwarePage,
  AbsAccessPage,
} from "@/pages/directory/DirectoryRoutes";
import { UsersPage } from "@/pages/admin/UsersPage";
import { NotificationsPage } from "@/pages/admin/NotificationsPage";
import { DbConnectionPage } from "@/pages/admin/DbConnectionPage";

function AdminOnly({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<EmployeesPage />} />
            <Route path="access-cards" element={<AccessCardsPage />} />
            <Route path="directories/departments" element={<DepartmentsPage />} />
            <Route path="directories/positions" element={<PositionsPage />} />
            <Route path="directories/access-resources" element={<AccessResourcesPage />} />
            <Route path="directories/internet-resources" element={<InternetResourcesPage />} />
            <Route path="directories/software" element={<SoftwarePage />} />
            <Route path="directories/abs-access" element={<AbsAccessPage />} />
            <Route
              path="admin/users"
              element={
                <AdminOnly>
                  <UsersPage />
                </AdminOnly>
              }
            />
            <Route path="admin/notifications" element={<NotificationsPage />} />
            <Route path="admin/db-connection" element={<DbConnectionPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </AuthProvider>
  );
}
