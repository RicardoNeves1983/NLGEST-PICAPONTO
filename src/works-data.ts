import {supabase} from './supabase'

export const BUCKET='obras'

// Listas de opções (iguais às da folha ObraCheck)
export const WORK_STATUSES=['Por iniciar','Em curso','Suspensa','Concluída','Entregue'] as const
export const WORK_TYPES=['Construção nova','Reabilitação','Remodelação','Ampliação','Manutenção','Obra pública','Outra']
export const RESULTS=['OK','NOK','Pendente','N/A'] as const
export const PRIORITIES=['Crítica','Alta','Média','Baixa'] as const
export const CORRECTION_STATUSES=['Por tratar','A aguardar correção','Correção em curso','A aguardar reinspeção','Fechado'] as const
export const REINSPECTION_RESULTS=['Aprovado','Reprovado','Pendente','N/A'] as const
export const SPECIALTY_STATUSES=['Por iniciar','Em execução','Suspenso','Concluído pelo empreiteiro','A aguardar inspeção','Com anomalias / NOK','A aguardar correção','Correção em curso','Aprovado na reinspeção','Fechado'] as const
export const DOC_TYPES=['Seguro','Licença / autorização','Certificado / formação','Equipamento / inspeção','Ficha técnica','Declaração de desempenho','Ensaio / relatório','Garantia','Projeto / desenho','Outro'] as const

export type Work={id:string;name:string;workType:string;address:string;clientId:string;costCenterId:string;ownerName:string;generalContractor:string;inspectorName:string;siteDirector:string;startDate:string;expectedEndDate:string;actualEndDate:string;status:string;notes:string}
export type WorkInput=Omit<Work,'id'>
export type Specialty={id:string;workId:string;name:string;codePrefix:string;position:number;scope:string;status:string;progress:number;responsible:string;plannedStart:string;plannedEnd:string;actualStart:string;actualEnd:string;notes:string}
export type SpecialtyInput=Omit<Specialty,'id'|'workId'|'position'|'codePrefix'>
export type Point={id:string;workId:string;specialtyId:string;code:string;zone:string;element:string;criterion:string;criterionSource:string;inspectionDate:string;inspector:string;result:string;anomaly:string;priority:string;correctionOwner:string;correctionStatus:string;correctionDeadline:string;reinspectionDate:string;reinspectionResult:string;notes:string}
export type PointInput=Omit<Point,'id'|'workId'|'code'>
export type WorkDocument={id:string;workId:string;docType:string;title:string;holder:string;numberVersion:string;issueDate:string;expiryDate:string;responsible:string;link:string;filePath:string;fileName:string;notes:string}
export type DocumentInput=Omit<WorkDocument,'id'|'workId'|'filePath'|'fileName'>
export type WorkPhoto={id:string;workId:string;specialtyId:string;pointId:string;storagePath:string;thumbPath:string;caption:string;takenAt:string;uploadedBy:string}

const s=(v:any)=>v==null?'':String(v)
const n=(v:string)=>v.trim()?v.trim():null

const WORK_COLS='id,name,work_type,address,client_id,cost_center_id,owner_name,general_contractor,inspector_name,site_director,start_date,expected_end_date,actual_end_date,status,notes'
const mapWork=(w:any):Work=>({id:w.id,name:w.name,workType:s(w.work_type),address:s(w.address),clientId:s(w.client_id),costCenterId:s(w.cost_center_id),ownerName:s(w.owner_name),generalContractor:s(w.general_contractor),inspectorName:s(w.inspector_name),siteDirector:s(w.site_director),startDate:s(w.start_date),expectedEndDate:s(w.expected_end_date),actualEndDate:s(w.actual_end_date),status:w.status,notes:s(w.notes)})
const workRow=(d:WorkInput)=>({name:d.name.trim(),work_type:n(d.workType),address:n(d.address),client_id:d.clientId||null,cost_center_id:d.costCenterId||null,owner_name:n(d.ownerName),general_contractor:n(d.generalContractor),inspector_name:n(d.inspectorName),site_director:n(d.siteDirector),start_date:d.startDate||null,expected_end_date:d.expectedEndDate||null,actual_end_date:d.actualEndDate||null,status:d.status,notes:n(d.notes)})

