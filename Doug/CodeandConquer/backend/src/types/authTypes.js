/**
 * TypeScript/JavaScript Type Definitions for Supabase Auth Tables
 * 
 * These types can be used for type checking and IDE autocomplete
 * when working with Supabase auth tables.
 */

/**
 * @typedef {Object} AuthUser
 * @property {string} id - User UUID
 * @property {string|null} instance_id - Instance UUID
 * @property {string|null} aud - Audience
 * @property {string|null} role - User role
 * @property {string|null} email - User email
 * @property {string|null} encrypted_password - Encrypted password
 * @property {string|null} email_confirmed_at - Email confirmation timestamp
 * @property {string|null} invited_at - Invitation timestamp
 * @property {string|null} confirmation_token - Confirmation token
 * @property {string|null} confirmation_sent_at - Confirmation sent timestamp
 * @property {string|null} recovery_token - Recovery token
 * @property {string|null} recovery_sent_at - Recovery sent timestamp
 * @property {string|null} email_change_token_new - New email change token
 * @property {string|null} email_change - Email change value
 * @property {string|null} email_change_sent_at - Email change sent timestamp
 * @property {string|null} last_sign_in_at - Last sign in timestamp
 * @property {Object|null} raw_app_meta_data - Raw app metadata
 * @property {Object|null} raw_user_meta_data - Raw user metadata
 * @property {boolean|null} is_super_admin - Is super admin flag
 * @property {string|null} created_at - Creation timestamp
 * @property {string|null} updated_at - Update timestamp
 * @property {string|null} phone - Phone number
 * @property {string|null} phone_confirmed_at - Phone confirmation timestamp
 * @property {string|null} phone_change - Phone change value
 * @property {string|null} phone_change_token - Phone change token
 * @property {string|null} phone_change_sent_at - Phone change sent timestamp
 * @property {string|null} confirmed_at - Confirmation timestamp
 * @property {string|null} email_change_token_current - Current email change token
 * @property {number|null} email_change_confirm_status - Email change confirm status (0-2)
 * @property {string|null} banned_until - Ban expiration timestamp
 * @property {string|null} reauthentication_token - Reauthentication token
 * @property {string|null} reauthentication_sent_at - Reauthentication sent timestamp
 * @property {boolean} is_sso_user - Is SSO user flag
 * @property {string|null} deleted_at - Deletion timestamp
 * @property {boolean} is_anonymous - Is anonymous flag
 */

/**
 * @typedef {Object} AuthSession
 * @property {string} id - Session UUID
 * @property {string} user_id - User UUID
 * @property {string|null} created_at - Creation timestamp
 * @property {string|null} updated_at - Update timestamp
 * @property {string|null} factor_id - MFA factor UUID
 * @property {string|null} aal - Authentication assurance level
 * @property {string|null} not_after - Expiration timestamp
 * @property {string|null} refreshed_at - Refresh timestamp
 * @property {string|null} user_agent - User agent string
 * @property {string|null} ip - IP address
 * @property {string|null} tag - Session tag
 * @property {string|null} oauth_client_id - OAuth client UUID
 * @property {string|null} refresh_token_hmac_key - Refresh token HMAC key
 * @property {number|null} refresh_token_counter - Refresh token counter
 */

/**
 * @typedef {Object} AuthIdentity
 * @property {string} id - Identity UUID
 * @property {string} provider_id - Provider ID
 * @property {string} user_id - User UUID
 * @property {Object} identity_data - Identity data (JSONB)
 * @property {string} provider - Provider name
 * @property {string|null} last_sign_in_at - Last sign in timestamp
 * @property {string|null} created_at - Creation timestamp
 * @property {string|null} updated_at - Update timestamp
 * @property {string|null} email - Email from identity data
 */

/**
 * @typedef {Object} RefreshToken
 * @property {number} id - Token ID
 * @property {string|null} instance_id - Instance UUID
 * @property {string|null} token - Token string
 * @property {string|null} user_id - User ID
 * @property {boolean|null} revoked - Revoked flag
 * @property {string|null} created_at - Creation timestamp
 * @property {string|null} updated_at - Update timestamp
 * @property {string|null} parent - Parent token
 * @property {string|null} session_id - Session UUID
 */

