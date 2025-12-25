<template>
  <teleport to="body">
    <div
      v-if="visibleProxy"
      class="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      :class="isDesktopLayout ? 'px-6 py-8' : 'px-4'"
      @click.self="handleClose"
    >
      <div
        class="bg-white w-full rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-scale-in"
        :class="isDesktopLayout ? 'w-[min(1100px,95vw)] h-[85vh]' : 'max-w-md max-h-[85vh]'"
      >
        <div class="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-white">
          <div class="flex items-center gap-2 text-sm font-bold text-gray-800 truncate">
            <i class="fa-solid fa-file-pdf text-red-500"></i>
            <span class="truncate">{{ title }}</span>
            <span v-if="page" class="text-xs text-gray-400 shrink-0">P{{ page }}</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-1.5 py-1 text-xs text-gray-500">
              <button
                class="w-7 h-7 rounded-full hover:bg-white text-gray-500 disabled:text-gray-300"
                :disabled="scale <= minScale"
                @click="zoomOut"
              >
                <i class="fa-solid fa-minus"></i>
              </button>
              <button class="px-2 font-semibold text-gray-600" @click="resetZoom">
                {{ zoomLabel }}
              </button>
              <button
                class="w-7 h-7 rounded-full hover:bg-white text-gray-500 disabled:text-gray-300"
                :disabled="scale >= maxScale"
                @click="zoomIn"
              >
                <i class="fa-solid fa-plus"></i>
              </button>
            </div>
            <button @click="handleClose" class="w-8 h-8 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-400 transition-colors">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>

        <div ref="canvasWrapRef" class="relative bg-gray-50 flex-1 overflow-auto p-4">
          <div v-if="loading" class="absolute inset-0 flex items-center justify-center text-sm text-gray-500 gap-2">
            <i class="fa-solid fa-circle-notch fa-spin text-klein-blue"></i>
            <span>正在加载...</span>
          </div>

          <canvas
            v-show="!loading && !error"
            ref="canvasRef"
            class="block max-w-none rounded-xl bg-white shadow-inner mx-auto"
          />

          <div v-if="error" class="text-sm text-gray-500 text-center px-4">
            {{ error }}
          </div>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import { useLayoutMode } from '../utils/layout'

GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()

const props = defineProps({
  visible: { type: Boolean, default: false },
  fileUrl: { type: String, default: '' },
  fileData: { type: Uint8Array, default: null },
  page: { type: Number, default: 1 },
  title: { type: String, default: 'PDF 预览' }
})

const emit = defineEmits(['update:visible'])

const { isDesktopLayout } = useLayoutMode()
const canvasRef = ref(null)
const canvasWrapRef = ref(null)
const loading = ref(false)
const error = ref('')
const scale = ref(1)
const minScale = 0.6
const maxScale = 2.5

let pdfDoc = null
let renderTask = null
let currentSource = null
let renderToken = 0

const isRenderCanceled = (err) => (
  err?.name === 'RenderingCancelledException' ||
  err?.message?.includes('Rendering cancelled')
)

const visibleProxy = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

const zoomLabel = computed(() => `${Math.round(scale.value * 100)}%`)

const handleClose = () => {
  visibleProxy.value = false
}

const zoomIn = () => {
  scale.value = Math.min(maxScale, Number((scale.value + 0.2).toFixed(2)))
  if (visibleProxy.value) {
    renderPage()
  }
}

const zoomOut = () => {
  scale.value = Math.max(minScale, Number((scale.value - 0.2).toFixed(2)))
  if (visibleProxy.value) {
    renderPage()
  }
}

const resetZoom = () => {
  scale.value = 1
  if (visibleProxy.value) {
    renderPage()
  }
}

const cleanup = async () => {
  if (renderTask) {
    try {
      renderTask.cancel()
    } catch (e) {
      console.warn('Render task cancel failed', e)
    }
    renderTask = null
  }
  if (pdfDoc) {
    try {
      await pdfDoc.destroy()
    } catch (e) {
      console.warn('PDF destroy failed', e)
    }
    pdfDoc = null
    currentSource = null
  }
}

const renderPage = async () => {
  const hasBinaryData = props.fileData instanceof Uint8Array && props.fileData.byteLength > 0
  const hasUrl = typeof props.fileUrl === 'string' && props.fileUrl.length > 0
  if (!visibleProxy.value || (!hasBinaryData && !hasUrl)) return
  await nextTick()
  const canvas = canvasRef.value
  if (!canvas) return

  loading.value = true
  error.value = ''
  const token = ++renderToken

  try {
    const isBinarySource = hasBinaryData
    const sourceKey = isBinarySource ? props.fileData : props.fileUrl
    const shouldResetScale = currentSource !== sourceKey

    if (!pdfDoc || currentSource !== sourceKey) {
      await cleanup()
      const docSource = isBinarySource
        ? { data: props.fileData.slice() }
        : props.fileUrl
      pdfDoc = await getDocument(docSource).promise
      currentSource = sourceKey
      if (shouldResetScale) {
        scale.value = 1
      }
    }

    const pageNumber = Math.max(1, props.page || 1)
    const safePageNumber = Math.min(pageNumber, pdfDoc.numPages || pageNumber)
    const page = await pdfDoc.getPage(safePageNumber)
    if (token !== renderToken) return
    const baseViewport = page.getViewport({ scale: 1 })
    const wrapWidth = canvasWrapRef.value?.clientWidth || 420
    const targetWidth = Math.min(1100, Math.max(320, wrapWidth - 32))
    const baseScale = Math.max(0.6, Math.min(2.2, targetWidth / baseViewport.width))
    const viewport = page.getViewport({ scale: baseScale * scale.value })
    const context = canvas.getContext('2d')
    canvas.width = viewport.width
    canvas.height = viewport.height

    renderTask?.cancel()
    renderTask = page.render({ canvasContext: context, viewport })
    await renderTask.promise
    if (token !== renderToken) return
  } catch (e) {
    console.error('Failed to render pdf preview', e)
    if (token !== renderToken || isRenderCanceled(e)) {
      return
    }
    error.value = '无法加载预览，请稍后重试'
  } finally {
    loading.value = false
  }
}

watch(() => props.visible, (value) => {
  if (value) {
    renderPage()
  } else {
    cleanup()
  }
})

watch(() => [props.fileUrl, props.page, props.fileData], () => {
  if (visibleProxy.value) {
    renderPage()
  }
})

onBeforeUnmount(() => {
  cleanup()
})
</script>

<style scoped>
.animate-scale-in {
  animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes scaleIn {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
</style>