const SPEC_COLS='id,work_id,name,code_prefix,position,scope,status,progress,responsible,planned_start,planned_end,actual_start,actual_end,notes'
const mapSpec=(x:any):Specialty=>({id:x.id,workId:x.work_id,name:x.name,codePrefix:x.code_prefix,position:x.position,scope:s(x.scope),status:x.status,progress:Number(x.progress||0),responsible:s(x.responsible),plannedStart:s(x.planned_start),plannedEnd:s(x.planned_end),actualStart:s(x.actual_start),actualEnd:s(x.actual_end),notes:s(x.notes)})
const specRow=(d:SpecialtyInput)=>({name:d.name.trim(),scope:n(d.scope),status:d.status,progress:Math.max(0,Math.min(100,Math.round(d.progress||0))),responsible:n(d.responsible),planned_start:d.plannedStart||null,planned_end:d.plannedEnd||null,actual_start:d.actualStart||null,actual_end:d.actualEnd||null,notes:n(d.notes)})

const POINT_COLS='id,work_id,specialty_id,code,zone,element,criterion,criterion_source,inspection_date,inspector,result,anomaly,priority,correction_owner,correction_status,correction_deadline,reinspection_date,reinspection_result,notes'
const mapPoint=(p:any):Point=>({id:p.id,workId:p.work_id,specialtyId:s(p.specialty_id),code:s(p.code),zone:s(p.zone),element:p.element,criterion:s(p.criterion),criterionSource:s(p.criterion_source),inspectionDate:s(p.inspection_date),inspector:s(p.inspector),result:p.result,anomaly:s(p.anomaly),priority:p.priority,correctionOwner:s(p.correction_owner),correctionStatus:p.correction_status,correctionDeadline:s(p.correction_deadline),reinspectionDate:s(p.reinspection_date),reinspectionResult:s(p.reinspection_result),notes:s(p.notes)})
const pointRow=(d:PointInput)=>({specialty_id:d.specialtyId||null,zone:n(d.zone),element:d.element.trim(),criterion:n(d.criterion),criterion_source:n(d.criterionSource),inspection_date:d.inspectionDate||null,inspector:n(d.inspector),result:d.result,anomaly:n(d.anomaly),priority:d.priority,correction_owner:n(d.correctionOwner),correction_status:d.correctionStatus,correction_deadline:d.correctionDeadline||null,reinspection_date:d.reinspectionDate||null,reinspection_result:d.reinspectionResult||null,notes:n(d.notes)})

const DOC_COLS='id,work_id,doc_type,title,holder,number_version,issue_date,expiry_date,responsible,link,file_path,file_name,notes'
const mapDoc=(d:any):WorkDocument=>({id:d.id,workId:d.work_id,docType:d.doc_type,title:d.title,holder:s(d.holder),numberVersion:s(d.number_version),issueDate:s(d.issue_date),expiryDate:s(d.expiry_date),responsible:s(d.responsible),link:s(d.link),filePath:s(d.file_path),fileName:s(d.file_name),notes:s(d.notes)})
const docRow=(d:DocumentInput)=>({doc_type:d.docType,title:d.title.trim(),holder:n(d.holder),number_version:n(d.numberVersion),issue_date:d.issueDate||null,expiry_date:d.expiryDate||null,responsible:n(d.responsible),link:n(d.link),notes:n(d.notes)})

const PHOTO_COLS='id,work_id,specialty_id,inspection_point_id,storage_path,thumb_path,caption,taken_at,uploaded_by'
const mapPhoto=(p:any):WorkPhoto=>({id:p.id,workId:p.work_id,specialtyId:s(p.specialty_id),pointId:s(p.inspection_point_id),storagePath:p.storage_path,thumbPath:s(p.thumb_path),caption:s(p.caption),takenAt:p.taken_at,uploadedBy:s(p.uploaded_by)})

