import { useState } from 'react'
import { useParams } from 'react-router-dom'

export default function Chat() {
    const { paperId } = useParams()
    const [messages, setMessages] = useState([])
    const [input, setInput] = useState('')

    const sendMessage = async () => {
        if (!input.trim()) return

        // 1. add user message to messages state
        setMessages(prev => [...prev, { role: 'user', content: input }])
        // 2. clear the input
        setInput('')
        // 3. POST to /query with paperId, question, and history
        const res = await fetch('http://localhost:8000/query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                paper_id: paperId,
                question: input,
                history: messages.map(m => ({
                    role: m.role,
                    parts: [m.content]
                }))
            })
        })
        const data = await res.json()
        // 4. add assistant response to messages state
        setMessages(prev => [...prev, { role: 'model', content: data.answer }])
    }

    return (
        <div>
            {/* render messages */}
            {messages.map((msg, i) => (
                <div key={i}>
                    <strong>{msg.role}:</strong> {msg.content}
                </div>
            ))}
            <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
            />
            <button onClick={sendMessage}>Send</button>
        </div>
    )
}