import { blockquoteMarkdown, getMarkdownProp, registerAgentMarkdownSerializers, type AgentMarkdownSerializer } from '@lupinum/ginko-content/agent'
import { defineNitroPlugin } from 'nitropack/runtime'
const renderCallout: AgentMarkdownSerializer = (node, context) => blockquoteMarkdown(`**${getMarkdownProp(node, 'title') || 'Note'}**\n\n${context.renderChildren(node)}`)
export default defineNitroPlugin(() => registerAgentMarkdownSerializers({ callout: renderCallout, MdcCallout: renderCallout }))
