'use client'

import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import CharacterCount from '@tiptap/extension-character-count'
import { useCallback, useRef, useState } from 'react'
import { Icon, type IconName } from '@/components/ui/Icon'

/** MIME images acceptées — miroir de la route /api/upload/image (ALLOWED_PHOTO_MIME). */
const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp'

export interface RichTextEditorProps {
  /** HTML initial (déjà sanitisé côté serveur). */
  value?: string
  /** Appelé à chaque frappe avec l'HTML courant. La sanitisation reste serveur (à l'écriture). */
  onChange: (html: string) => void
  label?: string
  hint?: string
  error?: string
  placeholder?: string
  id?: string
  /** Nom du champ hidden synchronisé (pour soumission via FormData sans handler JS). */
  name?: string
  disabled?: boolean
  /** Limite de caractères (compteur + blocage au-delà). Sans limite : simple compteur. */
  limit?: number
}

/**
 * GUIC-504/507 — Éditeur de texte riche mutualisé, bridé identité CJS.
 *
 * Basé sur Tiptap (ProseMirror). Mise en forme autorisée : titres (H2/H3), gras,
 * italique, listes (à puces / numérotées), citation, lien, image. Aucune police
 * ni couleur libre (bridage CJS — cf. `sanitizeRichHtml` côté serveur, même liste blanche).
 *
 * La sortie est de l'HTML ; la sanitisation stricte se fait à l'écriture serveur,
 * jamais ici. Un `<input type="hidden" name>` optionnel permet la soumission FormData.
 */
export function RichTextEditor({
  value = '',
  onChange,
  label,
  hint,
  error,
  placeholder = 'Rédigez le contenu…',
  id,
  name,
  disabled = false,
  limit,
}: RichTextEditorProps) {
  const [charCount, setCharCount] = useState(0)
  const editor = useEditor({
    // Next.js App Router : éviter le rendu synchrone SSR (hydration mismatch).
    immediatelyRender: false,
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        // Bridage : pas de barré / code / bloc de code / filet horizontal.
        strike: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        protocols: ['http', 'https', 'mailto'],
        HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
      }),
      Image.configure({ inline: false, allowBase64: false }),
      // Cases à cocher (listes de conditions/critères).
      TaskList,
      TaskItem.configure({ nested: true }),
      CharacterCount.configure(limit ? { limit } : {}),
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: 'gj-prose',
        role: 'textbox',
        'aria-multiline': 'true',
        ...(label ? { 'aria-label': label } : {}),
      },
    },
    onCreate: ({ editor }) => setCharCount(editor.storage.characterCount.characters()),
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
      setCharCount(editor.storage.characterCount.characters())
    },
  })

  const currentHtml = editor?.getHTML() ?? value

  return (
    <div className="flex flex-col gap-space-1">
      {label && (
        <span className="text-fs-300 font-bold text-color-text-primary">{label}</span>
      )}

      <div
        className={`gj-rte rounded-gj-md border-[1.5px] bg-white transition-colors
          focus-within:ring-[3px] focus-within:ring-[var(--focus-ring-soft)]
          ${error ? 'border-gj-red focus-within:border-gj-red' : 'border-gj-line focus-within:border-gj-teal-deep'}
          ${disabled ? 'opacity-60' : ''}`}
      >
        {editor && <Toolbar editor={editor} disabled={disabled} />}
        <EditorContent
          id={id}
          editor={editor}
          className="px-space-3 py-space-2 [&_.ProseMirror]:min-h-[8rem] [&_.ProseMirror]:outline-none"
        />
      </div>

      {name && <input type="hidden" name={name} value={currentHtml} readOnly />}
      <div className="flex items-start justify-between gap-space-2">
        <div className="min-w-0">
          {hint && !error && <p className="text-fs-200 text-color-text-muted">{hint}</p>}
          {error && <p className="text-fs-200 text-gj-red">{error}</p>}
        </div>
        <span
          className={`shrink-0 text-fs-200 tabular-nums ${limit && charCount >= limit ? 'text-gj-red font-bold' : 'text-color-text-muted'}`}
          aria-live="polite"
        >
          {charCount}{limit ? ` / ${limit}` : ''} caractères
        </span>
      </div>
    </div>
  )
}

/* ─── Barre d'outils bridée ─── */

