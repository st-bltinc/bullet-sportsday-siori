import { useState, useEffect } from 'react'

function App() {
  const [members, setMembers] = useState([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('https://wagahai.mixh.jp/2026/members/api.php')
      .then(res => res.json())
      .then(data => setMembers(data))
  }, [])

  const filtered = members.filter(m =>
    m.name.includes(search) || (m.yomi && m.yomi.includes(search))
  )

  return (
    <div>
      <h1>メンバーリスト</h1>
      <input
        type="text"
        placeholder="名前で検索"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />
      <div>
        {filtered.map(m => (
          <div key={m.id}>
            <p>{m.name}（{m.yomi}）</p>
            <p>バス：{m.bus_number}号車</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default App