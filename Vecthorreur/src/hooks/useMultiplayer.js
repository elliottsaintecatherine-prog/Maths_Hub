import { useRef, useState, useCallback } from 'react'
import Peer from 'peerjs'

export function useMultiplayer() {
  const peerRef = useRef(null)
  const connRef = useRef(null)
  const [myId, setMyId] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isHost, setIsHost] = useState(false)
  const onMessageRef = useRef(null)

  const setOnMessage = useCallback((fn) => {
    onMessageRef.current = fn
  }, [])

  const host = useCallback(() => {
    const peer = new Peer()
    peerRef.current = peer
    peer.on('open', id => setMyId(id))
    peer.on('connection', conn => {
      connRef.current = conn
      conn.on('open', () => setIsConnected(true))
      conn.on('data', data => onMessageRef.current?.(data))
    })
    setIsHost(true)
  }, [])

  const join = useCallback((hostId) => {
    const peer = new Peer()
    peerRef.current = peer
    peer.on('open', () => {
      const conn = peer.connect(hostId)
      connRef.current = conn
      conn.on('open', () => setIsConnected(true))
      conn.on('data', data => onMessageRef.current?.(data))
    })
    setIsHost(false)
  }, [])

  const send = useCallback((data) => {
    connRef.current?.send(data)
  }, [])

  const disconnect = useCallback(() => {
    peerRef.current?.destroy()
    peerRef.current = null
    connRef.current = null
    setIsConnected(false)
    setMyId(null)
  }, [])

  return { myId, isConnected, isHost, host, join, send, setOnMessage, disconnect }
}
