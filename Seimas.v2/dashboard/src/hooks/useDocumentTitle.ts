import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { getRouteTitle } from '../utils/routeTitles';

export function useDocumentTitle() {
  const { pathname } = useLocation();
  useEffect(() => {
    document.title = getRouteTitle(pathname);
  }, [pathname]);
}
