import { NavLink, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './auth';
import { useLiveStatus } from './socket';

export default function Layout() {
  const { user, logout } = useAuth();
  const live = useLiveStatus();
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
          <span className="live">
            <span className={`dot ${live ? 'on' : ''}`} />
            {live ? 'Live' : 'Offline'}
          </span>
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