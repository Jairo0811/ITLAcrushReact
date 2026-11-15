import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { getProgram } from '../data/itlaPrograms.js'
import { REPORT_REASONS } from '../services/trustSafetyService.js'
import { addComment, getConfessionSocialCounts, subscribeConfessionComments } from '../services/socialService.js'
import { Icon } from '../components/ui.jsx'
import { formatRelativeTime } from '../utils/formatRelativeTime.js'
import { stripTrailingTags } from '../utils/stripTrailingTags.js'

export function PublicConfessionCard({
  item,
  onDelete,
  onHide,
  onReport,
  isDemo = false,
  socialEnabled = false,
  isLiked = false,
  isSaved = false,
  onToggleLike,
  onToggleSave,
  onSelectTag,
}) {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const author = item.isAnonymous ? 'Anónimo' : (item.authorDisplayName || 'Estudiante')
  const tags = item.tags ?? []
  const programInfo = item.isAnonymous ? null : getProgram(item.authorProgram)
  const [reportOpen, setReportOpen] = useState(false)
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [reason, setReason] = useState('harassment')
  const [details, setDetails] = useState('')
  const [commentText, setCommentText] = useState('')
  const [sendingReport, setSendingReport] = useState(false)
  const [sendingComment, setSendingComment] = useState(false)
  const [pendingAction, setPendingAction] = useState(null)
  const [safetyMessage, setSafetyMessage] = useState('')
  const [socialMessage, setSocialMessage] = useState('')
  const cardRef = useRef(null)
  // Los contadores solo se consultan cuando la tarjeta está cerca de la pantalla.
  const [isNear, setIsNear] = useState(() => isDemo || typeof IntersectionObserver === 'undefined')
  const [counts, setCounts] = useState({
    likeCount: item.likeCount ?? 0,
    commentCount: item.commentCount ?? 0,
  })
  const [countsReady, setCountsReady] = useState(isDemo)
  const [comments, setComments] = useState([])
  const [commentsReady, setCommentsReady] = useState(false)
  const isOwnerView = Boolean(onDelete)

  useEffect(() => {
    if (isNear || !cardRef.current) return undefined
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setIsNear(true)
        observer.disconnect()
      }
    }, { rootMargin: '400px 0px' })
    observer.observe(cardRef.current)
    return () => observer.disconnect()
  }, [isNear])

  const refreshCounts = useCallback(() => {
    if (isDemo) return Promise.resolve()
    return getConfessionSocialCounts(item.id)
      .then((next) => { setCounts(next); setCountsReady(true) })
      .catch((countError) => console.error('No se pudieron cargar los contadores.', countError))
  }, [isDemo, item.id])

  useEffect(() => {
    if (isDemo || !isNear) return undefined
    let active = true
    getConfessionSocialCounts(item.id)
      .then((next) => {
        if (!active) return
        setCounts(next)
        setCountsReady(true)
      })
      .catch((countError) => console.error('No se pudieron cargar los contadores.', countError))
    return () => { active = false }
  }, [isDemo, isNear, item.id])

  // Los comentarios solo se escuchan mientras el panel está abierto.
  useEffect(() => {
    if (isDemo || !commentsOpen) return undefined
    return subscribeConfessionComments(
      item.id,
      (nextComments) => {
        setComments(nextComments)
        setCommentsReady(true)
      },
      (commentsError) => console.error('No se pudieron cargar los comentarios.', commentsError),
    )
  }, [isDemo, commentsOpen, item.id])

  const commentTotal = commentsOpen && commentsReady ? comments.length : counts.commentCount
  const likeLabel = countsReady ? counts.likeCount : '–'
  const commentLabel = countsReady || (commentsOpen && commentsReady) ? commentTotal : '–'
  const displayText = stripTrailingTags(item.text, tags)

  const submitReport = async (event) => {
    event.preventDefault()
    if (!onReport || sendingReport) return
    setSendingReport(true)
    setSafetyMessage('')
    try {
      await onReport(item.id, reason, details)
      setSafetyMessage('Reporte enviado. La publicación se ocultó de tu feed.')
      setReportOpen(false)
      setDetails('')
    } catch (reportError) {
      setSafetyMessage(reportError.message || 'No pudimos enviar el reporte.')
    } finally {
      setSendingReport(false)
    }
  }

  const requestAppAccess = () => {
    if (!user) {
      navigate('/login', { state: { from: `/app?confession=${item.id}` } })
      return false
    }
    if (!socialEnabled) {
      navigate(`/app?confession=${item.id}`)
      return false
    }
    return true
  }

  const submitComment = async (event) => {
    event.preventDefault()
    if (!requestAppAccess() || sendingComment || isOwnerView) return
    setSendingComment(true)
    setSocialMessage('')
    try {
      await addComment({
        confessionId: item.id,
        user,
        profile,
        text: commentText,
      })
      setCommentText('')
      setSocialMessage('Comentario publicado.')
      refreshCounts()
    } catch (commentError) {
      setSocialMessage(commentError.message || 'No pudimos publicar el comentario.')
    } finally {
      setSendingComment(false)
    }
  }

  const handleLike = async () => {
    if (!requestAppAccess() || isOwnerView || !onToggleLike) return
    setSocialMessage('')
    try {
      await onToggleLike(item.id)
      refreshCounts()
    } catch (reactionError) {
      setSocialMessage(reactionError.message || 'No pudimos actualizar tu reacción.')
    }
  }

  const handleSave = async () => {
    if (!requestAppAccess() || !onToggleSave) return
    setSocialMessage('')
    try {
      await onToggleSave(item.id)
    } catch (saveError) {
      setSocialMessage(saveError.message || 'No pudimos actualizar tus guardados.')
    }
  }

  const confirmPendingAction = () => {
    const action = pendingAction
    setPendingAction(null)
    if (action === 'delete') onDelete?.(item.id)
    if (action === 'hide') onHide?.(item.id)
  }

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/app?confession=${encodeURIComponent(item.id)}`
    const shareData = {
      title: 'ITLA Crush',
      text: 'Mira esta confesión en ITLA Crush.',
      url: shareUrl,
    }

    try {
      if (navigator.share) {
        await navigator.share(shareData)
        setSocialMessage('Compartido desde tu dispositivo.')
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl)
        setSocialMessage('Enlace copiado al portapapeles.')
      } else {
        setSocialMessage(shareUrl)
      }
    } catch (shareError) {
      if (shareError?.name !== 'AbortError') {
        setSocialMessage('No pudimos compartir el enlace en este momento.')
      }
    }
  }

  return (
    <article ref={cardRef} id={`confession-${item.id}`} className="confession-card glass-card">
      <div className="confession-card__header">
        <div className={`avatar ${item.isAnonymous ? 'avatar--anonymous' : ''}`} aria-hidden="true">{item.isAnonymous ? '◉' : author.charAt(0).toUpperCase()}</div>
        <div>
          <strong>{author}</strong>
          <div className="muted-row">{programInfo && <span className="tiny-badge program-badge" style={{ '--program-color': programInfo.color }}>{programInfo.label}</span>}<span>{formatRelativeTime(item.createdAt)}</span></div>
        </div>
        {onReport ? <button className="icon-button" aria-label="Opciones de seguridad" aria-expanded={reportOpen} onClick={() => setReportOpen((value) => !value)}><Icon name="ellipsis" /></button> : <span />}
      </div>
      {item.recipientText && <small className="confession-recipient">Para: {item.recipientText}</small>}
      <p>{displayText}</p>
      {tags.length > 0 && (
        <div className="tag-row">
          {tags.map((tag) => (
            onSelectTag
              ? <button type="button" key={tag} onClick={() => onSelectTag(tag)}>{tag}</button>
              : <span key={tag}>{tag}</span>
          ))}
        </div>
      )}

      <div className="card-actions">
        <div className="card-actions__group">
          <button
            className={isLiked ? 'social-action social-action--active' : 'social-action'}
            disabled={isDemo || isOwnerView}
            aria-pressed={isLiked}
            aria-label={`${isLiked ? 'Quitar reacción' : 'Reaccionar'}, ${likeLabel} reacciones`}
            title={isOwnerView ? 'No puedes reaccionar a tu propia confesión' : isDemo ? 'Acción deshabilitada en la demo' : 'Reaccionar'}
            onClick={handleLike}
          >
            <Icon name="heart" regular={!isLiked} /> <span>{likeLabel}</span>
          </button>
          <button
            disabled={isDemo}
            aria-expanded={commentsOpen}
            aria-controls={`comments-${item.id}`}
            aria-label={`Comentarios, ${commentLabel}`}
            onClick={() => {
              if (isDemo) return
              if (!user || !socialEnabled) {
                requestAppAccess()
                return
              }
              setCommentsOpen((value) => !value)
            }}
          >
            <Icon name="comment" regular /> <span>{commentLabel}</span>
          </button>
          <button disabled={isDemo} onClick={handleShare} title={isDemo ? 'Acción deshabilitada en la demo' : 'Compartir'}>
            <Icon name="share-nodes" /> <span className="action-label">Compartir</span>
          </button>
        </div>
        <div className="card-actions__group card-actions__group--end">
          {socialEnabled && !isOwnerView && (
            <button className={isSaved ? 'bookmark social-action--active' : 'bookmark'} aria-pressed={isSaved} onClick={handleSave}>
              <Icon name="bookmark" regular={!isSaved} /> <span className="action-label">{isSaved ? 'Guardado' : 'Guardar'}</span>
            </button>
          )}
          {onDelete && <button className="bookmark" onClick={() => setPendingAction('delete')}><Icon name="trash-can" /> <span className="action-label">Eliminar</span></button>}
          {onHide && !onDelete && <button className="bookmark" onClick={() => setPendingAction('hide')}><Icon name="eye-slash" /> <span className="action-label">Ocultar</span></button>}
        </div>
      </div>

      {pendingAction && (
        <div className="confirm-inline" role="group" aria-label="Confirmar acción">
          <span>{pendingAction === 'delete' ? '¿Retirar esta confesión? No podrás recuperarla.' : '¿Ocultar esta publicación de tu feed?'}</span>
          <button type="button" className="button button--soft" onClick={() => setPendingAction(null)}>Cancelar</button>
          <button type="button" className="button button--primary" onClick={confirmPendingAction}>Confirmar</button>
        </div>
      )}

      {commentsOpen && socialEnabled && (
        <section id={`comments-${item.id}`} className="comments-panel" aria-label="Comentarios">
          <div className="comments-panel__header">
            <strong>Comentarios</strong>
            <span>{commentTotal}</span>
          </div>
          {!commentsReady && <p className="comments-empty" role="status">Cargando comentarios…</p>}
          {commentsReady && comments.length === 0 && <p className="comments-empty">Todavía no hay comentarios.</p>}
          {comments.slice(0, 8).map((comment) => {
            const commenterProgram = getProgram(comment.actorProgram)
            return (
              <article className="comment-row" key={comment.id}>
                <div className="avatar avatar--small" aria-hidden="true">{comment.actorDisplayName?.charAt(0)?.toUpperCase() || 'E'}</div>
                <div>
                  <strong>{comment.actorDisplayName || 'Estudiante'}</strong>
                  <div className="muted-row">
                    {commenterProgram && <span className="tiny-badge program-badge" style={{ '--program-color': commenterProgram.color }}>{commenterProgram.label}</span>}
                    <span>{formatRelativeTime(comment.createdAt)}</span>
                  </div>
                  <p>{comment.text}</p>
                </div>
              </article>
            )
          })}
          {!isOwnerView && (
            <form className="comment-form" onSubmit={submitComment}>
              <label className="sr-only" htmlFor={`comment-input-${item.id}`}>Escribe un comentario</label>
              <input
                id={`comment-input-${item.id}`}
                value={commentText}
                onChange={(event) => setCommentText(event.target.value)}
                maxLength="280"
                placeholder="Escribe un comentario respetuoso…"
              />
              <button className="button button--primary" disabled={!commentText.trim() || sendingComment}>
                {sendingComment ? 'Enviando…' : 'Comentar'}
              </button>
            </form>
          )}
        </section>
      )}

      {reportOpen && onReport && (
        <form className="safety-panel" onSubmit={submitReport}>
          <strong>Reportar esta confesión</strong>
          <label>
            <span>Motivo del reporte</span>
            <select value={reason} onChange={(event) => setReason(event.target.value)}>
              {REPORT_REASONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label>
            <span>Detalles opcionales</span>
            <textarea value={details} maxLength="500" onChange={(event) => setDetails(event.target.value)} placeholder="Añade contexto para moderación…" />
          </label>
          <div className="safety-panel__actions">
            <button type="button" className="button button--soft" onClick={() => setReportOpen(false)}>Cancelar</button>
            <button className="button button--primary" disabled={sendingReport}>{sendingReport ? 'Enviando…' : 'Enviar reporte'}</button>
          </div>
        </form>
      )}
      {safetyMessage && <div className="safety-message" role="status">{safetyMessage}</div>}
      {socialMessage && <div className="safety-message" role="status">{socialMessage}</div>}
    </article>
  )
}
