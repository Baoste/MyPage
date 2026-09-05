import "server-only";

import { isServerSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { PrivateNotification, PrivateNotificationKind, PrivateNotificationRow } from "@/types";

const NOTIFICATION_LIMIT = 40;

function isMissingNotificationSchema(error: { code?: string } | null) {
  return Boolean(error?.code && ["42P01", "PGRST200", "PGRST204", "PGRST205"].includes(error.code));
}

function cleanLabel(value: string | null | undefined, fallback: string) {
  const cleaned = value?.trim().replace(/\s+/gu, " ");
  return (cleaned || fallback).slice(0, 160);
}

function cleanExcerpt(value: string) {
  return value.trim().replace(/\s+/gu, " ").slice(0, 240);
}

function mapNotification(row: PrivateNotificationRow): PrivateNotification {
  return {
    id: row.id,
    kind: row.kind,
    actorUsername: row.actor_username,
    resourceType: row.resource_type,
    resourceId: row.resource_id,
    resourceLabel: row.resource_label,
    commentExcerpt: row.comment_excerpt ?? undefined,
    readAt: row.read_at ?? undefined,
    createdAt: row.created_at,
  };
}

export async function createPublishedNotifications(input: {
  resourceType: "photo" | "food";
  resourceId: string;
  resourceLabel?: string | null;
  actorUserId: string;
  actorUsername: string;
}) {
  if (!isServerSupabaseConfigured()) return;
  const client = createServerSupabaseClient();
  const { data: recipients, error: recipientsError } = await client
    .from("private_users")
    .select("id")
    .is("disabled_at", null)
    .neq("id", input.actorUserId);
  if (recipientsError) throw recipientsError;
  if (!recipients?.length) return;
  const kind: PrivateNotificationKind = input.resourceType === "photo" ? "photo_published" : "food_published";
  const label = cleanLabel(input.resourceLabel, input.resourceType === "photo" ? "新照片" : "新美食记录");
  const eventKey = `${input.resourceType}:${input.resourceId}:published`;
  const { error } = await client.from("private_notifications").upsert(
    recipients.map((recipient) => ({
      recipient_user_id: recipient.id,
      actor_user_id: input.actorUserId,
      actor_username: input.actorUsername,
      kind,
      resource_type: input.resourceType,
      resource_id: input.resourceId,
      resource_label: label,
      comment_excerpt: null,
      event_key: eventKey,
    })),
    { onConflict: "recipient_user_id,event_key", ignoreDuplicates: true },
  );
  if (error && !isMissingNotificationSchema(error)) throw error;
}

export async function createCommentNotification(input: {
  resourceType: "photo" | "food";
  resourceId: string;
  resourceLabel?: string | null;
  commentId: string;
  comment: string;
  recipientUserId: string | null;
  actorUserId: string;
  actorUsername: string;
}) {
  if (!input.recipientUserId || input.recipientUserId === input.actorUserId || !isServerSupabaseConfigured()) return;
  const client = createServerSupabaseClient();
  const kind: PrivateNotificationKind = input.resourceType === "photo" ? "photo_commented" : "food_commented";
  const { error } = await client.from("private_notifications").upsert({
    recipient_user_id: input.recipientUserId,
    actor_user_id: input.actorUserId,
    actor_username: input.actorUsername,
    kind,
    resource_type: input.resourceType,
    resource_id: input.resourceId,
    resource_label: cleanLabel(input.resourceLabel, input.resourceType === "photo" ? "照片" : "美食记录"),
    comment_excerpt: cleanExcerpt(input.comment),
    event_key: `${input.resourceType}:comment:${input.commentId}`,
  }, { onConflict: "recipient_user_id,event_key", ignoreDuplicates: true });
  if (error && !isMissingNotificationSchema(error)) throw error;
}

export async function getPrivateNotifications(userId: string) {
  if (!isServerSupabaseConfigured()) return { notifications: [], unreadCount: 0, available: false };
  const client = createServerSupabaseClient();
  const [{ data, error }, { count, error: countError }] = await Promise.all([
    client.from("private_notifications").select("*").eq("recipient_user_id", userId)
      .order("created_at", { ascending: false }).limit(NOTIFICATION_LIMIT),
    client.from("private_notifications").select("id", { count: "exact", head: true })
      .eq("recipient_user_id", userId).is("read_at", null),
  ]);
  if (error || countError) {
    if (isMissingNotificationSchema(error) || isMissingNotificationSchema(countError)) {
      return { notifications: [], unreadCount: 0, available: false };
    }
    throw error ?? countError;
  }
  return {
    notifications: ((data ?? []) as PrivateNotificationRow[]).map(mapNotification),
    unreadCount: count ?? 0,
    available: true,
  };
}

export async function markPrivateNotificationsRead(userId: string) {
  if (!isServerSupabaseConfigured()) return;
  const client = createServerSupabaseClient();
  const { error } = await client.from("private_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_user_id", userId)
    .is("read_at", null);
  if (error && !isMissingNotificationSchema(error)) throw error;
}