const fail=(r:{error:any})=>{if(r.error)throw r.error}

// ───────── Lista de obras com indicadores resumidos ─────────
export type WorkSummary={points:{result:string;correctionStatus:string;correctionDeadline:string;specialtyId:string}[];progress:number[];expiries:string[];photos:number}
export async function loadWorks(){
 const [works,points,specs,docs,photos]=await Promise.all([
  supabase.from('works').select(WORK_COLS).order('created_at',{ascending:false}),
  supabase.from('work_inspection_points').select('work_id,specialty_id,result,correction_status,correction_deadline'),
  supabase.from('work_specialties').select('work_id,progress'),
  supabase.from('work_documents').select('work_id,expiry_date'),
  supabase.from('work_photos').select('work_id')
 ])
 ;[works,points,specs,docs,photos].forEach(fail)
 const sum:Record<string,WorkSummary>={}
 const get=(id:string)=>sum[id]||(sum[id]={points:[],progress:[],expiries:[],photos:0})
 points.data!.forEach(p=>get(p.work_id).points.push({result:p.result,correctionStatus:p.correction_status,correctionDeadline:s(p.correction_deadline),specialtyId:s(p.specialty_id)}))
 specs.data!.forEach(x=>get(x.work_id).progress.push(Number(x.progress||0)))
 docs.data!.forEach(d=>get(d.work_id).expiries.push(s(d.expiry_date)))
 photos.data!.forEach(p=>get(p.work_id).photos++)
 return {works:works.data!.map(mapWork),summaries:sum}
}
export async function insertWork(companyId:string,d:WorkInput){const r=await supabase.from('works').insert({company_id:companyId,...workRow(d)}).select(WORK_COLS).single();fail(r);return mapWork(r.data)}
export async function updateWork(id:string,d:WorkInput){const r=await supabase.from('works').update(workRow(d)).eq('id',id).select(WORK_COLS).single();fail(r);return mapWork(r.data)}
export async function deleteWork(id:string){
 const [ph,dc]=await Promise.all([supabase.from('work_photos').select('storage_path,thumb_path').eq('work_id',id),supabase.from('work_documents').select('file_path').eq('work_id',id)]);fail(ph);fail(dc)
 const paths=[...ph.data!.flatMap(p=>[p.storage_path,p.thumb_path]),...dc.data!.map(d=>d.file_path)].filter(Boolean) as string[]
 for(let i=0;i<paths.length;i+=100){const rm=await supabase.storage.from(BUCKET).remove(paths.slice(i,i+100));fail(rm)}
 const r=await supabase.from('works').delete().eq('id',id).select('id');fail(r)
 if(!r.data!.length)throw new Error('Sem permissão: só o Administrador ou a Administração podem eliminar obras.')
}

// ───────── Ficha da obra ─────────
export async function loadWorkDetail(workId:string){
 const [specs,points,docs,photos]=await Promise.all([
  supabase.from('work_specialties').select(SPEC_COLS).eq('work_id',workId).order('position'),
  supabase.from('work_inspection_points').select(POINT_COLS).eq('work_id',workId).order('created_at'),
  supabase.from('work_documents').select(DOC_COLS).eq('work_id',workId).order('expiry_date',{ascending:true,nullsFirst:false}),
  supabase.from('work_photos').select(PHOTO_COLS).eq('work_id',workId).order('taken_at',{ascending:false})
 ])
 ;[specs,points,docs,photos].forEach(fail)
 return {specialties:specs.data!.map(mapSpec),points:points.data!.map(mapPoint),documents:docs.data!.map(mapDoc),photos:photos.data!.map(mapPhoto)}
}

