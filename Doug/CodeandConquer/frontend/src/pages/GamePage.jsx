import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGame } from '../contexts/GameContext'
import { Game } from '../game/Game'
import './GamePage.css'

export default function GamePage() {
  const containerRef = useRef(null)
  const gameRef = useRef(null)
  const navigate = useNavigate()
  const { stats, spendCoins, addGameResult } = useGame()
  const [gameStarted, setGameStarted] = useState(false)

  useEffect(() => {
    if (!containerRef.current) return

    // Initialize game
    const game = new Game(containerRef.current, {
      onGameEnd: (won) => {
        if (won) {
          addGameResult(true)
        } else {
          addGameResult(false)
        }
      },
      onSpendCoins: spendCoins,
      initialCoins: stats.coins
    })

    gameRef.current = game

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy()
      }
    }
  }, [])

  return (
    <div className="game-page">
      <div className="game-header">
        <button onClick={() => navigate('/dashboard')} className="back-btn">
          ←
        </button>
        <div className="game-stats">
          <div className="stat-item">
            <span className="stat-label">Coins</span>
            <span className="stat-value">{stats.coins}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Level</span>
            <span className="stat-value">{stats.level}</span>
          </div>
        </div>
      </div>
      <div ref={containerRef} className="game-container" id="game-container"></div>
      <div className="game-ui-overlay">
        <div className="game-instructions">
          <div className="instruction-text">Click to place towers</div>
          <div className="instruction-text">Press SPACE to start wave</div>
        </div>
      </div>
    </div>
  )
}

