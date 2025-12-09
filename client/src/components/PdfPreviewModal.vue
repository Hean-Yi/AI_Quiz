<template>
  <teleport to="body">
    <div
      v-if="visibleProxy"
      class="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      @click.self="handleClose"
    >
      <div class="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-scale-in">
        <div class="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-white">
          <div class="flex items-center gap-2 text-sm font-bold text-gray-800 truncate">
            <i class="fa-solid fa-file-pdf text-red-500"></i>
            <span class="truncate">{{ title }}</span>
            <span v-if="page" class="text-xs text-gray-400 shrink-0">P{{ page }}</span>
          </div>
          <button @click="handleClose" class="w-8 h-8 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-400 transition-colors">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div class="relative bg-gray-50 flex-1 flex items-center justify-center p-3">
          <div v-if="loading" class="absolute inset-0 flex items-center justify-center text-sm text-gray-500 gap-2">
            <i class="fa-solid fa-circle-notch fa-spin text-klein-blue"></i>
            <span>正在加载...</span>
          </div>

          <canvas
            v-show="!loading && !error"
            ref="canvasRef"
            class="w-full h-auto max-h-[70vh] object-contain rounded-xl bg-white shadow-inner"
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

GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()

const props = defineProps({
  visible: { type: Boolean, default: false },
  fileUrl: { type: String, default: '' },
  fileData: { type: Uint8Array, default: null },
  page: { type: Number, default: 1 },
  title: { type: String, default: 'PDF 预览' }
})

const emit = defineEmits(['update:visible'])

const canvasRef = ref(null)
const loading = ref(false)
const error = ref('')

let pdfDoc = null
let renderTask = null
let currentSource = ''

const visibleProxy = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

const handleClose = () => {
  visibleProxy.value = false
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
    currentSource = ''
  }
}

const renderPage = async () => {
  if (!visibleProxy.value || (!props.fileUrl && !props.fileData)) return
  await nextTick()
  const canvas = canvasRef.value
  if (!canvas) return

  loading.value = true
  error.value = ''

  try {
    const isBinarySource = props.fileData instanceof Uint8Array && props.fileData.length > 0
    const sourceKey = isBinarySource ? 'binary' : props.fileUrl

    if (!pdfDoc || currentSource !== sourceKey) {
      await cleanup()
      pdfDoc = isBinarySource
        ? await getDocument({ data: props.fileData }).promise
        : await getDocument(props.fileUrl).promise
      currentSource = sourceKey
    }

    const pageNumber = Math.max(1, props.page || 1)
    const page = await pdfDoc.getPage(pageNumber)
    const baseViewport = page.getViewport({ scale: 1 })
    const targetWidth = 420
    const scale = Math.min(1.6, Math.max(0.9, targetWidth / baseViewport.width))
    const viewport = page.getViewport({ scale })
    const context = canvas.getContext('2d')
    canvas.width = viewport.width
    canvas.height = viewport.height

    renderTask?.cancel()
    renderTask = page.render({ canvasContext: context, viewport })
    await renderTask.promise
  } catch (e) {
    console.error('Failed to render pdf preview', e)
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
