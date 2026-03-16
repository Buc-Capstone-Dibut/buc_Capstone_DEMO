
Object.defineProperty(exports, "__esModule", { value: true });

const {
  PrismaClientKnownRequestError,
  PrismaClientUnknownRequestError,
  PrismaClientRustPanicError,
  PrismaClientInitializationError,
  PrismaClientValidationError,
  NotFoundError,
  getPrismaClient,
  sqltag,
  empty,
  join,
  raw,
  skip,
  Decimal,
  Debug,
  objectEnumValues,
  makeStrictEnum,
  Extensions,
  warnOnce,
  defineDmmfProperty,
  Public,
  getRuntime
} = require('./runtime/wasm.js')


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

Prisma.PrismaClientKnownRequestError = PrismaClientKnownRequestError;
Prisma.PrismaClientUnknownRequestError = PrismaClientUnknownRequestError
Prisma.PrismaClientRustPanicError = PrismaClientRustPanicError
Prisma.PrismaClientInitializationError = PrismaClientInitializationError
Prisma.PrismaClientValidationError = PrismaClientValidationError
Prisma.NotFoundError = NotFoundError
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = sqltag
Prisma.empty = empty
Prisma.join = join
Prisma.raw = raw
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = Extensions.getExtensionContext
Prisma.defineExtension = Extensions.defineExtension

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
 * Create the Client
 */
