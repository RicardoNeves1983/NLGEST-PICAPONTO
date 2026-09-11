import {supabase} from './supabase'

export async function ensureCompany(fullName:string,inviteCode?:string){
 const profile=await supabase.rpc('get_my_access_profile')
 if(profile.error) throw profile.error
 const own=Array.isArray(profile.data)?profile.data[0]:profile.data
 if(own?.company_id)return own.company_id as string
 if(!inviteCode)throw new Error('É necessário um código de acesso fornecido pelo administrador')
 const accepted=await supabase.rpc('accept_access_code',{access_code:inviteCode,full_name:fullName})
 if(accepted.error)throw accepted.error
 return accepted.data as string
}

export async function loadOwnProfile(){
 const r=await supabase.rpc('get_my_access_profile');if(r.error)throw r.error
 const own=Array.isArray(r.data)?r.data[0]:r.data;if(!own)throw new Error('Perfil de acesso não encontrado');return own
}

export async function loadOwnCompany(){const r=await supabase.from('companies').select('id,name').single();if(r.error)throw r.error;return r.data}

export async function loadCompanyData(){
 const [clients,centers,employees,punches,profiles,employeeCenters]=await Promise.all([
  supabase.from('clients').select('id,name,nif,email,active').order('name'),
  supabase.from('cost_centers').select('id,client_id,code,name,active').order('name'),
  supabase.from('employees').select('id,full_name,job_title,employee_number,email,phone,weekly_hours,cost_center_id,profile_id,active').order('full_name'),
  supabase.from('punches').select('id,employee_id,kind,occurred_at,latitude,longitude,accuracy_m,source').order('occurred_at'),
  supabase.from('profiles').select('id,full_name,email,role,active').eq('active',true).order('full_name'),
  supabase.from('employee_cost_centers').select('employee_id,cost_center_id')
 ])
 if(clients.error)throw clients.error;if(centers.error)throw centers.error;if(employees.error)throw employees.error;if(punches.error)throw punches.error;if(profiles.error)throw profiles.error;if(employeeCenters.error)throw employeeCenters.error
 return {clients:clients.data,centers:centers.data,employees:employees.data,punches:punches.data,profiles:profiles.data,employeeCenters:employeeCenters.data}
}
export async function insertClient(companyId:string,data:{name:string;nif:string;email:string}){
 const r=await supabase.from('clients').insert({company_id:companyId,...data}).select('id,name,nif,email,active').single();if(r.error)throw r.error;return r.data
}
export async function insertCenter(companyId:string,data:{clientId:string;code:string;name:string}){
 const r=await supabase.from('cost_centers').insert({company_id:companyId,client_id:data.clientId,code:data.code,name:data.name}).select('id,client_id,code,name,active').single();if(r.error)throw r.error;return r.data
}
export async function insertEmployee(companyId:string,data:{name:string;role:string;centerIds:string[]}){
 const r=await supabase.from('employees').insert({company_id:companyId,full_name:data.name,job_title:data.role}).select('id,full_name,job_title,employee_number,email,phone,weekly_hours,active').single();if(r.error)throw r.error
 if(data.centerIds.length){const rows=data.centerIds.map(cid=>({company_id:companyId,employee_id:r.data.id,cost_center_id:cid}));const link=await supabase.from('employee_cost_centers').insert(rows);if(link.error)throw link.error}
 return {...r.data,centerIds:data.centerIds}
}
export async function updateEmployee(id:string,data:{name:string;role:string;employeeNumber:string;email:string;phone:string;weeklyHours:number;centerIds:string[];active:boolean}){
 const r=await supabase.from('employees').update({full_name:data.name,job_title:data.role,employee_number:data.employeeNumber||null,email:data.email||null,phone:data.phone||null,weekly_hours:data.weeklyHours,active:data.active}).eq('id',id).select('id,full_name,job_title,employee_number,email,phone,weekly_hours,profile_id,active,company_id').single();if(r.error)throw r.error
 const clear=await supabase.from('employee_cost_centers').delete().eq('employee_id',id);if(clear.error)throw clear.error
 if(data.centerIds.length){const rows=data.centerIds.map(cid=>({company_id:r.data.company_id,employee_id:id,cost_center_id:cid}));const link=await supabase.from('employee_cost_centers').insert(rows);if(link.error)throw link.error}
 if(r.data.profile_id){const profile=await supabase.from('profiles').update({active:data.active}).eq('id',r.data.profile_id).eq('role','employee');if(profile.error)throw profile.error}
 return {...r.data,centerIds:data.centerIds}
}
export async function archiveEmployee(id:string){const r=await supabase.rpc('archive_employee',{target_employee_id:id});if(r.error)throw r.error}

