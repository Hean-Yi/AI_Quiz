import { computed, inject } from 'vue'
import { useRoute } from 'vue-router'

export const getLayoutPrefix = (path = '') => {
  if (path.startsWith('/desktop')) return '/desktop'
  if (path.startsWith('/mobile')) return '/mobile'
  return ''
}

export const withLayoutPrefix = (prefix, path) => {
  if (!path.startsWith('/')) return path
  if (path === '/') return prefix || '/'
  return `${prefix}${path}`
}

export const useLayoutPath = () => {
  const route = useRoute()
  const layoutPrefix = computed(() => getLayoutPrefix(route.path || ''))
  const withLayout = (path) => withLayoutPrefix(layoutPrefix.value, path)
  return { layoutPrefix, withLayout }
}

export const useLayoutMode = () => {
  const injected = inject('layoutMode', null)
  const isDesktopLayout = computed(() => injected ? injected.value === 'desktop' : false)
  return { isDesktopLayout }
}
