import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { COMMUNITY_TOPICS } from '../data/communityTopics.js'
import { createConfession } from '../services/confessionService.js'
import { BrandLogo, Icon, SkipLink } from '../components/ui.jsx'

export default function CreateConfessionPage() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const [recipient, setRecipient] = useState('')
  const [message, setMessage] = useState('')
  const [selectedTopic, setSelectedTopic] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [isAnonymous, setIsAnonymous] = useState(true)
  const [published, setPublished] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event) => {
    event.preventDefault()
    if (!message.trim() || submitting) return

    setSubmitting(true)
    setError('')

    try {
      await createConfession({
        user,
        profile,
        recipientText: recipient,
        message,
        visibility: isPublic ? 'public' : 'private',
        isAnonymous,
        topicTag: selectedTopic,
      })
      setPublished(true)
    } catch (publishError) {
      console.error('No se pudo publicar la confesión.', publishError)
      setError(publishError.message || 'No pudimos publicar tu confesión.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main id="main-content" className="create-page page-shell" tabIndex="-1">
      <SkipLink />
      <div className="create-card glass-card">
        <button className="back-button" onClick={() => navigate('/app')}>← Volver</button>
        <BrandLogo compact />
        <div className="create-heading"><div className="send-icon"><Icon name="paper-plane" /></div><h1>Tu historia también cuenta</h1><p>Confiesa. Conecta. Comparte.</p></div>
        {published ? (
          <div className="success-panel"><span>♡</span><h2>Confesión publicada</h2><p>{isPublic ? 'Ya forma parte del feed público de ITLA Crush.' : 'Se guardó como privada y solo tu cuenta puede leerla en esta fase.'}</p><button className="button button--primary" onClick={() => navigate('/app')}>Volver al feed</button></div>
        ) : (
          <form onSubmit={submit} className="confession-form">
            {error && <div className="auth-message auth-message--error" role="alert">{error}</div>}
            <label className="message-field">
              <span>Tu confesión…</span>
              <textarea
                value={message}
                maxLength="500"
                rows="6"
                autoFocus
                aria-describedby="message-counter"
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Escribe aquí tu mensaje…"
              />
              <small id="message-counter" className={message.length >= 450 ? 'char-counter char-counter--warn' : 'char-counter'}>{message.length}/500</small>
            </label>
            <fieldset className="topic-selector topic-selector--chips">
              <legend>Tema <small>(opcional)</small></legend>
              <div className="topic-chips">
                {COMMUNITY_TOPICS.map((topic) => (
                  <button
                    type="button"
                    key={topic.tag}
                    className={selectedTopic === topic.tag ? 'topic-chip topic-chip--active' : 'topic-chip'}
                    aria-pressed={selectedTopic === topic.tag}
                    title={topic.label}
                    onClick={() => setSelectedTopic((current) => current === topic.tag ? '' : topic.tag)}
                  >
                    {topic.tag}
                  </button>
                ))}
              </div>
            </fieldset>
            <label><span>Para… <small>(opcional)</small></span><input value={recipient} maxLength="80" onChange={(event) => setRecipient(event.target.value)} placeholder="@usuario, carrera, grupo o alguien en ITLA" /></label>
            <fieldset className="choice-group glass-card">
              <legend>Visibilidad</legend>
              <label className={isPublic ? 'choice-option choice-option--active' : 'choice-option'}>
                <input type="radio" name="visibility" checked={isPublic} onChange={() => setIsPublic(true)} />
                <span><strong><Icon name="globe" /> Público</strong><small>Visible para la comunidad</small></span>
              </label>
              <label className={!isPublic ? 'choice-option choice-option--active' : 'choice-option'}>
                <input type="radio" name="visibility" checked={!isPublic} onChange={() => setIsPublic(false)} />
                <span><strong><Icon name="lock" /> Privado</strong><small>Visible solo para tu cuenta por ahora</small></span>
              </label>
            </fieldset>
            <fieldset className="choice-group glass-card">
              <legend>Identidad</legend>
              <label className={isAnonymous ? 'choice-option choice-option--active' : 'choice-option'}>
                <input type="radio" name="identity" checked={isAnonymous} onChange={() => setIsAnonymous(true)} />
                <span><strong><Icon name="user-secret" /> Anónimo</strong><small>Tu identidad se oculta ante otros usuarios</small></span>
              </label>
              <label className={!isAnonymous ? 'choice-option choice-option--active' : 'choice-option'}>
                <input type="radio" name="identity" checked={!isAnonymous} onChange={() => setIsAnonymous(false)} />
                <span><strong><Icon name="user" /> Identificado</strong><small>Tu nombre será visible</small></span>
              </label>
            </fieldset>
            {isAnonymous && <div className="anonymous-disclosure"><strong>🕶️ Anónimo para la comunidad, no para la plataforma.</strong>El documento público no expone tu UID. La trazabilidad se guarda por separado y solo puede consultarla tu cuenta o moderación autorizada. <Link to="/privacidad">Conoce cómo funciona.</Link></div>}
            <button className="button button--primary publish-button" disabled={!message.trim() || submitting}>{submitting ? 'Publicando…' : '↗ Publicar Confesión'}</button>
          </form>
        )}
      </div>
    </main>
  )
}