export async function insertPunch(companyId:string,data:{employeeId:string;kind:'in'|'out';occurredAt:string;latitude?:number;longitude?:number;accuracy?:number;centerId?:string;source?:string}){
 const r=await supabase.from('punches').insert({company_id:companyId,employee_id:data.employeeId,kind:data.kind,occurred_at:data.occurredAt,latitude:data.latitude,longitude:data.longitude,accuracy_m:data.accuracy,cost_center_id:data.centerId||null,source:data.source||'web'}).select('id,employee_id,kind,occurred_at,latitude,longitude,accuracy_m,source').single();if(r.error)throw r.error;return r.data
}
export async function updatePunch(id:string,occurredAt:string){const r=await supabase.from('punches').update({occurred_at:occurredAt,source:'manual'}).eq('id',id);if(r.error)throw r.error}
export async function loadWorkEntries(employeeId:string,year:number,month:number){const start=`${year}-${String(month+1).padStart(2,'0')}-01`,end=new Date(year,month+1,0).toISOString().slice(0,10);const r=await supabase.from('work_schedules').select('work_date,actual_start,actual_end,break_minutes,day_status,notes').eq('employee_id',employeeId).gte('work_date',start).lte('work_date',end);if(r.error)throw r.error;return r.data}
export async function saveWorkEntries(companyId:string,employeeId:string,entries:Record<string,{start?:string;end?:string;breakMinutes?:string;status?:string;notes?:string}>){const rows=Object.entries(entries).map(([date,e])=>({company_id:companyId,employee_id:employeeId,work_date:date,actual_start:e.start||null,actual_end:e.end||null,break_minutes:Number(e.breakMinutes||0),day_status:e.status||'Trabalho',notes:e.notes||null,updated_at:new Date().toISOString()}));if(!rows.length)return;const r=await supabase.from('work_schedules').upsert(rows,{onConflict:'employee_id,work_date'});if(r.error)throw r.error}
export async function loadAbsences(employeeId:string){const r=await supabase.from('absence_requests').select('id,request_type,start_date,end_date,status,current_step,decision_reason').eq('employee_id',employeeId).order('start_date',{ascending:false});if(r.error)throw r.error;return r.data}
export async function insertAbsence(companyId:string,data:{employeeId:string;type:string;start:string;end:string;notes?:string;manual?:boolean}){const r=await supabase.from('absence_requests').insert({company_id:companyId,employee_id:data.employeeId,request_type:data.type,start_date:data.start,end_date:data.end,notes:data.notes||null,status:data.manual?'approved':'pending_site_manager',current_step:data.manual?'hr_admin':'site_manager'}).select('id,request_type,start_date,end_date,status,current_step').single();if(r.error)throw r.error;return r.data}
export async function loadCompanyAbsences(){const r=await supabase.from('absence_requests').select('id,employee_id,request_type,start_date,end_date,notes,status,current_step,created_at,decision_reason').order('created_at',{ascending:false});if(r.error)throw r.error;return r.data}
export async function decideAbsence(id:string,decision:'approved'|'rejected',reason?:string){const r=await supabase.from('absence_requests').update({status:decision,current_step:'completed',decision_reason:decision==='rejected'?reason||null:null,decided_at:new Date().toISOString()}).eq('id',id);if(r.error)throw r.error}
export async function requestTimeCorrection(companyId:string,employeeId:string,workDate:string,requested:{start?:string;end?:string;breakMinutes?:string;status?:string;notes?:string}){
 const existing=await supabase.from('work_schedules').select('actual_start,actual_end,break_minutes,day_status,notes').eq('employee_id',employeeId).eq('work_date',workDate).maybeSingle();if(existing.error)throw existing.error
 const prev=existing.data
 const r=await supabase.from('time_correction_requests').insert({company_id:companyId,employee_id:employeeId,work_date:workDate,previous_existed:!!prev,previous_start:prev?.actual_start||null,previous_end:prev?.actual_end||null,previous_break_minutes:prev?prev.break_minutes:null,previous_status:prev?.day_status||null,previous_notes:prev?.notes||null,requested_start:requested.start||null,requested_end:requested.end||null,requested_break_minutes:Number(requested.breakMinutes||0),requested_status:requested.status||'Trabalho',requested_notes:requested.notes||null}).select('id,work_date,requested_start,requested_end,requested_break_minutes,requested_status,requested_notes,status').single();if(r.error)throw r.error;return r.data
}
export async function loadTimeCorrections(employeeId:string,year:number,month:number){const start=`${year}-${String(month+1).padStart(2,'0')}-01`,end=new Date(year,month+1,0).toISOString().slice(0,10);const r=await supabase.from('time_correction_requests').select('id,work_date,requested_start,requested_end,requested_break_minutes,requested_status,requested_notes,status,decision_reason,created_at').eq('employee_id',employeeId).gte('work_date',start).lte('work_date',end).order('created_at',{ascending:false});if(r.error)throw r.error;return r.data}
export async function loadCompanyTimeCorrections(){const r=await supabase.from('time_correction_requests').select('id,employee_id,work_date,previous_existed,previous_start,previous_end,previous_break_minutes,previous_status,previous_notes,requested_start,requested_end,requested_break_minutes,requested_status,requested_notes,status,decision_reason,created_at').order('created_at',{ascending:false});if(r.error)throw r.error;return r.data}
export async function decideTimeCorrection(companyId:string,id:string,decision:'approved'|'rejected',data:{employeeId:string;workDate:string;start?:string|null;end?:string|null;breakMinutes:number;status:string;notes?:string|null},reason?:string){
 if(decision==='approved'){const up=await supabase.from('work_schedules').upsert({company_id:companyId,employee_id:data.employeeId,work_date:data.workDate,actual_start:data.start||null,actual_end:data.end||null,break_minutes:data.breakMinutes,day_status:data.status,notes:data.notes||null,updated_at:new Date().toISOString()},{onConflict:'employee_id,work_date'});if(up.error)throw up.error}
 const r=await supabase.from('time_correction_requests').update({status:decision,decision_reason:decision==='rejected'?reason||null:null,decided_at:new Date().toISOString()}).eq('id',id);if(r.error)throw r.error
}
export async function revertTimeCorrection(companyId:string,id:string,data:{employeeId:string;workDate:string;previousExisted:boolean;previousStart?:string|null;previousEnd?:string|null;previousBreakMinutes?:number|null;previousStatus?:string|null;previousNotes?:string|null}){
 if(data.previousExisted){const up=await supabase.from('work_schedules').upsert({company_id:companyId,employee_id:data.employeeId,work_date:data.workDate,actual_start:data.previousStart||null,actual_end:data.previousEnd||null,break_minutes:data.previousBreakMinutes||0,day_status:data.previousStatus||'Trabalho',notes:data.previousNotes||null,updated_at:new Date().toISOString()},{onConflict:'employee_id,work_date'});if(up.error)throw up.error}
 else{const del=await supabase.from('work_schedules').delete().eq('employee_id',data.employeeId).eq('work_date',data.workDate);if(del.error)throw del.error}
 const r=await supabase.from('time_correction_requests').update({status:'reverted',decided_at:new Date().toISOString()}).eq('id',id);if(r.error)throw r.error
}
export async function requestPunchCorrection(companyId:string,employeeId:string,kind:'in'|'out',requestedOccurredAt:string,punchId?:string){
 let previousOccurredAt:string|null=null
 if(punchId){const existing=await supabase.from('punches').select('occurred_at').eq('id',punchId).maybeSingle();if(existing.error)throw existing.error;previousOccurredAt=existing.data?.occurred_at||null}
 const r=await supabase.from('punch_correction_requests').insert({company_id:companyId,employee_id:employeeId,punch_id:punchId||null,kind,requested_occurred_at:requestedOccurredAt,previous_occurred_at:previousOccurredAt}).select('id,punch_id,kind,requested_occurred_at,previous_occurred_at,status').single();if(r.error)throw r.error;return r.data
}
export async function loadPunchCorrections(employeeId:string){const r=await supabase.from('punch_correction_requests').select('id,punch_id,kind,requested_occurred_at,previous_occurred_at,status,decision_reason,created_at').eq('employee_id',employeeId).order('created_at',{ascending:false});if(r.error)throw r.error;return r.data}
export async function loadCompanyPunchCorrections(){const r=await supabase.from('punch_correction_requests').select('id,employee_id,punch_id,kind,requested_occurred_at,previous_occurred_at,status,decision_reason,created_at').order('created_at',{ascending:false});if(r.error)throw r.error;return r.data}
export async function decidePunchCorrection(companyId:string,id:string,decision:'approved'|'rejected',data:{employeeId:string;kind:'in'|'out';punchId?:string|null;requestedOccurredAt:string},reason?:string){
 if(decision==='approved'){
  if(data.punchId){await updatePunch(data.punchId,data.requestedOccurredAt)}
  else{const created=await insertPunch(companyId,{employeeId:data.employeeId,kind:data.kind,occurredAt:data.requestedOccurredAt,source:'manual'});const link=await supabase.from('punch_correction_requests').update({punch_id:created.id}).eq('id',id);if(link.error)throw link.error}
 }
 const r=await supabase.from('punch_correction_requests').update({status:decision,decision_reason:decision==='rejected'?reason||null:null,decided_at:new Date().toISOString()}).eq('id',id);if(r.error)throw r.error
}
export async function revertPunchCorrection(companyId:string,id:string,data:{punchId?:string|null;previousOccurredAt?:string|null}){
 if(data.punchId){
  if(data.previousOccurredAt)await updatePunch(data.punchId,data.previousOccurredAt)
  else{const del=await supabase.from('punches').delete().eq('id',data.punchId);if(del.error)throw del.error}
 }
 const r=await supabase.from('punch_correction_requests').update({status:'reverted',decided_at:new Date().toISOString()}).eq('id',id);if(r.error)throw r.error
}
export async function updateProfileAccess(profileId:string,role:string,employeeId:string){const profile=await supabase.from('profiles').update({role}).eq('id',profileId);if(profile.error)throw profile.error;const clear=await supabase.from('employees').update({profile_id:null}).eq('profile_id',profileId);if(clear.error)throw clear.error;if(employeeId){const link=await supabase.from('employees').update({profile_id:profileId}).eq('id',employeeId);if(link.error)throw link.error}}
export async function createEmployeeInvite(companyId:string,employeeId:string){
 const expired=await supabase.from('employee_invites').update({expires_at:new Date().toISOString()}).eq('employee_id',employeeId).is('used_at',null);if(expired.error)throw expired.error
 const code=`NLG-${crypto.randomUUID().replaceAll('-','').slice(0,8).toUpperCase()}`;const r=await supabase.from('employee_invites').insert({company_id:companyId,employee_id:employeeId,code,created_by:(await supabase.auth.getUser()).data.user?.id}).select('id,employee_id,code,expires_at,used_at').single();if(r.error)throw r.error;return r.data
}
export async function loadEmployeeInvites(){const r=await supabase.from('employee_invites').select('id,employee_id,code,expires_at,used_at').order('created_at',{ascending:false});if(r.error)throw r.error;return r.data}

