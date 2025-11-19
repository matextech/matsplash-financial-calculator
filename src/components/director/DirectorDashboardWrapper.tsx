import DirectorDashboard from './DirectorDashboard';

/**
 * Wrapper component that removes the header and logout button from DirectorDashboard
 * since it will be used within the Layout component
 */
export default function DirectorDashboardWrapper() {
  return <DirectorDashboard hideHeader={true} />;
}

