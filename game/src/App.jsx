import { useState, useEffect, useRef } from 'react'
import { initializeApp } from 'firebase/app'
import { getDatabase, ref, set, update, onValue } from 'firebase/database'
import './App.css'
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "bullet-sportsday.firebaseapp.com",
  databaseURL: "https://bullet-sportsday-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "bullet-sportsday",
  storageBucket: "bullet-sportsday.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
}
const app = initializeApp(firebaseConfig)
const db = getDatabase(app)
const ME_API = 'https://wagahai.mixh.jp/2026/login/me.php'
const EMPTY = null
const INITIAL_BOARD = Array(9).fill(EMPTY)
const INITIAL_CARDS = ['guard', 'pinpoint', 'change']
const CARD_INFO = {
  guard: { icon: '🛡️', name: 'ガード', desc: '1マスを指定。次の相手ターン中そのマスを守る。駒も置ける。' },
  pinpoint: { icon: '🎯', name: 'ピンポイント', desc: '相手の駒1つを消す。使用後に駒は置けない。' },
  change: { icon: '🔀', name: 'チェンジ', desc: '自分と相手の駒を1つずつ交換。かぶせ駒不可。使用後に駒は置けない。' },
}
const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
]
function checkWinner(board) {
  for (const [a, b, c] of WIN_LINES) {
    const da = board[a], db = board[b], dc = board[c]
    if (da && db && dc && da.mark === db.mark && db.mark === dc.mark) {
      return { winner: da.mark, line: [a, b, c] }
    }
  }
  return null
}
// ========= ルール説明モーダル =========
function RulesModal({ onClose }) {
  return (
    <div className="rules-overlay" onClick={onClose}>
      <div className="rules-modal" onClick={e => e.stopPropagation()}>
        <div className="rules-modal-header">
          <span className="rules-modal-title">📖 ゲームルール</span>
          <button className="rules-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="rules-modal-body">
          <div className="rules-block">
            <div className="rules-block-title">🎯 基本ルール</div>
            <div className="rules-line">• 3×3のマスに交互に〇×を置いていく</div>
            <div className="rules-line">• 縦・横・斜めいずれかに3つ並べたら勝ち</div>
          </div>
          <div className="rules-block">
            <div className="rules-block-title">⬡ かぶせ駒（ひとり2個）</div>
            <div className="rules-line">• 置いてある相手の駒の上にかぶせることで自分のマークに変えられる</div>
            <div className="rules-line">• 1度おいたかぶせ駒は動かせない</div>
            <div className="rules-line">• かぶせ駒の上にはかぶせられない</div>
            <div className="rules-line">• 1ターンに1個まで（駒を置く代わりに使う）</div>
          </div>
          <div className="rules-block">
            <div className="rules-block-title">🃏 アイテムカード（全種類1枚ずつ所持・1回限り）</div>
            <div className="rules-card-item">
              <span className="rules-card-icon">🛡️</span>
              <div>
                <div className="rules-card-name">ガード</div>
                <div className="rules-card-desc">自分の駒1マスを指定し、次の相手ターン中そのマスを守る。ガード中の駒はアイテム、かぶせ駒の効果を一切受けない。アイテム使用後ターンを消費しない。</div>
              </div>
            </div>
            <div className="rules-card-item">
              <span className="rules-card-icon">🎯</span>
              <div>
                <div className="rules-card-name">ピンポイント</div>
                <div className="rules-card-desc">相手の駒、かぶせ駒1つを指定して消去することで、空きマスにする。アイテム使用後ターンを消費。</div>
              </div>
            </div>
            <div className="rules-card-item">
              <span className="rules-card-icon">🔀</span>
              <div>
                <div className="rules-card-name">チェンジ</div>
                <div className="rules-card-desc">自分と相手の駒を1つずつ指定して位置を交換。かぶせ駒は指定不可。アイテム使用後ターンを消費。</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
// ========= ルーム選択画面 =========
function LobbyScreen({ user, onJoin }) {
  const [roomId, setRoomId] = useState('')
  const [creating, setCreating] = useState(false)
  const [showRules, setShowRules] = useState(false)
  const createRoom = () => {
    const id = Math.random().toString(36).substr(2, 6).toUpperCase()
    const roomRef = ref(db, `overlap/${id}`)
    set(roomRef, {
      players: { O: { name: user.display_name, ready: true } },
      board: INITIAL_BOARD,
      caps: { O: 2, X: 2 },
      cards: { O: INITIAL_CARDS, X: INITIAL_CARDS },
      usedCards: { O: [], X: [] },
      capCells: [],
      turn: 'O',
      phase: 'waiting',
      guardCell: null,
      guardBy: null,
      winner: null,
      createdAt: Date.now(),
    })
    onJoin(id, 'O')
  }
  const joinRoom = () => {
    const id = roomId.trim().toUpperCase()
    if (!id) return
    const roomRef = ref(db, `overlap/${id}`)
    onValue(roomRef, snap => {
      const data = snap.val()
      if (!data) return alert('ルームが見つかりません')
      if (data.players?.X) return alert('ルームが満員です')
      set(ref(db, `overlap/${id}/players/X`), { name: user.display_name, ready: true })
      set(ref(db, `overlap/${id}/phase`), 'playing')
      onJoin(id, 'X')
    }, { onlyOnce: true })
  }
  return (
    <div className="lobby">
      <div className="lobby-logo">OVERLAP</div>
      <div className="lobby-sub">超〇×ゲーム</div>
      <button className="lobby-rules-btn" onClick={() => setShowRules(true)}>
        📖 ルールを確認する
      </button>
      <button className="lobby-btn primary" onClick={createRoom}>
        ＋ ルームを作成
      </button>
      <div className="lobby-divider"><span>または</span></div>
      <div className="lobby-join">
        <input
          className="lobby-input"
          placeholder="ルームID（6桁）"
          value={roomId}
          onKeyDown={e => {
            // 英数字・バックスペース・矢印のみ許可
            if (e.key === 'Process' || e.key.length > 1 && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) return
            if (e.key.length === 1 && !/^[A-Za-z0-9]$/.test(e.key)) {
              e.preventDefault()
            }
          }}
          onChange={e => {
            const val = e.target.value.replace(/[^A-Z0-9]/gi, '').toUpperCase()
            setRoomId(val)
          }}
          onCompositionStart={e => { e.target.blur(); e.target.focus() }}
          maxLength={6}
          inputMode="latin"
          lang="en"
          autoCapitalize="characters"
          autoCorrect="off"
          autoComplete="off"
        />
        <button className="lobby-btn secondary" onClick={joinRoom}>参加</button>
      </div>
      {showRules && <RulesModal onClose={() => setShowRules(false)} />}
      <a href="https://wagahai.mixh.jp/2026/" className="home-fab"><img src="/2026/logo-home.png" alt="ホーム" style={{ width: '60px', height: '60px', objectFit: 'contain' }} /></a>
    </div>
  )
}
// ========= 待機画面 =========
function WaitingScreen({ roomId, playerMark }) {
  return (
    <div className="waiting">
      <div className="waiting-title">対戦相手を待っています...</div>
      <div className="room-id-display">
        <div className="room-id-label">ルームID</div>
        <div className="room-id-value">{roomId}</div>
        <div className="room-id-hint">このIDを相手に教えてください</div>
      </div>
      <div className="waiting-mark">あなたは <span className={`mark ${playerMark}`}>{playerMark === 'O' ? '○' : '×'}</span></div>
      <a href="https://wagahai.mixh.jp/2026/" className="home-fab"><img src="/2026/logo-home.png" alt="ホーム" style={{ width: '60px', height: '60px', objectFit: 'contain' }} /></a>
    </div>
  )
}
// ========= ゲーム画面 =========
function GameScreen({ roomId, playerMark, user }) {
  const [gameState, setGameState] = useState(null)
  const [selectedCard, setSelectedCard] = useState(null)
  const [cardStep, setCardStep] = useState(null)
  const [selectedOwn, setSelectedOwn] = useState(null)
  const [winResult, setWinResult] = useState(null)
  const [showRules, setShowRules] = useState(false)
  const myMark = playerMark
  const enemyMark = playerMark === 'O' ? 'X' : 'O'
  useEffect(() => {
    const roomRef = ref(db, `overlap/${roomId}`)
    const unsub = onValue(roomRef, snap => {
      const data = snap.val()
      if (!data) return
      setGameState(data)
      const result = checkWinner(data.board || INITIAL_BOARD)
      if (result) setWinResult(result)
      else if (data.winner) setWinResult({ winner: data.winner })
    })
    return () => unsub()
  }, [roomId])
  if (!gameState) return <div className="loading">読み込み中...</div>
  const rawBoard = gameState.board || {}
  const board = Array.from({ length: 9 }, (_, i) => {
    const cell = Array.isArray(rawBoard) ? rawBoard[i] : rawBoard[i]
    return cell ?? null
  })
  const turn = gameState.turn
  const isMyTurn = turn === myMark
  const myCaps = gameState.caps?.[myMark] ?? 2
  const myCards = Array.isArray(gameState.cards?.[myMark]) ? gameState.cards[myMark] : INITIAL_CARDS
  const myUsedCards = Array.isArray(gameState.usedCards?.[myMark]) ? gameState.usedCards[myMark] : []
  const rawCapCells = gameState.capCells ?? []
  const capCells = Array.isArray(rawCapCells) ? rawCapCells : Object.values(rawCapCells)
  const guardCell = gameState.guardCell
  const guardBy = gameState.guardBy
  const updateGame = (updates) => {
    const sanitized = {}
    Object.entries(updates).forEach(([key, val]) => {
      sanitized[key] = val === undefined ? null : val
    })
    update(ref(db, `overlap/${roomId}`), sanitized)
  }
  const endTurn = (newBoard, newCaps, newCapCells, newCards, newUsedCards, extraUpdates = {}) => {
    const result = checkWinner(newBoard)
    const shouldClearGuard = guardBy === enemyMark
    const updates = {
      board: newBoard,
      [`caps/${myMark}`]: newCaps,
      capCells: newCapCells.length > 0 ? newCapCells : null,
      [`cards/${myMark}`]: newCards,
      [`usedCards/${myMark}`]: newUsedCards.length > 0 ? newUsedCards : null,
      turn: enemyMark,
      winner: result ? result.winner : null,
      ...extraUpdates,
    }
    if (shouldClearGuard) {
      updates.guardCell = null
      updates.guardBy = null
    } else if (guardCell !== undefined) {
      updates.guardCell = guardCell ?? null
      updates.guardBy = guardBy ?? null
    }
    update(ref(db, `overlap/${roomId}`), updates)
    setSelectedCard(null)
    setCardStep(null)
    setSelectedOwn(null)
  }
  const handleCellClick = (idx) => {
    if (!isMyTurn || winResult) return
    if (selectedCard && cardStep) {
      handleCardCellClick(idx)
      return
    }
    const cell = board[idx]
    if (!cell) {
      const newBoard = [...board]
      newBoard[idx] = { mark: myMark, capped: false }
      endTurn(newBoard, myCaps, capCells, myCards, myUsedCards)
      return
    }
    if (cell.mark === enemyMark && !cell.capped && myCaps > 0) {
      if (guardCell === idx && guardBy === enemyMark) {
        alert('このマスはガードされています！')
        return
      }
      const newBoard = [...board]
      newBoard[idx] = { mark: myMark, capped: true }
      const newCapCells = [...capCells, idx]
      endTurn(newBoard, myCaps - 1, newCapCells, myCards, myUsedCards)
    }
  }
  const handleCardCellClick = (idx) => {
    const cell = board[idx]
    if (selectedCard === 'pinpoint') {
      if (!cell || cell.mark !== enemyMark) return alert('相手の駒を選んでください')
      if (guardCell === idx && guardBy === enemyMark) return alert('このマスはガードされています！')
      const newBoard = [...board]
      newBoard[idx] = null
      const newCapCells = capCells.filter(c => c !== idx)
      const newCards = myCards.filter(c => c !== 'pinpoint')
      const newUsedCards = [...myUsedCards, 'pinpoint']
      endTurn(newBoard, myCaps, newCapCells, newCards, newUsedCards)
    } else if (selectedCard === 'change') {
      if (cardStep === 'select-own') {
        if (!cell || cell.mark !== myMark) return alert('自分の駒を選んでください')
        if (cell.capped) return alert('かぶせ駒は交換できません')
        setSelectedOwn(idx)
        setCardStep('select-enemy')
      } else if (cardStep === 'select-enemy') {
        if (!cell || cell.mark !== enemyMark) return alert('相手の駒を選んでください')
        if (cell.capped) return alert('かぶせ駒は交換できません')
        if (guardCell === idx && guardBy === enemyMark) return alert('このマスはガードされています！')
        const newBoard = [...board]
        const ownCell = { ...newBoard[selectedOwn] }
        const enemyCell = { ...newBoard[idx] }
        newBoard[selectedOwn] = enemyCell
        newBoard[idx] = ownCell
        const newCards = myCards.filter(c => c !== 'change')
        const newUsedCards = [...myUsedCards, 'change']
        endTurn(newBoard, myCaps, capCells, newCards, newUsedCards)
      }
    } else if (selectedCard === 'guard') {
      if (!cell || cell.mark !== myMark) return alert('自分の駒を選んでください')
      const newCards = myCards.filter(c => c !== 'guard')
      const newUsedCards = [...myUsedCards, 'guard']
      updateGame({
        guardCell: idx,
        guardBy: myMark,
        [`cards/${myMark}`]: newCards,
        [`usedCards/${myMark}`]: newUsedCards,
      })
      setSelectedCard(null)
      setCardStep(null)
    }
  }
  const handleCardSelect = (card) => {
    if (!isMyTurn || winResult) return
    if (myUsedCards.includes(card)) return
    if (selectedCard === card) {
      setSelectedCard(null)
      setCardStep(null)
      setSelectedOwn(null)
      return
    }
    setSelectedCard(card)
    if (card === 'pinpoint') setCardStep('select-enemy')
    else if (card === 'change') setCardStep('select-own')
    else if (card === 'guard') setCardStep('select-guard')
    setSelectedOwn(null)
  }
  const resetGame = () => {
    updateGame({
      board: INITIAL_BOARD,
      'caps/O': 2, 'caps/X': 2,
      'cards/O': INITIAL_CARDS, 'cards/X': INITIAL_CARDS,
      'usedCards/O': [], 'usedCards/X': [],
      capCells: [],
      turn: 'O',
      phase: 'playing',
      guardCell: null,
      guardBy: null,
      winner: null,
    })
    setWinResult(null)
    setSelectedCard(null)
    setCardStep(null)
    setSelectedOwn(null)
  }
  const getCardStepHint = () => {
    if (!selectedCard || !cardStep) return null
    if (selectedCard === 'pinpoint') return '消したい相手の駒を選んでください'
    if (selectedCard === 'change') {
      if (cardStep === 'select-own') return '交換したい自分の駒を選んでください'
      if (cardStep === 'select-enemy') return '交換したい相手の駒を選んでください'
    }
    if (selectedCard === 'guard') return '守りたい自分の駒を選んでください'
    return null
  }
  const getCellClass = (idx) => {
    const cell = board[idx]
    let cls = 'cell'
    if (cell) cls += ` has-${cell.mark}`
    if (cell?.capped) cls += ' capped'
    if (guardCell === idx) cls += ' guarded'
    if (selectedOwn === idx) cls += ' selected-own'
    if (winResult?.line?.includes(idx)) cls += ' win-cell'
    if (!cell && isMyTurn && !selectedCard && !winResult) cls += ' empty-hover'
    return cls
  }
  const enemyCards = Array.isArray(gameState.cards?.[enemyMark]) ? gameState.cards[enemyMark] : INITIAL_CARDS
  const enemyUsedCards = Array.isArray(gameState.usedCards?.[enemyMark]) ? gameState.usedCards[enemyMark] : []
  const enemyCaps = gameState.caps?.[enemyMark] ?? 2
  return (
    <div className="game">
      <div className="player-info enemy">
        <div className="player-name">{gameState.players?.[enemyMark]?.name ?? '相手'}</div>
        <div className="player-mark"><span className={`mark ${enemyMark}`}>{enemyMark === 'O' ? '○' : '×'}</span></div>
        <div className="player-caps">かぶせ駒: {'⬡'.repeat(enemyCaps)}{'○'.repeat(2 - enemyCaps)}</div>
        <div className="player-cards">
          {INITIAL_CARDS.map(c => (
            <span key={c} className={`card-chip enemy ${enemyUsedCards.includes(c) ? 'used' : ''}`}>
              {CARD_INFO[c].icon}
            </span>
          ))}
        </div>
      </div>
      {!isMyTurn && !winResult && <div className="thinking-badge">考え中...</div>}
      <div className="board-wrap">
        {getCardStepHint() && (
          <div className="card-hint">{getCardStepHint()}</div>
        )}
        <div className="board">
          {board.map((cell, idx) => (
            <div key={idx} className={getCellClass(idx)} onClick={() => handleCellClick(idx)}>
              {cell && (
                <span className={`piece ${cell.mark} ${cell.capped ? 'capped' : ''}`}>
                  {cell.mark === 'O' ? '○' : '×'}
                  {cell.capped && <span className="cap-indicator">★</span>}
                </span>
              )}
              {guardCell === idx && <span className="guard-icon">🛡️</span>}
            </div>
          ))}
        </div>
      </div>
      <div className="player-info me">
        <div className="player-name">{user.display_name}</div>
        <div className="player-mark"><span className={`mark ${myMark}`}>{myMark === 'O' ? '○' : '×'}</span></div>
        <div className="player-caps">かぶせ駒: {'⬡'.repeat(myCaps)}{'○'.repeat(2 - myCaps)}</div>
        <div className="cards-row">
          {INITIAL_CARDS.map(c => {
            const used = myUsedCards.includes(c)
            const active = selectedCard === c
            return (
              <button
                key={c}
                className={`card-btn ${used ? 'used' : ''} ${active ? 'active' : ''}`}
                onClick={() => !used && handleCardSelect(c)}
                disabled={used || !isMyTurn || !!winResult}
                title={CARD_INFO[c].desc}
              >
                <span className="card-icon">{CARD_INFO[c].icon}</span>
                <span className="card-name">{CARD_INFO[c].name}</span>
              </button>
            )
          })}
        </div>
      </div>
      <div className={`turn-banner ${isMyTurn ? 'my-turn' : 'enemy-turn'}`}>
        {winResult
          ? winResult.winner === myMark ? '🎉 あなたの勝ち！' : '😢 相手の勝ち'
          : isMyTurn ? 'あなたのターン' : '相手のターン'}
      </div>
      {winResult && (
        <div className="result-actions">
          <button className="result-btn" onClick={resetGame}>もう一度</button>
          <a href="https://wagahai.mixh.jp/2026/" className="result-btn secondary">ホームへ</a>
        </div>
      )}
      <button className="rules-fab" onClick={() => setShowRules(true)}>？</button>
      {showRules && <RulesModal onClose={() => setShowRules(false)} />}
      <a href="https://wagahai.mixh.jp/2026/" className="home-fab"><img src="/2026/logo-home.png" alt="ホーム" style={{ width: '60px', height: '60px', objectFit: 'contain' }} /></a>
    </div>
  )
}
// ========= メイン =========
function App() {
  const [user, setUser] = useState(null)
  const [roomId, setRoomId] = useState(null)
  const [playerMark, setPlayerMark] = useState(null)
  const [phase, setPhase] = useState('lobby')
  useEffect(() => {
    fetch(ME_API, { credentials: 'include' })
      .then(res => {
        if (res.status === 401) {
          const redirect = encodeURIComponent(window.location.href)
          window.location.href = `https://wagahai.mixh.jp/2026/login/?redirect=${redirect}`
          return null
        }
        return res.json()
      })
      .then(data => { if (data) setUser(data) })
  }, [])
  useEffect(() => {
    if (!roomId) return
    const roomRef = ref(db, `overlap/${roomId}/phase`)
    const unsub = onValue(roomRef, snap => {
      const p = snap.val()
      if (p === 'playing') setPhase('playing')
    })
    return () => unsub()
  }, [roomId])
  const handleJoin = (id, mark) => {
    setRoomId(id)
    setPlayerMark(mark)
    setPhase(mark === 'O' ? 'waiting' : 'playing')
  }
  if (!user) return <div className="loading"><div className="loading-ring" /><span>読み込み中...</span></div>
  if (!roomId) return <LobbyScreen user={user} onJoin={handleJoin} />
  if (phase === 'waiting') return <WaitingScreen roomId={roomId} playerMark={playerMark} />
  return <GameScreen roomId={roomId} playerMark={playerMark} user={user} />
}
export default App