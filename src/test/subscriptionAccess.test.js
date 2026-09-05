import { describe, it, expect } from 'vitest';
import { hasActiveWindow, hasPaidPlan, hasPaidAccess } from '../utils/subscriptionAccess';

const daysFromNow = (n) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

describe('hasActiveWindow', () => {
  it('grants access to an active subscription inside its period', () => {
    expect(hasActiveWindow({ status: 'active', endDate: daysFromNow(10) })).toBe(true);
  });

  it('grants access to an active subscription with no endDate (admin grant)', () => {
    expect(hasActiveWindow({ status: 'active', endDate: null })).toBe(true);
  });

  it('refuses an active subscription whose period has already passed', () => {
    // Stale data, not entitlement — requireSubscription treats this as expired
    // and the UI must agree.
    expect(hasActiveWindow({ status: 'active', endDate: daysFromNow(-1) })).toBe(false);
  });

  it('grants access to a cancelled subscription still inside its paid period', () => {
    expect(hasActiveWindow({ status: 'cancelled', endDate: daysFromNow(5) })).toBe(true);
  });

  it('refuses a cancelled subscription past its period', () => {
    expect(hasActiveWindow({ status: 'cancelled', endDate: daysFromNow(-1) })).toBe(false);
  });

  it('refuses a cancelled subscription with no endDate', () => {
    // No paid period to retain.
    expect(hasActiveWindow({ status: 'cancelled', endDate: null })).toBe(false);
  });

  it('grants access to past_due INSIDE the paid period', () => {
    // The failed renewal is for the NEXT period; this one was paid for.
    expect(hasActiveWindow({ status: 'past_due', endDate: daysFromNow(5) })).toBe(true);
  });

  it('refuses past_due once the paid period has ended (grace is zero)', () => {
    // The regression this file exists to prevent: a 10-day grace here while the
    // server enforces zero means the UI says Active and downloads return 403.
    expect(hasActiveWindow({ status: 'past_due', endDate: daysFromNow(-1) })).toBe(false);
    expect(hasActiveWindow({ status: 'past_due', endDate: daysFromNow(-5) })).toBe(false);
    expect(hasActiveWindow({ status: 'past_due', endDate: daysFromNow(-9) })).toBe(false);
  });

  it('refuses expired and inactive outright', () => {
    expect(hasActiveWindow({ status: 'expired', endDate: daysFromNow(5) })).toBe(false);
    expect(hasActiveWindow({ status: 'inactive', endDate: daysFromNow(5) })).toBe(false);
  });

  it('handles a missing or empty subscription', () => {
    expect(hasActiveWindow(null)).toBe(false);
    expect(hasActiveWindow(undefined)).toBe(false);
    expect(hasActiveWindow({})).toBe(false);
  });
});

describe('hasPaidPlan', () => {
  it('accepts a Stripe planId', () => {
    expect(hasPaidPlan({ planId: 'individual_monthly' })).toBe(true);
  });

  it('accepts an admin grant carrying only a plan name', () => {
    expect(hasPaidPlan({ planId: null, plan: 'premium' })).toBe(true);
  });

  it("rejects 'free' on BOTH fields", () => {
    // 'free' is a truthy string — testing planId truthiness alone once let a
    // free-plan account through.
    expect(hasPaidPlan({ planId: 'free' })).toBe(false);
    expect(hasPaidPlan({ plan: 'free' })).toBe(false);
    expect(hasPaidPlan({ planId: 'free', plan: 'free' })).toBe(false);
  });

  it('rejects an empty or missing subscription', () => {
    expect(hasPaidPlan({})).toBe(false);
    expect(hasPaidPlan(null)).toBe(false);
  });
});

describe('hasPaidAccess', () => {
  it('requires both a paid plan and a live window', () => {
    expect(hasPaidAccess({ planId: 'individual_monthly', status: 'active', endDate: daysFromNow(5) })).toBe(true);
    // plan but no window
    expect(hasPaidAccess({ planId: 'individual_monthly', status: 'expired', endDate: daysFromNow(5) })).toBe(false);
    // window but no plan — the "paid but still shows Free" shape
    expect(hasPaidAccess({ planId: null, status: 'active', endDate: daysFromNow(5) })).toBe(false);
  });
});
