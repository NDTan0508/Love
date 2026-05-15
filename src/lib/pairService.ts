import { supabase } from './supabaseClient'

export async function createCouple(userId: string, partnerEmail: string) {
  try {
    // Create couple
    const { data: couple, error: coupleError } = await supabase
      .from('couples')
      .insert([{ name: `Couple of ${userId}` }])
      .select()
      .single()

    if (coupleError) throw coupleError

    // Add current user to couple
    const { error: memberError } = await supabase
      .from('couple_members')
      .insert([
        { couple_id: couple.id, user_id: userId, role: 'creator' }
      ])

    if (memberError) throw memberError

    // Generate invite code
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase()
    const { error: inviteError } = await supabase
      .from('pair_invites')
      .insert([
        { couple_id: couple.id, invite_code: inviteCode, created_by: userId }
      ])

    if (inviteError) throw inviteError

    return { success: true, coupleId: couple.id, inviteCode }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}

export async function acceptInvite(userId: string, inviteCode: string) {
  try {
    // Get invite
    const { data: invite, error: fetchError } = await supabase
      .from('pair_invites')
      .select('couple_id')
      .eq('invite_code', inviteCode)
      .single()

    if (fetchError) throw new Error('Invite code not found')

    // Add user to couple
    const { error: memberError } = await supabase
      .from('couple_members')
      .insert([
        { couple_id: invite.couple_id, user_id: userId, role: 'partner' }
      ])

    if (memberError) throw memberError

    // Mark invite as accepted
    const { error: updateError } = await supabase
      .from('pair_invites')
      .update({ accepted_by: userId, accepted_at: new Date() })
      .eq('invite_code', inviteCode)

    if (updateError) throw updateError

    return { success: true, coupleId: invite.couple_id }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}

export async function getUserCouple(userId: string) {
  try {
    const { data, error } = await supabase
      .from('couple_members')
      .select('couple_id')
      .eq('user_id', userId)
      .single()

    if (error) return { success: false, coupleId: null }
    return { success: true, coupleId: data.couple_id }
  } catch (error) {
    return { success: false, coupleId: null }
  }
}

export async function getCoupleMembers(coupleId: string) {
  try {
    const { data, error } = await supabase
      .from('couple_members')
      .select('user_id, users(id, name, email)')
      .eq('couple_id', coupleId)

    if (error) throw error

    return {
      success: true,
      members: data.map((member: any) => ({
        userId: member.user_id,
        name: member.users?.name || member.users?.email || 'Unknown',
        email: member.users?.email
      }))
    }
  } catch (error) {
    return { success: false, members: [] }
  }
}
