export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Local auth - redirect to our login page instead of Manus OAuth
export const getLoginUrl = (returnPath?: string) => {
  const path = returnPath || window.location.pathname;
  return `/login?redirect=${encodeURIComponent(path)}`;
};
