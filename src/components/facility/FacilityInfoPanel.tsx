import { useState, useMemo } from 'react'
import { X, Edit3, Download, ExternalLink } from 'lucide-react'
import { useFacilityStore } from '@/stores/facilityStore'
import type { FacilityModelInfo } from '@/types/facility'

export default function FacilityInfoPanel() {
  const models = useFacilityStore(state => state.models)
  const selectedModelId = useFacilityStore(state => state.selectedModelId)
  const editMode = useFacilityStore(state => state.editMode)
  const selectModel = useFacilityStore(state => state.selectModel)
  const setEditingModel = useFacilityStore(state => state.setEditingModel)

  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)

  const selectedModel = useMemo(
    () => models.find(m => m.id === selectedModelId) ?? null,
    [models, selectedModelId]
  )

  const isOpen = selectedModelId !== null

  return (
    <>
      {/* Lightbox */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center cursor-pointer"
          onClick={() => setLightboxSrc(null)}
        >
          <img
            src={lightboxSrc}
            className="max-w-[90vw] max-h-[90vh] object-contain rounded"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}

      {/* Panel */}
      <div
        className={`fixed right-0 top-0 h-full w-80 bg-gray-900 border-l border-gray-700 z-30 flex flex-col transform transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {selectedModel && (
          <>
            {/* Header */}
            <div className="flex items-start justify-between p-4 border-b border-gray-700">
              <div className="flex-1 min-w-0 mr-2">
                <h3 className="text-white font-semibold truncate">{selectedModel.name}</h3>
              </div>
              <button
                onClick={() => selectModel(null)}
                className="text-gray-400 hover:text-white shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            {/* Actions */}
            {editMode && (
              <div className="flex gap-2 p-3 border-b border-gray-700">
                <button
                  onClick={() => setEditingModel(selectedModel.id)}
                  className="flex items-center gap-1 bg-gray-700 hover:bg-gray-600 text-white text-sm py-2 px-3 rounded"
                >
                  <Edit3 size={14} /> 編輯
                </button>
              </div>
            )}

            {/* Rich Content */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {selectedModel.infos.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">無附加資訊</p>
              ) : (
                selectedModel.infos.map(info => (
                  <InfoEntry key={info.id} info={info} onImageClick={setLightboxSrc} />
                ))
              )}
            </div>
          </>
        )}
      </div>
    </>
  )
}

function InfoEntry({
  info,
  onImageClick,
}: {
  info: FacilityModelInfo
  onImageClick: (src: string) => void
}) {
  return (
    <div className="border border-gray-700 rounded p-3">
      <div className="text-xs text-gray-400 mb-1">{info.label}</div>
      {info.type === 'TEXT' && (
        <p className="text-sm text-gray-200 whitespace-pre-wrap">{info.content}</p>
      )}
      {info.type === 'IMAGE' && (
        <button onClick={() => onImageClick(info.content)} className="block w-full">
          <img
            src={info.content}
            alt={info.label}
            className="w-full max-h-40 object-cover rounded hover:opacity-80 transition-opacity cursor-zoom-in"
          />
        </button>
      )}
      {info.type === 'DOCUMENT' && (
        <a
          href={info.content}
          download
          className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300"
        >
          <Download size={14} />
          <span className="truncate">{info.label}</span>
        </a>
      )}
      {info.type === 'LINK' && (
        <a
          href={info.content}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300"
        >
          <ExternalLink size={14} />
          <span className="truncate">{info.content}</span>
        </a>
      )}
    </div>
  )
}
