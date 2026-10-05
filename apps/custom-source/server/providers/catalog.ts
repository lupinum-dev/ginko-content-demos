import { bindContentProvider } from '@lupinum/ginko-content/provider'
import { source, type VerifiedContext } from '../store/source'
// The whole store is public. Caller-supplied preview/tenant headers confer no
// authority; unpublished entries are excluded by every source operation.
export default bindContentProvider({ source, createContext: async (): Promise<VerifiedContext> => ({ audience: 'public' }) })