const config = {
  "generator": {
    "name": "client",
    "provider": {
      "fromEnvVar": null,
      "value": "prisma-client-js"
    },
    "output": {
      "value": "C:\\3졸작\\buc_Capstone_DEMO\\web\\src\\generated\\client",
      "fromEnvVar": null
    },
    "config": {
      "engineType": "library"
    },
    "binaryTargets": [
      {
        "fromEnvVar": null,
        "value": "windows",
        "native": true
      }
    ],
    "previewFeatures": [
      "driverAdapters",
      "multiSchema"
    ],
    "sourceFilePath": "C:\\3졸작\\buc_Capstone_DEMO\\web\\prisma\\schema.prisma",
    "isCustomOutput": true
  },
  "relativeEnvPaths": {
    "rootEnvPath": "../../../.env",
    "schemaEnvPath": "../../../.env"
  },
  "relativePath": "../../../prisma",
  "clientVersion": "5.22.0",
  "engineVersion": "605197351a3c8bdd595af2d2a9bc3025bca48ea2",
  "datasourceNames": [
    "db"
  ],
  "activeProvider": "postgresql",
  "postinstall": false,
  "inlineDatasources": {
    "db": {
      "url": {
        "fromEnvVar": "DATABASE_URL",
        "value": null
      }
    }
  },
  "inlineSchema": "generator client {\n  provider        = \"prisma-client-js\"\n  previewFeatures = [\"multiSchema\", \"driverAdapters\"]\n  output          = \"../src/generated/client\"\n}\n\ndatasource db {\n  provider  = \"postgresql\"\n  url       = env(\"DATABASE_URL\")\n  directUrl = env(\"DIRECT_URL\")\n  schemas   = [\"auth\", \"public\"]\n}\n\n/// This model or at least one of its fields has comments in the database, and requires an additional setup for migrations: Read more: https://pris.ly/d/database-comments\n/// This model contains row level security and requires additional setup for migrations. Visit https://pris.ly/d/row-level-security for more info.\nmodel audit_log_entries {\n  instance_id String?   @db.Uuid\n  id          String    @id @db.Uuid\n  payload     Json?     @db.Json\n  created_at  DateTime? @db.Timestamptz(6)\n  ip_address  String    @default(\"\") @db.VarChar(64)\n\n  @@index([instance_id], map: \"audit_logs_instance_id_idx\")\n  @@schema(\"auth\")\n}\n\n/// This model or at least one of its fields has comments in the database, and requires an additional setup for migrations: Read more: https://pris.ly/d/database-comments\n/// This model contains row level security and requires additional setup for migrations. Visit https://pris.ly/d/row-level-security for more info.\nmodel flow_state {\n  id                     String                @id @db.Uuid\n  user_id                String?               @db.Uuid\n  auth_code              String\n  code_challenge_method  code_challenge_method\n  code_challenge         String\n  provider_type          String\n  provider_access_token  String?\n  provider_refresh_token String?\n  created_at             DateTime?             @db.Timestamptz(6)\n  updated_at             DateTime?             @db.Timestamptz(6)\n  authentication_method  String\n  auth_code_issued_at    DateTime?             @db.Timestamptz(6)\n  saml_relay_states      saml_relay_states[]\n\n  @@index([created_at(sort: Desc)])\n  @@index([auth_code], map: \"idx_auth_code\")\n  @@index([user_id, authentication_method], map: \"idx_user_id_auth_method\")\n  @@schema(\"auth\")\n}\n\n/// This model or at least one of its fields has comments in the database, and requires an additional setup for migrations: Read more: https://pris.ly/d/database-comments\n/// This model contains row level security and requires additional setup for migrations. Visit https://pris.ly/d/row-level-security for more info.\nmodel identities {\n  provider_id     String\n  user_id         String    @db.Uuid\n  identity_data   Json\n  provider        String\n  last_sign_in_at DateTime? @db.Timestamptz(6)\n  created_at      DateTime? @db.Timestamptz(6)\n  updated_at      DateTime? @db.Timestamptz(6)\n  email           String?   @default(dbgenerated(\"lower((identity_data ->> 'email'::text))\"))\n  id              String    @id @default(dbgenerated(\"gen_random_uuid()\")) @db.Uuid\n  users           users     @relation(fields: [user_id], references: [id], onDelete: Cascade, onUpdate: NoAction)\n\n  @@unique([provider_id, provider], map: \"identities_provider_id_provider_unique\")\n  @@index([email])\n  @@index([user_id])\n  @@schema(\"auth\")\n}\n\n/// This model or at least one of its fields has comments in the database, and requires an additional setup for migrations: Read more: https://pris.ly/d/database-comments\n/// This model contains row level security and requires additional setup for migrations. Visit https://pris.ly/d/row-level-security for more info.\nmodel instances {\n  id              String    @id @db.Uuid\n  uuid            String?   @db.Uuid\n  raw_base_config String?\n  created_at      DateTime? @db.Timestamptz(6)\n  updated_at      DateTime? @db.Timestamptz(6)\n\n  @@schema(\"auth\")\n}\n\n/// This model or at least one of its fields has comments in the database, and requires an additional setup for migrations: Read more: https://pris.ly/d/database-comments\n/// This model contains row level security and requires additional setup for migrations. Visit https://pris.ly/d/row-level-security for more info.\nmodel mfa_amr_claims {\n  session_id            String   @db.Uuid\n  created_at            DateTime @db.Timestamptz(6)\n  updated_at            DateTime @db.Timestamptz(6)\n  authentication_method String\n  id                    String   @id(map: \"amr_id_pk\") @db.Uuid\n  sessions              sessions @relation(fields: [session_id], references: [id], onDelete: Cascade, onUpdate: NoAction)\n\n  @@unique([session_id, authentication_method], map: \"mfa_amr_claims_session_id_authentication_method_pkey\")\n  @@schema(\"auth\")\n}\n\n/// This model or at least one of its fields has comments in the database, and requires an additional setup for migrations: Read more: https://pris.ly/d/database-comments\n/// This model contains row level security and requires additional setup for migrations. Visit https://pris.ly/d/row-level-security for more info.\nmodel mfa_challenges {\n  id                     String      @id @db.Uuid\n  factor_id              String      @db.Uuid\n  created_at             DateTime    @db.Timestamptz(6)\n  verified_at            DateTime?   @db.Timestamptz(6)\n  ip_address             String      @db.Inet\n  otp_code               String?\n  web_authn_session_data Json?\n  mfa_factors            mfa_factors @relation(fields: [factor_id], references: [id], onDelete: Cascade, onUpdate: NoAction, map: \"mfa_challenges_auth_factor_id_fkey\")\n\n  @@index([created_at(sort: Desc)], map: \"mfa_challenge_created_at_idx\")\n  @@schema(\"auth\")\n}\n\n/// This model or at least one of its fields has comments in the database, and requires an additional setup for migrations: Read more: https://pris.ly/d/database-comments\n/// This model contains row level security and requires additional setup for migrations. Visit https://pris.ly/d/row-level-security for more info.\nmodel mfa_factors {\n  id                           String           @id @db.Uuid\n  user_id                      String           @db.Uuid\n  friendly_name                String?\n  factor_type                  factor_type\n  status                       factor_status\n  created_at                   DateTime         @db.Timestamptz(6)\n  updated_at                   DateTime         @db.Timestamptz(6)\n  secret                       String?\n  phone                        String?\n  last_challenged_at           DateTime?        @unique @db.Timestamptz(6)\n  web_authn_credential         Json?\n  web_authn_aaguid             String?          @db.Uuid\n  last_webauthn_challenge_data Json?\n  mfa_challenges               mfa_challenges[]\n  users                        users            @relation(fields: [user_id], references: [id], onDelete: Cascade, onUpdate: NoAction)\n\n  @@unique([user_id, phone], map: \"unique_phone_factor_per_user\")\n  @@index([user_id, created_at], map: \"factor_id_created_at_idx\")\n  @@index([user_id])\n  @@schema(\"auth\")\n}\n\n/// This table contains check constraints and requires additional setup for migrations. Visit https://pris.ly/d/check-constraints for more info.\nmodel oauth_authorizations {\n  id                    String                     @id @db.Uuid\n  authorization_id      String                     @unique\n  client_id             String                     @db.Uuid\n  user_id               String?                    @db.Uuid\n  redirect_uri          String\n  scope                 String\n  state                 String?\n  resource              String?\n  code_challenge        String?\n  code_challenge_method code_challenge_method?\n  response_type         oauth_response_type        @default(code)\n  status                oauth_authorization_status @default(pending)\n  authorization_code    String?                    @unique\n  created_at            DateTime                   @default(now()) @db.Timestamptz(6)\n  expires_at            DateTime                   @default(dbgenerated(\"(now() + '00:03:00'::interval)\")) @db.Timestamptz(6)\n  approved_at           DateTime?                  @db.Timestamptz(6)\n  nonce                 String?\n  oauth_clients         oauth_clients              @relation(fields: [client_id], references: [id], onDelete: Cascade, onUpdate: NoAction)\n  users                 users?                     @relation(fields: [user_id], references: [id], onDelete: Cascade, onUpdate: NoAction)\n\n  @@schema(\"auth\")\n}\n\n/// This model or at least one of its fields has comments in the database, and requires an additional setup for migrations: Read more: https://pris.ly/d/database-comments\nmodel oauth_client_states {\n  id            String   @id @db.Uuid\n  provider_type String\n  code_verifier String?\n  created_at    DateTime @db.Timestamptz(6)\n\n  @@index([created_at], map: \"idx_oauth_client_states_created_at\")\n  @@schema(\"auth\")\n}\n\n/// This table contains check constraints and requires additional setup for migrations. Visit https://pris.ly/d/check-constraints for more info.\nmodel oauth_clients {\n  id                   String                  @id @db.Uuid\n  client_secret_hash   String?\n  registration_type    oauth_registration_type\n  redirect_uris        String\n  grant_types          String\n  client_name          String?\n  client_uri           String?\n  logo_uri             String?\n  created_at           DateTime                @default(now()) @db.Timestamptz(6)\n  updated_at           DateTime                @default(now()) @db.Timestamptz(6)\n  deleted_at           DateTime?               @db.Timestamptz(6)\n  client_type          oauth_client_type       @default(confidential)\n  oauth_authorizations oauth_authorizations[]\n  oauth_consents       oauth_consents[]\n  sessions             sessions[]\n\n  @@index([deleted_at])\n  @@schema(\"auth\")\n}\n\n/// This table contains check constraints and requires additional setup for migrations. Visit https://pris.ly/d/check-constraints for more info.\nmodel oauth_consents {\n  id            String        @id @db.Uuid\n  user_id       String        @db.Uuid\n  client_id     String        @db.Uuid\n  scopes        String\n  granted_at    DateTime      @default(now()) @db.Timestamptz(6)\n  revoked_at    DateTime?     @db.Timestamptz(6)\n  oauth_clients oauth_clients @relation(fields: [client_id], references: [id], onDelete: Cascade, onUpdate: NoAction)\n  users         users         @relation(fields: [user_id], references: [id], onDelete: Cascade, onUpdate: NoAction)\n\n  @@unique([user_id, client_id], map: \"oauth_consents_user_client_unique\")\n  @@index([user_id, granted_at(sort: Desc)], map: \"oauth_consents_user_order_idx\")\n  @@schema(\"auth\")\n}\n\n/// This table contains check constraints and requires additional setup for migrations. Visit https://pris.ly/d/check-constraints for more info.\n/// This model contains row level security and requires additional setup for migrations. Visit https://pris.ly/d/row-level-security for more info.\nmodel one_time_tokens {\n  id         String              @id @db.Uuid\n  user_id    String              @db.Uuid\n  token_type one_time_token_type\n  token_hash String\n  relates_to String\n  created_at DateTime            @default(now()) @db.Timestamp(6)\n  updated_at DateTime            @default(now()) @db.Timestamp(6)\n  users      users               @relation(fields: [user_id], references: [id], onDelete: Cascade, onUpdate: NoAction)\n\n  @@unique([user_id, token_type])\n  @@index([relates_to], map: \"one_time_tokens_relates_to_hash_idx\", type: Hash)\n  @@index([token_hash], map: \"one_time_tokens_token_hash_hash_idx\", type: Hash)\n  @@schema(\"auth\")\n}\n\n/// This model or at least one of its fields has comments in the database, and requires an additional setup for migrations: Read more: https://pris.ly/d/database-comments\n/// This model contains row level security and requires additional setup for migrations. Visit https://pris.ly/d/row-level-security for more info.\nmodel refresh_tokens {\n  instance_id String?   @db.Uuid\n  id          BigInt    @id @default(autoincrement())\n  token       String?   @unique(map: \"refresh_tokens_token_unique\") @db.VarChar(255)\n  user_id     String?   @db.VarChar(255)\n  revoked     Boolean?\n  created_at  DateTime? @db.Timestamptz(6)\n  updated_at  DateTime? @db.Timestamptz(6)\n  parent      String?   @db.VarChar(255)\n  session_id  String?   @db.Uuid\n  sessions    sessions? @relation(fields: [session_id], references: [id], onDelete: Cascade, onUpdate: NoAction)\n\n  @@index([instance_id])\n  @@index([instance_id, user_id])\n  @@index([parent])\n  @@index([session_id, revoked])\n  @@index([updated_at(sort: Desc)])\n  @@schema(\"auth\")\n}\n\n/// This table contains check constraints and requires additional setup for migrations. Visit https://pris.ly/d/check-constraints for more info.\n/// This model or at least one of its fields has comments in the database, and requires an additional setup for migrations: Read more: https://pris.ly/d/database-comments\n/// This model contains row level security and requires additional setup for migrations. Visit https://pris.ly/d/row-level-security for more info.\nmodel saml_providers {\n  id                String        @id @db.Uuid\n  sso_provider_id   String        @db.Uuid\n  entity_id         String        @unique\n  metadata_xml      String\n  metadata_url      String?\n  attribute_mapping Json?\n  created_at        DateTime?     @db.Timestamptz(6)\n  updated_at        DateTime?     @db.Timestamptz(6)\n  name_id_format    String?\n  sso_providers     sso_providers @relation(fields: [sso_provider_id], references: [id], onDelete: Cascade, onUpdate: NoAction)\n\n  @@index([sso_provider_id])\n  @@schema(\"auth\")\n}\n\n/// This table contains check constraints and requires additional setup for migrations. Visit https://pris.ly/d/check-constraints for more info.\n/// This model or at least one of its fields has comments in the database, and requires an additional setup for migrations: Read more: https://pris.ly/d/database-comments\n/// This model contains row level security and requires additional setup for migrations. Visit https://pris.ly/d/row-level-security for more info.\nmodel saml_relay_states {\n  id              String        @id @db.Uuid\n  sso_provider_id String        @db.Uuid\n  request_id      String\n  for_email       String?\n  redirect_to     String?\n  created_at      DateTime?     @db.Timestamptz(6)\n  updated_at      DateTime?     @db.Timestamptz(6)\n  flow_state_id   String?       @db.Uuid\n  flow_state      flow_state?   @relation(fields: [flow_state_id], references: [id], onDelete: Cascade, onUpdate: NoAction)\n  sso_providers   sso_providers @relation(fields: [sso_provider_id], references: [id], onDelete: Cascade, onUpdate: NoAction)\n\n  @@index([created_at(sort: Desc)])\n  @@index([for_email])\n  @@index([sso_provider_id])\n  @@schema(\"auth\")\n}\n\n/// This model or at least one of its fields has comments in the database, and requires an additional setup for migrations: Read more: https://pris.ly/d/database-comments\n/// This model contains row level security and requires additional setup for migrations. Visit https://pris.ly/d/row-level-security for more info.\nmodel schema_migrations {\n  version String @id @db.VarChar(255)\n\n  @@schema(\"auth\")\n}\n\n/// This table contains check constraints and requires additional setup for migrations. Visit https://pris.ly/d/check-constraints for more info.\n/// This model or at least one of its fields has comments in the database, and requires an additional setup for migrations: Read more: https://pris.ly/d/database-comments\n/// This model contains row level security and requires additional setup for migrations. Visit https://pris.ly/d/row-level-security for more info.\nmodel sessions {\n  id                     String           @id @db.Uuid\n  user_id                String           @db.Uuid\n  created_at             DateTime?        @db.Timestamptz(6)\n  updated_at             DateTime?        @db.Timestamptz(6)\n  factor_id              String?          @db.Uuid\n  aal                    aal_level?\n  not_after              DateTime?        @db.Timestamptz(6)\n  refreshed_at           DateTime?        @db.Timestamp(6)\n  user_agent             String?\n  ip                     String?          @db.Inet\n  tag                    String?\n  oauth_client_id        String?          @db.Uuid\n  refresh_token_hmac_key String?\n  refresh_token_counter  BigInt?\n  scopes                 String?\n  mfa_amr_claims         mfa_amr_claims[]\n  refresh_tokens         refresh_tokens[]\n  oauth_clients          oauth_clients?   @relation(fields: [oauth_client_id], references: [id], onDelete: Cascade, onUpdate: NoAction)\n  users                  users            @relation(fields: [user_id], references: [id], onDelete: Cascade, onUpdate: NoAction)\n\n  @@index([not_after(sort: Desc)])\n  @@index([oauth_client_id])\n  @@index([user_id])\n  @@index([user_id, created_at], map: \"user_id_created_at_idx\")\n  @@schema(\"auth\")\n}\n\n/// This table contains check constraints and requires additional setup for migrations. Visit https://pris.ly/d/check-constraints for more info.\n/// This model or at least one of its fields has comments in the database, and requires an additional setup for migrations: Read more: https://pris.ly/d/database-comments\n/// This model contains row level security and requires additional setup for migrations. Visit https://pris.ly/d/row-level-security for more info.\n/// This model contains an expression index which requires additional setup for migrations. Visit https://pris.ly/d/expression-indexes for more info.\nmodel sso_domains {\n  id              String        @id @db.Uuid\n  sso_provider_id String        @db.Uuid\n  domain          String\n  created_at      DateTime?     @db.Timestamptz(6)\n  updated_at      DateTime?     @db.Timestamptz(6)\n  sso_providers   sso_providers @relation(fields: [sso_provider_id], references: [id], onDelete: Cascade, onUpdate: NoAction)\n\n  @@index([sso_provider_id])\n  @@schema(\"auth\")\n}\n\n/// This table contains check constraints and requires additional setup for migrations. Visit https://pris.ly/d/check-constraints for more info.\n/// This model or at least one of its fields has comments in the database, and requires an additional setup for migrations: Read more: https://pris.ly/d/database-comments\n/// This model contains row level security and requires additional setup for migrations. Visit https://pris.ly/d/row-level-security for more info.\n/// This model contains an expression index which requires additional setup for migrations. Visit https://pris.ly/d/expression-indexes for more info.\nmodel sso_providers {\n  id                String              @id @db.Uuid\n  resource_id       String?\n  created_at        DateTime?           @db.Timestamptz(6)\n  updated_at        DateTime?           @db.Timestamptz(6)\n  disabled          Boolean?\n  saml_providers    saml_providers[]\n  saml_relay_states saml_relay_states[]\n  sso_domains       sso_domains[]\n\n  @@index([resource_id], map: \"sso_providers_resource_id_pattern_idx\")\n  @@schema(\"auth\")\n}\n\n/// This table contains check constraints and requires additional setup for migrations. Visit https://pris.ly/d/check-constraints for more info.\n/// This model or at least one of its fields has comments in the database, and requires an additional setup for migrations: Read more: https://pris.ly/d/database-comments\n/// This model contains row level security and requires additional setup for migrations. Visit https://pris.ly/d/row-level-security for more info.\n/// This model contains an expression index which requires additional setup for migrations. Visit https://pris.ly/d/expression-indexes for more info.\nmodel users {\n  instance_id                 String?                @db.Uuid\n  id                          String                 @id @db.Uuid\n  aud                         String?                @db.VarChar(255)\n  role                        String?                @db.VarChar(255)\n  email                       String?                @db.VarChar(255)\n  encrypted_password          String?                @db.VarChar(255)\n  email_confirmed_at          DateTime?              @db.Timestamptz(6)\n  invited_at                  DateTime?              @db.Timestamptz(6)\n  confirmation_token          String?                @db.VarChar(255)\n  confirmation_sent_at        DateTime?              @db.Timestamptz(6)\n  recovery_token              String?                @db.VarChar(255)\n  recovery_sent_at            DateTime?              @db.Timestamptz(6)\n  email_change_token_new      String?                @db.VarChar(255)\n  email_change                String?                @db.VarChar(255)\n  email_change_sent_at        DateTime?              @db.Timestamptz(6)\n  last_sign_in_at             DateTime?              @db.Timestamptz(6)\n  raw_app_meta_data           Json?\n  raw_user_meta_data          Json?\n  is_super_admin              Boolean?\n  created_at                  DateTime?              @db.Timestamptz(6)\n  updated_at                  DateTime?              @db.Timestamptz(6)\n  phone                       String?                @unique\n  phone_confirmed_at          DateTime?              @db.Timestamptz(6)\n  phone_change                String?                @default(\"\")\n  phone_change_token          String?                @default(\"\") @db.VarChar(255)\n  phone_change_sent_at        DateTime?              @db.Timestamptz(6)\n  confirmed_at                DateTime?              @default(dbgenerated(\"LEAST(email_confirmed_at, phone_confirmed_at)\")) @db.Timestamptz(6)\n  email_change_token_current  String?                @default(\"\") @db.VarChar(255)\n  email_change_confirm_status Int?                   @default(0) @db.SmallInt\n  banned_until                DateTime?              @db.Timestamptz(6)\n  reauthentication_token      String?                @default(\"\") @db.VarChar(255)\n  reauthentication_sent_at    DateTime?              @db.Timestamptz(6)\n  is_sso_user                 Boolean                @default(false)\n  deleted_at                  DateTime?              @db.Timestamptz(6)\n  is_anonymous                Boolean                @default(false)\n  identities                  identities[]\n  mfa_factors                 mfa_factors[]\n  oauth_authorizations        oauth_authorizations[]\n  oauth_consents              oauth_consents[]\n  one_time_tokens             one_time_tokens[]\n  sessions                    sessions[]\n  profiles                    profiles?\n\n  @@index([instance_id])\n  @@index([is_anonymous])\n  @@schema(\"auth\")\n}\n\nmodel blogs {\n  id            Int              @id @default(autoincrement())\n  title         String           @db.VarChar(500)\n  summary       String?\n  author        String           @db.VarChar(100)\n  tags          String[]         @default([])\n  published_at  DateTime?        @default(now()) @db.Timestamptz(6)\n  thumbnail_url String?\n  external_url  String\n  views         Int?             @default(0)\n  created_at    DateTime?        @default(now()) @db.Timestamptz(6)\n  updated_at    DateTime?        @default(now()) @db.Timestamptz(6)\n  blog_type     String?          @default(\"company\") @db.VarChar(50)\n  category      String?          @db.VarChar(50)\n  bookmarks     blog_bookmarks[]\n\n  @@index([external_url], map: \"idx_blogs_external_url\")\n  @@index([published_at(sort: Desc)], map: \"idx_blogs_published_at\")\n  @@index([tags], map: \"idx_blogs_tags\", type: Gin)\n  @@index([views(sort: Desc)], map: \"idx_blogs_views\")\n  @@schema(\"public\")\n}\n\n/// This model contains row level security and requires additional setup for migrations. Visit https://pris.ly/d/row-level-security for more info.\nmodel comments {\n  id             String     @id @default(dbgenerated(\"uuid_generate_v4()\")) @db.Uuid\n  post_id        String?    @db.Uuid\n  author_id      String?    @db.Uuid\n  content        String\n  parent_id      String?    @db.Uuid\n  is_accepted    Boolean?   @default(false)\n  created_at     DateTime?  @default(now()) @db.Timestamptz(6)\n  updated_at     DateTime?  @default(now()) @db.Timestamptz(6)\n  profiles       profiles?  @relation(fields: [author_id], references: [id], onUpdate: NoAction)\n  comments       comments?  @relation(\"commentsTocomments\", fields: [parent_id], references: [id], onDelete: Cascade, onUpdate: NoAction)\n  other_comments comments[] @relation(\"commentsTocomments\")\n  posts          posts?     @relation(fields: [post_id], references: [id], onDelete: Cascade, onUpdate: NoAction)\n\n  @@index([author_id, created_at(sort: Desc)])\n  @@index([post_id, created_at(sort: Desc)])\n  @@schema(\"public\")\n}\n\n/// This model contains row level security and requires additional setup for migrations. Visit https://pris.ly/d/row-level-security for more info.\nmodel squad_comments {\n  id                   String           @id @default(dbgenerated(\"uuid_generate_v4()\")) @db.Uuid\n  squad_id             String           @db.Uuid\n  author_id            String?          @db.Uuid\n  content              String\n  parent_id            String?          @db.Uuid\n  created_at           DateTime?        @default(now()) @db.Timestamptz(6)\n  updated_at           DateTime?        @default(now()) @db.Timestamptz(6)\n  profiles             profiles?        @relation(fields: [author_id], references: [id], onDelete: SetNull, onUpdate: NoAction)\n  squads               squads           @relation(fields: [squad_id], references: [id], onDelete: Cascade, onUpdate: NoAction)\n  squad_comments       squad_comments?  @relation(\"squad_commentsTosquad_comments\", fields: [parent_id], references: [id], onDelete: Cascade, onUpdate: NoAction)\n  other_squad_comments squad_comments[] @relation(\"squad_commentsTosquad_comments\")\n\n  @@index([parent_id], map: \"idx_squad_comments_parent_id\")\n  @@index([squad_id, created_at], map: \"idx_squad_comments_squad_created_at\")\n  @@schema(\"public\")\n}\n\n/// This model contains row level security and requires additional setup for migrations. Visit https://pris.ly/d/row-level-security for more info.\nmodel posts {\n  id                  String     @id @default(dbgenerated(\"uuid_generate_v4()\")) @db.Uuid\n  author_id           String?    @db.Uuid\n  title               String\n  content             String\n  category            String\n  tags                String[]   @default([])\n  views               Int?       @default(0)\n  likes               Int?       @default(0)\n  has_accepted_answer Boolean?   @default(false)\n  created_at          DateTime?  @default(now()) @db.Timestamptz(6)\n  updated_at          DateTime?  @default(now()) @db.Timestamptz(6)\n  comments            comments[]\n  profiles            profiles?  @relation(fields: [author_id], references: [id], onUpdate: NoAction)\n\n  @@index([author_id, created_at(sort: Desc)])\n  @@index([category, created_at(sort: Desc)])\n  @@schema(\"public\")\n}\n\n/// This model contains row level security and requires additional setup for migrations. Visit https://pris.ly/d/row-level-security for more info.\nmodel profiles {\n  id                 String               @id @db.Uuid\n  handle             String               @unique\n  nickname           String?\n  avatar_url         String?\n  bio                String?\n  reputation         Int?                 @default(0)\n  tier               String?              @default(\"씨앗\")\n  tech_stack         String[]\n  created_at         DateTime?            @default(now()) @db.Timestamptz(6)\n  updated_at         DateTime?            @default(now()) @db.Timestamptz(6)\n  comments           comments[]\n  posts              posts[]\n  squad_comments     squad_comments[]\n  users              users                @relation(fields: [id], references: [id], onDelete: Cascade, onUpdate: NoAction)\n  squad_applications squad_applications[]\n  squad_members      squad_members[]\n  squads             squads[]\n\n  // Workspace & Notification Relations\n  workspace_members  workspace_members[]\n  workspace_invites  workspace_invites[]\n  workspace_docs     workspace_docs[]\n  kanban_tasks       kanban_tasks[]\n  notifications      notifications[]\n  messages           workspace_messages[]\n  blog_bookmarks     blog_bookmarks[]\n  resume_profile     user_resume_profiles?\n  workspace_settings user_workspace_settings?\n  activity_events    user_activity_events[]\n  reputation_events  reputation_events[]\n  resumes            user_resumes[]\n\n  @@schema(\"public\")\n}\n\nmodel user_resumes {\n  id               String   @id @default(dbgenerated(\"uuid_generate_v4()\")) @db.Uuid\n  user_id          String   @db.Uuid\n  title            String   @default(\"새 이력서\")\n  resume_payload   Json\n  public_summary   Json\n  is_active        Boolean  @default(false)\n  source_type      String   @default(\"manual\")\n  source_file_name String?\n  created_at       DateTime @default(now()) @db.Timestamptz(6)\n  updated_at       DateTime @default(now()) @updatedAt @db.Timestamptz(6)\n  profiles         profiles @relation(fields: [user_id], references: [id], onDelete: Cascade, onUpdate: NoAction)\n\n  @@index([user_id, created_at(sort: Desc)])\n  @@schema(\"public\")\n}\n\nmodel user_resume_profiles {\n  user_id          String   @id @db.Uuid\n  resume_payload   Json\n  public_summary   Json\n  source_type      String   @default(\"manual\")\n  source_file_name String?\n  created_at       DateTime @default(now()) @db.Timestamptz(6)\n  updated_at       DateTime @default(now()) @updatedAt @db.Timestamptz(6)\n  profiles         profiles @relation(fields: [user_id], references: [id], onDelete: Cascade, onUpdate: NoAction)\n\n  @@schema(\"public\")\n}\n\nmodel user_workspace_settings {\n  user_id          String   @id @db.Uuid\n  settings_payload Json\n  public_summary   Json\n  created_at       DateTime @default(now()) @db.Timestamptz(6)\n  updated_at       DateTime @default(now()) @updatedAt @db.Timestamptz(6)\n  profiles         profiles @relation(fields: [user_id], references: [id], onDelete: Cascade, onUpdate: NoAction)\n\n  @@schema(\"public\")\n}\n\nmodel blog_bookmarks {\n  id         String   @id @default(dbgenerated(\"uuid_generate_v4()\")) @db.Uuid\n  user_id    String   @db.Uuid\n  blog_id    Int\n  created_at DateTime @default(now()) @db.Timestamptz(6)\n  profiles   profiles @relation(fields: [user_id], references: [id], onDelete: Cascade, onUpdate: NoAction)\n  blogs      blogs    @relation(fields: [blog_id], references: [id], onDelete: Cascade, onUpdate: NoAction)\n\n  @@unique([user_id, blog_id])\n  @@index([user_id, created_at(sort: Desc)])\n  @@schema(\"public\")\n}\n\nmodel user_activity_events {\n  id         String   @id @default(dbgenerated(\"uuid_generate_v4()\")) @db.Uuid\n  user_id    String   @db.Uuid\n  event_type String\n  ref_id     String?\n  created_at DateTime @default(now()) @db.Timestamptz(6)\n  profiles   profiles @relation(fields: [user_id], references: [id], onDelete: Cascade, onUpdate: NoAction)\n\n  @@index([user_id, created_at(sort: Desc)])\n  @@index([event_type])\n  @@index([user_id, event_type, created_at(sort: Desc)])\n  @@schema(\"public\")\n}\n\nmodel reputation_events {\n  id          String   @id @default(dbgenerated(\"uuid_generate_v4()\")) @db.Uuid\n  user_id     String   @db.Uuid\n  event_type  String\n  delta       Int\n  source_type String?\n  source_id   String?\n  actor_id    String?  @db.Uuid\n  dedupe_key  String?  @unique\n  metadata    Json?\n  created_at  DateTime @default(now()) @db.Timestamptz(6)\n  profiles    profiles @relation(fields: [user_id], references: [id], onDelete: Cascade, onUpdate: NoAction)\n\n  @@index([user_id, created_at(sort: Desc)])\n  @@index([event_type, created_at(sort: Desc)])\n  @@schema(\"public\")\n}\n\n/// This model contains row level security and requires additional setup for migrations. Visit https://pris.ly/d/row-level-security for more info.\nmodel squad_applications {\n  id         String    @id @default(dbgenerated(\"uuid_generate_v4()\")) @db.Uuid\n  squad_id   String?   @db.Uuid\n  user_id    String?   @db.Uuid\n  message    String?\n  status     String?   @default(\"pending\")\n  created_at DateTime? @default(now()) @db.Timestamptz(6)\n  squads     squads?   @relation(fields: [squad_id], references: [id], onDelete: Cascade, onUpdate: NoAction)\n  profiles   profiles? @relation(fields: [user_id], references: [id], onDelete: Cascade, onUpdate: NoAction)\n\n  @@unique([squad_id, user_id])\n  @@schema(\"public\")\n}\n\n/// This model contains row level security and requires additional setup for migrations. Visit https://pris.ly/d/row-level-security for more info.\nmodel squad_members {\n  id        String    @id @default(dbgenerated(\"uuid_generate_v4()\")) @db.Uuid\n  squad_id  String?   @db.Uuid\n  user_id   String?   @db.Uuid\n  role      String?   @default(\"member\")\n  joined_at DateTime? @default(now()) @db.Timestamptz(6)\n  squads    squads?   @relation(fields: [squad_id], references: [id], onDelete: Cascade, onUpdate: NoAction)\n  profiles  profiles? @relation(fields: [user_id], references: [id], onDelete: Cascade, onUpdate: NoAction)\n\n  @@unique([squad_id, user_id])\n  @@schema(\"public\")\n}\n\n/// This model contains row level security and requires additional setup for migrations. Visit https://pris.ly/d/row-level-security for more info.\n\n// --- WORKSPACE SYSTEM ---\n\nmodel workspaces {\n  id               String                     @id @default(dbgenerated(\"uuid_generate_v4()\")) @db.Uuid\n  name             String\n  description      String?\n  icon_url         String?\n  category         String                     @default(\"Side Project\")\n  lifecycle_status workspace_lifecycle_status @default(IN_PROGRESS)\n  completed_at     DateTime?\n  result_type      String?\n  result_link      String?\n  result_note      String?\n\n  // Optional link to origin squad\n  from_squad_id String? @unique @db.Uuid\n\n  created_at DateTime @default(now())\n  updated_at DateTime @updatedAt\n\n  members workspace_members[]\n  invites workspace_invites[]\n\n  columns    kanban_columns[]\n  tags       kanban_tags[]\n  docs       workspace_docs[]\n  channels   workspace_channels[]\n  whiteboard workspace_whiteboards?\n\n  squad squads? @relation(fields: [from_squad_id], references: [id])\n\n  @@schema(\"public\")\n}\n\nenum workspace_lifecycle_status {\n  IN_PROGRESS\n  COMPLETED\n\n  @@schema(\"public\")\n}\n\nmodel workspace_members {\n  id           String @id @default(dbgenerated(\"uuid_generate_v4()\")) @db.Uuid\n  workspace_id String @db.Uuid\n  user_id      String @db.Uuid\n\n  role      String   @default(\"member\") // owner, admin, member, viewer\n  joined_at DateTime @default(now())\n\n  workspace workspaces @relation(fields: [workspace_id], references: [id], onDelete: Cascade)\n  user      profiles   @relation(fields: [user_id], references: [id], onDelete: Cascade)\n\n  @@unique([workspace_id, user_id])\n  @@index([user_id])\n  @@schema(\"public\")\n}\n\nmodel workspace_invites {\n  id           String @id @default(dbgenerated(\"uuid_generate_v4()\")) @db.Uuid\n  workspace_id String @db.Uuid\n  email        String\n  token        String @unique\n  role         String @default(\"member\")\n  inviter_id   String @db.Uuid\n\n  expires_at DateTime\n  created_at DateTime @default(now())\n\n  workspace workspaces @relation(fields: [workspace_id], references: [id], onDelete: Cascade)\n  inviter   profiles   @relation(fields: [inviter_id], references: [id])\n\n  @@schema(\"public\")\n}\n\n// --- FEATURES ---\n\nmodel kanban_columns {\n  id           String         @id @default(dbgenerated(\"uuid_generate_v4()\")) @db.Uuid\n  workspace_id String         @db.Uuid\n  title        String\n  category     String?        @default(\"todo\")\n  order        Int\n  tasks        kanban_tasks[]\n\n  workspace workspaces @relation(fields: [workspace_id], references: [id], onDelete: Cascade)\n\n  @@index([workspace_id, order])\n  @@schema(\"public\")\n}\n\nmodel kanban_tags {\n  id           String   @id @default(dbgenerated(\"uuid_generate_v4()\")) @db.Uuid\n  workspace_id String   @db.Uuid\n  name         String\n  color        String\n  created_at   DateTime @default(now())\n\n  workspace workspaces @relation(fields: [workspace_id], references: [id], onDelete: Cascade)\n\n  @@unique([workspace_id, name])\n  @@schema(\"public\")\n}\n\nmodel kanban_tasks {\n  id          String    @id @default(dbgenerated(\"uuid_generate_v4()\")) @db.Uuid\n  column_id   String    @db.Uuid\n  title       String\n  description String?\n  assignee_id String?   @db.Uuid\n  priority    String?   @default(\"medium\")\n  tags        String[]\n  order       Int\n  due_date    DateTime?\n  created_at  DateTime  @default(now())\n  updated_at  DateTime  @updatedAt\n\n  column   kanban_columns @relation(fields: [column_id], references: [id], onDelete: Cascade)\n  assignee profiles?      @relation(fields: [assignee_id], references: [id])\n\n  @@index([column_id, order])\n  @@index([assignee_id])\n  @@schema(\"public\")\n}\n\nmodel workspace_docs {\n  id           String   @id @default(dbgenerated(\"uuid_generate_v4()\")) @db.Uuid\n  workspace_id String   @db.Uuid\n  title        String\n  content      Json?    @db.Json\n  emoji        String?\n  cover_url    String?\n  parent_id    String?  @db.Uuid\n  is_archived  Boolean  @default(false)\n  author_id    String   @db.Uuid\n  created_at   DateTime @default(now())\n  updated_at   DateTime @updatedAt\n\n  workspace workspaces       @relation(fields: [workspace_id], references: [id], onDelete: Cascade)\n  author    profiles         @relation(fields: [author_id], references: [id])\n  parent    workspace_docs?  @relation(\"DocHierarchy\", fields: [parent_id], references: [id])\n  children  workspace_docs[] @relation(\"DocHierarchy\")\n\n  @@index([workspace_id, updated_at(sort: Desc)])\n  @@index([parent_id])\n  @@schema(\"public\")\n}\n\nmodel workspace_whiteboards {\n  id           String   @id @default(dbgenerated(\"uuid_generate_v4()\")) @db.Uuid\n  workspace_id String   @unique @db.Uuid\n  yjs_state    String? // base64-encoded Uint8Array from Y.encodeStateAsUpdate()\n  updated_at   DateTime @default(now()) @updatedAt\n\n  workspace workspaces @relation(fields: [workspace_id], references: [id], onDelete: Cascade)\n\n  @@schema(\"public\")\n}\n\nmodel workspace_channels {\n  id           String   @id @default(dbgenerated(\"uuid_generate_v4()\")) @db.Uuid\n  workspace_id String   @db.Uuid\n  name         String\n  description  String?\n  type         String   @default(\"PUBLIC\") // PUBLIC, PRIVATE\n  created_at   DateTime @default(now())\n  updated_at   DateTime @updatedAt\n\n  workspace workspaces           @relation(fields: [workspace_id], references: [id], onDelete: Cascade)\n  messages  workspace_messages[]\n\n  @@unique([workspace_id, name])\n  @@schema(\"public\")\n}\n\nmodel workspace_messages {\n  id         String   @id @default(dbgenerated(\"uuid_generate_v4()\")) @db.Uuid\n  channel_id String   @db.Uuid\n  sender_id  String   @db.Uuid\n  content    String\n  type       String   @default(\"TEXT\") // TEXT, IMAGE, SYSTEM\n  created_at DateTime @default(now())\n  updated_at DateTime @updatedAt\n\n  channel workspace_channels @relation(fields: [channel_id], references: [id], onDelete: Cascade)\n  sender  profiles           @relation(fields: [sender_id], references: [id], onDelete: Cascade)\n\n  @@index([channel_id, created_at])\n  @@schema(\"public\")\n}\n\n// --- GLOBAL NOTIFICATION SYSTEM ---\n\nmodel notifications {\n  id         String   @id @default(dbgenerated(\"uuid_generate_v4()\")) @db.Uuid\n  user_id    String   @db.Uuid\n  type       String // INVITE, SQUAD, COMMENT, SYSTEM\n  title      String\n  message    String\n  link       String?\n  is_read    Boolean  @default(false)\n  created_at DateTime @default(now())\n\n  user profiles @relation(fields: [user_id], references: [id], onDelete: Cascade)\n\n  @@index([user_id, created_at(sort: Desc)])\n  @@index([user_id, is_read])\n  @@schema(\"public\")\n}\n\n/// This model contains row level security and requires additional setup for migrations. Visit https://pris.ly/d/row-level-security for more info.\nmodel squads {\n  id                 String               @id @default(dbgenerated(\"uuid_generate_v4()\")) @db.Uuid\n  leader_id          String?              @db.Uuid\n  workspace          workspaces?\n  type               String\n  title              String\n  content            String\n  tech_stack         String[]             @default([])\n  capacity           Int?                 @default(4)\n  recruited_count    Int?                 @default(1)\n  place_type         String?              @default(\"online\")\n  location           String?\n  activity_id        String?\n  workspace_id       String?              @db.Uuid\n  status             String?              @default(\"recruiting\")\n  recruitment_period String?\n  created_at         DateTime?            @default(now()) @db.Timestamptz(6)\n  updated_at         DateTime?            @default(now()) @db.Timestamptz(6)\n  squad_applications squad_applications[]\n  squad_comments     squad_comments[]\n  squad_members      squad_members[]\n  profiles           profiles?            @relation(fields: [leader_id], references: [id], onDelete: Cascade, onUpdate: NoAction)\n\n  @@index([status, created_at(sort: Desc)])\n  @@index([type, created_at(sort: Desc)])\n  @@schema(\"public\")\n}\n\nenum aal_level {\n  aal1\n  aal2\n  aal3\n\n  @@schema(\"auth\")\n}\n\nenum code_challenge_method {\n  s256\n  plain\n\n  @@schema(\"auth\")\n}\n\nenum factor_status {\n  unverified\n  verified\n\n  @@schema(\"auth\")\n}\n\nenum factor_type {\n  totp\n  webauthn\n  phone\n\n  @@schema(\"auth\")\n}\n\nenum oauth_authorization_status {\n  pending\n  approved\n  denied\n  expired\n\n  @@schema(\"auth\")\n}\n\nenum oauth_client_type {\n  public\n  confidential\n\n  @@schema(\"auth\")\n}\n\nenum oauth_registration_type {\n  dynamic\n  manual\n\n  @@schema(\"auth\")\n}\n\nenum oauth_response_type {\n  code\n\n  @@schema(\"auth\")\n}\n\nenum one_time_token_type {\n  confirmation_token\n  reauthentication_token\n  recovery_token\n  email_change_token_new\n  email_change_token_current\n  phone_change_token\n\n  @@schema(\"auth\")\n}\n",
  "inlineSchemaHash": "14b177820cdb6e3f96b4d6fdbb155f607182038ae26aa8b04408820b52f86b5a",
  "copyEngine": true
}
config.dirname = '/'

