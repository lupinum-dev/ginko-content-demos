import { many } from '@lupinum/ginko-content/server'
import { records } from '~~/content.config'
export default defineEventHandler(event => many(event, records))
