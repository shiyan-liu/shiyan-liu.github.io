import {createClient,type SupabaseClient} from '@supabase/supabase-js';
declare global {interface Window {GIFT_CONFIG?:{supabaseUrl:string;publishableKey:string}}}
export const cfg=window.GIFT_CONFIG;
export const supabase:SupabaseClient|null=cfg?.supabaseUrl&&cfg.publishableKey?createClient(cfg.supabaseUrl,cfg.publishableKey):null;