/**
 * @typedef {Object} OAuthClient
 * @property {string} id - Client UUID
 * @property {string|null} client_secret_hash - Client secret hash
 * @property {string} registration_type - Registration type
 * @property {string} redirect_uris - Redirect URIs
 * @property {string} grant_types - Grant types
 * @property {string|null} client_name - Client name
 * @property {string|null} client_uri - Client URI
 * @property {string|null} logo_uri - Logo URI
 * @property {string} created_at - Creation timestamp
 * @property {string} updated_at - Update timestamp
 * @property {string|null} deleted_at - Deletion timestamp
 * @property {string} client_type - Client type
 */

/**
 * @typedef {Object} OAuthAuthorization
 * @property {string} id - Authorization UUID
 * @property {string} authorization_id - Authorization ID
 * @property {string} client_id - Client UUID
 * @property {string|null} user_id - User UUID
 * @property {string} redirect_uri - Redirect URI
 * @property {string} scope - Scope
 * @property {string|null} state - State
 * @property {string|null} resource - Resource
 * @property {string|null} code_challenge - Code challenge
 * @property {string|null} code_challenge_method - Code challenge method
 * @property {string} response_type - Response type
 * @property {string} status - Status
 * @property {string|null} authorization_code - Authorization code
 * @property {string} created_at - Creation timestamp
 * @property {string} expires_at - Expiration timestamp
 * @property {string|null} approved_at - Approval timestamp
 */

/**
 * @typedef {Object} MFAFactor
 * @property {string} id - Factor UUID
 * @property {string} user_id - User UUID
 * @property {string|null} friendly_name - Friendly name
 * @property {string} factor_type - Factor type
 * @property {string} status - Status
 * @property {string} created_at - Creation timestamp
 * @property {string} updated_at - Update timestamp
 * @property {string|null} secret - Secret
 * @property {string|null} phone - Phone number
 * @property {string|null} last_challenged_at - Last challenged timestamp
 * @property {Object|null} web_authn_credential - WebAuthn credential
 * @property {string|null} web_authn_aaguid - WebAuthn AAGUID
 * @property {Object|null} last_webauthn_challenge_data - Last WebAuthn challenge data
 */

/**
 * @typedef {Object} SSOProvider
 * @property {string} id - Provider UUID
 * @property {string|null} resource_id - Resource ID
 * @property {string|null} created_at - Creation timestamp
 * @property {string|null} updated_at - Update timestamp
 * @property {boolean|null} disabled - Disabled flag
 */

/**
 * @typedef {Object} FlowState
 * @property {string} id - Flow state UUID
 * @property {string|null} user_id - User UUID
 * @property {string} auth_code - Auth code
 * @property {string} code_challenge_method - Code challenge method
 * @property {string} code_challenge - Code challenge
 * @property {string} provider_type - Provider type
 * @property {string|null} provider_access_token - Provider access token
 * @property {string|null} provider_refresh_token - Provider refresh token
 * @property {string|null} created_at - Creation timestamp
 * @property {string|null} updated_at - Update timestamp
 * @property {string} authentication_method - Authentication method
 * @property {string|null} auth_code_issued_at - Auth code issued timestamp
 */

/**
 * @typedef {Object} AuditLogEntry
 * @property {string} id - Entry UUID
 * @property {string|null} instance_id - Instance UUID
 * @property {Object|null} payload - Payload (JSON)
 * @property {string|null} created_at - Creation timestamp
 * @property {string} ip_address - IP address
 */

// Export types for use in other files
export const AuthTypes = {
  AuthUser: 'AuthUser',
  AuthSession: 'AuthSession',
  AuthIdentity: 'AuthIdentity',
  RefreshToken: 'RefreshToken',
  OAuthClient: 'OAuthClient',
  OAuthAuthorization: 'OAuthAuthorization',
  MFAFactor: 'MFAFactor',
  SSOProvider: 'SSOProvider',
  FlowState: 'FlowState',
  AuditLogEntry: 'AuditLogEntry',
};

