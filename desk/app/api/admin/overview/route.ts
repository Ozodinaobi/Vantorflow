import {NextResponse} from "next/server";
import {adminApi} from "@/lib/auth";
import {authAdmin,rest} from "@/lib/db";
export const dynamic="force-dynamic";
async function allRows(table:string,query:string,limit=100000){const out:any[]=[];for(let offset=0;offset<limit;offset+=1000){const join=query.includes("?")?"&":"?";const batch=await rest<any[]>("GET",table,`${query}${join}limit=1000&offset=${offset}`,undefined,{allowMissing:true});out.push(...batch);if(batch.length<1000)return {rows:out,partial:false};}return {rows:out,partial:true}}
export async function GET(req:Request){
 const denied=await adminApi(req);if(denied)return denied;
 try{
  const users:any[]=[];let usersPartial=false;
  for(let page=1;page<=100;page++){const batch=await authAdmin(`/admin/users?page=${page}&per_page=100`,"GET");const rows=batch.users||[];users.push(...rows);if(rows.length<100)break;if(page===100)usersPartial=true}
  const monthStart=new Date(new Date().getFullYear(),new Date().getMonth(),1).toISOString();
  const [opps,rfqs,usage,flags,configs,controls,activity]=await Promise.all([
   allRows("opportunity_records","?select=id,user_id,title,buyer,status,deadline,value,created_at,updated_at"),
   allRows("rfq_records","?select=id,user_id,opportunity_id,title,buyer,deadline,estimated_value,created_at"),
   allRows("ai_usage_events",`?select=id,user_id,feature,outcome,tokens_total,created_at&created_at=gte.${encodeURIComponent(monthStart)}`),
   rest<any[]>("GET","abuse_flags","?select=*&order=created_at.desc&limit=100"),
   rest<any[]>("GET","admin_config","?config_key=eq.abuse_detection&select=*&limit=1"),
   allRows("user_controls","?select=user_id,status,ai_monthly_cap"),
   rest<any[]>("GET","activity_log","?select=*&order=created_at.desc&limit=100")
  ]);
  const cm=new Map(controls.rows.map((c:any)=>[c.user_id,c]));
  const countMap=(rows:any[])=>{const m=new Map<string,number>();rows.forEach((x:any)=>m.set(x.user_id,(m.get(x.user_id)||0)+1));return m};
  const rm=countMap(rfqs.rows),om=countMap(opps.rows),um=countMap(usage.rows);
  return NextResponse.json({users:users.map((u:any)=>{const c:any=cm.get(u.id);return {id:u.id,email:u.email,created_at:u.created_at,status:c?.status||(u.banned_until?"suspended":"active"),usage_count:um.get(u.id)||0,rfq_count:rm.get(u.id)||0,opportunity_count:om.get(u.id)||0,ai_monthly_cap:c?.ai_monthly_cap??100}}),counts:{users:users.length,rfqs:rfqs.rows.length,opportunities:opps.rows.length,aiCalls:usage.rows.length,tokens:usage.rows.reduce((n:number,e:any)=>n+(Number(e.tokens_total)||0),0)},flags,config:configs[0]?.config?{...configs[0].config,enabled:configs[0].enabled}:{enabled:false,request_rate_per_minute:60,monthly_ai_cap_action:"flag",suspicious_pattern_action:"flag",auto_suspend:false},activity,usageWindowStart:monthStart,partial:{accounts:usersPartial,rfqs:rfqs.partial,opportunities:opps.partial,usage:usage.partial,controls:controls.partial,flags:flags.length===100,activity:activity.length===100}});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Could not read platform records"},{status:503})}
}
