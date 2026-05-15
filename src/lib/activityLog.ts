import { supabase } from './supabaseClient'

export type ActivityEntityType = 'timeline'
export type ActivityActionType = 'update' | 'delete'

interface LogActivityInput {
  coupleId: string
  actorId: string
  entityType: ActivityEntityType
  actionType: ActivityActionType
  entityId?: string | null
  entityTitle?: string | null
}

export async function logActivityEvent(input: LogActivityInput) {
  try {
    await supabase
      .from('activity_events')
      .insert({
        couple_id: input.coupleId,
        actor_id: input.actorId,
        entity_type: input.entityType,
        action_type: input.actionType,
        entity_id: input.entityId ?? null,
        entity_title: input.entityTitle ?? null
      })
  } catch {
    // Activity logging must not block the user's primary action.
  }
}
