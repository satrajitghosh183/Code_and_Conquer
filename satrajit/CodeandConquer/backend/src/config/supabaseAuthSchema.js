/**
 * Supabase Auth Schema Reference
 * 
 * This file documents all Supabase auth tables available in the database.
 * These tables are managed by Supabase and can be accessed via the Supabase client.
 * 
 * IMPORTANT: These tables are in the 'auth' schema and require service role key
 * or proper RLS policies to access from the backend.
 */

/**
 * Auth Tables Structure
 * 
 * All tables are in the 'auth' schema and can be accessed via:
 * supabase.from('auth.table_name') or using the Supabase Admin API
 */

export const AUTH_TABLES = {
  // Core Authentication Tables
  USERS: 'auth.users',
  SESSIONS: 'auth.sessions',
  IDENTITIES: 'auth.identities',
  REFRESH_TOKENS: 'auth.refresh_tokens',
  
  // OAuth Tables
  OAUTH_CLIENTS: 'auth.oauth_clients',
  OAUTH_AUTHORIZATIONS: 'auth.oauth_authorizations',
  OAUTH_CONSENTS: 'auth.oauth_consents',
  
  // MFA Tables
  MFA_FACTORS: 'auth.mfa_factors',
  MFA_CHALLENGES: 'auth.mfa_challenges',
  MFA_AMR_CLAIMS: 'auth.mfa_amr_claims',
  
  // SSO Tables
  SSO_PROVIDERS: 'auth.sso_providers',
  SSO_DOMAINS: 'auth.sso_domains',
  SAML_PROVIDERS: 'auth.saml_providers',
  SAML_RELAY_STATES: 'auth.saml_relay_states',
  
  // Flow State
  FLOW_STATE: 'auth.flow_state',
  
  // One-Time Tokens
  ONE_TIME_TOKENS: 'auth.one_time_tokens',
  
  // Audit & System
  AUDIT_LOG_ENTRIES: 'auth.audit_log_entries',
  INSTANCES: 'auth.instances',
  SCHEMA_MIGRATIONS: 'auth.schema_migrations',
};

/**
 * Table Field Mappings
 * These can be used for type-safe queries and data mapping
 */

export const USERS_FIELDS = {
  id: 'id',
  instanceId: 'instance_id',
  aud: 'aud',
  role: 'role',
  email: 'email',
  encryptedPassword: 'encrypted_password',
  emailConfirmedAt: 'email_confirmed_at',
  invitedAt: 'invited_at',
  confirmationToken: 'confirmation_token',
  confirmationSentAt: 'confirmation_sent_at',
  recoveryToken: 'recovery_token',
  recoverySentAt: 'recovery_sent_at',
  emailChangeTokenNew: 'email_change_token_new',
  emailChange: 'email_change',
  emailChangeSentAt: 'email_change_sent_at',
  lastSignInAt: 'last_sign_in_at',
  rawAppMetaData: 'raw_app_meta_data',
  rawUserMetaData: 'raw_user_meta_data',
  isSuperAdmin: 'is_super_admin',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  phone: 'phone',
  phoneConfirmedAt: 'phone_confirmed_at',
  phoneChange: 'phone_change',
  phoneChangeToken: 'phone_change_token',
  phoneChangeSentAt: 'phone_change_sent_at',
  confirmedAt: 'confirmed_at',
  emailChangeTokenCurrent: 'email_change_token_current',
  emailChangeConfirmStatus: 'email_change_confirm_status',
  bannedUntil: 'banned_until',
  reauthenticationToken: 'reauthentication_token',
  reauthenticationSentAt: 'reauthentication_sent_at',
  isSsoUser: 'is_sso_user',
  deletedAt: 'deleted_at',
  isAnonymous: 'is_anonymous',
};

export const SESSIONS_FIELDS = {
  id: 'id',
  userId: 'user_id',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  factorId: 'factor_id',
  aal: 'aal',
  notAfter: 'not_after',
  refreshedAt: 'refreshed_at',
  userAgent: 'user_agent',
  ip: 'ip',
  tag: 'tag',
  oauthClientId: 'oauth_client_id',
  refreshTokenHmacKey: 'refresh_token_hmac_key',
  refreshTokenCounter: 'refresh_token_counter',
};

export const IDENTITIES_FIELDS = {
  id: 'id',
  providerId: 'provider_id',
  userId: 'user_id',
  identityData: 'identity_data',
  provider: 'provider',
  lastSignInAt: 'last_sign_in_at',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  email: 'email',
};

export const REFRESH_TOKENS_FIELDS = {
  id: 'id',
  instanceId: 'instance_id',
  token: 'token',
  userId: 'user_id',
  revoked: 'revoked',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  parent: 'parent',
  sessionId: 'session_id',
};