export async function insertSpecialty(companyId:string,workId:string,d:SpecialtyInput,position:number){
 const prefix=d.name.normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^A-Za-z]/g,'').slice(0,3).toUpperCase()||'GER'
 const r=await supabase.from('work_specialties').insert({company_id:companyId,work_id:workId,code_prefix:prefix,position,...specRow(d)}).select(SPEC_COLS).single();fail(r);return mapSpec(r.data)
}
export async function updateSpecialty(id:string,d:SpecialtyInput){const r=await supabase.from('work_specialties').update(specRow(d)).eq('id',id).select(SPEC_COLS).single();fail(r);return mapSpec(r.data)}
export async function deleteSpecialty(id:string){const r=await supabase.from('work_specialties').delete().eq('id',id);fail(r)}

export async function insertPoint(companyId:string,workId:string,d:PointInput){const r=await supabase.from('work_inspection_points').insert({company_id:companyId,work_id:workId,...pointRow(d)}).select(POINT_COLS).single();fail(r);return mapPoint(r.data)}
export async function updatePoint(id:string,d:PointInput){const r=await supabase.from('work_inspection_points').update(pointRow(d)).eq('id',id).select(POINT_COLS).single();fail(r);return mapPoint(r.data)}
export async function deletePoint(id:string){const r=await supabase.from('work_inspection_points').delete().eq('id',id);fail(r)}

export async function insertDocument(companyId:string,workId:string,d:DocumentInput,file?:File|null){
 const r=await supabase.from('work_documents').insert({company_id:companyId,work_id:workId,...docRow(d)}).select(DOC_COLS).single();fail(r)
 let doc=mapDoc(r.data);if(file)doc=await attachDocumentFile(companyId,doc,file);return doc
}
export async function updateDocument(companyId:string,doc:WorkDocument,d:DocumentInput,file?:File|null){
 const r=await supabase.from('work_documents').update(docRow(d)).eq('id',doc.id).select(DOC_COLS).single();fail(r)
 let out=mapDoc(r.data);if(file)out=await attachDocumentFile(companyId,out,file);return out
}
async function attachDocumentFile(companyId:string,doc:WorkDocument,file:File){
 const ext=(file.name.split('.').pop()||'bin').toLowerCase().replace(/[^a-z0-9]/g,'')
 const path=`${companyId}/${doc.workId}/docs/${doc.id}-${Date.now()}.${ext}`
 const up=await supabase.storage.from(BUCKET).upload(path,file,{contentType:file.type||undefined,upsert:false});fail(up)
 const r=await supabase.from('work_documents').update({file_path:path,file_name:file.name}).eq('id',doc.id).select(DOC_COLS).single()
 if(r.error){await supabase.storage.from(BUCKET).remove([path]);throw r.error}
 if(doc.filePath)await supabase.storage.from(BUCKET).remove([doc.filePath])
 return mapDoc(r.data)
}
export async function deleteDocument(doc:WorkDocument){if(doc.filePath){const rm=await supabase.storage.from(BUCKET).remove([doc.filePath]);fail(rm)}const r=await supabase.from('work_documents').delete().eq('id',doc.id);fail(r)}

export async function signedUrls(paths:string[]){
 const out:Record<string,string>={},list=[...new Set(paths.filter(Boolean))]
 for(let i=0;i<list.length;i+=100){const r=await supabase.storage.from(BUCKET).createSignedUrls(list.slice(i,i+100),60*60);fail(r);r.data!.forEach(x=>{if(x.path&&x.signedUrl)out[x.path]=x.signedUrl})}
 return out
}
export async function signedUrl(path:string,download?:string){const r=await supabase.storage.from(BUCKET).createSignedUrl(path,60*10,download?{download}:undefined);fail(r);return r.data!.signedUrl}

