// ================================================
// VOXVEGA — SUPABASE CLIENT
// Import this file in every HTML page
// ================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export const SUPABASE_URL = 'https://qoljcpacudkfcuzncncx.supabase.co'
export const SUPABASE_KEY = 'sb_publishable_nbolRR6lOenzMa9ZKRV_LA_li0vIuPT'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ================================================
// AUTH HELPERS
// ================================================

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function getUserProfile(userId) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) console.error('getUserProfile error:', error)
  return data
}

export async function signUp({ email, password, firstName, lastName, role }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName,
        last_name: lastName,
        role: role || 'fan'
      }
    }
  })
  if (error) throw error

  // Update role in users table
  if (data.user) {
    await supabase
      .from('users')
      .update({ role: role || 'fan', first_name: firstName, last_name: lastName })
      .eq('id', data.user.id)
  }

  return data
}

export async function signIn({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
  window.location.href = '/index.html'
}

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + '/buyer.html' }
  })
  if (error) throw error
  return data
}

// ================================================
// CREATOR HELPERS
// ================================================

export async function getCreators({ category, limit = 20, offset = 0, adultAllowed = false } = {}) {
  let query = supabase
    .from('creators')
    .select('*, offerings(*)')
    .eq('is_active', true)
    .order('rating', { ascending: false })
    .range(offset, offset + limit - 1)

  if (category && category !== 'all') {
    query = query.eq('category', category)
  }

  if (!adultAllowed) {
    query = query.eq('is_adult', false)
  }

  const { data, error } = await query
  if (error) console.error('getCreators error:', error)
  return data || []
}

export async function getCreatorById(id) {
  const { data, error } = await supabase
    .from('creators')
    .select('*, offerings(*), reviews(*, users(first_name, last_name))')
    .eq('id', id)
    .single()
  if (error) console.error('getCreatorById error:', error)
  return data
}

export async function getCreatorBySlug(slug) {
  const { data, error } = await supabase
    .from('creators')
    .select('*, offerings(*), reviews(*, users(first_name, last_name))')
    .eq('slug', slug)
    .single()
  if (error) console.error('getCreatorBySlug error:', error)
  return data
}

export async function getCreatorByUserId(userId) {
  const { data, error } = await supabase
    .from('creators')
    .select('*, offerings(*)')
    .eq('user_id', userId)
    .single()
  if (error) console.error('getCreatorByUserId error:', error)
  return data
}

