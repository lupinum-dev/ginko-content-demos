import { spawn, spawnSync } from 'node:child_process'
import { writeFileSync, mkdirSync, readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
const root=resolve(import.meta.dirname,'..');const app=resolve(root,'apps/blog');const evidence=resolve(root,'results/evidence/blog')
mkdirSync(evidence,{recursive:true})
const run=(name,args)=>{
 const result=spawnSync('corepack',['pnpm','exec','nuxt',...args],{cwd:app,encoding:'utf8'})
 writeFileSync(resolve(evidence,`${name}.log`),result.stdout+result.stderr)
 return {exitCode:result.status,evidence:`results/evidence/blog/${name}.log`}
}
const output={crossReference:run('K201-cross-reference',['prepare','known-failures/cross-reference'])}
async function fixture(name,dir,port){
 const built=run(`${name}-build`,['build',dir]);if(built.exitCode)return {...built,status:'blocked'}
 const child=spawn(process.execPath,[resolve(app,dir,'.output/server/index.mjs')],{cwd:app,env:{...process.env,PORT:String(port)},stdio:'ignore'})
 try {
  for(let i=0;i<100;i++){
   try {
    const response=await fetch(`http://localhost:${port}/api/records`);const text=await response.text()
    writeFileSync(resolve(evidence,`${name}-response.json`),`${response.status}\n${text}\n`)
    const missingPageStatus=name==='missing-handler'?(await fetch(`http://localhost:${port}/unhandled/hello`)).status:undefined
    return {...built,missingPageStatus,httpStatus:response.status,body:JSON.parse(text),responseEvidence:`results/evidence/blog/${name}-response.json`}
   }catch(error){if(i===99)throw error;await new Promise(resolve=>setTimeout(resolve,100))}
  }
 }finally{child.kill('SIGTERM')}
}
output.missingHandler=await fixture('missing-handler','fixtures/missing-handler',3218)
output.csvRows=await fixture('csv-rows','fixtures/csv-rows',3216)
output.malformed=await fixture('K202-malformed-json','known-failures/malformed-json',3217)
const walk=path=>readdirSync(path,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(resolve(path,entry.name)):[resolve(path,entry.name)])
const files=walk(resolve(app,'.output/public'))
output.runtimeArtifacts={html:files.filter(p=>p.endsWith('.html')).map(p=>p.slice(root.length+1)),queryDependencies:files.filter(p=>p.includes('/api/blog-content/')).length,rawMarkdown:files.filter(p=>p.includes('/raw/')&&p.endsWith('.md')).length}
const vercelFiles=walk(resolve(app,'.vercel/output/static'))
output.vercelArtifacts={html:vercelFiles.filter(p=>p.endsWith('.html')).map(p=>p.slice(root.length+1)),pageHtml:vercelFiles.filter(p=>p.endsWith('.html')&&!p.includes('/api/')).map(p=>p.slice(root.length+1))}
const nitro=readFileSync(resolve(app,'.vercel/output/functions/__fallback.func/chunks/nitro/nitro.mjs'),'utf8')
output.withoutToken={registeredRevalidation:nitro.includes('/api/blog-content/revalidate'),note:'Main local production build has no env token; production Vercel build has the configured token.'}
writeFileSync(resolve(evidence,'local-support.json'),JSON.stringify(output,null,2)+'\n')
console.log(JSON.stringify(output,null,2))