// Reduz a fotografia antes de a enviar (poupa dados móveis e espaço) e corrige a rotação.
async function resizeImage(file:Blob,maxSide:number,quality:number):Promise<Blob|null>{
 try{
  const bmp=await createImageBitmap(file,{imageOrientation:'from-image'} as ImageBitmapOptions)
  const scale=Math.min(1,maxSide/Math.max(bmp.width,bmp.height)),w=Math.round(bmp.width*scale),h=Math.round(bmp.height*scale)
  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h
  const ctx=canvas.getContext('2d');if(!ctx)return null
  ctx.drawImage(bmp,0,0,w,h);bmp.close?.()
  return await new Promise<Blob|null>(res=>canvas.toBlob(b=>res(b),'image/jpeg',quality))
 }catch{return null}
}
export async function uploadPhoto(companyId:string,workId:string,file:File,meta:{specialtyId?:string;pointId?:string;caption?:string}){
 const id=crypto.randomUUID(),base=`${companyId}/${workId}/fotos/${id}`
 const full=await resizeImage(file,2000,0.82),thumb=full?await resizeImage(full,480,0.72):null
 const ext=full?'jpg':((file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'')||'jpg')
 const mainPath=`${base}.${ext}`,thumbPath=thumb?`${base}_t.jpg`:null
 const up=await supabase.storage.from(BUCKET).upload(mainPath,full||file,{contentType:full?'image/jpeg':file.type||'image/jpeg'});fail(up)
 if(thumb&&thumbPath){const t=await supabase.storage.from(BUCKET).upload(thumbPath,thumb,{contentType:'image/jpeg'});if(t.error){await supabase.storage.from(BUCKET).remove([mainPath]);throw t.error}}
 const takenAt=file.lastModified?new Date(file.lastModified).toISOString():new Date().toISOString()
 const r=await supabase.from('work_photos').insert({id,company_id:companyId,work_id:workId,specialty_id:meta.specialtyId||null,inspection_point_id:meta.pointId||null,storage_path:mainPath,thumb_path:thumbPath,caption:meta.caption?.trim()||null,taken_at:takenAt}).select(PHOTO_COLS).single()
 if(r.error){await supabase.storage.from(BUCKET).remove([mainPath,...(thumbPath?[thumbPath]:[])]);throw r.error}
 return mapPhoto(r.data)
}
export async function updatePhoto(id:string,patch:{specialtyId:string;pointId:string;caption:string}){const r=await supabase.from('work_photos').update({specialty_id:patch.specialtyId||null,inspection_point_id:patch.pointId||null,caption:patch.caption.trim()||null}).eq('id',id).select(PHOTO_COLS).single();fail(r);return mapPhoto(r.data)}
export async function deletePhoto(p:WorkPhoto){const rm=await supabase.storage.from(BUCKET).remove([p.storagePath,...(p.thumbPath?[p.thumbPath]:[])]);fail(rm);const r=await supabase.from('work_photos').delete().eq('id',p.id);fail(r)}

// ───────── Cálculos (equivalentes às fórmulas do Excel) ─────────
export const todayISO=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
export const isOpenNok=(p:{result:string;correctionStatus:string})=>p.result==='NOK'&&p.correctionStatus!=='Fechado'
export const isOverdue=(p:{result:string;correctionStatus:string;correctionDeadline:string})=>isOpenNok(p)&&!!p.correctionDeadline&&p.correctionDeadline<todayISO()
export function indicators(points:{result:string;correctionStatus:string;correctionDeadline:string}[]){
 const c=(r:string)=>points.filter(p=>p.result===r).length
 const total=points.length,ok=c('OK'),nok=c('NOK'),pending=c('Pendente'),na=c('N/A'),applicable=total-na
 return {total,ok,nok,pending,na,pctOk:applicable>0?ok/applicable:0,openNok:points.filter(isOpenNok).length,overdue:points.filter(isOverdue).length}
}
export function daysUntil(date:string){if(!date)return null;const [y,m,d]=date.split('-').map(Number),t=new Date();return Math.round((Date.UTC(y,m-1,d)-Date.UTC(t.getFullYear(),t.getMonth(),t.getDate()))/86400000)}
export function documentState(expiry:string){const d=daysUntil(expiry);if(d===null)return 'Sem data registada';if(d<0)return 'Expirado';if(d<=30)return 'A expirar em 30 dias';return 'Válido'}
export const avg=(xs:number[])=>xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:0
