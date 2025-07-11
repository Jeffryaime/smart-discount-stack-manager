/**
 * Navigation utilities that preserve shop parameter
 */

/**
 * Navigate to a path while preserving the current shop parameter
 * @param {Function} navigate - React Router navigate function
 * @param {string} path - The path to navigate to
 */
export const navigateWithShop = (navigate, path) => {
  const urlParams = new URLSearchParams(window.location.search);
  const shop = urlParams.get('shop');
  
  if (shop) {
    const separator = path.includes('?') ? '&' : '?';
    navigate(`${path}${separator}shop=${shop}`);
  } else {
    navigate(path);
  }
};

/**
 * Get current shop parameter from URL
 * @returns {string|null} The shop parameter or null if not present
 */
export const getCurrentShop = () => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('shop');
};

/**
 * Build a URL with the current shop parameter
 * @param {string} path - The base path
 * @returns {string} The path with shop parameter if available
 */
export const buildUrlWithShop = (path) => {
  const shop = getCurrentShop();
  if (shop) {
    const separator = path.includes('?') ? '&' : '?';
    return `${path}${separator}shop=${shop}`;
  }
  return path;
};