export async function updateCreatorProfile(creatorId, updates) {
  const { data, error } = await supabase
    .from('creators')
    .update(updates)
    .eq('id', creatorId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function createCreatorProfile({ userId, displayName, category, bio }) {
  const slug = displayName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  const { data, error } = await supabase
    .from('creators')
    .insert({
      user_id: userId,
      display_name: displayName,
      slug: slug + '-' + Math.random().toString(36).substr(2, 5),
      category,
      bio
    })
    .select()
    .single()
  if (error) throw error
  return data
}

// ================================================
// OFFERINGS HELPERS
// ================================================

export async function getOfferingsByCreator(creatorId) {
  const { data, error } = await supabase
    .from('offerings')
    .select('*')
    .eq('creator_id', creatorId)
    .eq('is_active', true)
  if (error) console.error('getOfferingsByCreator error:', error)
  return data || []
}

export async function upsertOffering({ creatorId, type, price, deliveryHours, description, isActive }) {
  const { data, error } = await supabase
    .from('offerings')
    .upsert({
      creator_id: creatorId,
      type,
      price,
      delivery_hours: deliveryHours,
      description,
      is_active: isActive
    }, { onConflict: 'creator_id,type' })
    .select()
    .single()
  if (error) throw error
  return data
}

// ================================================
// ORDER HELPERS
// ================================================

export async function createOrder({
  buyerId,
  creatorId,
  offeringId,
  type,
  price,
  rush,
  rushFee,
  instructions,
  recipientName,
  recipientPronouns,
  occasion,
  isPrivate,
  allowShare,
  buyerName,
  buyerEmail,
  paymentMethod
}) {
  const deadlineHours = rush ? 12 : 168
  const deadline = new Date(Date.now() + deadlineHours * 60 * 60 * 1000).toISOString()
  const creatorEarnings = ((price + (rushFee || 0)) * 0.9).toFixed(2)
  const platformFee = ((price + (rushFee || 0)) * 0.1).toFixed(2)

  const { data, error } = await supabase
    .from('orders')
    .insert({
      buyer_id: buyerId,
      creator_id: creatorId,
      offering_id: offeringId,
      type,
      price,
      platform_fee: platformFee,
      creator_earnings: creatorEarnings,
      rush,
      rush_fee: rushFee || 0,
      instructions,
      recipient_name: recipientName,
      recipient_pronouns: recipientPronouns,
      occasion,
      is_private: isPrivate,
      allow_share: allowShare,
      buyer_name: buyerName,
      buyer_email: buyerEmail,
      payment_method: paymentMethod,
      deadline_at: deadline
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getOrdersByBuyer(buyerId) {
  const { data, error } = await supabase
    .from('orders')
    .select('*, creators(display_name, avatar_emoji, category), videos(*)')
    .eq('buyer_id', buyerId)
    .order('created_at', { ascending: false })
  if (error) console.error('getOrdersByBuyer error:', error)
  return data || []
}

export async function getOrdersByCreator(creatorId) {
  const { data, error } = await supabase
    .from('orders')
    .select('*, users(first_name, last_name, email), videos(*)')
    .eq('creator_id', creatorId)
    .order('created_at', { ascending: false })
  if (error) console.error('getOrdersByCreator error:', error)
  return data || []
}

export async function updateOrderStatus(orderId, status) {
  const updates = { status }
  if (status === 'delivered') updates.delivered_at = new Date().toISOString()
  if (status === 'completed') updates.completed_at = new Date().toISOString()
  if (status === 'refunded') updates.refunded_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('orders')
    .update(updates)
    .eq('id', orderId)
    .select()
    .single()
  if (error) throw error
  return data
}

// ================================================
// VIDEO HELPERS
// ================================================

export async function submitVideo({ orderId, creatorId, fileUrl, fileSizeMb, durationSeconds, creatorMessage, isPublic }) {
  const { data, error } = await supabase
    .from('videos')
    .insert({
      order_id: orderId,
      creator_id: creatorId,
      file_url: fileUrl,
      file_size_mb: fileSizeMb,
      duration_seconds: durationSeconds,
      creator_message: creatorMessage,
      is_public: isPublic || false
    })
    .select()
    .single()
  if (error) throw error

  // Update order status to delivered
  await updateOrderStatus(orderId, 'delivered')
  return data
}

export async function getVideoByOrder(orderId) {
  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .eq('order_id', orderId)
    .single()
  if (error) console.error('getVideoByOrder error:', error)
  return data
}

// ================================================
// REVIEW HELPERS
// ================================================

export async function submitReview({ orderId, buyerId, creatorId, rating, reviewText }) {
  const { data, error } = await supabase
    .from('reviews')
    .insert({
      order_id: orderId,
      buyer_id: buyerId,
      creator_id: creatorId,
      rating,
      review_text: reviewText,
      is_public: true
    })
    .select()
    .single()
  if (error) throw error

  // Mark order as completed
  await updateOrderStatus(orderId, 'completed')
  return data
}

export async function getReviewsByCreator(creatorId, limit = 10) {
  const { data, error } = await supabase
    .from('reviews')
    .select('*, users(first_name, last_name)')
    .eq('creator_id', creatorId)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) console.error('getReviewsByCreator error:', error)
  return data || []
}

// ================================================
// TIP HELPERS
// ================================================

export async function submitTip({ fanId, creatorId, amount, message, paymentMethod, isAnonymous }) {
  const { data, error } = await supabase
    .from('tips')
    .insert({
      fan_id: fanId,
      creator_id: creatorId,
      amount,
      message,
      payment_method: paymentMethod,
      is_anonymous: isAnonymous || false
    })
    .select()
    .single()
  if (error) throw error
  return data
}

// ================================================
// SUBSCRIPTION HELPERS
// ================================================

export async function getSubscriptionsByFan(fanId) {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*, creators(display_name, avatar_emoji, category)')
    .eq('fan_id', fanId)
    .eq('status', 'active')
  if (error) console.error('getSubscriptionsByFan error:', error)
  return data || []
}

export async function cancelSubscription(subscriptionId) {
  const { data, error } = await supabase
    .from('subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString()
    })
    .eq('id', subscriptionId)
    .select()
    .single()
  if (error) throw error
  return data
}

// ================================================
// SAVED CREATORS HELPERS
// ================================================

export async function getSavedCreators(fanId) {
  const { data, error } = await supabase
    .from('saved_creators')
    .select('*, creators(id, display_name, avatar_emoji, category, rating, offerings(price, type))')
    .eq('fan_id', fanId)
  if (error) console.error('getSavedCreators error:', error)
  return data || []
}

export async function toggleSavedCreator(fanId, creatorId) {
  const { data: existing } = await supabase
    .from('saved_creators')
    .select('id')
    .eq('fan_id', fanId)
    .eq('creator_id', creatorId)
    .single()

  if (existing) {
    await supabase.from('saved_creators').delete().eq('id', existing.id)
    return false
  } else {
    await supabase.from('saved_creators').insert({ fan_id: fanId, creator_id: creatorId })
    return true
  }
}

// ================================================
// PAYOUT HELPERS
// ================================================

export async function requestPayout({ creatorId, amount, method, cryptoCurrency, cryptoWallet }) {
  const { data, error } = await supabase
    .from('payouts')
    .insert({
      creator_id: creatorId,
      amount,
      method,
      crypto_currency: cryptoCurrency,
      crypto_wallet: cryptoWallet,
      status: 'pending'
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getPayoutsByCreator(creatorId) {
  const { data, error } = await supabase
    .from('payouts')
    .select('*')
    .eq('creator_id', creatorId)
    .order('created_at', { ascending: false })
  if (error) console.error('getPayoutsByCreator error:', error)
  return data || []
}

// ================================================
// CREATOR DASHBOARD STATS
// ================================================

export async function getCreatorStats(creatorId) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [ordersResult, earningsResult, pendingResult] = await Promise.all([
    supabase
      .from('orders')
      .select('id, status, price, rush_fee, created_at')
      .eq('creator_id', creatorId)
      .gte('created_at', thirtyDaysAgo),
    supabase
      .from('orders')
      .select('creator_earnings')
      .eq('creator_id', creatorId)
      .eq('status', 'completed')
      .gte('created_at', thirtyDaysAgo),
    supabase
      .from('orders')
      .select('id')
      .eq('creator_id', creatorId)
      .eq('status', 'pending')
  ])

  const completed = (ordersResult.data || []).filter(o => o.status === 'completed').length
  const pending = (pendingResult.data || []).length
  const earnings30d = (earningsResult.data || []).reduce((sum, o) => sum + parseFloat(o.creator_earnings || 0), 0)

  return {
    completed30d: completed,
    pending,
    earnings30d: earnings30d.toFixed(2)
  }
}

// ================================================
// MESSAGES HELPERS
// ================================================

export async function sendMessage({ orderId, senderId, recipientId, content }) {
  const { data, error } = await supabase
    .from('messages')
    .insert({ order_id: orderId, sender_id: senderId, recipient_id: recipientId, content })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getMessagesByOrder(orderId) {
  const { data, error } = await supabase
    .from('messages')
    .select('*, users(first_name, last_name)')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true })
  if (error) console.error('getMessagesByOrder error:', error)
  return data || []
}
