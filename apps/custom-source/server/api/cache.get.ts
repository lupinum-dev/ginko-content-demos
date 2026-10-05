import { defineEventHandler } from 'h3'
import { many } from '@lupinum/ginko-content/server'
import { products } from '../../content.config'
export default defineEventHandler(event => many(event, products, { limit: 10 }))
