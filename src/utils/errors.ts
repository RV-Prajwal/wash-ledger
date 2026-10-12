/**
 * User-friendly error handling and translation utility for CEAT Wash Ledger.
 * Ensures that technical Firebase codes, network exceptions, and hardware errors
 * are never shown directly to users. Only clean, actionable guidance is presented.
 */

export const getUserFriendlyError = (
  error: unknown, 
  fallback: string = 'An unexpected error occurred. Please try again.'
): string => {
  if (!error) return fallback;

  let code = '';
  let name = '';
  let rawMsg = '';

  if (typeof error === 'object' && error !== null) {
    const err = error as Record<string, any>;
    code = (err.code || '').toLowerCase();
    name = (err.name || '').toLowerCase();
    rawMsg = (err.message || '').trim();
  } else if (typeof error === 'string') {
    rawMsg = error.trim();
  }

  const lowerMsg = rawMsg.toLowerCase();

  // 1. Firebase Authentication Errors
  if (
    code === 'auth/invalid-credential' || 
    code === 'auth/user-not-found' || 
    code === 'auth/wrong-password' ||
    lowerMsg.includes('auth/invalid-credential') ||
    lowerMsg.includes('auth/user-not-found') ||
    lowerMsg.includes('auth/wrong-password')
  ) {
    return 'Invalid email or password. Please verify your credentials.';
  }

  if (
    code === 'auth/email-already-in-use' || 
    lowerMsg.includes('auth/email-already-in-use') ||
    lowerMsg.includes('email already in use')
  ) {
    return 'An account with this email address already exists.';
  }

  if (
    code === 'auth/weak-password' || 
    lowerMsg.includes('auth/weak-password') ||
    (lowerMsg.includes('password') && lowerMsg.includes('6 characters'))
  ) {
    return 'Password is too weak. Please use at least 6 characters.';
  }

  if (
    code === 'auth/invalid-email' || 
    lowerMsg.includes('auth/invalid-email') ||
    lowerMsg.includes('invalid email')
  ) {
    return 'Please enter a valid email address.';
  }

  if (
    code === 'auth/user-disabled' || 
    lowerMsg.includes('auth/user-disabled') ||
    lowerMsg.includes('account has been disabled')
  ) {
    return 'This attendant account has been deactivated. Please contact your center administrator.';
  }

  if (
    code === 'auth/too-many-requests' || 
    lowerMsg.includes('auth/too-many-requests') ||
    lowerMsg.includes('too many requests')
  ) {
    return 'Too many unsuccessful attempts. For security, please wait a minute and try again.';
  }

  if (
    code === 'auth/network-request-failed' || 
    lowerMsg.includes('auth/network-request-failed')
  ) {
    return 'Network connection lost. Please check your mobile internet or Wi-Fi.';
  }

  if (code === 'auth/popup-closed-by-user' || lowerMsg.includes('popup-closed-by-user')) {
    return 'Sign-in window was closed before completion.';
  }

  if (code === 'auth/requires-recent-login' || lowerMsg.includes('requires-recent-login')) {
    return 'For security, please sign in again to perform this sensitive action.';
  }

  if (code === 'auth/operation-not-allowed' || lowerMsg.includes('operation-not-allowed')) {
    return 'This sign-in method is currently not enabled. Please contact support.';
  }

  // 2. Firestore Database Errors
  if (code === 'permission-denied' || lowerMsg.includes('permission-denied')) {
    return 'You do not have permission to view or modify this record.';
  }

  if (code === 'unavailable' || lowerMsg.includes('unavailable') || lowerMsg.includes('service unavailable')) {
    return 'Service is temporarily unreachable. Changes will sync automatically when reconnected.';
  }

  if (code === 'not-found' || lowerMsg.includes('not-found') || lowerMsg.includes('document not found')) {
    return 'The requested record could not be found.';
  }

  if (code === 'already-exists' || lowerMsg.includes('already-exists')) {
    return 'A record with this information already exists.';
  }

  if (code === 'resource-exhausted' || lowerMsg.includes('resource-exhausted') || lowerMsg.includes('quota exceeded')) {
    return 'Service usage limit reached. Please wait a moment and try again.';
  }

  if (code === 'deadline-exceeded' || lowerMsg.includes('deadline-exceeded') || lowerMsg.includes('timeout')) {
    return 'The operation timed out. Please check your internet connection and try again.';
  }

  if (code === 'unauthenticated' || lowerMsg.includes('unauthenticated')) {
    return 'Your session has expired. Please sign in again to continue.';
  }

  // 3. Camera / Hardware Device Errors
  if (
    name === 'notallowederror' ||
    name === 'permissiondeniederror' ||
    rawMsg.includes('NotAllowedError') || 
    rawMsg.includes('PermissionDeniedError') || 
    lowerMsg.includes('permission denied') ||
    lowerMsg.includes('permission dismissed')
  ) {
    return 'Camera access was blocked. Please tap the lock icon in your browser address bar to allow camera access, or type the license plate manually.';
  }

  if (
    name === 'notfounderror' ||
    name === 'devicesnotfounderror' ||
    rawMsg.includes('NotFoundError') || 
    rawMsg.includes('DevicesNotFoundError') || 
    lowerMsg.includes('no camera') ||
    lowerMsg.includes('requested device not found')
  ) {
    return 'No camera was detected on this device. You can type the license plate manually.';
  }

  if (
    name === 'notreadableerror' ||
    name === 'trackstarterror' ||
    rawMsg.includes('NotReadableError') || 
    rawMsg.includes('TrackStartError') ||
    lowerMsg.includes('could not start video') ||
    lowerMsg.includes('in use by another application')
  ) {
    return 'The camera is currently in use by another application or tab. Please close other camera apps and refresh.';
  }

  if (
    name === 'overconstrainederror' ||
    rawMsg.includes('OverconstrainedError') ||
    lowerMsg.includes('constraint')
  ) {
    return 'Requested camera settings are not supported on this device. You can type the license plate manually.';
  }

  if (
    name === 'securityerror' ||
    rawMsg.includes('SecurityError') ||
    lowerMsg.includes('insecure context')
  ) {
    return 'Camera access requires a secure HTTPS connection. Please type the license plate manually.';
  }

  if (
    name === 'aborterror' ||
    rawMsg.includes('AbortError') ||
    lowerMsg.includes('interrupted')
  ) {
    return 'Camera initialization was interrupted. Please tap retry or enter the plate manually.';
  }

  if (
    lowerMsg.includes('mediadevices') ||
    lowerMsg.includes('getusermedia is not a function') ||
    lowerMsg.includes('camera access is not supported')
  ) {
    return 'Camera scanning is not supported on this browser. You can type the license plate manually.';
  }

  // 4. Network and Fetch Exceptions
  if (
    lowerMsg.includes('failed to fetch') ||
    lowerMsg.includes('networkerror') ||
    lowerMsg.includes('net::err_') ||
    lowerMsg.includes('load failed') ||
    lowerMsg.includes('network request failed')
  ) {
    return 'Network connection issue. Please check your mobile data or Wi-Fi connection.';
  }

  // 5. Clean up Firebase Error string wrapper format: "Firebase: Error (auth/...)"
  if (rawMsg.startsWith('Firebase: Error (')) {
    const match = rawMsg.match(/Firebase: Error \((.*?)\)\.?/);
    if (match && match[1]) {
      const extractedCode = match[1].toLowerCase();
      if (extractedCode === 'auth/invalid-credential' || extractedCode === 'auth/user-not-found' || extractedCode === 'auth/wrong-password') {
        return 'Invalid email or password. Please verify your credentials.';
      }
      if (extractedCode === 'auth/email-already-in-use') {
        return 'This email address is already in use by another account.';
      }
      if (extractedCode === 'auth/weak-password') {
        return 'Password must be at least 6 characters.';
      }
      if (extractedCode === 'auth/network-request-failed') {
        return 'Network connection lost. Please check your internet connection.';
      }
      return 'Authentication failed. Please verify your details and try again.';
    }
  }

  // 6. Application Domain Validation
  if (lowerMsg.includes('no service selected')) {
    return 'Please select a wash service package.';
  }
  if (lowerMsg.includes('plate') && (lowerMsg.includes('valid') || lowerMsg.includes('characters') || lowerMsg.includes('minimum'))) {
    return 'Please enter a valid vehicle license plate (minimum 4 characters).';
  }
  if (lowerMsg.includes('model error') || lowerMsg.includes('failed to read plate')) {
    return 'Unable to clearly read the license plate. Please type it in manually.';
  }

  // 7. Sanitize raw technical errors:
  // Detect code markers, stack traces, filenames, or technical objects that must NOT be exposed to users
  const isTechnicalJargon = 
    rawMsg.includes('at ') || 
    rawMsg.includes('http://') || 
    rawMsg.includes('https://') ||
    rawMsg.includes('.js:') ||
    rawMsg.includes('.ts:') ||
    rawMsg.includes('TypeError') ||
    rawMsg.includes('ReferenceError') ||
    rawMsg.includes('SyntaxError') ||
    rawMsg.includes('Promise') ||
    rawMsg.includes('undefined') ||
    rawMsg.includes('null') ||
    rawMsg.includes('NaN') ||
    rawMsg.includes('[object') ||
    rawMsg.includes('FirebaseError') ||
    rawMsg.includes('{') ||
    rawMsg.includes('}');

  if (isTechnicalJargon) {
    return fallback;
  }

  // Clean up clean error message: strip leading "Error: "
  let cleaned = rawMsg.replace(/^Error:\s*/i, '').trim();

  // If reasonably short and readable without technical traces, display it
  if (cleaned.length > 0 && cleaned.length <= 140) {
    // Capitalize first letter
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  return fallback;
};
