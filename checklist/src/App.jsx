import { useState, useEffect } from 'react'
import './App.css'

const defaultItems = [
  { id: 1, text: '動きやすい服装・運動靴', checked: false },
  { id: 2, text: '着替え', checked: false },
  { id: 3, text: 'タオル・汗拭きタオル', checked: false },
  { id: 4, text: '水筒・飲み物', checked: false },
  { id: 5, text: '日焼け止め・帽子', checked: false },
  { id: 6, text: '保険証', checked: false },
  { id: 7, text: 'レジャーシート', checked: false },
  { id: 8, text: 'スマートフォン', checked: false },
]

function App() {
  const [items, setItems] = useState(() => {
    const saved = localStorage.getItem('checklist')
    return saved ? JSON.parse(saved) : defaultItems
  })

  useEffect(() => {
    localStorage.setItem('checklist', JSON.stringify(items))
  }, [items])

  const toggleCheck = (id) => {
    setItems(items.map(item =>
      item.id === id ? { ...item, checked: !item.checked } : item
    ))
  }

  const resetAll = () => {
    if (window.confirm('チェックをリセットしますか？')) {
      setItems(items.map(item => ({ ...item, checked: false })))
    }
  }

  const checkedCount = items.filter(i => i.checked).length

  return (
    <div className="container">
      <h1 className="title">持ち物チェックリスト</h1>

      <div className="progress-area">
        <div className="progress-text">{checkedCount} / {items.length} 完了</div>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${(checkedCount / items.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="list">
        {items.map(item => (
          <div
            key={item.id}
            className={`list-item ${item.checked ? 'checked' : ''}`}
            onClick={() => toggleCheck(item.id)}
          >
            <div className="checkbox">
              {item.checked && <span className="check-icon">✓</span>}
            </div>
            <span className="item-text">{item.text}</span>
          </div>
        ))}
      </div>

      <button className="btn-reset" onClick={resetAll}>
        リセット
      </button>
    </div>
  )
}

export default App