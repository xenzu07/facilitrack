import { NavLink, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './auth';

export default function Layout() {
  const { user, logout } = useAuth();
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div>
      <header className="topbar">
        <div className="brand">
          FACILITRACK <span>CvSU Imus · General Services</span>
        </div>
        <nav>
          <NavLink to="/reports">Reports</NavLink>
          <NavLink to="/job-orders">Job orders</NavLink>
        </nav>
        <div className="user">
          {user.fullName}
          <button className="btn btn-ghost" onClick={logout}>
            Sign out
          </button>
        </div>
      </header>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}