function Toolbar({ editor, disabled }: { editor: Editor; disabled: boolean }) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const setLink = useCallback(() => {
    const previous = editor.getAttributes('link').href as string | undefined
    const url = window.prompt('Lien (https://…)', previous ?? 'https://')
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }, [editor])

  const onImageFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      e.target.value = '' // permet de re-sélectionner le même fichier
      if (!file) return

      // Texte alternatif OBLIGATOIRE (accessibilité) — demandé avant l'upload.
      const alt = window.prompt('Texte alternatif de l’image (obligatoire — décrit l’image) :')?.trim()
      if (!alt) {
        window.alert('Le texte alternatif est obligatoire pour l’accessibilité. Image non insérée.')
        return
      }

      setUploading(true)
      try {
        const fd = new FormData()
        fd.append('file', file, file.name)
        const res = await fetch('/api/upload/image', { method: 'POST', body: fd })
        const body = (await res.json()) as { data?: { url: string }; error?: { message: string } }
        if (!res.ok || !body.data?.url) {
          window.alert(body.error?.message ?? 'Échec de l’envoi de l’image.')
          return
        }
        editor.chain().focus().setImage({ src: body.data.url, alt }).run()
      } catch {
        window.alert('Échec de l’envoi de l’image (réseau).')
      } finally {
        setUploading(false)
      }
    },
    [editor],
  )

  return (
    <div
      className="flex flex-wrap items-center gap-1 border-b border-gj-line px-space-2 py-space-1"
      role="toolbar"
      aria-label="Mise en forme"
    >
      <GlyphButton label="Annuler" active={false} disabled={disabled || !editor.can().undo()}
        onClick={() => editor.chain().focus().undo().run()}>
        <span aria-hidden className="text-[15px] leading-none">↶</span>
      </GlyphButton>
      <GlyphButton label="Rétablir" active={false} disabled={disabled || !editor.can().redo()}
        onClick={() => editor.chain().focus().redo().run()}>
        <span aria-hidden className="text-[15px] leading-none">↷</span>
      </GlyphButton>

      <Divider />

      <GlyphButton label="Gras" active={editor.isActive('bold')} disabled={disabled}
        onClick={() => editor.chain().focus().toggleBold().run()}>
        <span className="font-black">B</span>
      </GlyphButton>
      <GlyphButton label="Italique" active={editor.isActive('italic')} disabled={disabled}
        onClick={() => editor.chain().focus().toggleItalic().run()}>
        <span className="italic font-serif">I</span>
      </GlyphButton>

      <Divider />

      <GlyphButton label="Intertitre niveau 2" active={editor.isActive('heading', { level: 2 })} disabled={disabled}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        <span className="text-fs-200 font-bold">H2</span>
      </GlyphButton>
      <GlyphButton label="Intertitre niveau 3" active={editor.isActive('heading', { level: 3 })} disabled={disabled}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
        <span className="text-fs-200 font-bold">H3</span>
      </GlyphButton>

      <Divider />

      <GlyphButton label="Liste à puces" active={editor.isActive('bulletList')} disabled={disabled}
        onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <span aria-hidden>• —</span>
      </GlyphButton>
      <GlyphButton label="Liste numérotée" active={editor.isActive('orderedList')} disabled={disabled}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <span aria-hidden className="text-fs-200 font-bold">1.</span>
      </GlyphButton>
      <IconButton label="Liste de cases à cocher" icon="check-circle" active={editor.isActive('taskList')} disabled={disabled}
        onClick={() => editor.chain().focus().toggleTaskList().run()} />
      <IconButton label="Citation" icon="quote" active={editor.isActive('blockquote')} disabled={disabled}
        onClick={() => editor.chain().focus().toggleBlockquote().run()} />

      <Divider />

      <IconButton label="Lien" icon="external" active={editor.isActive('link')} disabled={disabled}
        onClick={setLink} />
      <IconButton
        label={uploading ? 'Envoi de l’image…' : 'Image'}
        icon={uploading ? 'clock' : 'image'}
        active={false}
        disabled={disabled || uploading}
        onClick={() => fileInputRef.current?.click()}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept={IMAGE_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={onImageFile}
      />

      <Divider />

      <GlyphButton label="Effacer la mise en forme" active={false} disabled={disabled}
        onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}>
        <span aria-hidden className="text-[15px] leading-none">⌫</span>
      </GlyphButton>
    </div>
  )
}

function baseBtnClass(active: boolean) {
  return `inline-flex h-8 min-w-8 items-center justify-center rounded-gj-sm px-2 text-color-text-primary
    transition-colors hover:bg-gj-bg disabled:opacity-40
    ${active ? 'bg-gj-teal/15 text-gj-teal-deep' : ''}`
}

function GlyphButton({
  label, active, disabled, onClick, children,
}: {
  label: string; active: boolean; disabled: boolean; onClick: () => void; children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={baseBtnClass(active)}
    >
      {children}
    </button>
  )
}

function IconButton({
  label, icon, active, disabled, onClick,
}: {
  label: string; icon: IconName; active: boolean; disabled: boolean; onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={baseBtnClass(active)}
    >
      <Icon name={icon} className="h-4 w-4" />
    </button>
  )
}

function Divider() {
  return <span aria-hidden className="mx-1 h-5 w-px bg-gj-line" />
}
