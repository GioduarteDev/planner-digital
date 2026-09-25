import { ArrowDown, ArrowUp, GripVertical, Pencil, X } from 'lucide-react'
import { type CSSProperties, type ReactNode } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { getBlockText, getBlockChecked, getBlockListItems, type PlannerPage, type PlannerFolder, type PlannerBlock, type BlockData } from './editorModel'
type SortablePageRowProps = {
  page: PlannerPage
  activePageId: number | null
  isFirst: boolean
  isLast: boolean
  onSelect: (pageId: number) => void
  onMove: (
    pageId: number,
    folderId: number | null,
    direction: 'up' | 'down',
  ) => void
}

export function SortablePageRow({
  page,
  activePageId,
  isFirst,
  isLast,
  onSelect,
  onMove,
}: SortablePageRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: page.id,
  })

  const style: CSSProperties = {
    transform:
      CSS.Transform.toString(
        transform,
      ),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={
        isDragging
          ? 'page-row dragging'
          : 'page-row'
      }
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        className="page-drag-handle"
        aria-label={`Arrastar página ${page.title || 'Sem título'}`}
        title="Arrastar para reordenar"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={16} />
      </button>

      <button
        className={
          page.id === activePageId
            ? 'page-button active'
            : 'page-button'
        }
        type="button"
        onClick={() =>
          onSelect(page.id)
        }
      >
        {page.favorite && '★ '}
        {page.title || 'Sem título'}
      </button>

      <div className="page-order-actions">
        <button
          type="button"
          aria-label="Mover página para cima"
          title="Mover página para cima"
          disabled={isFirst}
          onClick={() =>
            onMove(
              page.id,
              page.folderId,
              'up',
            )
          }
        >
          <ArrowUp size={16} />
        </button>

        <button
          type="button"
          aria-label="Mover página para baixo"
          title="Mover página para baixo"
          disabled={isLast}
          onClick={() =>
            onMove(
              page.id,
              page.folderId,
              'down',
            )
          }
        >
          <ArrowDown size={16} />
        </button>
      </div>
    </div>
  )
}

type SortableFolderGroupProps = {
  folder: PlannerFolder
  isFirst: boolean
  isLast: boolean
  isOpen: boolean
  children: ReactNode
  onToggle: (folderId: number) => void
  onMove: (
    folderId: number,
    direction: 'up' | 'down',
  ) => void
  onRename: (
    folder: PlannerFolder,
  ) => void
  onDelete: (
    folder: PlannerFolder,
  ) => void
}

export function SortableFolderGroup({
  folder,
  isFirst,
  isLast,
  isOpen,
  children,
  onToggle,
  onMove,
  onRename,
  onDelete,
}: SortableFolderGroupProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `folder-${folder.id}`,
  })

  const style: CSSProperties = {
    transform:
      CSS.Transform.toString(
        transform,
      ),
    transition,
  }

  return (
    <section
      ref={setNodeRef}
      style={style}
      className={
        isDragging
          ? 'folder-group dragging'
          : 'folder-group'
      }
    >
      <div className="folder-group-header">
        <button
          ref={setActivatorNodeRef}
          type="button"
          className="folder-drag-handle"
          aria-label={`Arrastar seção ${folder.title}`}
          title="Arrastar para reordenar seção"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={16} />
        </button>

        <button
          className="folder-toggle-button"
          type="button"
          title={folder.title}
          aria-expanded={isOpen}
          onClick={() =>
            onToggle(folder.id)
          }
        >
          <span
            className="folder-chevron"
            aria-hidden="true"
          >
            {isOpen ? '⌄' : '›'}
          </span>

          <span className="folder-group-title">
            ▤ {folder.title}
          </span>
        </button>

        <div className="folder-group-actions">
          <button
            type="button"
            aria-label={`Mover seção ${folder.title} para cima`}
            title="Mover seção para cima"
            disabled={isFirst}
            onClick={() =>
              onMove(folder.id, 'up')
            }
          >
            <ArrowUp size={16} />
          </button>

          <button
            type="button"
            aria-label={`Mover seção ${folder.title} para baixo`}
            title="Mover seção para baixo"
            disabled={isLast}
            onClick={() =>
              onMove(folder.id, 'down')
            }
          >
            <ArrowDown size={16} />
          </button>

          <button
            type="button"
            aria-label={`Renomear seção ${folder.title}`}
            title="Renomear seção"
            onClick={() =>
              onRename(folder)
            }
          >
            <Pencil size={16} />
          </button>

          <button
            type="button"
            aria-label={`Excluir seção ${folder.title}`}
            title="Excluir seção"
            onClick={() =>
              onDelete(folder)
            }
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {isOpen && children}
    </section>
  )
}

