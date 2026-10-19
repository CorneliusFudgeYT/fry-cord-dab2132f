import { useEffect } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
import { Logo } from '@/components/frying/Logo';
export const Route=createFileRoute('/')({head:()=>({meta:[{title:'FryCord — Your community'},{name:'description',content:'Conversations, voice, livestreams and community on FryCord.'},{property:'og:title',content:'FryCord — Your community'},{property:'og:description',content:'Connect with your community on FryCord.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary'}]}),component:Entry});
function Entry(){const navigate=useNavigate();useEffect(()=>{supabase.auth.getUser().then(({data})=>navigate(data.user?{to:'/app',replace:true}:{to:'/auth',search:{mode:'signin'},replace:true}));},[navigate]);return <main className="grid min-h-dvh place-items-center bg-background"><Logo/></main>;}
