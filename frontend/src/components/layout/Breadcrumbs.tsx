import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

export const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  if (pathnames.length === 0 || pathnames[0] === 'login' || pathnames[0] === 'signup') {
    return null;
  }

  const formatSegment = (segment: string) => {
    return segment
      .replace(/-/g, ' ')
      .replace(/^./, (str) => str.toUpperCase());
  };

  return (
    <nav className="flex items-center space-x-1 text-xs text-base-content/60 mb-4" aria-label="Breadcrumb">
      <Link to="/dashboard" className="flex items-center hover:text-primary transition-colors">
        <Home className="w-3.5 h-3.5 mr-1" />
        <span>Home</span>
      </Link>
      {pathnames.map((name, index) => {
        const routeTo = `/${pathnames.slice(0, index + 1).join('/')}`;
        const isLast = index === pathnames.length - 1;

        return (
          <React.Fragment key={name}>
            <ChevronRight className="w-3.5 h-3.5 opacity-50" />
            {isLast ? (
              <span className="font-semibold text-base-content">{formatSegment(name)}</span>
            ) : (
              <Link to={routeTo} className="hover:text-primary transition-colors">
                {formatSegment(name)}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
