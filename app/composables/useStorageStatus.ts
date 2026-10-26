import type { StorageStatusState } from '~/utils/storage/types'

export interface StorageStatus {
  state: StorageStatusState
  message: string
}

/** Save status of the remote storage adapters; the topbar shows it only when storage is not 'local' */
export const useStorageStatus = () => {
  const config = useRuntimeConfig().public
  const status = useState<StorageStatus>('storage-status', () => ({
    state: config.storage === 'local' ? 'local' : 'loading',
    message: ''
  }))

  const set = (state: StorageStatusState, message = '') => {
    status.value = { state, message }
  }

  return { status, set }
}
