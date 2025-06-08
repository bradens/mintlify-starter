/**
 * Dependency Injection Symbols
 *
 * These symbols match the server-side SYMBOLS structure to ensure
 * consistency between server and dashboard implementations.
 */
export const SYMBOLS = {
  // Service Symbols
  AdminUserService: Symbol.for("AdminUserService"),
  ApiKeyService: Symbol.for("ApiKeyService"),
  ApiProductService: Symbol.for("ApiProductService"),
  ApiSubscriptionService: Symbol.for("ApiSubscriptionService"),
  ApiUsageService: Symbol.for("ApiUsageService"),
  ApiUserService: Symbol.for("ApiUserService"),
  BlockedDomainService: Symbol.for("BlockedDomainService"),
  MetricsCacheService: Symbol.for("MetricsCacheService"),
  StripeEventService: Symbol.for("StripeEventService"),
  UsageLimitService: Symbol.for("UsageLimitService"),
  VerifyMailService: Symbol.for("VerifyMailService"),

  // Client Symbols
  CognitoClient: Symbol.for("CognitoClient"),

  // Action/Handler Symbols
  CreateApiKey: Symbol.for("CreateApiKey"),
  CreateBillingSession: Symbol.for("CreateBillingSession"),
  CreateCheckoutSession: Symbol.for("CreateCheckoutSession"),
  CreateSubscription: Symbol.for("CreateSubscription"),
  DeleteApiKey: Symbol.for("DeleteApiKey"),
  GetAccountUsage: Symbol.for("GetAccountUsage"),
  GetApiKey: Symbol.for("GetApiKey"),
  GetApiKeys: Symbol.for("GetApiKeys"),
  GetProducts: Symbol.for("GetProducts"),
  GetSubscription: Symbol.for("GetSubscription"),
  GetUsage: Symbol.for("GetUsage"),
  GetUsageLimits: Symbol.for("GetUsageLimits"),
  GetUsagePlan: Symbol.for("GetUsagePlan"),
  GetUser: Symbol.for("GetUser"),
  HandleCognitoEvent: Symbol.for("HandleCognitoEvent"),
  HandleStripeEvent: Symbol.for("HandleStripeEvent"),
  UpdateApiKey: Symbol.for("UpdateApiKey"),
  UpdateSuperStatus: Symbol.for("UpdateSuperStatus"),
  UpdateUsageLimit: Symbol.for("UpdateUsageLimit"),
  UpdateUser: Symbol.for("UpdateUser"),
  BlockDomain: Symbol.for("BlockDomain"),

  // Configuration & Error Handling
  SentryWrapper: Symbol.for("SentryWrapper"),
  SentryWrapperConfig: Symbol.for("SentryWrapperConfig"),
} as const;

// Type for ensuring symbol keys are available at compile time
export type SymbolKeys = keyof typeof SYMBOLS;