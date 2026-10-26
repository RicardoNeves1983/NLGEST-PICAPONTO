import React, {useEffect, useMemo, useRef, useState} from 'react'
import {AlertTriangle, ArrowLeft, Camera, CheckCircle2, ClipboardList, Download, ExternalLink, FileText, HardHat, ImagePlus, Images, LayoutGrid, Layers, Link2, MapPin, Paperclip, Pencil, Plus, Search, Trash2, X} from 'lucide-react'
import './works.css'
import {
 CORRECTION_STATUSES, DOC_TYPES, PRIORITIES, REINSPECTION_RESULTS, RESULTS, SPECIALTY_STATUSES, WORK_STATUSES, WORK_TYPES,
 avg, daysUntil, deleteDocument, deletePhoto, deletePoint, deleteSpecialty, deleteWork, documentState, indicators, insertDocument, insertPoint,
 insertSpecialty, insertWork, isOpenNok, isOverdue, loadWorkDetail, loadWorks, signedUrl, signedUrls, todayISO, updateDocument, updatePhoto,
 updatePoint, updateSpecialty, updateWork, uploadPhoto,
 type DocumentInput, type Point, type PointInput, type Specialty, type SpecialtyInput, type Work, type WorkDocument, type WorkInput, type WorkPhoto, type WorkSummary
} from './works-data'

type Client={id:string;name:string}
type Center={id:string;clientId:string;code:string;name:string}
type Notify=(s:string)=>void

const fmtDate=(d:string)=>d?new Date(`${d}T00:00:00`).toLocaleDateString('pt-PT'):'—'
const pct=(x:number)=>`${(x*100).toLocaleString('pt-PT',{minimumFractionDigits:1,maximumFractionDigits:1})}%`
const slug=(s:string)=>s.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-')
const errMsg=(e:unknown,fallback:string)=>{const m=e instanceof Error?e.message:(e as any)?.message;return m?`${fallback}: ${m}`:fallback}
const missingTables=(e:any)=>e?.code==='42P01'||e?.code==='PGRST205'||/does not exist|schema cache/i.test(e?.message||'')

function Chip({value,kind}:{value:string;kind:string}){return value?<em className={`wk-chip ${kind}-${slug(value)}`}>{value}</em>:<span className="wk-dash">—</span>}
function Bar({value}:{value:number}){const v=Math.max(0,Math.min(100,value));return <div className="wk-bar" title={`${Math.round(v)}%`}><i style={{width:`${v}%`}}/></div>}
function Dialog({title,eyebrow,onClose,wide,children}:{title:string;eyebrow?:string;onClose:()=>void;wide?:boolean;children:React.ReactNode}){
 return <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><div className={`modal wk-modal ${wide?'wide':''}`}><div className="modal-head"><div>{eyebrow&&<small>{eyebrow}</small>}<h3>{title}</h3></div><button type="button" onClick={onClose}><X/></button></div>{children}</div></div>
}
function F({label,children,full}:{label:string;children:React.ReactNode;full?:boolean}){return <label className={`field ${full?'wk-full':''}`}><span>{label}</span>{children}</label>}
function useForm<T extends Record<string,any>>(initial:T){
 const [f,setF]=useState<T>(initial)
 const bind=(k:keyof T)=>({value:f[k] as any,onChange:(e:React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>)=>setF(v=>({...v,[k]:e.target.value}))})
 return {f,setF,bind}
}

// ═════════════════════════════ Página principal ═════════════════════════════
export default function WorksPage({companyId,clients,centers,notify,canDelete,userName}:{companyId:string;clients:Client[];centers:Center[];notify:Notify;canDelete:boolean;userName:string}){
 const [works,setWorks]=useState<Work[]>([]),[summaries,setSummaries]=useState<Record<string,WorkSummary>>({})
 const [loading,setLoading]=useState(true),[missing,setMissing]=useState(false)
 const [selected,setSelected]=useState(''),[editing,setEditing]=useState<Work|'new'|null>(null)
 const [filter,setFilter]=useState<'ativas'|'concluidas'|'todas'>('ativas'),[q,setQ]=useState('')
 const refresh=()=>{if(!companyId)return;setLoading(true);loadWorks().then(r=>{setWorks(r.works);setSummaries(r.summaries);setMissing(false)}).catch(e=>{console.error(e);if(missingTables(e))setMissing(true);else notify(errMsg(e,'Não foi possível carregar as obras'))}).finally(()=>setLoading(false))}
 useEffect(refresh,[companyId])
 const work=works.find(w=>w.id===selected)
 const saveWork=async(d:WorkInput)=>{
  if(editing==='new'){const w=await insertWork(companyId,d);setWorks(v=>[w,...v]);setSelected(w.id);notify('Obra criada com sucesso')}
  else if(editing){const w=await updateWork(editing.id,d);setWorks(v=>v.map(x=>x.id===w.id?w:x));notify('Dados da obra guardados com sucesso')}
  setEditing(null)
 }
 if(missing)return <div className="card wk-empty"><AlertTriangle/><h3>Falta ativar o módulo de obras</h3><p>Execute o ficheiro <code>supabase/works_migration.sql</code> uma vez no SQL Editor do Supabase e volte a abrir esta página.</p><button className="primary" onClick={refresh}>Tentar novamente</button></div>
 if(work)return <><WorkDetail key={work.id} work={work} companyId={companyId} clients={clients} centers={centers} notify={notify} canDelete={canDelete} userName={userName}
  onBack={()=>{setSelected('');refresh()}} onEdit={()=>setEditing(work)}
  onDeleted={()=>{setWorks(v=>v.filter(x=>x.id!==work.id));setSelected('');notify('Obra eliminada com sucesso')}}/>
  {editing&&<WorkForm work={editing==='new'?null:editing} clients={clients} centers={centers} onClose={()=>setEditing(null)} onSave={saveWork} notify={notify}/>}</>
 const done=(w:Work)=>w.status==='Concluída'||w.status==='Entregue'
 const term=q.trim().toLowerCase()
 const visible=works.filter(w=>filter==='todas'||(filter==='ativas'?!done(w):done(w))).filter(w=>!term||[w.name,w.address,w.workType,w.ownerName,clients.find(c=>c.id===w.clientId)?.name].some(x=>x?.toLowerCase().includes(term)))
 return <>
  <div className="wk-toolbar"><div className="people-filters">{(['ativas','concluidas','todas'] as const).map(k=><button key={k} className={filter===k?'active':''} onClick={()=>setFilter(k)}>{k==='ativas'?`Em curso (${works.filter(w=>!done(w)).length})`:k==='concluidas'?`Concluídas (${works.filter(done).length})`:'Todas'}</button>)}</div>
   <div className="wk-search"><Search size={16}/><input placeholder="Procurar obra, morada, cliente…" value={q} onChange={e=>setQ(e.target.value)}/></div>
   <button className="primary" onClick={()=>setEditing('new')} disabled={!companyId}><Plus size={16}/>Nova obra</button></div>
  {loading&&!works.length?<p className="muted">A carregar obras…</p>:!visible.length?<div className="card wk-empty"><HardHat/><h3>{works.length?'Nenhuma obra corresponde ao filtro':'Ainda não existem obras'}</h3><p>Crie a primeira obra para registar a checklist de inspeção, as especialidades, os documentos e as fotografias.</p>{!works.length&&<button className="primary" onClick={()=>setEditing('new')}><Plus size={16}/>Criar obra</button>}</div>:
  <div className="wk-grid">{visible.map(w=>{const sm=summaries[w.id]||{points:[],progress:[],expiries:[],photos:0},ind=indicators(sm.points),exec=avg(sm.progress),docAlerts=sm.expiries.filter(d=>{const x=daysUntil(d);return x!==null&&x<=30}).length;return <button className="card wk-card" key={w.id} onClick={()=>setSelected(w.id)}>
   <div className="wk-card-top"><div className="mini-avatar"><HardHat size={16}/></div><Chip value={w.status} kind="ws"/></div>
   <h3>{w.name}</h3><p className="wk-card-sub">{[w.workType,clients.find(c=>c.id===w.clientId)?.name].filter(Boolean).join(' · ')||'Sem tipo ou cliente definido'}</p>
   {w.address&&<p className="wk-card-addr"><MapPin size={13}/>{w.address}</p>}
   <div className="wk-card-exec"><span>Execução</span><b>{Math.round(exec)}%</b></div><Bar value={exec}/>
   <div className="wk-card-kpis"><div><b>{ind.total?pct(ind.pctOk):'—'}</b><span>OK aplicáveis</span></div><div className={ind.openNok?'bad':''}><b>{ind.openNok}</b><span>NOK em aberto</span></div><div><b>{sm.photos}</b><span>Fotografias</span></div></div>
   {(ind.overdue>0||docAlerts>0)&&<div className="wk-card-alert"><AlertTriangle size={14}/>{[ind.overdue?`${ind.overdue} correç${ind.overdue===1?'ão':'ões'} em atraso`:'',docAlerts?`${docAlerts} documento${docAlerts===1?'':'s'} a expirar/expirado${docAlerts===1?'':'s'}`:''].filter(Boolean).join(' · ')}</div>}
  </button>})}</div>}
  {editing&&<WorkForm work={editing==='new'?null:editing} clients={clients} centers={centers} onClose={()=>setEditing(null)} onSave={saveWork} notify={notify}/>}
 </>
}

