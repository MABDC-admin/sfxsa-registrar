import { useEffect, useRef, useCallback } from 'react'
import { api } from '../lib/apiClient'

// Custom channel type for our backend implementation
interface CustomChannel {
  on(event: string, config: any, callback: (payload: any) => void): CustomChannel
  subscribe(callback?: (status: string) => void): CustomChannel
  unsubscribe(): Promise<void>
}

type SubscriptionCallback = () => void

interface UseRealtimeOptions {
  table: string
  schema?: string
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*'
  filter?: string
}

/**
 * Hook for real-time Supabase subscriptions
 * Automatically subscribes on mount and cleans up on unmount
 * Includes debouncing to prevent rapid re-fetches
 * 
 * @param options - Configuration for the subscription
 * @param callback - Function to call when data changes
 * @param deps - Dependencies array (like useEffect)
 */
export function useRealtimeSubscription(
  options: UseRealtimeOptions | UseRealtimeOptions[],
  callback: SubscriptionCallback,
  deps: any[] = []
) {
  const channelRef = useRef<CustomChannel | null>(null)
  const callbackRef = useRef<SubscriptionCallback>(callback)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isSubscribedRef = useRef(false)

  // Keep callback ref updated
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  // Debounced callback to prevent rapid re-fetches
  const debouncedCallback = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    debounceTimerRef.current = setTimeout(() => {
      callbackRef.current()
    }, 300) // 300ms debounce
  }, [])

  useEffect(() => {
    // Prevent double subscription
    if (isSubscribedRef.current) return
    
    const subscriptions = Array.isArray(options) ? options : [options]
    
    // Create a unique channel name (stable, not time-based)
    const channelName = `realtime-${subscriptions.map(s => s.table).join('-')}`
    
    // Remove existing channel if any
    if (channelRef.current) {
      api.removeChannel(channelRef.current)
    }
    
    const channel = api.channel(channelName)

    subscriptions.forEach(({ table, schema = 'public', event = '*', filter }) => {
      const config: any = {
        event,
        schema,
        table,
      }
      
      if (filter) {
        config.filter = filter
      }

      channel.on(
        'postgres_changes' as any,
        config,
        (payload: any) => {
          console.log(`📡 Real-time update on ${table}:`, payload.eventType)
          debouncedCallback()
        }
      )
    })

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        isSubscribedRef.current = true
        console.log(`✅ Subscribed to: ${subscriptions.map(s => s.table).join(', ')}`)
      }
    })

    channelRef.current = channel

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      if (channelRef.current) {
        console.log(`🔌 Unsubscribing from: ${subscriptions.map(s => s.table).join(', ')}`)
        api.removeChannel(channelRef.current)
        channelRef.current = null
        isSubscribedRef.current = false
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps])
}

/**
 * Hook for multiple table subscriptions with separate callbacks
 */
export function useMultipleRealtimeSubscriptions(
  subscriptions: Array<{
    table: string
    callback: SubscriptionCallback
    event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*'
    filter?: string
  }>,
  deps: any[] = []
) {
  const channelsRef = useRef<CustomChannel[]>([])
  const debounceTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  useEffect(() => {
    // Clean up existing channels
    channelsRef.current.forEach(channel => {
      api.removeChannel(channel)
    })
    
    channelsRef.current = subscriptions.map(({ table, callback, event = '*', filter }) => {
      const channelName = `realtime-${table}-${Math.random().toString(36).slice(2)}`
      
      const config: any = {
        event,
        schema: 'public',
        table,
      }
      
      if (filter) {
        config.filter = filter
      }

      // Debounced callback
      const debouncedCallback = () => {
        const existingTimer = debounceTimersRef.current.get(table)
        if (existingTimer) {
          clearTimeout(existingTimer)
        }
        const timer = setTimeout(() => {
          callback()
        }, 300)
        debounceTimersRef.current.set(table, timer)
      }

      const channel = api
        .channel(channelName)
        .on('postgres_changes' as any, config, (payload: any) => {
          console.log(`📡 Real-time update on ${table}:`, payload.eventType)
          debouncedCallback()
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log(`✅ Subscribed to: ${table}`)
          }
        })

      return channel
    })

    return () => {
      // Clear all debounce timers
      debounceTimersRef.current.forEach(timer => clearTimeout(timer))
      debounceTimersRef.current.clear()
      
      channelsRef.current.forEach(channel => {
        api.removeChannel(channel)
      })
      channelsRef.current = []
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps])
}
