/**
 * @file settings/page.tsx
 * @description System Settings and Data Management.
 */

'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Settings, 
  Download, 
  Shield, 
  Zap, 
  Bell, 
  Moon, 
  Database, 
  HeartPulse, 
  ArrowRight,
  Loader2,
  Lock,
  Globe
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { exportUserDataAction, getSystemStatusAction } from '@/app/actions/user.actions'
import { toast } from 'sonner'

export default function SettingsPage() {
  const [isExporting, setIsExporting] = useState(false)
  const [status, setStatus] = useState<any>(null)

  useEffect(() => {
    getSystemStatusAction().then(setStatus)
  }, [])

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const res = await exportUserDataAction()
      if (res.success) {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(res.data, null, 2))
        const downloadAnchorNode = document.createElement('a')
        downloadAnchorNode.setAttribute("href", dataStr)
        downloadAnchorNode.setAttribute("download", `study_ops_data_${new Date().toISOString().split('T')[0]}.json`)
        document.body.appendChild(downloadAnchorNode)
        downloadAnchorNode.click()
        downloadAnchorNode.remove()
        toast.success("Data export started!")
      } else throw new Error(res.error)
    } catch (err: any) {
      toast.error("Export failed: " + err.message)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <main className="p-10 max-w-7xl mx-auto space-y-12 pb-32 text-foreground bg-background">
      
      {/* Header */}
      <section className="space-y-1">
        <div className="font-mono text-[10px] text-muted-foreground tracking-[0.2em] uppercase">Control Panel · Preferences</div>
        <h1 className="text-5xl font-display text-foreground">System <span className="text-primary">Settings</span></h1>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Left Column: Preferences */}
        <div className="lg:col-span-2 space-y-12">
            
            {/* Preferences Section */}
            <section className="space-y-6">
                <h3 className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest border-b border-border pb-4">Personalization</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SettingCard icon={<Moon className="w-5 h-5" />} label="Dark Mode" description="Optimized for late-night study" active />
                    <SettingCard icon={<Bell className="w-5 h-5" />} label="Smart Notifications" description="Shift-aware study reminders" active />
                    <SettingCard icon={<Globe className="w-5 h-5" />} label="Nepali Support" description="Voice & UI bilingual mode" active />
                    <SettingCard icon={<Zap className="w-5 h-5" />} label="Energy Aware UI" description="Adaptive layout based on mood" active />
                </div>
            </section>

            {/* Data Management Section */}
            <section className="space-y-6">
                <h3 className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest border-b border-border pb-4">Data & Privacy</h3>
                <div className="p-10 bg-card border border-border rounded-[2.5rem] flex flex-col md:flex-row items-center gap-10">
                    <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center text-primary shrink-0 border border-primary/20">
                        <Database className="w-10 h-10" />
                    </div>
                    <div className="flex-1 space-y-2 text-center md:text-left">
                        <h4 className="text-xl font-bold text-foreground">Data Portability (GDPR)</h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Download a full copy of your study data, including exams, notes, session history, and AI insights. This ensures you always own your intellectual progress.
                        </p>
                    </div>
                    <button 
                        onClick={handleExport}
                        disabled={isExporting}
                        className="w-full md:w-auto px-10 py-5 bg-primary text-primary-foreground rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                    >
                        {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        Export Data
                    </button>
                </div>
            </section>
        </div>

        {/* Right Column: System Status */}
        <div className="space-y-8">
            <div className="bg-card border border-border rounded-[2.5rem] p-10 space-y-8 shadow-sm">
                <div className="flex items-center justify-between">
                    <h3 className="font-display text-xl text-foreground">System Health</h3>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-mono text-emerald-500 uppercase tracking-widest font-bold">Live</span>
                    </div>
                </div>

                <div className="space-y-6">
                    <StatusItem label="Database Cluster" value={status?.services?.database || 'Connecting...'} />
                    <StatusItem label="AI Inference Engine" value={status?.services?.ai_engine || 'Warmup...'} />
                    <StatusItem label="File Storage" value={status?.services?.storage || 'Ready'} />
                </div>

                <div className="pt-6 border-t border-border">
                    <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-tighter">Version 1.0.0-Stable (Build 2026.05)</div>
                </div>
            </div>

            <div className="bg-muted/30 border border-border rounded-[2rem] p-8 space-y-4">
                <div className="flex items-center gap-3 text-foreground font-bold">
                    <Shield className="w-5 h-5 text-primary" />
                    <span className="text-sm">Security Policy</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                    Study Ops utilizes Row-Level Security (RLS) to ensure your data is only accessible by you. All AI transactions are ephemeral and not used for training.
                </p>
                <button className="flex items-center gap-2 text-[10px] font-bold text-primary uppercase tracking-widest hover:translate-x-1 transition-all">
                    Privacy Center <ArrowRight className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
      </div>
    </main>
  )
}

function SettingCard({ icon, label, description, active }: any) {
    return (
        <div className="p-6 bg-card border border-border rounded-3xl space-y-4 shadow-sm group hover:border-primary/20 transition-all cursor-pointer">
            <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-all">{icon}</div>
                <div className={cn(
                    "w-10 h-5 rounded-full relative transition-all",
                    active ? "bg-primary" : "bg-muted"
                )}>
                    <div className={cn(
                        "w-3 h-3 bg-white rounded-full absolute top-1 transition-all",
                        active ? "right-1" : "left-1"
                    )} />
                </div>
            </div>
            <div className="space-y-1">
                <div className="text-sm font-bold text-foreground">{label}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-tight">{description}</div>
            </div>
        </div>
    )
}

function StatusItem({ label, value }: any) {
    return (
        <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="text-xs font-bold text-foreground uppercase tracking-widest">{value}</div>
        </div>
    )
}
