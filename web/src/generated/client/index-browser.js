
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.Audit_log_entriesScalarFieldEnum = {
  instance_id: 'instance_id',
  id: 'id',
  payload: 'payload',
  created_at: 'created_at',
  ip_address: 'ip_address'
};

exports.Prisma.Flow_stateScalarFieldEnum = {
  id: 'id',
  user_id: 'user_id',
  auth_code: 'auth_code',
  code_challenge_method: 'code_challenge_method',
  code_challenge: 'code_challenge',
  provider_type: 'provider_type',
  provider_access_token: 'provider_access_token',
  provider_refresh_token: 'provider_refresh_token',
  created_at: 'created_at',
  updated_at: 'updated_at',
  authentication_method: 'authentication_method',
  auth_code_issued_at: 'auth_code_issued_at'
};

exports.Prisma.IdentitiesScalarFieldEnum = {
  provider_id: 'provider_id',
  user_id: 'user_id',
  identity_data: 'identity_data',
  provider: 'provider',
  last_sign_in_at: 'last_sign_in_at',
  created_at: 'created_at',
  updated_at: 'updated_at',
  email: 'email',
  id: 'id'
};

exports.Prisma.InstancesScalarFieldEnum = {
  id: 'id',
  uuid: 'uuid',
  raw_base_config: 'raw_base_config',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.Mfa_amr_claimsScalarFieldEnum = {
  session_id: 'session_id',
  created_at: 'created_at',
  updated_at: 'updated_at',
  authentication_method: 'authentication_method',
  id: 'id'
};

exports.Prisma.Mfa_challengesScalarFieldEnum = {
  id: 'id',
  factor_id: 'factor_id',
  created_at: 'created_at',
  verified_at: 'verified_at',
  ip_address: 'ip_address',
  otp_code: 'otp_code',
  web_authn_session_data: 'web_authn_session_data'
};

exports.Prisma.Mfa_factorsScalarFieldEnum = {
  id: 'id',
  user_id: 'user_id',
  friendly_name: 'friendly_name',
  factor_type: 'factor_type',
  status: 'status',
  created_at: 'created_at',
  updated_at: 'updated_at',
  secret: 'secret',
  phone: 'phone',
  last_challenged_at: 'last_challenged_at',
  web_authn_credential: 'web_authn_credential',
  web_authn_aaguid: 'web_authn_aaguid',
  last_webauthn_challenge_data: 'last_webauthn_challenge_data'
};

exports.Prisma.Oauth_authorizationsScalarFieldEnum = {
  id: 'id',
  authorization_id: 'authorization_id',
  client_id: 'client_id',
  user_id: 'user_id',
  redirect_uri: 'redirect_uri',
  scope: 'scope',
  state: 'state',
  resource: 'resource',
  code_challenge: 'code_challenge',
  code_challenge_method: 'code_challenge_method',
  response_type: 'response_type',
  status: 'status',
  authorization_code: 'authorization_code',
  created_at: 'created_at',
  expires_at: 'expires_at',
  approved_at: 'approved_at',
  nonce: 'nonce'
};

exports.Prisma.Oauth_client_statesScalarFieldEnum = {
  id: 'id',
  provider_type: 'provider_type',
  code_verifier: 'code_verifier',
  created_at: 'created_at'
};

exports.Prisma.Oauth_clientsScalarFieldEnum = {
  id: 'id',
  client_secret_hash: 'client_secret_hash',
  registration_type: 'registration_type',
  redirect_uris: 'redirect_uris',
  grant_types: 'grant_types',
  client_name: 'client_name',
  client_uri: 'client_uri',
  logo_uri: 'logo_uri',
  created_at: 'created_at',
  updated_at: 'updated_at',
  deleted_at: 'deleted_at',
  client_type: 'client_type'
};

exports.Prisma.Oauth_consentsScalarFieldEnum = {
  id: 'id',
  user_id: 'user_id',
  client_id: 'client_id',
  scopes: 'scopes',
  granted_at: 'granted_at',
  revoked_at: 'revoked_at'
};

exports.Prisma.One_time_tokensScalarFieldEnum = {
  id: 'id',
  user_id: 'user_id',
  token_type: 'token_type',
  token_hash: 'token_hash',
  relates_to: 'relates_to',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.Refresh_tokensScalarFieldEnum = {
  instance_id: 'instance_id',
  id: 'id',
  token: 'token',
  user_id: 'user_id',
  revoked: 'revoked',
  created_at: 'created_at',
  updated_at: 'updated_at',
  parent: 'parent',
  session_id: 'session_id'
};

exports.Prisma.Saml_providersScalarFieldEnum = {
  id: 'id',
  sso_provider_id: 'sso_provider_id',
  entity_id: 'entity_id',
  metadata_xml: 'metadata_xml',
  metadata_url: 'metadata_url',
  attribute_mapping: 'attribute_mapping',
  created_at: 'created_at',
  updated_at: 'updated_at',
  name_id_format: 'name_id_format'
};

exports.Prisma.Saml_relay_statesScalarFieldEnum = {
  id: 'id',
  sso_provider_id: 'sso_provider_id',
  request_id: 'request_id',
  for_email: 'for_email',
  redirect_to: 'redirect_to',
  created_at: 'created_at',
  updated_at: 'updated_at',
  flow_state_id: 'flow_state_id'
};

exports.Prisma.Schema_migrationsScalarFieldEnum = {
  version: 'version'
};

exports.Prisma.SessionsScalarFieldEnum = {
  id: 'id',
  user_id: 'user_id',
  created_at: 'created_at',
  updated_at: 'updated_at',
  factor_id: 'factor_id',
  aal: 'aal',
  not_after: 'not_after',
  refreshed_at: 'refreshed_at',
  user_agent: 'user_agent',
  ip: 'ip',
  tag: 'tag',
  oauth_client_id: 'oauth_client_id',
  refresh_token_hmac_key: 'refresh_token_hmac_key',
  refresh_token_counter: 'refresh_token_counter',
  scopes: 'scopes'
};

exports.Prisma.Sso_domainsScalarFieldEnum = {
  id: 'id',
  sso_provider_id: 'sso_provider_id',
  domain: 'domain',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.Sso_providersScalarFieldEnum = {
  id: 'id',
  resource_id: 'resource_id',
  created_at: 'created_at',
  updated_at: 'updated_at',
  disabled: 'disabled'
};

exports.Prisma.UsersScalarFieldEnum = {
  instance_id: 'instance_id',
  id: 'id',
  aud: 'aud',
  role: 'role',
  email: 'email',
  encrypted_password: 'encrypted_password',
  email_confirmed_at: 'email_confirmed_at',
  invited_at: 'invited_at',
  confirmation_token: 'confirmation_token',
  confirmation_sent_at: 'confirmation_sent_at',
  recovery_token: 'recovery_token',
  recovery_sent_at: 'recovery_sent_at',
  email_change_token_new: 'email_change_token_new',
  email_change: 'email_change',
  email_change_sent_at: 'email_change_sent_at',
  last_sign_in_at: 'last_sign_in_at',
  raw_app_meta_data: 'raw_app_meta_data',
  raw_user_meta_data: 'raw_user_meta_data',
  is_super_admin: 'is_super_admin',
  created_at: 'created_at',
  updated_at: 'updated_at',
  phone: 'phone',
  phone_confirmed_at: 'phone_confirmed_at',
  phone_change: 'phone_change',
  phone_change_token: 'phone_change_token',
  phone_change_sent_at: 'phone_change_sent_at',
  confirmed_at: 'confirmed_at',
  email_change_token_current: 'email_change_token_current',
  email_change_confirm_status: 'email_change_confirm_status',
  banned_until: 'banned_until',
  reauthentication_token: 'reauthentication_token',
  reauthentication_sent_at: 'reauthentication_sent_at',
  is_sso_user: 'is_sso_user',
  deleted_at: 'deleted_at',
  is_anonymous: 'is_anonymous'
};

exports.Prisma.BlogsScalarFieldEnum = {
  id: 'id',
  title: 'title',
  summary: 'summary',
  author: 'author',
  tags: 'tags',
  published_at: 'published_at',
  thumbnail_url: 'thumbnail_url',
  external_url: 'external_url',
  views: 'views',
  created_at: 'created_at',
  updated_at: 'updated_at',
  blog_type: 'blog_type',
  category: 'category'
};

exports.Prisma.CommentsScalarFieldEnum = {
  id: 'id',
  post_id: 'post_id',
  author_id: 'author_id',
  content: 'content',
  parent_id: 'parent_id',
  is_accepted: 'is_accepted',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.Squad_commentsScalarFieldEnum = {
  id: 'id',
  squad_id: 'squad_id',
  author_id: 'author_id',
  content: 'content',
  parent_id: 'parent_id',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.PostsScalarFieldEnum = {
  id: 'id',
  author_id: 'author_id',
  title: 'title',
  content: 'content',
  category: 'category',
  tags: 'tags',
  views: 'views',
  likes: 'likes',
  has_accepted_answer: 'has_accepted_answer',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.ProfilesScalarFieldEnum = {
  id: 'id',
  handle: 'handle',
  nickname: 'nickname',
  avatar_url: 'avatar_url',
  bio: 'bio',
  reputation: 'reputation',
  tier: 'tier',
  tech_stack: 'tech_stack',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.User_resumesScalarFieldEnum = {
  id: 'id',
  user_id: 'user_id',
  title: 'title',
  resume_payload: 'resume_payload',
  public_summary: 'public_summary',
  is_active: 'is_active',
  source_type: 'source_type',
  source_file_name: 'source_file_name',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.User_resume_profilesScalarFieldEnum = {
  user_id: 'user_id',
  resume_payload: 'resume_payload',
  public_summary: 'public_summary',
  source_type: 'source_type',
  source_file_name: 'source_file_name',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.User_workspace_settingsScalarFieldEnum = {
  user_id: 'user_id',
  settings_payload: 'settings_payload',
  public_summary: 'public_summary',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.Blog_bookmarksScalarFieldEnum = {
  id: 'id',
  user_id: 'user_id',
  blog_id: 'blog_id',
  created_at: 'created_at'
};

exports.Prisma.User_activity_eventsScalarFieldEnum = {
  id: 'id',
  user_id: 'user_id',
  event_type: 'event_type',
  ref_id: 'ref_id',
  created_at: 'created_at'
};

exports.Prisma.Reputation_eventsScalarFieldEnum = {
  id: 'id',
  user_id: 'user_id',
  event_type: 'event_type',
  delta: 'delta',
  source_type: 'source_type',
  source_id: 'source_id',
  actor_id: 'actor_id',
  dedupe_key: 'dedupe_key',
  metadata: 'metadata',
  created_at: 'created_at'
};

exports.Prisma.Squad_applicationsScalarFieldEnum = {
  id: 'id',
  squad_id: 'squad_id',
  user_id: 'user_id',
  message: 'message',
  status: 'status',
  created_at: 'created_at'
};

exports.Prisma.Squad_membersScalarFieldEnum = {
  id: 'id',
  squad_id: 'squad_id',
  user_id: 'user_id',
  role: 'role',
  joined_at: 'joined_at'
};

exports.Prisma.WorkspacesScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  icon_url: 'icon_url',
  category: 'category',
  lifecycle_status: 'lifecycle_status',
  completed_at: 'completed_at',
  result_type: 'result_type',
  result_link: 'result_link',
  result_note: 'result_note',
  from_squad_id: 'from_squad_id',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.Workspace_membersScalarFieldEnum = {
  id: 'id',
  workspace_id: 'workspace_id',
  user_id: 'user_id',
  role: 'role',
  joined_at: 'joined_at'
};

exports.Prisma.Workspace_invitesScalarFieldEnum = {
  id: 'id',
  workspace_id: 'workspace_id',
  email: 'email',
  token: 'token',
  role: 'role',
  inviter_id: 'inviter_id',
  expires_at: 'expires_at',
  created_at: 'created_at'
};

exports.Prisma.Kanban_columnsScalarFieldEnum = {
  id: 'id',
  workspace_id: 'workspace_id',
  title: 'title',
  category: 'category',
  order: 'order'
};

exports.Prisma.Kanban_tagsScalarFieldEnum = {
  id: 'id',
  workspace_id: 'workspace_id',
  name: 'name',
  color: 'color',
  created_at: 'created_at'
};

exports.Prisma.Kanban_tasksScalarFieldEnum = {
  id: 'id',
  column_id: 'column_id',
  title: 'title',
  description: 'description',
  assignee_id: 'assignee_id',
  priority: 'priority',
  tags: 'tags',
  order: 'order',
  due_date: 'due_date',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.Workspace_docsScalarFieldEnum = {
  id: 'id',
  workspace_id: 'workspace_id',
  title: 'title',
  content: 'content',
  emoji: 'emoji',
  cover_url: 'cover_url',
  parent_id: 'parent_id',
  is_archived: 'is_archived',
  author_id: 'author_id',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.Workspace_whiteboardsScalarFieldEnum = {
  id: 'id',
  workspace_id: 'workspace_id',
  yjs_state: 'yjs_state',
  updated_at: 'updated_at'
};

exports.Prisma.Workspace_channelsScalarFieldEnum = {
  id: 'id',
  workspace_id: 'workspace_id',
  name: 'name',
  description: 'description',
  type: 'type',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.Workspace_messagesScalarFieldEnum = {
  id: 'id',
  channel_id: 'channel_id',
  sender_id: 'sender_id',
  content: 'content',
  type: 'type',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.NotificationsScalarFieldEnum = {
  id: 'id',
  user_id: 'user_id',
  type: 'type',
  title: 'title',
  message: 'message',
  link: 'link',
  is_read: 'is_read',
  created_at: 'created_at'
};

exports.Prisma.SquadsScalarFieldEnum = {
  id: 'id',
  leader_id: 'leader_id',
  type: 'type',
  title: 'title',
  content: 'content',
  tech_stack: 'tech_stack',
  capacity: 'capacity',
  recruited_count: 'recruited_count',
  place_type: 'place_type',
  location: 'location',
  activity_id: 'activity_id',
  workspace_id: 'workspace_id',
  status: 'status',
  recruitment_period: 'recruitment_period',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.JsonNullValueInput = {
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};
exports.code_challenge_method = exports.$Enums.code_challenge_method = {
  s256: 's256',
  plain: 'plain'
};

exports.factor_type = exports.$Enums.factor_type = {
  totp: 'totp',
  webauthn: 'webauthn',
  phone: 'phone'
};

exports.factor_status = exports.$Enums.factor_status = {
  unverified: 'unverified',
  verified: 'verified'
};

exports.oauth_response_type = exports.$Enums.oauth_response_type = {
  code: 'code'
};

exports.oauth_authorization_status = exports.$Enums.oauth_authorization_status = {
  pending: 'pending',
  approved: 'approved',
  denied: 'denied',
  expired: 'expired'
};

exports.oauth_registration_type = exports.$Enums.oauth_registration_type = {
  dynamic: 'dynamic',
  manual: 'manual'
};

exports.oauth_client_type = exports.$Enums.oauth_client_type = {
  public: 'public',
  confidential: 'confidential'
};

exports.one_time_token_type = exports.$Enums.one_time_token_type = {
  confirmation_token: 'confirmation_token',
  reauthentication_token: 'reauthentication_token',
  recovery_token: 'recovery_token',
  email_change_token_new: 'email_change_token_new',
  email_change_token_current: 'email_change_token_current',
  phone_change_token: 'phone_change_token'
};

exports.aal_level = exports.$Enums.aal_level = {
  aal1: 'aal1',
  aal2: 'aal2',
  aal3: 'aal3'
};

exports.workspace_lifecycle_status = exports.$Enums.workspace_lifecycle_status = {
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED'
};

exports.Prisma.ModelName = {
  audit_log_entries: 'audit_log_entries',
  flow_state: 'flow_state',
  identities: 'identities',
  instances: 'instances',
  mfa_amr_claims: 'mfa_amr_claims',
  mfa_challenges: 'mfa_challenges',
  mfa_factors: 'mfa_factors',
  oauth_authorizations: 'oauth_authorizations',
  oauth_client_states: 'oauth_client_states',
  oauth_clients: 'oauth_clients',
  oauth_consents: 'oauth_consents',
  one_time_tokens: 'one_time_tokens',
  refresh_tokens: 'refresh_tokens',
  saml_providers: 'saml_providers',
  saml_relay_states: 'saml_relay_states',
  schema_migrations: 'schema_migrations',
  sessions: 'sessions',
  sso_domains: 'sso_domains',
  sso_providers: 'sso_providers',
  users: 'users',
  blogs: 'blogs',
  comments: 'comments',
  squad_comments: 'squad_comments',
  posts: 'posts',
  profiles: 'profiles',
  user_resumes: 'user_resumes',
  user_resume_profiles: 'user_resume_profiles',
  user_workspace_settings: 'user_workspace_settings',
  blog_bookmarks: 'blog_bookmarks',
  user_activity_events: 'user_activity_events',
  reputation_events: 'reputation_events',
  squad_applications: 'squad_applications',
  squad_members: 'squad_members',
  workspaces: 'workspaces',
  workspace_members: 'workspace_members',
  workspace_invites: 'workspace_invites',
  kanban_columns: 'kanban_columns',
  kanban_tags: 'kanban_tags',
  kanban_tasks: 'kanban_tasks',
  workspace_docs: 'workspace_docs',
  workspace_whiteboards: 'workspace_whiteboards',
  workspace_channels: 'workspace_channels',
  workspace_messages: 'workspace_messages',
  notifications: 'notifications',
  squads: 'squads'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
