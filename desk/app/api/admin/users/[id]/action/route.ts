import {NextResponse} from "next/server";
import {adminApi,adminFromRequest} from "@/lib/auth";
import {authAdmin,rest,rpc} from "@/lib/db";
export async function POST(req:Request,{params}:{params:{id:string}}){
 const denied=await adminApi(req);if(denied)return denied;
 if(!/^[0-9a-f-]{36}$/i.test(params.id))return NextResponse.json({error:"Invalid account id"},{status:400});
 let body:any;try{body=await req.json()}catch{return NextResponse.json({error:"Invalid JSON"},{status:400})}
 if(!["suspend","unsuspend","terminate","set_cap","delete"].includes(body.action))return NextResponse.json({error:"Unsupported action"},{status:400});
 const actor=adminFromRequest();if(!actor||params.id===actor.uid)return NextResponse.json({error:"The administrator account cannot be modified from this desk."},{status:400});
 if(body.action==="set_cap"&&(!Number.isInteger(body.cap)||body.cap<0||body.cap>1000000))return NextResponse.json({error:"Cap must be an integer from 0 to 1,000,000."},{status:400});
 if(body.action==="delete"&&(body.confirm_email!==body.email||typeof body.email!=="string"||!body.email.trim()))return NextResponse.json({error:"Enter the account email exactly to confirm permanent deletion."},{status:400});
 try{
  if(body.action==="delete"){
   const auth=await authAdmin(`/admin/users/${encodeURIComponent(params.id)}`,"GET");const user=auth.user||auth;
   if((user.email||"").toLowerCase()!==body.email.trim().toLowerCase())return NextResponse.json({error:"Confirmation email does not match this account."},{status:400});
   await rest("POST","activity_log","",{user_id:params.id,actor_id:actor.uid,action:"admin_user_deleted",details:{email:user.email,reason:typeof body.reason==="string"?body.reason.slice(0,500):""}});
   await authAdmin(`/admin/users/${encodeURIComponent(params.id)}`,"DELETE");
   return NextResponse.json({ok:true,deleted:true});
  }
  if(body.action==="suspend"||body.action==="unsuspend"||body.action==="terminate")await authAdmin(`/admin/users/${encodeURIComponent(params.id)}`,"PUT",{ban_duration:body.action==="unsuspend"?"none":"876000h"});
  const result=await rpc("moderate_user",{p_user_id:params.id,p_actor_id:actor.uid,p_action:body.action,p_cap:body.action==="set_cap"?body.cap:null,p_reason:typeof body.reason==="string"?body.reason.slice(0,500):null});
  return NextResponse.json(result);
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Action failed"},{status:503})}
}
