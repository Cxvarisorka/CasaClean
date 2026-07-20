import { request } from "@/services/api";

/*
 * Subscription API
 * ----------------
 * The subscription endpoints already return camelCase model fields. Keep that
 * contract here (unlike the legacy admin mapper) so profile components never
 * have to guess whether a field came from Mongo populated or as a raw id.
 */

const idOf = (value) => (value && typeof value === "object" ? value._id : value);
const nameOf = (value) => (value && typeof value === "object" ? value.name : "");

export function subscriptionFromApi(subscription) {
  return {
    _id: subscription._id,
    serviceId: idOf(subscription.serviceId),
    serviceName: nameOf(subscription.serviceId),
    cityId: idOf(subscription.cityId),
    cityName: nameOf(subscription.cityId),
    intervalDays: Number(subscription.intervalDays) || 0,
    status: subscription.status,
    pausedReason: subscription.pausedReason ?? null,
    nextServiceDate: subscription.nextServiceDate,
    nextChargeAt: subscription.nextChargeAt ?? null,
    failedAttempts: Number(subscription.failedAttempts) || 0,
    lastChargeStatus: subscription.lastChargeStatus ?? null,
    lastChargeAt: subscription.lastChargeAt ?? null,
    lastError: subscription.lastError ?? null,
    lastCycleAmount: subscription.lastCycleAmount ?? null,
    chargeAttempts: subscription.chargeAttempts ?? [],
    createdAt: subscription.createdAt,
    cancelledAt: subscription.cancelledAt ?? null,
  };
}

export async function listMySubscriptions() {
  const data = await request({ method: "GET", url: "/subscription/my" });
  return (data?.subscriptions ?? []).map(subscriptionFromApi);
}

async function subscriptionAction(id, action) {
  const data = await request({ method: "PATCH", url: `/subscription/${id}/${action}` });
  return subscriptionFromApi(data?.subscription ?? data);
}

export const pauseSubscription = (id) => subscriptionAction(id, "pause");
export const resumeSubscription = (id) => subscriptionAction(id, "resume");
export const cancelSubscription = (id) => subscriptionAction(id, "cancel");

export async function updateSubscriptionCard(id, paymentMethodId) {
  const data = await request({
    method: "PATCH",
    url: `/subscription/${id}/payment-method`,
    data: { paymentMethodId },
  });
  return subscriptionFromApi(data?.subscription ?? data);
}
