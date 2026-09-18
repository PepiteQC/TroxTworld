/**
 * HotelRenderer.tsx / HotelRenderer.ts
 * Rendu Canvas 2D isométrique / top-down léger pour les couloirs d'hôtel.
 */
import React, { useEffect, useRef, useState } from 'react'
import {
  hotelRealtimeSecurity,
  HOTEL_ROOMS,
  makeAccessAttempt,
  type HotelDoorSecurityState,
  type HotelAccessMethod
} from './HotelRealtimeSecurity'

export function HotelRenderer() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [selectedRoomId, setSelectedRoomId] = useState<string>('villa_nova')
  const [cardUidInput, setCardUidInput] = useState<string>('CARD-1234')
  const [pinInput, setPinInput] = useState<string>('1234')
  const [lastFeedback, setLastFeedback] = useState<string>('')
  const [doorStates, setDoorStates] = useState<Record<string, HotelDoorSecurityState>>(
    hotelRealtimeSecurity.getSnapshot()
  )

  useEffect(() => {
    const unsub = hotelRealtimeSecurity.subscribe(() => {
      setDoorStates({ ...hotelRealtimeSecurity.getSnapshot() })
    })
    return () => {
      unsub()
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationId: number

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Background
      ctx.fillStyle = '#0f172a'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Title/Header
      ctx.fillStyle = '#94a3b8'
      ctx.font = '14px sans-serif'
      ctx.fillText('HOTEL ETHERWORLD — SÉCURITÉ DES PORTES & COURLOIRS 2D', 20, 30)

      // Draw corridor base
      ctx.fillStyle = '#1e293b'
      ctx.fillRect(50, 70, canvas.width - 100, 100)
      ctx.strokeStyle = '#334155'
      ctx.lineWidth = 2
      ctx.strokeRect(50, 70, canvas.width - 100, 100)

      // Draw doors
      HOTEL_ROOMS.forEach((room, index) => {
        const x = 100 + index * 220
        const y = 70
        const doorState = hotelRealtimeSecurity.getRoomDoorState(room.id)
        const isSelected = room.id === selectedRoomId

        // Room box
        ctx.fillStyle = isSelected ? '#1e1b4b' : '#0f172a'
        ctx.fillRect(x - 40, y - 50, 160, 45)
        ctx.strokeStyle = isSelected ? '#6366f1' : '#334155'
        ctx.strokeRect(x - 40, y - 50, 160, 45)

        ctx.fillStyle = '#e2e8f0'
        ctx.font = 'bold 12px sans-serif'
        ctx.fillText(room.name, x - 30, y - 25)

        // Door frame
        ctx.fillStyle = '#475569'
        ctx.fillRect(x, y, 80, 15)

        // Door LED & State
        let color = '#ef4444' // locked = red
        let statusText = 'VERROUILLÉ'

        if (doorState) {
          if (doorState.state === 'open') {
            color = '#3b82f6'
            statusText = 'OUVERTE'
          } else if (doorState.state === 'unlocked') {
            color = '#22c55e'
            statusText = 'DÉVERROUILLÉ'
          } else if (doorState.state === 'lockout') {
            color = '#a855f7'
            statusText = 'LOCKOUT'
          }
        }

        // Door panel
        ctx.fillStyle = color
        ctx.fillRect(x + 5, y + 2, 70, 11)

        // Text below
        ctx.fillStyle = '#cbd5e1'
        ctx.font = '10px monospace'
        ctx.fillText(statusText, x + 5, y + 30)
      })

      animationId = requestAnimationFrame(render)
    }

    render()

    return () => cancelAnimationFrame(animationId)
  }, [selectedRoomId, doorStates])

  const handleAttempt = async (method: HotelAccessMethod) => {
    try {
      const res = await makeAccessAttempt({
        roomId: selectedRoomId,
        method,
        cardUid: cardUidInput,
        pin: pinInput
      })
      setLastFeedback(`[${res.granted ? 'OK' : 'REFUS'}] ${res.message}`)
    } catch (err: any) {
      setLastFeedback(`Erreur: ${err.message}`)
    }
  }

  const handleToggleDoor = () => {
    const door = hotelRealtimeSecurity.getRoomDoorState(selectedRoomId)
    if (door) {
      hotelRealtimeSecurity.toggleOpen(door.doorId)
    }
  }

  return (
    <div style={{ background: '#090d16', color: '#f8fafc', padding: '16px', borderRadius: '12px', fontFamily: 'sans-serif' }}>
      <canvas ref={canvasRef} width={800} height={200} style={{ width: '100%', borderRadius: '8px', border: '1px solid #334155' }} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Chambre sélectionnée</label>
          <select
            value={selectedRoomId}
            onChange={(e) => setSelectedRoomId(e.target.value)}
            style={{ width: '100%', padding: '8px', background: '#1e293b', border: '1px solid #475569', color: '#fff', borderRadius: '6px' }}
          >
            {HOTEL_ROOMS.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>

          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <input
              type="text"
              placeholder="Card UID"
              value={cardUidInput}
              onChange={(e) => setCardUidInput(e.target.value)}
              style={{ flex: 1, padding: '8px', background: '#1e293b', border: '1px solid #475569', color: '#fff', borderRadius: '6px' }}
            />
            <button
              onClick={() => handleAttempt('magnetic_card')}
              style={{ padding: '8px 12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
            >
              Passer Carte
            </button>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <input
              type="text"
              placeholder="PIN"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              style={{ flex: 1, padding: '8px', background: '#1e293b', border: '1px solid #475569', color: '#fff', borderRadius: '6px' }}
            />
            <button
              onClick={() => handleAttempt('numpad')}
              style={{ padding: '8px 12px', background: '#059669', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
            >
              Valider PIN
            </button>
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Actions Rapides</label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={handleToggleDoor}
              style={{ padding: '8px 12px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
            >
              Pousser / Tirer la Porte
            </button>
            <button
              onClick={() => {
                const door = hotelRealtimeSecurity.getRoomDoorState(selectedRoomId)
                if (door) hotelRealtimeSecurity.forceLock(door.doorId)
              }}
              style={{ padding: '8px 12px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
            >
              Force Lock (Staff)
            </button>
            <button
              onClick={() => {
                const door = hotelRealtimeSecurity.getRoomDoorState(selectedRoomId)
                if (door) hotelRealtimeSecurity.forceUnlock(door.doorId)
              }}
              style={{ padding: '8px 12px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
            >
              Force Unlock (Staff)
            </button>
          </div>

          {lastFeedback && (
            <div style={{ marginTop: '12px', padding: '8px 12px', background: '#0284c715', border: '1px solid #0284c730', color: '#38bdf8', borderRadius: '6px', fontSize: '13px' }}>
              {lastFeedback}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
