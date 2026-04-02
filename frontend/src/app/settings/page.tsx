"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getToken } from "@/lib/auth";
import { toast } from "sonner";
import {
  Settings as SettingsIcon,
  Mail,
  Bell,
  Calendar,
  Target,
  MapPin,
  Save,
  Loader2,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

type EmailPreferences = {
  id: number;
  enabled: boolean;
  frequency: "daily" | "weekly" | "disabled";
  min_match_score: number;
  remote_only: boolean;
  last_sent_at: string | null;
};

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<EmailPreferences | null>(null);

  // Form state
  const [enabled, setEnabled] = useState(true);
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "disabled">(
    "weekly",
  );
  const [minMatchScore, setMinMatchScore] = useState(70);
  const [remoteOnly, setRemoteOnly] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/auth");
      return;
    }
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    const token = getToken();
    if (!token) return;

    try {
      setLoading(true);
      const res = await fetch(`${API}/emails/preferences`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setPreferences(data);
        setEnabled(data.enabled);
        setFrequency(data.frequency);
        setMinMatchScore(data.min_match_score);
        setRemoteOnly(data.remote_only);
      } else {
        toast.error("Failed to load preferences");
      }
    } catch (error) {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    const token = getToken();
    if (!token) return;

    try {
      setSaving(true);
      const res = await fetch(`${API}/emails/preferences`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          enabled,
          frequency,
          min_match_score: minMatchScore,
          remote_only: remoteOnly,
        }),
      });

      if (res.ok) {
        toast.success("Preferences saved!");
        loadPreferences();
      } else {
        toast.error("Failed to save preferences");
      }
    } catch (error) {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  };

  const getNextEmailDate = () => {
    if (!enabled || frequency === "disabled") return "Never";

    const now = new Date();
    if (frequency === "daily") {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      return tomorrow.toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
      });
    } else {
      // Weekly - next Monday
      const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
      const nextMonday = new Date(now);
      nextMonday.setDate(nextMonday.getDate() + daysUntilMonday);
      nextMonday.setHours(9, 0, 0, 0);
      return nextMonday.toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-blue-400 mx-auto" />
          <p className="text-gray-400">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white py-12 px-6">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600">
              <SettingsIcon className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-4xl font-black">Email Alert Settings</h1>
          </div>
          <p className="text-gray-400 text-lg">
            Get personalized job recommendations delivered to your inbox
          </p>
        </div>

        {/* Settings Card */}
        <div className="group relative">
          <div className="absolute -inset-px bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-3xl opacity-0 group-hover:opacity-100 blur transition pointer-events-none"></div>
          <div className="relative rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 space-y-8">
            {/* Email Alerts Toggle */}
            <div className="flex items-center justify-between p-6 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-green-600 to-emerald-600">
                  <Bell className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-1">Email Alerts</h3>
                  <p className="text-gray-400 text-sm">
                    Receive job recommendations matching your profile
                  </p>
                </div>
              </div>
              <Switch
                checked={enabled}
                onCheckedChange={setEnabled}
                className="data-[state=checked]:bg-green-600"
              />
            </div>

            {/* Frequency Selector */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-400" />
                <Label className="text-base font-semibold">
                  Email Frequency
                </Label>
              </div>
              <Select
                value={frequency}
                onValueChange={(v: "daily" | "weekly" | "disabled") =>
                  setFrequency(v)
                }
                disabled={!enabled}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-white/10">
                  <SelectItem value="daily">
                    Daily (every morning at 9 AM)
                  </SelectItem>
                  <SelectItem value="weekly">
                    Weekly (every Monday at 9 AM)
                  </SelectItem>
                  <SelectItem value="disabled">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Min Match Score Slider */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-purple-400" />
                  <Label className="text-base font-semibold">
                    Minimum Match Score
                  </Label>
                </div>
                <span className="text-2xl font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  {minMatchScore}%
                </span>
              </div>
              <div className="space-y-2">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="10"
                  value={minMatchScore}
                  onChange={(e) => setMinMatchScore(Number(e.target.value))}
                  disabled={!enabled}
                  className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: enabled
                      ? `linear-gradient(to right, rgb(168, 85, 247) 0%, rgb(168, 85, 247) ${minMatchScore}%, rgba(255,255,255,0.1) ${minMatchScore}%, rgba(255,255,255,0.1) 100%)`
                      : "rgba(255,255,255,0.1)",
                  }}
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
                <p className="text-sm text-gray-400">
                  Only send jobs with {minMatchScore}% or higher match to your
                  profile
                </p>
              </div>
            </div>

            {/* Remote Only Toggle */}
            <div className="flex items-center justify-between p-6 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-600">
                  <MapPin className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-1">Remote Jobs Only</h3>
                  <p className="text-gray-400 text-sm">
                    Only include fully remote positions
                  </p>
                </div>
              </div>
              <Switch
                checked={remoteOnly}
                onCheckedChange={setRemoteOnly}
                disabled={!enabled}
                className="data-[state=checked]:bg-cyan-600"
              />
            </div>

            {/* Next Email Preview */}
            {enabled && frequency !== "disabled" && (
              <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-950/50 to-purple-950/50 border border-blue-500/20">
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-blue-400 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-blue-400 mb-1">
                      Next Email
                    </h4>
                    <p className="text-gray-300">
                      You&apos;ll receive your next job digest on{" "}
                      <span className="font-bold text-white">
                        {getNextEmailDate()}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Save Button */}
            <div className="pt-6 border-t border-white/10">
              <Button
                onClick={savePreferences}
                disabled={saving}
                className="w-full h-14 text-base font-bold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-xl shadow-blue-500/25">
                {saving ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5 mr-2" />
                    Save Preferences
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid md:grid-cols-2 gap-6 mt-8">
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
            <h3 className="font-bold mb-2 flex items-center gap-2">
              <span className="text-2xl">📧</span>
              What you&apos;ll receive
            </h3>
            <ul className="text-sm text-gray-400 space-y-2">
              <li>• Jobs matching your skills and preferences</li>
              <li>• AI-calculated match scores</li>
              <li>• One-click apply links</li>
              <li>• Curated from 3,400+ remote jobs</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
            <h3 className="font-bold mb-2 flex items-center gap-2">
              <span className="text-2xl">🔒</span>
              Privacy & Control
            </h3>
            <ul className="text-sm text-gray-400 space-y-2">
              <li>• No spam, unsubscribe anytime</li>
              <li>• Your data stays private</li>
              <li>• Adjust preferences anytime</li>
              <li>• Only relevant jobs, no clutter</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