export const OAUTH_CLIENTS_FIELDS = {
  id: 'id',
  clientSecretHash: 'client_secret_hash',
  registrationType: 'registration_type',
  redirectUris: 'redirect_uris',
  grantTypes: 'grant_types',
  clientName: 'client_name',
  clientUri: 'client_uri',
  logoUri: 'logo_uri',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',
  clientType: 'client_type',
};

export const OAUTH_AUTHORIZATIONS_FIELDS = {
  id: 'id',
  authorizationId: 'authorization_id',
  clientId: 'client_id',
  userId: 'user_id',
  redirectUri: 'redirect_uri',
  scope: 'scope',
  state: 'state',
  resource: 'resource',
  codeChallenge: 'code_challenge',
  codeChallengeMethod: 'code_challenge_method',
  responseType: 'response_type',
  status: 'status',
  authorizationCode: 'authorization_code',
  createdAt: 'created_at',
  expiresAt: 'expires_at',
  approvedAt: 'approved_at',
};

export const OAUTH_CONSENTS_FIELDS = {
  id: 'id',
  userId: 'user_id',
  clientId: 'client_id',
  scopes: 'scopes',
  grantedAt: 'granted_at',
  revokedAt: 'revoked_at',
};

export const MFA_FACTORS_FIELDS = {
  id: 'id',
  userId: 'user_id',
  friendlyName: 'friendly_name',
  factorType: 'factor_type',
  status: 'status',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  secret: 'secret',
  phone: 'phone',
  lastChallengedAt: 'last_challenged_at',
  webAuthnCredential: 'web_authn_credential',
  webAuthnAaguid: 'web_authn_aaguid',
  lastWebauthnChallengeData: 'last_webauthn_challenge_data',
};

export const MFA_CHALLENGES_FIELDS = {
  id: 'id',
  factorId: 'factor_id',
  createdAt: 'created_at',
  verifiedAt: 'verified_at',
  ipAddress: 'ip_address',
  otpCode: 'otp_code',
  webAuthnSessionData: 'web_authn_session_data',
};

export const MFA_AMR_CLAIMS_FIELDS = {
  id: 'id',
  sessionId: 'session_id',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  authenticationMethod: 'authentication_method',
};

export const SSO_PROVIDERS_FIELDS = {
  id: 'id',
  resourceId: 'resource_id',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  disabled: 'disabled',
};

export const SSO_DOMAINS_FIELDS = {
  id: 'id',
  ssoProviderId: 'sso_provider_id',
  domain: 'domain',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};

export const SAML_PROVIDERS_FIELDS = {
  id: 'id',
  ssoProviderId: 'sso_provider_id',
  entityId: 'entity_id',
  metadataXml: 'metadata_xml',
  metadataUrl: 'metadata_url',
  attributeMapping: 'attribute_mapping',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  nameIdFormat: 'name_id_format',
};

export const SAML_RELAY_STATES_FIELDS = {
  id: 'id',
  ssoProviderId: 'sso_provider_id',
  requestId: 'request_id',
  forEmail: 'for_email',
  redirectTo: 'redirect_to',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  flowStateId: 'flow_state_id',
};

export const FLOW_STATE_FIELDS = {
  id: 'id',
  userId: 'user_id',
  authCode: 'auth_code',
  codeChallengeMethod: 'code_challenge_method',
  codeChallenge: 'code_challenge',
  providerType: 'provider_type',
  providerAccessToken: 'provider_access_token',
  providerRefreshToken: 'provider_refresh_token',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  authenticationMethod: 'authentication_method',
  authCodeIssuedAt: 'auth_code_issued_at',
};

export const ONE_TIME_TOKENS_FIELDS = {
  id: 'id',
  userId: 'user_id',
  tokenType: 'token_type',
  tokenHash: 'token_hash',
  relatesTo: 'relates_to',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};

export const AUDIT_LOG_ENTRIES_FIELDS = {
  id: 'id',
  instanceId: 'instance_id',
  payload: 'payload',
  createdAt: 'created_at',
  ipAddress: 'ip_address',
};

export const INSTANCES_FIELDS = {
  id: 'id',
  uuid: 'uuid',
  rawBaseConfig: 'raw_base_config',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};

/**
 * Helper function to get table name without 'auth.' prefix for Supabase queries
 * Note: Supabase client automatically handles schema, so you can use just the table name
 * when using the Admin API or service role key
 */
export function getTableName(fullTableName) {
  return fullTableName.replace('auth.', '');
}

/**
 * Helper to check if a table is an auth table
 */
export function isAuthTable(tableName) {
  return Object.values(AUTH_TABLES).includes(tableName) || 
         tableName.startsWith('auth.');
}