// ═════════════════════════════ Formulário da obra ═════════════════════════════
function WorkForm({work,clients,centers,onClose,onSave,notify}:{work:Work|null;clients:Client[];centers:Center[];onClose:()=>void;onSave:(d:WorkInput)=>Promise<void>;notify:Notify}){
 const {f,bind}=useForm<WorkInput>(work?{...work}:{name:'',workType:'',address:'',clientId:'',costCenterId:'',ownerName:'',generalContractor:'',inspectorName:'',siteDirector:'',startDate:'',expectedEndDate:'',actualEndDate:'',status:'Por iniciar',notes:''})
 const [busy,setBusy]=useState(false)
 const submit=async(e:React.FormEvent)=>{e.preventDefault();setBusy(true);try{await onSave(f)}catch(err){notify(errMsg(err,'Não foi possível guardar a obra'))}finally{setBusy(false)}}
 const cs=centers.filter(c=>!f.clientId||c.clientId===f.clientId)
 return <Dialog wide eyebrow="RESUMO DA OBRA" title={work?'Editar dados da obra':'Nova obra'} onClose={()=>!busy&&onClose()}><form onSubmit={submit}>
  <div className="wk-form-grid">
   <F label="Nome da obra" full><input {...bind('name')} required autoFocus/></F>
   <F label="Tipo de obra"><input {...bind('workType')} list="wk-types" placeholder="Ex.: Reabilitação"/><datalist id="wk-types">{WORK_TYPES.map(t=><option key={t} value={t}/>)}</datalist></F>
   <F label="Estado geral da obra"><select {...bind('status')}>{WORK_STATUSES.map(s=><option key={s}>{s}</option>)}</select></F>
   <F label="Morada / localização" full><input {...bind('address')}/></F>
   <F label="Cliente"><select {...bind('clientId')}><option value="">— Sem cliente —</option>{clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></F>
   <F label="Centro de custo (picagens)"><select {...bind('costCenterId')}><option value="">— Nenhum —</option>{cs.map(c=><option key={c.id} value={c.id}>{c.code} · {c.name}</option>)}</select></F>
   <F label="Dono de obra"><input {...bind('ownerName')}/></F>
   <F label="Empreiteiro geral"><input {...bind('generalContractor')}/></F>
   <F label="Fiscal responsável"><input {...bind('inspectorName')}/></F>
   <F label="Diretor de obra"><input {...bind('siteDirector')}/></F>
   <F label="Data de início"><input type="date" {...bind('startDate')}/></F>
   <F label="Conclusão prevista"><input type="date" {...bind('expectedEndDate')}/></F>
   <F label="Conclusão efetiva"><input type="date" {...bind('actualEndDate')}/></F>
   <F label="Observações" full><textarea rows={2} {...bind('notes')}/></F>
  </div>
  {!work&&<p className="muted">As 26 especialidades (preparação e estaleiro até ensaios e vistorias) são criadas automaticamente. Pode acrescentar ou remover depois.</p>}
  <div className="form-actions"><button type="button" className="secondary" onClick={onClose} disabled={busy}>Cancelar</button><button className="primary" disabled={busy}>{busy?'A guardar…':'Guardar'}</button></div>
 </form></Dialog>
}

// ═════════════════════════════ Ficha da obra ═════════════════════════════
type DetailTab='resumo'|'checklist'|'especialidades'|'documentos'|'fotos'
function WorkDetail({work,companyId,clients,centers,notify,canDelete,userName,onBack,onEdit,onDeleted}:{work:Work;companyId:string;clients:Client[];centers:Center[];notify:Notify;canDelete:boolean;userName:string;onBack:()=>void;onEdit:()=>void;onDeleted:()=>void}){
 const [tab,setTab]=useState<DetailTab>('resumo')
 const [specs,setSpecs]=useState<Specialty[]>([]),[points,setPoints]=useState<Point[]>([]),[docs,setDocs]=useState<WorkDocument[]>([]),[photos,setPhotos]=useState<WorkPhoto[]>([])
 const [urls,setUrls]=useState<Record<string,string>>({}),[loading,setLoading]=useState(true)
 const [openPoint,setOpenPoint]=useState<Point|'new'|null>(null),[viewPhoto,setViewPhoto]=useState<WorkPhoto|null>(null),[confirmDelete,setConfirmDelete]=useState(false)
 const loadThumbs=async(list:WorkPhoto[])=>{const need=list.map(p=>p.thumbPath||p.storagePath).filter(p=>!urls[p]);if(!need.length)return;try{const r=await signedUrls(need);setUrls(u=>({...u,...r}))}catch(e){console.error(e)}}
 useEffect(()=>{setLoading(true);loadWorkDetail(work.id).then(d=>{setSpecs(d.specialties);setPoints(d.points);setDocs(d.documents);setPhotos(d.photos);void loadThumbs(d.photos)}).catch(e=>notify(errMsg(e,'Não foi possível carregar a obra'))).finally(()=>setLoading(false))},[work.id])
 const addPhotos=async(files:File[],meta:{specialtyId?:string;pointId?:string;caption?:string})=>{
  const added:WorkPhoto[]=[];let failed=0
  for(const file of files){try{added.push(await uploadPhoto(companyId,work.id,file,meta))}catch(e){console.error(e);failed++}}
  if(added.length){setPhotos(v=>[...added,...v]);await loadThumbs(added)}
  notify(failed?`${added.length} fotografia(s) carregada(s), ${failed} falharam`:`${added.length} fotografia${added.length===1?'':'s'} carregada${added.length===1?'':'s'} com sucesso`)
 }
 const ind=indicators(points),exec=avg(specs.map(s=>s.progress))
 const docAlerts=docs.filter(d=>{const x=daysUntil(d.expiryDate);return x!==null&&x<=30}).length
 const client=clients.find(c=>c.id===work.clientId),center=centers.find(c=>c.id===work.costCenterId)
 const tabs:[DetailTab,string,React.ElementType,string?][]=[['resumo','Resumo',LayoutGrid],['checklist','Checklist',ClipboardList,String(points.length)],['especialidades','Especialidades',Layers],['documentos','Documentos e validades',FileText,docAlerts?`${docAlerts}!`:String(docs.length)],['fotos','Fotografias',Images,String(photos.length)]]
 const remove=async()=>{try{await deleteWork(work.id);onDeleted()}catch(e){notify(errMsg(e,'Não foi possível eliminar a obra'))}}
 return <div className="wk-detail">
  <div className="wk-detail-head card"><button className="secondary wk-back" onClick={onBack}><ArrowLeft size={16}/>Obras</button>
   <div className="wk-detail-title"><small>OBRA</small><h2>{work.name}</h2><p>{[work.workType,client?.name,work.address].filter(Boolean).join(' · ')||'—'}</p></div>
   <div className="wk-detail-actions"><Chip value={work.status} kind="ws"/><button className="secondary" onClick={onEdit}><Pencil size={15}/>Editar</button>{canDelete&&<button className="wk-icon-btn danger" title="Eliminar obra" onClick={()=>setConfirmDelete(true)}><Trash2 size={16}/></button>}</div></div>
  <div className="portal-tabs wk-tabs">{tabs.map(([id,label,Icon,count])=><button key={id} className={tab===id?'selected':''} onClick={()=>setTab(id)}><Icon size={15}/>{label}{count!==undefined&&<b className={count.endsWith('!')?'alert':''}>{count.replace('!','')}</b>}</button>)}</div>
  {loading?<p className="muted">A carregar…</p>:
   tab==='resumo'?<Summary work={work} clientName={client?.name} centerName={center?`${center.code} · ${center.name}`:''} ind={ind} exec={exec} docs={docs} points={points} specs={specs} onOpenPoint={p=>{setOpenPoint(p)}} goTo={setTab}/>:
   tab==='checklist'?<Checklist points={points} specs={specs} photos={photos} onOpen={p=>setOpenPoint(p)} onNew={()=>setOpenPoint('new')}/>:
   tab==='especialidades'?<Specialties specs={specs} points={points} companyId={companyId} workId={work.id} notify={notify} onChange={setSpecs} onRemoved={id=>{setSpecs(v=>v.filter(s=>s.id!==id));setPoints(v=>v.map(p=>p.specialtyId===id?{...p,specialtyId:''}:p))}}/>:
   tab==='documentos'?<Documents docs={docs} companyId={companyId} workId={work.id} notify={notify} onChange={setDocs}/>:
   <Gallery photos={photos} specs={specs} points={points} urls={urls} onView={setViewPhoto} onUpload={addPhotos}/>}
  {openPoint&&<PointForm point={openPoint==='new'?null:openPoint} specs={specs} userName={userName} photos={openPoint==='new'?[]:photos.filter(p=>p.pointId===openPoint.id)} urls={urls} onView={setViewPhoto} onClose={()=>setOpenPoint(null)} notify={notify}
   onSave={async(d,files)=>{const saved=openPoint==='new'?await insertPoint(companyId,work.id,d):await updatePoint(openPoint.id,d);setPoints(v=>openPoint==='new'?[...v,saved]:v.map(p=>p.id===saved.id?saved:p));notify(`Ponto ${saved.code} guardado com sucesso`);setOpenPoint(null);if(files.length)await addPhotos(files,{pointId:saved.id,specialtyId:saved.specialtyId})}}
   onDelete={openPoint==='new'?undefined:async()=>{await deletePoint(openPoint.id);setPoints(v=>v.filter(p=>p.id!==openPoint.id));setPhotos(v=>v.map(p=>p.pointId===openPoint.id?{...p,pointId:''}:p));setOpenPoint(null);notify('Ponto de inspeção eliminado')}}/>}
  {viewPhoto&&<PhotoViewer photo={viewPhoto} specs={specs} points={points} thumb={urls[viewPhoto.thumbPath||viewPhoto.storagePath]} onClose={()=>setViewPhoto(null)} notify={notify}
   onSaved={p=>{setPhotos(v=>v.map(x=>x.id===p.id?p:x));setViewPhoto(null);notify('Fotografia atualizada com sucesso')}}
   onDeleted={()=>{setPhotos(v=>v.filter(x=>x.id!==viewPhoto.id));setViewPhoto(null);notify('Fotografia eliminada')}}/>}
  {confirmDelete&&<Dialog title="Eliminar obra" onClose={()=>setConfirmDelete(false)}><div className="delete-dialog"><div className="delete-warning"><AlertTriangle/></div><p>Eliminar definitivamente <strong>{work.name}</strong>?</p><small>Apaga também a checklist ({points.length} pontos), as especialidades, os documentos ({docs.length}) e as fotografias ({photos.length}). Não é possível recuperar.</small><div className="form-actions"><button className="secondary" onClick={()=>setConfirmDelete(false)}>Cancelar</button><button className="delete-confirm" onClick={remove}><Trash2 size={15}/>Eliminar obra</button></div></div></Dialog>}
 </div>
}

// ─────────────────────────── Resumo ───────────────────────────
function Summary({work,clientName,centerName,ind,exec,docs,points,specs,onOpenPoint,goTo}:{work:Work;clientName?:string;centerName:string;ind:ReturnType<typeof indicators>;exec:number;docs:WorkDocument[];points:Point[];specs:Specialty[];onOpenPoint:(p:Point)=>void;goTo:(t:DetailTab)=>void}){
 const info:[string,string][]=[['Nome da obra',work.name],['Tipo de obra',work.workType],['Morada / localização',work.address],['Cliente',clientName||''],['Dono de obra',work.ownerName],['Empreiteiro geral',work.generalContractor],['Fiscal responsável',work.inspectorName],['Diretor de obra',work.siteDirector],['Data de início',fmtDate(work.startDate)],['Conclusão prevista',fmtDate(work.expectedEndDate)],['Conclusão efetiva',fmtDate(work.actualEndDate)],['Estado geral da obra',work.status],['Centro de custo',centerName]]
 const late=work.expectedEndDate&&!work.actualEndDate&&work.expectedEndDate<todayISO()
 const prio=(p:string)=>PRIORITIES.indexOf(p as any)
 const open=points.filter(isOpenNok).sort((a,b)=>prio(a.priority)-prio(b.priority)||(a.correctionDeadline||'9').localeCompare(b.correctionDeadline||'9')).slice(0,6)
 const expired=docs.filter(d=>documentState(d.expiryDate)==='Expirado').length,expiring=docs.filter(d=>documentState(d.expiryDate)==='A expirar em 30 dias').length
 const kpis:[string,string,string?][]=[['Total de pontos',String(ind.total)],['OK',String(ind.ok),'ok'],['NOK',String(ind.nok),ind.nok?'bad':''],['Pendentes',String(ind.pending)],['N/A',String(ind.na)],['% OK sobre pontos aplicáveis',pct(ind.pctOk),'ok'],['NOK em aberto',String(ind.openNok),ind.openNok?'bad':''],['Correções em atraso',String(ind.overdue),ind.overdue?'bad':'']]
 return <div className="wk-summary">
  <div className="card"><div className="card-head"><div><small>DADOS GERAIS</small><h3>Resumo da obra</h3></div></div>
   <div className="wk-info">{info.map(([l,v])=><div key={l}><span>{l}</span><strong>{v||'—'}</strong></div>)}</div>
   {work.notes&&<p className="wk-notes">{work.notes}</p>}{late&&<div className="wk-card-alert"><AlertTriangle size={14}/>A conclusão prevista ({fmtDate(work.expectedEndDate)}) já passou.</div>}</div>
  <div className="wk-side">
   <div className="card"><div className="card-head"><div><small>INDICADORES</small><h3>Fiscalização e qualidade</h3></div></div>
    <div className="wk-kpis">{kpis.map(([l,v,c])=><div key={l} className={c||''}><b>{v}</b><span>{l}</span></div>)}</div>
    <div className="wk-card-exec"><span>Execução média das {specs.length} especialidades</span><b>{Math.round(exec)}%</b></div><Bar value={exec}/>
    {(expired>0||expiring>0)&&<button className="wk-card-alert as-btn" onClick={()=>goTo('documentos')}><AlertTriangle size={14}/>{[expired?`${expired} documento(s) expirado(s)`:'',expiring?`${expiring} a expirar em 30 dias`:''].filter(Boolean).join(' · ')}</button>}</div>
   <div className="card"><div className="card-head"><div><small>PRIORIDADES</small><h3>NOK em aberto</h3></div>{ind.openNok>6&&<button className="text" onClick={()=>goTo('checklist')}>Ver todos</button>}</div>
    {open.length?open.map(p=><button key={p.id} className="wk-nok-row" onClick={()=>onOpenPoint(p)}><Chip value={p.priority} kind="pr"/><div><strong>{p.code} · {p.element}</strong><span>{specs.find(s=>s.id===p.specialtyId)?.name||'Sem especialidade'}{p.zone?` · ${p.zone}`:''}</span></div><small className={isOverdue(p)?'late':''}>{p.correctionDeadline?fmtDate(p.correctionDeadline):'Sem prazo'}</small></button>):<p className="wk-ok-line"><CheckCircle2 size={16}/>Sem anomalias em aberto.</p>}</div>
  </div>
 </div>
}

// ─────────────────────────── Checklist ───────────────────────────
function Checklist({points,specs,photos,onOpen,onNew}:{points:Point[];specs:Specialty[];photos:WorkPhoto[];onOpen:(p:Point)=>void;onNew:()=>void}){
 const [spec,setSpec]=useState(''),[result,setResult]=useState(''),[onlyOpen,setOnlyOpen]=useState(false),[q,setQ]=useState('')
 const term=q.trim().toLowerCase(),specName=(id:string)=>specs.find(s=>s.id===id)?.name||'Sem especialidade'
 const photoCount=useMemo(()=>{const m:Record<string,number>={};photos.forEach(p=>{if(p.pointId)m[p.pointId]=(m[p.pointId]||0)+1});return m},[photos])
 const visible=points.filter(p=>(!spec||p.specialtyId===spec)&&(!result||p.result===result)&&(!onlyOpen||isOpenNok(p))&&(!term||[p.code,p.element,p.zone,p.anomaly,p.correctionOwner].some(x=>x.toLowerCase().includes(term))))
 return <div className="card table-card">
  <div className="card-head"><div><small>PONTOS DE INSPEÇÃO</small><h3>Checklist da obra</h3></div><button className="primary" onClick={onNew}><Plus size={16}/>Novo ponto</button></div>
  <div className="wk-filters">
   <select value={spec} onChange={e=>setSpec(e.target.value)}><option value="">Todas as especialidades</option>{specs.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select>
   <select value={result} onChange={e=>setResult(e.target.value)}><option value="">Todos os resultados</option>{RESULTS.map(r=><option key={r}>{r}</option>)}</select>
   <label className="wk-check"><input type="checkbox" checked={onlyOpen} onChange={e=>setOnlyOpen(e.target.checked)}/>Só NOK em aberto</label>
   <div className="wk-search"><Search size={15}/><input placeholder="Procurar…" value={q} onChange={e=>setQ(e.target.value)}/></div>
  </div>
  <div className="table"><div className="tr th wk-pt-row"><span>Código</span><span>Elemento / ponto a verificar</span><span>Resultado</span><span>Prioridade</span><span>Correção</span><span>Prazo</span><span/></div>
   {visible.map(p=>{const nok=p.result==='NOK';return <button className={`tr wk-pt-row ${isOverdue(p)?'late':''}`} key={p.id} onClick={()=>onOpen(p)}>
    <span className="wk-code">{p.code}</span>
    <span className="wk-pt-main"><strong>{p.element}</strong><small>{specName(p.specialtyId)}{p.zone?` · ${p.zone}`:''}{p.inspectionDate?` · ${fmtDate(p.inspectionDate)}`:''}</small></span>
    <span><Chip value={p.result} kind="rs"/></span>
    <span>{nok?<Chip value={p.priority} kind="pr"/>:<span className="wk-dash">—</span>}</span>
    <span>{nok?<Chip value={p.correctionStatus} kind="cs"/>:<span className="wk-dash">—</span>}</span>
    <span className={isOverdue(p)?'wk-late':''}>{nok&&p.correctionDeadline?fmtDate(p.correctionDeadline):'—'}</span>
    <span className="wk-pt-photos">{photoCount[p.id]?<><Camera size={14}/>{photoCount[p.id]}</>:''}</span>
   </button>})}
   {!visible.length&&<p className="people-empty">{points.length?'Nenhum ponto corresponde aos filtros.':'Ainda não existem pontos de inspeção. Clique em “Novo ponto” para registar o primeiro.'}</p>}
  </div>
 </div>
}

function PointForm({point,specs,userName,photos,urls,onView,onClose,onSave,onDelete,notify}:{point:Point|null;specs:Specialty[];userName:string;photos:WorkPhoto[];urls:Record<string,string>;onView:(p:WorkPhoto)=>void;onClose:()=>void;onSave:(d:PointInput,files:File[])=>Promise<void>;onDelete?:()=>Promise<void>;notify:Notify}){
 const {f,setF,bind}=useForm<PointInput>(point?{...point}:{specialtyId:'',zone:'',element:'',criterion:'',criterionSource:'',inspectionDate:todayISO(),inspector:userName,result:'Pendente',anomaly:'',priority:'Média',correctionOwner:'',correctionStatus:'Por tratar',correctionDeadline:'',reinspectionDate:'',reinspectionResult:'',notes:''})
 const [files,setFiles]=useState<File[]>([]),[busy,setBusy]=useState(false),[askDelete,setAskDelete]=useState(false)
 const previews=useMemo(()=>files.map(f=>URL.createObjectURL(f)),[files]);useEffect(()=>()=>previews.forEach(URL.revokeObjectURL),[previews])
 const nok=f.result==='NOK'
 // Regras automáticas da reinspeção
 const setReinspection=(v:string)=>setF(x=>({...x,reinspectionResult:v,correctionStatus:v==='Aprovado'?'Fechado':v==='Reprovado'?'A aguardar correção':x.correctionStatus,reinspectionDate:v&&!x.reinspectionDate?todayISO():x.reinspectionDate}))
 const submit=async(e:React.FormEvent)=>{e.preventDefault();setBusy(true);try{await onSave(f,files)}catch(err){notify(errMsg(err,'Não foi possível guardar o ponto'))}finally{setBusy(false)}}
 return <Dialog wide eyebrow={point?`PONTO ${point.code}`:'CHECKLIST'} title={point?'Ponto de inspeção':'Novo ponto de inspeção'} onClose={()=>!busy&&onClose()}><form onSubmit={submit}>
  <h4 className="wk-section">Identificação</h4>
  <div className="wk-form-grid">
   <F label="Especialidade"><select {...bind('specialtyId')}><option value="">— Sem especialidade —</option>{specs.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></F>
   <F label="Piso / zona"><input {...bind('zone')} placeholder="Ex.: Piso 1, Cobertura"/></F>
   <F label="Elemento / ponto a verificar" full><input {...bind('element')} required/></F>
   <F label="Critério de aceitação / referência"><input {...bind('criterion')}/></F>
   <F label="Origem do critério"><input {...bind('criterionSource')} placeholder="Projeto, caderno de encargos, ficha técnica…"/></F>
  </div>
  <h4 className="wk-section">Inspeção</h4>
  <div className="wk-form-grid three">
   <F label="Data da inspeção"><input type="date" {...bind('inspectionDate')}/></F>
   <F label="Inspetor"><input {...bind('inspector')}/></F>
   <F label="Resultado"><div className="wk-seg">{RESULTS.map(r=><button type="button" key={r} className={f.result===r?`on rs-${slug(r)}`:''} onClick={()=>setF(x=>({...x,result:r}))}>{r}</button>)}</div></F>
  </div>
  {nok&&<><h4 className="wk-section bad">Anomalia e correção</h4>
   <div className="wk-form-grid">
    <F label="Descrição da anomalia" full><textarea rows={2} {...bind('anomaly')} required/></F>
    <F label="Prioridade"><select {...bind('priority')}>{PRIORITIES.map(p=><option key={p}>{p}</option>)}</select></F>
    <F label="Responsável pela correção"><input {...bind('correctionOwner')}/></F>
    <F label="Estado da correção"><select {...bind('correctionStatus')}>{CORRECTION_STATUSES.map(p=><option key={p}>{p}</option>)}</select></F>
    <F label="Prazo de correção"><input type="date" {...bind('correctionDeadline')}/></F>
   </div>
   <h4 className="wk-section">Reinspeção</h4>
   <div className="wk-form-grid">
    <F label="Data da reinspeção"><input type="date" {...bind('reinspectionDate')}/></F>
    <F label="Resultado da reinspeção"><select value={f.reinspectionResult} onChange={e=>setReinspection(e.target.value)}><option value="">—</option>{REINSPECTION_RESULTS.map(p=><option key={p}>{p}</option>)}</select></F>
   </div>
   <p className="muted wk-hint">Reinspeção “Aprovado” fecha a correção automaticamente; “Reprovado” volta a colocá-la “A aguardar correção”.</p></>}
  <h4 className="wk-section">Fotografias</h4>
  <div className="wk-thumbs">
   {photos.map(p=><button type="button" key={p.id} onClick={()=>onView(p)}>{urls[p.thumbPath||p.storagePath]?<img src={urls[p.thumbPath||p.storagePath]} alt={p.caption||'Fotografia'}/>:<Camera/>}</button>)}
   {previews.map((src,i)=><div key={src} className="pending"><img src={src} alt=""/><button type="button" title="Remover" onClick={()=>setFiles(v=>v.filter((_,j)=>j!==i))}><X size={13}/></button></div>)}
   <label className="wk-add-photo"><ImagePlus/><span>Adicionar</span><input type="file" accept="image/*" multiple onChange={e=>{const list=Array.from(e.target.files||[]);setFiles(v=>[...v,...list]);e.target.value=''}}/></label>
  </div>
  <F label="Observações adicionais" full><textarea rows={2} {...bind('notes')}/></F>
  {askDelete?<div className="wk-confirm"><span>Eliminar este ponto? As fotografias ficam na galeria.</span><button type="button" className="secondary" onClick={()=>setAskDelete(false)}>Não</button><button type="button" className="delete-confirm" onClick={async()=>{setBusy(true);try{await onDelete!()}catch(e){notify(errMsg(e,'Não foi possível eliminar'));setBusy(false)}}}>Eliminar</button></div>:
  <div className="form-actions">{onDelete&&<button type="button" className="wk-icon-btn danger left" title="Eliminar ponto" onClick={()=>setAskDelete(true)}><Trash2 size={16}/></button>}<button type="button" className="secondary" onClick={onClose} disabled={busy}>Cancelar</button><button className="primary" disabled={busy}>{busy?'A guardar…':files.length?`Guardar e carregar ${files.length} foto${files.length===1?'':'s'}`:'Guardar'}</button></div>}
 </form></Dialog>
}

// ─────────────────────────── Especialidades ───────────────────────────
function Specialties({specs,points,companyId,workId,notify,onChange,onRemoved}:{specs:Specialty[];points:Point[];companyId:string;workId:string;notify:Notify;onChange:(s:Specialty[])=>void;onRemoved:(id:string)=>void}){
 const [editing,setEditing]=useState<Specialty|'new'|null>(null)
 const stats=(id:string)=>{const ps=points.filter(p=>p.specialtyId===id),dates=ps.flatMap(p=>[p.inspectionDate,p.reinspectionDate]).filter(Boolean).sort();return {open:ps.filter(isOpenNok).length,last:dates.at(-1)||'',count:ps.length}}
 return <div className="card table-card">
  <div className="card-head"><div><small>EXECUÇÃO</small><h3>Especialidades</h3></div><button className="primary" onClick={()=>setEditing('new')}><Plus size={16}/>Nova especialidade</button></div>
  <div className="table"><div className="tr th wk-sp-row"><span>Especialidade</span><span>Estado da execução</span><span>% executado</span><span>Responsável / subempreiteiro</span><span>Previsto</span><span>Real</span><span>Última inspeção</span><span>NOK em aberto</span></div>
   {specs.map(s=>{const st=stats(s.id);return <button className="tr wk-sp-row" key={s.id} onClick={()=>setEditing(s)}>
    <span className="wk-pt-main"><strong>{s.name}</strong><small>{s.scope||`${st.count} ponto${st.count===1?'':'s'} de inspeção`}</small></span>
    <span><Chip value={s.status} kind="ss"/></span>
    <span className="wk-sp-prog"><Bar value={s.progress}/><b>{s.progress}%</b></span>
    <span>{s.responsible||'—'}</span>
    <span className="wk-dates">{s.plannedStart||s.plannedEnd?`${fmtDate(s.plannedStart)} → ${fmtDate(s.plannedEnd)}`:'—'}</span>
    <span className="wk-dates">{s.actualStart||s.actualEnd?`${fmtDate(s.actualStart)} → ${fmtDate(s.actualEnd)}`:'—'}</span>
    <span>{st.last?fmtDate(st.last):'—'}</span>
    <span>{st.open?<em className="count-pill bad">{st.open}</em>:<em className="count-pill">0</em>}</span>
   </button>})}
  </div>
  {editing&&<SpecialtyForm spec={editing==='new'?null:editing} pointCount={editing==='new'?0:stats(editing.id).count} onClose={()=>setEditing(null)} notify={notify}
   onSave={async d=>{if(editing==='new'){const s=await insertSpecialty(companyId,workId,d,(specs.at(-1)?.position||0)+10);onChange([...specs,s])}else{const s=await updateSpecialty(editing.id,d);onChange(specs.map(x=>x.id===s.id?s:x))}notify('Especialidade guardada com sucesso');setEditing(null)}}
   onDelete={editing==='new'?undefined:async()=>{await deleteSpecialty(editing.id);onRemoved(editing.id);setEditing(null);notify('Especialidade removida')}}/>}
 </div>
}
function SpecialtyForm({spec,pointCount,onClose,onSave,onDelete,notify}:{spec:Specialty|null;pointCount:number;onClose:()=>void;onSave:(d:SpecialtyInput)=>Promise<void>;onDelete?:()=>Promise<void>;notify:Notify}){
 const {f,setF,bind}=useForm<SpecialtyInput>(spec?{...spec}:{name:'',scope:'',status:'Por iniciar',progress:0,responsible:'',plannedStart:'',plannedEnd:'',actualStart:'',actualEnd:'',notes:''})
 const [busy,setBusy]=useState(false),[askDelete,setAskDelete]=useState(false)
 const setStatus=(v:string)=>setF(x=>({...x,status:v,progress:['Concluído pelo empreiteiro','Aprovado na reinspeção','Fechado'].includes(v)?100:x.progress,actualStart:v==='Em execução'&&!x.actualStart?todayISO():x.actualStart}))
 const submit=async(e:React.FormEvent)=>{e.preventDefault();setBusy(true);try{await onSave({...f,progress:Number(f.progress)})}catch(err){notify(errMsg(err,'Não foi possível guardar a especialidade'))}finally{setBusy(false)}}
 return <Dialog wide eyebrow="ESPECIALIDADE" title={spec?spec.name:'Nova especialidade'} onClose={()=>!busy&&onClose()}><form onSubmit={submit}>
  <div className="wk-form-grid">
   <F label="Especialidade"><input {...bind('name')} required/></F>
   <F label="Tipo de trabalho / zona"><input {...bind('scope')}/></F>
   <F label="Estado da execução"><select value={f.status} onChange={e=>setStatus(e.target.value)}>{SPECIALTY_STATUSES.map(s=><option key={s}>{s}</option>)}</select></F>
   <F label={`% executado — ${f.progress}%`}><input type="range" min={0} max={100} step={5} value={f.progress} onChange={e=>setF(x=>({...x,progress:Number(e.target.value)}))}/></F>
   <F label="Responsável / subempreiteiro" full><input {...bind('responsible')}/></F>
   <F label="Início previsto"><input type="date" {...bind('plannedStart')}/></F>
   <F label="Conclusão prevista"><input type="date" {...bind('plannedEnd')}/></F>
   <F label="Início real"><input type="date" {...bind('actualStart')}/></F>
   <F label="Conclusão real"><input type="date" {...bind('actualEnd')}/></F>
   <F label="Observações" full><textarea rows={2} {...bind('notes')}/></F>
  </div>
  {askDelete?<div className="wk-confirm"><span>Remover esta especialidade?{pointCount?` Os ${pointCount} pontos de inspeção ficam “sem especialidade”.`:''}</span><button type="button" className="secondary" onClick={()=>setAskDelete(false)}>Não</button><button type="button" className="delete-confirm" onClick={async()=>{setBusy(true);try{await onDelete!()}catch(e){notify(errMsg(e,'Não foi possível remover'));setBusy(false)}}}>Remover</button></div>:
  <div className="form-actions">{onDelete&&<button type="button" className="wk-icon-btn danger left" title="Remover especialidade" onClick={()=>setAskDelete(true)}><Trash2 size={16}/></button>}<button type="button" className="secondary" onClick={onClose} disabled={busy}>Cancelar</button><button className="primary" disabled={busy}>{busy?'A guardar…':'Guardar'}</button></div>}
 </form></Dialog>
}

// ─────────────────────────── Documentos e validades ───────────────────────────
function Documents({docs,companyId,workId,notify,onChange}:{docs:WorkDocument[];companyId:string;workId:string;notify:Notify;onChange:(d:WorkDocument[])=>void}){
 const [editing,setEditing]=useState<WorkDocument|'new'|null>(null)
 const open=async(d:WorkDocument)=>{try{window.open(await signedUrl(d.filePath),'_blank','noopener')}catch(e){notify(errMsg(e,'Não foi possível abrir o ficheiro'))}}
 const sorted=[...docs].sort((a,b)=>(a.expiryDate||'9999').localeCompare(b.expiryDate||'9999'))
 return <div className="card table-card">
  <div className="card-head"><div><small>CONTROLO DOCUMENTAL</small><h3>Documentos e validades</h3></div><button className="primary" onClick={()=>setEditing('new')}><Plus size={16}/>Novo documento</button></div>
  <div className="table"><div className="tr th wk-doc-row"><span>Tipo</span><span>Documento / referência</span><span>Emissão</span><span>Validade</span><span>Dias</span><span>Estado</span><span>Responsável</span><span>Ficheiro</span></div>
   {sorted.map(d=>{const days=daysUntil(d.expiryDate),state=documentState(d.expiryDate);return <div className="tr wk-doc-row" key={d.id} role="button" tabIndex={0} onClick={()=>setEditing(d)} onKeyDown={e=>e.key==='Enter'&&setEditing(d)}>
    <span>{d.docType}</span>
    <span className="wk-pt-main"><strong>{d.title}</strong><small>{[d.holder,d.numberVersion].filter(Boolean).join(' · ')||'—'}</small></span>
    <span>{fmtDate(d.issueDate)}</span><span>{fmtDate(d.expiryDate)}</span>
    <span className={days!==null&&days<0?'wk-late':''}>{days===null?'—':days}</span>
    <span><Chip value={state} kind="ds"/></span>
    <span>{d.responsible||'—'}</span>
    <span className="wk-doc-links" onClick={e=>e.stopPropagation()}>{d.filePath&&<button className="wk-icon-btn" title={d.fileName||'Abrir ficheiro'} onClick={()=>open(d)}><Paperclip size={15}/></button>}{d.link&&<a className="wk-icon-btn" href={/^https?:\/\//i.test(d.link)?d.link:`https://${d.link}`} target="_blank" rel="noopener noreferrer" title={d.link}><Link2 size={15}/></a>}{!d.filePath&&!d.link&&'—'}</span>
   </div>})}
   {!docs.length&&<p className="people-empty">Ainda não existem documentos. Registe seguros, licenças, certificados, fichas técnicas, ensaios, garantias, etc.</p>}
  </div>
  <p className="muted">Nem todos os documentos têm validade obrigatória. Quando existir, a data de validade (ou da próxima verificação) gera o aviso “A expirar em 30 dias” e “Expirado”.</p>
  {editing&&<DocumentForm doc={editing==='new'?null:editing} onClose={()=>setEditing(null)} notify={notify} onOpenFile={open}
   onSave={async(d,file)=>{if(editing==='new'){const x=await insertDocument(companyId,workId,d,file);onChange([...docs,x])}else{const x=await updateDocument(companyId,editing,d,file);onChange(docs.map(y=>y.id===x.id?x:y))}notify('Documento guardado com sucesso');setEditing(null)}}
   onDelete={editing==='new'?undefined:async()=>{await deleteDocument(editing);onChange(docs.filter(y=>y.id!==editing.id));setEditing(null);notify('Documento eliminado')}}/>}
 </div>
}
function DocumentForm({doc,onClose,onSave,onDelete,onOpenFile,notify}:{doc:WorkDocument|null;onClose:()=>void;onSave:(d:DocumentInput,file:File|null)=>Promise<void>;onDelete?:()=>Promise<void>;onOpenFile:(d:WorkDocument)=>void;notify:Notify}){
 const {f,bind}=useForm<DocumentInput>(doc?{...doc}:{docType:'Outro',title:'',holder:'',numberVersion:'',issueDate:'',expiryDate:'',responsible:'',link:'',notes:''})
 const [file,setFile]=useState<File|null>(null),[busy,setBusy]=useState(false),[askDelete,setAskDelete]=useState(false)
 const submit=async(e:React.FormEvent)=>{e.preventDefault();if(file&&file.size>20*1024*1024){notify('O ficheiro tem mais de 20 MB');return}setBusy(true);try{await onSave(f,file)}catch(err){notify(errMsg(err,'Não foi possível guardar o documento'))}finally{setBusy(false)}}
 return <Dialog wide eyebrow="DOCUMENTOS E VALIDADES" title={doc?'Documento':'Novo documento'} onClose={()=>!busy&&onClose()}><form onSubmit={submit}>
  <div className="wk-form-grid">
   <F label="Tipo de documento"><select {...bind('docType')}>{DOC_TYPES.map(t=><option key={t}>{t}</option>)}</select></F>
   <F label="Documento / referência"><input {...bind('title')} required/></F>
   <F label="Entidade / titular"><input {...bind('holder')}/></F>
   <F label="N.º / versão"><input {...bind('numberVersion')}/></F>
   <F label="Data de emissão"><input type="date" {...bind('issueDate')}/></F>
   <F label="Data de validade / próxima verificação"><input type="date" {...bind('expiryDate')}/></F>
   <F label="Responsável"><input {...bind('responsible')}/></F>
   <F label="Localização / link"><input {...bind('link')} placeholder="https://… ou localização física"/></F>
   <F label="Ficheiro (PDF, imagem, Word ou Excel)" full><div className="wk-file">{doc?.filePath&&!file&&<button type="button" className="secondary" onClick={()=>onOpenFile(doc)}><Download size={15}/>{doc.fileName||'Ficheiro atual'}</button>}<label className="secondary wk-file-pick"><Paperclip size={15}/>{file?file.name:doc?.filePath?'Substituir ficheiro':'Anexar ficheiro'}<input type="file" accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx" onChange={e=>setFile(e.target.files?.[0]||null)}/></label></div></F>
   <F label="Observações" full><textarea rows={2} {...bind('notes')}/></F>
  </div>
  {askDelete?<div className="wk-confirm"><span>Eliminar este documento{doc?.filePath?' e o ficheiro anexado':''}?</span><button type="button" className="secondary" onClick={()=>setAskDelete(false)}>Não</button><button type="button" className="delete-confirm" onClick={async()=>{setBusy(true);try{await onDelete!()}catch(e){notify(errMsg(e,'Não foi possível eliminar'));setBusy(false)}}}>Eliminar</button></div>:
  <div className="form-actions">{onDelete&&<button type="button" className="wk-icon-btn danger left" title="Eliminar documento" onClick={()=>setAskDelete(true)}><Trash2 size={16}/></button>}<button type="button" className="secondary" onClick={onClose} disabled={busy}>Cancelar</button><button className="primary" disabled={busy}>{busy?'A guardar…':'Guardar'}</button></div>}
 </form></Dialog>
}

// ─────────────────────────── Fotografias ───────────────────────────
function Gallery({photos,specs,points,urls,onView,onUpload}:{photos:WorkPhoto[];specs:Specialty[];points:Point[];urls:Record<string,string>;onView:(p:WorkPhoto)=>void;onUpload:(files:File[],meta:{specialtyId?:string;pointId?:string;caption?:string})=>Promise<void>}){
 const [spec,setSpec]=useState(''),[pending,setPending]=useState<File[]>([])
 const input=useRef<HTMLInputElement>(null)
 const visible=photos.filter(p=>!spec||(spec==='none'?!p.specialtyId:p.specialtyId===spec))
 const used=specs.filter(s=>photos.some(p=>p.specialtyId===s.id))
 return <div className="card">
  <div className="card-head"><div><small>REGISTO FOTOGRÁFICO</small><h3>Fotografias da obra</h3></div><button className="primary" onClick={()=>input.current?.click()}><Camera size={16}/>Tirar / carregar fotos</button>
   <input ref={input} hidden type="file" accept="image/*" multiple onChange={e=>{const l=Array.from(e.target.files||[]);if(l.length)setPending(l);e.target.value=''}}/></div>
  <div className="wk-filters"><select value={spec} onChange={e=>setSpec(e.target.value)}><option value="">Todas as fotografias ({photos.length})</option>{used.map(s=><option key={s.id} value={s.id}>{s.name} ({photos.filter(p=>p.specialtyId===s.id).length})</option>)}<option value="none">Sem especialidade</option></select></div>
  {visible.length?<div className="wk-gallery">{visible.map(p=>{const pt=points.find(x=>x.id===p.pointId);return <button key={p.id} onClick={()=>onView(p)}>{urls[p.thumbPath||p.storagePath]?<img loading="lazy" src={urls[p.thumbPath||p.storagePath]} alt={p.caption||'Fotografia da obra'}/>:<span className="wk-ph"><Camera/></span>}<div><strong>{p.caption||specs.find(s=>s.id===p.specialtyId)?.name||'Sem legenda'}</strong><small>{new Date(p.takenAt).toLocaleDateString('pt-PT')}{pt?` · ${pt.code}`:''}</small></div></button>})}</div>:
   <div className="wk-empty inline"><Images/><p>{photos.length?'Sem fotografias neste filtro.':'Ainda não existem fotografias. No telemóvel, o botão abre a câmara ou a galeria.'}</p></div>}
  {pending.length>0&&<UploadForm files={pending} specs={specs} points={points} onClose={()=>setPending([])} onUpload={async m=>{await onUpload(pending,m);setPending([])}}/>}
 </div>
}
function UploadForm({files,specs,points,onClose,onUpload}:{files:File[];specs:Specialty[];points:Point[];onClose:()=>void;onUpload:(m:{specialtyId?:string;pointId?:string;caption?:string})=>Promise<void>}){
 const [specialtyId,setSpecialtyId]=useState(''),[pointId,setPointId]=useState(''),[caption,setCaption]=useState(''),[busy,setBusy]=useState(false)
 const previews=useMemo(()=>files.map(f=>URL.createObjectURL(f)),[files]);useEffect(()=>()=>previews.forEach(URL.revokeObjectURL),[previews])
 const pts=points.filter(p=>!specialtyId||p.specialtyId===specialtyId)
 return <Dialog eyebrow="FOTOGRAFIAS" title={`Carregar ${files.length} fotografia${files.length===1?'':'s'}`} onClose={()=>!busy&&onClose()}>
  <div className="wk-thumbs small">{previews.map(src=><div key={src} className="pending"><img src={src} alt=""/></div>)}</div>
  <F label="Especialidade"><select value={specialtyId} onChange={e=>{setSpecialtyId(e.target.value);setPointId('')}}><option value="">— Geral da obra —</option>{specs.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></F>
  <F label="Ponto de inspeção (opcional)"><select value={pointId} onChange={e=>{setPointId(e.target.value);const p=points.find(x=>x.id===e.target.value);if(p?.specialtyId)setSpecialtyId(p.specialtyId)}}><option value="">— Nenhum —</option>{pts.map(p=><option key={p.id} value={p.id}>{p.code} · {p.element}</option>)}</select></F>
  <F label="Legenda (opcional)"><input value={caption} onChange={e=>setCaption(e.target.value)} placeholder="Ex.: Betonagem da laje do piso 1"/></F>
  <div className="form-actions"><button type="button" className="secondary" onClick={onClose} disabled={busy}>Cancelar</button><button className="primary" disabled={busy} onClick={async()=>{setBusy(true);try{await onUpload({specialtyId,pointId,caption})}finally{setBusy(false)}}}>{busy?'A carregar…':'Carregar'}</button></div>
 </Dialog>
}
function PhotoViewer({photo,specs,points,thumb,onClose,onSaved,onDeleted,notify}:{photo:WorkPhoto;specs:Specialty[];points:Point[];thumb?:string;onClose:()=>void;onSaved:(p:WorkPhoto)=>void;onDeleted:()=>void;notify:Notify}){
 const [full,setFull]=useState(''),[specialtyId,setSpecialtyId]=useState(photo.specialtyId),[pointId,setPointId]=useState(photo.pointId),[caption,setCaption]=useState(photo.caption),[busy,setBusy]=useState(false),[askDelete,setAskDelete]=useState(false)
 useEffect(()=>{signedUrl(photo.storagePath).then(setFull).catch(()=>{})},[photo.storagePath])
 const changed=specialtyId!==photo.specialtyId||pointId!==photo.pointId||caption!==photo.caption
 const pts=points.filter(p=>!specialtyId||p.specialtyId===specialtyId)
 const run=async(fn:()=>Promise<void>,msg:string)=>{setBusy(true);try{await fn()}catch(e){notify(errMsg(e,msg));setBusy(false)}}
 return <Dialog wide eyebrow={new Date(photo.takenAt).toLocaleString('pt-PT',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})} title={photo.caption||'Fotografia'} onClose={onClose}>
  <div className="wk-viewer">{full||thumb?<img src={full||thumb} alt={photo.caption||'Fotografia'}/>:<Camera/>}</div>
  <div className="wk-form-grid">
   <F label="Especialidade"><select value={specialtyId} onChange={e=>{setSpecialtyId(e.target.value);setPointId('')}}><option value="">— Geral da obra —</option>{specs.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></F>
   <F label="Ponto de inspeção"><select value={pointId} onChange={e=>setPointId(e.target.value)}><option value="">— Nenhum —</option>{pts.map(p=><option key={p.id} value={p.id}>{p.code} · {p.element}</option>)}</select></F>
   <F label="Legenda" full><input value={caption} onChange={e=>setCaption(e.target.value)}/></F>
  </div>
  {askDelete?<div className="wk-confirm"><span>Eliminar esta fotografia definitivamente?</span><button type="button" className="secondary" onClick={()=>setAskDelete(false)}>Não</button><button type="button" className="delete-confirm" disabled={busy} onClick={()=>run(async()=>{await deletePhoto(photo);onDeleted()},'Não foi possível eliminar')}>Eliminar</button></div>:
  <div className="form-actions"><button type="button" className="wk-icon-btn danger left" title="Eliminar fotografia" onClick={()=>setAskDelete(true)}><Trash2 size={16}/></button>{full&&<a className="secondary wk-link-btn" href={full} target="_blank" rel="noopener noreferrer"><ExternalLink size={15}/>Original</a>}<button type="button" className="primary" disabled={!changed||busy} onClick={()=>run(async()=>onSaved(await updatePhoto(photo.id,{specialtyId,pointId,caption})),'Não foi possível guardar')}>{busy?'A guardar…':'Guardar'}</button></div>}
 </Dialog>
}