export async function checkPlatformAdmin(){const r=await supabase.rpc('is_platform_admin');if(r.error)throw r.error;return !!r.data}
export async function loadPlatformCompanies(){const r=await supabase.from('companies').select('id,name,plan,active,billing_status,monthly_fee,next_due_date,billing_notes,admin_email,created_at').order('created_at',{ascending:false});if(r.error)throw r.error;return r.data}
export async function createPlatformCompany(data:{name:string;adminEmail:string;monthlyFee?:number}){const r=await supabase.rpc('platform_create_company',{company_name:data.name,admin_email:data.adminEmail,monthly_fee:data.monthlyFee ?? null});if(r.error)throw r.error;return r.data as string}
export async function updatePlatformCompany(id:string,data:{billingStatus:string;monthlyFee?:number;nextDueDate?:string;billingNotes?:string;active:boolean}){const r=await supabase.from('companies').update({billing_status:data.billingStatus,monthly_fee:data.monthlyFee ?? null,next_due_date:data.nextDueDate||null,billing_notes:data.billingNotes||null,active:data.active}).eq('id',id);if(r.error)throw r.error}
export async function createCompanyAdminInvite(companyId:string){const r=await supabase.rpc('platform_create_company_admin_invite',{target_company_id:companyId});if(r.error)throw r.error;return r.data}
export async function createCompanySubscriptionLink(data:{companyId:string;companyName:string;monthlyFee:number;adminEmail?:string}){const r=await fetch('/api/create-company-subscription',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({companyId:data.companyId,companyName:data.companyName,monthlyFee:data.monthlyFee,adminEmail:data.adminEmail})});const body=await r.json().catch(()=>({}));if(!r.ok)throw new Error(body.error||'Não foi possível gerar o link de pagamento.');return body.url as string}
export async function loadCompanyAdminInvites(companyId:string){const r=await supabase.from('company_admin_invites').select('id,company_id,code,expires_at,used_at').eq('company_id',companyId).order('created_at',{ascending:false});if(r.error)throw r.error;return r.data}
export async function deletePlatformCompany(id:string){const r=await supabase.rpc('platform_delete_company',{target_company_id:id});if(r.error)throw r.error}
export async function setCompanyActive(id:string,active:boolean){const r=await supabase.from('companies').update({active,billing_status:active?'active':'suspended'}).eq('id',id);if(r.error)throw r.error}