config.runtimeDataModel = JSON.parse("{\"models\":{\"audit_log_entries\":{\"fields\":[{\"name\":\"instance_id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"payload\",\"kind\":\"scalar\",\"type\":\"Json\"},{\"name\":\"created_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"ip_address\",\"kind\":\"scalar\",\"type\":\"String\"}],\"dbName\":null},\"flow_state\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"user_id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"auth_code\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"code_challenge_method\",\"kind\":\"enum\",\"type\":\"code_challenge_method\"},{\"name\":\"code_challenge\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"provider_type\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"provider_access_token\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"provider_refresh_token\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"created_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updated_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"authentication_method\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"auth_code_issued_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"saml_relay_states\",\"kind\":\"object\",\"type\":\"saml_relay_states\",\"relationName\":\"flow_stateTosaml_relay_states\"}],\"dbName\":null},\"identities\":{\"fields\":[{\"name\":\"provider_id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"user_id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"identity_data\",\"kind\":\"scalar\",\"type\":\"Json\"},{\"name\":\"provider\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"last_sign_in_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"created_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updated_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"email\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"users\",\"kind\":\"object\",\"type\":\"users\",\"relationName\":\"identitiesTousers\"}],\"dbName\":null},\"instances\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"uuid\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"raw_base_config\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"created_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updated_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"mfa_amr_claims\":{\"fields\":[{\"name\":\"session_id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"created_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updated_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"authentication_method\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"sessions\",\"kind\":\"object\",\"type\":\"sessions\",\"relationName\":\"mfa_amr_claimsTosessions\"}],\"dbName\":null},\"mfa_challenges\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"factor_id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"created_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"verified_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"ip_address\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"otp_code\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"web_authn_session_data\",\"kind\":\"scalar\",\"type\":\"Json\"},{\"name\":\"mfa_factors\",\"kind\":\"object\",\"type\":\"mfa_factors\",\"relationName\":\"mfa_challengesTomfa_factors\"}],\"dbName\":null},\"mfa_factors\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"user_id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"friendly_name\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"factor_type\",\"kind\":\"enum\",\"type\":\"factor_type\"},{\"name\":\"status\",\"kind\":\"enum\",\"type\":\"factor_status\"},{\"name\":\"created_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updated_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"secret\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"phone\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"last_challenged_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"web_authn_credential\",\"kind\":\"scalar\",\"type\":\"Json\"},{\"name\":\"web_authn_aaguid\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"last_webauthn_challenge_data\",\"kind\":\"scalar\",\"type\":\"Json\"},{\"name\":\"mfa_challenges\",\"kind\":\"object\",\"type\":\"mfa_challenges\",\"relationName\":\"mfa_challengesTomfa_factors\"},{\"name\":\"users\",\"kind\":\"object\",\"type\":\"users\",\"relationName\":\"mfa_factorsTousers\"}],\"dbName\":null},\"oauth_authorizations\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"authorization_id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"client_id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"user_id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"redirect_uri\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"scope\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"state\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"resource\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"code_challenge\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"code_challenge_method\",\"kind\":\"enum\",\"type\":\"code_challenge_method\"},{\"name\":\"response_type\",\"kind\":\"enum\",\"type\":\"oauth_response_type\"},{\"name\":\"status\",\"kind\":\"enum\",\"type\":\"oauth_authorization_status\"},{\"name\":\"authorization_code\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"created_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"expires_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"approved_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"nonce\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"oauth_clients\",\"kind\":\"object\",\"type\":\"oauth_clients\",\"relationName\":\"oauth_authorizationsTooauth_clients\"},{\"name\":\"users\",\"kind\":\"object\",\"type\":\"users\",\"relationName\":\"oauth_authorizationsTousers\"}],\"dbName\":null},\"oauth_client_states\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"provider_type\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"code_verifier\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"created_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"oauth_clients\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"client_secret_hash\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"registration_type\",\"kind\":\"enum\",\"type\":\"oauth_registration_type\"},{\"name\":\"redirect_uris\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"grant_types\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"client_name\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"client_uri\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"logo_uri\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"created_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updated_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"deleted_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"client_type\",\"kind\":\"enum\",\"type\":\"oauth_client_type\"},{\"name\":\"oauth_authorizations\",\"kind\":\"object\",\"type\":\"oauth_authorizations\",\"relationName\":\"oauth_authorizationsTooauth_clients\"},{\"name\":\"oauth_consents\",\"kind\":\"object\",\"type\":\"oauth_consents\",\"relationName\":\"oauth_clientsTooauth_consents\"},{\"name\":\"sessions\",\"kind\":\"object\",\"type\":\"sessions\",\"relationName\":\"oauth_clientsTosessions\"}],\"dbName\":null},\"oauth_consents\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"user_id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"client_id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"scopes\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"granted_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"revoked_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"oauth_clients\",\"kind\":\"object\",\"type\":\"oauth_clients\",\"relationName\":\"oauth_clientsTooauth_consents\"},{\"name\":\"users\",\"kind\":\"object\",\"type\":\"users\",\"relationName\":\"oauth_consentsTousers\"}],\"dbName\":null},\"one_time_tokens\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"user_id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"token_type\",\"kind\":\"enum\",\"type\":\"one_time_token_type\"},{\"name\":\"token_hash\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"relates_to\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"created_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updated_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"users\",\"kind\":\"object\",\"type\":\"users\",\"relationName\":\"one_time_tokensTousers\"}],\"dbName\":null},\"refresh_tokens\":{\"fields\":[{\"name\":\"instance_id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"BigInt\"},{\"name\":\"token\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"user_id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"revoked\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"created_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updated_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"parent\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"session_id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"sessions\",\"kind\":\"object\",\"type\":\"sessions\",\"relationName\":\"refresh_tokensTosessions\"}],\"dbName\":null},\"saml_providers\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"sso_provider_id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"entity_id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"metadata_xml\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"metadata_url\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"attribute_mapping\",\"kind\":\"scalar\",\"type\":\"Json\"},{\"name\":\"created_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updated_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"name_id_format\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"sso_providers\",\"kind\":\"object\",\"type\":\"sso_providers\",\"relationName\":\"saml_providersTosso_providers\"}],\"dbName\":null},\"saml_relay_states\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"sso_provider_id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"request_id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"for_email\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"redirect_to\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"created_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updated_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"flow_state_id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"flow_state\",\"kind\":\"object\",\"type\":\"flow_state\",\"relationName\":\"flow_stateTosaml_relay_states\"},{\"name\":\"sso_providers\",\"kind\":\"object\",\"type\":\"sso_providers\",\"relationName\":\"saml_relay_statesTosso_providers\"}],\"dbName\":null},\"schema_migrations\":{\"fields\":[{\"name\":\"version\",\"kind\":\"scalar\",\"type\":\"String\"}],\"dbName\":null},\"sessions\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"user_id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"created_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updated_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"factor_id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"aal\",\"kind\":\"enum\",\"type\":\"aal_level\"},{\"name\":\"not_after\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"refreshed_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"user_agent\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"ip\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"tag\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"oauth_client_id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"refresh_token_hmac_key\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"refresh_token_counter\",\"kind\":\"scalar\",\"type\":\"BigInt\"},{\"name\":\"scopes\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"mfa_amr_claims\",\"kind\":\"object\",\"type\":\"mfa_amr_claims\",\"relationName\":\"mfa_amr_claimsTosessions\"},{\"name\":\"refresh_tokens\",\"kind\":\"object\",\"type\":\"refresh_tokens\",\"relationName\":\"refresh_tokensTosessions\"},{\"name\":\"oauth_clients\",\"kind\":\"object\",\"type\":\"oauth_clients\",\"relationName\":\"oauth_clientsTosessions\"},{\"name\":\"users\",\"kind\":\"object\",\"type\":\"users\",\"relationName\":\"sessionsTousers\"}],\"dbName\":null},\"sso_domains\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"sso_provider_id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"domain\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"created_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updated_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"sso_providers\",\"kind\":\"object\",\"type\":\"sso_providers\",\"relationName\":\"sso_domainsTosso_providers\"}],\"dbName\":null},\"sso_providers\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"resource_id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"created_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updated_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"disabled\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"saml_providers\",\"kind\":\"object\",\"type\":\"saml_providers\",\"relationName\":\"saml_providersTosso_providers\"},{\"name\":\"saml_relay_states\",\"kind\":\"object\",\"type\":\"saml_relay_states\",\"relationName\":\"saml_relay_statesTosso_providers\"},{\"name\":\"sso_domains\",\"kind\":\"object\",\"type\":\"sso_domains\",\"relationName\":\"sso_domainsTosso_providers\"}],\"dbName\":null},\"users\":{\"fields\":[{\"name\":\"instance_id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"aud\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"role\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"email\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"encrypted_password\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"email_confirmed_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"invited_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"confirmation_token\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"confirmation_sent_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"recovery_token\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"recovery_sent_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"email_change_token_new\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"email_change\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"email_change_sent_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"last_sign_in_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"raw_app_meta_data\",\"kind\":\"scalar\",\"type\":\"Json\"},{\"name\":\"raw_user_meta_data\",\"kind\":\"scalar\",\"type\":\"Json\"},{\"name\":\"is_super_admin\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"created_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updated_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"phone\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"phone_confirmed_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"phone_change\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"phone_change_token\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"phone_change_sent_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"confirmed_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"email_change_token_current\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"email_change_confirm_status\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"banned_until\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"reauthentication_token\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"reauthentication_sent_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"is_sso_user\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"deleted_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"is_anonymous\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"identities\",\"kind\":\"object\",\"type\":\"identities\",\"relationName\":\"identitiesTousers\"},{\"name\":\"mfa_factors\",\"kind\":\"object\",\"type\":\"mfa_factors\",\"relationName\":\"mfa_factorsTousers\"},{\"name\":\"oauth_authorizations\",\"kind\":\"object\",\"type\":\"oauth_authorizations\",\"relationName\":\"oauth_authorizationsTousers\"},{\"name\":\"oauth_consents\",\"kind\":\"object\",\"type\":\"oauth_consents\",\"relationName\":\"oauth_consentsTousers\"},{\"name\":\"one_time_tokens\",\"kind\":\"object\",\"type\":\"one_time_tokens\",\"relationName\":\"one_time_tokensTousers\"},{\"name\":\"sessions\",\"kind\":\"object\",\"type\":\"sessions\",\"relationName\":\"sessionsTousers\"},{\"name\":\"profiles\",\"kind\":\"object\",\"type\":\"profiles\",\"relationName\":\"profilesTousers\"}],\"dbName\":null},\"blogs\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"title\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"summary\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"author\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"tags\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"published_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"thumbnail_url\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"external_url\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"views\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"created_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updated_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"blog_type\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"category\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"bookmarks\",\"kind\":\"object\",\"type\":\"blog_bookmarks\",\"relationName\":\"blog_bookmarksToblogs\"}],\"dbName\":null},\"comments\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"post_id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"author_id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"content\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"parent_id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"is_accepted\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"created_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updated_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"profiles\",\"kind\":\"object\",\"type\":\"profiles\",\"relationName\":\"commentsToprofiles\"},{\"name\":\"comments\",\"kind\":\"object\",\"type\":\"comments\",\"relationName\":\"commentsTocomments\"},{\"name\":\"other_comments\",\"kind\":\"object\",\"type\":\"comments\",\"relationName\":\"commentsTocomments\"},{\"name\":\"posts\",\"kind\":\"object\",\"type\":\"posts\",\"relationName\":\"commentsToposts\"}],\"dbName\":null},\"squad_comments\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"squad_id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"author_id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"content\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"parent_id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"created_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updated_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"profiles\",\"kind\":\"object\",\"type\":\"profiles\",\"relationName\":\"profilesTosquad_comments\"},{\"name\":\"squads\",\"kind\":\"object\",\"type\":\"squads\",\"relationName\":\"squad_commentsTosquads\"},{\"name\":\"squad_comments\",\"kind\":\"object\",\"type\":\"squad_comments\",\"relationName\":\"squad_commentsTosquad_comments\"},{\"name\":\"other_squad_comments\",\"kind\":\"object\",\"type\":\"squad_comments\",\"relationName\":\"squad_commentsTosquad_comments\"}],\"dbName\":null},\"posts\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"author_id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"title\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"content\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"category\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"tags\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"views\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"likes\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"has_accepted_answer\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"created_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updated_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"comments\",\"kind\":\"object\",\"type\":\"comments\",\"relationName\":\"commentsToposts\"},{\"name\":\"profiles\",\"kind\":\"object\",\"type\":\"profiles\",\"relationName\":\"postsToprofiles\"}],\"dbName\":null},\"profiles\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"handle\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"nickname\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"avatar_url\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"bio\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"reputation\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"tier\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"tech_stack\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"created_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updated_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"comments\",\"kind\":\"object\",\"type\":\"comments\",\"relationName\":\"commentsToprofiles\"},{\"name\":\"posts\",\"kind\":\"object\",\"type\":\"posts\",\"relationName\":\"postsToprofiles\"},{\"name\":\"squad_comments\",\"kind\":\"object\",\"type\":\"squad_comments\",\"relationName\":\"profilesTosquad_comments\"},{\"name\":\"users\",\"kind\":\"object\",\"type\":\"users\",\"relationName\":\"profilesTousers\"},{\"name\":\"squad_applications\",\"kind\":\"object\",\"type\":\"squad_applications\",\"relationName\":\"profilesTosquad_applications\"},{\"name\":\"squad_members\",\"kind\":\"object\",\"type\":\"squad_members\",\"relationName\":\"profilesTosquad_members\"},{\"name\":\"squads\",\"kind\":\"object\",\"type\":\"squads\",\"relationName\":\"profilesTosquads\"},{\"name\":\"workspace_members\",\"kind\":\"object\",\"type\":\"workspace_members\",\"relationName\":\"profilesToworkspace_members\"},{\"name\":\"workspace_invites\",\"kind\":\"object\",\"type\":\"workspace_invites\",\"relationName\":\"profilesToworkspace_invites\"},{\"name\":\"workspace_docs\",\"kind\":\"object\",\"type\":\"workspace_docs\",\"relationName\":\"profilesToworkspace_docs\"},{\"name\":\"kanban_tasks\",\"kind\":\"object\",\"type\":\"kanban_tasks\",\"relationName\":\"kanban_tasksToprofiles\"},{\"name\":\"notifications\",\"kind\":\"object\",\"type\":\"notifications\",\"relationName\":\"notificationsToprofiles\"},{\"name\":\"messages\",\"kind\":\"object\",\"type\":\"workspace_messages\",\"relationName\":\"profilesToworkspace_messages\"},{\"name\":\"blog_bookmarks\",\"kind\":\"object\",\"type\":\"blog_bookmarks\",\"relationName\":\"blog_bookmarksToprofiles\"},{\"name\":\"resume_profile\",\"kind\":\"object\",\"type\":\"user_resume_profiles\",\"relationName\":\"profilesTouser_resume_profiles\"},{\"name\":\"workspace_settings\",\"kind\":\"object\",\"type\":\"user_workspace_settings\",\"relationName\":\"profilesTouser_workspace_settings\"},{\"name\":\"activity_events\",\"kind\":\"object\",\"type\":\"user_activity_events\",\"relationName\":\"profilesTouser_activity_events\"},{\"name\":\"reputation_events\",\"kind\":\"object\",\"type\":\"reputation_events\",\"relationName\":\"profilesToreputation_events\"},{\"name\":\"resumes\",\"kind\":\"object\",\"type\":\"user_resumes\",\"relationName\":\"profilesTouser_resumes\"}],\"dbName\":null},\"user_resumes\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"user_id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"title\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"resume_payload\",\"kind\":\"scalar\",\"type\":\"Json\"},{\"name\":\"public_summary\",\"kind\":\"scalar\",\"type\":\"Json\"},{\"name\":\"is_active\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"source_type\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"source_file_name\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"created_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updated_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"profiles\",\"kind\":\"object\",\"type\":\"profiles\",\"relationName\":\"profilesTouser_resumes\"}],\"dbName\":null},\"user_resume_profiles\":{\"fields\":[{\"name\":\"user_id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"resume_payload\",\"kind\":\"scalar\",\"type\":\"Json\"},{\"name\":\"public_summary\",\"kind\":\"scalar\",\"type\":\"Json\"},{\"name\":\"source_type\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"source_file_name\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"created_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updated_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"profiles\",\"kind\":\"object\",\"type\":\"profiles\",\"relationName\":\"profilesTouser_resume_profiles\"}],\"dbName\":null},\"user_workspace_settings\":{\"fields\":[{\"name\":\"user_id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"settings_payload\",\"kind\":\"scalar\",\"type\":\"Json\"},{\"name\":\"public_summary\",\"kind\":\"scalar\",\"type\":\"Json\"},{\"name\":\"created_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updated_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"profiles\",\"kind\":\"object\",\"type\":\"profiles\",\"relationName\":\"profilesTouser_workspace_settings\"}],\"dbName\":null},\"blog_bookmarks\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"user_id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"blog_id\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"created_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"profiles\",\"kind\":\"object\",\"type\":\"profiles\",\"relationName\":\"blog_bookmarksToprofiles\"},{\"name\":\"blogs\",\"kind\":\"object\",\"type\":\"blogs\",\"relationName\":\"blog_bookmarksToblogs\"}],\"dbName\":null},\"user_activity_events\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"user_id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"event_type\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"ref_id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"created_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"profiles\",\"kind\":\"object\",\"type\":\"profiles\",\"relationName\":\"profilesTouser_activity_events\"}],\"dbName\":null},\"reputation_events\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"user_id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"event_type\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"delta\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"source_type\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"source_id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"actor_id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"dedupe_key\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"metadata\",\"kind\":\"scalar\",\"type\":\"Json\"},{\"name\":\"created_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"profiles\",\"kind\":\"object\",\"type\":\"profiles\",\"relationName\":\"profilesToreputation_events\"}],\"dbName\":null},\"squad_applications\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"squad_id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"user_id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"message\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"created_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"squads\",\"kind\":\"object\",\"type\":\"squads\",\"relationName\":\"squad_applicationsTosquads\"},{\"name\":\"profiles\",\"kind\":\"object\",\"type\":\"profiles\",\"relationName\":\"profilesTosquad_applications\"}],\"dbName\":null},\"squad_members\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"squad_id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"user_id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"role\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"joined_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"squads\",\"kind\":\"object\",\"type\":\"squads\",\"relationName\":\"squad_membersTosquads\"},{\"name\":\"profiles\",\"kind\":\"object\",\"type\":\"profiles\",\"relationName\":\"profilesTosquad_members\"}],\"dbName\":null},\"workspaces\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"name\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"description\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"icon_url\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"category\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"lifecycle_status\",\"kind\":\"enum\",\"type\":\"workspace_lifecycle_status\"},{\"name\":\"completed_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"result_type\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"result_link\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"result_note\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"from_squad_id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"created_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updated_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"members\",\"kind\":\"object\",\"type\":\"workspace_members\",\"relationName\":\"workspace_membersToworkspaces\"},{\"name\":\"invites\",\"kind\":\"object\",\"type\":\"workspace_invites\",\"relationName\":\"workspace_invitesToworkspaces\"},{\"name\":\"columns\",\"kind\":\"object\",\"type\":\"kanban_columns\",\"relationName\":\"kanban_columnsToworkspaces\"},{\"name\":\"tags\",\"kind\":\"object\",\"type\":\"kanban_tags\",\"relationName\":\"kanban_tagsToworkspaces\"},{\"name\":\"docs\",\"kind\":\"object\",\"type\":\"workspace_docs\",\"relationName\":\"workspace_docsToworkspaces\"},{\"name\":\"channels\",\"kind\":\"object\",\"type\":\"workspace_channels\",\"relationName\":\"workspace_channelsToworkspaces\"},{\"name\":\"whiteboard\",\"kind\":\"object\",\"type\":\"workspace_whiteboards\",\"relationName\":\"workspace_whiteboardsToworkspaces\"},{\"name\":\"squad\",\"kind\":\"object\",\"type\":\"squads\",\"relationName\":\"squadsToworkspaces\"}],\"dbName\":null},\"workspace_members\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"workspace_id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"user_id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"role\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"joined_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"workspace\",\"kind\":\"object\",\"type\":\"workspaces\",\"relationName\":\"workspace_membersToworkspaces\"},{\"name\":\"user\",\"kind\":\"object\",\"type\":\"profiles\",\"relationName\":\"profilesToworkspace_members\"}],\"dbName\":null},\"workspace_invites\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"workspace_id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"email\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"token\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"role\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"inviter_id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"expires_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"created_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"workspace\",\"kind\":\"object\",\"type\":\"workspaces\",\"relationName\":\"workspace_invitesToworkspaces\"},{\"name\":\"inviter\",\"kind\":\"object\",\"type\":\"profiles\",\"relationName\":\"profilesToworkspace_invites\"}],\"dbName\":null},\"kanban_columns\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"workspace_id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"title\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"category\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"order\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"tasks\",\"kind\":\"object\",\"type\":\"kanban_tasks\",\"relationName\":\"kanban_columnsTokanban_tasks\"},{\"name\":\"workspace\",\"kind\":\"object\",\"type\":\"workspaces\",\"relationName\":\"kanban_columnsToworkspaces\"}],\"dbName\":null},\"kanban_tags\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"workspace_id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"name\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"color\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"created_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"workspace\",\"kind\":\"object\",\"type\":\"workspaces\",\"relationName\":\"kanban_tagsToworkspaces\"}],\"dbName\":null},\"kanban_tasks\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"column_id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"title\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"description\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"assignee_id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"priority\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"tags\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"order\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"due_date\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"created_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updated_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"column\",\"kind\":\"object\",\"type\":\"kanban_columns\",\"relationName\":\"kanban_columnsTokanban_tasks\"},{\"name\":\"assignee\",\"kind\":\"object\",\"type\":\"profiles\",\"relationName\":\"kanban_tasksToprofiles\"}],\"dbName\":null},\"workspace_docs\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"workspace_id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"title\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"content\",\"kind\":\"scalar\",\"type\":\"Json\"},{\"name\":\"emoji\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"cover_url\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"parent_id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"is_archived\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"author_id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"created_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updated_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"workspace\",\"kind\":\"object\",\"type\":\"workspaces\",\"relationName\":\"workspace_docsToworkspaces\"},{\"name\":\"author\",\"kind\":\"object\",\"type\":\"profiles\",\"relationName\":\"profilesToworkspace_docs\"},{\"name\":\"parent\",\"kind\":\"object\",\"type\":\"workspace_docs\",\"relationName\":\"DocHierarchy\"},{\"name\":\"children\",\"kind\":\"object\",\"type\":\"workspace_docs\",\"relationName\":\"DocHierarchy\"}],\"dbName\":null},\"workspace_whiteboards\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"workspace_id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"yjs_state\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"updated_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"workspace\",\"kind\":\"object\",\"type\":\"workspaces\",\"relationName\":\"workspace_whiteboardsToworkspaces\"}],\"dbName\":null},\"workspace_channels\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"workspace_id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"name\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"description\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"type\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"created_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updated_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"workspace\",\"kind\":\"object\",\"type\":\"workspaces\",\"relationName\":\"workspace_channelsToworkspaces\"},{\"name\":\"messages\",\"kind\":\"object\",\"type\":\"workspace_messages\",\"relationName\":\"workspace_channelsToworkspace_messages\"}],\"dbName\":null},\"workspace_messages\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"channel_id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"sender_id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"content\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"type\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"created_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updated_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"channel\",\"kind\":\"object\",\"type\":\"workspace_channels\",\"relationName\":\"workspace_channelsToworkspace_messages\"},{\"name\":\"sender\",\"kind\":\"object\",\"type\":\"profiles\",\"relationName\":\"profilesToworkspace_messages\"}],\"dbName\":null},\"notifications\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"user_id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"type\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"title\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"message\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"link\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"is_read\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"created_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"user\",\"kind\":\"object\",\"type\":\"profiles\",\"relationName\":\"notificationsToprofiles\"}],\"dbName\":null},\"squads\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"leader_id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"workspace\",\"kind\":\"object\",\"type\":\"workspaces\",\"relationName\":\"squadsToworkspaces\"},{\"name\":\"type\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"title\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"content\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"tech_stack\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"capacity\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"recruited_count\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"place_type\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"location\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"activity_id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"workspace_id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"recruitment_period\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"created_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updated_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"squad_applications\",\"kind\":\"object\",\"type\":\"squad_applications\",\"relationName\":\"squad_applicationsTosquads\"},{\"name\":\"squad_comments\",\"kind\":\"object\",\"type\":\"squad_comments\",\"relationName\":\"squad_commentsTosquads\"},{\"name\":\"squad_members\",\"kind\":\"object\",\"type\":\"squad_members\",\"relationName\":\"squad_membersTosquads\"},{\"name\":\"profiles\",\"kind\":\"object\",\"type\":\"profiles\",\"relationName\":\"profilesTosquads\"}],\"dbName\":null}},\"enums\":{},\"types\":{}}")
defineDmmfProperty(exports.Prisma, config.runtimeDataModel)
config.engineWasm = {
  getRuntime: () => require('./query_engine_bg.js'),
  getQueryEngineWasmModule: async () => {
    const loader = (await import('#wasm-engine-loader')).default
    const engine = (await loader).default
    return engine 
  }
}

config.injectableEdgeEnv = () => ({
  parsed: {
    DATABASE_URL: typeof globalThis !== 'undefined' && globalThis['DATABASE_URL'] || typeof process !== 'undefined' && process.env && process.env.DATABASE_URL || undefined
  }
})

if (typeof globalThis !== 'undefined' && globalThis['DEBUG'] || typeof process !== 'undefined' && process.env && process.env.DEBUG || undefined) {
  Debug.enable(typeof globalThis !== 'undefined' && globalThis['DEBUG'] || typeof process !== 'undefined' && process.env && process.env.DEBUG || undefined)
}

const PrismaClient = getPrismaClient(config)
exports.PrismaClient = PrismaClient
Object.assign(exports, Prisma)

