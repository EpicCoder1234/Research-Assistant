import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Dashboard() {
    const [papers, setPapers] = useState([])
    const [uploading, setUploading] = useState(false)
    const navigate = useNavigate()

    const fetchPapers = () => {
        fetch('http://localhost:8000/papers')
            .then(res => res.json())
            .then(data => setPapers(data))
    }

    useEffect(() => {
        fetchPapers()
    }, [])

    const handleUpload = async (e) => {
        const file = e.target.files[0]
        if (!file) return

        setUploading(true)
        const formData = new FormData()
        formData.append('file', file)

        const res = await fetch('http://localhost:8000/papers/upload', {
            method: 'POST',
            body: formData
        })
        const data = await res.json()
        setUploading(false)

        // immediately add the new paper to state using the upload response
        if (data.paper_id) {
            setPapers(prev => [...prev, {
                id: data.paper_id,
                title: file.name.replace('.pdf', ''),
                upload_date: new Date().toISOString()
            }])
        }

        // reset the file input so the same file can be re-uploaded
        e.target.value = ''
    }

    const handleDelete = async (paperId) => {
        await fetch(`http://localhost:8000/papers/${paperId}`, {
            method: 'DELETE'
        })

        // remove from local state without a full re-fetch
        setPapers(prev => prev.filter(p => p.id !== paperId))
    }

    return (
        <div>
            <h1>My Papers</h1>
            <input type="file" accept=".pdf" onChange={handleUpload} disabled={uploading} />
            {uploading && <p>Uploading and indexing paper, please wait...</p>}
            {papers.map(paper => (
                <div key={paper.id}>
                    <h2>{paper.title}</h2>
                    <p>{paper.upload_date}</p>
                    <button onClick={() => navigate(`/chat/${paper.id}`)}>Chat</button>
                    <button onClick={() => handleDelete(paper.id)}>Delete</button>
                </div>
            ))}
        </div>
    )
}