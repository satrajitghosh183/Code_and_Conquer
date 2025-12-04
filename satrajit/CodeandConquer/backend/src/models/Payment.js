/**
 * Payment and Subscription Models
 * Represents subscriptions, transactions, customers, and entitlements
 */

export class Subscription {
  constructor(data) {
    this.id = data.id;
    this.userId = data.user_id;
    this.membershipType = data.membership_type || 'free';
    this.paymentStatus = data.payment_status || 'pending';
    this.startDate = data.start_date || new Date().toISOString();
    this.endDate = data.end_date || null;
    this.renewalDate = data.renewal_date || null;
    this.stripeSubscriptionId = data.stripe_subscription_id || null;
    this.stripeCustomerId = data.stripe_customer_id || null;
    this.stripePriceId = data.stripe_price_id || null;
    this.autoRenewal = data.auto_renewal ?? true;
    this.status = data.status || 'active'; // active, canceled, expired
    this.priceId = data.price_id || null;
    this.currentPeriodStart = data.current_period_start || null;
    this.currentPeriodEnd = data.current_period_end || null;
    this.canceledAt = data.canceled_at || null;
    this.createdAt = data.created_at || new Date().toISOString();
    this.updatedAt = data.updated_at || new Date().toISOString();
  }

  toJSON() {
    return {
      id: this.id,
      user_id: this.userId,
      membership_type: this.membershipType,
      payment_status: this.paymentStatus,
      start_date: this.startDate,
      end_date: this.endDate,
      renewal_date: this.renewalDate,
      stripe_subscription_id: this.stripeSubscriptionId,
      stripe_customer_id: this.stripeCustomerId,
      stripe_price_id: this.stripePriceId,
      auto_renewal: this.autoRenewal,
      status: this.status,
      price_id: this.priceId,
      current_period_start: this.currentPeriodStart,
      current_period_end: this.currentPeriodEnd,
      canceled_at: this.canceledAt,
      created_at: this.createdAt,
      updated_at: this.updatedAt,
    };
  }
}

export class Customer {
  constructor(data) {
    this.id = data.id;
    this.userId = data.user_id;
    this.stripeCustomerId = data.stripe_customer_id;
    this.createdAt = data.created_at || new Date().toISOString();
  }

  toJSON() {
    return {
      id: this.id,
      user_id: this.userId,
      stripe_customer_id: this.stripeCustomerId,
      created_at: this.createdAt,
    };
  }
}

export class Transaction {
  constructor(data) {
    this.id = data.id;
    this.userId = data.user_id;
    this.amount = data.amount || 0;
    this.currency = data.currency || 'USD';
    this.paymentMethod = data.payment_method || null;
    this.paymentProviderId = data.payment_provider_id || null;
    this.transactionType = data.transaction_type; // subscription, one_time, refund
    this.status = data.status || 'pending'; // pending, completed, failed
    this.createdAt = data.created_at || new Date().toISOString();
  }

  toJSON() {
    return {
      id: this.id,
      user_id: this.userId,
      amount: this.amount,
      currency: this.currency,
      payment_method: this.paymentMethod,
      payment_provider_id: this.paymentProviderId,
      transaction_type: this.transactionType,
      status: this.status,
      created_at: this.createdAt,
    };
  }
}

export class Entitlement {
  constructor(data) {
    this.id = data.id;
    this.userId = data.user_id;
    this.feature = data.feature; // premium_problems, ad_free, etc.
    this.expiresAt = data.expires_at || null;
    this.createdAt = data.created_at || new Date().toISOString();
  }

  toJSON() {
    return {
      id: this.id,
      user_id: this.userId,
      feature: this.feature,
      expires_at: this.expiresAt,
      created_at: this.createdAt,
    };
  }
}