type SortableBlockProps = {
  block: PlannerBlock
  onDataChange: (
    blockId: number,
    data: BlockData,
  ) => void
  onFlush: (blockId: number) => void
  onDelete: (blockId: number) => void
}

export function SortableBlock({
  block,
  onDataChange,
  onFlush,
  onDelete,
}: SortableBlockProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `block-${block.id}`,
  })

  const style: CSSProperties = {
    transform:
      CSS.Transform.toString(
        transform,
      ),
    transition,
  }

  const text = getBlockText(block)
  const checked = getBlockChecked(block)
  const listItems =
    getBlockListItems(block)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={
        isDragging
          ? 'editor-block dragging'
          : 'editor-block'
      }
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        className="block-drag-handle"
        aria-label="Arrastar bloco"
        title="Arrastar para reordenar"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={16} />
      </button>

      <div className="block-content">
        {block.blockType === 'heading' && (
          <input
            className="block-heading-input"
            type="text"
            value={text}
            placeholder="Título..."
            onChange={(event) =>
              onDataChange(
                block.id,
                {
                  ...block.data,
                  text: event.target.value,
                },
              )
            }
            onBlur={() =>
              onFlush(block.id)
            }
          />
        )}

        {block.blockType === 'text' && (
          <textarea
            className="block-textarea"
            rows={3}
            value={text}
            placeholder="Escreva alguma coisa..."
            onChange={(event) =>
              onDataChange(
                block.id,
                {
                  ...block.data,
                  text: event.target.value,
                },
              )
            }
            onBlur={() =>
              onFlush(block.id)
            }
          />
        )}

        {block.blockType === 'checkbox' && (
          <label className="block-checkbox-row">
            <input
              type="checkbox"
              checked={checked}
              onChange={(event) =>
                onDataChange(
                  block.id,
                  {
                    ...block.data,
                    checked:
                      event.target.checked,
                  },
                )
              }
            />

            <input
              className={
                checked
                  ? 'block-line-input checked'
                  : 'block-line-input'
              }
              type="text"
              value={text}
              placeholder="Tarefa..."
              onChange={(event) =>
                onDataChange(
                  block.id,
                  {
                    ...block.data,
                    text: event.target.value,
                  },
                )
              }
              onBlur={() =>
                onFlush(block.id)
              }
            />
          </label>
        )}

        {block.blockType === 'list' && (
          <div className="block-list-items">
            {listItems.map(
              (item, index) => (
                <div
                  className="block-list-item"
                  key={`${block.id}-${index}`}
                >
                  <span
                    className="block-list-bullet"
                    aria-hidden="true"
                  >
                    ?
                  </span>

                  <input
                    className="block-line-input"
                    type="text"
                    value={item}
                    data-block-list={block.id}
                    data-list-index={index}
                    placeholder="Item da lista..."
                    onChange={(event) => {
                      const nextItems = [
                        ...listItems,
                      ]

                      nextItems[index] =
                        event.target.value

                      onDataChange(
                        block.id,
                        {
                          ...block.data,
                          items: nextItems,
                        },
                      )
                    }}
                    onPaste={(event) => {
                      const pastedText =
                        event.clipboardData
                          .getData('text')

                      const pastedItems =
                        pastedText
                          .split(/\r?\n/)

                      if (
                        pastedItems.length <= 1
                      ) {
                        return
                      }

                      event.preventDefault()

                      const nextItems = [
                        ...listItems,
                      ]

                      const start =
                        event.currentTarget
                          .selectionStart
                        ?? item.length

                      const end =
                        event.currentTarget
                          .selectionEnd
                        ?? start

                      pastedItems[0] =
                        item.slice(0, start)
                        + pastedItems[0]

                      pastedItems[
                        pastedItems.length - 1
                      ] =
                        pastedItems[
                          pastedItems.length - 1
                        ]
                        + item.slice(end)

                      nextItems.splice(
                        index,
                        1,
                        ...pastedItems,
                      )

                      onDataChange(
                        block.id,
                        {
                          ...block.data,
                          items: nextItems,
                        },
                      )

                      window.requestAnimationFrame(
                        () => {
                          const targetIndex =
                            index
                            + pastedItems.length
                            - 1

                          const selector =
                            `input[data-block-list="${block.id}"]`
                            + `[data-list-index="${targetIndex}"]`

                          document
                            .querySelector<HTMLInputElement>(
                              selector,
                            )
                            ?.focus()
                        },
                      )
                    }}
                    onKeyDown={(event) => {
                      if (
                        event.key === 'Enter'
                      ) {
                        event.preventDefault()

                        const nextItems = [
                          ...listItems,
                        ]

                        nextItems.splice(
                          index + 1,
                          0,
                          '',
                        )

                        onDataChange(
                          block.id,
                          {
                            ...block.data,
                            items: nextItems,
                          },
                        )

                        window.requestAnimationFrame(
                          () => {
                            const selector =
                              `input[data-block-list="${block.id}"]`
                              + `[data-list-index="${index + 1}"]`

                            document
                              .querySelector<HTMLInputElement>(
                                selector,
                              )
                              ?.focus()
                          },
                        )

                        return
                      }

                      if (
                        event.key === 'ArrowUp'
                        && index > 0
                      ) {
                        event.preventDefault()

                        const selector =
                          `input[data-block-list="${block.id}"]`
                          + `[data-list-index="${index - 1}"]`

                        document
                          .querySelector<HTMLInputElement>(
                            selector,
                          )
                          ?.focus()

                        return
                      }

                      if (
                        event.key === 'ArrowDown'
                        && index
                          < listItems.length - 1
                      ) {
                        event.preventDefault()

                        const selector =
                          `input[data-block-list="${block.id}"]`
                          + `[data-list-index="${index + 1}"]`

                        document
                          .querySelector<HTMLInputElement>(
                            selector,
                          )
                          ?.focus()

                        return
                      }

                      if (
                        event.key === 'Backspace'
                        && item === ''
                        && listItems.length > 1
                      ) {
                        event.preventDefault()

                        const nextItems = [
                          ...listItems,
                        ]

                        nextItems.splice(
                          index,
                          1,
                        )

                        onDataChange(
                          block.id,
                          {
                            ...block.data,
                            items: nextItems,
                          },
                        )

                        const targetIndex =
                          index > 0
                            ? index - 1
                            : 0

                        window.requestAnimationFrame(
                          () => {
                            const selector =
                              `input[data-block-list="${block.id}"]`
                              + `[data-list-index="${targetIndex}"]`

                            document
                              .querySelector<HTMLInputElement>(
                                selector,
                              )
                              ?.focus()
                          },
                        )
                      }
                    }}
                    onBlur={() =>
                      onFlush(block.id)
                    }
                  />
                </div>
              ),
            )}
          </div>
        )}
      </div>

      <button
        type="button"
        className="block-delete-button"
        aria-label="Excluir bloco"
        title="Excluir bloco"
        onClick={() =>
          onDelete(block.id)
        }
      >
        <X size={16} />
      </button>
    </div>
  )
}

